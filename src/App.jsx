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
  const [modal, setModal] = useState(null); // 'post' | 'opp' | null
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
                onNewPost={() => setModal('post')}
                onNewOpp={() => setModal('opp')}
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
      {modal === 'post' && <PostModal onClose={() => setModal(null)} />}
      {modal === 'opp' && <OppModal onClose={() => setModal(null)} />}
      <Toasts />
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </HashRouter>
  );
}
