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

  const resetPinRequest = async (username: string, mobile: string) => {
    const res = await fetch(`${API_BASE}/auth/reset-pin-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, mobile }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  const login = async (username: string, pin: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
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
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  const fetchWithAuth = async (url: string, options: any = {}) => {
    if (!token || token === 'null') {
      logout();
      throw new Error("Session expired");
    }

    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (res.status === 401 || res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data.error && (data.error.includes("Access Denied") || data.error.includes("view-only") || data.error.includes("reserved for Shop Owners"))) {
        throw new Error(data.error);
      }
      logout();
      throw new Error(data.error || "Session expired");
    }
    
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, updateUser, fetchWithAuth }}>
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
