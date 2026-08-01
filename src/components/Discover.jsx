import React, { useState } from 'react';
import { MapPin, Check, X, Shield, Sparkles, MessageSquare, Play } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Discover({ musicians, onOpenChat }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiped, setSwiped] = useState(null); // 'left' or 'right' or null
  const [matches, setMatches] = useState([]);
  const [selectedZone, setSelectedZone] = useState('All');

  const filteredMusicians = selectedZone === 'All' 
    ? musicians 
    : musicians.filter(m => m.neighborhood === selectedZone);

  const activeMusician = filteredMusicians[currentIndex];

  const handleSwipe = (direction) => {
    setSwiped(direction);

    // Save swipe to SQLite backend database
    fetch(`${API_BASE_URL}/api/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetId: activeMusician.id,
        status: direction === 'right' ? 'liked' : 'skipped'
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.matched && direction === 'right') {
        // Reciprocal match found
        setMatches(prev => [...prev, activeMusician]);
      }
    })
    .catch(err => console.error("Error matching:", err));

    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredMusicians.length);
      setSwiped(null);
    }, 400); // match animation length
  };

  const handleZoneChange = (zone) => {
    setSelectedZone(zone);
    setCurrentIndex(0);
  };

  return (
    <div className="discover-container">
      {/* View Header */}
      <div className="discover-header">
        <div>
          <h2 className="section-title">Collabs</h2>
          <p className="subtitle">Find jam partners in Nashik</p>
        </div>
      </div>

      {/* Neighborhood Zone Selector Row */}
      <div className="filter-row glass-card" style={{ padding: '10px 15px', marginBottom: '20px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <span className="filter-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zone:</span>
        <select 
          value={selectedZone} 
          onChange={(e) => handleZoneChange(e.target.value)}
          className="zone-select"
          style={{
            background: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-body)',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="All">All Nashik</option>
          <option value="College Road">College Road</option>
          <option value="Gangapur Road">Gangapur Road</option>
          <option value="Mahatma Nagar">Mahatma Nagar</option>
        </select>
      </div>

      <div className="card-swipe-area">
        {activeMusician ? (
          <div className={`musician-card glass-card ${swiped ? `swipe-${swiped}` : ''}`}>
            <div className="card-image-container" style={{ height: '220px' }}>
              {activeMusician.videoUrl ? (
                /* Play Audition Reel Directly inside their card */
                <video 
                  src={activeMusician.videoUrl} 
                  controls 
                  playsInline 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', background: 'black' }}
                />
              ) : (
                <img 
                  src={activeMusician.avatar} 
                  alt={activeMusician.name} 
                  className="card-avatar"
                  onError={(e) => {
                    e.target.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${activeMusician.name}`;
                  }}
                />
              )}
              <div className="badge-overlay">
                <span className="badge badge-purple">{activeMusician.role}</span>
              </div>
              <div className="distance-tag">
                <MapPin size={14} />
                <span>{activeMusician.neighborhood} • {activeMusician.distance}</span>
              </div>
            </div>

            <div className="card-info">
              <div className="card-main-row">
                <h3>{activeMusician.name}</h3>
                <span className="skill-level">{activeMusician.skill}</span>
              </div>

              <p className="card-bio">"{activeMusician.bio || 'No bio written yet.'}"</p>

              <div className="genres-list">
                {(activeMusician.genres || []).filter(Boolean).map((g) => (
                  <span key={g} className="genre-pill">{g}</span>
                ))}
              </div>

              <div className="gear-section">
                <h4>Gear Available:</h4>
                <p>{activeMusician.gear || 'No gear listed yet.'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                className="swipe-btn btn-skip" 
                onClick={() => handleSwipe('left')}
                aria-label="Skip"
              >
                <X size={28} />
              </button>
              <button 
                className="swipe-btn btn-match" 
                onClick={() => handleSwipe('right')}
                aria-label="Request Collab"
              >
                <Sparkles size={28} />
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state glass-card">
            <Sparkles size={40} className="empty-icon" />
            <h3>All caught up!</h3>
            <p>Try expanding your radius or checking back later.</p>
            <button className="btn btn-primary" onClick={() => setCurrentIndex(0)}>
              Restart Collabs
            </button>
          </div>
        )}

        {/* Toast Notification of Matches */}
        {matches.length > 0 && (
          <div className="matches-dock glass-card">
            <h4>Matched Collabs ({matches.length})</h4>
            <div className="match-avatars" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {matches.map((partner, i) => (
                <div 
                  key={i} 
                  className="match-bubble" 
                  onClick={() => onOpenChat(partner)} 
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                  <MessageSquare size={14} className="msg-icon" style={{ color: 'var(--accent-purple)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Chat with {partner.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
