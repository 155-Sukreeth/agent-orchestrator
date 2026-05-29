import os
import uuid
import aiofiles
from fastapi import UploadFile

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")

class FileUploadAdaptor:
    def __init__(self):
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    async def save_file(self, file: UploadFile) -> dict:
        """Saves the uploaded file to disk and returns metadata."""
        ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        storage_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        size = 0
        async with aiofiles.open(storage_path, 'wb') as out_file:
            while content := await file.read(1024 * 1024):  # read in 1MB chunks
                await out_file.write(content)
                size += len(content)
                
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": size,
            "storage_path": storage_path
        }

    def get_file_path(self, storage_path: str) -> str:
        """Returns the physical file path, verifying it exists."""
        if not os.path.exists(storage_path):
            raise FileNotFoundError(f"File not found at {storage_path}")
        return storage_path

file_upload_adaptor = FileUploadAdaptor()
