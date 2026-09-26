import pytest
from sqlalchemy import func, select

from app.models.job import JobListing
from parser.sync import upsert_job_from_raw

pytestmark = pytest.mark.asyncio


def make_raw(project_id=1655335, name="Write a Telegram bot", amount=100, skills=None):
    return {
        "id": str(project_id),
        "attributes": {
            "name": name,
            "description": "Some description",
            "budget": {"amount": amount, "currency": "USD"},
            "status": {"id": 11, "name": "Open"},
            "employer": {"id": 999},
            "self": {"api": "https://api.freelancehunt.com/v2/projects/x", "web": "https://freelancehunt.com/project/x.html"},
            "published_at": "2026-09-25T16:32:25+03:00",
            "skills": skills or [{"id": 22, "name": "Python"}],
        },
    }


async def test_insert_new_job(db_session):
    job, is_new = await upsert_job_from_raw(db_session, make_raw())
    await db_session.commit()

    assert is_new is True
    assert job.title == "Write a Telegram bot"
    assert job.budget_amount == 100
    assert job.url == "https://freelancehunt.com/project/x.html"
    assert [s.id for s in job.skills] == [22]


async def test_reprocessing_same_project_id_does_not_duplicate(db_session):
    raw = make_raw()
    await upsert_job_from_raw(db_session, raw)
    await db_session.commit()

    # simulate the same project appearing again on a later sync run
    job2, is_new2 = await upsert_job_from_raw(db_session, raw)
    await db_session.commit()

    assert is_new2 is False

    count = await db_session.scalar(select(func.count()).select_from(JobListing))
    assert count == 1


async def test_reprocessing_updates_changed_fields(db_session):
    raw = make_raw(amount=100)
    await upsert_job_from_raw(db_session, raw)
    await db_session.commit()

    raw_updated = make_raw(amount=250)  # budget changed upstream
    job, is_new = await upsert_job_from_raw(db_session, raw_updated)
    await db_session.commit()

    assert is_new is False
    assert job.budget_amount == 250
