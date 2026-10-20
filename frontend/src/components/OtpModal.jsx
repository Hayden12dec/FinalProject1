import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Mail,
  RefreshCw,
  AlertCircle,
  X,
  ArrowRight,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function OtpModal({
  isOpen,
  email,
  demoOtp,
  role = 'student',
  onVerify,
  onResend,
  onClose,
  isVerifying = false,
  error = null
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [localError, setLocalError] = useState(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setLocalError(null);
      setResendCooldown(60);
      // Auto-focus first input
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer;
    if (isOpen && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

  if (!isOpen) return null;

  const handleDigitChange = (index, value) => {
    setLocalError(null);
    // Support typing numbers
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // If pasted multiple digits
    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split('');
      const newDigits = [...digits];
      pasted.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setDigits(newDigits);
      const nextIdx = Math.min(5, index + pasted.length);
      if (inputRefs.current[nextIdx]) {
        inputRefs.current[nextIdx].focus();
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal.slice(-1);
    setDigits(newDigits);

    // Auto-advance to next input
    if (index < 5 && cleanVal) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setLocalError(null);
    try {
      await onResend();
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setLocalError(err.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const fullOtp = digits.join('');
    if (fullOtp.length < 6) {
      setLocalError('Please enter the full 6-digit verification code.');
      return;
    }
    onVerify(fullOtp);
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(10, 15, 29, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.25rem',
          position: 'relative',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isVerifying}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '8px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '0.85rem',
              borderRadius: '14px',
              background:
                role === 'admin'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(59, 130, 246, 0.15)',
              color: role === 'admin' ? '#f59e0b' : '#3b82f6',
              marginBottom: '1rem',
              border:
                role === 'admin'
                  ? '1px solid rgba(245, 158, 11, 0.3)'
                  : '1px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            <ShieldCheck size={32} />
          </div>

          <h3
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem 0'
            }}
          >
            Email OTP Verification
          </h3>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            Enter the 6-digit authentication code sent to
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginTop: '0.35rem',
              fontSize: '0.92rem',
              fontWeight: 600,
              color: role === 'admin' ? '#fbbf24' : '#60a5fa',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '0.25rem 0.75rem',
              borderRadius: '6px'
            }}
          >
            <Mail size={14} />
            <span>{email}</span>
          </div>

          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginTop: '0.5rem',
              marginBottom: 0
            }}
          >
            Please check your email inbox (including Spam/Junk folder) for the 6-digit code.
          </p>
        </div>

        {/* Error Notification */}
        {(error || localError) && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error || localError}</span>
          </div>
        )}

        {/* 6 Digit Inputs */}
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.6rem',
              marginBottom: '1.5rem'
            }}
          >
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isVerifying}
                style={{
                  width: '48px',
                  height: '56px',
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: digit
                    ? role === 'admin'
                      ? '2px solid #f59e0b'
                      : '2px solid #3b82f6'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
              />
            ))}
          </div>

          {/* Submit Verification Button */}
          <button
            type="submit"
            disabled={!isComplete || isVerifying}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderRadius: '10px',
              backgroundColor:
                role === 'admin' ? '#f59e0b' : '#3b82f6',
              borderColor:
                role === 'admin' ? '#f59e0b' : '#3b82f6',
              opacity: !isComplete || isVerifying ? 0.6 : 1,
              cursor: !isComplete || isVerifying ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {isVerifying ? (
              <>
                <RefreshCw size={18} className="spin" />
                <span>Verifying & Registering...</span>
              </>
            ) : (
              <>
                <span>Confirm & Complete Registration</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Resend OTP Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              paddingTop: '0.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={14} />
              Valid for 10 minutes
            </span>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending || isVerifying}
              style={{
                background: 'none',
                border: 'none',
                color:
                  resendCooldown > 0
                    ? 'var(--text-muted)'
                    : role === 'admin'
                    ? '#f59e0b'
                    : '#60a5fa',
                cursor: resendCooldown > 0 || resending ? 'default' : 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              {resending ? (
                <>
                  <RefreshCw size={13} className="spin" /> Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend code in ${resendCooldown}s`
              ) : (
                'Resend Code'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
