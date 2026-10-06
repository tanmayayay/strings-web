import { useCallback, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StoreProvider, useStore } from './store/store';
import Shell from './components/Shell';
import CommandPalette from './components/CommandPalette';
import { Toasts } from './components/widgets';
import { PostModal, OppModal } from './components/ComposerModals';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Epk from './pages/Epk';
import Home from './pages/Home';
import Gighub from './pages/Gighub';
import Collab from './pages/Collab';
import Community from './pages/Community';
import News from './pages/News';
import NewsArticle from './pages/NewsArticle';
import Messages from './pages/Messages';
import Live from './pages/Live';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import About from './pages/About';
import Support from './pages/Support';
import Saved from './pages/Saved';
import EmailVerified from './pages/EmailVerified';

/* Supabase email-confirmation links redirect to the Site URL with the
   session tokens in the URL fragment:
     #access_token=…&refresh_token=…&type=signup
   (or #error=… when the link is expired/invalid).
   Catch that here BEFORE HashRouter mounts — HashRouter would read
   `#access_token=…` as a route path and bounce to "/". */
function getEmailCallback() {
  const hash = window.location.hash || '';
  if (!hash || hash.startsWith('#/')) return null; // ordinary in-app route
  const params = new URLSearchParams(hash.slice(1));
  if (params.get('error')) {
    return { status: 'error', message: params.get('error_description') || 'This link is invalid or has expired.' };
  }
  const type = params.get('type') || '';
  // Only confirmation-style links get the thank-you page; a recovery link
  // has no reset-password UI to hand off to, so let the router handle it.
  if (params.get('access_token') && ['signup', 'email_change', 'magiclink', 'invite'].includes(type)) {
    return { status: 'ok', type };
  }
  return null;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/* Subtle page transition on every route change */
function RouteTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function RequireAuth({ children }) {
  const { user, session, authLoading, profileLoading } = useStore();
  // Wait for the backend profile when a session exists — otherwise a fresh
  // sign-in bounces to "/" before refreshProfile() finishes.
  if (authLoading || (session && profileLoading)) return <div className="auth-boot"><span className="spinner" /></div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function LandingGate() {
  const { user, session, authLoading, profileLoading } = useStore();
  if (authLoading || (session && profileLoading)) return <div className="auth-boot"><span className="spinner" /></div>;
  if (user) return <Navigate to="/home" replace />;
  return <Landing />;
}

function AppShell() {
  const [palette, setPalette] = useState(false);
  const [modal, setModal] = useState(null); // { type: 'post' | 'opp', photo?, prefill? } | null
  // Called from buttons (receives a click event) or with options.
  const openPost = useCallback((o) => setModal({
    type: 'post',
    photo: o?.photo === true,
    prefill: typeof o?.prefill === 'string' ? o.prefill : '',
  }), []);
  const openOpp = useCallback(() => setModal({ type: 'opp' }), []);
  const openPalette = useCallback(() => setPalette(true), []);

  // ⌘K / Ctrl+K toggles the command palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <ScrollTop />
      <RouteTransition>
      <Routes>
        <Route path="/" element={<LandingGate />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/epk/:id" element={<Epk />} />
        <Route
          element={
            <RequireAuth>
              <Shell
                onOpenPalette={openPalette}
                onNewPost={openPost}
                onNewOpp={openOpp}
              />
            </RequireAuth>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/gighub" element={<Gighub />} />
          <Route path="/collab" element={<Collab />} />
          <Route path="/community" element={<Community />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsArticle />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/live" element={<Live />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/search" element={<Search />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/support" element={<Support />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </RouteTransition>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      {modal?.type === 'post' && <PostModal startWithPhoto={modal.photo} prefill={modal.prefill} onClose={() => setModal(null)} />}
      {modal?.type === 'opp' && <OppModal onClose={() => setModal(null)} />}
      <Toasts />
    </>
  );
}

export default function App() {
  const [emailCallback, setEmailCallback] = useState(() => getEmailCallback());

  const dismissEmailCallback = useCallback(() => {
    // Drop the token fragment, then hand control to the router.
    // The session is already persisted by supabase-js, so the user lands
    // signed in (fresh signups flow into onboarding via LandingGate).
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/`);
    setEmailCallback(null);
  }, []);

  if (emailCallback) {
    return <EmailVerified result={emailCallback} onDone={dismissEmailCallback} />;
  }

  return (
    <HashRouter>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </HashRouter>
  );
}
