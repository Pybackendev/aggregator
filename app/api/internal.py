"""
Render's free plan has no background worker / cron job (those require a paid plan).
As a free workaround, this endpoint lets an external scheduler (GitHub Actions cron,
cron-job.org, etc.) trigger a sync run over HTTP instead. Protected by a shared-secret
header so randoms on the internet can't spam your Freelancehunt quota.
"""

from fastapi import APIRouter, Header, HTTPException

from app.core.config import settings
from parser.notifier import send_telegram_message
from parser.sync import sync_projects

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/sync")
async def trigger_sync(x_sync_token: str = Header(default="")):
    if not settings.sync_trigger_token or x_sync_token != settings.sync_trigger_token:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Sync-Token")

    new_count = await sync_projects()
    if new_count:
        await send_telegram_message(f"Найдено новых проектов: {new_count}")
    return {"new_listings": new_count}
