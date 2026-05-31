"""
Resolves workflow-stored tool IDs into runtime tool names for the agents service.

Workflow graphs keep only tool IDs (tools_list) and access mode (tools_access).
At run time the backend loads the org's active tool catalog and injects
resolved tool names into agent node config before dispatch.
"""

from __future__ import annotations

import copy
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.integration_service import integration_service

logger = logging.getLogger(__name__)

AGENT_NODE_TYPES = frozenset({"agent", "agentNode", "reactAgentNode"})


class WorkflowToolResolver:
    async def build_tool_catalog(self, db: AsyncSession, org_id: int) -> dict[str, dict[str, Any]]:
        """Map tool id (string) -> tool record from active tools for the org."""
        active_tools = await integration_service.get_active_tools(db, org_id)
        catalog: dict[str, dict[str, Any]] = {}
        for tool in active_tools:
            catalog[str(tool["id"])] = tool
        return catalog

    def resolve_tool_ids(
        self,
        catalog: dict[str, dict[str, Any]],
        tool_ids: list[Any],
    ) -> list[str]:
        names: list[str] = []
        seen: set[str] = set()
        for raw_id in tool_ids:
            key = str(raw_id)
            record = catalog.get(key)
            if not record:
                logger.warning("Tool id %s not found in active catalog; skipping", raw_id)
                continue
            name = record["name"]
            if name not in seen:
                names.append(name)
                seen.add(name)
        return names

    def resolve_node_tool_names(
        self,
        node_data: dict[str, Any],
        catalog: dict[str, dict[str, Any]],
    ) -> list[str]:
        access = node_data.get("tools_access", "all")
        if access == "none":
            return []
        if access == "custom":
            tool_ids = node_data.get("tools_list") or []
            if not isinstance(tool_ids, list):
                tool_ids = [tool_ids]
            return self.resolve_tool_ids(catalog, tool_ids)
        # "all" — every active tool for the org
        names: list[str] = []
        seen: set[str] = set()
        for record in catalog.values():
            name = record["name"]
            if name not in seen:
                names.append(name)
                seen.add(name)
        return names

    async def enrich_workflow_config(
        self,
        db: AsyncSession,
        org_id: int,
        graph_definition: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Return a deep copy of the graph with agent nodes enriched with a `tools`
        list (registry names). Stored tools_list IDs are left unchanged.
        """
        graph = copy.deepcopy(graph_definition or {})
        catalog = await self.build_tool_catalog(db, org_id)

        for node in graph.get("nodes", []):
            if node.get("type") not in AGENT_NODE_TYPES:
                continue
            data = node.setdefault("data", {})
            data["tools"] = self.resolve_node_tool_names(data, catalog)

        return graph


workflow_tool_resolver = WorkflowToolResolver()
