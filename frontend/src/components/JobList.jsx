import { colorForSkill } from "../utils/colors";
import { budgetLabel, dateLabel } from "../utils/format";

export default function JobList({ jobs, favorites, onToggleFavorite, emptyText }) {
  if (jobs.length === 0) {
    return <div className="empty" role="status">{emptyText}</div>;
  }

  return (
    <div>
      {jobs.map((job) => {
        const isFav = favorites.has(job.id);
        const published = dateLabel(job.published_at);
        return (
          <article className="card" key={job.id}>
            <div className="card-top">
              <h2>{job.url ? <a className="job-title" href={job.url} target="_blank" rel="noreferrer">{job.title}</a> : job.title}</h2>
              <button
                className={`star-btn ${isFav ? "active" : ""}`}
                onClick={() => onToggleFavorite(job.id)}
                title={isFav ? "Убрать из избранного" : "В избранное"}
                aria-label={`Избранное: ${job.title}`}
                aria-pressed={isFav}
              >
                {isFav ? "★" : "☆"}
              </button>
            </div>
            <div className="meta">
              <span className="budget">{budgetLabel(job.budget_amount, job.budget_currency)}</span>
              <span>{job.status_name || (job.status_id === 11 ? "Приём ставок" : "Статус неизвестен")}</span>
              {published && <time dateTime={job.published_at}>{published}</time>}
            </div>
            <div>
              {job.skills?.map((s) => {
                const color = colorForSkill(s.name);
                return (
                  <span
                    className="badge"
                    key={s.id}
                    style={{ "--skill-bg": color.bg, "--skill-fg": color.fg }}
                  >
                    {s.name}
                  </span>
                );
              })}
            </div>
            {job.url && (
              <a className="job-link" href={job.url} target="_blank" rel="noreferrer">
                Открыть на Freelancehunt ↗
              </a>
            )}
            {job.description && (
              <details className="job-details">
                <summary>Описание заказа</summary>
                <p>{job.description}</p>
              </details>
            )}
          </article>
        );
      })}
    </div>
  );
}
