import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, analyze, mitigate, report

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("fairlens")

app = FastAPI(
    title="FairLens API",
    description="AI Bias Detection & Mitigation Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
