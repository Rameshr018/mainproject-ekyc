from fastapi import APIRouter
from app.models import RegisterModel
from app.schemas import EmailPayload
emailrouter=APIRouter()

@emailrouter.post("/check-user-exists")
async def check_user_exists(payload: EmailPayload):
    user = await RegisterModel.find_one(RegisterModel.email == payload.email)
    return {"userExists": bool(user)}