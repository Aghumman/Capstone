from flask import Flask, jsonify, request
from pathlib import Path

import pdfplumber
import spacy
from docx import Document


app = Flask(__name__)

MODEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "training_model5"
    / "model-best"
)

print(f"Loading model from: {MODEL_PATH}")

nlp = spacy.load(MODEL_PATH)

print("Model 5 loaded successfully.")


SUPPORTED_LABELS = [
    "JOB_TITLE",
    "SCHOOL",
    "DEGREE",
    "SKILL",
]


def extract_pdf(file_path):
    pages = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()

            if page_text:
                pages.append(page_text)

    return "\n".join(pages).strip()


def extract_docx(file_path):
    document = Document(file_path)

    paragraphs = [
        paragraph.text
        for paragraph in document.paragraphs
        if paragraph.text.strip()
    ]

    return "\n".join(paragraphs).strip()


def extract_txt(file_path):
    return file_path.read_text(
        encoding="utf-8"
    ).strip()


def extract_resume_text(file_path):
    extension = file_path.suffix.lower()

    if extension == ".pdf":
        return extract_pdf(file_path)

    if extension == ".docx":
        return extract_docx(file_path)

    if extension == ".txt":
        return extract_txt(file_path)

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


def predict_resume_entities(text):
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

    return results


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": True,
        "pipeline": nlp.pipe_names
    })


@app.route("/parse-resume", methods=["POST"])
def parse_resume():
    if "file" not in request.files:
        return jsonify({
            "error": "No file uploaded"
        }), 400

    uploaded_file = request.files["file"]

    if uploaded_file.filename == "":
        return jsonify({
            "error": "No file selected"
        }), 400

    extension = Path(
        uploaded_file.filename
    ).suffix.lower()

    allowed_extensions = {
        ".pdf",
        ".docx",
        ".txt"
    }

    if extension not in allowed_extensions:
        return jsonify({
            "error": (
                "Unsupported file type. "
                "Please upload a PDF, DOCX, or TXT file."
            )
        }), 400

    uploads_folder = (
        Path(__file__).resolve().parent
        / "uploads"
    )

    uploads_folder.mkdir(
        parents=True,
        exist_ok=True
    )

    file_path = (
        uploads_folder
        / uploaded_file.filename
    )

    try:
        uploaded_file.save(file_path)

        text = extract_resume_text(
            file_path
        )

        if not text:
            return jsonify({
                "error": (
                    "Could not extract text "
                    "from resume"
                )
            }), 400

        entities = predict_resume_entities(
            text
        )

        return jsonify({
            "filename": uploaded_file.filename,
            "characters_extracted": len(text),
            "job_titles": entities["JOB_TITLE"],
            "schools": entities["SCHOOL"],
            "degrees": entities["DEGREE"],
            "skills": entities["SKILL"]
        })

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500


if __name__ == "__main__":
    app.run(debug=True)