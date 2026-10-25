"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  UserCheck,
  Check,
  X,
  Search,
  AlertCircle,
  Copy,
  Trophy,
  Trash2,
  Share2,
} from "lucide-react";
import { friendsManager, FriendEntry, FriendRequestEntry } from "@/lib/friendsManager";
import { authManager } from "@/lib/authManager";
import { sound } from "./sound";

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteToParty?: (friendUsername: string) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  onInviteToParty,
}) => {
  const [tab, setTab] = useState<"friends" | "requests" | "add">("friends");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequestEntry[]>([]);
  const [searchUsername, setSearchUsername] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fList, rList] = await Promise.all([
        friendsManager.getFriendsList(),
        friendsManager.getPendingRequests(),
      ]);
      setFriends(fList);
      setRequests(rList);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setActionMsg(null);
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    setIsLoading(true);
    setActionMsg(null);
    try {
      const res = await friendsManager.sendFriendRequest(searchUsername);
      if (res.error) {
        setActionMsg({ text: res.error, isError: true });
      } else {
        sound.playClick();
        setActionMsg({ text: `Friend request sent to ${searchUsername.trim()}!` });
        setSearchUsername("");
        loadData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (reqId: string, name: string) => {
    sound.playClick();
    setIsLoading(true);
    try {
      const res = await friendsManager.acceptFriendRequest(reqId);
      if (res.error) {
        setActionMsg({ text: res.error, isError: true });
      } else {
        setActionMsg({ text: `Accepted request from ${name}!` });
        loadData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async (reqId: string) => {
    sound.playClick();
    setIsLoading(true);
    try {
      await friendsManager.declineFriendRequest(reqId);
      loadData();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, name: string) => {
    sound.playClick();
    if (!confirm(`Remove ${name} from your friends list?`)) return;
    setIsLoading(true);
    try {
      await friendsManager.removeFriend(friendshipId);
      loadData();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 pointer-events-auto select-none">
      <div className="glass-panel-glow max-w-md w-full rounded-3xl p-6 text-slate-100 shadow-2xl border border-cyan-500/30 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-200">
                FRIENDS EXPEDITION
              </h3>
              <p className="text-[11px] text-slate-400">Manage crew members and party invitations</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab("friends");
              setActionMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "friends"
                ? "bg-cyan-600 text-white shadow-md font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends ({friends.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab("requests");
              setActionMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
              tab === "requests"
                ? "bg-cyan-600 text-white shadow-md font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Requests</span>
            {requests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab("add");
              setActionMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "add"
                ? "bg-cyan-600 text-white shadow-md font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Friend</span>
          </button>
        </div>

        {/* Action Message Alert */}
        {actionMsg && (
          <div
            className={`mb-4 p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
              actionMsg.isError
                ? "bg-rose-950/60 border-rose-800/80 text-rose-300"
                : "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
            }`}
          >
            {actionMsg.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[200px] max-h-[300px] overflow-y-auto pr-1">
          {tab === "friends" && (
            <div className="space-y-2">
              {friends.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <p>No friends added yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Use the Add Friend tab to connect with other explorers.
                  </p>
                </div>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.friendshipId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: f.avatar_color }}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{f.username}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span>{f.total_wins} Wins</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onInviteToParty && (
                        <button
                          onClick={() => {
                            sound.playClick();
                            onInviteToParty(f.username);
                            setActionMsg({ text: `Invited ${f.username} to party!` });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-900 text-[10px] font-bold transition-all flex items-center gap-1"
                          title="Invite to Party"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Invite</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFriend(f.friendshipId, f.username)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Remove Friend"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "requests" && (
            <div className="space-y-2">
              {requests.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <p>No pending friend requests.</p>
                </div>
              ) : (
                requests.map((r) => (
                  <div
                    key={r.friendshipId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/40"
                        style={{ backgroundColor: r.avatar_color }}
                      />
                      <span className="text-xs font-bold text-white">{r.username}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAccept(r.friendshipId, r.username)}
                        className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-900 text-xs font-bold transition-all"
                        title="Accept Request"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDecline(r.friendshipId)}
                        className="p-1.5 rounded-lg bg-rose-950 border border-rose-500/40 text-rose-300 hover:text-white hover:bg-rose-900 text-xs font-bold transition-all"
                        title="Decline Request"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "add" && (
            <form onSubmit={handleSendRequest} className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Explorer Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    placeholder="Enter friend's exact username"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !searchUsername.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-900/40 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Send Friend Request</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
