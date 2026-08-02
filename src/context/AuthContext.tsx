import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  user: any | null;
  login: (username: string, pin: string) => Promise<any>;
  register: (userData: any) => Promise<any>;
  logout: () => void;
  updateUser: (userData: any) => void;
  resetPinRequest: (username: string, mobile: string) => Promise<any>;
  fetchWithAuth: (url: string, options?: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = '/api';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem('token');
    return t === 'null' || t === 'undefined' ? null : t;
  });
  const [user, setUser] = useState<any>(() => {
    const u = localStorage.getItem('user');
    try {
      return u && u !== 'null' && u !== 'undefined' ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData: any) => {
    const newUser = { ...user, ...userData };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const parseJsonResponse = async (res: Response) => {
    const contentType = res.headers.get('content-type') || '';
    let data: any = {};
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => ({}));
    } else {
      const text = await res.text().catch(() => '');
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }
    }

    if (!res.ok) {
      let message = typeof data.error === 'string' ? data.error : '';

      // Strip any raw HTML tags, status codes, or generic headers
      if (message) {
        message = message
          .replace(/<[^>]*>/g, '')
          .replace(/^403\s*Forbidden\s*:?\s*/gi, '')
          .replace(/^401\s*Unauthorized\s*:?\s*/gi, '')
          .replace(/^Access\s*Forbidden\s*(\(403\))?:?\s*/gi, '')
          .replace(/^Authentication\s*Failed\s*(\(401\))?:?\s*/gi, '')
          .trim();
      }

      if (!message) {
        if (res.status === 403) {
          message = "Your account is pending administrator approval or disabled. Please contact your administrator.";
        } else if (res.status === 401) {
          message = "Invalid username or PIN, or your session has expired. Please log in again.";
        } else if (res.status === 404) {
          message = "The requested server endpoint or account was not found.";
        } else if (res.status === 429) {
          message = "Rate limit exceeded. Please wait a few minutes before trying again.";
        } else if (res.status >= 500) {
          message = "The server encountered an issue. Please try again shortly.";
        } else {
          message = `Request failed (${res.status} ${res.statusText || 'Error'})`;
        }
      }

      throw new Error(message);
    }

    return data;
  };

  const resetPinRequest = async (username: string, mobile: string) => {
    const res = await fetch(`${API_BASE}/auth/reset-pin-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, mobile }),
    });
    return await parseJsonResponse(res);
  };

  const login = async (username: string, pin: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });
    const data = await parseJsonResponse(res);
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (userData: any) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return await parseJsonResponse(res);
  };

  const fetchWithAuth = async (url: string, options: any = {}) => {
    if (!token || token === 'null') {
      logout();
      throw new Error("Session expired. Please log in again.");
    }

    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    try {
      const data = await parseJsonResponse(res);
      return data;
    } catch (err: any) {
      if (res.status === 401) {
        logout();
      }
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, updateUser, resetPinRequest, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
