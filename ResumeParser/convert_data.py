import json
import random
from pathlib import Path

import spacy
from spacy.tokens import DocBin


INPUT_FILE = Path("data/Label_Studio_Model4.json")
TRAIN_FILE = Path("data/train_model5.spacy")
DEV_FILE = Path("data/dev_model5.spacy")

RANDOM_SEED = 42
DEV_RATIO = 0.20

SUPPORTED_LABELS = {
    "JOB_TITLE",
    "SCHOOL",
    "DEGREE",
    "SKILL",
}


def get_annotation(task):
    annotations = [
        annotation
        for annotation in task.get("annotations", [])
        if not annotation.get("was_cancelled", False)
    ]

    if not annotations:
        return None

    return annotations[-1]


def get_entities(task):
    annotation = get_annotation(task)

    if annotation is None:
        return []

    entities = []

    for result in annotation.get("result", []):
        if result.get("type") != "labels":
            continue

        value = result.get("value", {})

        start = value.get("start")
        end = value.get("end")
        labels = value.get("labels", [])

        if start is None or end is None or not labels:
            continue

        if start >= end:
            continue

        label = labels[0]

        if label not in SUPPORTED_LABELS:
            continue

        entities.append(
            {
                "start": start,
                "end": end,
                "label": label
            }
        )

    return sorted(
        entities,
        key=lambda x: (x["start"], x["end"])
    )


def find_overlaps(entities):
    overlaps = []

    for i in range(len(entities)):
        first = entities[i]

        for j in range(i + 1, len(entities)):
            second = entities[j]

            if second["start"] >= first["end"]:
                break

            if (
                first["start"] < second["end"]
                and second["start"] < first["end"]
            ):
                overlaps.append((first, second))

    return overlaps


def validate_tasks(tasks):
    problems_found = False

    print("\nCHECKING ANNOTATIONS")

    for task in tasks:
        text = task["data"]["text"]
        entities = get_entities(task)
        overlaps = find_overlaps(entities)

        if overlaps:
            problems_found = True

            filename = task["data"].get(
                "filename",
                f"Task {task.get('id')}"
            )

            print(f"\nOVERLAPS FOUND IN: {filename}")

            for first, second in overlaps:
                first_text = text[
                    first["start"]:first["end"]
                ]

                second_text = text[
                    second["start"]:second["end"]
                ]

                print(
                    f"  {first['label']}: {repr(first_text)}"
                )

                print(
                    f"  {second['label']}: {repr(second_text)}"
                )

                print()

    return not problems_found


def create_doc(nlp, task):
    text = task["data"]["text"]

    filename = task["data"].get(
        "filename",
        f"Task {task.get('id')}"
    )

    entities = get_entities(task)

    doc = nlp.make_doc(text)
    spans = []

    for entity in entities:
        start = entity["start"]
        end = entity["end"]
        label = entity["label"]

        if start >= end:
            continue

        while start < end and text[start].isspace():
            start += 1

        while end > start and text[end - 1].isspace():
            end -= 1

        if start >= end:
            continue

        span = doc.char_span(
            start,
            end,
            label=label,
            alignment_mode="strict"
        )

        if span is None:
            span = doc.char_span(
                start,
                end,
                label=label,
                alignment_mode="contract"
            )

        if span is None or len(span) == 0:
            print(
                f"\nMISALIGNED ANNOTATION IN: {filename}"
            )
            print(f"  Label: {label}")
            print(f"  Text: {repr(text[start:end])}")
            print(f"  Offsets: ({start}, {end})")
            continue

        token_start = span.start
        token_end = span.end

        while (
            token_start < token_end
            and doc[token_start].is_space
        ):
            token_start += 1

        while (
            token_end > token_start
            and doc[token_end - 1].is_space
        ):
            token_end -= 1

        if token_start >= token_end:
            continue

        span = doc[token_start:token_end]
        span.label_ = label

        overlap = any(
            span.start < existing.end
            and span.end > existing.start
            for existing in spans
        )

        if overlap:
            print(
                f"\nTOKEN OVERLAP IN: {filename}"
            )
            print(
                f"  New: {label} -> {repr(span.text)}"
            )
            continue

        spans.append(span)

    doc.ents = spans

    return doc


def save_spacy_file(nlp, tasks, output_file):
    doc_bin = DocBin(store_user_data=True)

    for task in tasks:
        doc = create_doc(nlp, task)
        doc_bin.add(doc)

    doc_bin.to_disk(output_file)


def remove_duplicate_tasks(tasks):
    unique_tasks = []
    seen = set()
    duplicates = []

    for task in tasks:
        text = task["data"]["text"].strip()

        filename = task["data"].get(
            "filename",
            f"Task {task.get('id')}"
        )

        if text in seen:
            duplicates.append(filename)
            continue

        seen.add(text)
        unique_tasks.append(task)

    if duplicates:
        print("\nDUPLICATE RESUMES REMOVED:")

        for filename in duplicates:
            print(" ", filename)

    return unique_tasks


def count_entities(tasks):
    counts = {
        "JOB_TITLE": 0,
        "SCHOOL": 0,
        "DEGREE": 0,
        "SKILL": 0,
    }

    for task in tasks:
        for entity in get_entities(task):
            label = entity["label"]

            if label in counts:
                counts[label] += 1

    return counts


def main():
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE.resolve()}"
        )

    with open(
        INPUT_FILE,
        "r",
        encoding="utf-8"
    ) as file:
        tasks = json.load(file)

    print(
        f"Loaded {len(tasks)} resumes from "
        f"{INPUT_FILE.name}"
    )

    print(
        f"\nTotal resumes before duplicate check: "
        f"{len(tasks)}"
    )

    tasks = remove_duplicate_tasks(tasks)

    print(f"Total unique resumes: {len(tasks)}")

    print("\nMODEL 5 ENTITY LABELS:")
    print("  JOB_TITLE")
    print("  SCHOOL")
    print("  DEGREE")
    print("  SKILL")
    print("\nCOMPANY annotations will be ignored.")

    entity_counts = count_entities(tasks)

    print("\nENTITY COUNTS:")

    for label, count in entity_counts.items():
        print(f"  {label}: {count}")

    if not validate_tasks(tasks):
        print("\nSTOPPED.")
        print(
            "Fix the overlapping annotations in "
            "Label Studio, export the JSON again, "
            "and rerun this script."
        )
        return

    random.seed(RANDOM_SEED)
    random.shuffle(tasks)

    dev_size = max(
        1,
        round(len(tasks) * DEV_RATIO)
    )

    train_size = len(tasks) - dev_size

    train_tasks = tasks[:train_size]
    dev_tasks = tasks[train_size:]

    print("\nMODEL 5 TRAINING SET:")

    for task in train_tasks:
        print(
            " ",
            task["data"].get("filename")
        )

    print("\nMODEL 5 DEVELOPMENT SET:")

    for task in dev_tasks:
        print(
            " ",
            task["data"].get("filename")
        )

    nlp = spacy.blank("en")

    TRAIN_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    save_spacy_file(
        nlp,
        train_tasks,
        TRAIN_FILE
    )

    save_spacy_file(
        nlp,
        dev_tasks,
        DEV_FILE
    )

    print("\nCreated:")
    print(TRAIN_FILE)
    print(DEV_FILE)

    print(f"\nTotal resumes: {len(tasks)}")
    print(f"Training resumes: {len(train_tasks)}")
    print(f"Development resumes: {len(dev_tasks)}")


if __name__ == "__main__":
    main()