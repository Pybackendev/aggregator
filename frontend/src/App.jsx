import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import Sidebar from "./components/Sidebar.jsx";
import Toolbar from "./components/Toolbar.jsx";
import JobList from "./components/JobList.jsx";
import FilterForm from "./components/FilterForm.jsx";
import UserBadge from "./components/UserBadge.jsx";
import { dateLabel } from "./utils/format";

const SESSION_KEY = "aggregator_telegram_session";
const FAVORITES_KEY = "aggregator_favorites";
const THEME_KEY = "aggregator_theme";
const PAGE_SIZE = 20;
const DAY = 86_400_000;
const JOB_CRITERIA = { status: "open", skill: "", period: "", budget: "" };
const FAVORITE_CRITERIA = { ...JOB_CRITERIA, status: "" };

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
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState([]);
  const [token, setToken] = useState(() => localStorage.getItem(SESSION_KEY));
  const [user, setUser] = useState(null);
  const [telegramUrl, setTelegramUrl] = useState(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramError, setTelegramError] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [currency, setCurrency] = useState("");
  const [currencies, setCurrencies] = useState([]);
  const [skills, setSkills] = useState([]);
  const [criteria, setCriteria] = useState(JOB_CRITERIA);
  const [lastSync, setLastSync] = useState(undefined);
  const [metadataError, setMetadataError] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === "light" ? "light" : "dark");
  const jobsRequest = useRef(null);
  const query = search.trim();
  const favoriteIds = section === "favorites" ? [...favorites].join(",") : null;
  const yesterday = Date.now() - DAY;
  const todayCount = jobs.filter((job) => Date.parse(job.published_at) >= yesterday).length;

  const clearTelegram = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUser(null);
    setTelegramUrl(null);
    setFilters([]);
  }, []);

  const reportTelegramError = useCallback((error) => {
    if (error.status === 401) clearTelegram();
    setTelegramError(error.message);
  }, [clearTelegram]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let timer;
    async function checkConnection() {
      try {
        const connected = await api.telegramSession(token, controller.signal);
        if (controller.signal.aborted) return;
        if (connected) {
          localStorage.setItem(SESSION_KEY, token);
          setUser(connected);
          setTelegramUrl(null);
          setTelegramError(null);
        } else {
          timer = setTimeout(checkConnection, 2000);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        reportTelegramError(error);
        if (error.status !== 401) timer = setTimeout(checkConnection, 5000);
      }
    }
    checkConnection();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [token, reportTelegramError]);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const fail = () => { if (!controller.signal.aborted) setMetadataError(true); };
    api.listCurrencies(options).then(setCurrencies).catch(fail);
    api.listSkills(options).then(setSkills).catch(fail);
    api.syncStatus(options).then(({ last_success_at }) => setLastSync(last_success_at)).catch(() => {
      if (!controller.signal.aborted) setLastSync(null);
    });
    return () => controller.abort();
  }, []);

  const loadFilters = useCallback(async (signal) => {
    if (!user) return;
    try {
      const items = await api.listFilters(user.id, token, signal);
      if (!signal?.aborted) setFilters(items);
    } catch (error) {
      if (!signal?.aborted) reportTelegramError(error);
    }
  }, [user, token, reportTelegramError]);

  useEffect(() => {
    const controller = new AbortController();
    loadFilters(controller.signal);
    return () => controller.abort();
  }, [loadFilters]);

  const loadJobs = useCallback(async (offset, signal) => {
    const append = offset > 0;
    if (append) setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE + 1, offset, q: query, sort });
      if (currency) params.set("currency", currency);
      if (criteria.status) params.set("status", criteria.status);
      if (criteria.skill) params.set("skill_id", criteria.skill);
      if (criteria.period) params.set("posted_since", new Date(Date.now() - Number(criteria.period) * DAY).toISOString());
      const budget = Number(criteria.budget);
      if (currency && criteria.budget && budget >= 0 && budget <= 9_999_999_999.99) params.set("min_budget", criteria.budget);
      if (favoriteIds) {
        for (const id of favoriteIds.split(",")) params.append("ids", id);
      }
      const page = favoriteIds === "" ? [] : await api.listJobs(params, { signal });
      if (signal.aborted) return;
      const items = page.slice(0, PAGE_SIZE);
      setJobs((prev) => (append ? [...prev, ...items] : items));
      setHasMore(page.length > PAGE_SIZE);
    } catch (e) {
      if (!signal.aborted) setError(e.message);
    } finally {
      if (!signal.aborted) {
        append ? setLoadingMore(false) : setLoading(false);
      }
    }
  }, [criteria, currency, favoriteIds, query, sort]);

  useEffect(() => {
    const controller = new AbortController();
    jobsRequest.current = controller;
    setLoading(true);
    setLoadingMore(false);
    setJobs([]);
    setHasMore(false);
    const timer = setTimeout(() => loadJobs(0, controller.signal), 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadJobs]);

  async function handleConnect() {
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      const link = await api.connectTelegram();
      setToken(link.token);
      setTelegramUrl(link.url);
    } catch (error) {
      reportTelegramError(error);
    } finally {
      setTelegramBusy(false);
    }
  }

  async function handleLogout() {
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      await api.logout(token);
      clearTelegram();
    } catch (error) {
      reportTelegramError(error);
    } finally {
      setTelegramBusy(false);
    }
  }

  async function handleAddFilter(filter) {
    try {
      const item = await api.addFilter(user.id, token, filter);
      setFilters((items) => [...items, item]);
    } catch (error) {
      reportTelegramError(error);
      return false;
    }
    return true;
  }

  async function handleDeleteFilter(filterId) {
    try {
      await api.deleteFilter(user.id, token, filterId);
      setFilters((items) => items.filter((item) => item.id !== filterId));
    } catch (error) {
      reportTelegramError(error);
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

  function changeTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* Theme still works for this visit. */ }
    setTheme(next);
  }

  function resetFilters(nextSection = section) {
    setSearch("");
    setSort("newest");
    setCurrency("");
    setCriteria(nextSection === "favorites" ? FAVORITE_CRITERIA : JOB_CRITERIA);
  }

  function changeSection(nextSection) {
    if (nextSection === section) return;
    resetFilters(nextSection);
    setSection(nextSection);
  }

  function changeCurrency(value) {
    setCurrency(value);
    setCriteria((current) => ({ ...current, budget: "" }));
    if (!value) setSort("newest");
  }

  return (
    <div className="app-layout">
      <Sidebar
        active={section}
        onChange={changeSection}
        jobsCount={section === "jobs" ? jobs.length : undefined}
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
                {section === "jobs" && lastSync !== undefined && (
                  <p className="sync-time">{lastSync ? `Последнее обновление · ${dateLabel(lastSync)}` : "Время последнего обновления неизвестно"}</p>
                )}
              </div>
              <div className="header-actions">
                <button type="button" className="secondary theme-toggle" onClick={changeTheme}>{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</button>
                <UserBadge chatId={user?.telegram_chat_id} onClick={() => changeSection("filters")} />
              </div>
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
                currency={currency}
                currencies={currencies}
                onCurrencyChange={changeCurrency}
                criteria={criteria}
                onCriteriaChange={(key, value) => setCriteria((current) => ({ ...current, [key]: value }))}
                skills={skills}
                onReset={() => resetFilters()}
                count={jobs.length}
                todayCount={section === "jobs" ? todayCount : 0}
              />
              {metadataError && <p role="status">Часть фильтров не загрузилась. Обновите страницу, чтобы повторить.</p>}
              {loading ? (
                <div className="empty" role="status">Загрузка…</div>
              ) : (
                <JobList jobs={jobs} favorites={favorites} onToggleFavorite={toggleFavorite}
                  emptyText={error ? "Заказы недоступны. Обновите страницу, чтобы повторить." : favoriteIds === "" ? "Здесь появятся заказы, которые вы отметите звёздочкой." : "Ничего не найдено."} />
              )}

              {!loading && hasMore && (
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button className="secondary" onClick={() => loadJobs(jobs.length, jobsRequest.current.signal)} disabled={loadingMore}>
                    {loadingMore ? "Загрузка…" : "Показать ещё"}
                  </button>
                </div>
              )}
            </>
          )}

          {section === "filters" && (
            <>
              {telegramError && <div className="error" role="alert">{telegramError}</div>}
              {user ? (
                <>
                  <div className="card filter-row">
                    <span role="status">Telegram подключён</span>
                    <button className="secondary" type="button" onClick={handleLogout} disabled={telegramBusy}>Выйти</button>
                  </div>
                  <FilterForm filters={filters} onAdd={handleAddFilter} onDelete={handleDeleteFilter} />
                </>
              ) : telegramUrl ? (
                <div className="card">
                  <a className="job-link" href={telegramUrl} target="_blank" rel="noreferrer">Открыть бота в Telegram</a>
                  <p role="status">Нажмите «Запустить» в боте и вернитесь сюда. Ссылка действует 10 минут.</p>
                </div>
              ) : token ? (
                <p role="status">Проверяем подключение Telegram…</p>
              ) : (
                <button type="button" onClick={handleConnect} disabled={telegramBusy}>
                  {telegramBusy ? "Готовим ссылку…" : "Подключить Telegram"}
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
