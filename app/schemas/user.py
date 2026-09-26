from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    telegram_chat_id: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    telegram_chat_id: str


class JobFilterCreate(BaseModel):
    keyword: str | None = None
    min_budget: float | None = None


class JobFilterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    keyword: str | None
    min_budget: float | None
