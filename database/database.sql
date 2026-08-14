DROP DATABASE IF EXISTS ResumeReaderDB;
CREATE DATABASE ResumeReaderDB;
-- USE ResumeReaderDB;

-- Enable RLS for each table, the following code allow the database to be tested
CREATE OR REPLACE FUNCTION enable_rls_for_testing()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
    obj record;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE' LOOP
        IF obj.schema_name = 'public' THEN
            -- Enable Row Level Security
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', obj.objid::regclass);

            -- Drop old policy if present
            EXECUTE format('
                DROP POLICY IF EXISTS "Allow full access for authenticated users" 
                ON public.%I;
            ', obj.objid::regclass);

            -- Create full access testing policy
            EXECUTE format('
                CREATE POLICY "Allow full access for authenticated users" 
                ON public.%I 
                FOR ALL 
                TO authenticated 
                USING (true) 
                WITH CHECK (true);
            ', obj.objid::regclass);
        END IF;
    END LOOP;
END;
$$;

-- Employer table
DROP TABLE IF EXISTS employer CASCADE;
CREATE TABLE employer (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 100000
        MINVALUE 100000
        MAXVALUE 199999
    ) PRIMARY KEY,
    company VARCHAR(50),
    location VARCHAR(50)
);

-- Job table
DROP TABLE IF EXISTS job CASCADE;
CREATE TABLE job (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 200000
        MINVALUE 200000
        MAXVALUE 299999
    ) PRIMARY KEY,
    position VARCHAR(20) CHECK (position IN ('Intern', 'Junior', 'Senior', 'Manager')),
    salary INT,
	employer_id INT,
    description TEXT,
	FOREIGN KEY(employer_id) REFERENCES employer(id)
);

-- Candidate provider table
DROP TABLE IF EXISTS candidate CASCADE;
CREATE TABLE candidate (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 300000
        MINVALUE 300000
        MAXVALUE 399999
    ) PRIMARY KEY,
    name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100)
);

-- Resume table
DROP TABLE IF EXISTS resume CASCADE;
CREATE TABLE resume (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 400000
        MINVALUE 400000
        MAXVALUE 499999
    ) PRIMARY KEY,
    candidate_id INT,
    FOREIGN KEY(candidate_id) REFERENCES candidate(id)
);

-- Candidate Score table
DROP TABLE IF EXISTS candidate_score CASCADE;
CREATE TABLE candidate_score (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 500000
        MINVALUE 500000
        MAXVALUE 599999
    ) PRIMARY KEY,
    score FLOAT,
    candidate_id INT,
	job_id INT,
    FOREIGN KEY(candidate_id) REFERENCES candidate(id),
	FOREIGN KEY(job_id) REFERENCES job(id)
);

-- Education table
DROP TABLE IF EXISTS education CASCADE;
CREATE TABLE education (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 600000
        MINVALUE 600000
        MAXVALUE 699999
    ) PRIMARY KEY,
    school VARCHAR(100),
    degree VARCHAR(10) CHECK (Degree IN ('Associate', 'Bachelor', 'Master', 'Doctoral')),
	resume_id INT,
    FOREIGN KEY(resume_id) REFERENCES resume(ID)
);

-- Skill table
DROP TABLE IF EXISTS skill CASCADE;
CREATE TABLE skill (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 700000
        MINVALUE 700000
        MAXVALUE 999999
    ) PRIMARY KEY,
    name VARCHAR(20),
    resume_id INT,
    FOREIGN KEY(resume_id) REFERENCES resume(id)
);


INSERT INTO employer (company, location) VALUES
('Google',   'New York, NY');

INSERT INTO job (position, salary, employer_id, description) VALUES
('Intern',  3000,   100000,   'Assign with mentor to assit with projects'),
('Manager', 140000, 100000,   '');

INSERT INTO candidate (name, phone, email) VALUES
('Alice',    '888-777-9999',   'alice@gmail.com'),
('Bod',      '222-111-3333',   'bob@gmail.com'),
('Charlie',  '555-444-6666',   'charlie@gmail.com'),
('David',    '666-777-3333',   'david@gmail.com');

INSERT INTO RESUME (candidate_id) VALUES
(300001),
(300003),
(300002);

INSERT INTO skill (name, resume_id) VALUES
('Python',  400001),
('Java',    400000),
('C++',     400002),
('Excel',   400001);

INSERT INTO candidate_score (score, candidate_id, job_id) VALUES
(70,    300001, 200000),
(93,    300003, 200000),
(85,    300002, 200000);

INSERT INTO education (school, degree, resume_id) VALUES
('Hunter College',      'Master',   400000),
('Queens College',      'Bachelor', 400001),
('Colombia University', 'Master',   400002);

-- Ranking Query --
SELECT
    candidate.id,
    candidate.name,
    candidate_score.job_id,
    candidate_score.score
FROM candidate_score
JOIN candidate on candidate.id = candidate_score.candidate_id
ORDER BY score DESC
LIMIT 10;