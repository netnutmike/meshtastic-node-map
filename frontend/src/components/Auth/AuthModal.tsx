import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import './Auth.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  initialMode = 'login' 
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSuccess = () => {
    if (mode === 'register') {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setMode('login');
      }, 2000);
    } else {
      onClose();
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal">
        <button 
          className="auth-modal-close" 
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        
        {showSuccess ? (
          <div className="auth-form">
            <div className="success-message">
              Account created successfully! You can now sign in.
            </div>
          </div>
        ) : mode === 'login' ? (
          <LoginForm 
            onSuccess={handleSuccess}
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterForm 
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
};