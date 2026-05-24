from pydantic import BaseModel
from typing import Optional, List

class WorkflowDesc(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

class SemanticRouteRequest(BaseModel):
    query: str
    workflows: List[WorkflowDesc]
