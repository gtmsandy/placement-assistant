Placement Assistant
A full-stack campus placement management platform designed to streamline recruitment workflows for students and placement administrators.
🔗 Live Application
Launch Placement Assistant
Overview
Placement Assistant is a full-stack campus placement management platform for students and placement administrators. It centralizes student profiles, placement drives, eligibility evaluation, applications, recruitment-stage processing, result uploads, protected documents, and authentication/password recovery.
The application is designed around two roles:
- Students maintain their placement profile, view eligible opportunities, apply, and track outcomes.
- Administrators create and manage drives, configure eligibility, process recruitment rounds, and review applications.
Tech Stack
Backend
- Python
- FastAPI and Uvicorn
- SQLAlchemy
- Alembic
- Pydantic
- PostgreSQL
- JWT (PyJWT) and bcrypt
- OpenPyXL for recruitment-result workbooks
- pypdf for PDF validation
Frontend
- React
- Vite
- Tailwind CSS
- React Router
- Context API
- Vite PWA plugin
Deployment and Storage
- Vercel Services
- Supabase PostgreSQL
- Vercel Private Blob
- Internal Blob signer service using @vercel/blob
- Resend for production email delivery
Features
Student Features
- Login with an NITR college email, registered Indian mobile number, or username
- Indian mobile normalization, including +91 input
- Protected student routes and profile management
- Resume upload and authorized resume retrieval
- Published placement-opportunity discovery
- Eligibility result and rejection-reason display
- One application per student and placement drive
- Application status and recruitment-stage tracking
- Password recovery by OTP sent to the student's institutional NITR email
Admin Features
- Role-protected administration routes
- Placement-drive creation, viewing, editing, publishing, and withdrawal
- Eligibility configuration for each drive
- Protected job-description PDF upload and retrieval
- Application management
- Canonical forward-only recruitment transitions
- Excel result processing for each recruitment round
- Automatic advancement of listed candidates and rejection of absent eligible candidates
Security Features
- HttpOnly cookie JWT authentication, session-bound CSRF protection, and role-based access control (RBAC)
- bcrypt password hashing
- Access-token invalidation through auth_version after logout or password reset
- HMAC-hashed OTP and reset-token JTI values
- OTP expiry, attempt limits, resend cooldowns, and resend limits
- One-time reset-token consumption and replay prevention
- Account-enumeration-resistant recovery responses
- Database foreign keys and duplicate-application protection
- File extension, MIME, size, signature, and structural validation
- Server-generated storage names
- Authorized resume and JD access
- No public /uploads mount
- Private Blob storage with short-lived signed operations
- Signed Blob URLs are not persisted
- API responses use Cache-Control: no-store
- Production security headers include HSTS, X-Frame-Options, X-Content-Type-Options, Referrer Policy, and Permissions Policy
Architecture
Browser
  │
  ▼
