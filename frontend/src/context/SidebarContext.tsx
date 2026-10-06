import React, { createContext, useContext, useState } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setIsCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('medsync_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    try {
      localStorage.setItem('medsync_sidebar_collapsed', String(collapsed));
    } catch {
      // Ignore storage errors
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      isCollapsed: false,
      toggleSidebar: () => {},
      setIsCollapsed: () => {},
    };
  }
  return context;
};
