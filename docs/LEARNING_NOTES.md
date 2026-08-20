# LEARNING NOTES — Campus Placement Assistant

This file is for studying the project rather than merely using it.

---

# 1. Learn the Project in This Order

Do not start by memorizing every file.

Learn:

```text
1. React pages
2. React state/context
3. fetch/API layer
4. HTTP/REST
5. FastAPI routes
6. Pydantic schemas
7. SQLAlchemy models
8. SQLite
9. file upload/static file serving
10. complete end-to-end data flow
```

---

# 2. React

A React page is primarily a UI component.

Examples:

```text
CreateDrive.jsx
EditDrive.jsx
OpportunityDetails.jsx
StudentDashboard.jsx
```

Learn:

```text
useState
useEffect
props
event handlers
conditional rendering
forms
routing
```

---

# 3. React Context

Contexts provide shared state.

Current contexts:

```text
StudentContext
PlacementContext
ApplicationContext
ReminderContext
```

Understand:

```text
Provider
 ↓
Context value
 ↓
useContext()
 ↓
component
```

---

# 4. API Service Layer

`src/services/api.js` centralizes HTTP communication.

For example:

```text
createDrive()
```

does not itself create a database record.

It sends an HTTP request:

```text
POST /api/drives/
```

The backend performs the database operation.

This distinction is important.

---

# 5. HTTP

Understand:

```text
GET
POST
PATCH
DELETE
```

Current project primarily uses:

```text
GET
POST
PATCH
```

Typical meaning:

```text
GET    read
POST   create/action
PATCH  partial update
```

---

# 6. JSON

Normal API communication uses JSON.

Example:

```json
{
  "company_name": "Nvidia",
  "role": "SDE"
}
```

The browser sends it.

FastAPI parses it.

Pydantic validates it.

The router uses it.

SQLAlchemy persists it.

---

# 7. FormData

Files cannot be sent as normal JSON.

JD upload uses:

```text
FormData
```

Flow:

```text
PDF
 ↓
FormData
 ↓
multipart/form-data
 ↓
UploadFile
```

The browser handles the multipart boundary automatically.

---

# 8. FastAPI

FastAPI maps Python functions to HTTP endpoints.

Example concept:

```python
@router.get("/...")
def get_something():
    ...
```

The decorator creates an HTTP route.

---

# 9. Dependency Injection

The project uses:

```python
db: Session = Depends(get_db)
```

Meaning FastAPI obtains a database session and supplies it to the endpoint.

---

# 10. Pydantic

Schemas validate API data.

For example:

```text
DriveCreate
```

defines what can be accepted when creating a drive.

If the frontend sends an invalid value, FastAPI can return:

```text
422 Validation Error
```

---

# 11. SQLAlchemy

SQLAlchemy is the ORM.

Instead of manually writing SQL for every operation, Python objects represent database rows.

Example:

```text
PlacementDrive
```

represents a row in:

```text
placement_drives
```

---

# 12. SQLite

SQLite stores the persistent structured data in:

```text
backend/placement.db
```

Tables:

```text
students
placement_drives
applications
```

---

# 13. Database Model vs Schema

This distinction is essential.

### Model

```text
models.py
```

Describes the database.

### Schema

```text
schemas.py
```

Describes API input/output.

Conceptually:

```text
Frontend JSON
    ↓
Pydantic Schema
    ↓
Router
    ↓
SQLAlchemy Model
    ↓
Database
```

---

# 14. REST Endpoint Mental Model

Example:

```text
GET /api/drives/9
```

means:

```text
GET
 ↓
/api/drives
 ↓
resource collection = drives
 ↓
/9 = specific drive
```

---

# 15. Error Codes

## 200

Successful request.

## 404

Resource not found.

## 422

Validation problem.

## 500

Server-side exception.

---

# 16. JD File Architecture

The JD teaches an important distinction between:

```text
database data
```

and:

```text
binary file storage
```

The database stores metadata/path:

```text
jd
jd_filename
```

The actual PDF lives on disk:

```text
backend/uploads/jd/
```

This pattern is common in real applications.

---

# 17. StaticFiles

FastAPI can expose a directory using:

```text
StaticFiles
```

The project maps:

```text
/uploads
```

to:

```text
backend/uploads
```

Therefore a database value such as:

```text
/uploads/jd/file.pdf
```

can be served by FastAPI.

---

# 18. Why UUID Is Used

Uploaded PDFs receive a generated UUID filename.

Purpose:

```text
avoid collisions
avoid overwriting same-named files
```

Original name remains in:

```text
jd_filename
```

---

# 19. Git

Git tracks source-code changes.

Important commands:

```cmd
git status
git add .
git commit -m "message"
git push
git pull
git log
```

---

# 20. Git Ignore

Runtime/generated files should not normally be committed.

Current examples:

```text
node_modules/
venv/
*.db
backend/uploads/
dist/
dev-dist/
```

---

# 21. How to Debug Like a Developer

Do not guess.

Ask:

```text
Where does the value originate?
```

Then trace:

```text
UI
 ↓
state
 ↓
API call
 ↓
HTTP request
 ↓
backend route
 ↓
schema
 ↓
model
 ↓
database
```

For a file:

```text
UI
 ↓
FormData
 ↓
UploadFile
 ↓
filesystem
 ↓
database path
 ↓
StaticFiles
 ↓
browser
```

---

# 22. Example Debugging Exercise

Problem:

```text
Student cannot open JD.
```

Do not immediately edit OpportunityDetails.jsx.

Check:

```text
1. Does API return jd?
2. Is jd_filename present?
3. Does the physical PDF exist?
4. Is the path correct?
5. Is FastAPI mounting /uploads?
6. Does the direct PDF URL work?
7. Does frontend construct the URL correctly?
```

This narrows the problem systematically.

---

# 23. Another Debugging Exercise

Problem:

```text
Create Drive gives 422.
```

Check:

```text
Frontend object
 ↓
field names
 ↓
types
 ↓
datetime values
 ↓
DriveCreate
```

Common mismatch:

```text
companyName
```

versus:

```text
company_name
```

Common datetime problem:

```text
""
```

instead of:

```text
null
```

---

# 24. What to Learn for Interviews

This project can demonstrate knowledge of:

```text
React
REST APIs
HTTP
FastAPI
Pydantic
SQLAlchemy
SQLite
CRUD
Dependency Injection
CORS
File Uploads
Static File Serving
FormData
Validation
Git/GitHub
Frontend-backend architecture
```

Be able to explain every one using this project.

---

# 25. Recommended Study Strategy

For each feature, ask:

```text
What does the user do?
Which component handles it?
Which state changes?
Which service function is called?
Which HTTP endpoint is called?
Which router receives it?
Which schema validates it?
Which model stores it?
What does the database contain?
What response comes back?
How does the UI update?
```

If you can answer all ten, you understand that feature.

---

# 26. Do Not Memorize Code

Instead memorize relationships.

For example:

```text
CreateDrive.jsx
        ↓
createDrive()
        ↓
POST /api/drives/
        ↓
create_drive()
        ↓
DriveCreate
        ↓
PlacementDrive
```

That is more valuable than memorizing individual lines.

---

# 27. The Three Levels of Understanding

### Level 1 — User

"I can create a placement drive."

### Level 2 — Developer

"I know which frontend component and API endpoint create it."

### Level 3 — Full-stack developer

"I can trace the request through React → fetch → FastAPI → Pydantic → SQLAlchemy → SQLite and back."

Your goal should be Level 3.
