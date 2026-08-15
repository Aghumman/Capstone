import json
from pathlib import Path

import pdfplumber
import spacy
from docx import Document


MODEL_PATH = Path("training_model3/model-best")
INPUT_FOLDER = Path("model4_resumes")
OUTPUT_FILE = Path("preannotations/model4_predictions.json")

SUPPORTED_LABELS = {
    "SKILL",
    "JOB_TITLE",
    "COMPANY",
    "SCHOOL",
    "DEGREE",
}

FROM_NAME = "label"
TO_NAME = "text"


def extract_pdf(file_path):
    pages = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()

                if page_text:
                    pages.append(page_text)

    except Exception as error:
        print(f"ERROR reading PDF: {file_path.name}")
        print(f"Reason: {error}")
        return ""

    return "\n".join(pages).strip()


def extract_docx(file_path):
    try:
        document = Document(file_path)

        paragraphs = [
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        return "\n".join(paragraphs).strip()

    except Exception as error:
        print(f"ERROR reading DOCX: {file_path.name}")
        print(f"Reason: {error}")
        return ""


def extract_txt(file_path):
    try:
        return file_path.read_text(
            encoding="utf-8"
        ).strip()

    except Exception as error:
        print(f"ERROR reading TXT: {file_path.name}")
        print(f"Reason: {error}")
        return ""


def extract_text(file_path):
    extension = file_path.suffix.lower()

    if extension == ".pdf":
        return extract_pdf(file_path)

    if extension == ".docx":
        return extract_docx(file_path)

    if extension == ".txt":
        return extract_txt(file_path)

    return ""


def clean_entity_boundaries(text, start, end):
    while start < end and text[start].isspace():
        start += 1

    while end > start and text[end - 1].isspace():
        end -= 1

    return start, end


def create_prediction_result(
    entity,
    text,
    result_id
):
    start, end = clean_entity_boundaries(
        text,
        entity.start_char,
        entity.end_char
    )

    if start >= end:
        return None

    return {
        "id": str(result_id),
        "from_name": FROM_NAME,
        "to_name": TO_NAME,
        "type": "labels",
        "value": {
            "start": start,
            "end": end,
            "text": text[start:end],
            "labels": [entity.label_]
        }
    }


def predict_resume(
    nlp,
    file_path,
    resume_number
):
    text = extract_text(file_path)

    if not text or not text.strip():
        print(f"SKIPPED: {file_path.name}")
        print("Reason: No usable text could be extracted.\n")
        return None

    doc = nlp(text)

    prediction_results = []

    result_id = 1

    for entity in doc.ents:
        if entity.label_ not in SUPPORTED_LABELS:
            continue

        result = create_prediction_result(
            entity,
            text,
            result_id
        )

        if result is not None:
            prediction_results.append(result)
            result_id += 1

    filename = f"Resume{resume_number}.txt"

    return {
        "data": {
            "text": text,
            "filename": filename,
            "source_file": file_path.name
        },
        "predictions": [
            {
                "model_version": "model2",
                "score": 0.0,
                "result": prediction_results
            }
        ]
    }


def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH.resolve()}"
        )

    if not INPUT_FOLDER.exists():
        raise FileNotFoundError(
            f"Resume folder not found: {INPUT_FOLDER.resolve()}"
        )

    resume_files = sorted(
        [
            file_path
            for file_path in INPUT_FOLDER.iterdir()
            if file_path.is_file()
            and file_path.suffix.lower()
            in {".pdf", ".docx", ".txt"}
        ]
    )

    if not resume_files:
        raise FileNotFoundError(
            f"No PDF, DOCX, or TXT resumes found in: "
            f"{INPUT_FOLDER.resolve()}"
        )

    print(
        f"Loading Model 2 from: "
        f"{MODEL_PATH.resolve()}"
    )

    nlp = spacy.load(MODEL_PATH)

    print(
        f"\nFound {len(resume_files)} supported resume files.\n"
    )

    tasks = []
    skipped_files = []

    starting_resume_number = 51

    next_resume_number = starting_resume_number

    for file_path in resume_files:
        print(f"Processing: {file_path.name}")

        task = predict_resume(
            nlp,
            file_path,
            next_resume_number
        )

        if task is None:
            skipped_files.append(file_path.name)
            continue

        tasks.append(task)

        prediction_count = len(
            task["predictions"][0]["result"]
        )

        print(
            f"Created Resume{next_resume_number}.txt"
        )

        print(
            f"Predictions: {prediction_count}\n"
        )

        next_resume_number += 1

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as output:
        json.dump(
            tasks,
            output,
            ensure_ascii=False,
            indent=2
        )

    print("=" * 60)
    print("FINISHED")
    print("=" * 60)

    print(
        f"Supported files found: {len(resume_files)}"
    )

    print(
        f"Successfully processed: {len(tasks)}"
    )

    print(
        f"Skipped: {len(skipped_files)}"
    )

    if skipped_files:
        print("\nSKIPPED FILES:")

        for filename in skipped_files:
            print(f"- {filename}")

    print(
        f"\nCreated JSON: {OUTPUT_FILE.resolve()}"
    )


if __name__ == "__main__":
    main()