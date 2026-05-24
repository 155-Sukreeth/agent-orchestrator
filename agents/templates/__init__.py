import importlib
from jinja2 import Environment, StrictUndefined

env = Environment(undefined=StrictUndefined)

def render(template_name: str, section: str = "full", **ctx) -> str:
    """Render a template section using Jinja2."""
    try:
        module = importlib.import_module(f"agents.templates.{template_name}")
        template_str = getattr(module, section, "")
    except ImportError:
        template_str = ""
        
    template = env.from_string(template_str)
    return template.render(**ctx)
