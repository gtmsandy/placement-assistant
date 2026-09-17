# Placement Assistant — Interview Walkthrough

This guide explains the completed V1 in a form that can be used for a project demonstration, technical interview, or code walkthrough. The repository and current Alembic migrations are the source of truth.

## 1. Problem Statement

Campus placements involve student profiles, company eligibility rules, application tracking, documents, and multi-round selection workflows. Managing these separately creates duplicated data, inconsistent decisions, and limited visibility.

Placement Assistant provides one role-aware system where:

- students maintain their profile, discover eligible drives, apply, and track progress;
- placement administrators configure drives, evaluate applicants, upload round results, and advance or reject candidates safely;
- the backend enforces eligibility, workflow, authorization, and data integrity rather than trusting the browser.

## 2. System Architecture

```text
React + Vite frontend
          ↓
     FastAPI REST API
          ↓
     SQLAlchemy ORM
          ↓
       PostgreSQL
```

The frontend handles presentation and local interaction. FastAPI owns validation, authentication, authorization, eligibility decisions, workflow transitions, uploads, and error responses. SQLAlchemy maps domain objects to PostgreSQL, while Alembic versions the schema.

Important policy modules are deliberately centralized:

- `auth_identifiers.py`: identifier normalization
- `eligibility.py`: placement eligibility
- `application_state.py`: recruitment transitions
- `upload_security.py`: file validation and safe storage paths
- `password_recovery.py`: OTP lifecycle and reset authorization

## 3. Tech Stack

### Backend

- Python
- FastAPI and Uvicorn
- Pydantic
- SQLAlchemy
- Alembic
- PostgreSQL
- `python-jose` JWTs
- bcrypt
- OpenPyXL

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Context API
- Vite PWA plugin

## 4. Why These Technologies?

### Why FastAPI?

FastAPI provides typed request validation, dependency injection, automatic OpenAPI documentation, clear HTTP error handling, and a compact structure for REST APIs. It works naturally with Pydantic and makes role dependencies such as `require_student` and `require_admin` reusable.

### Why React and Vite?

React fits the application’s role-specific dashboards and shared state. Vite provides a fast development server and a straightforward production build. React Router controls page navigation, while protected-route components prevent unauthenticated UI access.

### Why PostgreSQL?

The domain is relational: users link to students, applications link students to drives, and OTP challenges link to users. PostgreSQL provides transactions, foreign keys, uniqueness, indexes, and reliable concurrent constraint enforcement.

### Why SQLAlchemy?

SQLAlchemy keeps persistence logic in Python models and queries while still allowing PostgreSQL constraints to remain authoritative. It also gives tests a consistent data-access interface.

### Why Alembic?

Model edits alone do not safely change an existing database. Alembic creates reviewable, ordered schema revisions and provides `upgrade`, `current`, and drift-check workflows.

## 5. Database Design

The main tables are:

- `students`: identity, contact, academic profile, PwD status, and resume metadata
- `users`: login identity, bcrypt password hash, role, optional student link, and `auth_version`
- `placement_drives`: company/role data, eligibility criteria, schedule, JD metadata, and publication state
- `applications`: one student-to-drive application with status and current stage
- `otp_challenges`: hashed OTP lifecycle, delivery state, verification state, and reset-token authorization
- `alembic_version`: current schema revision

Key integrity rules include:

- unique student email, roll number, and non-null mobile;
- at most one user linked to a student;
- foreign keys from applications to students and drives;
- unique `(student_id, drive_id)` applications;
- one active password-recovery challenge per identifier and purpose.

Database constraints protect against races that application-level pre-checks cannot fully prevent.

## 6. Authentication

The login endpoint accepts an identifier, password, and requested role.

For students, supported identifiers are:

- NITR college email (`@nitrkl.ac.in`)
- registered Indian mobile number
- existing username

Mobile input is normalized to a canonical 10-digit value, including supported `+91` input. Administrators continue to use configured usernames.

After bcrypt password verification, the API issues an HS256 access JWT containing:

- user ID in `sub`;
- role;
- token type `access`;
- `auth_version`;
- issue and expiry timestamps.

Protected dependencies decode the token, require the access-token type, load the current user, and compare the token’s `auth_version` with the database.

## 7. Authorization

Authentication answers “Who is this user?” Authorization answers “May this user perform this action?”

The backend uses reusable role dependencies and endpoint-specific ownership checks:

- students cannot use administrator drive or recruitment controls;
- students can create and view only their own applications;
- a student can retrieve only their own resume;
- administrators can retrieve student resumes for placement administration;
- students can retrieve JDs only for published drives;
- administrators can retrieve JDs for draft, published, or withdrawn drives.

Frontend route guards improve user experience, but backend checks are the security boundary.

