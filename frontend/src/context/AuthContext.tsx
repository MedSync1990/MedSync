import { getMe, logout as logoutSession } from '../api/auth';
import React, { createContext, useContext, useState, useRef } from 'react';

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
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  setUser: () => { },
  setToken: () => { },
  logout: async () => { },
  isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionVersion = useRef(0);
  const [token, setToken] = useState<string | null>(null);

  const setUser = (newUser: UserProfile | null) => {
    sessionVersion.current += 1;
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('current_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('current_user');
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    // Only report success once the browser has received the cookie deletion.
    await logoutSession();
  };

  React.useEffect(() => {
    const handleUnauthorized = () => {
      // Token expired or invalid, log out automatically
      setUser(null);
      setToken(null);
    };

    const version = sessionVersion.current;
    let active = true;
    localStorage.removeItem('current_user');
    getMe()
      .then((data) => {
        if (active && version === sessionVersion.current && data) {
          setUserState((prev) => {
            const updated: UserProfile = {
              id: data.user_id,
              username: data.username,
              firstName: data.first_name || '',
              lastName: data.last_name || '',
              role: data.role as UserRole,
              roleTitle: `${data.role} Portal`,
              branchId: data.branch_id ?? undefined,
              branchName: data.branch_name || prev?.branchName || (data.branch_id ? `Branch #${data.branch_id}` : 'Central Branch'),
              mustChangePassword: Boolean(data.must_change_password),
            };
            localStorage.setItem('current_user', JSON.stringify(updated));
            return updated;
          });
        }
      })
      .catch(() => {
        if (active && version === sessionVersion.current) setUserState(null);
      })
      .finally(() => { if (active) setIsLoading(false); });

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      active = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
