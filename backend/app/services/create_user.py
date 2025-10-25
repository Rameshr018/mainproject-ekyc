from app.models import UserModel
from app.schemas import CheckUser
async def createuser_service(user:CheckUser):
  try:
    user_doc=UserModel(**user.dict())
    await user_doc.insert()
    return {"msg":"data saved successfully"}
  except Exception as e:
    return {"msg":f"cannot insert data {str(e)}"}