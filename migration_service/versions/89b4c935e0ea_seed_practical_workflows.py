"""seed_practical_workflows

Revision ID: 89b4c935e0ea
Revises: 2be32f66c1b4
Create Date: 2026-05-30 15:23:00.928730

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '89b4c935e0ea'
down_revision: Union[str, None] = '2be32f66c1b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Delete existing default workflows
    op.execute("DELETE FROM default_workflow_templates")
    
    # Insert new default templates
    templates_table = sa.table(
        'default_workflow_templates',
        sa.column('name', sa.String),
        sa.column('description', sa.String),
        sa.column('graph_definition', sa.JSON)
    )
    
    stock_graph = {
        "nodes": [
            {"id": "start", "type": "start", "position": {"x": 100, "y": 100}, "data": {"label": "Trigger", "input_mapping": {"input": "$.query"}}},
            {"id": "researcher", "type": "agent", "position": {"x": 300, "y": 100}, "data": {
                "label": "Web Researcher",
                "system_prompt": "You are a web researcher. Use the web search tool to find facts about the stock requested. Do not format beautifully, just gather raw facts.",
                "tools": ["web_search"],
                "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.2}
            }},
            {"id": "analyst", "type": "agent", "position": {"x": 500, "y": 100}, "data": {
                "label": "Financial Analyst",
                "system_prompt": "You are a financial analyst. Read the facts gathered by the researcher and write a cohesive buy/hold/sell recommendation in Markdown.",
                "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.4}
            }},
            {"id": "end", "type": "end", "position": {"x": 700, "y": 100}, "data": {"label": "Output", "output_from": "output"}}
        ],
        "edges": [
            {"source": "start", "target": "researcher"},
            {"source": "researcher", "target": "analyst"},
            {"source": "analyst", "target": "end"}
        ],
        "entry_node": "start"
    }

    research_graph = {
        "nodes": [
            {"id": "start", "type": "start", "position": {"x": 100, "y": 200}, "data": {"label": "Trigger", "input_mapping": {"input": "$.topic"}}},
            {"id": "proponent", "type": "agent", "position": {"x": 300, "y": 200}, "data": {
                "label": "Proponent Agent",
                "system_prompt": "You are a passionate debater. Given a topic, write a strong 1-paragraph argument IN FAVOR of it.",
                "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.5}
            }},
            {"id": "opponent", "type": "agent", "position": {"x": 500, "y": 200}, "data": {
                "label": "Opponent Agent",
                "system_prompt": "You are a fierce debater. You will receive a topic and an argument in favor of it. Write a strong 1-paragraph counter-argument AGAINST it.",
                "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.5}
            }},
            {"id": "judge", "type": "agent", "position": {"x": 700, "y": 200}, "data": {
                "label": "Impartial Judge",
                "system_prompt": "You are an impartial judge. Review the topic, the pro argument, and the con argument. Declare a winner and explain your reasoning in 2 sentences.",
                "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.2}
            }},
            {"id": "end", "type": "end", "position": {"x": 900, "y": 200}, "data": {"label": "Output", "output_from": "output"}}
        ],
        "edges": [
            {"source": "start", "target": "proponent"},
            {"source": "proponent", "target": "opponent"},
            {"source": "opponent", "target": "judge"},
            {"source": "judge", "target": "end"}
        ],
        "entry_node": "start"
    }

    data_extraction_graph = {
        "nodes": [
            {"id": "start", "type": "start", "position": {"x": 100, "y": 100}, "data": {"label": "Trigger", "input_mapping": {"input": "$.document"}}},
            {"id": "extractor", "type": "agent", "position": {"x": 300, "y": 100}, "data": {
                "label": "Data Extractor",
                "system_prompt": "You are an extractor. Pull names and dates from the text. Respond with dirty, raw text lists.",
                "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.1}
            }},
            {"id": "validator", "type": "agent", "position": {"x": 500, "y": 100}, "data": {
                "label": "JSON Validator",
                "system_prompt": "You are a data validator. Take the raw lists of names and dates and convert them into strict JSON.",
                "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.0, "response_format": {"type": "json_object"}}
            }},
            {"id": "end", "type": "end", "position": {"x": 700, "y": 100}, "data": {"label": "Output", "output_from": "output"}}
        ],
        "edges": [
            {"source": "start", "target": "extractor"},
            {"source": "extractor", "target": "validator"},
            {"source": "validator", "target": "end"}
        ],
        "entry_node": "start"
    }

    op.bulk_insert(templates_table, [
        {
            "name": "Stock Market Analyst",
            "description": "Searches the web for current market news and provides stock recommendations.",
            "graph_definition": stock_graph
        },
        {
            "name": "Research & Summarization",
            "description": "Takes a topic, searches the web or knowledge base, and outputs a concise markdown summary.",
            "graph_definition": research_graph
        },
        {
            "name": "Data Extraction Pipeline",
            "description": "Extracts structured JSON entities from unstructured text.",
            "graph_definition": data_extraction_graph
        }
    ])


def downgrade() -> None:
    op.execute("DELETE FROM default_workflow_templates WHERE name IN ('Stock Market Analyst', 'Research & Summarization', 'Data Extraction Pipeline')")
