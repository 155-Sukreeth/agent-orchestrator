from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from knowledge_base.config.settings import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
