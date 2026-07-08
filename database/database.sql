DROP DATABASE IF EXISTS ResumeReaderDB;
CREATE DATABASE ResumeReaderDB;
-- USE ResumeReaderDB;

-- Employer table
DROP TABLE IF EXISTS EMPLOYER CASCADE;
CREATE TABLE EMPLOYER (
    EmployerID INT PRIMARY KEY,
    Company VARCHAR(50),
    Location VARCHAR(50)
);

-- Job table
DROP TABLE IF EXISTS JOB CASCADE;
CREATE TABLE JOB (
    JobID INT PRIMARY KEY,
    Position VARCHAR(20) CHECK (Position IN ('Intern', 'Junior', 'Senior', 'Manager')),
    Salary INT,
	EmployerID INT,
    Description TEXT,
	FOREIGN KEY(EmployerID) REFERENCES EMPLOYER(EmployerID)
);

-- Candidate provider table
DROP TABLE IF EXISTS CANDIDATE CASCADE;
CREATE TABLE CANDIDATE (
    CandidateID INT PRIMARY KEY,
    Name VARCHAR(100),
    Phone VARCHAR(20),
    Email VARCHAR(100)
);

-- Resume table
DROP TABLE IF EXISTS RESUME CASCADE;
CREATE TABLE RESUME (
    ResumeID INT PRIMARY KEY,
    CandidateID INT,
    FOREIGN KEY(CandidateID) REFERENCES CANDIDATE(CandidateID)
);

-- Skill table
DROP TABLE IF EXISTS SKILL CASCADE;
CREATE TABLE SKILL (
    SkillID INT PRIMARY KEY,
    SkillName VARCHAR(20),
    ResumeID INT,
    FOREIGN KEY(ResumeID) REFERENCES RESUME(ResumeID)
);

-- Candidate Score table
DROP TABLE IF EXISTS CANDIDATE_SCORE CASCADE;
CREATE TABLE CANDIDATE_SCORE (
    ScoreID INT PRIMARY KEY,
    Score INT,
    CandidateID INT,
	ResumeID INT,
    FOREIGN KEY(CandidateID) REFERENCES CANDIDATE(CandidateID),
	FOREIGN KEY(ResumeID) REFERENCES RESUME(ResumeID)
);


-- data test
INSERT INTO CANDIDATE (CandidateID, Name, Phone, Email) VALUES
(3001,  'Alice',    '888-777-9999',   'alice@gmail.com'),
(3002,  'Bod',      '222-111-3333',   'bob@gmail.com'),
(3003,  'Charlie',  '555-444-6666',   'charlie@gmail.com'),
(3004,  'David',    '666-777-3333',   'david@gmail.com');

INSERT INTO RESUME (ResumeID, CandidateID) VALUES
(4001,  3002),
(4002,  3004);

INSERT INTO SKILL (SkillID, SkillName, ResumeID) VALUES
(5001, 'Python',   4002),
(5002, 'Java',     4001),
(5003, 'C++',      4001),
(5004, 'Excel',    4002);


-- Queries --
SELECT *
FROM SKILL
WHERE SkillName = 'Excel'