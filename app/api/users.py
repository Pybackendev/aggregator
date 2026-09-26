from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.user import JobFilter, User
from app.schemas.user import JobFilterCreate, JobFilterOut, UserCreate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserOut)
async def create_or_get_user(payload: UserCreate, session: AsyncSession = Depends(get_session)):
    existing = await session.scalar(
        select(User).where(User.telegram_chat_id == payload.telegram_chat_id)
    )
    if existing:
        return existing
    user = User(telegram_chat_id=payload.telegram_chat_id)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/{user_id}/filters", response_model=JobFilterOut)
async def add_filter(
    user_id: int, payload: JobFilterCreate, session: AsyncSession = Depends(get_session)
):
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    job_filter = JobFilter(user_id=user_id, keyword=payload.keyword, min_budget=payload.min_budget)
    session.add(job_filter)
    await session.commit()
    await session.refresh(job_filter)
    return job_filter


@router.get("/{user_id}/filters", response_model=list[JobFilterOut])
async def list_filters(user_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(JobFilter).where(JobFilter.user_id == user_id))
    return result.scalars().all()


@router.delete("/{user_id}/filters/{filter_id}", status_code=204)
async def delete_filter(user_id: int, filter_id: int, session: AsyncSession = Depends(get_session)):
    job_filter = await session.get(JobFilter, filter_id)
    if job_filter is None or job_filter.user_id != user_id:
        raise HTTPException(status_code=404, detail="Filter not found")
    await session.delete(job_filter)
    await session.commit()
