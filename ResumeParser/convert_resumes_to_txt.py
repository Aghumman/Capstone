from pathlib import Path

import pdfplumber
from docx import Document


INPUT_FOLDER = Path("new_resumes")
OUTPUT_FOLDER = Path("new_resumes_txt")


def extract_pdf(file_path):
    pages = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()

            if text:
                pages.append(text)

    return "\n".join(pages).strip()


def extract_docx(file_path):
    document = Document(file_path)

    paragraphs = [
        paragraph.text
        for paragraph in document.paragraphs
        if paragraph.text.strip()
    ]

    return "\n".join(paragraphs).strip()


def convert_file(file_path):
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        return extract_pdf(file_path)

    elif suffix == ".docx":
        return extract_docx(file_path)

    elif suffix == ".txt":
        return file_path.read_text(encoding="utf-8")

    else:
        return None


def main():

    if not INPUT_FOLDER.exists():
        raise FileNotFoundError(
            f"Folder not found: {INPUT_FOLDER.resolve()}"
        )

    OUTPUT_FOLDER.mkdir(exist_ok=True)

    files = sorted(INPUT_FOLDER.iterdir())

    converted = 0

    for file_path in files:

        if file_path.suffix.lower() not in [
            ".pdf",
            ".docx",
            ".txt",
        ]:
            continue

        print(f"Converting {file_path.name}...")

        text = convert_file(file_path)

        if not text:
            print("  No text extracted.")
            continue

        output_path = OUTPUT_FOLDER / (
            file_path.stem + ".txt"
        )

        output_path.write_text(
            text,
            encoding="utf-8"
        )

        converted += 1

    print(f"\nFinished! Converted {converted} resumes.")
    print(f"TXT files saved to: {OUTPUT_FOLDER.resolve()}")


if __name__ == "__main__":
    main()