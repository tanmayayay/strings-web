import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, MessageCircle } from 'lucide-react';
import { PageHead, Avatar, EmptyState } from '../components/ui';
import { useStore } from '../store/store';

export default function Messages() {
  const { conversations, sendMessage, user } = useStore();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [text, setText] = useState('');
  const bodyRef = useRef(null);
  const convo = conversations[active];

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [convo?.thread.length, active]);

  const send = () => {
    if (!text.trim()) return;
    sendMessage(convo.id, text.trim());
    setText('');
  };

  return (
    <div>
      <PageHead title="Messages" sub="Conversations with your network — requests from non-connections appear here too." />
      <div className="msg-shell">
        <div className="msg-list">
          {conversations.map((c, i) => (
            <button key={c.id} className={`msg-list-item${i === active ? ' active' : ''}`} onClick={() => setActive(i)}>
              <Avatar name={c.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{c.name}</b>
                <p>{c.thread[c.thread.length - 1]?.text}</p>
              </div>
              {c.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />}
            </button>
          ))}
        </div>
        <div className="msg-thread">
          {convo ? (
            <>
              <div className="msg-thread-head" onClick={() => convo.pid && navigate(`/profile/${convo.pid}`)}>
                <Avatar name={convo.name} size={34} />
                <div><b>{convo.name}</b><div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Typically replies within a day</div></div>
              </div>
              <div className="msg-thread-body" ref={bodyRef}>
                {convo.thread.map((m, i) => (
                  <div key={i} className={`bubble ${m.me ? 'me' : 'them'}`}>{m.text}</div>
                ))}
              </div>
              <div className="msg-thread-input">
                <input type="text" placeholder={`Message ${convo.name.split(' ')[0]}…`} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                <button className="btn btn-blue btn-sm" onClick={send}><Send size={14} /></button>
              </div>
            </>
          ) : (
            <EmptyState icon={<MessageCircle size={22} />} title="No conversation selected" text="Pick a conversation to start chatting." />
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12 }}>Signed in as {user?.name}. Messages are stored locally in this demo.</p>
    </div>
  );
}
