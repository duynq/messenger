'use client';

import React, { useState, useTransition } from 'react';
import { X, Users, Loader2, Search } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { createGroupAction } from '@/actions/chat';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableUsers: { id: number; full_name: string; email: string }[];
  currentUser: { id?: number; email: string };
}

export function CreateGroupModal({ isOpen, onClose, availableUsers, currentUser }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const [usersList, setUsersList] = useState(availableUsers);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filter out current user from available users to select
  const selectableUsers = usersList.filter(u => u.email !== currentUser.email);

  React.useEffect(() => {
    if (debouncedSearchQuery.length >= 2 || debouncedSearchQuery.length === 0) {
      setIsLoadingMore(true);
      const fetchInitial = async () => {
        try {
          const { fetchUsersAction } = await import('@/actions/chat');
          const data = await fetchUsersAction(null, debouncedSearchQuery);
          if (data.users) {
            setUsersList(data.users);
            setNextCursor(data.meta?.next_cursor ?? null);
            setHasMore(data.meta?.has_next ?? false);
          }
        } catch (error) {
          console.error("Failed to fetch users", error);
        } finally {
          setIsLoadingMore(false);
        }
      };
      fetchInitial();
    }
  }, [debouncedSearchQuery]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 10 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      
      try {
        const { fetchUsersAction } = await import('@/actions/chat');
        const data = await fetchUsersAction(nextCursor, debouncedSearchQuery);
        
        if (data.users && data.users.length > 0) {
          setUsersList(prev => {
            const newUsers = data.users.filter((newUser: {id: number, full_name: string, email: string}) => !prev.some(u => u.id === newUser.id));
            return [...prev, ...newUsers];
          });
          setNextCursor(data.meta?.next_cursor ?? null);
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

  const toggleUser = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    startTransition(async () => {
      const result = await createGroupAction(name, selectedUserIds);
      if (result.error) {
        toast.error(result.error);
      } else {
        onClose();
        setName('');
        setSelectedUserIds([]);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" />
            Create New Group
          </h2>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="group-name-input" className="block text-sm font-medium text-white/70 mb-1.5">Group Name</label>
              <input
                id="group-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Project Alpha Team"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="create-group-search" className="block text-sm font-medium text-white/70 mb-1.5">
                Select Members ({selectedUserIds.length})
              </label>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                <div className="p-2 border-b border-white/10">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input 
                      id="create-group-search"
                      type="text" 
                      placeholder="Search users..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
                <div 
                  className="max-h-60 overflow-y-auto p-2 space-y-1 hide-scrollbar"
                  onScroll={handleScroll}
                >
                  {selectableUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-white/50">No users found</div>
                  ) : (
                    <>
                      {selectableUsers.map(user => {
                        const isSelected = selectedUserIds.includes(user.id);
                        return (
                          <button
                            type="button"
                            key={user.id}
                            onClick={() => toggleUser(user.id)}
                            className={`w-full flex items-center gap-3 p-3 text-left rounded-lg transition-all ${
                              isSelected ? 'bg-brand-500/20 border border-brand-500/30' : 'hover:bg-white/5 border border-transparent'
                            }`}
                            aria-pressed={isSelected}
                          >
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-brand-500 border-brand-500' : 'border-white/20'
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{user.full_name}</div>
                              <div className="text-xs text-white/50">{user.email}</div>
                            </div>
                          </button>
                        );
                      })}
                      {isLoadingMore && (
                        <div className="py-2 flex justify-center">
                          <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto flex justify-end gap-3 pt-4 border-t border-white/5">
            <AnimatedButton type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </AnimatedButton>
            <AnimatedButton type="submit" disabled={isPending || !name.trim() || selectedUserIds.length === 0}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Group
            </AnimatedButton>
          </div>
        </form>
      </div>
    </div>
  );
}
