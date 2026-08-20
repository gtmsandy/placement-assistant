# DATA FLOW — Campus Placement Assistant

This file describes the actual flow of important operations through the project.

---

# 1. Application Startup

## Frontend

```text
Browser
  ↓
Vite
  ↓
src/main.jsx
  ↓
React application
  ↓
src/App.jsx
  ↓
Routes/pages
```

## Backend

```text
python -m uvicorn main:app --reload
  ↓
backend/main.py
  ↓
Base.metadata.create_all(bind=engine)
  ↓
FastAPI app
  ↓
CORS configuration
  ↓
/uploads StaticFiles
  ↓
students router
drives router
applications router
  ↓
Server on 127.0.0.1:8000
```

---

# 2. Admin Creates Placement Drive

```text
Admin
  ↓
CreateDrive.jsx
  ↓
form state
  ↓
createDrive(drive)
  ↓
src/services/api.js
  ↓
POST /api/drives/
  ↓
FastAPI
  ↓
routers/drives.py
  ↓
create_drive()
  ↓
DriveCreate
  ↓
PlacementDrive(**drive_data.model_dump())
  ↓
db.add()
  ↓
db.commit()
  ↓
db.refresh()
  ↓
DriveResponse
  ↓
Frontend
```

---

# 3. Important Field Mapping

Frontend form field names may differ from backend API field names.

Example:

```text
Frontend:
companyName

Backend:
company_name
```

Other backend drive fields include:

```text
company_name
role
ctc
location
min_cgpa
min_tenth
min_twelfth
max_backlogs
branches
gender
graduation_year
resume_shortlisting
deadline
ppt
online_test
interview
registration_link
jd
jd_filename
status
```

If FastAPI reports:

```text
body.company_name
Field required
```

inspect the object sent by the frontend.

---

# 4. Admin Uploads JD

```text
Admin
  ↓
CreateDrive/EditDrive
  ↓
PDF file selected
  ↓
uploadJobDescription(driveId, file)
  ↓
FormData
  ↓
POST /api/drives/{driveId}/jd
  ↓
UploadFile
  ↓
routers/drives.py
  ↓
Find PlacementDrive
  ↓
Check filename
  ↓
Check .pdf extension
  ↓
Generate UUID
  ↓
Save file
  ↓
backend/uploads/jd/<uuid>.pdf
  ↓
drive.jd = "/uploads/jd/<uuid>.pdf"
  ↓
drive.jd_filename = original filename
  ↓
db.commit()
  ↓
DriveResponse
```

---

# 5. Why Stored Filename Is Different

Example:

```text
Original:
Internship business  profile 2026.pdf
```

Stored:

```text
4ab0bd4de295434aa123e133cf34e6c1.pdf
```

Database:

```text
jd:
 /uploads/jd/4ab0bd4de295434aa123e133cf34e6c1.pdf

jd_filename:
 Internship business  profile 2026.pdf
```

This is expected.

The UUID filename is the physical storage filename.

`jd_filename` is the display filename.

---

# 6. Student Opens Opportunity

```text
Student Dashboard
  ↓
OpportunityDetails.jsx
  ↓
getDrive(driveId)
  ↓
GET /api/drives/{driveId}
  ↓
routers/drives.py
  ↓
query PlacementDrive
  ↓
DriveResponse
  ↓
frontend receives:
  jd
  jd_filename
  company_name
  role
  eligibility
  dates
  etc.
```

---

# 7. Student Views JD

The backend serves the physical file.

```text
Student clicks View
  ↓
Frontend builds backend file URL
  ↓
http://127.0.0.1:8000/uploads/jd/<uuid>.pdf
  ↓
FastAPI StaticFiles
  ↓
backend/uploads/jd/<uuid>.pdf
  ↓
Browser PDF viewer
```

If this fails, inspect:

```text
1. drive.jd
2. backend/uploads/jd/
3. main.py StaticFiles mount
4. browser URL
5. backend server
```

---

# 8. Student Applies

```text
Student
  ↓
OpportunityDetails.jsx
  ↓
createApplication(studentId, driveId)
  ↓
POST /api/applications/
  ↓
applications.py
  ↓
ApplicationCreate
  ↓
Application
  ↓
db.add()
  ↓
db.commit()
  ↓
ApplicationResponse
```

---

# 9. Application Status Flow

Conceptually:

```text
Applied
   ↓
Shortlisted
   ↓
Test
   ↓
Interview
   ↓
Selected / Rejected
```

The exact statuses/stages should always be checked against the current `applications.py`, schemas, contexts, and UI.

---

# 10. Drive Withdrawal

Withdrawal is a soft state change.

```text
Admin
  ↓
Withdraw Drive
  ↓
withdrawDrive(driveId)
  ↓
updateDrive()
  ↓
PATCH /api/drives/{driveId}
  ↓
status = "Withdrawn"
  ↓
database updated
```

The database row is not deleted.

Existing applications remain stored.

---

# 11. Debugging a Broken Feature

Use this sequence:

```text
UI
 ↓
Component
 ↓
Context (if applicable)
 ↓
Service function
 ↓
HTTP endpoint
 ↓
Router function
 ↓
Pydantic schema
 ↓
SQLAlchemy model
 ↓
Database/file storage
```

Trace from both directions when necessary.

---

# 12. JD Debugging Checklist

If JD upload fails:

```text
Frontend file input
        ↓
uploadJobDescription()
        ↓
FormData key = "file"
        ↓
POST /api/drives/{id}/jd
        ↓
python-multipart installed?
        ↓
UploadFile received?
        ↓
PDF extension?
        ↓
uploads/jd exists?
        ↓
file written?
        ↓
jd updated?
        ↓
jd_filename updated?
        ↓
db.commit?
```

If upload succeeds but viewing fails:

```text
GET /api/drives/{id}
        ↓
Does jd contain /uploads/jd/...?
        ↓
Does physical PDF exist?
        ↓
Is /uploads mounted?
        ↓
Is URL pointing to port 8000?
        ↓
Does browser open URL directly?
```

---

# 13. Data Ownership

```text
UI-only state
    ↓
React state/context

Persistent structured data
    ↓
FastAPI + SQLite

Uploaded binary files
    ↓
backend/uploads/

Path/name metadata
    ↓
PlacementDrive.jd
PlacementDrive.jd_filename
```

---

# 14. Important Principle

When a value looks wrong on screen, do not immediately change the UI.

Trace:

```text
Screen
 ↓
React state
 ↓
API response
 ↓
database
```

The displayed value may already be wrong before it reaches the component.
