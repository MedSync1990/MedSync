from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

class ErrorDetail(BaseModel):
    field: str
    message: str

class ErrorResponse(BaseModel):
    message: str

class ValidationErrorResponse(BaseModel):
    errors: list[ErrorDetail]

class NotFoundError(Exception):
    def __init__(self, message: str):
        self.message = message

class ConflictError(Exception):
    def __init__(self, message: str):
        self.message = message

class ForbiddenError(Exception):
    def __init__(self, message: str = "You don't have permission to view this page."):
        self.message = message

class UnauthorizedError(Exception):
    def __init__(self, message: str):
        self.message = message

class AppValidationError(Exception):
    def __init__(self, errors: list[dict]):
        self.errors = errors

async def not_found_exception_handler(request: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"message": exc.message})

async def conflict_exception_handler(request: Request, exc: ConflictError):
    return JSONResponse(status_code=409, content={"message": exc.message})

async def forbidden_exception_handler(request: Request, exc: ForbiddenError):
    return JSONResponse(status_code=403, content={"message": exc.message})

async def unauthorized_exception_handler(request: Request, exc: UnauthorizedError):
    return JSONResponse(status_code=401, content={"message": exc.message})

async def validation_exception_handler(request: Request, exc: AppValidationError):
    return JSONResponse(status_code=422, content={"errors": exc.errors})

async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"message": "An unexpected error occurred."})
