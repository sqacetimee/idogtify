from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import ALLOWED_ORIGINS, APP_NAME
from app.db.database import Base, SessionLocal, engine
from app.db.seed import seed_breeds


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed breed metadata on startup
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_breeds(db)
    finally:
        db.close()
    yield


app = FastAPI(title=APP_NAME, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )
