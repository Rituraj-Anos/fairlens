import logging
import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import upload, analyze, mitigate, report
from utils.errors import FairLensError, fairlens_exception_handler

# ─── Load Environment ──────────────────────────────────────────────────────────
load_dotenv()

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("fairlens")

app = FastAPI(
    title="FairLens API",
    description="AI Bias Detection & Mitigation Backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev
        "http://localhost:3000",  # Fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(FairLensError, fairlens_exception_handler)

app.include_router(upload.router,   prefix="/api/upload",   tags=["Upload"])
app.include_router(analyze.router,  prefix="/api/analyze",  tags=["Analyze"])
app.include_router(mitigate.router, prefix="/api/mitigate", tags=["Mitigate"])
app.include_router(report.router,   prefix="/api/report",   tags=["Report"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.url}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}"},
    )


@app.get("/")
def root():
    return {"status": "ok", "service": "FairLens API v1.0", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
