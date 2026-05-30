import abc
from typing import Dict, Any, Optional
from langgraph.types import StreamWriter

class BaseNode(abc.ABC):
    """
    Abstract base class for all workflow nodes.
    Wraps the core execution logic with LangGraph standard event streaming.
    """

    def __init__(self, node_id: str, config: Dict[str, Any]):
        self.node_id = node_id
        self.config = config

    async def __call__(self, state: Dict[str, Any], config: Any = None) -> Dict[str, Any]:
        """
        The entrypoint for LangGraph. It is a standard node function that wraps the core logic.
        """
        try:
            self.stream_event("NODE_START", {"status": "running"})
            result = await self.execute(state)
            self.stream_event("NODE_END", {"status": "completed", "result": result})
            return result
        except Exception as e:
            self.handle_error(e)
            raise e

    @abc.abstractmethod
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        The core execution logic for the specific node type.
        Must be implemented by subclasses.
        """
        pass

    def stream_event(self, event_type: str, payload: Dict[str, Any]):
        """
        Uses LangGraph's StreamWriter to emit custom events mid-execution.
        The external graph runner will capture these and push to Redis/DB.
        """
        try:
            from langgraph.types import get_stream_writer
            writer: StreamWriter = get_stream_writer()
            writer({
                "type": event_type, 
                "node_id": self.node_id, 
                "payload": payload
            })
        except Exception:
            # get_stream_writer raises RuntimeError or ImportError
            pass

    def handle_error(self, error: Exception):
        """Standardized error formatting and event emitting."""
        self.stream_event("ERROR", {"error": str(error)})
