# AI HANDOFF — Campus Placement Assistant

## 1. Purpose

This document is the starting point for any AI assistant that will maintain, debug, extend, or explain this project.

The project is a Campus Placement Assistant web application. It has:

- A React/Vite frontend.
- A FastAPI backend.
- SQLAlchemy ORM.
- SQLite database.
- REST APIs for students, placement drives, and applications.
- PDF Job Description upload and serving.
- Separate admin and student workflows.
- Frontend contexts for placement, student, application, and reminders.

The project is already functional. Treat it as an existing codebase rather than a project that should be rebuilt from scratch.

---

## 2. Source of Truth

The actual source code is the final source of truth.

Documentation describes the intended and known architecture, but an AI must inspect the current source before changing it.

Do not assume that a function, field, route, component, or dependency exists only because it appears in documentation.

When documentation and code disagree:

1. Inspect the actual code.
2. Identify the current behavior.
3. Preserve working behavior unless the user explicitly asks for a change.
4. Update the documentation after the change.

---

## 3. Main Architecture

```text
React/Vite Frontend
        |
        | fetch()
        v
src/services/api.js
        |
        | HTTP REST API
        v
FastAPI
        |
        +----------------------+
        |                      |
        v                      v
routers/*.py             Static /uploads
        |
        v
schemas.py
        |
        v
models.py
        |
        v
SQLAlchemy
        |
        v
SQLite placement.db
```

---

## 4. Frontend Structure

```text
src/
├── components/
│   └── ApplicationStatus.jsx
├── context/
│   ├── ApplicationContext.jsx
│   ├── PlacementContext.jsx
│   ├── ReminderContext.jsx
│   └── StudentContext.jsx
├── layouts/
├── pages/
│   ├── admin/
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminDriveDetails.jsx
│   │   ├── AdminDrives.jsx
│   │   ├── ApplicationsManagement.jsx
│   │   ├── CreateDrive.jsx
│   │   ├── DrivePreview.jsx
│   │   ├── EditDrive.jsx
│   │   ├── UpcomingEvents.jsx
│   │   └── WithdrawnDrives.jsx
│   ├── auth/
│   │   └── Login.jsx
│   └── student/
│       ├── Applications.jsx
│       ├── Calendar.jsx
│       ├── OpportunityDetails.jsx
│       ├── ReminderSettings.jsx
│       ├── StudentDashboard.jsx
│       └── StudentProfile.jsx
├── services/
│   ├── api.js
│   ├── eligibilityService.js
│   └── notificationService.js
├── App.jsx
├── App.css
├── index.css
└── main.jsx
```

---

## 5. Backend Structure

```text
backend/
├── routers/
│   ├── __init__.py
│   ├── applications.py
│   ├── drives.py
│   └── students.py
├── uploads/
│   └── jd/
├── database.py
├── main.py
├── models.py
├── schemas.py
└── placement.db
```

`placement.db`, `venv`, Python cache files, frontend dependencies, build output, and uploaded runtime files should not be treated as source-code dependencies.

---

## 6. Important Current Backend Configuration

`main.py`:

- Creates database tables with `Base.metadata.create_all(bind=engine)`.
- Creates the FastAPI application.
- Enables CORS for local Vite/frontend development ports.
- Mounts `backend/uploads` as `/uploads`.
- Includes students, drives, and applications routers.
- Provides `/` and `/api/health`.

The upload mount is essential for viewing uploaded PDFs.

Conceptually:

```text
backend/uploads/jd/example.pdf
        |
        v
FastAPI StaticFiles
        |
        v
/ uploads / jd / example.pdf
```

---

## 7. Job Description Upload Flow

The current JD implementation uses two database fields:

- `jd` — stored URL/path to the uploaded PDF.
- `jd_filename` — original filename shown to the user.

Upload flow:

```text
Create/Edit Drive
       |
       v
Select PDF
       |
       v
FormData
       |
       v
POST /api/drives/{drive_id}/jd
       |
       v
routers/drives.py
       |
       +--> validate drive
       +--> validate filename
       +--> require .pdf
       +--> generate unique UUID filename
       +--> save to backend/uploads/jd/
       +--> store URL in jd
       +--> store original name in jd_filename
       +--> commit database
       |
       v
DriveResponse
```

Example database state:

```text
jd:
  /uploads/jd/4ab0bd4de295434aa123e133cf34e6c1.pdf

jd_filename:
  Internship business  profile 2026.pdf
```

The generated filename is intentionally different from the original filename. The original filename is preserved separately in `jd_filename`.

---

## 8. Important Frontend/API Rule

Normal JSON requests use:

```text
Content-Type: application/json
```

JD uploads must NOT manually set JSON content type.

They use:

```text
FormData
```

and the browser automatically creates the multipart boundary.

---

## 9. Python Multipart Dependency

JD upload uses FastAPI `File(...)` and `UploadFile`.

Therefore the backend environment must have:

```text
python-multipart
```

installed.

Without it, Uvicorn fails while loading the route and reports:

```text
Form data requires "python-multipart" to be installed.
```

---

## 10. Debugging Procedure

When something breaks:

### Step 1 — Reproduce

Write down:

- page
- button
- expected result
- actual result
- browser console error
- backend terminal error

### Step 2 — Identify frontend entry point

Find the page/component involved.

### Step 3 — Find API call

Usually inspect:

```text
src/services/api.js
```

### Step 4 — Find backend endpoint

Search for the endpoint in:

```text
backend/routers/
```

### Step 5 — Inspect schema

Check:

```text
backend/schemas.py
```

### Step 6 — Inspect model

Check:

```text
backend/models.py
```

### Step 7 — Check database

For SQLite, inspect:

```text
placement.db
```

### Step 8 — Check static files

For JD problems:

```text
backend/uploads/jd/
```

and:

```text
backend/main.py
```

### Step 9 — Test API independently

Use browser, Swagger at `/docs`, or curl.

### Step 10 — Modify only the relevant files

Avoid unrelated rewrites.

---

## 11. Rules for Future AI

Before changing code:

1. Read this file.
2. Read `PROJECT_GUIDE.md`.
3. Read `ARCHITECTURE.md`.
4. Read `DATA_FLOW.md`.
5. Read `API_REFERENCE.md`.
6. Read `FILE_MAP.md`.
7. Inspect the actual source files involved.
8. Trace the complete path of the data.
9. Explain the cause before making a structural change.
10. Preserve existing functionality.

Never blindly replace an entire file if a small targeted change is sufficient.

---

## 12. Current Known Development Commands

Frontend:

```cmd
npm install
npm run dev
```

Backend:

```cmd
cd backend
venv\Scripts\activate
python -m uvicorn main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

Frontend:

```text
http://localhost:5173
```

---

## 13. Migration to Another AI

Give the AI:

```text
Entire Git repository
+
docs/
```

Then say:

> Read all files in `docs/` first. This is an existing project. Do not rebuild it. Inspect the actual source code and use the documentation as a map. When debugging, trace frontend → API service → FastAPI router → schema → model → database/static storage before proposing changes.

The AI should then ask for or inspect only the files relevant to the problem.

---

## 14. Important Limitation

These documents are maintained manually. They cannot automatically guarantee that future code changes are documented.

Whenever a significant feature is added, update:

- `FILE_MAP.md`
- `DATA_FLOW.md`
- `API_REFERENCE.md`
- `ARCHITECTURE.md`
- `PROJECT_GUIDE.md`
- `AI_HANDOFF.md` if the overall architecture changes
- `LEARNING_NOTES.md` if a new technical concept was introduced
