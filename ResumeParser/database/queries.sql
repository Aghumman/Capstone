
-- Ranking Query --
-- SELECT
--     candidate.id AS candidate_id,
--     candidate.name,
--     candidate_score.job_id,
--     candidate_score.score
-- FROM candidate_score
-- JOIN candidate on candidate.id = candidate_score.candidate_id
-- ORDER BY score DESC
-- LIMIT 10;

-- ALTER TABLE employer ALTER COLUMN id SET CYCLE;
-- ALTER TABLE job ALTER COLUMN id SET CYCLE;
-- ALTER TABLE candidate ALTER COLUMN id SET CYCLE;
-- ALTER TABLE resume ALTER COLUMN id SET CYCLE;
-- ALTER TABLE resume_job_title ALTER COLUMN id SET CYCLE;
-- ALTER TABLE job_skill ALTER COLUMN id SET CYCLE;
-- ALTER TABLE candidate_score ALTER COLUMN id SET CYCLE;
-- ALTER TABLE education ALTER COLUMN id SET CYCLE;
-- ALTER TABLE skill ALTER COLUMN id SET CYCLE;

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