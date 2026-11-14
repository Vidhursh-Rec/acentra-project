"""Turn an upload (pdf / image / text) into plain text. Raises Unreadable when it can't."""
import io
from statistics import mean

import pdfplumber
import pytesseract
from PIL import Image

from app.config import TESSERACT_CMD

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

MIN_WORDS = 30
MIN_OCR_CONFIDENCE = 60


class Unreadable(Exception):
    pass


def read_text(data: bytes, file_type: str) -> str:
    if file_type == "text":
        text = data.decode("utf-8", errors="replace")
    elif file_type == "pdf":
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            if len(text.split()) < MIN_WORDS:  # scanned PDF -> OCR the pages
                text = _ocr([page.to_image(resolution=200).original for page in pdf.pages])
    else:
        text = _ocr([Image.open(io.BytesIO(data))])

    if len(text.split()) < MIN_WORDS:
        raise Unreadable
    return text


def _ocr(images: list) -> str:
    texts, confidences = [], []
    for img in images:
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        confidences += [
            float(c) for c, word in zip(data["conf"], data["text"]) if word.strip() and float(c) >= 0
        ]
        texts.append(pytesseract.image_to_string(img))
    if not confidences or mean(confidences) < MIN_OCR_CONFIDENCE:
        raise Unreadable
    return "\n".join(texts)
