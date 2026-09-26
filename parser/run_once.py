"""
Single-run entrypoint for Render Cron Jobs (free tier has no background workers,
but does support scheduled Cron Jobs that run once and exit).

Usage: python -m parser.run_once
Render calls this on its own schedule (see render.yaml) instead of us running
an in-process APScheduler loop.
"""

import asyncio
import logging

from parser.notifier import send_telegram_message
from parser.sync import sync_projects

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("run_once")


async def main():
    try:
        new_count = await sync_projects()
        logger.info("Sync done, %s new listings", new_count)
        if new_count:
            await send_telegram_message(f"Найдено новых проектов: {new_count}")
    except Exception:
        logger.exception("Sync job failed")
        raise


if __name__ == "__main__":
    asyncio.run(main())
