from app.models.job import JobListing
from app.models.user import JobFilter


def job_matches_filter(job: JobListing, job_filter: JobFilter) -> bool:
    if job_filter.keyword:
        keyword = job_filter.keyword.lower()
        haystack = f"{job.title} {job.description or ''}".lower()
        if keyword not in haystack:
            return False

    if job_filter.min_budget is not None:
        if job.budget_amount is None or job.budget_amount < job_filter.min_budget:
            return False

    return True


def matching_chat_ids(job: JobListing, filters: list[JobFilter]) -> set[str]:
    """Given all filters (each with a loaded .user), return the distinct
    telegram_chat_ids of users whose filter matches this job."""
    chat_ids = set()
    for f in filters:
        if job_matches_filter(job, f) and f.user is not None:
            chat_ids.add(f.user.telegram_chat_id)
    return chat_ids
