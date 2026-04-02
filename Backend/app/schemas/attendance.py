from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class AttendanceStatusEnum(str, Enum):
    present = "present"
    absent = "absent"


class AttendanceMarkRequest(BaseModel):
    event_id: int
    user_id: str = Field(min_length=4, max_length=64)
    status: AttendanceStatusEnum


class AttendanceResponse(BaseModel):
    event_id: int
    user_id: str
    status: AttendanceStatusEnum
    updated_at: datetime

