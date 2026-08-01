import React, { useState, useEffect } from 'react';
import { ShieldCheck, Phone, ShoppingCart, Info, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function GearRentals() {
  const [rentals, setRentals] = useState([]);
  const [successBooking, setSuccessBooking] = useState(null); // booked item ID or null

  const fetchRentals = () => {
    fetch(`${API_BASE_URL}/api/rentals`)
      .then(res => res.json())
      .then(data => setRentals(data))
      .catch(err => console.error("Error loading rentals:", err));
  };

  useEffect(() => {
    fetchRentals();
  }, []);

  const handleBookRental = (itemId) => {
    fetch(`${API_BASE_URL}/api/rentals/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    })
    .then(res => res.json())
    .then(() => {
      fetchRentals();
      setSuccessBooking(itemId);
      setTimeout(() => setSuccessBooking(null), 5000);
    })
    .catch(err => console.error("Error renting item:", err));
  };

  return (
    <div className="rentals-container">
      {/* Header */}
      <div className="profiles-header">
        <div>
          <h2 className="section-title">Local Gear Sharing</h2>
          <p className="subtitle">Borrow instruments locally at minimal prices</p>
        </div>
      </div>

      {successBooking && (
        <div className="alert-success glass-card slide-in" style={{ marginBottom: '15px' }}>
          <ShieldCheck size={20} className="success-icon" />
          <div>
            <h4>Rental Locked!</h4>
            <p>Please call the owner to coordinate pickup. Details below.</p>
          </div>
        </div>
      )}

      <div className="rentals-grid">
        {rentals.map((item) => (
          <div key={item.id} className={`rent-card glass-card ${item.status === 'Rented' ? 'rented-locked' : ''}`}>
            <div className="rent-header">
              <div>
                <span className="rent-location">{item.neighborhood}</span>
                <h3 className="rent-title">{item.name}</h3>
              </div>
              <span className="rent-price">{item.price}</span>
            </div>

            <div className="rent-body">
              <div className="rent-meta-info">
                <Info size={14} style={{ color: 'var(--text-muted)' }} />
                <span>Verified equipment. Owned by local musicians.</span>
              </div>
              
              {item.status === 'Rented' ? (
                <div className="contact-details-box glass-card">
                  <div className="contact-row">
                    <Phone size={14} className="phone-icon" />
                    <span><strong>Contact Owner:</strong> {item.contact}</span>
                  </div>
                  <p className="contact-note">Coordinate pickup & security deposit directly.</p>
                </div>
              ) : (
                <p className="rent-info-label">Available for immediate pickup in Nashik.</p>
              )}
            </div>

            <div className="rent-footer">
              <span className={`status-badge ${item.status === 'Available' ? 'status-ready' : 'status-jamming'}`}>
                {item.status === 'Available' ? 'Available' : 'Rented'}
              </span>

              {item.status === 'Available' ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleBookRental(item.id)}
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  <ShoppingCart size={14} /> Rent Now
                </button>
              ) : (
                <button 
                  className="btn btn-secondary"
                  disabled
                  style={{ padding: '8px 16px', fontSize: '0.8rem', opacity: 0.6 }}
                >
                  Booked
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
