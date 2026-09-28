import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, MessageCircle } from 'lucide-react';
import { PageHead, Avatar, EmptyState } from '../components/ui';
import { useStore } from '../store/store';
import { Convos } from '../lib/api';

const POLL_MS = 5000;

export default function Messages() {
  const { user, userId, pushToast } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [convos, setConvos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState([]);
  const [text, setText] = useState('');
  const bodyRef = useRef(null);

  const convo = convos.find((c) => c.id === activeId) || null;
  const other = convo ? convo.members.find((m) => m.id !== userId) || convo.members[0] : null;
  const otherName = other?.name || 'Conversation';

  const loadConvos = useCallback(async () => {
    try {
      const res = await Convos.list();
      const items = res.items || [];
      setConvos(items);
      return items;
    } catch (e) {
      pushToast(e.message, 'error');
      return [];
    }
  }, [pushToast]);

  const loadThread = useCallback(async (id) => {
    try {
      const res = await Convos.messages(id);
      setThread(res.items || []);
    } catch (e) {
      pushToast(e.message, 'error');
    }
  }, [pushToast]);

  // Initial load.
  useEffect(() => {
    loadConvos();
  }, [loadConvos]);

  // Deep-link: ?c=<conversationId> pre-selects a conversation (other pages
  // navigate here right after Convos.open).
  useEffect(() => {
    const deep = searchParams.get('c');
    if (deep && convos.some((c) => c.id === deep)) setActiveId(deep);
    else if (!deep && !activeId && convos.length > 0) setActiveId(convos[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, convos]);

  // Load the thread on selection and poll for new messages while open.
  useEffect(() => {
    if (!activeId) {
      setThread([]);
      return;
    }
    loadThread(activeId);
    const t = setInterval(() => loadThread(activeId), POLL_MS);
    return () => clearInterval(t);
  }, [activeId, loadThread]);

  // Refetch on window focus.
  useEffect(() => {
    const onFocus = () => {
      loadConvos();
      if (activeId) loadThread(activeId);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [activeId, loadConvos, loadThread]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [thread.length, activeId]);

  const send = async () => {
    const body = text.trim();
    if (!body || !activeId) return;
    setText('');
    try {
      const msg = await Convos.send(activeId, body);
      setThread((prev) => [...prev, msg]);
      loadConvos(); // refresh last-message previews
    } catch (e) {
      pushToast(e.message, 'error');
      setText(body);
    }
  };

  return (
    <div>
      <PageHead title="Messages" sub="Conversations with your network — requests from non-connections appear here too." />
      <div className="msg-shell">
        <div className="msg-list">
          {convos.length === 0 ? (
            <EmptyState icon={<MessageCircle size={22} />} title="No conversations yet" text="Start one from someone's profile." />
          ) : (
            convos.map((c) => {
              const o = c.members.find((m) => m.id !== userId) || c.members[0];
              return (
                <button key={c.id} className={`msg-list-item${c.id === activeId ? ' active' : ''}`} onClick={() => setActiveId(c.id)}>
                  <Avatar name={o?.name || '?'} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{o?.name}</b>
                    <p>{c.lastMessage?.body}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="msg-thread">
          {convo ? (
            <>
              <div className="msg-thread-head" onClick={() => other && navigate(`/profile/${other.id}`)}>
                <Avatar name={otherName} size={34} />
                <div><b>{otherName}</b><div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Typically replies within a day</div></div>
              </div>
              <div className="msg-thread-body" ref={bodyRef}>
                {thread.map((m) => (
                  <div key={m.id} className={`bubble ${m.senderId === userId ? 'me' : 'them'}`}>{m.body}</div>
                ))}
              </div>
              <div className="msg-thread-input">
                <input type="text" placeholder={`Message ${otherName.split(' ')[0]}…`} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                <button className="btn btn-blue btn-sm" onClick={send}><Send size={14} /></button>
              </div>
            </>
          ) : (
            <EmptyState icon={<MessageCircle size={22} />} title="No conversation selected" text="Pick a conversation to start chatting." />
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12 }}>Signed in as {user?.name}.</p>
    </div>
  );
}
