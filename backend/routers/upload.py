import os
import tempfile
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import UploadResponse
from services.data_processor import load_and_register

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".csv"}
MAX_FILE_SIZE_MB = 50


@router.post("/", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a CSV dataset for bias analysis.
    Returns a session_id used in subsequent /analyze, /mitigate, /report calls.
    """
    filename = file.filename or "upload.csv"
    ext = os.path.splitext(filename)[-1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only CSV files are supported. Got: '{ext}'",
        )

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max allowed: {MAX_FILE_SIZE_MB} MB",
        )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".csv", mode="wb"
        ) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        session_id, meta = load_and_register(tmp_path, filename)

        return UploadResponse(
            session_id=session_id,
            message=f"Dataset '{filename}' uploaded and parsed successfully.",
            meta=meta,
        )

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")
    finally:
        # Always clean up temp file — DataFrame is already in SESSION_STORE
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
