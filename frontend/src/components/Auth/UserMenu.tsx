import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './Auth.css';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

interface UserMenuProps {
  user: User;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and dispatch logout action
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      dispatch({ type: 'auth/logout' });
      setIsOpen(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'operator': return 'Operator';
      case 'viewer': return 'Viewer';
      default: return role;
    }
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button 
        className="user-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>{user.username}</span>
        <span>▼</span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-info">
            <strong>{user.username}</strong><br />
            <span>{user.email}</span><br />
            <span>{getRoleDisplayName(user.role)}</span>
          </div>
          
          <div className="user-menu-divider" />
          
          <button 
            className="user-menu-item"
            onClick={() => {
              setIsOpen(false);
              // TODO: Open profile modal
            }}
          >
            Profile Settings
          </button>
          
          <button 
            className="user-menu-item"
            onClick={() => {
              setIsOpen(false);
              // TODO: Open change password modal
            }}
          >
            Change Password
          </button>
          
          <button 
            className="user-menu-item"
            onClick={() => {
              setIsOpen(false);
              // TODO: Open sessions management
            }}
          >
            Active Sessions
          </button>
          
          <div className="user-menu-divider" />
          
          <button 
            className="user-menu-item"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};