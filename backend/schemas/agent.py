from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class AgentBase(BaseModel):
    name: str
    role: Optional[str] = None
    provider: str
    model: str
    system_prompt: str
    tools: List[Dict[str, Any]] = []
    memory: bool = False
    guardrails: Dict[str, Any] = {}

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: Optional[List[Dict[str, Any]]] = None
    memory: Optional[bool] = None
    guardrails: Optional[Dict[str, Any]] = None

class AgentResponse(AgentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
