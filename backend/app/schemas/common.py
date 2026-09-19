from enum import Enum


class GenderEnum(str, Enum):
    Male = "Male"
    Female = "Female"
    Other = "Other"