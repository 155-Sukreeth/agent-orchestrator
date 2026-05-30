from fastapi import APIRouter, HTTPException
from backend.schemas.notification import NotificationRequest
from backend.adaptors.registry import get_adaptor

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.post("/send")
async def send_notification(request: NotificationRequest):
    """
    Dispatches a notification to the specified channel using the appropriate adaptor.
    """
    adaptor = get_adaptor(request.channel.lower())
    
    if not adaptor:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported channel: {request.channel}. Supported channels are registered in the adaptor registry."
        )
        
    try:
        # Assuming the adaptor has a send_message method with this signature
        # We pass recipient_id for both sender_id and thread_id if thread_id is omitted,
        # since many platforms like Telegram treat them similarly for direct messages.
        thread_id = request.thread_id if request.thread_id else request.recipient_id
        await adaptor.send_message(
            sender_id=request.recipient_id,
            thread_id=thread_id,
            text=request.text
        )
        return {"status": "success", "message": "Notification dispatched."}
    except Exception as e:
        # Depending on requirements, we could log this or handle it with our own circuit breakers
        raise HTTPException(status_code=500, detail=str(e))
