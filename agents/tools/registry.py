from agents.tools.send_notification import send_notification
from agents.tools.code_exec import code_exec
from agents.tools.http_request import http_request
from agents.tools.web_search import web_search

# The global registry of available tools
tools_registry = {
    "send_notification": send_notification,
    "code_exec": code_exec,
    "http_request": http_request,
    "web_search": web_search
}

def get_tool(tool_name: str):
    return tools_registry.get(tool_name)
