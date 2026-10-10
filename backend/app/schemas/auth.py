from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    message: str
    must_change_password: bool = False

class MeResponse(BaseModel):
    user_id: int
    username: str
    first_name: str | None = None
    last_name: str | None = None
    role: str
    branch_id: int | None = None
    branch_name: str | None = None
    must_change_password: bool = False