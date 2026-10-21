import fitz  # PyMuPDF
from typing import Dict, Any, List, Tuple
from ..models.resume_schema import VisualLayoutAnalysis

class PDFParsingError(Exception):
    def __init__(self, message: str, code: str = "MALFORMED_PDF"):
        super().__init__(message)
        self.message = message
        self.code = code

def parse_pdf_document(file_bytes: bytes) -> Dict[str, Any]:
    """
    Extracts text, page count, and visual layout metrics from a PDF document.
    Handles corrupted files, scanned documents, and layout anomalies.
    """
    if not file_bytes or len(file_bytes) == 0:
        raise PDFParsingError("Uploaded PDF file is completely empty (0 bytes).", "EMPTY_DOCUMENT")

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise PDFParsingError(f"Failed to open or decode PDF document: {str(e)}", "MALFORMED_PDF")

    try:
        page_count = len(doc)
        if page_count == 0:
            raise PDFParsingError("PDF contains 0 pages.", "EMPTY_DOCUMENT")

        full_raw_text = []
        total_images = 0
        layout_anomalies: List[str] = []
        total_blocks = 0
        overlapping_blocks = 0

        for page_idx in range(page_count):
            page = doc[page_idx]
            page_text = page.get_text("text")
            full_raw_text.append(page_text)

            # Inspect images on page
            images = page.get_images(full=True)
            total_images += len(images)

            # Extract layout text blocks with bounding boxes: (x0, y0, x1, y1, "text", block_no, block_type)
            blocks = page.get_text("blocks")
            total_blocks += len(blocks)

            # Check for bounding box overlap (potential unreadable text or weird rendering)
            text_blocks = [b for b in blocks if len(b) > 4 and b[4].strip() and b[6] == 0] # type 0 is text
            for i in range(len(text_blocks)):
                for j in range(i + 1, len(text_blocks)):
                    b1 = text_blocks[i]
                    b2 = text_blocks[j]
                    # Check rect intersection: fitz.Rect(b1[:4]).intersects(fitz.Rect(b2[:4]))
                    r1 = fitz.Rect(b1[0], b1[1], b1[2], b1[3])
                    r2 = fitz.Rect(b2[0], b2[1], b2[2], b2[3])
                    if r1.intersects(r2):
                        # Verify if intersection area is significant
                        intersect_rect = r1 & r2
                        if intersect_rect.width > 20 and intersect_rect.height > 10:
                            overlapping_blocks += 1

        combined_text = "\n".join(full_raw_text).strip()
        char_count = len(combined_text)
        words = combined_text.split()
        word_count = len(words)
        lines = [l for l in combined_text.split("\n") if l.strip()]
        line_count = len(lines)

        # Scanned / Image-only detection
        is_scanned = False
        if char_count < 100 and total_images > 0:
            is_scanned = True
            layout_anomalies.append("Scanned or image-only PDF detected. Resume lacks searchable text layer.")
        elif char_count == 0:
            raise PDFParsingError("Document contains no selectable or extractable text layer.", "EMPTY_DOCUMENT")

        if overlapping_blocks > 2:
            layout_anomalies.append(f"Detected {overlapping_blocks} overlapping text regions in PDF layout.")

        if page_count > 1:
            layout_anomalies.append(f"Document exceeds 1 page (actual: {page_count} pages).")

        # Determine visual confidence score
        confidence = 1.0
        if is_scanned:
            confidence = 0.2
        elif overlapping_blocks > 0:
            confidence = max(0.4, 1.0 - (overlapping_blocks * 0.15))
        elif word_count < 150:
            confidence = 0.6
            layout_anomalies.append("Very low word count for a professional resume (< 150 words).")

        confidence = round(confidence, 2)

        layout_analysis = VisualLayoutAnalysis(
            isScanned=is_scanned,
            confidence=confidence,
            layoutAnomalies=layout_anomalies,
            lineCount=line_count,
            wordCount=word_count,
            characterCount=char_count,
            estimatedSectionSpacing="normal" if not overlapping_blocks else "dense/overlapping"
        )

        return {
            "pageCount": page_count,
            "rawText": combined_text,
            "layout": layout_analysis
        }
    finally:
        doc.close()
