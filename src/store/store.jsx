import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { CONVERSATIONS, PEOPLE_BY_ID, ME_ID } from '../data/demo';

const StoreCtx = createContext(null);

function useLocal(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  }, [key, val]);
  return [val, setVal];
}

let toastSeq = 0;

export function StoreProvider({ children }) {
  // theme
  const [theme, setTheme] = useLocal('strings.theme', 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), [setTheme]);

  // demo auth: null = logged out, otherwise a profile id
  const [userId, setUserId] = useLocal('strings.userId', null);
  const user = userId ? PEOPLE_BY_ID[userId] : null;
  const login = useCallback((id = ME_ID) => setUserId(id), [setUserId]);
  const logout = useCallback(() => setUserId(null), [setUserId]);

  // onboarding profile draft
  const [draft, setDraft] = useLocal('strings.draft', null);

  // interactions
  const [likes, setLikes] = useLocal('strings.likes', {});
  const [userPosts, setUserPosts] = useLocal('strings.userPosts', []);
  const [userOpps, setUserOpps] = useLocal('strings.userOpps', []);
  const [bookmarks, setBookmarks] = useLocal('strings.bookmarks', []); // [{kind:'opp'|'article'|'media'|'post', id}]
  const [applied, setApplied] = useLocal('strings.applied', []);
  const [connected, setConnected] = useLocal('strings.connected', ['rohan', 'anjali']);
  const [joined, setJoined] = useLocal('strings.joined', ['guitarists']);
  const [wallExtra, setWallExtra] = useLocal('strings.wallExtra', {});
  const [extraMsgs, setExtraMsgs] = useLocal('strings.extraMsgs', {}); // {convoId:[{me,text}]}
  const [readNotifs, setReadNotifs] = useLocal('strings.readNotifs', []);
  const [settings, setSettings] = useLocal('strings.settings', {
    visibility: 'public',
    notifFollowers: true, notifMessages: true, notifMatches: true, notifDigest: false,
  });

  // bookings: {id, personId, personName, dateISO, slot, budget, message, status, createdAt}
  const [bookings, setBookings] = useLocal('strings.bookings', []);
  const addBooking = useCallback((b) => {
    const entry = { ...b, id: `b${Date.now()}`, createdAt: new Date().toISOString() };
    setBookings((x) => [entry, ...x]);
    return entry;
  }, [setBookings]);
  const cancelBooking = useCallback((id) => {
    setBookings((x) => x.filter((b) => b.id !== id));
  }, [setBookings]);

  // user-generated notifications (prepended to the seeded list)
  const [extraNotifs, setExtraNotifs] = useLocal('strings.extraNotifs', []);
  const pushNotif = useCallback((n) => {
    const entry = { id: `xn${Date.now()}`, time: 'Just now', kind: 'opportunity', link: '/home', ...n };
    setExtraNotifs((x) => [entry, ...x]);
  }, [setExtraNotifs]);

  // toasts
  const [toasts, setToasts] = useState([]);
  const pushToast = useCallback((text, kind = 'success') => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const toggleLike = useCallback((postId) => {
    setLikes((l) => ({ ...l, [postId]: !l[postId] }));
  }, [setLikes]);

  const isBookmarked = useCallback((kind, id) => bookmarks.some((b) => b.kind === kind && b.id === id), [bookmarks]);
  const toggleBookmark = useCallback((kind, id, label) => {
    setBookmarks((b) => {
      const exists = b.some((x) => x.kind === kind && x.id === id);
      return exists ? b.filter((x) => !(x.kind === kind && x.id === id)) : [...b, { kind, id }];
    });
    return !isBookmarked(kind, id);
  }, [setBookmarks, isBookmarked]);

  const conversations = useMemo(() => CONVERSATIONS.map((c) => ({
    ...c,
    thread: [...c.thread, ...(extraMsgs[c.id] || [])],
    unread: c.unread && !(extraMsgs[c.id] || []).length && !readNotifs.includes('msg-' + c.id),
  })), [extraMsgs, readNotifs]);

  const sendMessage = useCallback((convoId, text) => {
    setExtraMsgs((m) => ({ ...m, [convoId]: [...(m[convoId] || []), { me: true, text }] }));
  }, [setExtraMsgs]);

  const value = useMemo(() => ({
    theme, toggleTheme, user, userId, login, logout, draft, setDraft,
    likes, toggleLike, userPosts, setUserPosts, userOpps, setUserOpps,
    bookmarks, toggleBookmark, isBookmarked, applied, setApplied,
    connected, setConnected, joined, setJoined, wallExtra, setWallExtra,
    conversations, sendMessage, readNotifs, setReadNotifs,
    settings, setSettings, toasts, pushToast,
    bookings, addBooking, cancelBooking, extraNotifs, pushNotif,
  }), [theme, toggleTheme, user, userId, login, logout, draft, setDraft,
    likes, toggleLike, userPosts, setUserPosts, userOpps, setUserOpps,
    bookmarks, toggleBookmark, isBookmarked, applied, setApplied,
    connected, setConnected, joined, setJoined, wallExtra, setWallExtra,
    conversations, sendMessage, readNotifs, setReadNotifs,
    settings, setSettings, toasts, pushToast,
    bookings, addBooking, cancelBooking, extraNotifs, pushNotif]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
