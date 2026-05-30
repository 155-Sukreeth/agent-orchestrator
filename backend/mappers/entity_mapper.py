from typing import List, Any
from backend.models import Workflow, WorkflowTrigger, DefaultWorkflowTemplate, RunLog
from backend.schemas.workflow import WorkflowResponse, WorkflowTriggerResponse, DefaultWorkflowTemplateResponse

# We don't have a specific RunLogResponse schema yet, so we will map it to a dict if needed, 
# or we can rely on Pydantic to do its magic. Currently run logs are just appended to the DB.

def to_workflow_dto(entity: Workflow) -> WorkflowResponse:
    """Maps a Workflow SQLAlchemy entity to a WorkflowResponse DTO."""
    if not entity:
        return None
    return WorkflowResponse.model_validate(entity)

def to_trigger_dto(entity: WorkflowTrigger) -> WorkflowTriggerResponse:
    """Maps a WorkflowTrigger SQLAlchemy entity to a WorkflowTriggerResponse DTO."""
    if not entity:
        return None
    return WorkflowTriggerResponse.model_validate(entity)

def to_template_dto(entity: DefaultWorkflowTemplate) -> DefaultWorkflowTemplateResponse:
    """Maps a DefaultWorkflowTemplate SQLAlchemy entity to a DTO."""
    if not entity:
        return None
    return DefaultWorkflowTemplateResponse.model_validate(entity)
