

-- Ranking Query --
-- SELECT
--     candidate.id,
--     candidate.name,
--     candidate_score.job_id,
--     candidate_score.score
-- FROM candidate_score
-- JOIN candidate on candidate.id = candidate_score.candidate_id
-- ORDER BY score DESC
-- LIMIT 10;

-- test
SELECT *
FROM candidate;

SELECT *
FROM skill

-- Clear table AND reset auto-incrementing primary key IDs
-- TRUNCATE TABLE job RESTART IDENTITY CASCADE;

-- ALTER TABLE job
-- ADD COLUMN title VARCHAR(150) NOT NULL DEFAULT 'Not Provided',
-- ADD COLUMN degree_required VARCHAR(150);
