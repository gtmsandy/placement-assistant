# Placement Assistant

## Overview

Placement Assistant is a full-stack campus placement management platform for students and placement administrators. It centralizes student profiles, placement drives, eligibility evaluation, applications, recruitment-stage processing, result uploads, protected documents, and authentication/password recovery.

The application is designed around two roles:

- Students maintain their placement profile, view eligible opportunities, apply, and track outcomes.
- Administrators create and manage drives, configure eligibility, process recruitment rounds, and review applications.

## Tech Stack

### Backend

- Python
- FastAPI and Uvicorn
- SQLAlchemy
- Alembic
- Pydantic
- PostgreSQL
- JWT (`python-jose`) and bcrypt
- OpenPyXL for recruitment-result workbooks

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Context API
- Vite PWA plugin

## Features

### Student Features

- Login with an NITR college email, registered Indian mobile number, or username
- Indian mobile normalization, including `+91` input
- Protected student routes and profile management
- Resume upload and authorized resume retrieval
- Published placement-opportunity discovery
- Eligibility result and rejection-reason display
- One application per student and placement drive
- Application status and recruitment-stage tracking
- Password-recovery flow for student email/mobile identifiers

### Admin Features

- Role-protected administration routes
- Placement-drive creation, viewing, editing, publishing, and withdrawal
- Eligibility configuration for each drive
- Protected job-description PDF upload and retrieval
- Application management
- Canonical forward-only recruitment transitions
- Excel result processing for each recruitment round
- Automatic advancement of listed candidates and rejection of absent eligible candidates

### Security Features

- JWT authentication and role-based access control (RBAC)
- bcrypt password hashing
- Access-token invalidation through `auth_version` after password reset
- HMAC-hashed OTP and reset-token JTI values
- OTP expiry, attempt limits, resend cooldowns, and resend limits
- One-time reset-token consumption and replay prevention
- Account-enumeration-resistant recovery responses
- Database foreign keys and duplicate-application protection
- File extension, MIME, size, and signature validation
- Generated storage names and path-confinement checks
- Authorized resume and JD endpoints; no public `/uploads` mount

## Architecture

```text
React frontend
      ↓ HTTP/JSON and multipart uploads
FastAPI REST API
      ↓
SQLAlchemy ORM
      ↓
PostgreSQL
```

Cross-cutting services keep important policy out of individual pages and endpoints:

- JWT authentication identifies the current user.
- RBAC dependencies separate student and administrator permissions.
- The eligibility engine evaluates the same criteria on the server for every application.
- The application state machine owns valid recruitment transitions.
- Protected file endpoints authorize access before resolving and returning stored files.
- Password recovery uses a provider abstraction, persistent OTP challenges, and short-lived reset JWTs.

## Recruitment Workflow

```text
Applied
  → Resume Shortlisting (when enabled)
  → PPT
  → Online Test
  → Interview
  → Result
  → Selected
```

Application statuses are `Applied`, `Shortlisted`, `Selected`, and `Rejected`. A candidate can be rejected during any configured recruitment round. `Selected` and `Rejected` are terminal states; a rejected application retains the round at which rejection occurred.

For drives without resume shortlisting, processing begins at PPT.

## Eligibility Engine

Eligibility is evaluated from the student profile and drive configuration using:

- CGPA
- 10th percentage
- 12th percentage
- active backlogs
- branch
- graduation year
- gender
- PwD eligibility (`Any`, `PwD Only`, or `Non-PwD Only`)

The backend is authoritative and returns a controlled reason when a criterion fails.

## Authentication and Password Recovery

Students can authenticate with their NITR college email, registered Indian mobile number, or username. Administrators authenticate with their configured username. Successful login returns a role-bearing access JWT, and protected routes verify both the token and current user role.

Password recovery supports 6-digit OTP challenges, secure HMAC digests, expiry, attempt and resend controls, a short-lived reset JWT, one-time reset authorization, bcrypt password replacement, and invalidation of older access tokens through `auth_version`.

**OTP/password recovery infrastructure is implemented and tested using a provider abstraction. Real email delivery requires provider configuration.** The repository includes a fake provider for automated tests; it does not claim that production email or SMS delivery is enabled.

## Project Structure

```text
backend/
  alembic/             Database migration environment and revisions
  providers/           OTP delivery interface and test fake
  routers/             Authentication, student, drive, and application APIs
  tests/               Backend unit and integration-style tests
  application_state.py Canonical recruitment state machine
  auth_identifiers.py  Email/mobile/username normalization
  database.py          SQLAlchemy engine, session, and Base
  eligibility.py       Server-side eligibility rules
  models.py            SQLAlchemy table models
  password_recovery.py OTP and password-reset service
  password_security.py Password policy and bcrypt helpers
  schemas.py           Pydantic request/response validation
  upload_security.py   Upload limits, signatures, and path confinement

src/
  components/          Shared route and status UI
  context/             Application, placement, student, and reminder state
  pages/               Student, administrator, and authentication screens
  services/            Central API client, eligibility display, and upload validation

docs/
  PROJECT_GUIDE.md     Interview-ready technical walkthrough
```

## Local Installation

### Prerequisites

- Python 3.12 or newer
- Node.js and npm
- A reachable PostgreSQL database

### Backend (Windows PowerShell)

From the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Create `backend/.env` and set the backend variables listed below. Then apply migrations and start the API:

```powershell
alembic upgrade head
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Useful local endpoints:

- API health: `http://127.0.0.1:8001/api/health`
- Swagger UI: `http://127.0.0.1:8001/docs`
- OpenAPI schema: `http://127.0.0.1:8001/openapi.json`

### Frontend

From the project root in a second terminal:

```powershell
npm install
npm run dev
```

Vite normally serves the application at `http://127.0.0.1:5173` or prints the selected local URL. The frontend API URL must point to the backend on port `8001`.

## Environment Variables

Use long, independent random values for each secret. Never commit `.env` files or real credentials.

Backend (`backend/.env`):

```dotenv
DATABASE_URL=replace_with_postgresql_connection_string
JWT_SECRET_KEY=replace_with_a_long_random_secret
OTP_HASH_SECRET=replace_with_a_different_long_random_secret
IDENTIFIER_HASH_SECRET=replace_with_another_long_random_secret
PASSWORD_RESET_SECRET=replace_with_a_separate_long_random_secret
```

Frontend (project-root `.env`):

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8001
```

`BROWSER_DEMO_PASSWORD` is optional and is used only by the explicit browser-demo seed utility. Do not run seed utilities against a database unless that is intentional.

## Database Migrations

Run Alembic commands from `backend/` with the backend virtual environment active:

```powershell
alembic upgrade head
alembic current
alembic check
```

Alembic is the authoritative schema-management mechanism. Do not create application tables manually or use the retired SQLite-to-PostgreSQL migration script for a new database.

## Tests and Build

Backend, from `backend/`:

```powershell
python -m unittest discover -s tests -v
python -m compileall .
```

Frontend, from the project root:

```powershell
npm run build
```

The submission baseline was verified with 150 passing backend tests and a successful production frontend build.

## Security Notes

- Authentication is not authorization: API dependencies enforce role and ownership after token validation.
- Student resume access is owner-only, while administrators may access resumes for placement work.
- Students can retrieve JDs only for published drives; administrators can retrieve JDs for all drive states.
- Stored file paths are resolved inside expected upload directories before files are returned.
- OTPs and reset-token JTIs are never stored in plaintext.
- Password-recovery request responses do not disclose whether an account exists.
- Secrets belong in environment variables, never source control.

For a system-design and interview walkthrough, see [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md).
