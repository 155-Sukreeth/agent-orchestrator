from pydantic import BaseModel
from typing import Optional, Any, Dict

class IntegrationCreate(BaseModel):
    name: str
    type: str
    category: str = "web"
    config: Dict[str, Any] = {}
from backend.schemas.sse import SSEEventBase

class SyncStartEvent(SSEEventBase):
    type: str = "sync_start"
    integration_id: int
    message: str = "Starting synchronization"

class DocumentData(BaseModel):
    id: int
    title: str
    url: str
    isActive: bool
    chunks: int

class SyncProgressEvent(SSEEventBase):
    type: str = "sync_progress"
    document: DocumentData
    progress: str

class SyncCompleteEvent(SSEEventBase):
    type: str = "sync_complete"
    integration_id: int
    message: str = "Synchronization complete"

class SyncErrorEvent(SSEEventBase):
    type: str = "sync_error"
    integration_id: int
    error: str
