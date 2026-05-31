import logging
from agents.graph.state import AgentState

logger = logging.getLogger(__name__)

def get_nested(d, key_path, default=None):
    keys = key_path.split('.')
    current = d
    for k in keys:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return default
    return current

def set_nested(d, key_path, value):
    keys = key_path.split('.')
    current = d
    for k in keys[:-1]:
        if k not in current or not isinstance(current[k], dict):
            current[k] = {}
        current = current[k]
    current[keys[-1]] = value

def del_nested(d, key_path):
    keys = key_path.split('.')
    current = d
    for k in keys[:-1]:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return
    if isinstance(current, dict) and keys[-1] in current:
        del current[keys[-1]]

def build_state_transform_node(config: dict):
    async def state_transform_node(state: AgentState) -> dict:
        operations = config.get("operations", [])
        
        # We operate on a copy of metadata
        metadata = state.get("metadata", {}).copy()
        # For variable resolution, we might need access to 'messages' or 'input'
        # Let's create a combined context for 'from' resolution
        context = {
            "metadata": metadata,
            "input": state.get("input", ""),
            "output": state.get("output", "")
        }
        
        for op in operations:
            op_type = op.get("op")
            
            try:
                if op_type == "set":
                    key = op.get("key")
                    value = op.get("value")
                    if key:
                        set_nested(metadata, key, value)
                        
                elif op_type == "copy":
                    from_key = op.get("from")
                    to_key = op.get("to")
                    if from_key and to_key:
                        # Extract from full context (e.g., state.metadata.user_id)
                        if from_key.startswith("state."):
                            val = get_nested(context, from_key[6:])
                        else:
                            # Default to metadata
                            val = get_nested(metadata, from_key)
                        
                        set_nested(metadata, to_key, val)
                        
                elif op_type == "delete":
                    key = op.get("key")
                    if key:
                        del_nested(metadata, key)
                        
                elif op_type == "append":
                    key = op.get("key")
                    val_from = op.get("value_from")
                    if key and val_from:
                        if val_from.startswith("state."):
                            val = get_nested(context, val_from[6:])
                        else:
                            val = val_from # Raw value or metadata key? Let's treat it as a raw string if it doesn't start with state.
                            
                        target = get_nested(metadata, key)
                        if isinstance(target, list):
                            target.append(val)
                        elif target is None:
                            set_nested(metadata, key, [val])
                        else:
                            logger.warning(f"Append target {key} is not a list")
                            
                elif op_type == "merge":
                    from_key = op.get("from")
                    into_key = op.get("into")
                    if from_key and into_key:
                        if from_key.startswith("state."):
                            source = get_nested(context, from_key[6:])
                        else:
                            source = get_nested(metadata, from_key)
                            
                        target = get_nested(metadata, into_key)
                        
                        if isinstance(source, dict):
                            if isinstance(target, dict):
                                target.update(source)
                            elif target is None:
                                set_nested(metadata, into_key, source.copy())
                            else:
                                logger.warning(f"Merge target {into_key} is not a dict")
                        else:
                            logger.warning(f"Merge source {from_key} is not a dict")
            except Exception as e:
                logger.error(f"Error in state transform operation {op}: {e}")
                
        return {"metadata": metadata}
        
    return state_transform_node
