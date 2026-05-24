from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    graph_definition: Dict[str, Any]
    channels: List[str] = []
    is_active: bool = False
    is_template: bool = False
    template_name: Optional[str] = None

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    graph_definition: Optional[Dict[str, Any]] = None
    channels: Optional[List[str]] = None
    is_active: Optional[bool] = None

class WorkflowResponse(WorkflowBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
