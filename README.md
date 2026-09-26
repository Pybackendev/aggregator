# Freelance Job Aggregator

Парсит проекты с Freelancehunt по заданным навыкам (Python=22, Bot Development=180),
сохраняет в Postgres, отдаёт через FastAPI, шлёт уведомления в Telegram.

## Важно перед первым запуском

Модели (`app/models/job.py`) и парсер (`parser/sync.py`) написаны по документации
Freelancehunt API "вслепую" — реальный ответ `GET /v2/projects` ещё не проверен.
**Первым делом** сделай live-запрос и сверь, что поля `attributes.budget`,
`attributes.status`, `attributes.employer`, `attributes.skills`, `attributes.published_at`
называются именно так — и поправь `parser/sync.py` / `app/models/job.py`, если нет.

## Установка

```bash
poetry install
cp .env.example .env   # заполнить токены и DATABASE_URL
```

## Миграции

```bash
poetry run alembic revision --autogenerate -m "init"
poetry run alembic upgrade head
```

## Запуск API

```bash
poetry run uvicorn app.main:app --reload
```

Swagger: http://localhost:8000/docs

## Запуск планировщика (парсинг + уведомления)

```bash
poetry run python -m parser.scheduler
```

## Структура

```
app/
  api/           # FastAPI роутеры
  core/          # конфиг, подключение к БД
  models/        # SQLAlchemy модели
  schemas/       # Pydantic схемы ответов API
  services/       # (для бизнес-логики по мере роста)
  repositories/   # (для доступа к БД по мере роста)
parser/
  freelancehunt_client.py  # httpx-клиент к Freelancehunt API
  sync.py                  # upsert + дедупликация проектов
  notifier.py              # отправка сообщений в Telegram
  scheduler.py             # APScheduler: периодический запуск sync
alembic/          # миграции БД
```

## Запуск через Docker (рекомендуется)

Не нужен ни Poetry, ни venv, ни отдельно поднятый Postgres — всё в одной команде:

```bash
docker compose up --build
```

Это поднимет:
- `db` — Postgres 16 (локальный, для разработки; на проде используется Neon/Render Postgres)
- `api` — сначала прогонит `alembic upgrade head`, потом запустит FastAPI на http://localhost:8000/docs
- `worker` — запустит `parser.scheduler` (парсинг + уведомления по расписанию)

`DATABASE_URL` для контейнеров переопределяется автоматически на локальный `db` сервис — значение в `.env` (Neon) для Docker-запуска не используется, но нужно для `FREELANCEHUNT_TOKEN` и `TELEGRAM_*`.

Остановить: `docker compose down` (данные Postgres останутся в volume `db_data`, чтобы стереть — `docker compose down -v`).

## Деплой на Render

1. Запушь проект на GitHub (`git init`, `git add .`, `git commit`, создать репо на GitHub, `git push`)
2. На https://dashboard.render.com → **New** → **Blueprint** → выбери репозиторий — Render сам найдёт `render.yaml` и покажет план (Postgres + `aggregator-api` + `aggregator-worker`)
3. Перед деплоем Render попросит заполнить переменные с `sync: false` (они специально не хранятся в `render.yaml`, т.к. это секреты): `FREELANCEHUNT_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
4. Apply — Render сам создаст базу, соберёт Docker-образ для обоих сервисов и подставит `DATABASE_URL` из своей БД автоматически
5. `aggregator-api` при каждом деплое сам прогоняет `alembic upgrade head` перед стартом (см. `dockerCommand` в `render.yaml`) — миграции гонять руками не нужно
6. Проверка: открой `https://<твой-сервис>.onrender.com/docs`

Бесплатный план Render "усыпляет" веб-сервис после 15 минут без запросов (первый запрос после сна будет медленным) — это нормально для портфолио-демо, но не для продакшена.

## Дальше по плану

1. Сверить структуру ответа API, поправить модели
2. Прогнать первую миграцию, проверить `/jobs` в Swagger
3. Добавить `job_filters` + matching-логику под конкретных пользователей
4. React-панель поверх готового API
