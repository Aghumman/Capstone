/*
==================================================
= This is the schema of the database.            =
= Only needs to run once.                        =
= Just don't touch this file.                    =
==================================================
*/

DROP DATABASE IF EXISTS ResumeReaderDB;
CREATE DATABASE ResumeReaderDB;

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
        CYCLE
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
        CYCLE
    ) PRIMARY KEY,
    title VARCHAR(150) NOT NULL DEFAULT 'Not Provided',
    position VARCHAR(20) CHECK (position IN ('Intern', 'Junior', 'Senior', 'Manager')),
    degree_required VARCHAR(20) CHECK (degree_required IN ('High School', 'Trade School', 'Certificate', 'Associate', 'Bachelor', 'Master', 'Doctorate')),
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
        CYCLE
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
        CYCLE
    ) PRIMARY KEY,
    candidate_id INT NOT NULL,
    FOREIGN KEY(candidate_id) REFERENCES candidate(id)
);

-- Resume Job Title table
DROP TABLE IF EXISTS resume_job_title CASCADE;
CREATE TABLE resume_job_title (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 700000
        MINVALUE 700000
        MAXVALUE 799999
        CYCLE
    ) PRIMARY KEY,
    title VARCHAR(150) NOT NULL DEFAULT 'Not Provided',
    resume_id INT NOT NULL,
    FOREIGN KEY(resume_id) REFERENCES resume(id)
);

DROP TABLE IF EXISTS job_skill CASCADE;
CREATE TABLE job_skill (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 800000
        MINVALUE 800000
        MAXVALUE 899999
        CYCLE
    ) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    job_id INT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES job(id)
);

-- Candidate Score table
DROP TABLE IF EXISTS candidate_score CASCADE;
CREATE TABLE candidate_score (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 500000
        MINVALUE 500000
        MAXVALUE 599999
        CYCLE
    ) PRIMARY KEY,
    score FLOAT NOT NULL,
    candidate_id INT NOT NULL,
    resume_id INT NOT NULL,
	job_id INT NOT NULL,
    FOREIGN KEY(candidate_id) REFERENCES candidate(id),
    FOREIGN KEY(resume_id) REFERENCES resume(id),
	FOREIGN KEY(job_id) REFERENCES job(id)
);

-- Education table
DROP TABLE IF EXISTS education CASCADE;
CREATE TABLE education (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 600000
        MINVALUE 600000
        MAXVALUE 699999
        CYCLE
    ) PRIMARY KEY,
    school VARCHAR(100),
    degree VARCHAR(150),
	resume_id INT NOT NULL,
    FOREIGN KEY(resume_id) REFERENCES resume(ID)
);

-- Skill table
DROP TABLE IF EXISTS skill CASCADE;
CREATE TABLE skill (
    id INT GENERATED ALWAYS AS IDENTITY (
        START WITH 1000000
        MINVALUE 1000000
        MAXVALUE 1999999
        CYCLE
    ) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    resume_id INT NOT NULL,
    FOREIGN KEY(resume_id) REFERENCES resume(id)
);