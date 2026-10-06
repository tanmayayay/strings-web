import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profiles, onUnauthorized } from '../lib/api';

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
  // ---- theme (local preference) ----
  const [theme, setTheme] = useLocal('strings.theme', 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), [setTheme]);

  // ---- real auth via Supabase ----
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null); // Prisma user row from the API
  const [profileLoading, setProfileLoading] = useState(false);
  // Which auth user the current `profile` was fetched for. Until it matches the
  // live session, the profile is still "loading" — this stops route guards from
  // bouncing deep links (e.g. a reload on /#/news) to the landing page.
  const [profileFor, setProfileFor] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    setSession(null);
    setProfile(null);
  }, []);

  // Any 401 from the API means the session is dead — sign out globally.
  useEffect(() => {
    onUnauthorized(() => { signOut(); });
  }, [signOut]);

  // Load (or auto-provision) the caller's Prisma profile whenever the session
  // changes. The backend creates the row on first sight via User.authId.
  const refreshProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      return null;
    }
    setProfileLoading(true);
    try {
      const p = await Profiles.me();
      setProfile(p);
      return p;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
      setProfileFor(session.user?.id ?? null);
    }
  }, [session]);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  // The app's "user" is the Prisma profile (id, name, stakeholderType, ...).
  const user = profile;
  const profilePending = Boolean(session) && (profileLoading || profileFor !== (session?.user?.id ?? null));
  const userId = profile?.id ?? null;
  const authUser = session?.user ?? null;

  // ---- onboarding draft (local, pre-profile) ----
  const [draft, setDraft] = useLocal('strings.draft', null);

  // ---- bookmarks (local preference) ----
  const [bookmarks, setBookmarks] = useLocal('strings.bookmarks', []); // [{kind:'opp'|'article'|'media'|'post', id}]
  const isBookmarked = useCallback((kind, id) => bookmarks.some((b) => b.kind === kind && b.id === id), [bookmarks]);
  // Returns true when the item is now saved, false when it was removed.
  // `data` (optional) snapshots items that don't live in our database —
  // e.g. live news headlines — so the Saved page can render them later.
  const toggleBookmark = useCallback((kind, id, data) => {
    const exists = bookmarks.some((x) => x.kind === kind && x.id === id);
    setBookmarks((b) => (exists
      ? b.filter((x) => !(x.kind === kind && x.id === id))
      : [...b, data ? { kind, id, data } : { kind, id }]));
    return !exists;
  }, [bookmarks, setBookmarks]);

  // ---- community groups (local for v1 — no backend model yet) ----
  const [joined, setJoined] = useLocal('strings.joined', ['guitarists']);
  const [wallExtra, setWallExtra] = useLocal('strings.wallExtra', {});

  // ---- settings (local preferences) ----
  const [settings, setSettings] = useLocal('strings.settings', {
    visibility: 'public',
    notifFollowers: true, notifMessages: true, notifMatches: true, notifDigest: false,
  });

  // ---- toasts ----
  const [toasts, setToasts] = useState([]);
  const pushToast = useCallback((text, kind = 'success') => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const value = useMemo(() => ({
    theme, toggleTheme,
    // auth
    session, authUser, authLoading, profile, profileLoading: profilePending, refreshProfile,
    user, userId, signIn, signUp, signOut,
    logout: signOut, // alias used by older components
    // local state
    draft, setDraft,
    bookmarks, toggleBookmark, isBookmarked,
    joined, setJoined, wallExtra, setWallExtra,
    settings, setSettings,
    toasts, pushToast,
    isSupabaseConfigured,
  }), [
    theme, toggleTheme,
    session, authUser, authLoading, profile, profilePending, refreshProfile,
    user, userId, signIn, signUp, signOut,
    draft, setDraft,
    bookmarks, toggleBookmark, isBookmarked,
    joined, setJoined, wallExtra, setWallExtra,
    settings, setSettings,
    toasts, pushToast,
  ]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
