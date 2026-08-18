


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

-- DROP TABLE IF EXISTS job_skill CASCADE;
-- CREATE TABLE job_skill (
--     id INT GENERATED ALWAYS AS IDENTITY (
--         START WITH 800000
--         MINVALUE 800000
--         MAXVALUE 899999
--     ) PRIMARY KEY,
--     name VARCHAR(100) NOT NULL,
--     job_id INT NOT NULL,
--     FOREIGN KEY(job_id) REFERENCES job(id)
-- );

-- test
SELECT *
FROM candidate
ORDER BY id DESC
LIMIT 5;

SELECT *
FROM resume
ORDER BY id DESC
LIMIT 5;

SELECT *
FROM resume_job_title
WHERE resume_id = 400000;

SELECT *
FROM education
WHERE resume_id = 400000;

SELECT *
FROM skill
WHERE resume_id = 400000;

SELECT COUNT(*)
FROM skill
WHERE resume_id = 400000;



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


-- inserting into candidate score

-- load_dotenv("database/.env")
-- DEFAULT_URI = "postgresql://postgres:Jn&3Tv5a8KJkDn2@db.sbowuvozgfrjsezqiqfa.supabase.co:5432/postgres"
-- DB_URI = os.getenv("DATABASE_URI", DEFAULT_URI)

-- def inser_score():

--     conn = None
--     try:
--         conn = psycopg2.connect(DB_URI)
--         with conn.cursor() as cursor:

--             cursor.execute("""
--                 INSERT INTO candidate_score (score, candidate_id, resume_id, job_id)
--                 VALUES (%s, %s, %s, %s)
--                 RETURNING id;
--             """, (score, candidate_id, resume_id, job_id,))

--             conn.commit()

--             return {
--                 "candidate_id": candidate_id,
--                 "resume_id": resume_id
--             }

--     except Exception as error:
--         if conn is not None:
--             conn.rollback()

--         return jsonify({
--             "error": str(error)
--         }), 500

--     finally:
--         if conn is not None:
--             conn.close()