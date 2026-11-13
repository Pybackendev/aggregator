import hashlib
import re
import secrets
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.models.user import JobFilter, TelegramSession, User
from app.schemas.user import JobFilterCreate, JobFilterOut, UserOut

router = APIRouter(prefix="/users", tags=["users"])
bearer = HTTPBearer(auto_error=False)
LINK_TTL_SECONDS = 600
SESSION_TTL_SECONDS = 30 * 24 * 60 * 60


class TelegramChat(BaseModel):
    id: int
    type: str


class TelegramMessage(BaseModel):
    chat: TelegramChat
    text: str = ""


class TelegramUpdate(BaseModel):
    message: TelegramMessage | None = None


def token_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


async def get_browser_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> TelegramSession:
    if credentials:
        link = await session.get(TelegramSession, token_hash(credentials.credentials))
        if link and link.expires_at > time.time():
            return link
    raise HTTPException(status_code=401, detail="Подключите Telegram заново")


async def require_filter_owner(user_id: int, link: TelegramSession = Depends(get_browser_session)):
    if link.user_id is None:
        raise HTTPException(status_code=401, detail="Подтвердите подключение в Telegram")
    if link.user_id != user_id:
        raise HTTPException(status_code=403, detail="Доступ к фильтрам запрещён")


@router.post("/telegram/connect", status_code=201)
async def connect_telegram(response: Response, session: AsyncSession = Depends(get_session)):
    username = settings.telegram_bot_username.strip().lstrip("@")
    if not (
        settings.telegram_bot_token
        and settings.telegram_webhook_secret
        and re.fullmatch(r"[A-Za-z0-9_]{5,32}", username)
    ):
        raise HTTPException(status_code=503, detail="Подключение Telegram пока не настроено")
    now = int(time.time())
    token = secrets.token_urlsafe(32)
    code = secrets.token_urlsafe(24)
    await session.execute(delete(TelegramSession).where(TelegramSession.expires_at <= now))
    session.add(
        TelegramSession(
            token_hash=token_hash(token),
            code_hash=token_hash(code),
            expires_at=now + LINK_TTL_SECONDS,
        )
    )
    await session.commit()
    response.headers["Cache-Control"] = "no-store"
    return {
        "token": token,
        "url": f"https://t.me/{username}?start={code}",
        "expires_in": LINK_TTL_SECONDS,
    }


@router.get("/telegram/session", response_model=UserOut | None)
async def telegram_session(
    response: Response,
    link: TelegramSession = Depends(get_browser_session),
    session: AsyncSession = Depends(get_session),
):
    response.headers["Cache-Control"] = "no-store"
    return await session.get(User, link.user_id) if link.user_id is not None else None


@router.delete("/telegram/session", status_code=204)
async def logout_telegram(
    link: TelegramSession = Depends(get_browser_session),
    session: AsyncSession = Depends(get_session),
):
    await session.delete(link)
    await session.commit()


@router.post("/telegram/webhook")
async def telegram_webhook(
    payload: TelegramUpdate,
    x_telegram_bot_api_secret_token: str = Header(default=""),
    session: AsyncSession = Depends(get_session),
):
    secret = settings.telegram_webhook_secret
    if not secret or not secrets.compare_digest(
        secret.encode(), x_telegram_bot_api_secret_token.encode()
    ):
        raise HTTPException(status_code=403, detail="Invalid webhook secret")
    message = payload.message
    if not message or message.chat.type != "private" or message.chat.id <= 0:
        return {}
    match = re.fullmatch(r"/start ([A-Za-z0-9_-]{32})", message.text.strip())
    if not match:
        return {}
    now = int(time.time())
    claimed = await session.execute(
        update(TelegramSession)
        .where(TelegramSession.code_hash == token_hash(match[1]), TelegramSession.expires_at > now)
        .values(code_hash=None)
        .returning(TelegramSession.token_hash)
    )
    key = claimed.scalar_one_or_none()
    if key is None:
        await session.rollback()
        return {}

    chat_id = str(message.chat.id)
    user_id_query = select(User.id).where(User.telegram_chat_id == chat_id)
    user_id = await session.scalar(user_id_query)
    if user_id is None:
        try:
            async with session.begin_nested():
                user = User(telegram_chat_id=chat_id)
                session.add(user)
                await session.flush()
                user_id = user.id
        except IntegrityError:
            user_id = await session.scalar(user_id_query)
            if user_id is None:
                raise
    await session.execute(
        update(TelegramSession)
        .where(TelegramSession.token_hash == key)
        .values(user_id=user_id, expires_at=now + SESSION_TTL_SECONDS)
    )
    await session.commit()
    return {
        "method": "sendMessage",
        "chat_id": message.chat.id,
        "text": "Telegram подключён. Это тестовое уведомление. Вернитесь в агрегатор для настройки фильтров.",
    }


@router.post(
    "/{user_id}/filters", response_model=JobFilterOut, dependencies=[Depends(require_filter_owner)]
)
async def add_filter(
    user_id: int, payload: JobFilterCreate, session: AsyncSession = Depends(get_session)
):
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    job_filter = JobFilter(user_id=user_id, keyword=payload.keyword, min_budget=payload.min_budget)
    session.add(job_filter)
    await session.commit()
    await session.refresh(job_filter)
    return job_filter


@router.get(
    "/{user_id}/filters",
    response_model=list[JobFilterOut],
    dependencies=[Depends(require_filter_owner)],
)
async def list_filters(user_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(JobFilter).where(JobFilter.user_id == user_id))
    return result.scalars().all()


@router.delete(
    "/{user_id}/filters/{filter_id}", status_code=204, dependencies=[Depends(require_filter_owner)]
)
async def delete_filter(user_id: int, filter_id: int, session: AsyncSession = Depends(get_session)):
    job_filter = await session.get(JobFilter, filter_id)
    if job_filter is None or job_filter.user_id != user_id:
        raise HTTPException(status_code=404, detail="Filter not found")
    await session.delete(job_filter)
    await session.commit()
