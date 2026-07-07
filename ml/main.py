from skill_extraction import extract_skills
from scoring import load_text, compute_similarity_scores

def rank_candidates(job_path, resume_paths):
    job_text = load_text(job_path)
    resume_texts = [load_text(p) for p in resume_paths]

    scores = compute_similarity_scores(job_text, resume_texts)

    job_skills = set(extract_skills(job_text))

    results = []
    for path, text, score in zip(resume_paths, resume_texts, scores):
        candidate_skills = set(extract_skills(text))
        matched = job_skills & candidate_skills
        missing = job_skills - candidate_skills
        results.append({
            "resume": path,
            "score": round(float(score), 3),
            "matched_skills": sorted(matched),
            "missing_skills": sorted(missing),
        })

    results.sort(key=lambda r: r["score"], reverse=True)
    return results

if __name__ == "__main__":
    job_path = "data/job_description.txt"
    resume_paths = ["data/resume_strong.txt", "data/resume_weak.txt"]

    ranked = rank_candidates(job_path, resume_paths)

    print("=== Candidate Ranking ===")
    for rank, r in enumerate(ranked, start=1):
        print(f"\n#{rank} {r['resume']}  (score: {r['score']})")
        print(f"   Matched skills: {r['matched_skills']}")
        print(f"   Missing skills: {r['missing_skills']}")