from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Any, Dict
from pydantic import BaseModel

from backend.database import get_db
from backend.models import AppConnection, AppConnectionType, Organization
from backend.auth.dependencies import get_current_org

router = APIRouter(tags=["connections"])

from pydantic import BaseModel, Field
from typing import Union, Literal, Annotated, Dict, Any

class ConnectionBase(BaseModel):
    name: str
    is_active: bool = True

class SlackConnectionCreate(ConnectionBase):
    type: Literal[AppConnectionType.SLACK]
    credentials: Dict[str, Any] # Enforce structure if desired, keeping open for now for simplicity, but strictly bound by type

class TelegramConnectionCreate(ConnectionBase):
    type: Literal[AppConnectionType.TELEGRAM]
    credentials: Dict[str, Any]

class JiraConnectionCreate(ConnectionBase):
    type: Literal[AppConnectionType.JIRA]
    credentials: Dict[str, Any]
    
class ConfluenceConnectionCreate(ConnectionBase):
    type: Literal[AppConnectionType.CONFLUENCE]
    credentials: Dict[str, Any]

class GoogleDriveConnectionCreate(ConnectionBase):
    type: Literal[AppConnectionType.GOOGLE_DRIVE]
    credentials: Dict[str, Any]

class CustomWebhookConnectionCreate(ConnectionBase):
    type: Literal[AppConnectionType.CUSTOM_WEBHOOK]
    credentials: Dict[str, Any]

ConnectionCreate = Annotated[Union[
    SlackConnectionCreate,
    TelegramConnectionCreate,
    JiraConnectionCreate,
    ConfluenceConnectionCreate,
    GoogleDriveConnectionCreate,
    CustomWebhookConnectionCreate
], Field(discriminator="type")]

class ConnectionUpdate(BaseModel):
    name: str = None
    credentials: Dict[str, Any] = None
    is_active: bool = None

class ConnectionResponse(BaseModel):
    id: int
    name: str
    type: AppConnectionType
    credentials: Dict[str, Any]
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ConnectionResponse])
async def get_connections(db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.connection_service import connection_service
    return await connection_service.get_connections(db, current_org.id)

@router.get("/channels", response_model=List[str])
async def get_active_channels(db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    """Fetches a list of active channel types available for sending notifications."""
    from backend.services.connection_service import connection_service
    return await connection_service.get_active_channels(db, current_org.id)

@router.get("/{connection_id}", response_model=ConnectionResponse)
async def get_connection(connection_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.connection_service import connection_service
    return await connection_service.get_connection(db, connection_id, current_org.id)

@router.post("/", response_model=ConnectionResponse)
async def create_connection(conn_data: ConnectionCreate, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.connection_service import connection_service
    return await connection_service.create_connection(db, conn_data, current_org.id)

@router.put("/{connection_id}", response_model=ConnectionResponse)
async def update_connection(connection_id: int, conn_data: ConnectionUpdate, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.connection_service import connection_service
    return await connection_service.update_connection(db, connection_id, conn_data, current_org.id)

@router.delete("/{connection_id}")
async def delete_connection(connection_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.connection_service import connection_service
    return await connection_service.delete_connection(db, connection_id, current_org.id)
