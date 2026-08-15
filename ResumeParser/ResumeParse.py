from flask import Flask, request, render_template, jsonify
from pathlib import Path
import pdfplumber
from docx import Document
import spacy
import re
import psycopg2


app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_FOLDER = BASE_DIR / "uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)

MODEL_PATH = (
    BASE_DIR
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


def clean_text(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

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

    if extension == ".docx":
        return parse_docx(file_path)

    raise ValueError(
        "Unsupported file type. Please upload a PDF or DOCX."
    )


def tokenize_text(text):
    doc = nlp.make_doc(text)

    tokens = [
        token.text.lower()
        for token in doc
        if not token.is_space and not token.is_punct
    ]

    return tokens


def extract_email(text):
    pattern = (
        r"[A-Za-z0-9._%+-]+"
        r"@[A-Za-z0-9.-]+"
        r"\.[A-Za-z]{2,}"
    )

    match = re.search(pattern, text)

    return match.group() if match else None


def extract_phone(text):
    pattern = (
        r"(\+?\d{1,3}[-.\s]?)?"
        r"(\(?\d{3}\)?[-.\s]?)?"
        r"\d{3}[-.\s]?\d{4}"
    )

    match = re.search(pattern, text)

    return match.group() if match else None


def extract_linkedin(text):
    pattern = (
        r"(https?://)?"
        r"(www\.)?"
        r"linkedin\.com/in/"
        r"[A-Za-z0-9_-]+/?"
    )

    match = re.search(pattern, text)

    return match.group() if match else None


def extract_github(text):
    pattern = (
        r"(https?://)?"
        r"(www\.)?"
        r"github\.com/"
        r"[A-Za-z0-9_-]+/?"
    )

    match = re.search(pattern, text)

    return match.group() if match else None


def extract_contact_info(text):
    return {
        "email": extract_email(text),
        "phone": extract_phone(text),
        "linkedin": extract_linkedin(text),
        "github": extract_github(text),
    }


def remove_duplicates(values):
    unique_values = []
    seen = set()

    for value in values:
        cleaned_value = value.strip()
        normalized_value = cleaned_value.lower()

        if cleaned_value and normalized_value not in seen:
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

        results[entity.label_].append(entity.text)

    for label in results:
        results[label] = remove_duplicates(
            results[label]
        )

    return results


@app.route("/", methods=["GET", "POST"])
def index():
    extracted_text = ""
    tokens = []
    contact_info = {}
    entities = {}

    if request.method == "POST":

        if "resume" not in request.files:
            return render_template(
                "index.html",
                extracted_text="",
                tokens=[],
                contact_info={},
                entities={},
            )

        uploaded_file = request.files["resume"]

        if uploaded_file.filename == "":
            return render_template(
                "index.html",
                extracted_text="",
                tokens=[],
                contact_info={},
                entities={},
            )

        file_extension = Path(
            uploaded_file.filename
        ).suffix.lower()

        if file_extension not in [".pdf", ".docx"]:
            return "Only PDF and DOCX files are supported."

        file_path = (
            UPLOAD_FOLDER
            / uploaded_file.filename
        )

        uploaded_file.save(file_path)

        try:
            extracted_text = parse_resume(file_path)

            tokens = tokenize_text(extracted_text)

            contact_info = extract_contact_info(
                extracted_text
            )

            entities = predict_resume_entities(
                extracted_text
            )

            print("\nCONTACT INFORMATION:")
            print(contact_info)

            print("\nMODEL 5 RESULTS:")
            print(
                "JOB_TITLE:",
                entities["JOB_TITLE"]
            )
            print(
                "SCHOOL:",
                entities["SCHOOL"]
            )
            print(
                "DEGREE:",
                entities["DEGREE"]
            )
            print(
                "SKILL:",
                entities["SKILL"]
            )

        except Exception as error:
            return (
                f"Error processing resume: {error}"
            )

    return render_template(
        "index.html",
        extracted_text=extracted_text,
        tokens=tokens,
        contact_info=contact_info,
        entities=entities,
    )


@app.route("/parse-resume", methods=["POST"])
def parse_resume_api():

    if "file" not in request.files:
        return jsonify({
            "error": "No file uploaded"
        }), 400

    uploaded_file = request.files["file"]

    if uploaded_file.filename == "":
        return jsonify({
            "error": "No file selected"
        }), 400

    file_extension = Path(
        uploaded_file.filename
    ).suffix.lower()

    if file_extension not in [".pdf", ".docx"]:
        return jsonify({
            "error": (
                "Only PDF and DOCX files are supported."
            )
        }), 400

    file_path = (
        UPLOAD_FOLDER
        / uploaded_file.filename
    )

    try:
        uploaded_file.save(file_path)

        extracted_text = parse_resume(
            file_path
        )

        if not extracted_text:
            return jsonify({
                "error": (
                    "Could not extract text from resume."
                )
            }), 400

        contact_info = extract_contact_info(
            extracted_text
        )

        entities = predict_resume_entities(
            extracted_text
        )

        results = {
            "filename": uploaded_file.filename,
            "email": contact_info["email"],
            "phone": contact_info["phone"],
            "linkedin": contact_info["linkedin"],
            "github": contact_info["github"],
            "job_titles": entities["JOB_TITLE"],
            "schools": entities["SCHOOL"],
            "degrees": entities["DEGREE"],
            "skills": entities["SKILL"],
        }

        print("\nAPI PARSE RESULTS:")
        print(results)

        return jsonify(results)

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500

# 
DB_URI = "postgresql://postgres:Jn&3Tv5a8KJkDn2@db.sbowuvozgfrjsezqiqfa.supabase.co:5432/postgres"

def insert_data(data):
    if hasattr(data, 'get_json'):
        data = data.get_json()

    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")
    skills = data.get("skills", [])

    # name = "test"
    # email = "test@gmail.com"
    # phone = "000-000-0000"
    # skills = ["test1", "test2", "test3"]

    conn = None
    try:
        conn = psycopg2.connect(DB_URI)
        with conn.cursor() as cursor:

            # look up candidate in database
            cursor.execute("""
                SELECT id FROM candidates
                WHERE email = %s;
            """, (email,))
            candidate = cursor.fetchone()

            # take candidate id is exist, else create new candidate and get id
            if candidate:
                candidate_id = candidate[0]
            else:
                cursor.execute("""
                    INSERT INTO candidates (name, phone, email)
                    VALUES (%s, %s, %s)
                    RETURNING id;
                """, (name, phone, email))
                candidate_id = cursor.fetchone()[0]

            # new resume into db
            cursor.execute("""
                INSERT INTO resume (candidate_id)
                VALUES (%s)
                RETURNING id;
            """, (candidate_id,))
            resume_id = cursor.fetchone()[0]

            # for each skill, insert to db
            for skill in skills:
                cursor.execute("""
                    INSERT INTO skill (name, resume_id)
                    VALUES (%s, %s)
                    RETURNING id;
                """, (skill, resume_id,))

            conn.commit()

            return "Skills sucessfully saved"

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    app.run(debug=True)