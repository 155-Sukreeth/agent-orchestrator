from backend.repositories.base import BaseRepository
from backend.models import DefaultWorkflowTemplate
from backend.schemas.workflow import DefaultWorkflowTemplateResponse

class WorkflowTemplateRepository(BaseRepository[DefaultWorkflowTemplate]):
    def __init__(self):
        super().__init__(DefaultWorkflowTemplate, dto_class=DefaultWorkflowTemplateResponse)

workflow_template_repository = WorkflowTemplateRepository()
