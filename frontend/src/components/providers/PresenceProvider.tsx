'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useCable } from '@/components/providers/CableProvider';

interface UserPresence {
  isOnline: boolean;
  lastSeenAt: string | null;
}

interface PresenceContextType {
  presenceMap: Record<number, UserPresence>;
  getUserPresence: (userId: number, initialIsOnline?: boolean, initialLastSeenAt?: string | null) => UserPresence;
}

const PresenceContext = createContext<PresenceContextType>({
  presenceMap: {},
  getUserPresence: () => ({ isOnline: false, lastSeenAt: null })
});

export const usePresence = () => useContext(PresenceContext);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [presenceMap, setPresenceMap] = useState<Record<number, UserPresence>>({});
  const cable = useCable();

  useEffect(() => {
    if (!cable) return;

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
    };
  }, [cable]);

  const getUserPresence = (userId: number, initialIsOnline?: boolean, initialLastSeenAt?: string | null): UserPresence => {
    return presenceMap[userId] || { isOnline: initialIsOnline || false, lastSeenAt: initialLastSeenAt || null };
  };

  return (
    <PresenceContext.Provider value={{ presenceMap, getUserPresence }}>
      {children}
    </PresenceContext.Provider>
  );
}
