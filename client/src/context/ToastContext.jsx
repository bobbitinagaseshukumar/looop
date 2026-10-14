import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, variant = 'success', duration = 3500 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, title, message, variant };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const iconMap = {
    success: <CheckCircle2 size={18} color="var(--color-success)" />,
    warning: <AlertTriangle size={18} color="var(--color-warning)" />,
    danger: <AlertCircle size={18} color="var(--color-danger)" />,
    info: <Info size={18} color="var(--color-info)" />
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '380px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              backgroundColor: '#ffffff',
              color: 'var(--color-slate-800)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-slate-200)',
              boxShadow: 'var(--shadow-xl)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              pointerEvents: 'auto',
              animation: 'scaleUp 200ms ease-out'
            }}
          >
            <div style={{ marginTop: '2px', flexShrink: 0 }}>
              {iconMap[toast.variant] || iconMap.info}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                  {toast.title}
                </div>
              )}
              {toast.message && (
                <div style={{ fontSize: '0.825rem', color: 'var(--color-slate-600)', marginTop: '2px' }}>
                  {typeof toast.message === 'string' && toast.message !== '[object Object]'
                    ? toast.message
                    : (typeof toast.message === 'object'
                        ? (toast.message.message || toast.message.text || toast.message.error || JSON.stringify(toast.message))
                        : 'Please check your inputs and try again.')}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-slate-400)',
                padding: '2px'
              }}
              aria-label="Dismiss toast"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
