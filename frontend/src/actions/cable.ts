'use server';

import { serverFetch } from '@/lib/server-api';

export type CableTicketResult =
  | { ticket: string; expiresIn: number }
  | { error: string };

export async function createCableTicketAction(): Promise<CableTicketResult> {
  try {
    const response = await serverFetch('/cable_ticket', { method: 'POST' });

    if (!response.ok) {
      return { error: 'Unable to authorize the realtime connection' };
    }

    const data = await response.json() as { ticket?: string; expires_in?: number };
    if (!data.ticket || !data.expires_in) {
      return { error: 'Invalid realtime authorization response' };
    }

    return { ticket: data.ticket, expiresIn: data.expires_in };
  } catch {
    return { error: 'Unable to authorize the realtime connection' };
  }
}