## 8. Eligibility Engine

The server evaluates all implemented criteria:

- minimum CGPA;
- minimum 10th percentage;
- minimum 12th percentage;
- maximum active backlogs;
- allowed branches;
- graduation year;
- gender;
- PwD eligibility (`Any`, `PwD Only`, or `Non-PwD Only`).

The engine returns both a boolean and a controlled reason. The application endpoint runs this check again, so changing browser state cannot bypass eligibility.

## 9. Recruitment State Machine

The canonical flow is:

```text
Applied
  → Resume Shortlisting (optional)
  → PPT
  → Online Test
  → Interview
  → Result
  → Selected
```

Statuses are:

- `Applied`
- `Shortlisted`
- `Selected`
- `Rejected`

`current_stage` records the active round for a non-terminal application and the decisive round for a rejected application. `Selected` and `Rejected` are terminal.

The centralized state machine validates source states and computes the one permitted next state. This prevents skipped rounds, backward movement, repeated processing, and contradictory status/stage combinations. Drives without resume shortlisting begin round processing at PPT.

## 10. Excel Result Processing

Administrators upload an `.xlsx` or `.xlsm` workbook for one explicit round. The backend:

1. validates the extension, MIME type, size, and workbook signature;
2. parses candidate identifiers;
3. selects only applications currently ready for that round;
4. advances listed candidates using the state machine;
5. rejects absent candidates at that round;
6. leaves terminal, wrong-stage, and other-drive applications unchanged;
7. commits the controlled batch result.

The state machine is reused rather than duplicating transition rules inside the parser.

## 11. Resume and JD Security

Uploads are not exposed through a public static-files mount.

Validation includes:

- allow-listed extensions and MIME types;
- size limits (resume 5 MiB, JD 10 MiB, Excel 5 MiB);
- PDF, Office document, and workbook signature checks;
- UUID-based stored filenames;
- resolved-path confinement to the expected upload directory.

Files are returned through authenticated API endpoints after role, ownership, and drive-state checks. Original display names are stored separately from generated physical names.

## 12. OTP and Password Recovery

The student flow is:

```text
Institutional NITR email
  → 6-digit OTP challenge
  → OTP verification
  → short-lived password-reset JWT
  → new password
  → login
```

Security controls include:

- CSPRNG-generated 6-digit codes;
- HMAC OTP digests instead of plaintext storage;
- HMAC identifier fingerprints;
- 10-minute expiry;
- five verification attempts;
- 60-second resend cooldown;
- three-resend limit;
- one active challenge per identifier/purpose;
- old-code invalidation after resend;
- generic known/unknown account responses;
- random reset JTI with only its digest persisted;
- short-lived, typed reset JWTs that cannot act as access JWTs;
- one-time reset-token consumption and replay prevention;
- current-password rejection and 12-character/72-byte password limits;
- `auth_version` increment after reset, invalidating older access tokens.

Password recovery is email-only. OTP/password recovery infrastructure is implemented and tested using a provider abstraction. Resend is the real email provider and requires environment configuration. The included fake provider is for automated testing; SMS OTP is not part of V1.

The provider integration is verified with mocked HTTP tests. Live Resend delivery remains unverified until credentials and an explicitly authorized recipient are available.

## 13. Major Challenges

### Preserving data integrity during concurrent requests

Application pre-checks provide friendly errors, but two requests can pass a pre-check at the same time. Database unique constraints and `IntegrityError` handling close that race safely.

### Keeping recruitment states consistent

Scattered page or endpoint rules can create invalid combinations. A single backend state machine defines valid active states, terminal states, and forward transitions.

### Securing uploaded documents

Extensions and browser MIME values are not sufficient. The implementation combines size limits, signatures, generated names, path confinement, and authorized download endpoints.

### Preventing recovery-account enumeration

Known and unknown identifiers follow the same public response contract. Unknown identifiers use suppressed challenge behavior, so the response does not reveal account existence.

### Invalidating sessions after a password reset

Stateless JWTs remain valid until expiry unless the server tracks revocation state. The lightweight solution is a user-level `auth_version` embedded in access tokens and incremented on reset.

### Moving schema ownership to migrations

Alembic became the authoritative schema mechanism. Generated revisions are manually reviewed before application, and `alembic check` detects model/database drift.

## 14. How the Challenges Were Solved

- Enforce critical invariants at both API and PostgreSQL layers.
- Centralize reusable domain policies instead of copying them between routers.
- Treat the browser as untrusted and revalidate all important inputs server-side.
- Return controlled client errors while logging unexpected details server-side.
- Use dependency injection for testable provider and authentication boundaries.
- Add focused regression tests before each hardening change.

## 15. Testing Strategy

