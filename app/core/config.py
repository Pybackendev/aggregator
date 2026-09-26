from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    freelancehunt_token: str
    freelancehunt_skill_ids: str = "22,180"
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    sync_interval_minutes: int = 15

    def model_post_init(self, __context) -> None:
        # Render (and some other providers) hand out a plain postgresql:// URL;
        # we need the asyncpg driver explicitly for our async engine.
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )

    @property
    def skill_ids_list(self) -> list[int]:
        return [int(s) for s in self.freelancehunt_skill_ids.split(",") if s.strip()]


settings = Settings()
