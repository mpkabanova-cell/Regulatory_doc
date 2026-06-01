from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Runtime settings shared by API services and indexing scripts."""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Regulatory RAG"
    llm_provider: str = Field(default="auto", alias="LLM_PROVIDER")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_chat_model: str = Field(default="gpt-4o-mini", alias="OPENAI_CHAT_MODEL")
    openai_embedding_model: str = Field(
        default="text-embedding-3-small",
        alias="OPENAI_EMBEDDING_MODEL",
    )
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    openrouter_model: str = Field(default="openai/gpt-4o-mini", alias="OPENROUTER_MODEL")
    openrouter_base_url: str = Field(default="https://openrouter.ai/api/v1", alias="OPENROUTER_BASE_URL")
    embeddings_provider: str = Field(default="openai", alias="EMBEDDINGS_PROVIDER")
    local_embedding_model: str = Field(default="BAAI/bge-m3", alias="LOCAL_EMBEDDING_MODEL")
    cors_origins: str = Field(default="http://localhost:5173", alias="CORS_ORIGINS")

    documents_dir: Path = Field(default=PROJECT_ROOT / "documents", alias="DOCUMENTS_DIR")
    chroma_dir: Path = Field(default=PROJECT_ROOT / "chroma_db", alias="CHROMA_DIR")
    metadata_dir: Path = Field(default=PROJECT_ROOT / "metadata", alias="METADATA_DIR")
    uploads_dir: Path = Field(default=PROJECT_ROOT / "backend" / "uploads", alias="UPLOADS_DIR")

    chunk_min_chars: int = Field(default=800, alias="CHUNK_MIN_CHARS")
    chunk_max_chars: int = Field(default=1200, alias="CHUNK_MAX_CHARS")
    chunk_overlap: int = Field(default=180, alias="CHUNK_OVERLAP")
    retrieval_top_k: int = Field(default=8, alias="RETRIEVAL_TOP_K")
    max_upload_mb: int = Field(default=25, alias="MAX_UPLOAD_MB")
    collection_name: str = Field(default="regulatory_chunks", alias="CHROMA_COLLECTION")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def use_openrouter(self) -> bool:
        provider = self.llm_provider.lower()
        return provider == "openrouter" or (provider == "auto" and bool(self.openrouter_api_key))

    @property
    def active_chat_model(self) -> str:
        return self.openrouter_model if self.use_openrouter else self.openai_chat_model


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.metadata_dir.mkdir(parents=True, exist_ok=True)
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    return settings
