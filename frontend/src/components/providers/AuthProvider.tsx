'use client';

import React, { createContext, useContext, ReactNode } from 'react';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url?: string;
  is_online?: boolean;
  last_seen_at?: string;
}

interface AuthContextType {
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({ user: null });

interface AuthProviderProps {
  user: User | null;
  children: ReactNode;
}

export function AuthProvider({ user, children }: AuthProviderProps) {
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useUser() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  return context.user;
}
