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
            {job.budget_amount
              ? `${job.budget_amount} ${job.budget_currency || ""}`
              : "бюджет не указан"}
            {job.status_name ? ` · ${job.status_name}` : ""}
          </div>
          {job.skills?.map((s) => (
            <span className="badge" key={s.id}>
              {s.name}
            </span>
          ))}
          {job.url && (
            <div style={{ marginTop: 8 }}>
              <a href={job.url} target="_blank" rel="noreferrer">
                Открыть на Freelancehunt →
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
