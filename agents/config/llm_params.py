from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from agents.config.constants import ModelNames, LLMOperations, MODEL_MAX_TOKENS

class LLMConfig(BaseModel):
    primary_model: str = Field(
        default=ModelNames.GEMINI_3_1_FLASH_LITE, 
        description="The primary provider/model string to use for inference via Bifrost."
    )
    secondary_models: List[str] = Field(
        default_factory=list,
        description="A fallback list of provider/model strings if the primary model fails."
    )
    max_output_tokens: Optional[int] = Field(
        default=None,
        description="Maximum number of tokens to generate in the completion."
    )
    operation_name: Optional[str] = Field(
        default=None,
        description="The name of the operation being performed (e.g., llm_judge, routing)."
    )
    temperature: float = Field(
        default=0.0,
        description="Sampling temperature for the LLM. 0.0 is deterministic."
    )
    tools: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="A list of tools formatted for the LLM to use."
    )
    enable_prompt_caching: bool = Field(
        default=False,
        description="Whether to use prompt caching if the provider supports it."
    )
    response_format: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional response format (e.g., forcing JSON mode)."
    )
    timeout: int = Field(
        default=30,
        description="Timeout in seconds for the LLM call."
    )

    def get_max_tokens(self) -> int:
        """Returns the configured max_output_tokens, or a safe default for the primary model."""
        if self.max_output_tokens is not None:
            return self.max_output_tokens
        return MODEL_MAX_TOKENS.get(self.primary_model, 2048)

class LLMParameters(BaseModel):
    SEMANTIC_ROUTER: LLMConfig = LLMConfig(
        primary_model=ModelNames.GEMINI_3_1_FLASH_LITE,
        secondary_models=[
            ModelNames.GROQ_LLAMA3_70B,
            ModelNames.GROQ_GPT_OSS_120B
        ],
        operation_name=LLMOperations.ROUTING,
        max_output_tokens=1000,
        temperature=0.1,
        timeout=30
    )
    
    LLM_JUDGE: LLMConfig = LLMConfig(
        primary_model=ModelNames.GEMINI_3_1_FLASH_LITE,
        secondary_models=[
            ModelNames.GROQ_LLAMA3_70B,
        ],
        operation_name=LLMOperations.LLM_JUDGE,
        max_output_tokens=100,
        temperature=0.0,
        timeout=15
    )

    AGENT_DEFAULT: LLMConfig = LLMConfig(
        primary_model=ModelNames.GEMINI_3_1_FLASH_LITE,
        secondary_models=[
            ModelNames.GROQ_LLAMA3_70B,
            ModelNames.GROQ_GPT_OSS_120B
        ],
        operation_name=LLMOperations.GENERAL_CHAT,
        max_output_tokens=2048,
        temperature=0.7,
        timeout=60
    )

    LLM_NODE_DEFAULT: LLMConfig = LLMConfig(
        primary_model=ModelNames.GEMINI_3_1_FLASH_LITE,
        secondary_models=[
            ModelNames.GROQ_LLAMA3_70B,
        ],
        operation_name=LLMOperations.EXTRACTION,
        max_output_tokens=1024,
        temperature=0.2,
        timeout=30
    )

llm_params_registry = LLMParameters()
