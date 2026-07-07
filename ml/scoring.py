from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def load_text(path):
    """

    """
    with open(path, encoding="utf-8") as f:
        return f.read()

def compute_similarity_scores(job_text, resume_texts):
    """
    job_text: string, the job description
    resume_texts: list of strings, one per resume
    returns: list of similarity scores (0 to 1), one per resume
    """
    # Put job description FIRST, resumes after — order matters for indexing below
    documents = [job_text] + resume_texts

    # Step A: Convert all documents into TF-IDF vectors.
    # Each document becomes a row; each unique word becomes a column.
    # The value in each cell = how "important" that word is to that document.
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(documents)

    # Step B: Separate the job vector (row 0) from resume vectors (rows 1+)
    job_vector = tfidf_matrix[0:1]
    resume_vectors = tfidf_matrix[1:]

    # Step C: Cosine similarity between job vector and EACH resume vector
    similarity_scores = cosine_similarity(job_vector, resume_vectors)

    # scores is a 2D array like [[0.62, 0.11]] — flatten it to a simple list
    return similarity_scores.flatten()

if __name__ == "__main__":
    job_text = load_text("data/job_description.txt")
    resume_paths = ["data/resume_strong.txt", "data/resume_weak.txt"]
    resume_texts = [load_text(p) for p in resume_paths]

    scores = compute_similarity_scores(job_text, resume_texts)

    for path, score in zip(resume_paths, scores):
        print(f"{path}: {score:.2f}")
