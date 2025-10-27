# -*- coding: utf-8 -*-
import sys
import io
import re
import asyncio
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, ImageChops, ImageEnhance, ImageStat
import pdfplumber
import pytesseract

from app.models.Register_Model import RegisterModel  # Beanie model
from app.routes import emailrouter, facerouter
from app.core import init_db  # Database initialization

# ------------------------------
# Force UTF-8 (important for Windows console)
# ------------------------------
sys.stdout.reconfigure(encoding='utf-8')

# ------------------------------
# Tesseract Path (ensure correct)
# ------------------------------
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# ------------------------------
# FastAPI app setup
# ------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await init_db()

# ------------------------------
# Aadhaar validation tables (Verhoeff)
# ------------------------------
d_table = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
p_table = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
inv_table = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]


def is_valid_aadhaar(number: str) -> bool:
    """Check Aadhaar validity using Verhoeff algorithm."""
    number = number.replace(" ", "")
    if not re.fullmatch(r"\d{12}", number):
        return False
    c = 0
    for i, n in enumerate(reversed(number)):
        c = d_table[c][p_table[i % 8][int(n)]]
    return c == 0

# ------------------------------
# Photo tampering detection (ELA + noise)
# ------------------------------
def is_image_tampered(image_bytes: bytes) -> bool:
    """Detect likely tampering via ELA and noise consistency."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # --- 1. Error Level Analysis ---
        tmp = io.BytesIO()
        img.save(tmp, "JPEG", quality=90)
        tmp.seek(0)
        recompressed = Image.open(tmp)
        diff = ImageChops.difference(img, recompressed)
        diff = ImageEnhance.Brightness(diff).enhance(10)

        stat = ImageStat.Stat(diff)
        mean_brightness = sum(stat.mean) / len(stat.mean)
        var_brightness = sum(stat.var) / len(stat.var)
        ela_score = var_brightness / (mean_brightness + 1e-5)

        # --- 2. Noise uniformity check ---
        gray = img.convert("L")
        gray_np = np.array(gray)
        noise = np.std(gray_np)
        uniform_noise = noise < 5 or noise > 80

        # heuristic threshold
        ela_suspicious = ela_score > 3000
        return ela_suspicious or uniform_noise

    except Exception as e:
        print("ELA check failed:", e)
        return False

# ------------------------------
# OCR Extraction Function
# ------------------------------
async def extract_text_from_bytes(file_bytes: bytes, content_type: str) -> str:
    """Extract readable text from image or PDF."""
    if content_type == "application/pdf":
        with io.BytesIO(file_bytes) as f:
            with pdfplumber.open(f) as pdf:
                text = "".join(page.extract_text() or "" for page in pdf.pages)
        return text

    elif content_type in ["image/jpeg", "image/png"]:
        image = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(image)
        return text

    else:
        raise HTTPException(status_code=400, detail="Only PDF, JPG, or PNG files are allowed.")

# ------------------------------
# Aadhaar Registration Endpoint
# ------------------------------
@app.post("/api/register")
async def register(email: str = Form(...), document: UploadFile = File(...)):
    """Validate and register Aadhaar card for given email."""

    # Check if email already registered
    existing = await RegisterModel.find_one(RegisterModel.email == email)
    if existing:
        return JSONResponse(status_code=400, content={"error": "Email already registered"})

    # Read uploaded file
    file_content = await document.read()

    # --- Tampering detection for image uploads ---
    if document.content_type in ["image/jpeg", "image/png"]:
        if is_image_tampered(file_content):
            return JSONResponse(
                status_code=400,
                content={"error": "❌ The Aadhaar photo appears to be tampered or digitally altered."},
            )

    # Try extracting text using OCR
    try:
        extracted_text = await extract_text_from_bytes(file_content, document.content_type)
        print("\nOCR Extracted Text (first 500 chars):\n", extracted_text[:500])
    except Exception as e:
        error_message = str(e).encode("utf-8", "ignore").decode("utf-8")
        return JSONResponse(
            status_code=400,
            content={"error": f"Could not read file: {error_message}"}
        )

    # Aadhaar pattern (XXXX XXXX XXXX)
    aadhaar_regex = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
    aadhaar_numbers = aadhaar_regex.findall(extracted_text)

    # Aadhaar-related keywords
    has_aadhaar_words = any(
        keyword.lower() in extracted_text.lower()
        for keyword in [
            "unique identification authority of india",
            "government of india",
            "aadhaar",
        ]
    )

    # Validate presence of Aadhaar content
    if not aadhaar_numbers or not has_aadhaar_words:
        return JSONResponse(
            status_code=400,
            content={"error": "Please upload a valid Aadhaar card file."},
        )

    # Verify Aadhaar checksum (authenticity)
    genuine = any(is_valid_aadhaar(num) for num in aadhaar_numbers)
    if not genuine:
        return JSONResponse(
            status_code=400,
            content={"error": "The uploaded Aadhaar appears to be fake or tampered."},
        )

    # ✅ Passed all checks — save to DB
    doc = RegisterModel(email=email, aadharphoto=file_content)
    await doc.insert()

    return {"message": "✅ Aadhaar verified and registered successfully!"}

# ------------------------------
# Include Other Routers
# ------------------------------
app.include_router(facerouter, prefix="/api")
app.include_router(emailrouter, prefix="/api")
