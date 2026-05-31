"""
Execute LLM tool calls against the agents tool registry.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from langchain_core.messages.utils import convert_to_openai_messages

from agents.tools.registry import get_tool

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 10

# LLM-visible schema only (channel + text); matches SendNotificationInput
SEND_NOTIFICATION_OPENAI_TOOL: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "send_notification",
        "description": (
            "Send a message to the user on a connected channel. "
            "Recipient is determined automatically from the workflow run."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "channel": {
                    "type": "string",
                    "description": "Channel name, e.g. telegram",
                },
                "text": {
                    "type": "string",
                    "description": "Message text to send",
                },
            },
            "required": ["channel", "text"],
            "additionalProperties": False,
        },
    },
}


def build_openai_tools(tools_list: list[str]) -> list[dict[str, Any]]:
    """Convert registry tool names to OpenAI tool schemas for Bifrost."""
    from langchain_core.utils.function_calling import convert_to_openai_tool

    resolved: list[dict[str, Any]] = []
    for t_name in tools_list:
        if t_name == "send_notification":
            resolved.append(SEND_NOTIFICATION_OPENAI_TOOL)
            continue
        t_obj = get_tool(t_name)
        if t_obj:
            resolved.append(convert_to_openai_tool(t_obj))
        else:
            logger.warning("Tool %s requested by agent config but not found in registry.", t_name)
    return resolved


def _parse_tool_arguments(raw: str | dict | None) -> dict[str, Any]:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if not raw.strip():
        return {}
    return json.loads(raw)


def _drop_nulls(kwargs: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in kwargs.items() if v is not None}


def build_tool_invoke_payload(
    tool_name: str,
    kwargs: dict[str, Any],
    metadata: dict[str, Any],
) -> dict[str, Any]:
    """Build the input dict for tool.ainvoke(), with runtime context applied where needed."""
    clean = _drop_nulls(kwargs)

    if tool_name == "send_notification":
        from agents.tools.send_notification import set_send_notification_context

        set_send_notification_context(
            run_id=str(metadata["run_id"]) if metadata.get("run_id") is not None else None,
            recipient_id=clean.get("recipient_id"),
            thread_id=clean.get("thread_id"),
        )
        return {k: clean[k] for k in ("channel", "text") if k in clean}

    return clean


def state_messages_to_openai(messages: list[Any]) -> list[dict[str, Any]]:
    """Preserve tool_call_id and tool_calls when state holds LangChain message objects."""
    if not messages:
        return []
    return convert_to_openai_messages(messages)


def _tool_call_id(tool_call: Any, index: int = 0) -> str:
    if isinstance(tool_call, dict):
        call_id = (
            tool_call.get("id")
            or tool_call.get("tool_call_id")
            or (tool_call.get("function") or {}).get("id")
        )
    else:
        call_id = getattr(tool_call, "id", None) or getattr(tool_call, "tool_call_id", None)
    if call_id:
        return str(call_id)
    generated = f"call_{uuid.uuid4().hex[:12]}"
    logger.warning("Tool call at index %s missing id; generated %s", index, generated)
    return generated


def _tool_call_name(tool_call: Any) -> str:
    if isinstance(tool_call, dict):
        fn = tool_call.get("function") or {}
        return (fn.get("name") or "").strip()
    fn = getattr(tool_call, "function", None)
    return (getattr(fn, "name", None) or "").strip()


def _tool_call_arguments(tool_call: Any) -> str | dict | None:
    if isinstance(tool_call, dict):
        fn = tool_call.get("function") or {}
        return fn.get("arguments")
    fn = getattr(tool_call, "function", None)
    return getattr(fn, "arguments", None)


async def execute_tool_calls(
    tool_calls: list[Any],
    metadata: dict[str, Any],
    allowed_tool_names: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Run each tool call and return OpenAI-style tool role messages.
    """
    allowed = set(allowed_tool_names or [])
    results: list[dict[str, Any]] = []

    for idx, tc in enumerate(tool_calls):
        call_id = _tool_call_id(tc, idx)
        name = _tool_call_name(tc)

        if allowed and name not in allowed:
            content = f"Error: tool '{name}' is not enabled for this agent."
            logger.warning(content)
            results.append({"role": "tool", "tool_call_id": call_id, "content": content})
            continue

        tool_obj = get_tool(name)
        if not tool_obj:
            content = f"Error: tool '{name}' is not available."
            logger.warning(content)
            results.append({"role": "tool", "tool_call_id": call_id, "content": content})
            continue

        try:
            raw_args = _tool_call_arguments(tc)
            kwargs = _drop_nulls(_parse_tool_arguments(raw_args))
            tool_input = build_tool_invoke_payload(name, kwargs, metadata)
            logger.info(
                "Executing tool '%s' from agent (call_id=%s) input=%s",
                name,
                call_id,
                tool_input,
            )
            output = await tool_obj.ainvoke(tool_input)
            content = output if isinstance(output, str) else str(output)
        except json.JSONDecodeError as e:
            content = f"Error: invalid tool arguments JSON: {e}"
            logger.error(content)
        except Exception as e:
            content = f"Error executing tool '{name}': {e}"
            logger.error(content, exc_info=True)

        results.append({"role": "tool", "tool_call_id": call_id, "content": content})

    return results


def assistant_message_from_response(msg_obj: Any) -> dict[str, Any]:
    """Build a chat message dict from a Bifrost/OpenAI assistant message."""
    msg_dict: dict[str, Any] = {
        "role": "assistant",
        "content": msg_obj.content or "",
    }
    if getattr(msg_obj, "tool_calls", None):
        normalized: list[dict[str, Any]] = []
        for idx, tc in enumerate(msg_obj.tool_calls):
            dumped = tc.model_dump()
            if not dumped.get("id"):
                dumped["id"] = _tool_call_id(dumped, idx)
            normalized.append(dumped)
        msg_dict["tool_calls"] = normalized
    return msg_dict
