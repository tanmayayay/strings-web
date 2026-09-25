import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Network, Handshake, Newspaper, Mic, Building2, Briefcase, SlidersHorizontal,
  GraduationCap, ChevronDown, ArrowRight, ChevronLeft, ChevronRight,
  BadgeCheck, Check, Sparkles, Zap, Play, Users, MapPin,
} from 'lucide-react';
import { useStore } from '../store/store';
import { Logo } from '../components/ui';
import AuthModal from '../components/AuthModal';
import { STAKEHOLDER_GROUPS, PEOPLE, CITIES, initials, avatarColor } from '../data/demo';
import '../landing.css';

/* ---------- count-up on scroll into view ---------- */
function useCountUp(target, start, duration = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return val;
}

/* ---------- deterministic pseudo-random for mock data ---------- */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ============================================================
   NAV
   ============================================================ */
function Nav({ onJoin, onDemo }) {
  const { user } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={`lnav${scrolled ? ' scrolled' : ''}`}>
      <div className="lnav-in">
        <Link to="/" aria-label="Strings home"><Logo light /></Link>
        <div className="lnav-links">
          <a href="#product">Product</a>
          <a href="#who">Who it&rsquo;s for</a>
          <a href="#stories">Stories</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="lnav-actions">
          {user ? (
            <button className="lbtn lbtn-grad" onClick={onDemo}>Open app <ArrowRight size={16} /></button>
          ) : (
            <>
              <button className="lbtn lbtn-ghost" onClick={() => setAuthOpen(true)}>Log in</button>
              <button className="lbtn lbtn-grad" onClick={onJoin}>Join Strings</button>
            </>
          )}
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </nav>
  );
}

/* ============================================================
   HERO + product visual
   ============================================================ */
const WAVE_BARS = [18, 30, 22, 38, 26, 40, 32, 24, 36, 28, 42, 30, 20, 34, 26, 40, 32, 22, 36, 28, 38, 24, 30, 36, 26, 32];

function MatchCardVisual() {
  const rows = [
    { p: PEOPLE[0], pct: 94 },
    { p: PEOPLE[1], pct: 91 },
    { p: PEOPLE[2], pct: 88 },
  ];
  return (
    <div className="lvisual">
      <div className="lfloat">
        <div className="lcard">
          <div className="lcard-glow" />
          <div className="lcard-head">
            <span className="live"><i />Live matching</span>
            <Sparkles size={18} color="#8FB6FF" />
          </div>
          <div className="lcard-match">
            <div className="lring">
              <svg width="104" height="104" viewBox="0 0 104 104">
                <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(148,178,255,.15)" strokeWidth="10" />
                <circle cx="52" cy="52" r="46" fill="none" stroke="url(#ringGrad)" strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={2 * Math.PI * 46} strokeDashoffset={2 * Math.PI * 46 * 0.06} />
                <defs>
                  <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2A63EE" /><stop offset="100%" stopColor="#22D3EE" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="num"><b>94%</b><span>match</span></div>
            </div>
            <div className="who">
              <h4>Meera Iyer</h4>
              <p>Vocalist · Mumbai</p>
              <span className="lpill"><BadgeCheck size={13} /> Verified profile</span>
            </div>
          </div>
          <div className="lrows">
            {rows.map(({ p, pct }) => (
              <div className="lrow" key={p.id}>
                <div className="av" style={{ background: p.heroGradient || avatarColor(p.name) }}>{initials(p.name)}</div>
                <div className="tx"><b>{p.name}</b><span>{p.role} · {p.city}</span></div>
                <div className="pct">{pct}%</div>
              </div>
            ))}
          </div>
          <div className="lwave">
            {WAVE_BARS.map((h, i) => (
              <i key={i} style={{ height: `${h}px`, animationDelay: `${(i % 9) * 0.14}s` }} />
            ))}
          </div>
        </div>
        <div className="lchip lchip-a"><Zap size={15} color="#22D3EE" /> 12 new matches today</div>
        <div className="lchip lchip-b"><MapPin size={15} color="#A78BFA" /> Gig alert · Delhi-NCR</div>
      </div>
    </div>
  );
}

