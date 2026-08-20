# API REFERENCE — Campus Placement Assistant

Base API:

```text
http://127.0.0.1:8000/api
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

OpenAPI:

```text
http://127.0.0.1:8000/openapi.json
```

---

# 1. Students

## GET /api/students/

Purpose:

Retrieve students.

Frontend service:

```text
getStudents()
```

Backend:

```text
routers/students.py
```

Response:

```text
StudentResponse[]
```

---

## POST /api/students/

Purpose:

Create a student.

Frontend service:

```text
createStudent(student)
```

Request body:

```json
{
  "name": "string",
  "email": "string",
  "roll_no": "string",
  "mobile": "string",
  "personal_email": "string",
  "branch": "CSE",
  "graduation_year": 2027,
  "cgpa": 7.4,
  "tenth_percentage": 81,
  "twelfth_percentage": 75,
  "active_backlogs": 0,
  "history_of_backlogs": false,
  "gender": "Any",
  "specially_abled": false
}
```

The exact required/optional fields must be confirmed against the current `StudentCreate` schema.

---

## GET /api/students/{student_id}

Purpose:

Retrieve one student.

Frontend service:

```text
getStudent(studentId)
```

---

## PATCH /api/students/{student_id}

Purpose:

Update student information.

The exact request fields depend on the current student update schema/router implementation.

---

# 2. Placement Drives

## GET /api/drives/

Purpose:

Retrieve placement drives.

Frontend:

```text
getDrives()
```

Backend:

```text
routers/drives.py
get_drives()
```

Ordering:

```text
PlacementDrive.id.desc()
```

Therefore newer IDs are returned first.

---

## POST /api/drives/

Purpose:

Create a placement drive.

Frontend:

```text
createDrive(drive)
```

Backend:

```text
routers/drives.py
create_drive()
```

Known request structure:

```json
{
  "company_name": "Nvidia",
  "role": "SDE",
  "ctc": "₹18 LPA",
  "location": "Pune",
  "min_cgpa": 7,
  "min_tenth": 60,
  "min_twelfth": 60,
  "max_backlogs": 0,
  "branches": "CSE, IT, ECE",
  "gender": "Any",
  "graduation_year": 2027,
  "resume_shortlisting": true,
  "deadline": "2026-08-21T23:59:00",
  "ppt": "2026-08-22T15:00:00",
  "online_test": "2026-08-24T11:00:00",
  "interview": "2026-08-27T17:00:00",
  "registration_link": "https://example.com",
  "jd": "",
  "status": "Published"
}
```

Important:

Datetime fields that are optional must not be sent as invalid empty strings if the backend schema expects a datetime or null.

---

## GET /api/drives/{drive_id}

Purpose:

Retrieve a single placement drive.

Frontend:

```text
getDrive(driveId)
```

Backend:

```text
get_drive()
```

Example response:

```json
{
  "company_name": "Nvidia",
  "role": "SDE",
  "ctc": "₹18 LPA",
  "location": "Pune",
  "min_cgpa": 7.0,
  "min_tenth": 60.0,
  "min_twelfth": 60.0,
  "max_backlogs": 0,
  "branches": "CSE, IT, ECE",
  "gender": "Any",
  "graduation_year": 2027,
  "resume_shortlisting": true,
  "deadline": "2026-08-21T23:59:00",
  "ppt": "2026-08-22T15:00:00",
  "online_test": "2026-08-24T11:00:00",
  "interview": "2026-08-27T17:00:00",
  "registration_link": "https://example.com",
  "jd": "/uploads/jd/example.pdf",
  "jd_filename": "Internship business  profile 2026.pdf",
  "status": "Published",
  "id": 9
}
```

---

## PATCH /api/drives/{drive_id}

Purpose:

Update a placement drive.

Frontend:

```text
updateDrive(driveId, drive)
```

Backend:

```text
update_drive()
```

The backend uses:

```python
model_dump(exclude_unset=True)
```

Therefore only supplied fields are updated.

---

## POST /api/drives/{drive_id}/jd

Purpose:

Upload a PDF Job Description.

Frontend:

```text
uploadJobDescription(driveId, file)
```

Request:

```text
multipart/form-data
```

Form field:

```text
file
```

Not JSON.

Backend:

```text
routers/drives.py
upload_job_description()
```

Requirements:

```text
drive must exist
file must be selected
extension must be .pdf
python-multipart must be installed
```

Storage:

```text
backend/uploads/jd/<uuid>.pdf
```

Database:

```text
jd = "/uploads/jd/<uuid>.pdf"
jd_filename = original filename
```

---

# 3. Applications

## GET /api/applications/

Purpose:

Retrieve applications.

Frontend:

```text
getApplications()
```

Backend:

```text
routers/applications.py
```

---

## POST /api/applications/

Purpose:

Create an application.

Frontend:

```text
createApplication(studentId, driveId)
```

Request:

```json
{
  "student_id": 1,
  "drive_id": 9
}
```

Backend creates an `Application`.

Known default values from the model:

```text
status = Applied
current_stage = Applied
applied_at = current UTC time
```

---

## PATCH /api/applications/{application_id}

Purpose:

Update application status/stage.

Frontend service implementation should be checked in the current `api.js` if this function is modified or added later.

Backend:

```text
routers/applications.py
```

---

# 4. System Endpoints

## GET /

Purpose:

Confirm the API is running.

Response:

```json
{
  "message": "Campus Placement Assistant API is running"
}
```

---

## GET /api/health

Purpose:

Health check.

Response:

```json
{
  "status": "ok"
}
```

---

# 5. Static File Endpoint

The application also exposes uploaded files through:

```text
/uploads/*
```

Example:

```text
http://127.0.0.1:8000/uploads/jd/example.pdf
```

This is not a router endpoint in `routers/drives.py`.

It is provided by:

```text
FastAPI StaticFiles
```

configured in:

```text
backend/main.py
```

---

# 6. Common HTTP Errors

## 404

Usually means the requested:

- student
- drive
- application
- or other resource

was not found.

Inspect the route ID and database.

---

## 422

Usually means request validation failed.

Inspect:

```text
response.detail
```

Typical causes:

```text
wrong field name
missing field
wrong data type
invalid datetime
invalid enum/value
empty string where datetime/null is expected
```

---

## 500

Usually means an exception occurred in backend processing.

Check the Uvicorn terminal first.

---

# 7. Frontend API Mapping

Known functions in `src/services/api.js`:

```text
getStudents()
getStudent(studentId)
createStudent(student)

getDrives()
getDrive(driveId)
createDrive(drive)
uploadJobDescription(driveId, file)
updateDrive(driveId, drive)
withdrawDrive(driveId)

getApplications()
createApplication(studentId, driveId)
```

Keep this file as the primary frontend HTTP abstraction instead of scattering raw fetch calls throughout pages unless there is a clear reason.

---

# 8. API Debugging Procedure

When an API request fails:

```text
1. Open browser Network tab.
2. Inspect URL.
3. Inspect HTTP method.
4. Inspect request payload.
5. Inspect response status.
6. Inspect response body.
7. Find matching endpoint in Swagger.
8. Find matching router function.
9. Inspect schema.
10. Inspect model/database.
```

For JD upload:

```text
1. Confirm request is multipart/form-data.
2. Confirm field name is "file".
3. Confirm PDF is selected.
4. Confirm python-multipart is installed.
5. Confirm file appears in backend/uploads/jd.
6. Confirm jd and jd_filename are returned by API.
7. Open the /uploads URL directly.
```

---

# 9. Swagger as a Debugging Tool

Open:

```text
http://127.0.0.1:8000/docs
```

Use:

```text
Try it out
```

to test endpoints independently from React.

This separates frontend bugs from backend bugs.

For example, if:

```text
POST /api/drives/{id}/jd
```

works in Swagger/curl but fails in React, the likely problem is frontend request construction.

If it fails in both, inspect the backend.
