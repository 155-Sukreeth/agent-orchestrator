from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.repositories.user_repository import user_repository
from backend.auth.security import verify_password, create_access_token
from backend.models import User

class AuthService:
    async def login(self, db: AsyncSession, username: str, password: str) -> dict:
        user = await user_repository.get_by_email(db, username)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
            
        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "organization_id": user.organization_id}}

    async def register(self, db: AsyncSession, email: str, password: str, organization_name: str) -> dict:
        user = await user_repository.get_by_email(db, email)
        if user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        from backend.models import Organization
        from backend.auth.security import hash_password
        from backend.repositories.organization_repository import organization_repository
        
        # Create Organization
        org_data = {"name": organization_name}
        org = await organization_repository.create(db, org_data)
        
        # Create User
        new_user_data = {
            "email": email, 
            "hashed_password": hash_password(password), 
            "organization_id": org.id,
            "is_active": True
        }
        db_user = await user_repository.create(db, new_user_data)
        
        access_token = create_access_token(data={"sub": str(db_user.id)})
        return {"access_token": access_token, "token_type": "bearer", "user": {"id": db_user.id, "email": db_user.email, "organization_id": db_user.organization_id}}

auth_service = AuthService()