function Hero({ onJoin, onDemo }) {
  const { user } = useStore();
  return (
    <header className="lhero">
      <div className="lmesh" />
      <div className="grain" />
      <div className="lwrap lhero-grid">
        <motion.div
          initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <span className="leyebrow"><span className="dot" />Phase 1 · Built for India&rsquo;s music industry</span>
          <h1>The music industry,<br />finally on <span className="grad">first-name terms.</span></h1>
          <p className="lsub">
            Strings ties the industry together — performers, venues, buyers, crew and institutions —
            in one network where gigs find people, not the other way around. Verified profiles,
            AI match scores, and a live collab board across 8 Indian cities.
          </p>
          <div className="lctas">
            {user ? (
              <button className="lbtn lbtn-grad lbtn-lg" onClick={onDemo}>Open app <ArrowRight size={18} /></button>
            ) : (
              <button className="lbtn lbtn-grad lbtn-lg" onClick={onJoin}>Create your profile <ArrowRight size={18} /></button>
            )}
            <button className="lbtn lbtn-outline lbtn-lg" onClick={onDemo}><Play size={17} /> See it in action</button>
          </div>
          <div className="lhero-note"><Users size={15} /> Free during Phase 1 · No spam, no group-chat chaos</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <MatchCardVisual />
        </motion.div>
      </div>
    </header>
  );
}

/* ============================================================
   TICKER
   ============================================================ */
