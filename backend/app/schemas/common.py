from enum import Enum
from typing import TypeVar, Generic
from pydantic import BaseModel, Field

T = TypeVar("T")

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=25, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit

class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    total: int

class GenderEnum(str, Enum):
    Male = "Male"
    Female = "Female"
    Other = "Other"
