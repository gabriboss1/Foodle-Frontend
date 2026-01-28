import React, { useState, useEffect, useCallback } from 'react';

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'error', duration: number = 3000) => {
    const id = Date.now().toString();
    const newToast: ToastProps = { id, message, type, duration };
    
    // Remove any existing toast first (like in original code)
    setToasts([newToast]);
    
    // Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: ToastProps[] }> = ({ toasts }) => {
  return (
    <div className="fixed left-1/2 top-8 z-50 transform -translate-x-1/2 transition-all duration-300">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const getToastClasses = () => {
    const baseClasses = "rounded-xl px-6 py-3 shadow-lg font-medium text-sm flex items-center space-x-2 animate-fade-in-down";
    const colorClasses = {
      error: "bg-red-500 text-white",
      success: "bg-green-500 text-white", 
      info: "bg-blue-500 text-white"
    };
    
    return `${baseClasses} ${colorClasses[type]}`;
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      case 'error':
      default:
        return '⚠️';
    }
  };

  return (
    <div className={getToastClasses()}>
      <span>{getIcon()}</span>
      <span>{message}</span>
    </div>
  );
};
