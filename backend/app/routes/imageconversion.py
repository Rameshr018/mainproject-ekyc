from fastapi import APIRouter, HTTPException
from app.models.Register_Model import RegisterModel  # your Beanie model
import base64
import os

router = APIRouter()

def save_base64_to_image(base64_str: str, output_file: str):
    # Remove data URL header if exists
    if base64_str.startswith("data:image"):
        base64_str = base64_str.split(",")[1]

    image_data = base64.b64decode(base64_str)
    with open(output_file, "wb") as f:
        f.write(image_data)
    print(f"Image saved as {output_file}")

@router.get("/get-aadhar-photo-base64")
async def get_aadhar_photo_base64(email: str):
    print(f"[DEBUG] Searching for email (exact match): '{email}'")
    
    user = await RegisterModel.find_one(RegisterModel.email == email)

    if user and user.aadharphoto:
        print("[DEBUG] Exact match found:", user.email)

        # Encode photo bytes to base64 string
        photo_base64 = base64.b64encode(user.aadharphoto).decode("utf-8")

        # Optional: Save image file to disk (e.g., in 'saved_images' folder)
        os.makedirs("saved_images", exist_ok=True)
        save_base64_to_image(photo_base64, f"saved_images/{email}_aadhar.jpg")

        return {"photo_base64": photo_base64}
    else:
        print("[DEBUG] User or photo not found")
        raise HTTPException(status_code=404, detail="User or photo not found")
