import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Strings API client — every request to the Express backend goes through here.
// Authenticated requests carry `Authorization: Bearer <supabase access token>`;
// the token is read from the live Supabase session (auto-refreshed).
// ---------------------------------------------------------------------------

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

export function apiBaseUrl() {
  return API_BASE;
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Called on 401s — the store wires this to sign the user out. */
let unauthorizedHandler = null;
export function onUnauthorized(fn) {
  unauthorizedHandler = fn;
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getAccessToken();
    if (!token) {
      throw Object.assign(new ApiError('Not signed in.', 401, null), { code: 'NO_SESSION' });
    }
    headers.Authorization = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(`Cannot reach the Strings API at ${API_BASE}. Is the backend running?`, 0, null);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler) {
      try {
        unauthorizedHandler();
      } catch {
        /* ignore */
      }
    }
    throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

function qs(params = {}) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : '';
}

// ---------------------------------------------------------------------------
// Resource helpers — the contract page components use.
// Shapes mirror the backend responses: { items, total, take, skip } for lists.
// ---------------------------------------------------------------------------

export const Profiles = {
  list: (params = {}) => api(`/api/profiles${qs(params)}`, { auth: false }),
  get: (id) => api(`/api/profiles/${id}`, { auth: false }),
  /** The caller's own profile — auto-provisioned on first sight. */
  me: () => api('/api/profiles/me'),
  create: (data) => api('/api/profiles', { method: 'POST', body: data }),
  update: (id, data) => api(`/api/profiles/${id}`, { method: 'PATCH', body: data }),
  follow: (id) => api(`/api/profiles/${id}/follow`, { method: 'POST' }),
  unfollow: (id) => api(`/api/profiles/${id}/follow`, { method: 'DELETE' }),
  /** People the caller follows — for the Messages "new conversation" picker. */
  following: () => api('/api/profiles/me/following'),
};

export const Posts = {
  list: (params = {}) => api(`/api/posts${qs(params)}`, { auth: false }),
  get: (id) => api(`/api/posts/${id}`, { auth: false }),
  create: ({ body, mediaUrl }) => api('/api/posts', { method: 'POST', body: { body, mediaUrl } }),
  like: (id) => api(`/api/posts/${id}/like`, { method: 'POST' }),
  unlike: (id) => api(`/api/posts/${id}/like`, { method: 'DELETE' }),
  comments: (id, params = {}) => api(`/api/posts/${id}/comments${qs(params)}`, { auth: false }),
  comment: (id, body) => api(`/api/posts/${id}/comments`, { method: 'POST', body: { body } }),
};

export const Stories = {
  list: () => api('/api/stories', { auth: false }),
  create: ({ mediaUrl, caption }) => api('/api/stories', { method: 'POST', body: { mediaUrl, caption } }),
  remove: (id) => api(`/api/stories/${id}`, { method: 'DELETE' }),
};

export const Opps = {
  list: (params = {}) => api(`/api/opportunities${qs(params)}`, { auth: false }),
  get: (id) => api(`/api/opportunities/${id}`, { auth: false }),
  create: (data) => api('/api/opportunities', { method: 'POST', body: data }),
  apply: (id, message, intent) => api(`/api/opportunities/${id}/apply`, { method: 'POST', body: { message, intent } }),
  applications: (id, params = {}) => api(`/api/opportunities/${id}/applications${qs(params)}`),
  setApplicationStatus: (appId, status) =>
    api(`/api/opportunities/applications/${appId}`, { method: 'PATCH', body: { status } }),
};

export const Bookings = {
  list: (params = {}) => api(`/api/bookings${qs(params)}`),
  create: (data) => api('/api/bookings', { method: 'POST', body: data }),
  setStatus: (id, status) => api(`/api/bookings/${id}`, { method: 'PATCH', body: { status } }),
};

export const Convos = {
  list: () => api('/api/conversations'),
  /** Find-or-create a 1:1 conversation with another user. Returns { id, created }. */
  open: (userId) => api('/api/conversations', { method: 'POST', body: { userId } }),
  messages: (id, params = {}) => api(`/api/conversations/${id}/messages${qs(params)}`),
  send: (id, body) => api(`/api/conversations/${id}/messages`, { method: 'POST', body: { body } }),
};

export const Notifs = {
  list: (params = {}) => api(`/api/notifications${qs(params)}`),
  markRead: (ids) => api('/api/notifications/read', { method: 'POST', body: ids ? { ids } : {} }),
};

export const Directory = {
  venues: (params = {}) => api(`/api/venues${qs(params)}`, { auth: false }),
  events: (params = {}) => api(`/api/events${qs(params)}`, { auth: false }),
  articles: (params = {}) => api(`/api/articles${qs(params)}`, { auth: false }),
  article: (id) => api(`/api/articles/${id}`, { auth: false }),
};

/* ---------- user-testing batch (2026-09-29) ---------- */

export const Tracks = {
  list: (params = {}) => api(`/api/tracks${qs(params)}`),
  get: (id) => api(`/api/tracks/${id}`),
  create: (data) => api('/api/tracks', { method: 'POST', body: data }),
  remove: (id) => api(`/api/tracks/${id}`, { method: 'DELETE' }),
  /** Star/unstar a track. Returns { liked }. */
  toggleLike: (id) => api(`/api/tracks/${id}/like`, { method: 'POST' }),
};

export const Groups = {
  list: (params = {}) => api(`/api/groups${qs(params)}`),
  create: (data) => api('/api/groups', { method: 'POST', body: data }),
  get: (id) => api(`/api/groups/${id}`),
  join: (id) => api(`/api/groups/${id}/join`, { method: 'POST' }),
  leave: (id) => api(`/api/groups/${id}/leave`, { method: 'POST' }),
  messages: (id, params = {}) => api(`/api/groups/${id}/messages${qs(params)}`),
  send: (id, body) => api(`/api/groups/${id}/messages`, { method: 'POST', body: { body } }),
  setRole: (id, userId, role) => api(`/api/groups/${id}/members/${userId}`, { method: 'PATCH', body: { role } }),
  removeMember: (id, userId) => api(`/api/groups/${id}/members/${userId}`, { method: 'DELETE' }),
};

export const NewsLive = {
  get: () => api('/api/news/live', { auth: false }),
};
