from sqlalchemy.ext.asyncio import AsyncSession
from backend.repositories.run_repository import run_repository
from backend.repositories.connection_repository import connection_repository
from backend.adaptors.registry import get_adaptor
from backend.schemas.notification import NotificationRequest
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    async def dispatch_notification(self, db: AsyncSession, request: NotificationRequest) -> dict:
        # 1. Fetch the run to get the organization_id securely
        try:
            run_id_int = int(request.run_id)
        except ValueError:
            raise ValueError("Invalid run_id format")

        run = await run_repository.get_by_id(db, run_id_int)
        if not run:
            raise ValueError(f"Run {request.run_id} not found")

        org_id = run.organization_id
        if not org_id:
            raise ValueError(f"Run {request.run_id} is not associated with an organization")

        # 2. Look up the Adaptor
        adaptor = get_adaptor(request.channel.lower())
        if not adaptor:
            raise ValueError(f"Unsupported channel: {request.channel}")

        # 3. Fetch the connection credentials for this organization and channel type
        connection = await connection_repository.get_by_type(db, request.channel.lower(), org_id)
        if not connection:
            raise ValueError(f"No active connection found for channel {request.channel} in this organization")

        # 4. Resolve recipient in priority order:
        #    a) Explicit override in the request (must be a numeric chat id)
        #    b) Inbound-reply: use the sender that triggered this run
        #    c) Outbound/proactive: use the default_chat_id configured on the connection
        def _clean(recipient: str | None) -> str | None:
            # Telegram chat ids are integers (may be large), reject obvious placeholders
            if recipient and not recipient.isdigit():
                return None
            return recipient

        recipient_id = _clean(request.recipient_id) or run.sender_id or (connection.credentials or {}).get("default_chat_id")

        thread_id = request.thread_id or run.thread_id or recipient_id

        if not recipient_id:
            raise ValueError(
                f"Cannot determine recipient for channel '{request.channel}': "
                "no recipient_id in request, no sender_id on this run, "
                "and no default_chat_id configured on the connection."
            )

        # 5. Dispatch the notification
        await adaptor.send_message(
            connection=connection,
            sender_id=recipient_id,
            thread_id=thread_id,
            text=request.text
        )
        return {"status": "success", "message": "Notification dispatched."}

notification_service = NotificationService()
