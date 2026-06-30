'use client';

import React from 'react';

type User = {
  id: number;
  full_name: string;
  avatar_url?: string;
};

type GroupAvatarProps = {
  conversation: {
    is_group: boolean;
    avatar_url?: string;
    users: User[];
  };
  currentUser?: { id?: number };
  className?: string;
};

export function GroupAvatar({ conversation, currentUser, className = "w-10 h-10" }: GroupAvatarProps) {
  const { is_group, avatar_url, users } = conversation;

  // For 1-on-1 conversations, display the other user's avatar
  if (!is_group) {
    const otherUser = users.find(u => u.id !== currentUser?.id) || users[0];
    if (otherUser?.avatar_url) {
      return (
        <div className={`rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 relative overflow-hidden ${className}`}>
          <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
        </div>
      );
    }
    const initial = (otherUser?.full_name || '?')[0]?.toUpperCase();
    return (
      <div className={`rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 relative ${className}`}>
        <span className="font-semibold text-lg">{initial}</span>
      </div>
    );
  }

  // For group conversations
  if (avatar_url) {
    return (
      <div className={`rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 relative overflow-hidden ${className}`}>
        <img src={avatar_url} alt="group avatar" className="w-full h-full object-cover" />
      </div>
    );
  }

  // Collage initials for group without avatar
  // Get 2-3 members (exclude current user if possible)
  const otherMembers = users.filter(u => u.id !== currentUser?.id);
  const displayMembers = otherMembers.length >= 2 ? otherMembers.slice(0, 3) : users.slice(0, 3);

  return (
    <div className={`rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 relative overflow-hidden ${className}`}>
      {displayMembers.length === 1 ? (
        <span className="font-semibold text-lg">{displayMembers[0]?.full_name[0]?.toUpperCase()}</span>
      ) : displayMembers.length === 2 ? (
        <div className="flex w-full h-full">
          <div className="w-1/2 h-full bg-indigo-500/30 flex items-center justify-center border-r border-background">
            <span className="text-xs font-semibold">{displayMembers[0]?.full_name[0]?.toUpperCase()}</span>
          </div>
          <div className="w-1/2 h-full bg-indigo-600/30 flex items-center justify-center">
            <span className="text-xs font-semibold">{displayMembers[1]?.full_name[0]?.toUpperCase()}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full h-full">
          <div className="w-full h-1/2 bg-indigo-500/30 flex items-center justify-center border-b border-background">
            <span className="text-[10px] font-semibold leading-none">{displayMembers[0]?.full_name[0]?.toUpperCase()}</span>
          </div>
          <div className="flex w-full h-1/2">
            <div className="w-1/2 h-full bg-indigo-600/30 flex items-center justify-center border-r border-background">
              <span className="text-[10px] font-semibold leading-none">{displayMembers[1]?.full_name[0]?.toUpperCase()}</span>
            </div>
            <div className="w-1/2 h-full bg-indigo-700/30 flex items-center justify-center">
              <span className="text-[10px] font-semibold leading-none">{displayMembers[2]?.full_name[0]?.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
