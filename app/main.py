from fastapi import FastAPI

from app.api.internal import router as internal_router
from app.api.jobs import router as jobs_router
from app.api.users import router as users_router

app = FastAPI(title="Freelance Job Aggregator")

app.include_router(jobs_router)
app.include_router(users_router)
app.include_router(internal_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
