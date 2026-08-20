# FILE MAP — Campus Placement Assistant

This is the current known repository map.

> Always compare this document against the actual repository after major changes.

---

# 1. Root

```text
placement-assistant/
├── backend/
├── docs/
├── public/
├── src/
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── vite.config.js
```

Ignored/generated directories may also exist locally:

```text
node_modules/
dist/
dev-dist/
```

---

# 2. Documentation

```text
docs/
├── AI_HANDOFF.md
├── ARCHITECTURE.md
├── DATA_FLOW.md
├── FILE_MAP.md
├── LEARNING_NOTES.md
├── PROJECT_GUIDE.md
└── API_REFERENCE.md
```

---

# 3. Frontend

```text
src/
├── assets/
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

# 4. Frontend File Responsibilities

## main.jsx

React entry point.

---

## App.jsx

Main application composition/routing layer.

If navigation or page routing breaks, inspect this file first.

---

## Contexts

### StudentContext.jsx

Shared student state.

### PlacementContext.jsx

Placement-drive state and related frontend behavior.

### ApplicationContext.jsx

Application state.

### ReminderContext.jsx

Reminder-related state.

---

# 5. Admin Pages

## AdminDashboard.jsx

Admin landing/dashboard.

Likely entry point for managing placement drives.

---

## AdminDrives.jsx

Placement drive listing/management.

---

## AdminDriveDetails.jsx

Detailed admin view of a specific drive.

Contains actions such as:

```text
Edit
Withdraw
View Applications
```

and drive information.

---

## CreateDrive.jsx

Admin form for creating a placement drive.

Important areas:

```text
Company Details
Eligibility Criteria
Recruitment Schedule
Registration
Job Description
Drive Status
```

It interacts with:

```text
createDrive()
uploadJobDescription()
```

---

## EditDrive.jsx

Admin form for modifying an existing drive.

Important:

JD upload is a separate multipart operation from the normal JSON PATCH operation.

Typical flow:

```text
PATCH drive fields
+
POST JD file
```

---

## DrivePreview.jsx

Preview of drive information before/around publication.

---

## ApplicationsManagement.jsx

Admin application-management interface.

---

## UpcomingEvents.jsx

Admin view for upcoming recruitment events.

---

## WithdrawnDrives.jsx

Shows drives whose status is withdrawn.

---

# 6. Student Pages

## StudentDashboard.jsx

Student landing page.

Displays available placement opportunities.

---

## OpportunityDetails.jsx

Detailed student-facing placement-drive page.

Important functions:

```text
drive information
eligibility
important dates
JD
registration link
application
```

This page is especially important for debugging student JD viewing.

---

## Applications.jsx

Student applications.

---

## Calendar.jsx

Placement/recruitment calendar.

---

## ReminderSettings.jsx

Reminder configuration UI.

---

## StudentProfile.jsx

Student profile and eligibility-related information.

---

# 7. Authentication

## Login.jsx

Login/user entry page.

The project currently appears to use application-level frontend behavior rather than a complete production authentication system. Inspect current implementation before assuming JWT/session authentication exists.

---

# 8. Service Files

## api.js

Central REST API client.

Important functions:

```text
getStudents
getStudent
createStudent

getDrives
getDrive
createDrive
uploadJobDescription
updateDrive
withdrawDrive

getApplications
createApplication
```

---

## eligibilityService.js

Eligibility calculations.

Known student criteria include:

```text
CGPA
10th percentage
12th percentage
branch
backlogs
graduation year
```

---

## notificationService.js

Notification/reminder functionality.

Inspect current source for exact implementation.

---

# 9. Backend

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

---

# 10. Backend Files

## main.py

FastAPI application setup.

Responsibilities:

```text
FastAPI app
CORS
database table creation
StaticFiles /uploads
router registration
root endpoint
health endpoint
```

---

## database.py

SQLAlchemy engine/base/session configuration.

Provides:

```text
Base
engine
get_db
```

---

## models.py

SQLAlchemy models:

```text
Student
PlacementDrive
Application
```

---

## schemas.py

Pydantic request/response models.

Known:

```text
StudentCreate
StudentResponse

DriveCreate
DriveResponse
DriveUpdate

ApplicationCreate
ApplicationResponse
```

---

# 11. Router Files

## students.py

Student CRUD endpoints.

---

## drives.py

Placement drive endpoints.

Important functions:

```text
get_drives()
get_drive()
create_drive()
update_drive()
upload_job_description()
```

The JD upload implementation:

```text
UploadFile
File(...)
UUID filename
uploads/jd
jd
jd_filename
```

---

## applications.py

Application endpoints.

---

# 12. Runtime Storage

## placement.db

SQLite database.

Ignored by Git.

It is local runtime data, not source code.

---

## backend/uploads/jd/

Uploaded Job Description PDFs.

Ignored by Git.

Do not depend on these files being available on another machine.

---

# 13. Build/Dependency Files

## package.json

Frontend dependencies and npm scripts.

## package-lock.json

Locked frontend dependency versions.

## vite.config.js

Vite configuration.

## eslint.config.js

ESLint configuration.

---

# 14. Important Cross-File Relationships

```text
CreateDrive.jsx
    ↓
api.js
    ↓
drives.py
    ↓
schemas.py
    ↓
models.py
    ↓
placement.db
```

JD:

```text
CreateDrive/EditDrive
    ↓
api.js
    ↓
drives.py
    ↓
uploads/jd
    ↓
jd + jd_filename
    ↓
main.py StaticFiles
    ↓
OpportunityDetails.jsx
```

Student:

```text
StudentProfile.jsx
    ↓
StudentContext/api.js
    ↓
students.py
    ↓
Student schema/model
    ↓
placement.db
```

Applications:

```text
OpportunityDetails.jsx
    ↓
api.js
    ↓
applications.py
    ↓
Application model
    ↓
placement.db
    ↓
Applications.jsx / ApplicationsManagement.jsx
```
