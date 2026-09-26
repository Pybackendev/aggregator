from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_session
from app.models.job import JobListing, Skill
from app.schemas.job import JobListingOut

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobListingOut])
async def list_jobs(
    skill_id: int | None = Query(default=None),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(JobListing).options(selectinload(JobListing.skills))
    if skill_id is not None:
        stmt = stmt.join(JobListing.skills).where(Skill.id == skill_id)
    stmt = stmt.order_by(JobListing.published_at.desc()).limit(limit).offset(offset)
    result = await session.execute(stmt)
    return result.scalars().unique().all()


@router.get("/{job_id}", response_model=JobListingOut)
async def get_job(job_id: int, session: AsyncSession = Depends(get_session)):
    stmt = (
        select(JobListing)
        .options(selectinload(JobListing.skills))
        .where(JobListing.id == job_id)
    )
    result = await session.execute(stmt)
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
