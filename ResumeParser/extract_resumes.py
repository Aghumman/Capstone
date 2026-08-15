from pathlib import Path

import pdfplumber


INPUT_FOLDER = Path("resumes")
OUTPUT_FOLDER = Path("extracted_text")


def extract_pdf_text(pdf_path: Path) -> str:
    """Extract text from every page of a PDF."""

    pages = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()

            if page_text:
                pages.append(page_text)

    return "\n\n".join(pages)


def clean_text(text: str) -> str:
    """Preserve resume structure while cleaning unnecessary spacing."""

    text = text.replace("\r\n", "\n").replace("\r", "\n")

    cleaned_lines = []

    for line in text.splitlines():
        line = " ".join(line.split())
        cleaned_lines.append(line)

    text = "\n".join(cleaned_lines)

    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")

    return text.strip()


def main() -> None:
    OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

    pdf_files = sorted(INPUT_FOLDER.glob("*.pdf"))

    if not pdf_files:
        print(f"No PDF files found in {INPUT_FOLDER.resolve()}")
        return

    successful = 0
    failed = 0

    for pdf_path in pdf_files:
        try:
            text = extract_pdf_text(pdf_path)
            text = clean_text(text)

            if not text:
                print(f"Skipped {pdf_path.name}: no extractable text")
                failed += 1
                continue

            output_path = OUTPUT_FOLDER / f"{pdf_path.stem}.txt"
            output_path.write_text(text, encoding="utf-8")

            print(f"Saved: {output_path}")
            successful += 1

        except Exception as error:
            print(f"Failed: {pdf_path.name}")
            print(f"Reason: {error}")
            failed += 1

    print("\nExtraction complete")
    print(f"Successful: {successful}")
    print(f"Failed or skipped: {failed}")


if __name__ == "__main__":
    main()