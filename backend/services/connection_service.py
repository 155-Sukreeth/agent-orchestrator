from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any
from backend.repositories.connection_repository import connection_repository
from backend.models import AppConnection, AppConnectionType
from backend.clients.telegram_client import telegram_client
import logging

logger = logging.getLogger(__name__)

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

    async def bootstrap_telegram_connection(
        self,
        db: AsyncSession,
        connection: AppConnection,
    ) -> dict:
        """
        After saving a Telegram connection, call getUpdates to discover the
        chat_id of the most recent sender. Merges discovered metadata into
        the connection's credentials and persists it.

        Returns a dict describing what was discovered (or a warning if empty).
        """
        bot_token = (connection.credentials or {}).get("bot_token")
        if not bot_token:
            raise HTTPException(status_code=400, detail="bot_token is required to bootstrap a Telegram connection")

        try:
            updates = await telegram_client.get_updates(bot_token=bot_token)
        except Exception as e:
            # Surface Telegram API errors (401 invalid token, 409 webhook conflict, etc.)
            logger.error(f"getUpdates failed for connection {connection.id}: {e}")
            raise HTTPException(status_code=400, detail=f"Telegram API error: {str(e)}")

        if not updates:
            return {
                "bootstrapped": False,
                "warning": "No messages found. Send a message to your bot on Telegram, then re-save this connection."
            }

        # Use the most recent update to discover the chat
        latest = updates[-1]
        message = latest.get("message") or latest.get("channel_post") or {}
        chat = message.get("chat", {})

        chat_id = str(chat.get("id", ""))
        chat_type = chat.get("type", "")
        chat_title = chat.get("title") or chat.get("first_name") or ""

        if not chat_id:
            return {
                "bootstrapped": False,
                "warning": "Could not extract chat_id from the latest update."
            }

        # Merge discovered metadata into credentials and persist
        merged_credentials = {**(connection.credentials or {}), "default_chat_id": chat_id, "chat_type": chat_type, "chat_title": chat_title}
        await connection_repository.update(db, connection, {"credentials": merged_credentials})

        logger.info(f"Bootstrapped Telegram connection {connection.id}: chat_id={chat_id}, type={chat_type}, title={chat_title}")

        return {
            "bootstrapped": True,
            "default_chat_id": chat_id,
            "chat_type": chat_type,
            "chat_title": chat_title,
        }

connection_service = ConnectionService()
