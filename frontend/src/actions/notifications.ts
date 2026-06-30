'use server';

import { serverFetch, handleUnauthorized } from '@/lib/server-api';

export async function fetchNotificationsAction(page: number = 1, unreadOnly: boolean = false) {
  try {
    const url = `/notifications?per_page=20&unread_only=${unreadOnly}`;
    const response = await serverFetch(url, { method: 'GET' });

    await handleUnauthorized(response);

    if (!response.ok) {
      return { error: 'Failed to fetch notifications' };
    }

    return await response.json();
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function fetchUnreadCountAction() {
  try {
    const response = await serverFetch('/notifications/unread_count', { method: 'GET' });

    await handleUnauthorized(response);

    if (!response.ok) {
      return { count: 0 };
    }

    return await response.json();
  } catch (error) {
    return { count: 0 };
  }
}

export async function markNotificationReadAction(id: number) {
  try {
    const response = await serverFetch(`/notifications/${id}/read`, { method: 'PATCH' });

    await handleUnauthorized(response);

    if (!response.ok) {
      return { error: 'Failed to mark notification as read' };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const response = await serverFetch('/notifications/read_all', { method: 'POST' });

    await handleUnauthorized(response);

    if (!response.ok) {
      return { error: 'Failed to mark all as read' };
    }

    return await response.json();
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function deleteNotificationAction(id: number) {
  try {
    const response = await serverFetch(`/notifications/${id}`, { method: 'DELETE' });

    await handleUnauthorized(response);

    if (!response.ok) {
      return { error: 'Failed to delete notification' };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}
