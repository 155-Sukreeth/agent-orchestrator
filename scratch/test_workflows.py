import asyncio
import json
import uuid
import sys
import os

# Add the project root to sys.path so we can import from backend and agents
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.clients.agents_client import agents_client

stock_graph = {
    "nodes": [
        {"id": "start", "type": "start", "data": {"label": "Trigger", "input_mapping": {"input": "$.query"}}},
        {"id": "researcher", "type": "agent", "data": {
            "label": "Web Researcher",
            "system_prompt": "You are a web researcher. Use the web search tool to find facts about the stock requested. Do not format beautifully, just gather raw facts.",
            "tools": ["web_search"],
            "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.2}
        }},
        {"id": "analyst", "type": "agent", "data": {
            "label": "Financial Analyst",
            "system_prompt": "You are a financial analyst. Read the facts gathered by the researcher and write a cohesive buy/hold/sell recommendation in Markdown.",
            "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.4}
        }},
        {"id": "end", "type": "end", "data": {"label": "Output", "output_from": "output"}}
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
        {"id": "start", "type": "start", "data": {"label": "Trigger", "input_mapping": {"input": "$.topic"}}},
        {"id": "proponent", "type": "agent", "data": {
            "label": "Proponent Agent",
            "system_prompt": "You are a passionate debater. Given a topic, write a strong 1-paragraph argument IN FAVOR of it.",
            "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.5}
        }},
        {"id": "opponent", "type": "agent", "data": {
            "label": "Opponent Agent",
            "system_prompt": "You are a fierce debater. You will receive a topic and an argument in favor of it. Write a strong 1-paragraph counter-argument AGAINST it.",
            "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.5}
        }},
        {"id": "judge", "type": "agent", "data": {
            "label": "Impartial Judge",
            "system_prompt": "You are an impartial judge. Review the topic, the pro argument, and the con argument. Declare a winner and explain your reasoning in 2 sentences.",
            "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.2}
        }},
        {"id": "end", "type": "end", "data": {"label": "Output", "output_from": "output"}}
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
        {"id": "start", "type": "start", "data": {"label": "Trigger", "input_mapping": {"input": "$.document"}}},
        {"id": "extractor", "type": "agent", "data": {
            "label": "Data Extractor",
            "system_prompt": "You are an extractor. Pull names and dates from the text. Respond with dirty, raw text lists.",
            "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.1}
        }},
        {"id": "validator", "type": "agent", "data": {
            "label": "JSON Validator",
            "system_prompt": "You are a data validator. Take the raw lists of names and dates and convert them into strict JSON.",
            "llm_params": {"primary_model": "oss/oss120b", "temperature": 0.0, "response_format": {"type": "json_object"}}
        }},
        {"id": "end", "type": "end", "data": {"label": "Output", "output_from": "output"}}
    ],
    "edges": [
        {"source": "start", "target": "extractor"},
        {"source": "extractor", "target": "validator"},
        {"source": "validator", "target": "end"}
    ],
    "entry_node": "start"
}


async def run_test(name, graph, input_data):
    run_id = str(uuid.uuid4())
    print(f"\n--- Running {name} [Run ID: {run_id}] ---")
    try:
        await agents_client.compile_and_run(run_id, graph, input_data)
        print("Success! (Check logs for actual output, as compile_and_run is asynchronous or triggers the gateway)")
    except Exception as e:
        print(f"Failed: {e}")

async def main():
    await run_test("Stock Analyst", stock_graph, json.dumps({"messages": [{"role": "user", "content": "Analyze AAPL stock"}]}))
    await run_test("Research Summarization", research_graph, json.dumps({"messages": [{"role": "user", "content": "Quantum Computing breakthroughs 2026"}]}))
    await run_test("Data Extraction", data_extraction_graph, json.dumps({"messages": [{"role": "user", "content": "John Doe met with Acme Corp in New York on Jan 5th, 2026."}]}))

if __name__ == "__main__":
    asyncio.run(main())
