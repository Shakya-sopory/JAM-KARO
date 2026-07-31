import React, { useState } from 'react';
import { Mail, Lock, User, Shield, Sparkles, MapPin, Smartphone, CheckCircle, ShieldAlert } from 'lucide-react';

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

export default function Auth({ onAuthSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState('musician'); // 'musician' | 'hirer'
  
  // Detailed Profile Info for Signup
  const [name, setName] = useState('');
  const [neighborhood, setNeighborhood] = useState('College Road');
  const [role, setRole] = useState('Vocalist');
  const [skillLevel, setSkillLevel] = useState('Learning'); // 'Learning' | 'Intermediate' | 'Professional'
  
  // OTP Verification state
  const [verificationStage, setVerificationStage] = useState(false); // true if waiting for OTP
  const [sentOtp, setSentOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [otpAlert, setOtpAlert] = useState('');

  const [error, setError] = useState('');

  const handleSendOtp = (e) => {
    e.preventDefault();
    setError('');

    // Pre-validate phone
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    fetch('http://localhost:3001/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, email })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch OTP code');
      }
      return data;
    })
    .then((data) => {
      setSentOtp(data.otp);
      setVerificationStage(true);
      if (data.realSmsSent) {
        setOtpAlert(`A real OTP code has been dispatched to +91 ${phone} via Fast2SMS. Please check your SMS messages and enter it here.`);
      } else {
        setOtpAlert(`Virtual OTP Code sent to +91 ${phone}: Enter ${data.otp} to verify!`);
      }
    })
    .catch((err) => {
      setError(err.message);
    });
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError('');

    // Finalize signup in SQLite
    const payload = { email, password, phone, otp: inputOtp, userType, name, neighborhood, role, skillLevel };

    fetch('http://localhost:3001/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup registration failed: ' + data.error);
      }
      return data;
    })
    .then((data) => {
      if (data.success) {
        onAuthSuccess(data);
      }
    })
    .catch((err) => {
      setError(err.message);
    });
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');

    fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      return data;
    })
    .then((data) => {
      if (data.success) {
        onAuthSuccess(data);
      }
    })
    .catch((err) => {
      setError(err.message);
    });
  };

  return (
    <div className="auth-outer-container">
      <div className="auth-card glass-card" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <div className="auth-header" style={{ marginBottom: '15px' }}>
          <div className="auth-logo" style={{ color: 'var(--accent-purple)' }}>
            <span style={{ color: 'var(--text-primary)' }}>JAM</span> <span className="logo-accent">KARO</span>
          </div>
          <p className="auth-subtitle" style={{ color: 'var(--text-secondary)' }}>Nashik's Ground-Level Music Network</p>
        </div>

        {error && <div className="auth-error-alert" style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c' }}>{error}</div>}

        {verificationStage ? (
          /* OTP Verification Form */
          <form onSubmit={handleVerifyOtp} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 className="auth-title" style={{ color: 'var(--text-primary)' }}>
              <Shield className="title-glow-icon" style={{ color: 'var(--accent-purple)' }} />
              OTP Verification
            </h3>
            
            {otpAlert && (
              <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', color: 'var(--accent-purple)', padding: '12px', borderRadius: '10px', fontSize: '0.75rem', lineHeight: '1.5' }}>
                <Sparkles size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                {otpAlert}
              </div>
            )}

            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)' }}>Enter 4-Digit Verification Code</label>
              <div className="input-with-icon">
                <Smartphone size={16} className="input-icon" style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="number" 
                  placeholder="e.g. 1234" 
                  value={inputOtp}
                  onChange={e => setInputOtp(e.target.value)}
                  style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid #e2e8f0' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ background: 'var(--accent-purple)', color: 'white' }}>
              Verify & Complete Signup
            </button>
            <button 
              type="button" 
              className="auth-toggle-link"
              onClick={() => setVerificationStage(false)}
              style={{ fontSize: '0.75rem', alignSelf: 'center', marginTop: '5px' }}
            >
              Back to Form
            </button>
          </form>
        ) : isSignup ? (
          /* Detailed Signup Form */
          <form onSubmit={handleSendOtp} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="auth-title" style={{ color: 'var(--text-primary)' }}>
              <Sparkles size={18} className="title-glow-icon" style={{ color: 'var(--accent-purple)' }} />
              Create Account
            </h3>

            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)' }}>Display Name</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="e.g. Amit Deshmukh" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid #e2e8f0' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)' }}>Join As</label>
              <div className="role-selector-row">
                <button
                  type="button"
                  className={`role-btn ${userType === 'musician' ? 'active' : ''}`}
                  onClick={() => setUserType('musician')}
                  style={{ background: userType === 'musician' ? 'rgba(124,58,237,0.06)' : 'white', borderColor: userType === 'musician' ? 'var(--accent-purple)' : '#e2e8f0', color: userType === 'musician' ? 'var(--accent-purple)' : 'var(--text-secondary)' }}
                >
                  <User size={16} />
                  <span>Musician</span>
                </button>
                <button
                  type="button"
                  className={`role-btn ${userType === 'hirer' ? 'active' : ''}`}
                  onClick={() => setUserType('hirer')}
                  style={{ background: userType === 'hirer' ? 'rgba(124,58,237,0.06)' : 'white', borderColor: userType === 'hirer' ? 'var(--accent-purple)' : '#e2e8f0', color: userType === 'hirer' ? 'var(--accent-purple)' : 'var(--text-secondary)' }}
                >
                  <Shield size={16} />
                  <span>Cafe / Host</span>
                </button>
              </div>
            </div>

            {userType === 'musician' && (
              <>
                <div className="form-group">
                  <label style={{ color: 'var(--text-secondary)' }}>Neighborhood Zone (Nashik)</label>
                  <select 
                    value={neighborhood}
                    onChange={e => setNeighborhood(e.target.value)}
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      outline: 'none',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    {NASHIK_ZONES.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div className="musicians-selector-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-secondary)' }}>Instrument</label>
                    <select 
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-body)',
                        outline: 'none',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      {INSTRUMENTS_LIST.map(inst => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ color: 'var(--text-secondary)' }}>Level</label>
                    <select 
                      value={skillLevel}
                      onChange={e => setSkillLevel(e.target.value)}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-body)',
                        outline: 'none',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      <option value="Learning">Learning</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)' }}>Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  placeholder="e.g. guitar@nashik.com" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid #e2e8f0' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)' }}>Mobile Phone Number</label>
              <div className="input-with-icon">
                <Smartphone size={16} className="input-icon" style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="tel" 
                  placeholder="10-Digit Mobile" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid #e2e8f0' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid #e2e8f0' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full auth-submit-btn" style={{ background: 'var(--accent-purple)', color: 'white', marginTop: '10px' }}>
              Request SMS OTP
            </button>
          </form>
        ) : (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="auth-title" style={{ color: 'var(--text-primary)' }}>
              Welcome Back
            </h3>

            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)' }}>Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  placeholder="e.g. musician@nashik.com" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid #e2e8f0' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid #e2e8f0' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full auth-submit-btn" style={{ background: 'var(--accent-purple)', color: 'white', marginTop: '10px' }}>
              Log In
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{isSignup ? 'Already have an account?' : "Don't have an account?"}</span>
          <button 
            type="button" 
            className="auth-toggle-link"
            onClick={() => {
              setIsSignup(!isSignup);
              setVerificationStage(false);
              setError('');
            }}
            style={{ color: 'var(--accent-purple)' }}
          >
            {isSignup ? 'Log In' : 'Sign Up'}
          </button>
        </div>

        <div className="demo-credentials-box" style={{ background: '#f8fafc', borderColor: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
          <h5 style={{ color: 'var(--text-muted)' }}>Demo accounts:</h5>
          <p>🔑 Learner: <code>musician@nashik.com</code> / <code>password</code></p>
          <p>🔑 Cafe/Host: <code>cafe@nashik.com</code> / <code>password</code></p>
        </div>
      </div>
    </div>
  );
}
