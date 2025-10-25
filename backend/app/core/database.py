from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.Register_Model import RegisterModel  # import your model here

MONGO_URI = "mongodb://localhost:27017"
DATABASE_NAME = "kyc-db"

async def init_db():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]
    await init_beanie(database=db, document_models=[RegisterModel])
