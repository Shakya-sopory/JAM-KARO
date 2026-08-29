import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function PrivateChat({ currentUser, token, chatPartner, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  const fetchChatHistory = () => {
    if (!currentUser || !chatPartner) return;
    fetch(`${API_BASE_URL}/api/messages/history?sender=${currentUser.id}&receiver=${chatPartner.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error("Error fetching private chat:", err));
  };

  useEffect(() => {
    fetchChatHistory();
    // Poll every 3 seconds
    const interval = setInterval(fetchChatHistory, 3000);
    return () => clearInterval(interval);
  }, [currentUser, chatPartner]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const payload = {
      senderId: currentUser.id,
      receiverId: chatPartner.id,
      message: newMessage
    };

    fetch(`${API_BASE_URL}/api/messages/send`, {
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
      fetchChatHistory();
    })
    .catch(err => console.error("Error sending message:", err));
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-content glass-card" style={{ maxWidth: '400px', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src={chatPartner.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatPartner.name}`} 
              alt={chatPartner.name}
              style={{ width: '32px', height: '32px', borderRadius: '50%' }}
            />
            <div>
              <h4 style={{ margin: 0, color: 'white', fontSize: '0.9rem' }}>{chatPartner.name}</h4>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 700 }}>
                {chatPartner.role || 'Collab Partner'}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Messages list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '40px' }}>
              <MessageSquare size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
              <p>Start chatting to coordinate your jam sesh or show lineup! ⚡</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser.id;
              return (
                <div 
                  key={msg.id} 
                  style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div 
                    style={{
                      background: isMe ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-magenta))' : 'rgba(255, 255, 255, 0.05)',
                      border: isMe ? 'none' : '1px solid var(--glass-border)',
                      borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      padding: '10px 14px',
                      color: 'white',
                      fontSize: '0.8rem',
                      lineHeight: '1.4'
                    }}
                  >
                    {msg.message}
                    <span style={{ display: 'block', fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginTop: '3px' }}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', padding: '15px 20px', borderTop: '1px solid var(--glass-border)' }}>
          <input 
            type="text" 
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.02)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              padding: '10px 14px',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
