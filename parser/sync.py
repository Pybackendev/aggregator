"""
Pulls projects from Freelancehunt and upserts them into job_listings.
Dedup strategy: Freelancehunt project id is used directly as our primary key,
so re-fetching the same project is a no-op update, never a duplicate row.

New listings are matched against every saved JobFilter; matching users get a
Telegram notification (see app/services/matching.py and parser/notifier.py).

NOTE: attribute names (budget.amount, status.name, employer.id, skills, ...)
are placeholders — verify against a real API response before relying on this.
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.db import async_session
from app.models.job import JobListing, Skill
from app.models.user import JobFilter
from app.services.matching import matching_chat_ids
from parser.freelancehunt_client import FreelancehuntClient
from parser.notifier import format_job_notification, send_telegram_message


async def _get_or_create_skill(session: AsyncSession, skill_id: int, name: str) -> Skill:
    skill = await session.get(Skill, skill_id)
    if skill is None:
        skill = Skill(id=skill_id, name=name)
        session.add(skill)
    return skill


async def upsert_job_from_raw(session: AsyncSession, raw: dict) -> tuple[JobListing, bool]:
    """Insert or update a single job listing from a raw Freelancehunt API item.
    Returns (job, is_new). Pure DB logic, no network calls — this is what
    tests/test_sync.py exercises directly against an in-memory SQLite session.
    """
    attrs = raw.get("attributes", {})
    job_id = int(raw["id"])

    existing = await session.scalar(
        select(JobListing).options(selectinload(JobListing.skills)).where(JobListing.id == job_id)
    )
    is_new = existing is None
    job = existing or JobListing(id=job_id)

    job.title = attrs.get("name", "")
    job.description = attrs.get("description")
    budget = attrs.get("budget") or {}
    job.budget_amount = budget.get("amount")
    job.budget_currency = budget.get("currency")
    status = attrs.get("status") or {}
    job.status_id = status.get("id")
    job.status_name = status.get("name")
    employer = attrs.get("employer") or {}
    job.employer_id = employer.get("id")
    self_links = attrs.get("self") or {}
    if isinstance(self_links, dict):
        job.url = self_links.get("web") or self_links.get("api")
    else:
        job.url = self_links or raw.get("links", {}).get("self")
    published_at = attrs.get("published_at")
    if published_at:
        job.published_at = datetime.fromisoformat(published_at)
    job.fetched_at = datetime.utcnow()

    skill_objs = []
    for s in attrs.get("skills", []) or []:
        skill_objs.append(await _get_or_create_skill(session, s["id"], s["name"]))
    job.skills = skill_objs

    if is_new:
        session.add(job)

    return job, is_new


async def sync_projects() -> int:
    """Returns number of new (previously unseen) job listings inserted.
    Also sends a Telegram notification to every user whose saved filter
    matches a newly inserted listing."""
    client = FreelancehuntClient()
    new_count = 0
    new_jobs: list[JobListing] = []
    try:
        async with async_session() as session:
            async for raw in client.iter_all_projects(skill_ids=settings.skill_ids_list):
                job, is_new = await upsert_job_from_raw(session, raw)
                if is_new:
                    new_count += 1
                    new_jobs.append(job)

            await session.commit()

            if new_jobs:
                filters_result = await session.execute(select(JobFilter))
                filters = filters_result.scalars().all()
                for job in new_jobs:
                    chat_ids = matching_chat_ids(job, filters)
                    text = format_job_notification(
                        job.title, job.budget_amount, job.budget_currency, job.url
                    )
                    for chat_id in chat_ids:
                        await send_telegram_message(text, chat_id=chat_id)
    finally:
        await client.close()

    return new_count
