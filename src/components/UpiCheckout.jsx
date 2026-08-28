import React from 'react';
import { X, ArrowRight, Users, HandCoins, Info } from 'lucide-react';

export default function UpiCheckout({ amount, eventTitle, venue, onClose, onConfirm }) {
  return (
    <div className="modal-backdrop" style={{ zIndex: 1200 }}>
      <div className="modal-content glass-card" style={{ maxWidth: '380px', padding: '24px', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', right: '15px', top: '15px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>

        <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: 'var(--accent-cyan)' }} />
          Confirm Booking
        </h3>
        <p className="modal-subtitle" style={{ marginBottom: '15px' }}>Lock in this show with the band.</p>

        {/* Event breakdown */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '12px 16px', borderRadius: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Event:</span>
            <span style={{ fontWeight: 'bold', color: 'white' }}>{eventTitle}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <span>Venue:</span>
            <span style={{ color: 'white' }}>{venue}</span>
          </div>
          <hr style={{ borderColor: 'var(--glass-border)', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Advance to arrange:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>{amount}</span>
          </div>
        </div>

        {/* Direct-trust community model notice */}
        <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '18px', display: 'flex', gap: '10px' }}>
          <Info size={16} style={{ color: 'var(--accent-purple)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.75rem', lineHeight: '1.55', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Jam Karo runs on a direct-trust community model.</strong> There is no in-app payment or escrow. After you confirm, settle the {amount} advance <strong>directly with the band</strong> over UPI or cash, and coordinate the rest with the venue/musician yourselves.
          </div>
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            style={{ flex: 1, background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', boxShadow: '0 4px 15px var(--accent-cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <HandCoins size={14} /> Confirm Booking <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
