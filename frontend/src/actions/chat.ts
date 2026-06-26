'use server';

import { serverFetch, handleUnauthorized } from '@/lib/server-api';
import { redirect } from 'next/navigation';

export async function fetchUsersAction(page: number) {
  try {
    const response = await serverFetch(`/users?page=${page}`, {
      method: 'GET',
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      return { error: 'Failed to fetch users' };
    }

    return await response.json();
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function startDirectConversationAction(userId: number) {
  let conversationId = null;

  try {
    const response = await serverFetch('/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });

    await handleUnauthorized(response);

    if (response.ok) {
      const data = await response.json();
      conversationId = data.conversation.id;
    }
  } catch (error) {
    console.error(error);
  }

  if (conversationId) {
    // Note: redirect must be called outside try/catch block 
    // because it throws a special Next.js error
    redirect(`/chat/${conversationId}`);
  }
  
  return { error: 'Failed to start conversation' };
}

export async function sendMessageAction(conversationId: number, content: string) {
  try {
    const response = await serverFetch(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to send message' };
    }

    // Refresh the chat page data
    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/[locale]/chat/${conversationId}`, 'page');

    return { success: true };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}
