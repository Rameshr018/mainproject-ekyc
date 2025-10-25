from beanie import Document
from pydantic import EmailStr

class UserModel(Document):
    username: str
    email: EmailStr

    class Settings:
        name = "user"  