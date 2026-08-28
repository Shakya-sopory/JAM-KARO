import React, { useState, useEffect } from 'react';
import { Users, Plus, Check, Music, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function JointProfiles({ musicians, token }) {
  const [profiles, setProfiles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [bandName, setBandName] = useState('');
  const [selectedMusicians, setSelectedMusicians] = useState([]);
  const [genres, setGenres] = useState('');
  const [rate, setRate] = useState('');

  const fetchProfiles = () => {
    fetch(`${API_BASE_URL}/api/joint-profiles`)
      .then(res => res.json())
      .then(data => setProfiles(data))
      .catch(err => console.error("Error loading band profiles:", err));
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSelectMusician = (musician) => {
    if (selectedMusicians.some(m => m.id === musician.id)) {
      setSelectedMusicians(selectedMusicians.filter(m => m.id !== musician.id));
    } else {
      setSelectedMusicians([...selectedMusicians, musician]);
    }
  };

  const handleCreateProfile = (e) => {
    e.preventDefault();
    if (!bandName || selectedMusicians.length === 0) return;

    const payload = {
      bandName,
      members: [
        { name: "You (Leader)", role: "Guitarist/Vocalist" },
        ...selectedMusicians.map(m => ({ name: m.name, role: m.role }))
      ],
      genres: genres.split(',').map(g => g.trim()).filter(Boolean),
      rate: `₹${rate || '5,000'} / gig`
    };

    fetch(`${API_BASE_URL}/api/joint-profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(() => {
      fetchProfiles();
      setIsCreating(false);
      // Reset Form
      setBandName('');
      setSelectedMusicians([]);
      setGenres('');
      setRate('');
    })
    .catch(err => console.error("Error creating band:", err));
  };

  return (
    <div className="joint-profiles-container">
      {/* Header */}
      <div className="profiles-header">
        <div>
          <h2 className="section-title">Joint Profiles</h2>
          <p className="subtitle">From casual jams to bookable bands</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setIsCreating(!isCreating)}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          {isCreating ? 'View Bands' : (
            <>
              <Plus size={16} /> Create Band
            </>
          )}
        </button>
      </div>

      {isCreating ? (
        /* Create Joint Profile Form */
        <form onSubmit={handleCreateProfile} className="create-band-form glass-card">
          <h3 className="form-title">⚡ Build a Joint Profile</h3>
          <p className="form-desc">Combine profiles after jam sessions to start taking local bookings.</p>

          <div className="form-group">
            <label>Band/Project Name</label>
            <input 
              type="text" 
              placeholder="e.g. The Electric Session" 
              value={bandName} 
              onChange={e => setBandName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Add Jam Members (Select from Matches)</label>
            <p className="label-helper">Musicians you've matched and jammed with in your 10km radius:</p>
            <div className="musicians-selector-grid">
              {musicians.slice(0, 4).map(m => {
                const isSelected = selectedMusicians.some(sm => sm.id === m.id);
                return (
                  <div 
                    key={m.id} 
                    className={`selector-item glass-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectMusician(m)}
                  >
                    <img src={m.avatar} alt={m.name} className="selector-avatar" />
                    <div className="selector-info">
                      <strong>{m.name}</strong>
                      <span>{m.role}</span>
                    </div>
                    {isSelected && <Check size={16} className="selected-icon" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Genres (comma separated)</label>
            <input 
              type="text" 
              placeholder="e.g. Rock, Blues, Funk" 
              value={genres} 
              onChange={e => setGenres(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Gig Booking Rate (₹)</label>
            <div className="input-with-icon">
              <DollarSign size={16} className="input-icon" />
              <input 
                type="number" 
                placeholder="e.g. 8000" 
                value={rate} 
                onChange={e => setRate(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Publish Joint Profile <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        /* List Joint Profiles */
        <div className="profiles-list-area">
          {profiles.map(p => (
            <div key={p.id} className="band-card glass-card">
              <div className="band-header">
                <div>
                  <h3 className="band-title">{p.bandName}</h3>
                  <div className="genres-list" style={{ marginTop: '6px' }}>
                    {(p.genres || []).filter(Boolean).map(g => (
                      <span key={g} className="genre-pill">{g}</span>
                    ))}
                  </div>
                </div>
                <div className="band-meta">
                  <span className="badge badge-purple">{p.rate}</span>
                </div>
              </div>

              <div className="band-members-section">
                <h4>Band Lineup</h4>
                <div className="lineup-list">
                  {p.members.map((m, idx) => (
                    <div key={idx} className="lineup-member">
                      <Users size={14} className="member-icon" />
                      <span><strong>{m.name}</strong> — {m.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="band-footer">
                <div className="jam-stats">
                  <Music size={14} />
                  <span>{p.jamsCount} Verified Jams logged</span>
                </div>
                <span className={`status-badge ${p.status === 'Ready for Gigs' ? 'status-ready' : 'status-jamming'}`}>
                  <ShieldCheck size={12} />
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
