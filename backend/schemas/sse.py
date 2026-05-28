from pydantic import BaseModel

class SSEEventBase(BaseModel):
    type: str
    is_active: bool = True
