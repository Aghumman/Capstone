# Resume Parser and Candidate Matching System

## Overview

This project is a resume parsing and candidate-job matching system. It uses a custom-trained spaCy Named Entity Recognition (NER) model to extract information from resumes and job descriptions. The extracted information is stored in a PostgreSQL database and used to score and rank candidates based on job requirements.

## Major Features

- Resume parsing for PDF and DOCX files
- Extraction of job titles, skills, schools, and degrees
- Job description and skill parsing
- Candidate-job matching and scoring
- Candidate ranking
- PostgreSQL database integration
- Flask API for frontend/backend communication

## Technologies Used

- Python
- Flask
- spaCy
- PostgreSQL / Supabase
- scikit-learn
- PDFPlumber
- python-docx
- Label Studio
- React
- Git/GitHub

## Machine Learning

A custom spaCy NER model was trained using manually annotated resumes to recognize:

- `JOB_TITLE`
- `SKILL`
- `SCHOOL`
- `DEGREE`

Five versions of the model were evaluated using precision, recall, and F1 score. Model 5 was integrated into the final application.

## API Endpoints

- `POST /parse-resume` – Parses an uploaded resume and stores extracted information.
- `POST /parse-job-description` – Extracts information from a job description and stores the job.
- `POST /score-resume` – Calculates and stores a candidate-job match score.
- `GET /ranking` – Returns ranked candidates.

## Setup

Create a `.env` file containing your database connection:

    DATABASE_URI=<your-database-connection-string>

Run the backend:

    python ResumeParse.py

## Contributors

Faaizah Afoda: Web Interface (Dashboard, login, and the upload and ranking pages)
Areeba Ghumman: Resume Parsing  (Format handling (.pdf and .docx), text extraction, and section parsing)
Bonnie Lei: Database (Schema, ER Diagram, Ranking Report)
Oluwafemi Olosunde: Machine Learning (Skill extraction, TF-IDF/cosine similarity scoring, feedback generation)
