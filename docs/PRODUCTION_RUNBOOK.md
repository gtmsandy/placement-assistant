# Production Runbook

## Supported v1.0.0 architecture

```text
Client
  ↓ HTTPS
Reverse proxy
  ├── /       React/Vite/PWA static files
  └── /api/*  ONE FastAPI process
                 ├── persistent protected upload disk
                 └── Supabase PostgreSQL session pooler
```

This release supports one persistent host, one FastAPI process, and one Uvicorn worker. The login limiter is process-local; do not add workers or replicas until it is replaced by an authoritative shared limiter such as a gateway or Redis-backed implementation.

## Development startup

Backend, from `backend/`:

```powershell
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --port 8001
```

Frontend, from the repository root:

```powershell
npm.cmd run dev
```

The frontend calls relative `/api/*` paths. Vite proxies those requests to `http://127.0.0.1:8001`. No frontend API base URL is required.

## Production prerequisites

- Terminate HTTPS at the reverse proxy and redirect HTTP to HTTPS.
- Route `/api/*` to the single FastAPI process; serve the contents of `dist/` at `/` with SPA fallback to `index.html`.
- Set `APP_ENV=production`. This makes authentication cookies `Secure`.
- Set a strong, random `JWT_SECRET_KEY` of at least 32 bytes and independent OTP, identifier, and password-reset secrets.
- Set `DATABASE_URL` to the Supabase PostgreSQL session-pooler URL.
- Set `UPLOAD_ROOT` to an absolute directory on mounted persistent storage. Startup fails if it is absent or relative in production.
- Use `EMAIL_PROVIDER=resend`, a production Resend API key, a verified sender domain, and an `EMAIL_FROM_ADDRESS` on that domain. Sender-domain verification is an external prerequisite.
- Leave `ALLOWED_ORIGINS` unset for the normal same-origin deployment. If a cross-origin client is intentionally supported, configure only its exact HTTPS origin; `*` is rejected.
- Install Python packages from `backend/requirements.lock.txt` and JavaScript packages with `npm ci`.
- Ensure the persistent upload directory and database are included in backup and restore procedures.

## Reverse-proxy security headers

FastAPI adds API response headers for MIME sniffing, framing, referrers, permissions, and sensitive auth-response caching. The proxy serving the frontend must add HSTS only after HTTPS is confirmed:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

The static frontend should use this CSP baseline:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
```

The production build uses bundled scripts/styles and a same-origin generated service worker, so neither `unsafe-inline` nor a cross-origin API allowance is required. Validate the CSP in report-only mode on the selected proxy before enforcing it.

## Release procedure

1. Build and test the exact release commit.
2. Back up PostgreSQL and the persistent upload directory.
3. From `backend/`, check and apply migrations:

   ```powershell
   alembic current
   alembic upgrade head
   alembic check
   ```

   Exactly one release process may run migrations.

4. Build the frontend with `npm.cmd run build`.
5. Start exactly one FastAPI process, for example:

   ```powershell
   python -m uvicorn main:app --host 127.0.0.1 --port 8001 --workers 1
   ```

6. Verify `GET /api/health` returns HTTP 200 through the public HTTPS site.
7. Verify login, session refresh, logout, one protected file download, and relevant role boundaries.

## Authentication operations

The `placement_access` JWT cookie lasts eight hours, is HttpOnly, uses `SameSite=Lax`, and is scoped to `/api`. The production cookie is `Secure`. The SPA keeps the matching CSRF token only in memory and reconstructs it with `GET /api/auth/session`. Logout increments `auth_version`, so it revokes every existing session for that user.

## Backup and recovery

- Back up PostgreSQL and `UPLOAD_ROOT` together so database file references and stored files remain consistent.
- Periodically test restoration into an isolated environment.
- Never expose `UPLOAD_ROOT` as a public static directory. Resumes and JDs must remain behind the authorized API endpoints.
- Monitor free disk space, database connectivity, `/api/health`, proxy 5xx responses, and email-provider failures.

## Rollback

1. Stop the failed application process without deleting persistent uploads.
2. Restore the previous tested Git commit or release tag and its matching frontend build.
3. Start the previous application with the same secrets, database, and persistent `UPLOAD_ROOT`.
4. Do not downgrade the database automatically. Review Alembic revisions and data compatibility before any downgrade; prefer a forward corrective migration.
5. Purge or invalidate the proxy's static cache as needed. The PWA uses an auto-updating service worker, so confirm clients receive the previous `index.html`, service worker, and hashed assets consistently.
6. Re-run the health check and critical authentication/file-access smoke tests.

Persistent uploads must never be removed as part of an application rollback.
