
-- Ranking Query --
SELECT
    candidate.id AS candidate_id,
    candidate.name,
    candidate_score.job_id,
    candidate_score.score
FROM candidate_score
JOIN candidate on candidate.id = candidate_score.candidate_id
ORDER BY score DESC
LIMIT 10;


-- test
-- SELECT *
-- FROM candidate
-- ORDER BY id DESC
-- LIMIT 5;

-- SELECT *
-- FROM resume
-- ORDER BY id DESC
-- LIMIT 5;

-- SELECT *
-- FROM resume_job_title
-- WHERE resume_id = 400000;

-- SELECT *
-- FROM education
-- WHERE resume_id = 400000;

-- SELECT *
-- FROM skill
-- WHERE resume_id = 400000;

-- SELECT COUNT(*)
-- FROM skill
-- WHERE resume_id = 400000;

-- SELECT *
-- FROM job
-- ORDER BY id DESC
-- LIMIT 5;

-- SELECT *
-- FROM job_skill
-- ORDER BY id DESC
-- LIMIT 5;

-- SELECT *
-- FROM candidate_score
-- ORDER BY id DESC
-- LIMIT 5;