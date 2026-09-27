const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listJobs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/jobs${qs ? `?${qs}` : ""}`);
  },
  createUser: (telegramChatId) =>
    request("/users", {
      method: "POST",
      body: JSON.stringify({ telegram_chat_id: telegramChatId }),
    }),
  listFilters: (userId) => request(`/users/${userId}/filters`),
  addFilter: (userId, filter) =>
    request(`/users/${userId}/filters`, {
      method: "POST",
      body: JSON.stringify(filter),
    }),
  deleteFilter: (userId, filterId) =>
    request(`/users/${userId}/filters/${filterId}`, { method: "DELETE" }),
};
