def jaccard_similarity(set_a, set_b):
    set_a, set_b = set(set_a), set(set_b)
    if not set_a and not set_b:
        return 1.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)

def generate_feedback(matched_skills, missing_skills, combined_score):
    feedback = []

    if combined_score >= 0.85:
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

DEGREE_LEVELS = {
    "high school": 1,
    "associate": 2, "as": 2, "aa": 2, "a.a": 2, "a.s": 2,
    "bachelor": 3, "bs": 3, "ba": 3, "b.s": 3, "b.a": 3,
    "master": 4, "ms": 4, "ma": 4, "mba": 4, "m.s": 4, "m.a": 4, "m.b.a": 4,
    "phd": 5, "doctorate": 5, "ph.d": 5,
}

def degree_level(degree_text):
    if not degree_text:
        return 0
    text = degree_text.lower()
    return max(
        (level for keyword, level in DEGREE_LEVELS.items() if keyword in text),
        default=0,
    )

def degree_match_score(required_degree, candidate_degrees):
    required_level = degree_level(required_degree)
    if required_level == 0:
        return 1
    if not candidate_degrees:
        return 0
    candidate_level = max(degree_level(d) for d in candidate_degrees)
    return 1 if candidate_level >= required_level else 0

def score_resume(job_skills, resume_skills, job_degree, resume_degrees):
    job_skills_set = {s.lower().strip() for s in job_skills}
    resume_skills_set = {s.lower().strip() for s in resume_skills}

    matched = sorted(job_skills_set & resume_skills_set)
    missing = sorted(job_skills_set - resume_skills_set)
    coverage = jaccard_similarity(job_skills_set, matched)

    degree_score = degree_match_score(job_degree, resume_degrees)
    combined = coverage if degree_score == 1 else (coverage / 2)

    feedback = generate_feedback(matched, missing, combined)
    if degree_score == 0:
        feedback += f" Candidate does not meet the required degree level ({job_degree})."

    return {
        "coverage_score": round(float(coverage), 3),
        "degree_match": bool(degree_score),
        "combined_score": round(float(combined), 3),
        "matched_skills": matched,
        "missing_skills": missing,
        "feedback": feedback,
    }
