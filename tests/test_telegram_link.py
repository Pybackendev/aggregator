from types import SimpleNamespace

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api import users
from app.core.db import get_session
from app.models.user import JobFilter, User


async def test_link_proves_chat_ownership_and_preserves_filters(db_session, monkeypatch):
    monkeypatch.setattr(
        users,
        "settings",
        SimpleNamespace(
            telegram_bot_token="test-token",
            telegram_bot_username="test_aggregator_bot",
            telegram_webhook_secret="test-webhook",
        ),
        raising=False,
    )
    db_session.add_all(
        [
            User(id=10, telegram_chat_id="123"),
            User(id=11, telegram_chat_id="456"),
            JobFilter(id=100, user_id=10, keyword="python"),
        ]
    )
    await db_session.commit()
    app = FastAPI()
    app.include_router(users.router)
    app.dependency_overrides[get_session] = lambda: db_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.get("/users/10/filters")).status_code == 401
        assert (await client.post("/users", json={"telegram_chat_id": "123"})).status_code == 404
        link = await client.post("/users/telegram/connect")
        assert link.status_code == 201
        credentials = link.json()
        code = credentials["url"].split("?start=")[1]
        auth = {"Authorization": f"Bearer {credentials['token']}"}
        secret = {"X-Telegram-Bot-Api-Secret-Token": "test-webhook"}
        message = {"message": {"chat": {"type": "private", "id": 123}, "text": f"/start {code}"}}
        webhook = "/users/telegram/webhook"
        assert code != credentials["token"]
        assert (await client.get("/users/telegram/session", headers=auth)).json() is None
        assert (await client.post(webhook, json=message)).status_code == 403
        group = {"message": {**message["message"], "chat": {"type": "group", "id": 123}}}
        assert (await client.post(webhook, json=group, headers=secret)).json() == {}
        assert (await client.get("/users/telegram/session", headers=auth)).json() is None
        confirmation = await client.post(webhook, json=message, headers=secret)
        assert confirmation.json()["method"] == "sendMessage"
        assert confirmation.json()["chat_id"] == 123
        assert (await client.post(webhook, json=message, headers=secret)).json() == {}
        assert (await client.get("/users/telegram/session", headers=auth)).json()["id"] == 10
        assert (await client.get("/users/10/filters", headers=auth)).json()[0][
            "keyword"
        ] == "python"
        assert (await client.get("/users/11/filters", headers=auth)).status_code == 403
        assert (await client.post("/users/11/filters", json={}, headers=auth)).status_code == 403
        assert (await client.delete("/users/11/filters/100", headers=auth)).status_code == 403
        assert (await client.delete("/users/telegram/session", headers=auth)).status_code == 204
        assert (await client.get("/users/10/filters", headers=auth)).status_code == 401
