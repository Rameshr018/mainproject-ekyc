from pydantic import BaseModel,EmailStr

class EmailPayload(BaseModel):
  email:EmailStr