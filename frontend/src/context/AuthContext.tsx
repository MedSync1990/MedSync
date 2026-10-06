import React, { createContext, useContext, useState } from 'react';

export type UserRole =
  | 'Administrator'
  | 'Branch Manager'
  | 'Doctor'
  | 'Receptionist'
  | 'Cashier'
  | 'Patient';

export interface UserProfile {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  roleTitle?: string;
  branchId?: number;
  branchName?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  setUser: () => { },
  setToken: () => { },
  logout: () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.role) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse current_user from localStorage', e);
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(null);

  const setUser = (newUser: UserProfile | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('current_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('current_user');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const cleanedBase = rawBase.replace(/\/+$/, '');
    const apiBase = cleanedBase.endsWith('/api/v1') ? cleanedBase : `${cleanedBase}/api/v1`;
    fetch(`${apiBase}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => { });
  };

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
