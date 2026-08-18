


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

-- Instantly empties the table
-- TRUNCATE TABLE candidate;

-- Clear table AND reset auto-incrementing primary key IDs back to 1
-- TRUNCATE TABLE job RESTART IDENTITY CASCADE;

-- ALTER TABLE job
-- ADD COLUMN title VARCHAR(150) NOT NULL DEFAULT 'Not Provided',
-- ADD COLUMN degree_required VARCHAR(150);

-- DROP TABLE IF EXISTS job CASCADE;
-- CREATE TABLE job (
--     id INT GENERATED ALWAYS AS IDENTITY (
--         START WITH 200000
--         MINVALUE 200000
--         MAXVALUE 299999
--     ) PRIMARY KEY,
--     title VARCHAR(150) NOT NULL,
--     position VARCHAR(20) CHECK (position IN ('Intern', 'Junior', 'Senior', 'Manager')),
--     degree_required VARCHAR(150),
--     salary INT,
-- 	employer_id INT,
--     description TEXT,
-- 	FOREIGN KEY(employer_id) REFERENCES employer(id)
-- );

-- INSERT INTO resume (candidate_id) VALUES
-- (300001),
-- (300003),
-- (300002);

-- INSERT INTO job (title, position, degree_required, salary, employer_id, description) VALUES
-- ('Software Engineer Intern',    'Intern',   'Associate',    3000,   100000,   'Assign with mentor to assit with projects'),
-- ('Project Manager',             'Manager',  'Bachelor',     140000, 100000,   '');

-- INSERT INTO candidate_score (score, candidate_id, job_id) VALUES
-- (70,    300001, 200000),
-- (93,    300003, 200000),
-- (85,    300002, 200000);