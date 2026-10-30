/**
 * @module contexts/AuthContext
 * @description Authentication context providing login/logout, token management,
 * and user role information throughout the app.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext(null);

/**
 * AuthProvider wraps the app and provides authentication state and actions.
 * On mount it checks for an existing JWT token and validates it against
 * the `/api/auth/me` endpoint.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('zebra_token'));
  const [loading, setLoading] = useState(true);

  /* Validate existing token on mount */
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('zebra_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/api/auth/me');
        setUser(data.user || data);
        setToken(storedToken);
      } catch {
        localStorage.removeItem('zebra_token');
        localStorage.removeItem('zebra_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  /**
   * Authenticates a user with username and password.
   * Stores the JWT token and user object on success.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>} The authenticated user object
   */
  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/api/auth/login', { username, password });
    const jwt = data.token;
    const userData = data.user;
    localStorage.setItem('zebra_token', jwt);
    localStorage.setItem('zebra_user', JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
    return userData;
  }, []);

  /**
   * Logs the user out by clearing token and user state.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('zebra_token');
    localStorage.removeItem('zebra_user');
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Checks whether the current user has one of the given roles.
   * @param {string[]} roles - Allowed role names
   * @returns {boolean}
   */
  const hasRole = useCallback(
    (...roles) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the auth context.
 * @returns {{ user: Object, token: string, loading: boolean, isAuthenticated: boolean, login: Function, logout: Function, hasRole: Function }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
