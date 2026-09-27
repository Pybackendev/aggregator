"""
Thin async wrapper around the Freelancehunt API v2.

NOTE: the exact shape of `attributes` on a project object has not been
verified yet against a live response. Field access below (budget, status,
employer, skills, published_at) is a best guess based on the public docs
and should be double-checked against a real `GET /v2/projects` response,
then adjusted here and in app/models/job.py if names differ.
"""

import httpx

from app.core.config import settings

BASE_URL = "https://api.freelancehunt.com/v2"


class FreelancehuntClient:
    def __init__(self, token: str | None = None):
        self.token = token or settings.freelancehunt_token
        self._client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept-Language": "ru",
            },
            timeout=30,
        )

    async def close(self):
        await self._client.aclose()

    async def get_skills(self) -> list[dict]:
        resp = await self._client.get("/skills")
        resp.raise_for_status()
        return resp.json()["data"]

    async def get_projects_page(self, page: int = 1, skill_ids: list[int] | None = None) -> dict:
        params: dict = {"page[number]": page}
        if skill_ids:
            params["filter[skill_ids]"] = ",".join(str(s) for s in skill_ids)
        resp = await self._client.get("/projects", params=params)
        resp.raise_for_status()
        return resp.json()

    async def iter_all_projects(self, skill_ids: list[int] | None = None, max_pages: int = 20):
        """Yield raw project dicts across pages until there's no `next` link or max_pages hit.

        NOTE: Freelancehunt's `filter[skill_ids]` query param does not reliably filter
        server-side (confirmed empirically — unrelated projects come back regardless).
        So we still pass it (harmless, might help under the hood) but ALSO filter
        client-side below, checking each project's own attributes.skills list.
        """
        page = 1
        wanted = set(skill_ids or [])
        while page <= max_pages:
            payload = await self.get_projects_page(page=page, skill_ids=skill_ids)
            for item in payload["data"]:
                if wanted:
                    item_skill_ids = {
                        s["id"] for s in (item.get("attributes", {}).get("skills") or [])
                    }
                    if not (item_skill_ids & wanted):
                        continue
                yield item
            if not payload.get("links", {}).get("next"):
                break
            page += 1
