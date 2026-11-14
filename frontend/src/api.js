const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    let message = `${res.status} ${res.statusText}`;
    try {
      const { detail } = JSON.parse(body);
      if (typeof detail === "string") message = detail;
    } catch {
      // Some hosting errors return HTML instead of an API error.
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

function authorized(token, options = {}) {
  return {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  };
}

export const api = {
  listJobs: (params = {}, options) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/jobs${qs ? `?${qs}` : ""}`, options);
  },
  listCurrencies: (options) => request("/jobs/currencies", options),
  listSkills: (options) => request("/jobs/skills", options),
  syncStatus: (options) => request("/jobs/sync-status", options),
  connectTelegram: () => request("/users/telegram/connect", { method: "POST" }),
  telegramSession: (token, signal) => request("/users/telegram/session", authorized(token, { signal })),
  logout: (token) => request("/users/telegram/session", authorized(token, { method: "DELETE" })),
  listFilters: (userId, token, signal) => request(`/users/${userId}/filters`, authorized(token, { signal })),
  addFilter: (userId, token, filter) =>
    request(`/users/${userId}/filters`, authorized(token, {
      method: "POST",
      body: JSON.stringify(filter),
    })),
  deleteFilter: (userId, token, filterId) =>
    request(`/users/${userId}/filters/${filterId}`, authorized(token, { method: "DELETE" })),
};
