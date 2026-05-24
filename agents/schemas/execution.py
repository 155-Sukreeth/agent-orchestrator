from pydantic import BaseModel
from typing import Dict, Any

class CompileRunRequest(BaseModel):
    run_id: str
    workflow_config: Dict[str, Any]
    input_data: str
