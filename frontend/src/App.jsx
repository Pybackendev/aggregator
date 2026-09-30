import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Sidebar from "./components/Sidebar.jsx";
import Toolbar from "./components/Toolbar.jsx";
import JobList from "./components/JobList.jsx";
import FilterForm from "./components/FilterForm.jsx";
import UserBadge from "./components/UserBadge.jsx";

const USER_ID_KEY = "aggregator_user_id";
const CHAT_ID_KEY = "aggregator_chat_id";
const FAVORITES_KEY = "aggregator_favorites";
const PAGE_SIZE = 20;

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
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState([]);
  const [chatIdInput, setChatIdInput] = useState("");
  const [userId, setUserId] = useState(() => localStorage.getItem(USER_ID_KEY) || null);
  const [chatId, setChatId] = useState(() => localStorage.getItem(CHAT_ID_KEY) || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    loadJobs(0, false);
  }, []);

  useEffect(() => {
    if (userId) loadFilters();
  }, [userId]);

  async function loadJobs(nextOffset, append) {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const page = await api.listJobs({ limit: PAGE_SIZE, offset: nextOffset });
      setJobs((prev) => (append ? [...prev, ...page] : page));
      setOffset(nextOffset + page.length);
      setHasMore(page.length === PAGE_SIZE);
    } catch (e) {
      setError(e.message);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
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
      localStorage.setItem(CHAT_ID_KEY, user.telegram_chat_id);
      setUserId(user.id);
      setChatId(user.telegram_chat_id);
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

  const todayCount = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return jobs.filter((j) => j.published_at && now - new Date(j.published_at).getTime() < dayMs)
      .length;
  }, [jobs]);

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
            <div className="app-header-row">
              <div>
                <h1>
                  {section === "jobs" && "Заказы"}
                  {section === "favorites" && "Избранное"}
                  {section === "filters" && "Мои фильтры"}
                </h1>
                <p className="subtitle">Проекты с Freelancehunt по Python и разработке ботов</p>
              </div>
              <UserBadge chatId={chatId} onClick={() => setSection("filters")} />
            </div>
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
                todayCount={section === "jobs" ? todayCount : 0}
              />
              {loading ? (
                <div className="empty">Загрузка…</div>
              ) : (
                <JobList jobs={visibleJobs} favorites={favorites} onToggleFavorite={toggleFavorite} />
              )}

              {section === "jobs" && !loading && hasMore && (
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button className="secondary" onClick={() => loadJobs(offset, true)} disabled={loadingMore}>
                    {loadingMore ? "Загрузка…" : "Показать ещё"}
                  </button>
                </div>
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
