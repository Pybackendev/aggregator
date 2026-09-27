from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.internal import router as internal_router
from app.api.jobs import router as jobs_router
from app.api.users import router as users_router

app = FastAPI(title="Freelance Job Aggregator")

# Portfolio demo: allow the React frontend (any origin) to call this API.
# Tighten to specific origins before treating this as production-grade.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs_router)
app.include_router(users_router)
app.include_router(internal_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
