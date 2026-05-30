from pydantic import BaseModel, ConfigDict, UUID4
from typing import Optional, List, Dict, Any
from datetime import datetime

class RunBase(BaseModel):
    workflow_id: int
    trigger_id: Optional[UUID4] = None
    run_type: str = "test"
    sender_id: Optional[str] = None
    thread_id: Optional[str] = None
    input_text: str
    input_data: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class RunCreate(RunBase):
    pass

class LogUpdate(BaseModel):
    level: str
    message: str
    details: Optional[Dict[str, Any]] = None

class RunUpdate(BaseModel):
    status: Optional[str] = None
    output_text: Optional[str] = None
    output_data: Optional[Dict[str, Any]] = None
    token_usage: Optional[int] = None
    cost_usd: Optional[float] = None
    completed_at: Optional[datetime] = None
    logs: Optional[List[LogUpdate]] = None

class RunResponse(RunBase):
    id: int
    output_text: Optional[str] = None
    output_data: Optional[Dict[str, Any]] = None
    token_usage: int = 0
    cost_usd: float = 0.0
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
    completed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class RunLogResponse(BaseModel):
    id: int
    run_id: int
    level: str
    message: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class RunDetailResponse(RunResponse):
    logs: List[RunLogResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
