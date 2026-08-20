# PROJECT GUIDE — Campus Placement Assistant

## 1. Project Purpose

Campus Placement Assistant is a web application for managing college placement opportunities.

The system separates:

```text
Admin
Student
```

Admin manages placement drives.

Students view eligible opportunities, inspect recruitment information, access JDs, register through company links, and track applications.

---

# 2. Technology Stack

## Frontend

```text
React
Vite
JavaScript/JSX
CSS
```

## Backend

```text
Python
FastAPI
Uvicorn
Pydantic
SQLAlchemy
```

## Database

```text
SQLite
```

## File Storage

Local filesystem:

```text
backend/uploads/jd/
```

## API

REST-style HTTP API.

---

# 3. How to Run

## Backend

Open Command Prompt:

```cmd
cd C:\Users\User\OneDrive\Desktop\placement-assistant\backend
venv\Scripts\activate
python -m uvicorn main:app --reload
```

Expected:

```text
Uvicorn running on http://127.0.0.1:8000
```

---

## Frontend

Open another terminal:

```cmd
cd C:\Users\User\OneDrive\Desktop\placement-assistant
npm install
npm run dev
```

Expected:

```text
http://localhost:5173
```

---

# 4. Backend Documentation

Swagger:

```text
http://127.0.0.1:8000/docs
```

OpenAPI:

```text
http://127.0.0.1:8000/openapi.json
```

Health:

```text
http://127.0.0.1:8000/api/health
```

---

# 5. Main User Workflows

## Admin

```text
Login
  ↓
Admin Dashboard
  ↓
Create Placement Drive
  ↓
Enter company information
  ↓
Enter eligibility
  ↓
Enter recruitment schedule
  ↓
Enter registration link
  ↓
Select JD PDF
  ↓
Create drive
  ↓
Upload JD
  ↓
View Drive
  ↓
Edit / Withdraw / View Applications
```

---

## Student

```text
Login
  ↓
Student Dashboard
  ↓
View opportunities
  ↓
Open opportunity
  ↓
Eligibility shown
  ↓
Important dates shown
  ↓
Open JD
  ↓
Open company registration link
  ↓
Apply
  ↓
Track application
```

---

# 6. Eligibility

Eligibility can involve:

```text
minimum CGPA
minimum 10th percentage
minimum 12th percentage
maximum active backlogs
eligible branches
gender
graduation year
```

Example:

```text
Student:
CGPA = 7.4
10th = 81
12th = 75
Backlogs = 0
Branch = CSE
Graduation = 2027
```

Drive:

```text
Minimum CGPA = 7
Minimum 10th = 70
Minimum 12th = 70
Maximum Backlogs = 0
Branches = CSE, IT, ECE
Graduation = 2027
```

The student is eligible if all implemented conditions pass.

Always inspect `eligibilityService.js` for the exact current rules.

---

# 7. Placement Drive Data

A drive contains:

```text
Company
Role
CTC
Location

Minimum CGPA
Minimum 10th
Minimum 12th
Maximum backlogs
Branches
Gender
Graduation year

Resume shortlisting
Registration deadline
PPT
Online test
Interview

Registration link
JD
JD filename
Status
```

---

# 8. Drive Status

Known status values include:

```text
Published
Withdrawn
```

Withdrawal is implemented as a status update rather than deleting the drive.

---

# 9. Job Description System

The system supports PDF JD uploads.

Original filename:

```text
Internship business  profile 2026.pdf
```

Physical filename:

```text
4ab0bd4de295434aa123e133cf34e6c1.pdf
```

Database:

```text
jd_filename =
Internship business  profile 2026.pdf

jd =
/uploads/jd/4ab0bd4de295434aa123e133cf34e6c1.pdf
```

The difference is intentional.

---

# 10. Why JD Upload Uses FormData

Normal drive creation/update is JSON.

JD is a binary file.

Therefore:

```text
Drive data
    ↓
application/json

JD
    ↓
multipart/form-data
```

Frontend must not manually set:

```text
Content-Type: application/json
```

for the JD upload request.

---

# 11. Database Tables

## students

Contains student profile/eligibility information.

## placement_drives

Contains placement drive information.

Important JD columns:

```text
jd
jd_filename
```

## applications

Links:

```text
student_id
drive_id
```

and stores application status/stage.

---

# 12. Important Debugging Lessons

## FastAPI 422

Means request validation failed.

Example:

```text
body.company_name
Field required
```

Usually means frontend sent:

```text
companyName
```

while backend expects:

```text
company_name
```

---

## Empty datetime problem

If a Pydantic field is:

```text
datetime | None
```

then an empty string:

```text
""
```

may still fail validation.

Use:

```text
null
```

or omit the field where appropriate.

---

## Multipart error

If FastAPI says:

```text
Form data requires "python-multipart" to be installed.
```

install:

```cmd
pip install python-multipart
```

inside the backend virtual environment.

---

## JD not opening

Check:

```text
1. drive.jd
2. drive.jd_filename
3. physical PDF in backend/uploads/jd
4. main.py StaticFiles mount
5. browser URL
6. backend server
```

---

# 13. Useful curl Tests

Get drive:

```cmd
curl.exe "http://127.0.0.1:8000/api/drives/9"
```

Upload JD:

```cmd
curl.exe -X POST "http://127.0.0.1:8000/api/drives/9/jd" -F "file=@C:\path\file.pdf"
```

Health:

```cmd
curl.exe "http://127.0.0.1:8000/api/health"
```

---

# 14. Git Rules

Do not commit:

```text
node_modules/
venv/
*.db
backend/uploads/
dist/
dev-dist/
__pycache__/
.env
```

Commit:

```text
src/
backend source files
docs/
package.json
package-lock.json
README.md
.gitignore
```

---

# 15. Before a Git Commit

Run:

```cmd
git status
```

Check that:

- source changes are intentional
- database is ignored
- uploaded PDFs are ignored
- virtual environment is ignored
- build folders are ignored
- documentation is included

Then:

```cmd
git add .
git status
git commit -m "Add backend API and JD file management"
git push origin main
```

Use an appropriate commit message for the actual change.

---

# 16. If Moving to Another Computer

Clone the repository.

Then install:

Frontend:

```cmd
npm install
```

Backend:

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy pydantic python-multipart
```

Then run backend and frontend.

The SQLite database and local uploads are intentionally not part of the Git source tree, so seed/sample data or migrations may need to be recreated.

---

# 17. If Moving to Another AI

Provide:

```text
entire repository
+
docs/
```

Start with:

```text
Read docs/AI_HANDOFF.md first.

Then read:
PROJECT_GUIDE.md
ARCHITECTURE.md
DATA_FLOW.md
API_REFERENCE.md
FILE_MAP.md
LEARNING_NOTES.md

Then inspect the source code.

I need help with an existing project. Do not rebuild it or assume undocumented behavior. Trace the relevant frontend-to-backend flow before modifying anything.
```

---

# 18. Project Mental Model

Remember this:

```text
PAGE
 ↓
CONTEXT / STATE
 ↓
SERVICE
 ↓
API
 ↓
ROUTER
 ↓
SCHEMA
 ↓
MODEL
 ↓
DATABASE
```

For files:

```text
PAGE
 ↓
api.js
 ↓
FastAPI router
 ↓
SQLite
```

For JD:

```text
PAGE
 ↓
FormData
 ↓
JD upload endpoint
 ↓
uploads/jd
 ↓
jd + jd_filename
 ↓
StaticFiles
 ↓
PDF
```

If you understand these two diagrams, you can navigate most of the project.
