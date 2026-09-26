from sqlalchemy import BigInteger, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    telegram_chat_id: Mapped[str] = mapped_column(String(50), unique=True)

    filters: Mapped[list["JobFilter"]] = relationship(
        back_populates="user", lazy="selectin", cascade="all, delete-orphan"
    )


class JobFilter(Base):
    __tablename__ = "job_filters"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    keyword: Mapped[str | None] = mapped_column(String(255), nullable=True)
    min_budget: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    user: Mapped["User"] = relationship(back_populates="filters", lazy="selectin")
