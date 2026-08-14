from flask import Flask, request, render_template
from pathlib import Path
import pdfplumber
from docx import Document
import spacy
import re

app = Flask(__name__)

UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)

nlp = spacy.blank("en")


def clean_text(text):
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_pdf(file_path):
    text = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()

            if page_text:
                text.append(page_text)

    return clean_text("\n".join(text))


def parse_docx(file_path):
    document = Document(file_path)

    paragraphs = [
        paragraph.text
        for paragraph in document.paragraphs
        if paragraph.text.strip()
    ]

    return clean_text("\n".join(paragraphs))


def parse_resume(file_path):
    file_path = Path(file_path)
    extension = file_path.suffix.lower()

    if extension == ".pdf":
        return parse_pdf(file_path)

    elif extension == ".docx":
        return parse_docx(file_path)

    raise ValueError("Unsupported file type. Please upload a PDF or DOCX.")


def tokenize_text(text):
    doc = nlp(text)

    tokens = [
        token.text.lower()
        for token in doc
        if not token.is_space and not token.is_punct
    ]

    return tokens


def extract_email(text):
    pattern = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
    match = re.search(pattern, text)

    return match.group() if match else None


def extract_phone(text):
    pattern = r"(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}"
    match = re.search(pattern, text)

    return match.group() if match else None


def extract_linkedin(text):
    pattern = r"(https?://)?(www\.)?linkedin\.com/in/[A-Za-z0-9_-]+/?"
    match = re.search(pattern, text)

    return match.group() if match else None


def extract_github(text):
    pattern = r"(https?://)?(www\.)?github\.com/[A-Za-z0-9_-]+/?"
    match = re.search(pattern, text)

    return match.group() if match else None


def extract_contact_info(text):
    return {
        "email": extract_email(text),
        "phone": extract_phone(text),
        "linkedin": extract_linkedin(text),
        "github": extract_github(text)
    }


@app.route("/", methods=["GET", "POST"])
def index():

    extracted_text = ""
    tokens = []
    contact_info = {}

    if request.method == "POST":

        if "resume" not in request.files:
            return render_template(
                "index.html",
                extracted_text="",
                tokens=[],
                contact_info={}
            )

        uploaded_file = request.files["resume"]

        if uploaded_file.filename == "":
            return render_template(
                "index.html",
                extracted_text="",
                tokens=[],
                contact_info={}
            )

        file_extension = Path(uploaded_file.filename).suffix.lower()

        if file_extension not in [".pdf", ".docx"]:
            return "Only PDF and DOCX files are supported."

        file_path = UPLOAD_FOLDER / uploaded_file.filename
        uploaded_file.save(file_path)

        extracted_text = parse_resume(file_path)
        tokens = tokenize_text(extracted_text)
        contact_info = extract_contact_info(extracted_text)

        print("\nCONTACT INFORMATION: ")
        print(contact_info)

    return render_template(
        "index.html",
        extracted_text=extracted_text,
        tokens=tokens,
        contact_info=contact_info
    )


if __name__ == "__main__":
    app.run(debug=True)