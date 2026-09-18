from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    message: str
class MeResponse(BaseModel):
    user_id: int
    username: str
    role: str
    branch_id: int | None = None