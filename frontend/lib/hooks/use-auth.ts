'use client';

import { useState, useEffect } from 'react';
import api from '../api';

interface User {
  id: string;
  email: string;
  roles: string[];
  emailVerified: boolean;
  profileImageUrl?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some((role) => hasRole(role));
  };

  const logout = async (redirectTo?: string) => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors on logout
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      
      // Build logout URL with redirect parameter if provided
      let logoutUrl = '/login';
      if (redirectTo) {
        // Validate redirect URL to prevent open redirects
        if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
          logoutUrl = `/login?redirect=${encodeURIComponent(redirectTo)}`;
        }
      }
      
      window.location.href = logoutUrl;
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    logout,
    refresh: checkAuth,
  };
}
