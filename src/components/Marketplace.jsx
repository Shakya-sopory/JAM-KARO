import React, { useState, useEffect } from 'react';
import { Calendar, HandCoins, CheckCircle, ArrowRight, ShieldAlert, Award, Music, Users } from 'lucide-react';
import UpiCheckout from './UpiCheckout';
import { API_BASE_URL } from '../config';

export default function Marketplace({ token }) {
  const [gigs, setGigs] = useState([]);
  const [jams, setJams] = useState([]);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' (shows) | 'jam-circles' | 'my-bookings' (confirmed)
  
  const [showContractModal, setShowContractModal] = useState(null); // Gig object or null
  const [showUpiModal, setShowUpiModal] = useState(null); // Gig object or null
  const [successBooking, setSuccessBooking] = useState(false);
  const [successRsvp, setSuccessRsvp] = useState(false);

  const fetchGigs = () => {
    fetch(`${API_BASE_URL}/api/gigs`)
      .then(res => res.json())
      .then(data => {
        const mapped = data.map(g => ({
          id: g.id,
          venue: g.venue,
          event: g.event,
          date: g.date,
          time: g.time,
          pay: g.pay,
          status: g.status,
          contractDetails: g.contract_details,
          hirer: g.hirer
        }));
        setGigs(mapped);
      })
      .catch(err => console.error("Error loading gigs:", err));
  };

  const fetchJams = () => {
    fetch(`${API_BASE_URL}/api/jams`)
      .then(res => res.json())
      .then(data => setJams(data))
      .catch(err => console.error("Error loading jam sessions:", err));
  };

  useEffect(() => {
    fetchGigs();
    fetchJams();
  }, []);

  const handleApplyGig = (gig) => {
    setShowContractModal(gig);
  };

  const handleSignContract = (gig) => {
    setShowContractModal(null);
    setShowUpiModal(gig);
  };

  const handleConfirmBooking = (gigId) => {
    fetch(`${API_BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ gigId })
    })
    .then(res => res.json())
    .then(() => {
      fetchGigs();
      setShowUpiModal(null);
      setSuccessBooking(true);
      setTimeout(() => setSuccessBooking(false), 4000);
    })
    .catch(err => console.error("Error booking gig:", err));
  };

  const handleRsvpJam = (jamId) => {
    fetch(`${API_BASE_URL}/api/jams/rsvp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ jamId })
    })
    .then(res => res.json())
    .then(() => {
      fetchJams();
      setSuccessRsvp(true);
      setTimeout(() => setSuccessRsvp(false), 4000);
    })
    .catch(err => console.error("Error RSVP-ing to jam:", err));
  };

  return (
    <div className="marketplace-container">
      {/* Header */}
      <div className="marketplace-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="section-title">Shows Board</h2>
            <p className="subtitle">Secure show contracts & casual jam circles</p>
          </div>
        </div>
        
        {/* Board Tab Selectors */}
        <div className="sub-tab-selectors" style={{ display: 'flex', width: '100%' }}>
          <button 
            className={`sub-tab ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveTab('explore')}
            style={{ flex: 1, textAlign: 'center' }}
          >
            Open Shows
          </button>
          <button 
            className={`sub-tab ${activeTab === 'jam-circles' ? 'active' : ''}`}
            onClick={() => setActiveTab('jam-circles')}
            style={{ flex: 1, textAlign: 'center' }}
          >
            Jam Circles
          </button>
          <button 
            className={`sub-tab ${activeTab === 'my-bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-bookings')}
            style={{ flex: 1, textAlign: 'center' }}
          >
            My Bookings
          </button>
        </div>
      </div>

      {successBooking && (
        <div className="alert-success glass-card slide-in">
          <Award size={20} className="success-icon" />
          <div>
            <h4>Booking Confirmed!</h4>
            <p>Now settle the advance directly with the band via UPI or cash. See your bookings tab.</p>
          </div>
        </div>
      )}

      {successRsvp && (
        <div className="alert-success glass-card slide-in">
          <CheckCircle size={20} className="success-icon" />
          <div>
            <h4>RSVP Registered!</h4>
            <p>Your slot is locked. Check Notifications for details.</p>
          </div>
        </div>
      )}

      {activeTab === 'explore' && (
        /* Explore Open Shows */
        <div className="gigs-list">
          {gigs.filter(g => g.status === 'Open').length === 0 ? (
            <div className="empty-state glass-card">
              <CheckCircle size={40} className="empty-icon" />
              <h3>All Shows Booked!</h3>
              <p>Check back soon. Venues post new shows weekly.</p>
            </div>
          ) : (
            gigs.filter(g => g.status === 'Open').map(g => (
              <div key={g.id} className="gig-card glass-card">
                <div className="gig-header">
                  <div>
                    <h3 className="gig-title">{g.event}</h3>
                    <span className="gig-venue">{g.venue}</span>
                  </div>
                  <span className="gig-pay">{g.pay}</span>
                </div>

                <div className="gig-details">
                  <div className="detail-item">
                    <Calendar size={14} />
                    <span>{g.date} at {g.time}</span>
                  </div>
                  <p className="gig-rules"><strong>Performance Requirements:</strong> {g.contractDetails}</p>
                </div>

                <div className="gig-footer">
                  <div className="escrow-badge" style={{ background: 'rgba(6,182,212,0.08)', borderColor: 'rgba(6,182,212,0.25)', color: 'var(--accent-cyan)' }}>
                    <HandCoins size={12} />
                    <span>Direct advance</span>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleApplyGig(g)}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    Apply Now <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'jam-circles' && (
        /* Explore Casual Jam Circles */
        <div className="gigs-list">
          {jams.length === 0 ? (
            <div className="empty-state glass-card">
              <Music size={40} className="empty-icon" />
              <h3>No Jam Circles Scheduled</h3>
              <p>Venues will post new sessions soon.</p>
            </div>
          ) : (
            jams.map(jam => (
              <div key={jam.id} className="gig-card glass-card" style={{ borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                <div className="gig-header">
                  <div>
                    <h3 className="gig-title">{jam.title}</h3>
                    <span className="gig-venue">{jam.cafe_name}</span>
                  </div>
                  <span className="gig-pay" style={{ color: 'var(--accent-cyan)' }}>{jam.entry_fee}</span>
                </div>

                <div className="gig-details">
                  <div className="detail-item">
                    <Calendar size={14} style={{ color: 'var(--accent-cyan)' }} />
                    <span>{jam.date} at {jam.time}</span>
                  </div>
                  <p className="gig-rules"><strong>About Circle:</strong> {jam.description}</p>
                </div>

                <div className="gig-footer" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                  <div className="jam-stats" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} style={{ color: 'var(--accent-purple)' }} />
                    <span>{jam.slots_left} / {jam.slots_total} slots left</span>
                  </div>
                  
                  {jam.slots_left > 0 ? (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleRsvpJam(jam.id)}
                      style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', boxShadow: '0 4px 10px var(--accent-cyan-glow)' }}
                    >
                      RSVP Slot <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button 
                      className="btn btn-secondary" 
                      disabled
                      style={{ padding: '8px 16px', fontSize: '0.85rem', opacity: 0.6 }}
                    >
                      Full House
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'my-bookings' && (
        /* Booking & Escrow Management */
        <div className="my-bookings-list">
          {gigs.filter(g => g.status === 'Confirmed').length === 0 ? (
            <div className="empty-state glass-card">
              <CheckCircle size={40} className="empty-icon" />
              <h3>No Confirmed Shows</h3>
              <p>Confirm a show booking to see it here.</p>
            </div>
          ) : (
            gigs.filter(g => g.status === 'Confirmed').map(g => (
              <div key={g.id} className="gig-card glass-card contract-active" style={{ borderColor: 'rgba(6,182,212,0.3)' }}>
                <div className="contract-strip" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)' }}>
                  <CheckCircle size={14} />
                  <span>Booking Confirmed</span>
                </div>

                <div className="gig-header" style={{ marginTop: '10px' }}>
                  <div>
                    <h3 className="gig-title">{g.event}</h3>
                    <span className="gig-venue">{g.venue}</span>
                  </div>
                  <span className="gig-pay text-cyan">{g.pay}</span>
                </div>

                <div className="contract-accordion">
                  <h4>Booking Details:</h4>
                  <div className="contract-code">
                    <p><strong>Venue Location:</strong> {g.venue}</p>
                    <p><strong>Advance:</strong> {g.pay} &mdash; arrange this directly with the band via UPI or cash. Jam Karo does not hold or process payments.</p>
                    <p><strong>Next step:</strong> Contact the band to coordinate the advance and show logistics.</p>
                  </div>
                </div>

                <div className="gig-footer" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                  <div className="dispute-helper">
                    <ShieldAlert size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>Direct-trust community model</span>
                  </div>
                  <button
                    className="btn btn-secondary"
                    disabled
                    style={{ padding: '8px 16px', fontSize: '0.85rem', opacity: 0.6 }}
                  >
                    Confirmed
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Contract Sign Modal */}
      {showContractModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card">
            <h3 className="modal-title">📄 Show Booking Agreement</h3>
            <p className="modal-subtitle">Verify contract terms before confirming.</p>

            <div className="contract-body">
              <p><strong>1. Event Title:</strong> {showContractModal.event}</p>
              <p><strong>2. Cafe Venue:</strong> {showContractModal.venue}</p>
              <p><strong>3. Date & Time:</strong> {showContractModal.date} | {showContractModal.time}</p>
              <p><strong>4. Advance Amount:</strong> {showContractModal.pay} (settled directly with the band)</p>
              <hr style={{ borderColor: 'var(--glass-border)', margin: '12px 0' }} />
              <p className="legal-clause">
                By pressing "Continue", you agree to these show terms. Jam Karo runs on a direct-trust community model &mdash;
                there is no in-app payment. You will arrange the {showContractModal.pay} advance directly with the band via UPI or cash.
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowContractModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleSignContract(showContractModal)}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPI Checkout Modal */}
      {showUpiModal && (
        <UpiCheckout
          amount={showUpiModal.pay}
          eventTitle={showUpiModal.event}
          venue={showUpiModal.venue}
          onClose={() => setShowUpiModal(null)}
          onConfirm={() => handleConfirmBooking(showUpiModal.id)}
        />
      )}
    </div>
  );
}
