from fastapi import APIRouter, HTTPException
import base64
import io
import face_recognition
from app.models.Register_Model import RegisterModel  # your model
from app.schemas import VerifyPhoto
facerouter = APIRouter()

@facerouter.post("/verify-aadhar-photo")
async def verify_aadhar_photo(payload: VerifyPhoto):
    # 1. Fetch user by email
    user = await RegisterModel.find_one(RegisterModel.email == payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Get stored photo bytes from Binary field
    # Assuming aadharphoto is of type bson.binary.Binary
    stored_photo_bytes = bytes(user.aadharphoto)  # Convert Binary to bytes

    # 3. Load stored image from bytes for face recognition
    stored_image = face_recognition.load_image_file(io.BytesIO(stored_photo_bytes))

    # 4. Decode the incoming base64 captured photo (frontend)
    uploaded_photo_bytes = base64.b64decode(payload.photo_base64)
    uploaded_image = face_recognition.load_image_file(io.BytesIO(uploaded_photo_bytes))

    # 5. Get face encodings
    stored_encodings = face_recognition.face_encodings(stored_image)
    uploaded_encodings = face_recognition.face_encodings(uploaded_image)

    if len(stored_encodings) == 0 or len(uploaded_encodings) == 0:
        return {"result": "fail", "message": "No face detected in one or both photos"}

    # 6. Compare faces
    match_results = face_recognition.compare_faces([stored_encodings[0]], uploaded_encodings[0])
    is_match = match_results[0]

    if is_match:
        return {"result": "success", "message": "Face match successful. User verified."}
    else:
        return {"result": "fail", "message": "Face does not match. Verification failed."}
