from typing import Optional
from pydantic import BaseModel, Field

# Request when admin creates a branch
class BranchCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Name of the branch")
    address: str = Field(..., min_length=5, max_length=255, description="Full address of the branch")
    phone_number: str = Field(..., pattern=r"^[0-9]{10}$", description="10-digit phone number")
    branch_manager_id: Optional[int] = Field(None, description="Optional user ID of assigned Branch Manager")


# Request when admin updates a branch
class BranchUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="Updated branch name")
    address: Optional[str] = Field(None, min_length=5, max_length=255, description="Updated address")
    phone_number: Optional[str] = Field(None, pattern=r"^[0-9]{10}$", description="10-digit phone number")
    branch_manager_id: Optional[int] = Field(None, description="Optional user ID of assigned Branch Manager")


# Response model for branch endpoints
class BranchResponse(BaseModel):
    branch_id: int
    name: str
    address: str
    phone_number: str
    branch_manager_id: Optional[int] = None
    branch_manager_name: Optional[str] = None
    staff_count: int = 0
    is_active: bool = True
