'use client';

import { createConsumer, type Consumer } from '@rails/actioncable';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createCableTicketAction } from '@/actions/cable';

const CableContext = createContext<Consumer | null>(null);

function cableUrl(ticket: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const configuredUrl = process.env.NEXT_PUBLIC_WS_URL
    || `${apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')}/cable`;
  const url = new URL(configuredUrl);
  url.searchParams.set('ticket', ticket);
  return url.toString();
}

export function CableProvider({
  authenticated,
  children,
}: {
  authenticated: boolean;
  children: React.ReactNode;
}) {
  const [consumer, setConsumer] = useState<Consumer | null>(null);

  useEffect(() => {
    if (!authenticated) {
      setConsumer(null);
      return;
    }

    let cancelled = false;
    let activeConsumer: Consumer | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = (expiresIn: number, refresh: () => Promise<void>) => {
      const refreshInMs = Math.max((expiresIn - 30) * 1000, 30_000);
      refreshTimer = setTimeout(() => void refresh(), refreshInMs);
    };

    const connect = async () => {
      const result = await createCableTicketAction();
      if (cancelled || 'error' in result) return;

      let currentTicket = result.ticket;
      activeConsumer = createConsumer(() => cableUrl(currentTicket));
      setConsumer(activeConsumer);

      const refreshTicket = async () => {
        const refreshed = await createCableTicketAction();
        if (cancelled) return;

        if ('error' in refreshed) {
          refreshTimer = setTimeout(() => void refreshTicket(), 30_000);
          return;
        }

        currentTicket = refreshed.ticket;
        scheduleRefresh(refreshed.expiresIn, refreshTicket);
      };

      scheduleRefresh(result.expiresIn, refreshTicket);
    };

    void connect();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      activeConsumer?.disconnect();
      setConsumer(null);
    };
  }, [authenticated]);

  return <CableContext.Provider value={consumer}>{children}</CableContext.Provider>;
}

export function useCable(): Consumer | null {
  return useContext(CableContext);
}
