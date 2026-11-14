from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import AwareDatetime
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_session
from app.models.job import FeedSync, JobListing, OPEN_STATUS, Skill
from app.schemas.job import JobListingOut, SkillOut

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobListingOut])
async def list_jobs(
    skill_id: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
    q: str = Query(default="", max_length=500),
    sort: Literal["newest", "budget"] = "newest",
    ids: list[int] | None = Query(default=None),
    currency: str | None = Query(default=None, min_length=1, max_length=10),
    status: Literal["open", "closed"] | None = None,
    min_budget: Decimal | None = Query(default=None, ge=0, le=9_999_999_999.99),
    posted_since: AwareDatetime | None = None,
):
    stmt = select(JobListing).options(selectinload(JobListing.skills))
    if skill_id is not None:
        stmt = stmt.join(JobListing.skills).where(Skill.id == skill_id)
    if ids is not None:
        stmt = stmt.where(JobListing.id.in_(ids))
    if currency is not None:
        stmt = stmt.where(JobListing.budget_currency == currency)
    if status == "open":
        stmt = stmt.where(JobListing.status_id == OPEN_STATUS)
    elif status == "closed":
        stmt = stmt.where(JobListing.status_id != OPEN_STATUS)
    if min_budget is not None:
        stmt = stmt.where(JobListing.budget_amount >= min_budget)
    if posted_since is not None:
        stmt = stmt.where(JobListing.published_at >= posted_since.astimezone(timezone.utc))
    if query := q.strip():
        stmt = stmt.where(
            or_(
                JobListing.title.icontains(query, autoescape=True),
                JobListing.description.icontains(query, autoescape=True),
            )
        )
    if sort == "budget":
        stmt = stmt.order_by(JobListing.budget_amount.desc().nulls_last())
    stmt = stmt.order_by(JobListing.published_at.desc().nulls_last(), JobListing.id.desc())
    stmt = stmt.limit(limit).offset(offset)
    result = await session.execute(stmt)
    return result.scalars().unique().all()


@router.get("/currencies", response_model=list[str])
async def list_currencies(session: AsyncSession = Depends(get_session)):
    currency = JobListing.budget_currency
    stmt = (
        select(currency).where(currency.is_not(None), currency != "").distinct().order_by(currency)
    )
    return (await session.scalars(stmt)).all()


@router.get("/skills", response_model=list[SkillOut])
async def list_skills(session: AsyncSession = Depends(get_session)):
    return (await session.scalars(select(Skill).order_by(Skill.name))).all()


@router.get("/sync-status")
async def sync_status(session: AsyncSession = Depends(get_session)) -> dict[str, datetime | None]:
    record = await session.get(FeedSync, 1)
    completed_at = record.completed_at if record else None
    if completed_at is not None and completed_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=timezone.utc)
    return {"last_success_at": completed_at}


@router.get("/{job_id}", response_model=JobListingOut)
async def get_job(job_id: int, session: AsyncSession = Depends(get_session)):
    stmt = (
        select(JobListing).options(selectinload(JobListing.skills)).where(JobListing.id == job_id)
    )
    result = await session.execute(stmt)
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
