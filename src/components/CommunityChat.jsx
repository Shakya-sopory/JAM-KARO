import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Award, Sparkles, BookOpen } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function CommunityChat({ user, token }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  const fetchMessages = () => {
    fetch(`${API_BASE_URL}/api/community/messages`)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error("Error loading chat:", err));
  };

  useEffect(() => {
    fetchMessages();
    // Poll every 3 seconds for new messages to simulate live chat
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages load
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const payload = {
      senderName: user.name || user.email,
      message: newMessage,
      userRole: `${user.role} (${user.skillLevel})`
    };

    fetch(`${API_BASE_URL}/api/community/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(() => {
      setNewMessage('');
      fetchMessages();
    })
    .catch(err => console.error("Error sending message:", err));
  };

  return (
    <div className="community-chat-container">
      {/* Header */}
      <div className="profiles-header" style={{ marginBottom: '10px' }}>
        <div>
          <h2 className="section-title">Learners Space</h2>
          <p className="subtitle">Connect, share tips, and learn together</p>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="alert-success glass-card" style={{ background: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.2)', marginBottom: '15px', padding: '12px' }}>
        <BookOpen size={18} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
        <div>
          <h4 style={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}>Welcome to Nashik Learners Room!</h4>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>You got access because your level is set to <strong>Learning</strong>. Ask for local tutors, borrow gear, or organize study jams.</p>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="chat-messages-log glass-card" style={{ height: 'calc(100vh - 350px)', overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
        {messages.map((msg) => {
          const isMe = msg.sender_name === user.name;
          return (
            <div key={msg.id} className={`chat-bubble-wrapper ${isMe ? 'chat-me' : 'chat-other'}`} style={{ display: 'flex', flexDirection: 'column', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div className="chat-bubble-meta" style={{ display: 'flex', gap: '8px', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                <span className="sender-name" style={{ fontWeight: 'bold', color: isMe ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>{msg.sender_name}</span>
                <span className="sender-role">({msg.user_role})</span>
              </div>
              <div 
                className="chat-bubble-content" 
                style={{
                  background: isMe ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-magenta))' : 'rgba(255, 255, 255, 0.05)',
                  border: isMe ? 'none' : '1px solid var(--glass-border)',
                  borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  padding: '10px 14px',
                  color: isMe ? 'white' : 'var(--text-primary)',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  boxShadow: isMe ? '0 4px 10px rgba(139, 92, 246, 0.2)' : 'none'
                }}
              >
                {msg.message}
                <span className="chat-time" style={{ display: 'block', fontSize: '0.55rem', color: isMe ? 'rgba(255, 255, 255, 0.6)' : 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSend} className="chat-input-form" style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          placeholder="Ask a question or say hi..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          style={{
            flex: 1,
            background: 'rgba(15, 23, 42, 0.02)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            color: 'var(--text-primary)',
            padding: '12px 16px',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-body)',
            outline: 'none'
          }}
        />
        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ width: '48px', height: '48px', padding: 0, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
