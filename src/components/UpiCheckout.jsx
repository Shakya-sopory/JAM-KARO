import React, { useState } from 'react';
import { X, Smartphone, ArrowRight, ShieldCheck, CreditCard, QrCode } from 'lucide-react';

export default function UpiCheckout({ amount, eventTitle, venue, onClose, onSuccess }) {
  const [paymentStep, setPaymentStep] = useState('options'); // 'options' | 'processing' | 'success'
  const [selectedApp, setSelectedApp] = useState('GPay');

  const handlePay = () => {
    setPaymentStep('processing');
    setTimeout(() => {
      setPaymentStep('success');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }, 2500);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200 }}>
      <div className="modal-content glass-card" style={{ maxWidth: '380px', padding: '24px', position: 'relative' }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', right: '15px', top: '15px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>

        {paymentStep === 'options' && (
          <>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} style={{ color: 'var(--accent-cyan)' }} />
              Safe Advance Payment
            </h3>
            <p className="modal-subtitle" style={{ marginBottom: '15px' }}>Lock the security deposit for your lineup booking.</p>

            {/* Event Cost breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px' }}>
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
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Lock Advance:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>{amount}</span>
              </div>
            </div>

            {/* QR Scanner Display */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ background: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={110} style={{ color: 'black' }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '6px' }}>Scan using any UPI App (GPay / PhonePe / Paytm)</span>
            </div>

            {/* App selectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {['Google Pay', 'PhonePe', 'Paytm'].map((app) => (
                <button
                  key={app}
                  type="button"
                  onClick={() => setSelectedApp(app)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: selectedApp === app ? 'var(--accent-cyan)' : 'var(--glass-border)',
                    background: selectedApp === app ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.01)',
                    color: 'white',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: '0.2s ease'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Smartphone size={16} style={{ color: selectedApp === app ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
                    {app}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: selectedApp === app ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>UPI Payment</span>
                </button>
              ))}
            </div>

            <button 
              type="button" 
              className="btn btn-primary w-full"
              onClick={handlePay}
              style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', boxShadow: '0 4px 15px var(--accent-cyan-glow)' }}
            >
              Confirm UPI Payment <ArrowRight size={14} style={{ marginLeft: '6px' }} />
            </button>
          </>
        )}

        {paymentStep === 'processing' && (
          <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <div className="user-pulse" style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-cyan)', animation: 'pulse 1.5s infinite' }} />
            </div>
            <h3 style={{ color: 'white', fontSize: '1rem', marginTop: '10px' }}>Contacting Bank Servers...</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Securely locking {amount} in safety vault for performance agreement.</p>
          </div>
        )}

        {paymentStep === 'success' && (
          <div style={{ padding: '30px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={32} style={{ color: '#34d399' }} />
            </div>
            <h3 style={{ color: '#34d399', fontSize: '1.2rem' }}>Payment Secured!</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Advance of {amount} is locked in safety escrow.</p>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Redirecting to confirmed bookings board...</span>
          </div>
        )}
      </div>
    </div>
  );
}
