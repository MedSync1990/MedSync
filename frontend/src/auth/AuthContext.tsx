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

// Default mock user profile so team members can immediately test their pages
const defaultTestUser: UserProfile = {
  id: 1,
  username: 'kbandara',
  firstName: 'K.',
  lastName: 'Bandara',
  role: 'Doctor',
  roleTitle: 'Doctor · Cardiology Specialist',
  branchId: 1,
  branchName: 'Colombo Central Branch',
  avatarUrl:
    'https://lh3.googleusercontent.com/aida/AEtjO1UPm4HIqPc1W2Y65YJx_yxzYAHERJFf3_-X65GsvCxTOQQ1inOEDRiHZEfkVkylhn-qm7fWHjIv7nF6AjefK6Qiz2lGNxehmhXjRt64nMIzQz7AEoccFb97Je4Ah1-qdXeeF36IUZBCJBRG7dvmGIaZ2QJY9jpx0W_gTQIItFWRoo1FJ6k2i5rm8Lho7aGj6nOOxKMqctzo-ieNcpglyhGz9Im7tfaCbM1ucgtaXLndm09DRHOSMR-EGp82snLCU4nOsJt9fuxooz4',
};

const AuthContext = createContext<AuthContextType>({
  user: defaultTestUser,
  token: 'mock-jwt-token',
  setUser: () => {},
  setToken: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(defaultTestUser);
  const [token, setToken] = useState<string | null>('mock-jwt-token');

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
