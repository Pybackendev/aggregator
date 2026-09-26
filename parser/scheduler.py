import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import settings
from parser.notifier import send_telegram_message
from parser.sync import sync_projects

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scheduler")


async def run_sync_job():
    try:
        new_count = await sync_projects()
        logger.info("Sync done, %s new listings", new_count)
        if new_count:
            await send_telegram_message(f"Найдено новых проектов: {new_count}")
    except Exception:
        logger.exception("Sync job failed")


async def main():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(run_sync_job, "interval", minutes=settings.sync_interval_minutes)
    scheduler.start()
    logger.info("Scheduler started, interval=%s min", settings.sync_interval_minutes)
    await run_sync_job()  # run once immediately on startup
    while True:
        await asyncio.sleep(3600)


if __name__ == "__main__":
    asyncio.run(main())
