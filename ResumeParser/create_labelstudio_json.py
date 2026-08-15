import json
from pathlib import Path

INPUT_DIR = Path("extracted_text")
OUTPUT_FILE = "labelstudio_import.json"

tasks = []

for txt_file in sorted(INPUT_DIR.glob("*.txt")):
    text = txt_file.read_text(encoding="utf-8")

    tasks.append({
        "text": text,
        "filename": txt_file.name
    })

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(tasks, f, indent=2)

print(f"Created {OUTPUT_FILE} with {len(tasks)} resumes.")