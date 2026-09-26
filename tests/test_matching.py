from app.models.job import JobListing
from app.models.user import JobFilter, User
from app.services.matching import job_matches_filter, matching_chat_ids


def make_job(title="Need a Python bot", description="", budget_amount=None):
    return JobListing(
        id=1,
        title=title,
        description=description,
        budget_amount=budget_amount,
        budget_currency="USD",
    )


def test_keyword_match_case_insensitive():
    job = make_job(title="Looking for a PYTHON developer")
    f = JobFilter(keyword="python")
    assert job_matches_filter(job, f) is True


def test_keyword_no_match():
    job = make_job(title="Need a PHP developer")
    f = JobFilter(keyword="python")
    assert job_matches_filter(job, f) is False


def test_keyword_matches_in_description_too():
    job = make_job(title="Web project", description="must know python and fastapi")
    f = JobFilter(keyword="fastapi")
    assert job_matches_filter(job, f) is True


def test_no_keyword_means_any_title_passes():
    job = make_job(title="Anything at all")
    f = JobFilter(keyword=None)
    assert job_matches_filter(job, f) is True


def test_min_budget_satisfied():
    job = make_job(budget_amount=500)
    f = JobFilter(min_budget=300)
    assert job_matches_filter(job, f) is True


def test_min_budget_not_satisfied():
    job = make_job(budget_amount=100)
    f = JobFilter(min_budget=300)
    assert job_matches_filter(job, f) is False


def test_min_budget_missing_on_job_fails_filter():
    job = make_job(budget_amount=None)
    f = JobFilter(min_budget=300)
    assert job_matches_filter(job, f) is False


def test_keyword_and_budget_both_required():
    job = make_job(title="Python bot", budget_amount=100)
    f = JobFilter(keyword="python", min_budget=300)
    assert job_matches_filter(job, f) is False


def test_matching_chat_ids_deduplicates_and_filters():
    job = make_job(title="Python bot", budget_amount=500)

    user_a = User(id=1, telegram_chat_id="chat-a")
    user_b = User(id=2, telegram_chat_id="chat-b")

    filter_1 = JobFilter(keyword="python", user=user_a)
    filter_2 = JobFilter(keyword="php", user=user_b)  # should not match
    filter_3 = JobFilter(min_budget=100, user=user_a)  # matches, same user as filter_1

    chat_ids = matching_chat_ids(job, [filter_1, filter_2, filter_3])

    assert chat_ids == {"chat-a"}
