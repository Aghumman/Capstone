from pathlib import Path

import spacy
import pdfplumber
from docx import Document


MODEL_PATH = Path("training_model5/model-best")
TEST_FOLDER = Path("test_resumes_model5")
OUTPUT_FILE = Path("model5_test_results.txt")

SUPPORTED_LABELS = [
    "JOB_TITLE",
    "SCHOOL",
    "DEGREE",
    "SKILL",
]


def extract_text_from_pdf(file_path):
    pages = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()

            if page_text:
                pages.append(page_text)

    return "\n".join(pages).strip()


def extract_text_from_docx(file_path):
    document = Document(file_path)

    paragraphs = [
        paragraph.text
        for paragraph in document.paragraphs
        if paragraph.text.strip()
    ]

    return "\n".join(paragraphs).strip()


def extract_text_from_txt(file_path):
    return file_path.read_text(
        encoding="utf-8"
    ).strip()


def extract_resume_text(file_path):
    extension = file_path.suffix.lower()

    if extension == ".pdf":
        return extract_text_from_pdf(file_path)

    if extension == ".docx":
        return extract_text_from_docx(file_path)

    if extension == ".txt":
        return extract_text_from_txt(file_path)

    return ""


def remove_duplicates(values):
    unique_values = []
    seen = set()

    for value in values:
        cleaned_value = value.strip()
        normalized_value = cleaned_value.lower()

        if (
            cleaned_value
            and normalized_value not in seen
        ):
            unique_values.append(cleaned_value)
            seen.add(normalized_value)

    return unique_values


def predict_entities(nlp, text):
    doc = nlp(text)

    results = {
        label: []
        for label in SUPPORTED_LABELS
    }

    for entity in doc.ents:
        if entity.label_ not in results:
            continue

        results[entity.label_].append(
            entity.text
        )

    for label in results:
        results[label] = remove_duplicates(
            results[label]
        )

    return doc, results


def format_results(file_path, doc, results):
    lines = []

    lines.append("=" * 70)
    lines.append(f"FILE: {file_path.name}")
    lines.append("=" * 70)

    for label in SUPPORTED_LABELS:
        lines.append("")
        lines.append(f"{label}:")

        values = results.get(
            label,
            []
        )

        if not values:
            lines.append("None found")
            continue

        for value in values:
            lines.append(f"- {value}")

    lines.append("")
    lines.append("ENTITIES IN RESUME ORDER:")

    if not doc.ents:
        lines.append("No entities found.")

    else:
        for entity in doc.ents:
            if entity.label_ not in SUPPORTED_LABELS:
                continue

            lines.append(
                f"{entity.label_:10} -> "
                f"{entity.text!r} "
                f"[{entity.start_char}:{entity.end_char}]"
            )

    lines.append("")
    lines.append("")

    return "\n".join(lines)


def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: "
            f"{MODEL_PATH.resolve()}"
        )

    if not TEST_FOLDER.exists():
        raise FileNotFoundError(
            f"Test folder not found: "
            f"{TEST_FOLDER.resolve()}"
        )

    resume_files = sorted(
        [
            file_path
            for file_path in TEST_FOLDER.iterdir()
            if file_path.is_file()
            and file_path.suffix.lower()
            in {".pdf", ".docx", ".txt"}
        ]
    )

    if not resume_files:
        raise FileNotFoundError(
            f"No PDF, DOCX, or TXT files found in: "
            f"{TEST_FOLDER.resolve()}"
        )

    print(
        f"Loading Model 5 from: "
        f"{MODEL_PATH.resolve()}"
    )

    nlp = spacy.load(
        MODEL_PATH
    )

    print(
        f"Found {len(resume_files)} test resumes.\n"
    )

    all_output = []

    successful = 0
    skipped = []

    for file_path in resume_files:
        print(
            f"Testing: {file_path.name}"
        )

        try:
            resume_text = extract_resume_text(
                file_path
            )

        except Exception as error:
            print(
                f"  ERROR: {error}\n"
            )

            skipped.append(
                file_path.name
            )

            continue

        if not resume_text:
            print(
                "  SKIPPED: No text extracted.\n"
            )

            skipped.append(
                file_path.name
            )

            continue

        print(
            f"  Extracted "
            f"{len(resume_text)} characters."
        )

        doc, results = predict_entities(
            nlp,
            resume_text
        )

        formatted = format_results(
            file_path,
            doc,
            results
        )

        print(formatted)

        all_output.append(
            formatted
        )

        successful += 1

    OUTPUT_FILE.write_text(
        "\n".join(all_output),
        encoding="utf-8"
    )

    print("=" * 70)
    print("BATCH TEST COMPLETE")
    print("=" * 70)

    print(
        f"Files found: "
        f"{len(resume_files)}"
    )

    print(
        f"Successfully tested: "
        f"{successful}"
    )

    print(
        f"Skipped: "
        f"{len(skipped)}"
    )

    if skipped:
        print("\nSKIPPED FILES:")

        for filename in skipped:
            print(
                f"- {filename}"
            )

    print(
        f"\nResults saved to: "
        f"{OUTPUT_FILE.resolve()}"
    )


if __name__ == "__main__":
    main()