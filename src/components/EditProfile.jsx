import React, { useState } from 'react';
import { User, MapPin, Edit2, CheckCircle, Sparkles, Image, Video, Camera } from 'lucide-react';
import { API_BASE_URL } from '../config';

const INDIAN_GENRES = [
  "Hindustani Classical",
  "Bollywood",
  "Sufi",
  "Marathi Folk",
  "Fusion",
  "Ghazal"
];

const NASHIK_ZONES = [
  "College Road",
  "Gangapur Road",
  "Mahatma Nagar",
  "Nashik Road",
  "Indira Nagar"
];

const INSTRUMENTS_LIST = [
  "Tabla",
  "Harmonium",
  "Bansuri (Flute)",
  "Guitar",
  "Keyboard",
  "Violin",
  "Vocalist"
];

export default function EditProfile({ user, token, onProfileUpdated }) {
  const [name, setName] = useState(user.name || '');
  const [neighborhood, setNeighborhood] = useState(user.neighborhood || 'College Road');
  const [role, setRole] = useState(user.role || 'Vocalist');
  const [skillLevel, setSkillLevel] = useState(user.skillLevel || 'Learning');
  const [selectedGenres, setSelectedGenres] = useState(user.genres || []);
  const [gear, setGear] = useState(user.gear || '');
  const [bio, setBio] = useState(user.bio || '');

  // File Upload states
  const [avatarFile, setAvatarFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar || '');
  const [videoPreview, setVideoPreview] = useState(user.videoUrl || '');

  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate video file size or length if desired (1 minute max is usually around 10-50MB depending on quality)
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleGenreToggle = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(false);
    setUploading(true);

    // Multi-part Form Data payload for binary upload
    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('name', name);
    formData.append('neighborhood', neighborhood);
    formData.append('role', role);
    formData.append('skillLevel', skillLevel);
    formData.append('gear', gear);
    formData.append('bio', bio);
    
    // Append genres
    selectedGenres.forEach(g => {
      formData.append('genres', g);
    });

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    if (videoFile) {
      formData.append('video', videoFile);
    }

    fetch(`${API_BASE_URL}/api/profiles/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // no Content-Type: browser sets the multipart boundary
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      setUploading(false);
      if (data.success) {
        setSuccess(true);
        onProfileUpdated(data);
        if (data.avatar) setAvatarPreview(data.avatar);
        if (data.videoUrl) setVideoPreview(data.videoUrl);
        setTimeout(() => setSuccess(false), 3000);
      }
    })
    .catch(err => {
      setUploading(false);
      console.error("Error updating profile:", err);
    });
  };

  return (
    <div className="edit-profile-container">
      {/* Header */}
      <div className="profiles-header">
        <div>
          <h2 className="section-title">Edit Profile</h2>
          <p className="subtitle">Customize your Indian music portfolio</p>
        </div>
      </div>

      {success && (
        <div className="alert-success glass-card slide-in" style={{ marginBottom: '15px' }}>
          <CheckCircle size={20} className="success-icon" />
          <div>
            <h4>Profile Updated!</h4>
            <p>Your portfolio is live. Matches can see your updated details.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-band-form glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h3 className="form-title">
          <Edit2 size={16} className="title-glow-icon" /> 
          Portfolio Details
        </h3>

        {/* Instagram style Avatar File Picker */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-purple)', boxShadow: '0 4px 12px rgba(124,58,237,0.15)' }}>
            <img 
              src={avatarPreview || "https://api.dicebear.com/7.x/avataaars/svg?seed=Default"} 
              alt="Avatar Preview" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <label 
              htmlFor="avatar-upload" 
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28px', background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Camera size={14} style={{ color: 'white' }} />
            </label>
          </div>
          <input 
            id="avatar-upload" 
            type="file" 
            accept="image/*" 
            onChange={handleAvatarChange} 
            style={{ display: 'none' }} 
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tap to update profile picture</span>
        </div>

        <div className="form-group">
          <label>Display Name</label>
          <input 
            type="text" 
            placeholder="Your Name" 
            value={name} 
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        {user.userType === 'musician' ? (
          <>
            <div className="musicians-selector-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label>Instrument / Role</label>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  {INSTRUMENTS_LIST.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Skill Level</label>
                <select value={skillLevel} onChange={e => setSkillLevel(e.target.value)}>
                  <option value="Learning">Learning (Beginner)</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Neighborhood Zone (Nashik)</label>
              <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)}>
                {NASHIK_ZONES.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Genres (Indian/Maharashtrian Focus)</label>
              <div className="genres-checkboxes-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                {INDIAN_GENRES.map((genre) => {
                  const isChecked = selectedGenres.includes(genre);
                  return (
                    <div 
                      key={genre} 
                      className={`selector-item glass-card ${isChecked ? 'selected' : ''}`}
                      onClick={() => handleGenreToggle(genre)}
                      style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center' }}
                    >
                      {genre}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>Gear List</label>
              <input 
                type="text" 
                placeholder="e.g. Hindustani Flute Scale G, or Tabla Set" 
                value={gear}
                onChange={e => setGear(e.target.value)}
              />
            </div>

            {/* Direct Video Reel Picker (1 min max) */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Video size={16} style={{ color: 'var(--accent-purple)' }} />
                Audition Reel (Video File - Max 1 Minute)
              </label>
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleVideoChange}
                style={{ padding: '6px', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc', cursor: 'pointer' }}
              />
              
              {videoPreview && (
                <div style={{ marginTop: '10px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  <video 
                    src={videoPreview} 
                    controls 
                    style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', background: 'black' }}
                  />
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '6px', background: '#f1f5f9' }}>
                    Preview of Uploaded Portfolio Reel
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="form-group">
            <label>Neighborhood Zone (Nashik)</label>
            <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)}>
              {NASHIK_ZONES.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Bio / Description</label>
          <input 
            type="text" 
            placeholder="Tell us about yourself..." 
            value={bio}
            onChange={e => setBio(e.target.value)}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary w-full" 
          disabled={uploading}
          style={{ background: 'var(--accent-purple)', color: 'white' }}
        >
          {uploading ? 'Uploading Portfolio...' : 'Save Portfolio'} <Sparkles size={14} />
        </button>
      </form>
    </div>
  );
}
