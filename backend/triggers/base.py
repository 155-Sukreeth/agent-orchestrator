from dataclasses import dataclass
from typing import Callable, Any, Dict, Optional

@dataclass
class TriggerContext:
    trigger_id: str
    trigger_type: str
    workflow_id: str
    payload: Dict[str, Any]
    metadata: Dict[str, Any]
    reply_fn: Optional[Callable[[Any], Any]] = None

class BaseTrigger:
    trigger_type: str

    async def on_deploy(self, workflow_id: str, config: dict) -> None:
        """Called when workflow is deployed. Register routes, jobs, watchers."""
        pass

    async def on_deactivate(self, workflow_id: str, config: dict) -> None:
        """Called when workflow is deactivated. Clean up."""
        pass

    async def fire(self, context: TriggerContext) -> None:
        """Hand off to run_manager."""
        from backend.run_manager import execute
        await execute(context.workflow_id, context)
