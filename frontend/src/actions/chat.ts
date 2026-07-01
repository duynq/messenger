'use server';

import { serverFetch, handleUnauthorized } from '@/lib/server-api';
import { redirect } from 'next/navigation';

export async function fetchUsersAction(page: number, q?: string) {
  try {
    const url = q ? `/users?page=${page}&q=${encodeURIComponent(q)}` : `/users?page=${page}`;
    const response = await serverFetch(url, {
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

export async function sendMessageAction(conversationId: number, formData: FormData) {
  try {
    const response = await serverFetch(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: formData,
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

export async function createGroupAction(name: string, userIds: number[]) {
  let conversationId = null;

  try {
    const response = await serverFetch('/conversations/group', {
      method: 'POST',
      body: JSON.stringify({ name, user_ids: userIds }),
    });

    await handleUnauthorized(response);

    if (response.ok) {
      const data = await response.json();
      conversationId = data.conversation.id;
    } else {
      const data = await response.json();
      return { error: data.error || 'Failed to create group' };
    }
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }

  if (conversationId) {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/[locale]/dashboard', 'page');
    redirect(`/chat/${conversationId}`);
  }

  return { error: 'Failed to create group' };
}

export async function addParticipantAction(conversationId: number, userId: number) {
  try {
    const response = await serverFetch(`/conversations/${conversationId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to add participant' };
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/[locale]/chat/${conversationId}`, 'page');

    return { success: true };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function removeParticipantAction(conversationId: number, userId: number) {
  try {
    const response = await serverFetch(`/conversations/${conversationId}/participants/${userId}`, {
      method: 'DELETE',
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to remove participant' };
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/[locale]/chat/${conversationId}`, 'page');

    return { success: true };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function deleteMessageAction(conversationId: number, messageId: number) {
  try {
    const response = await serverFetch(`/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to delete message' };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function updateMessageAction(conversationId: number, messageId: number, content: string) {
  try {
    const response = await serverFetch(`/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ message: { content } }),
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to update message' };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function reactToMessageAction(conversationId: number, messageId: number, emoji: string) {
  try {
    const response = await serverFetch(`/conversations/${conversationId}/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to add reaction' };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function updateGroupAvatarAction(conversationId: number, formData: FormData) {
  try {
    const response = await serverFetch(`/conversations/${conversationId}`, {
      method: 'PATCH',
      body: formData,
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to update group avatar' };
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/[locale]/chat/${conversationId}`, 'page');
    revalidatePath('/[locale]/dashboard', 'page');

    return { success: true };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function muteConversationAction(conversationId: number) {
  try {
    const response = await serverFetch(`/conversations/${conversationId}/mute`, {
      method: 'POST',
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to mute conversation' };
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/[locale]/chat/${conversationId}`, 'page');

    return { success: true, muted: true };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}

export async function unmuteConversationAction(conversationId: number) {
  try {
    const response = await serverFetch(`/conversations/${conversationId}/mute`, {
      method: 'DELETE',
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to unmute conversation' };
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/[locale]/chat/${conversationId}`, 'page');

    return { success: true, muted: false };
  } catch (error) {
    return { error: 'Unexpected error occurred' };
  }
}
