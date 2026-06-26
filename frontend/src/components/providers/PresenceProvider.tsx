'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createConsumer } from '@rails/actioncable';

interface UserPresence {
  isOnline: boolean;
  lastSeenAt: string | null;
}

interface PresenceContextType {
  presenceMap: Record<number, UserPresence>;
  getUserPresence: (userId: number) => UserPresence;
}

const PresenceContext = createContext<PresenceContextType>({
  presenceMap: {},
  getUserPresence: () => ({ isOnline: false, lastSeenAt: null })
});

export const usePresence = () => useContext(PresenceContext);

export function PresenceProvider({ children, token }: { children: ReactNode; token?: string }) {
  const [presenceMap, setPresenceMap] = useState<Record<number, UserPresence>>({});

  useEffect(() => {
    if (!token) return;

    // Use ws:// or wss:// based on current protocol, or hardcode fallback
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/cable';
    const cable = createConsumer(`${wsUrl}?token=${token}`);

    const subscription = cable.subscriptions.create('PresenceChannel', {
      connected() {
        console.log('Connected to PresenceChannel');
      },
      disconnected() {
        console.log('Disconnected from PresenceChannel');
      },
      received(data: { user_id: number; status: 'online' | 'offline'; last_seen_at?: string }) {
        setPresenceMap(prev => ({
          ...prev,
          [data.user_id]: {
            isOnline: data.status === 'online',
            lastSeenAt: data.last_seen_at || null
          }
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
      cable.disconnect();
    };
  }, [token]);

  const getUserPresence = (userId: number): UserPresence => {
    return presenceMap[userId] || { isOnline: false, lastSeenAt: null };
  };

  return (
    <PresenceContext.Provider value={{ presenceMap, getUserPresence }}>
      {children}
    </PresenceContext.Provider>
  );
}
