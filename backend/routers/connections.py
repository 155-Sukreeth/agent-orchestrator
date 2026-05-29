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
    result = await db.execute(select(AppConnection).where(AppConnection.organization_id == current_org.id))
    return result.scalars().all()

@router.get("/{connection_id}", response_model=ConnectionResponse)
async def get_connection(connection_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    result = await db.execute(select(AppConnection).where(AppConnection.id == connection_id, AppConnection.organization_id == current_org.id))
    connection = result.scalars().first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    return connection

@router.post("/", response_model=ConnectionResponse)
async def create_connection(conn_data: ConnectionCreate, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    # Check if name exists
    existing = await db.execute(select(AppConnection).where(AppConnection.name == conn_data.name, AppConnection.organization_id == current_org.id))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Connection with this name already exists")
        
    db_conn = AppConnection(
        organization_id=current_org.id,
        name=conn_data.name,
        type=conn_data.type,
        credentials=conn_data.credentials,
        is_active=conn_data.is_active
    )
    db.add(db_conn)
    await db.commit()
    await db.refresh(db_conn)
    return db_conn

@router.put("/{connection_id}", response_model=ConnectionResponse)
async def update_connection(connection_id: int, conn_data: ConnectionUpdate, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    result = await db.execute(select(AppConnection).where(AppConnection.id == connection_id, AppConnection.organization_id == current_org.id))
    connection = result.scalars().first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    if conn_data.name is not None and conn_data.name != connection.name:
        # Check name conflict
        existing = await db.execute(select(AppConnection).where(AppConnection.name == conn_data.name, AppConnection.organization_id == current_org.id))
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Connection with this name already exists")
        connection.name = conn_data.name
        
    if conn_data.credentials is not None:
        connection.credentials = conn_data.credentials
    if conn_data.is_active is not None:
        connection.is_active = conn_data.is_active
        
    await db.commit()
    await db.refresh(connection)
    return connection

@router.delete("/{connection_id}")
async def delete_connection(connection_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    result = await db.execute(select(AppConnection).where(AppConnection.id == connection_id, AppConnection.organization_id == current_org.id))
    connection = result.scalars().first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    await db.delete(connection)
    await db.commit()
    return {"message": "Connection deleted"}
