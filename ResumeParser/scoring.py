from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

SKILLS = [
    "python", "react", "sql", "machine learning", "javascript", "html", "css",
    "cisco", "cisco routers", "cisco switches", "networking", "network security",
    "firewall", "vpn", "wan", "lan", "voip", "help desk", "it support",
    "vendor management", "budget", "change management", "troubleshoot",
    "windows server", "linux", "pci compliance", "network engineer"
]

def extract_skills(text):
    text = text.lower()
    res = []
    for skill in SKILLS:
        if skill in text:
            res.append(skill)
    return res

def load_text(path):

    with open(path, encoding="utf-8") as f:
        return f.read()

def compute_cosine_scores(job_text, resume_texts):
    documents = [job_text] + resume_texts

    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(documents)

    job_vector = tfidf_matrix[0:1]
    resume_vectors = tfidf_matrix[1:]
    scores = cosine_similarity(job_vector, resume_vectors)
    return scores.flatten()

def jaccard_similarity(set_a, set_b):
    set_a, set_b = set(set_a), set(set_b)
    if not set_a and not set_b:
        return 1.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)

def generate_feedback(matched_skills, missing_skills, combined_score):
    feedback = []

    if combined_score >= 0.7:
        feedback.append("Strong overall match for this role.")
    elif combined_score >= 0.4:
        feedback.append("Moderate match — some relevant skills present, but notable gaps remain.")
    else:
        feedback.append("Low match — this resume may need significant tailoring for this role.")

    if missing_skills:
        skill_list = ", ".join(missing_skills)
        feedback.append(f"Consider highlighting or gaining experience in: {skill_list}.")

    if matched_skills:
        skill_list = ", ".join(matched_skills)
        feedback.append(f"Skills that align well with this role: {skill_list}.")

    return " ".join(feedback)

def score_resume(job_text, resume_text):
    cosine = compute_cosine_scores(job_text, [resume_text])[0]
    job_skills = set(extract_skills(job_text))
    resume_skills = set(extract_skills(resume_text))
    jaccard = jaccard_similarity(job_skills, resume_skills)

    matched = sorted(job_skills & resume_skills)
    missing = sorted(job_skills - resume_skills)

    return {
        "cosine_score": round(float(cosine), 3),
        "jaccard_score": round(float(jaccard), 3),
        "combined_score": round(float((cosine + jaccard) / 2), 3),
        "matched_skills": matched,
        "missing_skills": missing,
        "feedback": generate_feedback(matched, missing, round(float((cosine + jaccard) / 2), 3)),
    }

if __name__ == "__main__":
    job_text = load_text("data/job_description_it_director.txt")
    resume_paths = ["data/real_resumes/data/INFORMATION-TECHNOLOGY/15651486.txt", "data/real_resumes/data/INFORMATION-TECHNOLOGY/90867631.txt", "data/real_resumes/data/INFORMATION-TECHNOLOGY/51639418.txt"]
    resume_texts = [load_text(p) for p in resume_paths]

    scores = [score_resume(job_text, resume_text) for resume_text in resume_texts]

    for path, result in zip(resume_paths, scores):
        print(f"\n{path}")
        print(f"  Cosine score: {result['cosine_score']:.2f}")
        print(f"  Jaccard score: {result['jaccard_score']:.2f}")
        print(f"  Combined score: {result['combined_score']:.2f}")
        print(f"  Matched skills: {result['matched_skills']}")
        print(f"  Missing skills: {result['missing_skills']}")
        print(f"  Feedback: {result['feedback']}")