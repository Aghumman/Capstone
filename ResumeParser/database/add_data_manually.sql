

INSERT INTO employer (company, location) VALUES
('Google',   'New York, NY');

INSERT INTO job (title, position, degree_required, salary, employer_id, description) VALUES
('Software Engineer Intern',    'Intern',   'Associate',    3000,   100000,   'Assign with mentor to assit with projects'),
('Project Manager',             'Manager',  'Bachelor',     140000, 100000,   '');

INSERT INTO candidate (name, phone, email) VALUES
('Alice',    '888-777-9999',   'alice@gmail.com'),
('Bod',      '222-111-3333',   'bob@gmail.com'),
('Charlie',  '555-444-6666',   'charlie@gmail.com'),
('David',    '666-777-3333',   'david@gmail.com');

INSERT INTO resume (candidate_id) VALUES
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