Vercel
  ├── Frontend Service
  │     └── React / Vite / PWA
  │
  ├── /api/* → FastAPI Service
  │               ├── Authentication / CSRF / RBAC
  │               ├── Eligibility engine
  │               ├── Recruitment workflow
  │               ├── Supabase PostgreSQL
  │               └── Internal Blob signer binding
  │
  └── Private Blob Upload / Download
          ├── Browser receives short-lived authorized signed operation
          ├── Browser transfers file directly to Vercel Private Blob
          └── FastAPI validates and finalizes the stored object
Cross-cutting services keep important policy out of individual pages and endpoints:
- JWT authentication identifies the current user.
- RBAC dependencies separate student and administrator permissions.
- The eligibility engine evaluates the same criteria on the server for every application.
- The application state machine owns valid recruitment transitions.
- Protected file endpoints authorize access before signed upload/download operations are issued.
- Uploaded files are structurally validated before database acceptance.
- Password recovery uses a provider abstraction, persistent OTP challenges, and short-lived reset JWTs.
Recruitment Workflow
Applied
  → Resume Shortlisting (when enabled)
  → PPT
  → Online Test
  → Interview
  → Result
  → Selected
Application statuses are Applied, Shortlisted, Selected, and Rejected. A candidate can be rejected during any configured recruitment round. Selected and Rejected are terminal states; a rejected application retains the round at which rejection occurred.
For drives without resume shortlisting, processing begins at PPT.
Eligibility Engine
Eligibility is evaluated from the student profile and drive configuration using:
- CGPA
- 10th percentage
- 12th percentage
- active backlogs
- branch
- graduation year
- gender
- PwD eligibility (Any, PwD Only, or Non-PwD Only)
The backend is authoritative and returns a controlled reason when a criterion fails.
Authentication and Password Recovery
Students authenticate with their NITR college email or registered Indian mobile number. Administrators authenticate with their configured username or email.
Successful login stores an eight-hour role-bearing JWT in the host-only placement_access HttpOnly cookie. The SPA reconstructs authentication through GET /api/auth/session, keeps its CSRF nonce in memory, and sends X-CSRF-Token on unsafe authenticated requests.
Logout increments auth_version, invalidating every older session for that user.
Password recovery is email-only and supports:
- 6-digit OTP challenges sent to the student's institutional NITR email
- secure HMAC digests
- expiry, attempt, and resend controls
- a short-lived reset JWT
- one-time reset authorization
- bcrypt password replacement
- invalidation of older access tokens through auth_version
SMS OTP is not part of V1.
Production email delivery is configured through Resend. Successful live delivery also depends on the configured sender/domain being valid with the provider.
Project Structure
backend/
  alembic/                 Database migration environment and revisions
  providers/               OTP delivery interface and provider implementations
  routers/                 Authentication, student, drive, and application APIs
  tests/                   Backend unit and integration-style tests
  application_state.py     Canonical recruitment state machine
  auth_identifiers.py      Email/mobile/username normalization
  blob_signer_client.py    Internal Blob signer client
  blob_storage.py          Private Blob storage helpers
  database.py              SQLAlchemy engine, session, and Base
  eligibility.py           Server-side eligibility rules
  models.py                SQLAlchemy table models
  password_recovery.py     OTP and password-reset service
  password_security.py     Password policy and bcrypt helpers
  schemas.py               Pydantic request/response validation
  upload_security.py       Upload limits and structural validation

blob-signer/
  server.ts                Internal signed Blob operation service
  tests/                   Blob signer tests

src/
  components/              Shared route and status UI
  context/                 Application, placement, student, and reminder state
  pages/                   Student, administrator, and authentication screens
  services/                Central API client, eligibility display, and upload logic

docs/
  PROJECT_GUIDE.md         Interview-ready technical walkthrough
  PRODUCTION_RUNBOOK.md    Production operations and security guidance

vercel.json                Vercel Services configuration
.vercelignore              Deployment artifact exclusions
Local Installation
Prerequisites
- Python 3.12
- Node.js and npm
- A reachable PostgreSQL database
Backend — Windows PowerShell
From the project root:
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.lock.txt
Create backend/.env and set the backend variables listed below. Then apply migrations and start the API:
alembic upgrade head
python -m uvicorn main:app --host 127.0.0.1 --port 8001
Useful local endpoints:
- API health: http://127.0.0.1:8001/api/health
- Swagger UI: http://127.0.0.1:8001/docs
- OpenAPI schema: http://127.0.0.1:8001/openapi.json
Frontend
From the project root in a second terminal:
npm install
npm run dev
Vite normally serves the application at http://127.0.0.1:5173 or prints the selected local URL. Browser calls use relative /api/* URLs; the Vite development proxy forwards them to FastAPI on port 8001.
Environment Variables
Use long, independent random values for each secret. Never commit .env files or real credentials.
Backend (backend/.env):
DATABASE_URL=replace_with_postgresql_connection_string
JWT_SECRET_KEY=replace_with_a_long_random_secret
OTP_HASH_SECRET=replace_with_a_different_long_random_secret
IDENTIFIER_HASH_SECRET=replace_with_another_long_random_secret
PASSWORD_RESET_SECRET=replace_with_a_separate_long_random_secret

EMAIL_PROVIDER=resend
RESEND_API_KEY=replace_with_resend_api_key
EMAIL_FROM_ADDRESS=no-reply@example.com
EMAIL_FROM_NAME=Placement Assistant

APP_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
UPLOAD_ROOT=uploads
Production Configuration
Production uses:
APP_ENV=production
EMAIL_PROVIDER=resend
Production secrets are configured through Vercel environment variables rather than committed files.
BLOB_SIGNER_INTERNAL_URL is supplied through the internal Vercel Service Binding and should not be replaced with a public URL.
Vercel Private Blob is used for production document storage. UPLOAD_ROOT is only relevant to local filesystem-based development behavior and is not used as persistent production storage.
Production same-origin operation does not require ALLOWED_ORIGINS; omit it unless a specific cross-origin client is intentionally supported.
BROWSER_DEMO_PASSWORD is optional and is used only by the explicit browser-demo seed utility. Do not run seed utilities against a database unless that is intentional.
Database Migrations
Run Alembic commands from backend/ with the backend virtual environment active:
alembic upgrade head
alembic current
alembic check
Alembic is the authoritative schema-management mechanism. Do not create application tables manually or use the retired SQLite-to-PostgreSQL migration script for a new database.
The deployed production schema is currently at:
44ca310debb9 (head)
Tests and Build
Backend
From backend/:
python -m unittest discover -s tests -v
Current production certification:
328/328 backend tests passed
Blob Signer
From blob-signer/:
npm test
npm audit
npm audit --omit=dev
Current production certification:
28/28 signer tests passed
0 known npm vulnerabilities
Frontend
From the project root:
npm run build
npm audit
npm audit --omit=dev
The production frontend build and dependency audits pass.
Deployment
The application is deployed on Vercel using the repository-level Services configuration in vercel.json.
Production
Live Application:
https://placement-assistant-omega.vercel.app
Production deployment verification includes:
- frontend and SPA routes
- /api/health
- FastAPI /docs
- unauthenticated session handling
- Supabase PostgreSQL connectivity
- Alembic schema consistency
- Private Blob service binding
- resume/JD/result-upload end-to-end flows
- authorized and unauthorized download behavior
- CSRF enforcement
- invalid-upload cleanup
- signed-URL non-persistence
- runtime log checks
- production security headers
Security Notes
- Authentication is not authorization: API dependencies enforce role and ownership after token validation.
- Student resume access is owner-only, while administrators may access resumes for placement work.
- Students can retrieve JDs only for published drives; administrators can retrieve JDs for all drive states.
- Private file access is authorized before short-lived signed operations are issued.
- Uploaded files are validated before their storage pathname is accepted into the database.
- Temporary result-upload objects are cleaned up after processing.
- OTPs and reset-token JTIs are never stored in plaintext.
- Password-recovery request responses do not disclose whether an account exists.
- Secrets belong in environment variables, never source control.
- Production uses HTTPS, secure cookies, CSRF protection, private Blob storage, and restrictive security headers.
- The process-local login limiter remains defense in depth; edge-level rate limiting can supplement it in production.
Documentation
For a system-design and interview walkthrough, see:
[`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md)
For production operations, security headers, migration, backup, and rollback requirements, see:
[`docs/PRODUCTION_RUNBOOK.md`](docs/PRODUCTION_RUNBOOK.md)
