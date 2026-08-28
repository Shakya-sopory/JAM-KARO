import React, { useState } from 'react';
import { Calendar, DollarSign, MapPin, Sparkles, ArrowRight, ShieldCheck, Music, Users } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function PostGig({ token, onGigPosted }) {
  const [eventType, setEventType] = useState('gig'); // 'gig' (paid) | 'jam' (casual circle)
  
  // Universal fields
  const [venue, setVenue] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');

  // Paid Gig specific
  const [pay, setPay] = useState('');

  // Jam Session specific
  const [coverCharge, setCoverCharge] = useState('');
  const [slotsTotal, setSlotsTotal] = useState('');

  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(false);

    if (eventType === 'gig') {
      // Create Professional Show
      if (!venue || !title || !pay) return;

      const payload = {
        venue,
        event: title,
        date,
        time,
        pay,
        contractDetails: description,
        hirer: `Host (${venue})`
      };

      fetch(`${API_BASE_URL}/api/gigs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(() => {
        setSuccess(true);
        if (onGigPosted) onGigPosted();
        setTimeout(() => setSuccess(false), 4000);
        resetForm();
      })
      .catch(err => console.error("Error creating show:", err));
    } else {
      // Create Casual Jam Session
      if (!venue || !title || !coverCharge || !slotsTotal) return;

      const payload = {
        cafeName: venue,
        title,
        date,
        time,
        entryFee: coverCharge,
        slotsTotal: parseInt(slotsTotal) || 10,
        description
      };

      fetch(`${API_BASE_URL}/api/jams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(() => {
        setSuccess(true);
        if (onGigPosted) onGigPosted();
        setTimeout(() => setSuccess(false), 4000);
        resetForm();
      })
      .catch(err => console.error("Error creating jam session:", err));
    }
  };

  const resetForm = () => {
    setVenue('');
    setTitle('');
    setDate('');
    setTime('');
    setPay('');
    setCoverCharge('');
    setSlotsTotal('');
    setDescription('');
  };

  return (
    <div className="post-gig-container">
      {/* Header */}
      <div className="profiles-header">
        <div>
          <h2 className="section-title">Post Show</h2>
          <p className="subtitle">Publish paying bookings or open jam circles</p>
        </div>
      </div>

      {success && (
        <div className="alert-success glass-card slide-in" style={{ marginBottom: '15px' }}>
          <ShieldCheck size={20} className="success-icon" />
          <div>
            <h4>Show Event Published!</h4>
            <p>{eventType === 'gig' ? 'Paid Show booking is live on Shows Board.' : 'Jam Circle is scheduled on Jams Board.'}</p>
          </div>
        </div>
      )}

      {/* Selector Row */}
      <div className="sub-tab-selectors" style={{ display: 'flex', marginBottom: '20px' }}>
        <button
          type="button"
          className={`sub-tab ${eventType === 'gig' ? 'active' : ''}`}
          onClick={() => { setEventType('gig'); resetForm(); }}
          style={{ flex: 1, textAlign: 'center' }}
        >
          <Music size={14} style={{ marginRight: '4px', display: 'inline' }} />
          Paid Booking
        </button>
        <button
          type="button"
          className={`sub-tab ${eventType === 'jam' ? 'active' : ''}`}
          onClick={() => { setEventType('jam'); resetForm(); }}
          style={{ flex: 1, textAlign: 'center' }}
        >
          <Users size={14} style={{ marginRight: '4px', display: 'inline' }} />
          Casual Jam Circle
        </button>
      </div>

      <form onSubmit={handleSubmit} className="create-band-form glass-card">
        <h3 className="form-title">
          ⚡ {eventType === 'gig' ? 'Create Professional Show Booking' : 'Host Casual Cafe Jam Circle'}
        </h3>
        <p className="form-desc">
          {eventType === 'gig' 
            ? 'Hire local bands or vocalists directly. Advance payments fully secured.'
            : 'Organize open jam circles. Attendees pay cover/entry fee.'
          }
        </p>

        <div className="form-group">
          <label>Cafe Name / Venue Location</label>
          <input 
            type="text" 
            placeholder="e.g. Cafe Bliss (College Road)" 
            value={venue}
            onChange={e => setVenue(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>{eventType === 'gig' ? 'Show Title / Requirements' : 'Jam Session Title'}</label>
          <input 
            type="text" 
            placeholder={eventType === 'gig' ? "e.g. Sufi Vocalist Needed" : "e.g. Sufi Sunday Jam Circle"} 
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="musicians-selector-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group">
            <label>Event Date</label>
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Event Time</label>
            <input 
              type="text" 
              placeholder="e.g. 6:30 PM"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
            />
          </div>
        </div>

        {eventType === 'gig' ? (
          /* Paid Gig specific inputs */
          <div className="form-group">
            <label>Artist Payout Advance budget (₹)</label>
            <div className="input-with-icon">
              <DollarSign size={16} className="input-icon" />
              <input 
                type="number" 
                placeholder="e.g. 10000" 
                value={pay}
                onChange={e => setPay(e.target.value)}
                required
              />
            </div>
          </div>
        ) : (
          /* Jam Session specific inputs */
          <div className="musicians-selector-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>Cover Charge / Entry (₹)</label>
              <div className="input-with-icon">
                <DollarSign size={16} className="input-icon" />
                <input 
                  type="number" 
                  placeholder="e.g. 200" 
                  value={coverCharge}
                  onChange={e => setCoverCharge(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Total Attendee Slots</label>
              <input 
                type="number" 
                placeholder="e.g. 15" 
                value={slotsTotal}
                onChange={e => setSlotsTotal(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Event Description / Terms</label>
          <input 
            type="text" 
            placeholder={eventType === 'gig' ? "Acoustic vocals, sound system provided by venue." : "Bring your instruments. Cover charge fully redeemable on menu."} 
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary w-full">
          Publish Event <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
