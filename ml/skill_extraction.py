# A skill list stand-in for what spaCy's NER would eventually detect
SKILLS = [
    "python", "react", "sql", "javascript", "machine learning",
    "rest api", "restful apis", "git", "agile", "html", "css"
]

def clean_text(text):
    """
    Lowercase and strip extra whitespace so matching is consistent.
    """
    text = text.lower()
    text = " ".join(text.split())  # collapses multiple spaces/newlines into one
    return text

def extract_skills(text):
    """
    Return list of known skills found in the text.
    """
    text = clean_text(text)
    found = [skill for skill in SKILLS if skill in text]
    return found

if __name__ == "__main__":
    with open("data/job_description.txt", encoding="utf-8") as f:
        job_text = f.read()
    print("Job description skills:", extract_skills(job_text))

    with open("data/resume_strong.txt", encoding="utf-8") as f:
        resume_text = f.read()
    print("Strong resume skills:", extract_skills(resume_text))
