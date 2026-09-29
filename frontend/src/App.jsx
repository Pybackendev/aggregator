import { useEffect, useState } from "react";
import { api } from "./api";
import JobList from "./components/JobList.jsx";
import FilterForm from "./components/FilterForm.jsx";

const USER_ID_KEY = "aggregator_user_id";

export default function App() {
  const [tab, setTab] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState([]);
  const [chatIdInput, setChatIdInput] = useState("");
  const [userId, setUserId] = useState(() => localStorage.getItem(USER_ID_KEY) || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (userId) loadFilters();
  }, [userId]);

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      setJobs(await api.listJobs({ limit: 30 }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFilters() {
    try {
      setFilters(await api.listFilters(userId));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!chatIdInput.trim()) return;
    try {
      const user = await api.createUser(chatIdInput.trim());
      localStorage.setItem(USER_ID_KEY, String(user.id));
      setUserId(user.id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddFilter(filter) {
    try {
      await api.addFilter(userId, filter);
      loadFilters();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteFilter(filterId) {
    try {
      await api.deleteFilter(userId, filterId);
      loadFilters();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="container">
      <header className="app-header">
        <h1>Freelance Job Aggregator</h1>
        <p className="subtitle">Проекты с Freelancehunt по Python и разработке ботов</p>
      </header>

      <div className="tabs">
        <button className={`tab ${tab === "jobs" ? "active" : ""}`} onClick={() => setTab("jobs")}>
          Проекты
        </button>
        <button className={`tab ${tab === "filters" ? "active" : ""}`} onClick={() => setTab("filters")}>
          Мои фильтры
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {tab === "jobs" &&
        (loading ? <div className="empty">Загрузка…</div> : <JobList jobs={jobs} />)}

      {tab === "filters" &&
        (userId ? (
          <FilterForm filters={filters} onAdd={handleAddFilter} onDelete={handleDeleteFilter} />
        ) : (
          <form className="filter-form" onSubmit={handleRegister}>
            <input
              placeholder="Твой Telegram chat_id"
              value={chatIdInput}
              onChange={(e) => setChatIdInput(e.target.value)}
            />
            <button type="submit">Зарегистрироваться</button>
          </form>
        ))}
    </div>
  );
}
