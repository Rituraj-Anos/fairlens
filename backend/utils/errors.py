from fastapi import HTTPException
from fastapi.responses import JSONResponse

class FairLensError(Exception):
    def __init__(self, message: str, code: str, status: int = 400):
        self.message = message
        self.code = code
        self.status = status

async def fairlens_exception_handler(request, exc: FairLensError):
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message}}
    )
