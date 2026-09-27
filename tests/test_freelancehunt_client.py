import pytest

from parser.freelancehunt_client import FreelancehuntClient

pytestmark = pytest.mark.asyncio


def make_project(project_id, skill_ids):
    return {
        "id": str(project_id),
        "attributes": {"name": f"Project {project_id}", "skills": [{"id": i, "name": str(i)} for i in skill_ids]},
    }


async def test_iter_all_projects_filters_client_side(monkeypatch):
    """Freelancehunt's filter[skill_ids] query param doesn't reliably filter server-side,
    so iter_all_projects must drop irrelevant projects itself."""
    page_1 = {
        "data": [
            make_project(1, [22]),  # Python - keep
            make_project(2, [140]),  # Poems/Songs - drop
        ],
        "links": {},
    }

    client = FreelancehuntClient(token="fake")

    async def fake_get_projects_page(page=1, skill_ids=None):
        return page_1

    monkeypatch.setattr(client, "get_projects_page", fake_get_projects_page)

    results = [item async for item in client.iter_all_projects(skill_ids=[22, 180])]

    assert [r["id"] for r in results] == ["1"]

    await client.close()
