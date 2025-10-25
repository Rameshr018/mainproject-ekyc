import asyncio
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models.Register_Model import RegisterModel  # Beanie document
from app.routes import router as aadharroute
from app.routes import emailrouter ,facerouter
from app.core import init_db  # DB init function
# from app.routes import face_check  

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Run at startup
@app.on_event("startup")
async def on_startup():
    await init_db()

# Register route
@app.post("/api/register")
async def register(email: str = Form(...), document: UploadFile = File(...)):
    existing = await RegisterModel.find_one(RegisterModel.email == email)
    if existing:
        return {"error": "Email already registered"}

    file_content = await document.read()
    doc = RegisterModel(email=email, aadharphoto=file_content)
    await doc.insert()

    return {"message": "Registered successfully"}


app.include_router(facerouter, prefix="/api")
app.include_router(emailrouter, prefix="/api")

