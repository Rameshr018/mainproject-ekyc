from beanie import Document

class RegisterModel(Document):
    email: str
    aadharphoto: bytes

    class Settings:
        name = "register"  # MongoDB collection name
