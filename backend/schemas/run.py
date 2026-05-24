from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class RunBase(BaseModel):
    workflow_id: int
    sender_id: Optional[str] = None
    thread_id: Optional[str] = None
    input_text: str

class RunCreate(RunBase):
    pass

class RunResponse(RunBase):
    id: int
    output_text: Optional[str] = None
    token_usage: int = 0
    cost_usd: float = 0.0
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
