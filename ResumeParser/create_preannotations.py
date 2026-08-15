import json
from pathlib import Path

import spacy


MODEL_PATH = Path("training/model-best")
INPUT_FOLDER = Path("new_resumes_txt")
OUTPUT_FILE = Path("preannotations/model1_predictions.json")

SUPPORTED_LABELS = {
    "SKILL",
    "JOB_TITLE",
    "COMPANY",
    "SCHOOL",
    "DEGREE",
}

# These match your Label Studio configuration:
#
# <Labels name="label" toName="text">
# <Text name="text" value="$text"/>
FROM_NAME = "label"
TO_NAME = "text"


def clean_entity_boundaries(text, start, end):
    """
    Remove whitespace from the beginning and end of a predicted entity.
    """

    while start < end and text[start].isspace():
        start += 1

    while end > start and text[end - 1].isspace():
        end -= 1

    return start, end


def create_prediction_result(entity, text, result_id):
    """
    Convert one spaCy entity prediction into Label Studio's format.
    """

    start, end = clean_entity_boundaries(
        text,
        entity.start_char,
        entity.end_char,
    )

    if start >= end:
        return None

    predicted_text = text[start:end]

    return {
        "id": str(result_id),
        "from_name": FROM_NAME,
        "to_name": TO_NAME,
        "type": "labels",
        "value": {
            "start": start,
            "end": end,
            "text": predicted_text,
            "labels": [entity.label_],
        },
    }


def predict_resume(nlp, file_path):
    """
    Run Model 1 on one TXT resume and create one Label Studio task.
    """

    text = file_path.read_text(encoding="utf-8")

    if not text.strip():
        print(f"Skipped empty file: {file_path.name}")
        return None

    doc = nlp(text)
    prediction_results = []

    for result_id, entity in enumerate(doc.ents, start=1):
        if entity.label_ not in SUPPORTED_LABELS:
            continue

        result = create_prediction_result(
            entity=entity,
            text=text,
            result_id=result_id,
        )

        if result is not None:
            prediction_results.append(result)

    return {
        "data": {
            "text": text,
            "filename": file_path.name,
        },
        "predictions": [
            {
                "model_version": "model1-19-resumes",
                "score": 0.0,
                "result": prediction_results,
            }
        ],
    }


def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH.resolve()}"
        )

    if not INPUT_FOLDER.exists():
        raise FileNotFoundError(
            f"Input folder not found: {INPUT_FOLDER.resolve()}"
        )

    resume_files = sorted(INPUT_FOLDER.glob("*.txt"))

    if not resume_files:
        raise FileNotFoundError(
            f"No TXT resumes found in: {INPUT_FOLDER.resolve()}"
        )

    print(f"Loading Model 1 from: {MODEL_PATH.resolve()}")
    nlp = spacy.load(MODEL_PATH)

    tasks = []

    for file_path in resume_files:
        task = predict_resume(nlp, file_path)

        if task is None:
            continue

        tasks.append(task)

        prediction_count = len(
            task["predictions"][0]["result"]
        )

        print(
            f"{file_path.name}: "
            f"{prediction_count} predictions"
        )

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as output:
        json.dump(
            tasks,
            output,
            ensure_ascii=False,
            indent=2,
        )

    print("\nCreated Label Studio pre-annotation file:")
    print(OUTPUT_FILE.resolve())
    print(f"Resumes processed: {len(tasks)}")


if __name__ == "__main__":
    main()