The backend uses Python `unittest` with isolated database fixtures and injected dependencies. Coverage includes:

- application integrity and race handling;
- recruitment transitions and terminal-state behavior;
- authentication identifier regressions;
- OTP request, resend, verify, reset, replay, and token-version behavior;
- eligibility, including PwD rules;
- schema validation and exception sanitization;
- role and ownership boundaries;
- upload validation, protected access, and path confinement.

Run from `backend/`:

```powershell
python -m unittest discover -s tests -v
python -m compileall .
alembic current
alembic check
```

Run from the project root:

```powershell
npm run build
```

The final submission baseline is 150 passing backend tests, a successful frontend production build, and Alembic revision `1da9cb3da96d` with no drift.

## 16. Local Setup Summary

Backend, from the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
alembic upgrade head
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Frontend, from the project root:

```powershell
npm install
npm run dev
```

Backend environment variables:

```text
DATABASE_URL
JWT_SECRET_KEY
OTP_HASH_SECRET
IDENTIFIER_HASH_SECRET
PASSWORD_RESET_SECRET
EMAIL_PROVIDER
RESEND_API_KEY
EMAIL_FROM_ADDRESS
EMAIL_FROM_NAME
```

Frontend environment variable:

```text
VITE_API_BASE_URL
```

Never commit real values. Alembic is authoritative; do not manually create tables or run the retired SQLite migration script for a new PostgreSQL database.

## 17. Likely Interview Questions

### Why FastAPI?

It provides typed validation, dependency injection, automatic API documentation, and concise async-capable REST endpoints. Its dependency system is especially useful for authentication and RBAC.

### Why PostgreSQL?

The application has relational data and concurrency-sensitive invariants. PostgreSQL gives strong transactions, foreign keys, uniqueness, indexing, and production-grade constraint enforcement.

### Why Alembic?

It versions schema changes so they can be reviewed, applied in order, reproduced on another database, and checked for drift against SQLAlchemy metadata.

### How does JWT authentication work here?

After password verification, the server signs an access JWT containing user ID, role, token type, timestamps, and `auth_version`. Protected dependencies verify the signature and type, load the user, and compare the current version.

### Authentication versus authorization?

Authentication proves identity. Authorization checks whether that identity may perform a specific action. A valid student token, for example, does not authorize administrator endpoints or another student’s resume.

### How do you prevent students from viewing another student’s resume?

The resume endpoint requires authentication and compares the requested student with the authenticated user’s linked student ID. Administrators follow a separate authorized path. There is no public upload URL.

### How is eligibility calculated?

The backend compares the student profile with every configured drive criterion and returns the first controlled failure reason. The check runs again when applying, so frontend manipulation cannot bypass it.

### How do you prevent duplicate applications?

The API performs a friendly pre-check, and PostgreSQL enforces a unique `(student_id, drive_id)` constraint. An integrity-error fallback handles concurrent duplicate requests.

### How are recruitment stages enforced?

The backend state machine validates the current status/stage pair and computes the only allowed next state. Terminal states cannot move, and wrong-round or repeated processing is rejected.

### Why centralize the state machine?

It gives manual updates, Excel processing, APIs, and tests one definition of truth. That prevents subtle differences between separate implementations.

### How does Excel result processing work?

The admin identifies the round and uploads a validated workbook. Only candidates ready for that round are processed: listed candidates advance and absent candidates are rejected at that stage.

### How do you protect uploaded files?

The server checks extension, MIME, size, and file signature; stores generated names; confines resolved paths; and serves files only through authorized endpoints.

### Why not store OTP plaintext?

Anyone who reads the database could immediately use a live plaintext OTP. The service stores an HMAC digest and compares candidate digests in constant time.

### How does `auth_version` invalidate sessions?

Each access token carries the user’s version. A successful password reset increments the database version, so previously issued tokens no longer match and are rejected.

### How do you prevent account enumeration?

Password-recovery requests return the same status and message for known and unknown identifiers. Internal suppressed challenges preserve the public contract without sending to an unknown account.

### What challenges did you face?

A concise answer is: maintaining consistent recruitment transitions, enforcing integrity under concurrent requests, securing local document storage, and designing password recovery without account or token leakage. Each was solved with a centralized policy module, database constraints, authorization checks, cryptographic digests, and focused tests.

## 18. Future Improvements

Reasonable post-V1 improvements include:

- configure and monitor a production email OTP provider;
- add deployment-specific secret management and observability;
- move protected documents to private object storage with short-lived access;
- add CI for tests, builds, migration drift, and security checks;
- add rate limiting backed by shared infrastructure for multi-instance deployment;
- add accessibility and cross-browser automated UI testing.

These are future improvements, not claims about the completed V1.
