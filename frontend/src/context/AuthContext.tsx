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

const defaultTestUser: UserProfile = {
  id: 1,
  username: 'receptionist',
  firstName: 'Sarah',
  lastName: 'Perera',
  role: 'Receptionist',
  roleTitle: 'Receptionist Portal',
  branchId: 1,
  branchName: 'Colombo Central Branch',
  avatarUrl:
    'https://lh3.googleusercontent.com/aida/AEtjO1UPm4HIqPc1W2Y65YJx_yxzYAHERJFf3_-X65GsvCxTOQQ1inOEDRiHZEfkVkylhn-qm7fWHjIv7nF6AjefK6Qiz2lGNxehmhXjRt64nMIzQz7AEoccFb97Je4Ah1-qdXeeF36IUZBCJBRG7dvmGIaZ2QJY9jpx0W_gTQIItFWRoo1FJ6k2i5rm8Lho7aGj6nOOxKMqctzo-ieNcpglyhGz9Im7tfaCbM1ucgtaXLndm09DRHOSMR-EGp82snLCU4nOsJt9fuxooz4',
};

const AuthContext = createContext<AuthContextType>({
  user: defaultTestUser,
  token: 'mock-jwt-token',
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
    return defaultTestUser;
  });
  const [token, setToken] = useState<string | null>('mock-jwt-token');

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
