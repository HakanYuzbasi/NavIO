"""
Global exception handlers and custom exceptions.

Provides standardized error responses and prevents
internal details from leaking to clients.
"""
import logging
import traceback
from typing import Optional

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base API exception with status code and detail."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        headers: Optional[dict] = None
    ):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        self.headers = headers
        super().__init__(detail)


class NotFoundError(APIError):
    """Resource not found error."""

    def __init__(self, resource: str, identifier: str = None):
        detail = f"{resource} not found"
        if identifier:
            detail = f"{resource} with id '{identifier}' not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="NOT_FOUND"
        )


class BadRequestError(APIError):
    """Bad request error."""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="BAD_REQUEST"
        )


class UnauthorizedError(APIError):
    """Unauthorized access error."""

    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="UNAUTHORIZED",
            headers={"WWW-Authenticate": "Bearer"}
        )


class ForbiddenError(APIError):
    """Forbidden access error."""

    def __init__(self, detail: str = "Access denied"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="FORBIDDEN"
        )


class ConflictError(APIError):
    """Resource conflict error."""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="CONFLICT"
        )


class InternalServerError(APIError):
    """Internal server error."""

    def __init__(self, detail: str = "An internal error occurred"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="INTERNAL_ERROR"
        )


def create_error_response(
    request: Request,
    status_code: int,
    detail: str,
    error_code: Optional[str] = None,
    errors: Optional[list] = None
) -> JSONResponse:
    """Create a standardized error response."""
    content = {
        "success": False,
        "error": {
            "code": error_code or "ERROR",
            "message": detail,
            "path": str(request.url.path),
            "method": request.method
        }
    }

    # Add correlation ID if available
    correlation_id = getattr(request.state, 'correlation_id', None)
    if correlation_id:
        content["error"]["correlation_id"] = correlation_id

    # Add validation errors if present
    if errors:
        content["error"]["details"] = errors

    return JSONResponse(status_code=status_code, content=content)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers with the FastAPI app."""

    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
        """Handle custom API errors."""
        logger.warning(
            f"API Error: {exc.detail}",
            extra={
                "status_code": exc.status_code,
                "error_code": exc.error_code,
                "path": request.url.path
            }
        )
        return create_error_response(
            request=request,
            status_code=exc.status_code,
            detail=exc.detail,
            error_code=exc.error_code
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request,
        exc: RequestValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors."""
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })

        logger.warning(
            f"Validation error on {request.url.path}: {len(errors)} errors",
            extra={"errors": errors}
        )

        return create_error_response(
            request=request,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Validation error",
            error_code="VALIDATION_ERROR",
            errors=errors
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(
        request: Request,
        exc: IntegrityError
    ) -> JSONResponse:
        """Handle database integrity errors (unique constraints, etc.)."""
        logger.error(f"Database integrity error: {exc}")

        # Parse common integrity errors
        error_str = str(exc.orig).lower() if exc.orig else str(exc).lower()

        if "unique" in error_str or "duplicate" in error_str:
            detail = "A record with this value already exists"
        elif "foreign key" in error_str:
            detail = "Referenced record does not exist"
        elif "not null" in error_str:
            detail = "Required field is missing"
        else:
            detail = "Database constraint violation"

        return create_error_response(
            request=request,
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="INTEGRITY_ERROR"
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(
        request: Request,
        exc: SQLAlchemyError
    ) -> JSONResponse:
        """Handle general database errors."""
        logger.error(f"Database error: {exc}", exc_info=True)

        return create_error_response(
            request=request,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A database error occurred",
            error_code="DATABASE_ERROR"
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(
        request: Request,
        exc: ValueError
    ) -> JSONResponse:
        """Handle value errors."""
        logger.warning(f"Value error: {exc}")

        return create_error_response(
            request=request,
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
            error_code="VALUE_ERROR"
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """Handle all unhandled exceptions."""
        # Log the full traceback for debugging
        logger.error(
            f"Unhandled exception: {type(exc).__name__}: {exc}",
            exc_info=True,
            extra={
                "path": request.url.path,
                "method": request.method,
                "traceback": traceback.format_exc()
            }
        )

        # Return generic message to client (don't leak internal details)
        return create_error_response(
            request=request,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later.",
            error_code="INTERNAL_ERROR"
        )
