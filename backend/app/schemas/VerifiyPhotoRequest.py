from pydantic import BaseModel,EmailStr
class VerifyPhoto(BaseModel):
    email: EmailStr
    photo_base64: str  # base64 string of the captured photo