from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from backend.database import get_db
from backend.models import User, Organization
from backend.auth.security import verify_password, hash_password, create_access_token
from backend.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class UserResponse(BaseModel):
    id: int
    email: str
    organization_id: int
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class RegisterRequest(BaseModel):
    email: str
    password: str
    organization_name: str

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    from backend.services.auth_service import auth_service
    return await auth_service.login(db, form_data.username, form_data.password)

@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    from backend.services.auth_service import auth_service
    return await auth_service.register(db, req.email, req.password, req.organization_name)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
