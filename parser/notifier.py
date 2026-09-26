import httpx

from app.core.config import settings


async def send_telegram_message(text: str, chat_id: str | None = None) -> None:
    if not settings.telegram_bot_token:
        return
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient() as client:
        await client.post(
            url,
            json={
                "chat_id": chat_id or settings.telegram_chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": False,
            },
        )


def format_job_notification(title: str, budget_amount, budget_currency, url: str | None) -> str:
    budget = f"{budget_amount} {budget_currency}" if budget_amount else "бюджет не указан"
    link = f"\n{url}" if url else ""
    return f"<b>{title}</b>\n{budget}{link}"
