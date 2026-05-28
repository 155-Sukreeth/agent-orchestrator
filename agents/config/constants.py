from enum import Enum

class ModelNames(str, Enum):
    GPT_4O = "openai/gpt-4o"
    GPT_4O_MINI = "openai/gpt-4o-mini"
    CLAUDE_3_5_SONNET = "anthropic/claude-3-5-sonnet-20240620"
    CLAUDE_3_HAIKU = "anthropic/claude-3-haiku-20240307"
    GEMINI_3_5_FLASH = "gemini/gemini-3.5-flash"
    GEMINI_3_1_PRO = "gemini/gemini-3.1-pro"
    GEMINI_2_5_PRO = "gemini/gemini-2.5-pro"
    GEMINI_2_5_FLASH = "gemini/gemini-2.5-flash"
    GEMINI_3_1_FLASH_LITE = "gemini/gemini-3.1-flash-lite"
    GEMINI_2_5_FLASH_LITE = "gemini/gemini-2.5-flash-lite"
    GROQ_LLAMA3_70B = "groq/llama3-70b-8192"
    GROQ_GPT_OSS_120B = "groq/openai/gpt-oss-120b"
    GROQ_GPT_OSS_20B = "groq/openai/gpt-oss-20b"

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
    ModelNames.GEMINI_3_5_FLASH: 8192,
    ModelNames.GEMINI_3_1_PRO: 8192,
    ModelNames.GEMINI_2_5_PRO: 8192,
    ModelNames.GEMINI_2_5_FLASH: 8192,
    ModelNames.GEMINI_3_1_FLASH_LITE: 8192,
    ModelNames.GEMINI_2_5_FLASH_LITE: 8192,
    ModelNames.GROQ_LLAMA3_70B: 8192,
}
