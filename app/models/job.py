from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, String, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

job_listing_skills = Table(
    "job_listing_skills",
    Base.metadata,
    Column("job_listing_id", BigInteger, ForeignKey("job_listings.id"), primary_key=True),
    Column("skill_id", BigInteger, ForeignKey("skills.id"), primary_key=True),
)


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)  # Freelancehunt skill id
    name: Mapped[str] = mapped_column(String(255))

    jobs: Mapped[list["JobListing"]] = relationship(
        secondary=job_listing_skills, back_populates="skills", lazy="selectin"
    )


class JobListing(Base):
    __tablename__ = "job_listings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)  # Freelancehunt project id
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    budget_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    budget_currency: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    employer_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    skills: Mapped[list[Skill]] = relationship(
        secondary=job_listing_skills, back_populates="jobs", lazy="selectin"
    )
