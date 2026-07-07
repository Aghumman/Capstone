DROP DATABASE IF EXISTS ResumeReaderDB;
CREATE DATABASE ResumeReaderDB;
USE ResumeReaderDB;

-- Job table
CREATE TABLE JOB (
    JobID INT PRIMARY KEY,
    Position VARCHAR(15),
    Salary INT,
	EmployerID INT,
	FOREIGN KEY (EmployerID) REFERENCES EMPLOYER(EmployerID)
);

-- Employer table
CREATE TABLE EMPLOYER (
    EmployerID INT PRIMARY KEY,
    Company VARCHAR(50),
    Location VARCHAR(100)
);

-- Candidate provider table
CREATE TABLE CANDIDATE (
    CandidateID INT PRIMARY KEY,
    Name VARCHAR(100),
    Phone VARCHAR(20),
    Email VARCHAR(100)
);

-- Resume table
CREATE TABLE RESUME (
    ResumeID INT PRIMARY KEY,
    CandidateID INT,
    FOREIGN KEY (CandidateID) REFERENCES CANDIDATE(CandidateID)
);

-- Skill table
CREATE TABLE SKILL (
    SkillID INT PRIMARY KEY,
    SkillName VARCHAR(20),
);

-- Candidate Score table
CREATE TABLE CANDIDATE_SCORE (
    ScoreID INT PRIMARY KEY,
    Score INT,
    CandidateID INT,
	ResumeID INT,
    FOREIGN KEY (CandidateID) REFERENCES CANDIDATE(CandidateID)
	FOREIGN KEY (ResumeID) REFERENCES RESUME(ResumeID)
);
