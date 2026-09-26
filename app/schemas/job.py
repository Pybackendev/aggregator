from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class JobListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str | None
    budget_amount: float | None
    budget_currency: str | None
    status_name: str | None
    url: str | None
    published_at: datetime | None
    skills: list[SkillOut] = []
