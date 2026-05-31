from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any
from backend.repositories.connection_repository import connection_repository
from backend.models import AppConnection

class ConnectionService:
    async def get_connections(self, db: AsyncSession, org_id: int) -> List[Any]:
        return await connection_repository.get_all(db, org_id=org_id)

    async def get_active_channels(self, db: AsyncSession, org_id: int) -> List[str]:
        return await connection_repository.get_active_channels(db, org_id)

    async def get_connection(self, db: AsyncSession, connection_id: int, org_id: int) -> Any:
        connection = await connection_repository.get_by_id(db, connection_id, org_id)
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")
        return connection

    async def create_connection(self, db: AsyncSession, conn_data: Any, org_id: int) -> Any:
        existing = await connection_repository.get_by_name(db, conn_data.name, org_id)
        if existing:
            raise HTTPException(status_code=400, detail="Connection with this name already exists")
            
        data_dict = conn_data.model_dump()
        return await connection_repository.create(db, data_dict, org_id=org_id)

    async def update_connection(self, db: AsyncSession, connection_id: int, conn_data: Any, org_id: int) -> Any:
        connection = await connection_repository.get_by_id(db, connection_id, org_id)
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")
            
        if conn_data.name is not None and conn_data.name != connection.name:
            existing = await connection_repository.get_by_name(db, conn_data.name, org_id)
            if existing:
                raise HTTPException(status_code=400, detail="Connection with this name already exists")
                
        update_data = conn_data.model_dump(exclude_unset=True)
        return await connection_repository.update(db, connection, update_data)

    async def delete_connection(self, db: AsyncSession, connection_id: int, org_id: int) -> dict:
        success = await connection_repository.delete(db, connection_id, org_id)
        if not success:
            raise HTTPException(status_code=404, detail="Connection not found")
        return {"message": "Connection deleted"}

connection_service = ConnectionService()
