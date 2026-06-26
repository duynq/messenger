import { serverFetch } from '@/lib/server-api';
import type { User } from '@/components/providers/AuthProvider';

export async function getSessionUser(): Promise<User | null> {
  try {
    const response = await serverFetch('/dashboard');
    if (response.ok) {
      const data = await response.json();
      return data.user as User;
    }
    return null;
  } catch {
    return null;
  }
}
