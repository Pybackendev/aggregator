export default function JobList({ jobs }) {
  if (jobs.length === 0) {
    return <div className="empty">Проектов пока нет — синк ещё не находил новых.</div>;
  }

  return (
    <div>
      {jobs.map((job) => (
        <div className="card" key={job.id}>
          <h3>{job.title}</h3>
          <div className="meta">
            <span className="budget">
              {job.budget_amount
                ? `${job.budget_amount} ${job.budget_currency || ""}`
                : "бюджет не указан"}
            </span>
            {job.status_name ? <span>· {job.status_name}</span> : null}
          </div>
          <div>
            {job.skills?.map((s) => (
              <span className="badge" key={s.id}>
                {s.name}
              </span>
            ))}
          </div>
          {job.url && (
            <a className="job-link" href={job.url} target="_blank" rel="noreferrer">
              Открыть на Freelancehunt →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
