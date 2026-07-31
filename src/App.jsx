import React, { useState, useEffect } from 'react';
import { Search, Flame, Users, Calendar, MapPin, LogOut, ShoppingCart, PlusCircle, MessageSquare, User, Bell } from 'lucide-react';
import Discover from './components/Discover';
import JointProfiles from './components/JointProfiles';
import Marketplace from './components/Marketplace';
import Auth from './components/Auth';
import GearRentals from './components/GearRentals';
import PostGig from './components/PostGig';
import CommunityChat from './components/CommunityChat';
import EditProfile from './components/EditProfile';
import PrivateChat from './components/PrivateChat';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null); // Authenticated User
  const [activeTab, setActiveTab] = useState('discover'); // dynamic tabs based on role
  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // Private Collab Chat state
  const [chatPartner, setChatPartner] = useState(null); // Partner user details or null

  // Notification Drawer state
  const [notifications, setNotifications] = useState([]);
  const [showBellDrawer, setShowBellDrawer] = useState(false);

  // Check user session from localStorage on start
  useEffect(() => {
    const session = localStorage.getItem('jam_to_gig_session');
    if (session) {
      const parsedUser = JSON.parse(session);
      setUser(parsedUser);
      if (parsedUser.userType === 'hirer') {
        setActiveTab('bands');
      } else if (parsedUser.userType === 'musician' && parsedUser.skillLevel === 'Learning') {
        setActiveTab('discover');
      }
    }
  }, []);

  const fetchMusicians = () => {
    fetch('http://localhost:3001/api/musicians')
      .then((res) => res.json())
      .then((data) => {
        setMusicians(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load musicians:', err);
        setLoading(false);
      });
  };

  const fetchNotifications = () => {
    if (!user) return;
    fetch(`http://localhost:3001/api/notifications?userId=${user.id}`)
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(err => console.error("Error loading notifications:", err));
  };

  useEffect(() => {
    if (user) {
      fetchMusicians();
      fetchNotifications();
      // Poll notifications every 5 seconds
      const interval = setInterval(fetchNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('jam_to_gig_session', JSON.stringify(userData));
    if (userData.userType === 'hirer') {
      setActiveTab('bands');
    } else {
      setActiveTab('discover');
    }
  };

  const handleProfileUpdated = (updatedUserData) => {
    setUser(updatedUserData);
    localStorage.setItem('jam_to_gig_session', JSON.stringify(updatedUserData));
    fetchMusicians(); // Reload profiles list to fetch edits
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('jam_to_gig_session');
  };

  const handleOpenChat = (partner) => {
    setChatPartner(partner);
  };

  const handleToggleNotifications = () => {
    setShowBellDrawer(!showBellDrawer);
    if (!showBellDrawer && user) {
      // Mark notifications as read in backend
      fetch('http://localhost:3001/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      .then(() => fetchNotifications())
      .catch(err => console.error("Error updating read status:", err));
    }
  };

  // Render content dynamically depending on User Role and Tab Selection
  const renderRoleContent = () => {
    // 1. Edit Profile View (Universal)
    if (activeTab === 'edit-profile') {
      return <EditProfile user={user} onProfileUpdated={handleProfileUpdated} />;
    }

    if (loading && user?.userType === 'musician') {
      return (
        <div className="empty-state glass-card">
          <div className="user-pulse"></div>
          <h3>Loading Nashik Hub...</h3>
        </div>
      );
    }

    if (user.userType === 'musician') {
      // MUSICIAN PROFILE FLOW
      switch (activeTab) {
        case 'discover':
          return <Discover musicians={musicians} onOpenChat={handleOpenChat} />;
        case 'chat':
          return <CommunityChat user={user} />;
        case 'gigs':
          return <Marketplace />;
        case 'gear':
          return <GearRentals />;
        default:
          return <Discover musicians={musicians} onOpenChat={handleOpenChat} />;
      }
    } else {
      // HIRER PROFILE FLOW (Cafe, Event Organizer, House Party Host)
      switch (activeTab) {
        case 'bands':
          return <JointProfiles musicians={musicians} />;
        case 'post-gig':
          return <PostGig />;
        case 'escrows':
          return <Marketplace />;
        case 'gear':
          return <GearRentals />;
        default:
          return <JointProfiles musicians={musicians} />;
      }
    }
  };

  // If not logged in, render the Auth landing page
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Determine if user is a Learner musician
  const isLearner = user.userType === 'musician' && user.skillLevel === 'Learning';
  const unreadCount = notifications.filter(n => n.read_status === 0).length;

  return (
    <div className="app-container">
      {/* Top Header Navbar */}
      <header className="app-header">
        <div className="location-selector">
          <MapPin size={18} className="location-icon" />
          <div>
            <span className="location-label">Active Hub</span>
            <h4>Nashik, IN</h4>
          </div>
        </div>

        <div className="logo-area" style={{ color: 'var(--accent-purple)' }}>
          <span style={{ color: 'var(--text-primary)' }}>JAM</span> <span className="logo-accent">KARO</span>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {/* Bell Icon Notification Drawer */}
          <button 
            className={`icon-btn ${showBellDrawer ? 'active' : ''}`}
            onClick={handleToggleNotifications}
            aria-label="Alerts"
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span 
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: '#ef4444',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  boxShadow: '0 0 5px #ef4444'
                }}
              />
            )}
          </button>

          {/* Edit Profile Avatar Trigger */}
          <button 
            className={`icon-btn ${activeTab === 'edit-profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit-profile')} 
            aria-label="Edit Profile"
            style={{ padding: '2px', overflow: 'hidden', borderColor: activeTab === 'edit-profile' ? 'var(--accent-purple)' : 'var(--glass-border)' }}
          >
            <img 
              src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Default"} 
              alt={user.name} 
              style={{ width: '100%', height: '100%', borderRadius: '50%' }}
            />
          </button>
          
          <button className="icon-btn" onClick={handleLogout} aria-label="Log Out" style={{ color: '#ef4444' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Notifications Drawer Dialog overlay */}
      {showBellDrawer && (
        <div 
          className="notifications-dropdown glass-card fade-in" 
          style={{
            position: 'absolute',
            top: '70px',
            right: '20px',
            width: '290px',
            maxHeight: '350px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Inbox Alerts</span>
            {unreadCount > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>{unreadCount} new</span>}
          </div>
          
          {notifications.length === 0 ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No alerts yet.</p>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                style={{
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  color: n.read_status === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: n.read_status === 0 ? 'rgba(0,0,0,0.01)' : 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  borderBottom: '1px solid var(--glass-border)'
                }}
              >
                <p style={{ margin: 0 }}>{n.message}</p>
                <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                  {n.timestamp}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Main content viewport */}
      <main className="content-area">
        {renderRoleContent()}
      </main>

      {/* Bottom Nav Bar - Dynamically rendered based on active User Type and Skill Level */}
      <nav className="bottom-nav">
        {user.userType === 'musician' ? (
          <>
            <button 
              className={`nav-item ${activeTab === 'discover' ? 'active' : ''}`}
              onClick={() => setActiveTab('discover')}
            >
              <Search size={22} />
              <span>Collabs</span>
            </button>

            {isLearner && (
              /* Conditionally render Community Chat for learners instead of Clips Feed */
              <button 
                className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquare size={22} />
                <span>Learner Chat</span>
              </button>
            )}

            <button 
              className={`nav-item ${activeTab === 'gigs' ? 'active' : ''}`}
              onClick={() => setActiveTab('gigs')}
            >
              <Calendar size={22} />
              <span>Shows Board</span>
            </button>
          </>
        ) : (
          <>
            <button 
              className={`nav-item ${activeTab === 'bands' ? 'active' : ''}`}
              onClick={() => setActiveTab('bands')}
            >
              <Users size={22} />
              <span>Bands List</span>
            </button>

            <button 
              className={`nav-item ${activeTab === 'post-gig' ? 'active' : ''}`}
              onClick={() => setActiveTab('post-gig')}
            >
              <PlusCircle size={22} />
              <span>Post Show</span>
            </button>

            <button 
              className={`nav-item ${activeTab === 'escrows' ? 'active' : ''}`}
              onClick={() => setActiveTab('escrows')}
            >
              <Calendar size={22} />
              <span>My Bookings</span>
            </button>
          </>
        )}

        <button 
          className={`nav-item ${activeTab === 'gear' ? 'active' : ''}`}
          onClick={() => setActiveTab('gear')}
        >
          <ShoppingCart size={22} />
          <span>Gear Rent</span>
        </button>
      </nav>

      {/* 1-on-1 Collab Private Chat overlay */}
      {chatPartner && (
        <PrivateChat 
          currentUser={user} 
          chatPartner={chatPartner} 
          onClose={() => setChatPartner(null)} 
        />
      )}
    </div>
  );
}
