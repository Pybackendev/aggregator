import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Sidebar from "./components/Sidebar.jsx";
import Toolbar from "./components/Toolbar.jsx";
import JobList from "./components/JobList.jsx";
import FilterForm from "./components/FilterForm.jsx";

const USER_ID_KEY = "aggregator_user_id";
const FAVORITES_KEY = "aggregator_favorites";

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export default function App() {
  const [section, setSection] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState([]);
  const [chatIdInput, setChatIdInput] = useState("");
  const [userId, setUserId] = useState(() => localStorage.getItem(USER_ID_KEY) || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

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
      setJobs(await api.listJobs({ limit: 50 }));
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

  function toggleFavorite(jobId) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const visibleJobs = useMemo(() => {
    let list = jobs;
    if (section === "favorites") {
      list = list.filter((j) => favorites.has(j.id));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((j) => j.title.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sort === "budget") {
        return (b.budget_amount || 0) - (a.budget_amount || 0);
      }
      return new Date(b.published_at || 0) - new Date(a.published_at || 0);
    });
    return list;
  }, [jobs, section, favorites, search, sort]);

  return (
    <div className="app-layout">
      <Sidebar
        active={section}
        onChange={setSection}
        jobsCount={jobs.length}
        favoritesCount={favorites.size}
      />

      <main className="main-content">
        <div className="content-inner">
          <header className="app-header">
            <h1>
              {section === "jobs" && "Заказы"}
              {section === "favorites" && "Избранное"}
              {section === "filters" && "Мои фильтры"}
            </h1>
            <p className="subtitle">Проекты с Freelancehunt по Python и разработке ботов</p>
          </header>

          {error && <div className="error">{error}</div>}

          {(section === "jobs" || section === "favorites") && (
            <>
              <Toolbar
                search={search}
                onSearchChange={setSearch}
                sort={sort}
                onSortChange={setSort}
                count={visibleJobs.length}
              />
              {loading ? (
                <div className="empty">Загрузка…</div>
              ) : (
                <JobList jobs={visibleJobs} favorites={favorites} onToggleFavorite={toggleFavorite} />
              )}
            </>
          )}

          {section === "filters" &&
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
      </main>
    </div>
  );
}