const TICKER_ITEMS = [
  'Meera Iyer', 'Playback', 'Mumbai', 'Rohan Verma', 'Live sound', 'Delhi-NCR',
  'Anjali Kulkarni', 'Carnatic-jazz', 'Bengaluru', 'Depot 48', 'Hip-hop', 'Pune',
  'Sana Reddy', 'Fusion', 'Hyderabad', 'Aditya Rao', 'EDM', 'Chennai',
  'Kavya Sharma', 'Wedding season', 'Kolkata', 'Vikram Nair', 'Indie', 'Chandigarh',
];
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="lticker" aria-hidden="true">
      <div className="lticker-track">
        {items.map((t, i) => (
          <span className="lticker-item" key={i}>{t}<span className="sep">•</span></span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   STATS
   ============================================================ */
function Stat({ value, suffix, label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const n = useCountUp(value, inView);
  return (
    <div className="lstat" ref={ref}>
      <b>{n.toLocaleString('en-IN')}{suffix}</b>
      <span>{label}</span>
    </div>
  );
}
function Stats() {
  return (
    <section className="lstats">
      <div className="lwrap">
        <div className="lstats-grid">
          <Stat value={2400} suffix="+" label="Artists & crew onboard" />
          <Stat value={120} suffix="+" label="Venues & spaces" />
          <Stat value={8} suffix="" label="Cities live" />
          <Stat value={10} suffix="k+" label="Gigs matched" />
        </div>
        <p className="lstats-caveat">Illustrative early-traction targets — this is demo data, not verified metrics.</p>
      </div>
    </section>
  );
}

/* ============================================================
   THREE LAYERS
   ============================================================ */
const LAYERS = [
  {
    icon: Network, title: 'Network', copy: 'One verified identity for the whole industry. Rich profiles with skills, past gigs, response rates and endorsements — so trust travels before you do.',
    points: ['Verified profiles & ID checks', 'Skill endorsements that matter', 'Follow the people you rate'],
  },
  {
    icon: Handshake, title: 'Discovery & collab', copy: 'A live board of gigs, sessions and crew call-outs with AI match scores. Post a brief, get matched, shortlist — without the WhatsApp scramble.',
    points: ['Match scores on every brief', 'Structured gigs & call-outs', 'Direct, spam-free outreach'],
  },
  {
    icon: Newspaper, title: 'Newsroom', copy: "The industry's pulse in one feed — releases, festival economics, licensing explainers and backstage debate, curated for people who work in music.",
    points: ['Daily industry briefing', 'Curated releases & trends', 'Backstage community threads'],
  },
];
function Layers() {
  return (
    <section className="lsec" id="product">
      <div className="lwrap">
        <div className="lsec-head">
          <span className="lkicker">The product</span>
          <h2>Three layers. One industry.</h2>
          <p>Strings isn&rsquo;t another social app — it&rsquo;s the working infrastructure of Indian music, built layer by layer.</p>
        </div>
        <div className="llayers">
          {LAYERS.map((l, i) => (
            <motion.div
              key={l.title} className="llayer"
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, delay: i * 0.12 }}
            >
              <div className="llayer-in">
                <div className="lico"><l.icon size={26} /></div>
                <h3>{l.title}</h3>
                <p>{l.copy}</p>
                <ul>
                  {l.points.map((p) => <li key={p}><Check size={15} />{p}</li>)}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   MATCH WIDGET (showpiece)
   ============================================================ */
const ROLE_OPTIONS = ['Performer', 'Venue', 'Crew', 'Buyer', 'Institution'];
const ROLE_COPY = {
  Performer: 'artists & instrumentalists', Venue: 'venues & spaces', Crew: 'sound, light & stage crew',
  Buyer: 'organisers, festivals & brands', Institution: 'schools, societies & agencies',
};
function MatchWidget() {
  const [role, setRole] = useState('Performer');
  const [city, setCity] = useState('Mumbai');
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const calculate = () => {
    const seed = `${role}|${city}`;
    const score = Math.min(98, 72 + (hashStr(seed) % 27));
    const factors = [
      { label: 'Role fit', value: Math.min(99, 70 + (hashStr(`role${role}`) % 30)) },
      { label: 'City demand', value: Math.min(99, 65 + (hashStr(`city${city}`) % 35)) },
      { label: 'Network effect', value: Math.min(99, 58 + (hashStr(`net${seed}`) % 42)) },
    ];
    setResult({ score, factors, role, city, key: Date.now() });
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  };

  const animatedScore = useCountUp(result ? result.score : 0, !!result, 1400);

  return (
    <section className="lsec">
      <div className="lwrap">
        <div className="lmatch">
          <div className="lmatch-grid">
            <div className="lmatch-copy">
              <span className="lkicker">Interactive demo</span>
              <h2>See your match score, live.</h2>
              <p>
                Tell us who you are and where you work. Our mock matcher scores how the
                industry would find you on Strings — based on role fit, city demand and
                network momentum. This is the engine that powers every gig brief.
              </p>
            </div>
            <div className="lmatch-panel">
              <div className="lfield">
                <label htmlFor="lm-role">I am a…</label>
                <select id="lm-role" className="lselect" value={role} onChange={(e) => { setRole(e.target.value); setResult(null); }}>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="lfield">
                <label htmlFor="lm-city">Based in…</label>
                <select id="lm-city" className="lselect" value={city} onChange={(e) => { setCity(e.target.value); setResult(null); }}>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button className="lbtn lbtn-grad lbtn-lg lmatch-btn" onClick={calculate}>
                <Sparkles size={17} /> Calculate my match
              </button>
              <AnimatePresence mode="wait">
                {result && (
                  <motion.div
                    className="lresult" ref={resultRef} key={result.key}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="lresult-score">
                      <b>{animatedScore}%</b>
                      <span>match for {ROLE_COPY[result.role]} in {result.city}</span>
                    </div>
                    {result.factors.map((f, i) => (
                      <div className="lfactor" key={f.label}>
                        <div className="fl"><span>{f.label}</span><b>{f.value}%</b></div>
                        <div className="lbar">
                          <i style={{ width: `${f.value}%`, transitionDelay: `${i * 0.15}s` }} />
                        </div>
                      </div>
                    ))}
                    <p className="lresult-note">Mock scores for illustration — the live engine learns from real gigs and ratings.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   STAKEHOLDER EXPLORER
   ============================================================ */
const TYPE_MAP = {
  'Performers': 'Performer', 'Venues & spaces': 'Venue', 'Buyers of talent': 'Buyer',
  'Crew & technical': 'Crew', 'Institutions & agencies': 'Institution',
};
const TAB_ICONS = { Mic, Building2, Briefcase, SlidersHorizontal, GraduationCap };
function Explorer() {
  const [tab, setTab] = useState(0);
  const group = STAKEHOLDER_GROUPS[tab];
  const Icon = TAB_ICONS[group.icon] || Users;
  const peeps = useMemo(
    () => PEOPLE.filter((p) => p.type === TYPE_MAP[group.name]).slice(0, 3),
    [tab],
  );
  return (
    <section className="lsec" id="who" style={{ paddingTop: 0 }}>
      <div className="lwrap">
        <div className="lsec-head">
          <span className="lkicker">Who it&rsquo;s for</span>
          <h2>Every seat at the table.</h2>
          <p>Five stakeholder groups, one shared network. Pick a group to see who&rsquo;s already in the room.</p>
        </div>
        <div className="ltabs" role="tablist">
          {STAKEHOLDER_GROUPS.map((g, i) => {
            const GIcon = TAB_ICONS[g.icon] || Users;
            return (
              <button key={g.name} role="tab" aria-selected={tab === i}
                className={`ltab${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>
                <GIcon size={16} />{g.name}
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab} className="ltab-panel"
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32 }}
          >
            <div>
              <div className="lico"><Icon size={26} /></div>
              <h3>{group.name}</h3>
              <p className="desc">{group.desc}. On Strings they get verified profiles, targeted match scores and a feed of opportunities that actually fit their craft.</p>
            </div>
            <div>
              {peeps.map((p) => (
                <div className="lpeep" key={p.id}>
                  <div className="av" style={{ background: p.heroGradient || avatarColor(p.name) }}>{initials(p.name)}</div>
                  <div><b>{p.name}</b><span>{p.role} · {p.city}</span></div>
                  {p.verified && <BadgeCheck size={17} className="tick" />}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ============================================================
   TESTIMONIALS
   ============================================================ */
const QUOTES = [
  {
    quote: 'I stopped losing gig leads to WhatsApp chaos. On Strings every enquiry lands on my profile with a budget and a date attached — I booked three sessions in my first week.',
    name: 'Meera Iyer', meta: 'Vocalist · Mumbai',
  },
  {
    quote: 'We filled a full December crew roster in four days. The match scores pointed us at engineers we would never have found through our usual networks.',
    name: 'Depot 48', meta: 'Venue · Delhi-NCR',
  },
  {
    quote: 'The AI match scores are scary accurate. I get session briefs that actually fit my style instead of wading through group-chat noise.',
    name: 'Anjali Kulkarni', meta: 'Session guitarist · Pune',
  },
];
function Testimonials() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  useEffect(() => {
    const t = setInterval(() => { setDir(1); setIdx((i) => (i + 1) % QUOTES.length); }, 5000);
    return () => clearInterval(t);
  }, []);
  const go = (d) => { setDir(d); setIdx((i) => (i + d + QUOTES.length) % QUOTES.length); };
  const q = QUOTES[idx];
  const person = PEOPLE.find((p) => p.name === q.name);
  return (
    <section className="lsec" id="stories" style={{ paddingTop: 0 }}>
      <div className="lwrap">
        <div className="lsec-head">
          <span className="lkicker">Stories</span>
          <h2>Loved by the people who work in music.</h2>
        </div>
        <div className="ltesti">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={idx} className="lquote-card"
              custom={dir}
              initial={{ opacity: 0, x: dir * 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.42, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <blockquote>&ldquo;{q.quote}&rdquo;</blockquote>
              <div className="lquote-who">
                <div className="av" style={{ background: person?.heroGradient || avatarColor(q.name) }}>{initials(q.name)}</div>
                <div><b>{q.name}</b><span>{q.meta}</span></div>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="ltesti-nav">
            <button className="larrow" onClick={() => go(-1)} aria-label="Previous story"><ChevronLeft size={18} /></button>
            <div className="ldots">
              {QUOTES.map((_, i) => (
                <button key={i} className={`ldot${i === idx ? ' active' : ''}`} aria-label={`Story ${i + 1}`}
                  onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }} />
              ))}
            </div>
            <button className="larrow" onClick={() => go(1)} aria-label="Next story"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FAQ
   ============================================================ */
const FAQS = [
  {
    q: 'Is Strings free?',
    a: 'Yes — creating a profile, discovering people and getting match scores is free throughout Phase 1. Down the line we\'ll introduce optional paid tiers for promoters running high-volume hiring and for advanced analytics, but the core network will always be free for working artists and crew.',
  },
  {
    q: 'Who is Strings for?',
    a: 'Everyone who makes live music happen in India: performers and bands, venues and studios, talent buyers (festivals, organisers, brands), crew and technical professionals, plus institutions and agencies like schools, societies and management firms.',
  },
  {
    q: 'How is this different from Instagram or WhatsApp?',
    a: 'Instagram is for audiences; WhatsApp is for chaos. Strings is for work: verified profiles with real skills and gig history, structured briefs with budgets and dates, AI match scores so the right people see the right opportunities, and outreach that arrives spam-free — no broadcast groups, no buried leads.',
  },
  {
    q: 'What does Phase 1 include?',
    a: 'Three things: the Network (verified profiles and connections), Discovery & collab (the gig board with AI match scores), and the Newsroom (a daily briefing on the Indian music industry). That\'s the foundation everything else — bookings, payments, ticketing — will be built on.',
  },
  {
    q: 'When do bookings go live?',
    a: 'Bookings and payments roll out in phases after the Phase 1 launch, city by city. Early members get priority access when their city opens up — which is why building your profile now matters: the match engine is already learning who you are.',
  },
];
function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="lsec" id="faq" style={{ paddingTop: 0 }}>
      <div className="lwrap">
        <div className="lsec-head">
          <span className="lkicker">FAQ</span>
          <h2>Questions, answered.</h2>
        </div>
        <div className="lfaq">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div className={`lfaq-item${isOpen ? ' open' : ''}`} key={f.q}>
                <button className="lfaq-q" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}>
                  {f.q}
                  <span className="chev"><ChevronDown size={17} /></span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div className="lfaq-a"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}>
                      <p>{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   BIG CTA + FOOTER
   ============================================================ */
function BigCta({ onJoin }) {
  return (
    <section className="lcta">
      <div className="lwrap">
        <motion.div className="lcta-panel"
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }}>
          <h2>Your next gig is already looking for you.</h2>
          <p>Join the network that&rsquo;s tying India&rsquo;s music industry together — before the rest of your city does.</p>
          <div className="lctas">
            <button className="lbtn lbtn-white lbtn-lg" onClick={onJoin}>Create your profile <ArrowRight size={18} /></button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
function Footer() {
  return (
    <footer className="lfoot">
      <div className="lwrap lfoot-in">
        <Logo light />
        <div className="lfoot-links">
          <Link to="/about">About</Link>
          <Link to="/support">Support</Link>
        </div>
        <small>© 2026 Strings. All rights reserved.</small>
      </div>
    </footer>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Landing() {
  const navigate = useNavigate();
  const { login } = useStore();
  const onJoin = () => navigate('/onboarding');
  const onDemo = () => { login(); navigate('/home'); };
  return (
    <div className="landing">
      <Nav onJoin={onJoin} onDemo={onDemo} />
      <Hero onJoin={onJoin} onDemo={onDemo} />
      <Ticker />
      <Stats />
      <Layers />
      <MatchWidget />
      <Explorer />
      <Testimonials />
      <Faq />
      <BigCta onJoin={onJoin} />
      <Footer />
    </div>
  );
}
