import { colorForSkill } from "../utils/colors";

export default function JobList({ jobs, favorites, onToggleFavorite }) {
  if (jobs.length === 0) {
    return <div className="empty">Ничего не найдено.</div>;
  }

  return (
    <div>
      {jobs.map((job) => {
        const isFav = favorites.has(job.id);
        return (
          <div className="card" key={job.id}>
            <div className="card-top">
              <h3>{job.title}</h3>
              <button
                className={`star-btn ${isFav ? "active" : ""}`}
                onClick={() => onToggleFavorite(job.id)}
                title={isFav ? "Убрать из избранного" : "В избранное"}
              >
                {isFav ? "★" : "☆"}
              </button>
            </div>
            <div className="meta">
              <span className="budget">
                {job.budget_amount
                  ? `${job.budget_amount} ${job.budget_currency || ""}`
                  : "бюджет не указан"}
              </span>
              {job.status_name ? <span>· {job.status_name}</span> : null}
            </div>
            <div>
              {job.skills?.map((s) => {
                const color = colorForSkill(s.name);
                return (
                  <span
                    className="badge"
                    key={s.id}
                    style={{ background: color.bg, color: color.fg }}
                  >
                    {s.name}
                  </span>
                );
              })}
            </div>
            {job.url && (
              <a className="job-link" href={job.url} target="_blank" rel="noreferrer">
                Открыть на Freelancehunt →
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
