import httpx
import os
import logging
from pypdf import PdfReader
from docx import Document
from sqlalchemy import func, select

from backend.models import Integration, IntegrationStatus, KnowledgeDocument, UploadedFile
from backend.schemas.integration import SyncStartEvent, SyncCompleteEvent, SyncErrorEvent, SyncProgressEvent, DocumentData
from backend.database import AsyncSessionLocal
from backend.adaptors.file_storage import file_upload_adaptor

logger = logging.getLogger(__name__)

class FileProcessorService:
    async def create_file_record(self, db, filename: str, content_type: str, size: int, storage_path: str, org_id: int):
        from backend.repositories.uploaded_file_repository import uploaded_file_repository
        file_data = {
            "filename": filename,
            "content_type": content_type,
            "size": size,
            "storage_path": storage_path,
        }
        return await uploaded_file_repository.create(db, file_data, org_id)

    def extract_text(self, file_path: str) -> str:
        """Extracts text from a given file based on its extension."""
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if ext == ".pdf":
                reader = PdfReader(file_path)
                return "\n".join(page.extract_text() or "" for page in reader.pages)
            elif ext == ".docx":
                doc = Document(file_path)
                return "\n".join(para.text for para in doc.paragraphs)
            elif ext in [".txt", ".md", ".csv", ".json"]:
                with open(file_path, "r", encoding="utf-8") as f:
                    return f.read()
            else:
                raise ValueError(f"Unsupported file extension: {ext}")
        except Exception as e:
            logger.error(f"Failed to extract text from {file_path}: {e}")
            raise e

    async def execute_file_processing(self, integration_id: int, config: dict, redis):
        """Processes uploaded files and hands them off for chunking/embedding."""
        file_ids = config.get("file_ids", [])
        if not file_ids:
            return

        channel = f"integration_stream:{integration_id}"
        
        async with AsyncSessionLocal() as db:
            from backend.repositories.integration_repository import integration_repository
            from backend.repositories.uploaded_file_repository import uploaded_file_repository
            from backend.repositories.knowledge_document_repository import knowledge_document_repository
            
            # 1. Update status
            integration = await integration_repository.get_by_id(db, integration_id)
            if integration:
                integration = await integration_repository.update(db, integration, {"status": IntegrationStatus.SYNCING})
                
            # 2. Emit Start Event
            start_event = SyncStartEvent(integration_id=integration_id)
            await redis.publish(channel, start_event.model_dump_json())

            # 3. Process each file
            for file_id in file_ids:
                try:
                    uploaded_file = await uploaded_file_repository.get_by_id(db, file_id)
                    if not uploaded_file:
                        continue
                        
                    file_path = file_upload_adaptor.get_file_path(uploaded_file.storage_path)
                    text = self.extract_text(file_path)
                    
                    # Create KnowledgeDocument
                    doc_data = {
                        "organization_id": integration.organization_id,
                        "integration_id": integration_id,
                        "title": uploaded_file.filename,
                        "url_or_path": uploaded_file.storage_path,
                        "is_active": True,
                        "metadata_json": {"chunks": 0}
                    }
                    doc = await knowledge_document_repository.create(db, doc_data)
                    
                    # Hand off to knowledge_base microservice
                    async with httpx.AsyncClient() as client:
                        upsert_resp = await client.post(
                            "http://knowledge_base:8002/v1/upsert",
                            json={
                                "document_id": doc.id,
                                "content": text,
                                "content_type": "text"
                            },
                            timeout=60.0
                        )
                        upsert_resp.raise_for_status()
                        chunks_count = upsert_resp.json().get("chunks", 0)
                        
                        # Update DB
                        doc = await knowledge_document_repository.update(db, doc, {"metadata_json": {"chunks": chunks_count}})
                        
                        # Emit Progress
                        progress_event = SyncProgressEvent(
                            document=DocumentData(
                                id=doc.id,
                                title=doc.title,
                                url=doc.url_or_path,
                                isActive=doc.is_active,
                                chunks=chunks_count
                            ),
                            progress="Processing..."
                        )
                        await redis.publish(channel, progress_event.model_dump_json())
                        
                except Exception as e:
                    logger.error(f"Error processing file ID {file_id}: {e}")
                    await db.rollback()
                    error_event = SyncErrorEvent(integration_id=integration_id, error=str(e))
                    await redis.publish(channel, error_event.model_dump_json())
                    
                    integration = await integration_repository.get_by_id(db, integration_id)
                    if integration:
                        await integration_repository.update(db, integration, {"status": IntegrationStatus.ERROR})
                    return # Abort on error

            # 4. Finish normally
            if integration:
                integration = await integration_repository.get_by_id(db, integration_id)
                await integration_repository.update(db, integration, {"status": IntegrationStatus.SYNCED, "last_sync": func.now()})
                
            complete_event = SyncCompleteEvent(integration_id=integration_id)
            await redis.publish(channel, complete_event.model_dump_json())

file_processor_service = FileProcessorService()
