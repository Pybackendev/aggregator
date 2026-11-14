from datetime import datetime, timezone

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.jobs import router
from app.core.db import get_session
from app.models.job import FeedSync, JobListing, Skill


async def test_jobs_search_and_sort_before_pagination(db_session):
    skill = Skill(id=1, name="Python")
    db_session.add(FeedSync(id=1, completed_at=datetime(2026, 1, 4, tzinfo=timezone.utc)))
    db_session.add_all(
        [
            JobListing(
                id=1,
                title="Need a Python bot",
                budget_amount=500,
                published_at=datetime(2026, 1, 1),
                skills=[skill],
            ),
            JobListing(
                id=2, title="PYTHON dashboard", budget_amount=200, published_at=datetime(2026, 1, 2)
            ),
            JobListing(
                id=3, title="Python work", budget_amount=None, published_at=datetime(2026, 1, 3)
            ),
            JobListing(
                id=4, title="Design only", budget_amount=900, published_at=datetime(2026, 1, 4)
            ),
            JobListing(
                id=5,
                title="Python 100% complete",
                budget_amount=200,
                published_at=datetime(2026, 1, 2),
            ),
        ]
    )
    await db_session.commit()

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_session] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:

        async def ids(**params):
            response = await client.get("/jobs", params=params)
            assert response.status_code == 200
            return [job["id"] for job in response.json()]

        assert await ids(q="  PyThOn BoT ", limit=1) == [1]
        assert await ids(q="python", sort="budget", limit=2) == [1, 5]
        assert await ids(q="python", sort="budget", limit=2, offset=2) == [2, 3]
        assert await ids(q="python", skill_id=1) == [1]
        db_session.add_all(
            [
                JobListing(
                    id=6,
                    title="Python EUR",
                    description="Integrate payment gateway",
                    budget_amount=700,
                    budget_currency="EUR",
                    status_id=11,
                ),
                JobListing(id=7, title="Python UAH", budget_amount=9000, budget_currency="UAH"),
            ]
        )
        await db_session.commit()
        assert await ids(q="python", currency="EUR", sort="budget", limit=1) == [6]
        assert await ids(q="python", currency="USD") == []
        assert await ids(q="payment gateway", status="open") == [6]
        assert await ids(posted_since="2026-01-04T00:00:00Z") == [4]
        assert await ids(status="open", currency="EUR", min_budget=700) == [6]
        assert await ids(status="open", currency="EUR", min_budget=701) == []
        response = await client.get("/jobs/currencies")
        assert response.json() == ["EUR", "UAH"]
        assert (await client.get("/jobs/skills")).json() == [{"id": 1, "name": "Python"}]
        assert (await client.get("/jobs/sync-status")).json() == {
            "last_success_at": "2026-01-04T00:00:00Z"
        }
        assert await ids(q="python", sort="budget", ids=[1, 4, 5], limit=1, offset=1) == [5]
        assert await ids(q="100%") == [5]
        assert await ids(q="does not match") == []
        assert await ids(limit=1) == [4]
