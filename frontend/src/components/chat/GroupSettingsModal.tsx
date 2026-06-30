'use client';

import React, { useState, useTransition } from 'react';
import { X, Settings2, UserPlus, UserMinus, Loader2, LogOut, Search, ChevronDown } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { addParticipantAction, removeParticipantAction, updateGroupAvatarAction } from '@/actions/chat';
import { toast } from 'sonner';
import { GroupAvatar } from './GroupAvatar';

interface ConversationUser {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export interface GroupConversation {
  id: number;
  is_group: boolean;
  name: string;
  admin_id: number;
  users: ConversationUser[];
  avatar_url?: string;
}

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: GroupConversation;
  currentUser: { id?: number; email: string };
  availableUsers: { id: number; full_name: string; email: string }[];
}

export function GroupSettingsModal({ isOpen, onClose, conversation, currentUser, availableUsers }: GroupSettingsModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<number | ''>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [usersList, setUsersList] = useState(availableUsers);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  if (!isOpen || !conversation.is_group) return null;

  const isAdmin = currentUser.id === conversation.admin_id;
  const currentMemberIds = conversation.users.map((u) => u.id);
  const usersToAdd = usersList.filter(u => !currentMemberIds.includes(u.id));
  
  const filteredUsersToAdd = usersToAdd.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 10 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      
      try {
        const { fetchUsersAction } = await import('@/actions/chat');
        const data = await fetchUsersAction(nextPage);
        
        if (data.users && data.users.length > 0) {
          setUsersList(prev => {
            const newUsers = data.users.filter((newUser: {id: number, full_name: string, email: string}) => !prev.some(u => u.id === newUser.id));
            return [...prev, ...newUsers];
          });
          setPage(nextPage);
          setHasMore(data.meta?.has_next ?? false);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Failed to fetch more users", error);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  const handleAddMember = () => {
    if (!selectedUserToAdd) return;
    
    startTransition(async () => {
      const result = await addParticipantAction(conversation.id, Number(selectedUserToAdd));
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Member added successfully");
        setSelectedUserToAdd('');
      }
    });
  };

  const handleRemoveMember = (userId: number) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    
    startTransition(async () => {
      const result = await removeParticipantAction(conversation.id, userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Member removed successfully");
      }
    });
  };

  const handleLeaveGroup = () => {
    if (!currentUser.id) return;
    if (!confirm("Are you sure you want to leave this group?")) return;

    startTransition(async () => {
      const result = await removeParticipantAction(conversation.id, currentUser.id!);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("You have left the group");
        // Navigation will be handled by revalidatePath in Server Action, but client might need explicit redirect
        window.location.href = '/dashboard';
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-brand-400" />
            Group Info
          </h2>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col flex-1 min-h-0 overflow-y-auto">
          <div className="mb-6 text-center flex flex-col items-center">
            <div
              className={`relative mb-3 ${isAdmin ? 'cursor-pointer group' : ''}`}
              onClick={() => isAdmin && fileInputRef.current?.click()}
            >
              <GroupAvatar conversation={conversation} currentUser={currentUser} className="w-20 h-20 text-2xl" />
              {isAdmin && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center rounded-full transition-opacity">
                  {isUploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Settings2 className="w-5 h-5 text-white" />}
                </div>
              )}
            </div>

            {isAdmin && (
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setIsUploadingAvatar(true);
                  const formData = new FormData();
                  formData.append('conversation[avatar]', file);

                  try {
                    const result = await updateGroupAvatarAction(conversation.id, formData);
                    if (result.error) {
                      toast.error(result.error);
                    } else {
                      toast.success("Group avatar updated");
                    }
                  } catch (err) {
                    toast.error("Failed to update avatar");
                  } finally {
                    setIsUploadingAvatar(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }
                }}
              />
            )}

            <h3 className="text-xl font-bold text-white">{conversation.name}</h3>
            <p className="text-sm text-white/50 mt-1">{conversation.users.length} members</p>
          </div>

          {isAdmin && usersToAdd.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/70 mb-2">Add Member</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div 
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 h-10 text-sm text-white cursor-pointer flex justify-between items-center"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className="truncate">
                      {selectedUserToAdd 
                        ? usersToAdd.find(u => u.id === selectedUserToAdd)?.full_name 
                        : "Select user..."}
                    </span>
                    <ChevronDown className="w-4 h-4 text-white/50" />
                  </div>
                  
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 max-h-60 flex flex-col overflow-hidden">
                      <div className="p-2 border-b border-white/5">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                          <input 
                            type="text" 
                            placeholder="Search by name or email..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div 
                        className="overflow-y-auto p-1 flex-1 hide-scrollbar"
                        onScroll={handleScroll}
                      >
                        {filteredUsersToAdd.length === 0 ? (
                          <div className="p-3 text-center text-xs text-white/40">No users found</div>
                        ) : (
                          <>
                            {filteredUsersToAdd.map(u => (
                              <div 
                                key={u.id} 
                                className={`p-2 rounded-lg cursor-pointer flex flex-col hover:bg-white/5 transition-colors ${selectedUserToAdd === u.id ? 'bg-brand-500/20' : ''}`}
                                onClick={() => {
                                  setSelectedUserToAdd(u.id);
                                  setIsDropdownOpen(false);
                                  setSearchQuery('');
                                }}
                              >
                                <span className="text-sm font-medium text-white">{u.full_name}</span>
                                <span className="text-xs text-white/50">{u.email}</span>
                              </div>
                            ))}
                            {isLoadingMore && (
                              <div className="py-2 flex justify-center">
                                <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <AnimatedButton 
                  onClick={handleAddMember}
                  disabled={!selectedUserToAdd || isPending}
                  className="px-3 py-2 bg-brand-500 text-white rounded-xl border-0"
                >
                  <UserPlus className="w-4 h-4" />
                </AnimatedButton>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Members</label>
            <div className="space-y-2">
              {conversation.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0 overflow-hidden">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        u.full_name[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white flex items-center gap-2">
                        {u.full_name}
                        {u.id === conversation.admin_id && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-md">Admin</span>
                        )}
                        {u.id === currentUser.id && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-brand-500/20 text-brand-400 rounded-md">You</span>
                        )}
                      </span>
                      <span className="text-xs text-white/50">{u.email}</span>
                    </div>
                  </div>
                  {isAdmin && u.id !== currentUser.id && (
                    <button 
                      onClick={() => handleRemoveMember(u.id)}
                      disabled={isPending}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto flex justify-between p-4 border-t border-white/5 bg-background/50">
          <AnimatedButton 
            variant="ghost"
            onClick={handleLeaveGroup}
            disabled={isPending || isAdmin} // Admin shouldn't leave without re-assigning, or we just block it for now
            className={`text-red-400 hover:text-red-300 hover:bg-red-400/10 border-0 ${isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isAdmin ? "Admins cannot leave currently" : "Leave Group"}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Leave Group
          </AnimatedButton>
          
          <AnimatedButton variant="secondary" onClick={onClose} disabled={isPending}>
            Close
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
}
