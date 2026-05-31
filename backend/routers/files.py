from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from backend.database import get_db
from backend.models import UploadedFile
from backend.adaptors.file_storage import file_upload_adaptor

router = APIRouter()

from backend.models import Organization
from backend.auth.dependencies import get_current_org

@router.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...), 
    db: AsyncSession = Depends(get_db),
    current_org: Organization = Depends(get_current_org)
):
    """
    Accepts multipart/form-data files, saves them using the FileUploadAdaptor,
    and inserts records into the UploadedFile database table.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
        
    uploaded_records = []
    from backend.services.file_processor_service import file_processor_service
    
    for file in files:
        # 1. Save file locally using adaptor
        metadata = await file_upload_adaptor.save_file(file)
        
        # 2. Insert into DB using service
        db_file = await file_processor_service.create_file_record(
            db,
            filename=metadata["filename"],
            content_type=metadata["content_type"],
            size=metadata["size"],
            storage_path=metadata["storage_path"],
            org_id=current_org.id
        )
        
        uploaded_records.append({
            "id": db_file.id,
            "filename": db_file.filename
        })
        
    return {"status": "success", "files": uploaded_records}
