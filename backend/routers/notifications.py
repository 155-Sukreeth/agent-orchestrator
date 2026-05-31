from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import HTTPStatusError
from backend.database import get_db
from backend.schemas.notification import NotificationRequest
from backend.services.notification_service import notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.post("/send")
async def send_notification(request: NotificationRequest, db: AsyncSession = Depends(get_db)):
    """
    Dispatches a notification to the specified channel using the appropriate adaptor.
    """
    try:
        return await notification_service.dispatch_notification(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPStatusError as e:
        # Downstream channel API (e.g. Telegram) rejected the request — surface its response
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
