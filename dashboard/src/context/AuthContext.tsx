import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getStoredApiKey,
  getStoredBackendUrl,
  setStoredApiKey,
  setStoredBackendUrl,
  clearStoredAuth,
  apiClient,
} from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  apiKey: string;
  backendUrl: string;
  isOnline: boolean;
  login: (key: string, url?: string) => Promise<boolean>;
  logout: () => void;
  updateBackendUrl: (url: string) => void;
  checkConnection: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string>(() => getStoredApiKey());
  const [backendUrl, setBackendUrlState] = useState<string>(() => getStoredBackendUrl());
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      await apiClient.get('/api/v1/system/health', { timeout: 4000 });
      setIsOnline(true);
      return true;
    } catch {
      try {
        await apiClient.get('/health', { timeout: 4000 });
        setIsOnline(true);
        return true;
      } catch {
        setIsOnline(false);
        return false;
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleUnauthorized = () => {
      // Prompt re-auth if key invalid
      // Only clear if desired or show message
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('phonepilot:online', handleOnline);
    window.addEventListener('phonepilot:offline', handleOffline);
    window.addEventListener('phonepilot:unauthorized', handleUnauthorized);

    // Initial check
    checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('phonepilot:online', handleOnline);
      window.removeEventListener('phonepilot:offline', handleOffline);
      window.removeEventListener('phonepilot:unauthorized', handleUnauthorized);
    };
  }, [checkConnection]);

  const login = async (key: string, url?: string): Promise<boolean> => {
    const cleanKey = key.trim();
    if (url) {
      const cleanUrl = url.replace(/\/+$/, '');
      setStoredBackendUrl(cleanUrl);
      setBackendUrlState(cleanUrl);
    }
    setStoredApiKey(cleanKey);
    setApiKey(cleanKey);

    // Verify key with backend
    try {
      await apiClient.get('/api/v1/system/health', {
        headers: {
          'X-API-Key': cleanKey,
          Authorization: `Bearer ${cleanKey}`,
        },
        timeout: 6000,
      });
      setIsOnline(true);
      return true;
    } catch (err: any) {
      // Even if health check fails due to backend down, save credentials but notify
      if (err.status === 401 || err.status === 403) {
        clearStoredAuth();
        setApiKey('');
        throw new Error('Invalid API key. Please check your credentials.');
      }
      // If server unreachable, we still accept the key (user might be offline)
      setIsOnline(false);
      return true;
    }
  };

  const logout = () => {
    clearStoredAuth();
    setApiKey('');
  };

  const updateBackendUrl = (url: string) => {
    const clean = url.replace(/\/+$/, '');
    setStoredBackendUrl(clean);
    setBackendUrlState(clean);
    checkConnection();
  };

  const isAuthenticated = Boolean(apiKey);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        apiKey,
        backendUrl,
        isOnline,
        login,
        logout,
        updateBackendUrl,
        checkConnection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
