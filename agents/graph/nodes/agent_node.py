import logging
from agents.graph.state import AgentState
from agents.clients.bifrost_client import bifrost_client
from agents.config.llm_params import llm_params_registry
from agents.graph.tool_executor import (
    MAX_TOOL_ROUNDS,
    assistant_message_from_response,
    build_openai_tools,
    execute_tool_calls,
)

logger = logging.getLogger(__name__)

from agents.graph.base_node import BaseNode


def build_messages(state: AgentState, system_prompt: str) -> list[dict]:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    for msg in state.get("messages", []):
        if hasattr(msg, "type"):
            role = "assistant" if msg.type == "ai" else ("user" if msg.type == "human" else msg.type)
            messages.append({"role": role, "content": getattr(msg, "content", "")})
        elif isinstance(msg, dict):
            messages.append(msg)

    return messages


class AgentNode(BaseNode):
    async def execute(self, state: AgentState) -> dict:
        llm_config = llm_params_registry.AGENT_DEFAULT.model_copy(update=self.config.get("llm_params", {}))
        client = bifrost_client.client

        tools_list = self.config.get("tools", [])
        system_prompt = self.config.get("system_prompt", "You are a helpful assistant.")
        metadata = dict(state.get("metadata", {}))

        try:
            provider, model = llm_config.primary_model.split("/", 1)
        except ValueError:
            provider, model = llm_params_registry.AGENT_DEFAULT.primary_model.split("/", 1)

        resolved_model = bifrost_client.resolve_model(provider, model)

        openai_tools = build_openai_tools(tools_list) if tools_list else None
        if not openai_tools and llm_config.tools:
            openai_tools = llm_config.tools

        conversation = build_messages(state, system_prompt)
        new_messages: list[dict] = []
        output_text = ""
        actual_provider = "unknown"

        for round_idx in range(MAX_TOOL_ROUNDS):
            payload = {
                "model": resolved_model,
                "messages": conversation,
                "max_tokens": llm_config.get_max_tokens(),
                "temperature": llm_config.temperature,
            }

            extra_body = {}
            if llm_config.secondary_models:
                extra_body["fallbacks"] = llm_config.secondary_models
            if llm_config.enable_prompt_caching:
                extra_body["enable_prompt_caching"] = True
            if extra_body:
                payload["extra_body"] = extra_body

            if llm_config.response_format:
                payload["response_format"] = llm_config.response_format

            if openai_tools:
                payload["tools"] = openai_tools

            self.stream_event(
                "LLM_START",
                {"model": resolved_model, "provider": provider, "tool_round": round_idx},
            )

            response = await client.chat.completions.create(**payload, timeout=llm_config.timeout)

            if hasattr(response, "model_extra") and response.model_extra:
                actual_provider = response.model_extra.get("provider", "unknown")

            msg_obj = response.choices[0].message
            assistant_msg = assistant_message_from_response(msg_obj)
            new_messages.append(assistant_msg)
            conversation.append(assistant_msg)

            tool_calls = getattr(msg_obj, "tool_calls", None)
            if not tool_calls:
                output_text = msg_obj.content or ""
                self.stream_event(
                    "LLM_END",
                    {"provider": actual_provider, "content": output_text, "tool_round": round_idx},
                )
                break

            self.stream_event(
                "LLM_END",
                {
                    "provider": actual_provider,
                    "tool_calls": len(tool_calls),
                    "tool_round": round_idx,
                },
            )

            tool_messages = await execute_tool_calls(
                tool_calls,
                metadata,
                allowed_tool_names=tools_list,
            )
            new_messages.extend(tool_messages)
            conversation.extend(tool_messages)
        else:
            logger.warning(
                "Agent node %s hit max tool rounds (%s); stopping.",
                self.node_id,
                MAX_TOOL_ROUNDS,
            )
            output_text = conversation[-1].get("content", "") if conversation else ""

        return {
            "messages": new_messages,
            "output": output_text,
            "metadata": {**metadata, "provider_used": actual_provider},
        }
