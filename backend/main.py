import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base
from database import engine

from routers import applications
from routers import auth
from routers import drives
from routers import students

import models


os.makedirs(
    "uploads/resumes",
    exist_ok=True
)


Base.metadata.create_all(
    bind=engine
)


app = FastAPI(
    title="Campus Placement Assistant API"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount(
    "/uploads",
    StaticFiles(
        directory="uploads"
    ),
    name="uploads",
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