import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/auth/status');
      if (response.data.authenticated && response.data.user) {
        setIsAuthenticated(true);
        setUser(response.data.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = '/api/auth/slack';
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Helper functions to check permissions
  const isAdmin = () => user?.is_admin === true;
  const isManager = () => user?.is_manager === true || user?.is_admin === true;
  const canManageUsers = () => user?.is_admin === true;

  // Can view a specific user's data (would need to verify on backend too)
  const canViewUser = (targetUserId) => {
    if (!user) return false;
    // Admins can see everyone
    if (user.is_admin) return true;
    // Users can see themselves
    if (user.id === targetUserId) return true;
    // Managers can see their team (but we'd need team info to verify here)
    // This should always be verified on the backend
    return user.is_manager;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      login,
      logout,
      isAdmin,
      isManager,
      canManageUsers,
      canViewUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
