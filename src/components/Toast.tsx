import React from 'react';
import './Toast.css';

export type ToastType = 'error' | 'success' | 'info';

export type ToastMessage = {
  id: string;
  message: string;
  type: ToastType;
};

type Props = {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
};

export function Toast({ toasts, onDismiss }: Props) {
  React.useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    toasts.forEach(toast => {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, 5000); // Auto dismiss after 5 seconds
      timers.push(timer);
    });
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast toast-${toast.type}`}
          onClick={() => onDismiss(toast.id)}
        >
          <div className="toast-content">
            <div className="toast-icon">
              {toast.type === 'error' && '⚠️'}
              {toast.type === 'success' && '✓'}
              {toast.type === 'info' && 'ℹ'}
            </div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button 
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(toast.id);
            }}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

