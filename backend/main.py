import os
from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from routers import applications
from routers import auth
from routers import drives
from routers import students

import models
from routers.auth import csrf_request_is_valid
from storage_config import JD_DIRECTORY
from storage_config import RESUME_DIRECTORY


os.makedirs(
    RESUME_DIRECTORY,
    exist_ok=True
)

os.makedirs(
    JD_DIRECTORY,
    exist_ok=True,
)


def configured_cors_origins():
    raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    environment = os.getenv("APP_ENV", "production").strip().lower()

    if not raw_origins:
        if environment == "development":
            return [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        return []

    origins = []
    for value in raw_origins.split(","):
        origin = value.strip().rstrip("/")
        parsed = urlparse(origin)
        if (
            origin == "*"
            or parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.path
            or parsed.params
            or parsed.query
            or parsed.fragment
        ):
            raise RuntimeError("ALLOWED_ORIGINS contains an invalid origin.")
        origins.append(origin)

    return list(dict.fromkeys(origins))


def add_security_headers(response, request_path):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=()"
    )
    if request_path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    return response


app = FastAPI(
    title="Campus Placement Assistant API"
)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if not csrf_request_is_valid(request):
        response = JSONResponse(
            status_code=403,
            content={"detail": "CSRF validation failed."},
        )
        return add_security_headers(response, request.url.path)
    response = await call_next(request)
    return add_security_headers(response, request.url.path)


app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)


app.include_router(
    students.router
)

app.include_router(
    drives.router
)

app.include_router(
    applications.router
)

app.include_router(
    auth.router
)


@app.get("/")
def root():
    return {
        "message": "Campus Placement Assistant API is running"
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok"
    }
