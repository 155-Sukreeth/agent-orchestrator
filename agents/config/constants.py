from enum import Enum

class ModelNames(str, Enum):
    GPT_4O = "openai/gpt-4o"
    GPT_4O_MINI = "openai/gpt-4o-mini"
    CLAUDE_3_5_SONNET = "anthropic/claude-3-5-sonnet-20240620"
    CLAUDE_3_HAIKU = "anthropic/claude-3-haiku-20240307"
    GEMINI_1_5_PRO = "gemini/gemini-1.5-pro"
    GEMINI_1_5_FLASH = "gemini/gemini-1.5-flash"
    GROQ_LLAMA3_70B = "groq/llama3-70b-8192"

class LLMOperations(str, Enum):
    LLM_JUDGE = "llm_judge"
    SUMMARIZATION = "summarization"
    EXTRACTION = "extraction"
    ROUTING = "routing"
    GENERAL_CHAT = "general_chat"

MODEL_MAX_TOKENS = {
    ModelNames.GPT_4O: 4096,
    ModelNames.GPT_4O_MINI: 4096,
    ModelNames.CLAUDE_3_5_SONNET: 4096,
    ModelNames.CLAUDE_3_HAIKU: 4096,
    ModelNames.GEMINI_1_5_PRO: 8192,
    ModelNames.GEMINI_1_5_FLASH: 8192,
    ModelNames.GROQ_LLAMA3_70B: 8192
}
