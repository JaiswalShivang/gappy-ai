/**
 * lib/api.js — Centralized API client
 *
 * All backend endpoints in one place.
 * Every function accepts a JWT `token` as its first argument.
 *
 * Base URL: Vite proxies /api → http://localhost:8000
 *           Vite proxies /uploads → http://localhost:8000 (audio proofs)
 */

const BASE = "/api";

// ─── Low-level fetch wrapper ──────────────────────────────────────────────────
function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login(email, password) {
    return request("/auth/login", null, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },
  register(email, password, name) {
    return request("/auth/register", null, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
  },
};

// ─── Meetings ─────────────────────────────────────────────────────────────────
export const meetingsApi = {
  list(token) {
    return request("/meetings", token);
  },
  get(token, id) {
    return request(`/meetings/${id}`, token);
  },
  uploadAudio(token, file, title = "Untitled Meeting") {
    const fd = new FormData();
    fd.append("audio", file);
    fd.append("title", title);
    return request("/meetings/upload", token, { method: "POST", body: fd });
  },
  processTranscript(token, transcript, title = "Untitled Meeting") {
    return request("/meetings/process", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, title }),
    });
  },
};

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list(token, meetingId = null) {
    const qs = meetingId ? `?meetingId=${meetingId}` : "";
    return request(`/tasks${qs}`, token);
  },
  update(token, taskId, fields) {
    return request(`/tasks/${taskId}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  },
};

// ─── Semantic Search ──────────────────────────────────────────────────────────
export const searchApi = {
  /**
   * POST semantic search query — returns { query, results: Task[], count }
   * results are ranked by vector similarity (searchScore field included).
   */
  query(token, q, limit = 5) {
    const qs = new URLSearchParams({ q, limit: String(limit) }).toString();
    return request(`/search?${qs}`, token);
  },
};
