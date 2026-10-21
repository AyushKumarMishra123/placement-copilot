from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from ..services.parser_service import parse_resume_content, UnsupportedDocumentError
from ..parsers.pdf_parser import PDFParsingError
from ..parsers.docx_parser import DOCXParsingError
from ..models.resume_schema import ResumeParseResponse, ParseErrorResponse

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post(
    "/parse-resume",
    response_model=ResumeParseResponse,
    responses={
        400: {"model": ParseErrorResponse, "description": "Invalid file or malformed document"},
        422: {"model": ParseErrorResponse, "description": "Empty or unsupported document format"},
        500: {"model": ParseErrorResponse, "description": "Internal parsing failure"}
    }
)
async def parse_resume_endpoint(file: UploadFile = File(...)):
    """
    Parses an uploaded resume document (PDF or DOCX) and returns structured resume data,
    metadata, and visual layout metrics.
    """
    filename = file.filename or "uploaded_resume.pdf"
    
    # 1. Read file bytes
    try:
        content = await file.read()
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ParseErrorResponse(
                success=False,
                errorCode="FILE_READ_ERROR",
                message=f"Could not read uploaded file: {str(e)}"
            ).dict()
        )

    # 2. Check for empty file
    if len(content) == 0:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ParseErrorResponse(
                success=False,
                errorCode="EMPTY_DOCUMENT",
                message="Uploaded document is 0 bytes (empty file)."
            ).model_dump()
        )

    # 3. Check file size
    if len(content) > MAX_FILE_SIZE:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ParseErrorResponse(
                success=False,
                errorCode="FILE_TOO_LARGE",
                message=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB."
            ).model_dump()
        )

    # 4. Parse content
    try:
        result = parse_resume_content(content, filename)
        return result
    except UnsupportedDocumentError as e:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ParseErrorResponse(
                success=False,
                errorCode=e.code,
                message=e.message
            ).model_dump()
        )
    except PDFParsingError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ParseErrorResponse(
                success=False,
                errorCode=e.code,
                message=e.message
            ).model_dump()
        )
    except DOCXParsingError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ParseErrorResponse(
                success=False,
                errorCode=e.code,
                message=e.message
            ).model_dump()
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ParseErrorResponse(
                success=False,
                errorCode="EXTRACTION_FAILURE",
                message=f"An unexpected error occurred during resume extraction: {str(e)}"
            ).model_dump()
        )
