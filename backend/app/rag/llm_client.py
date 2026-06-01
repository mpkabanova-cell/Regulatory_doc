from openai import AsyncOpenAI

from backend.app.core.config import Settings


def create_llm_client(settings: Settings) -> AsyncOpenAI:
    """Create the chat client for either OpenAI or OpenRouter."""

    if settings.use_openrouter:
        if not settings.openrouter_api_key:
            raise RuntimeError("OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter.")
        return AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            default_headers={
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": settings.app_name,
            },
        )

    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required when using OpenAI chat models.")
    return AsyncOpenAI(api_key=settings.openai_api_key)
