"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  User,
  Play,
  Volume2,
  VolumeX,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Difficulty, GameMode, DIFFICULTY_PRESETS } from "./types";
import { partyClient } from "@/lib/partyClient";
import { sound } from "./sound";
import { authManager, UserProfile } from "@/lib/authManager";
import { AuthModal } from "./AuthModal";
import { FriendsModal } from "./FriendsModal";
import { friendsManager } from "@/lib/friendsManager";

interface StartMenuProps {
  onStartSolo: (mode: GameMode, difficulty: Difficulty) => void;
  onJoinParty: (code: string) => void;
  onCreateParty: (mode: GameMode, difficulty: Difficulty) => void;
  onOpenHelp: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  onStartSolo,
  onJoinParty,
  onCreateParty,
  onOpenHelp,
  isMuted,
  onToggleMute,
}) => {
  const [activeTab, setActiveTab] = useState<"solo" | "party">("solo");
  const [partyTab, setPartyTab] = useState<"create" | "join">("create");
  const mode: GameMode = "surface";
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [joinCodeInput, setJoinCodeInput] = useState<string>("");
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showFriendsModal, setShowFriendsModal] = useState<boolean>(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  useEffect(() => {
    // Check Supabase session
    authManager.getSessionUser().then(() => {
      const p = authManager.getProfile();
      if (p) {
        setProfile(p);
        partyClient.setPlayerProfile(p.username, p.avatar_color);
        friendsManager.getPendingRequests().then((reqs) => {
          setPendingRequestsCount(reqs.length);
        });
      }
    });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get("room");
      if (roomParam) {
        setActiveTab("party");
        setPartyTab("join");
        setJoinCodeInput(roomParam.toUpperCase());
      }
    }
  }, []);

  const handleAuthSuccess = () => {
    const p = authManager.getProfile();
    if (p) {
      setProfile(p);
      partyClient.setPlayerProfile(p.username, p.avatar_color);
      friendsManager.getPendingRequests().then((reqs) => {
        setPendingRequestsCount(reqs.length);
      });
    }
  };

  const handleCreateParty = () => {
    sound.playClick();
    onCreateParty(mode, difficulty);
  };

  const handleJoinPartySubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;

    setIsJoining(true);
    setJoinError(null);
    sound.playClick();

    try {
      await onJoinParty(code);
    } catch {
      setJoinError("Could not connect to party room. Check the code.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <div className="glass-panel max-w-lg w-full rounded-2xl p-6 sm:p-8 text-slate-100 shadow-2xl border border-white/10 my-auto">
        {/* Navigation Bar: Branding & Account Controls */}
        <div className="flex items-center justify-between pb-5 border-b border-white/5 mb-6">
          <div>
            <div className="text-xl font-black tracking-widest text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>CUBOMB</span>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
              Planetary Cube Expedition
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* User Profile / Auth State */}
            {profile ? (
              <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: profile.avatar_color }}
                />
                <span className="font-semibold text-slate-200 max-w-[100px] truncate">
                  {profile.username}
                </span>
                <button
                  onClick={async () => {
                    sound.playClick();
                    await authManager.signOut();
                    setProfile(null);
                  }}
                  className="text-[10px] text-slate-400 hover:text-rose-400 uppercase font-bold ml-1 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  sound.playClick();
                  setShowAuthModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sign In</span>
              </button>
            )}

            {/* Friends Button (when signed in) */}
            {profile && (
              <button
                onClick={() => {
                  sound.playClick();
                  setShowFriendsModal(true);
                }}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors relative"
                title="Friends"
              >
                <Users className="w-4 h-4" />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-[9px] text-slate-950 font-black flex items-center justify-center">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}

            {/* Sound Mute Toggle */}
            <button
              onClick={() => {
                sound.playClick();
                onToggleMute();
              }}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Help / Guide */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenHelp();
              }}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Selector: Solo vs Party */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-white/5 mb-6">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab("solo");
            }}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === "solo"
                ? "bg-slate-800 text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Solo Expedition</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab("party");
            }}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === "party"
                ? "bg-slate-800 text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Party Mode</span>
          </button>
        </div>

        {/* SOLO MODE CONTENT */}
        {activeTab === "solo" && (
          <div className="space-y-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Mission Difficulty
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                  const cfg = DIFFICULTY_PRESETS[d];
                  const isSel = difficulty === d;
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        sound.playClick();
                        setDifficulty(d);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSel
                          ? "bg-cyan-950/40 border-cyan-500/60 text-white"
                          : "bg-slate-900/60 border-white/5 text-slate-400 hover:border-white/10"
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {cfg.name}
                      </div>
                      <div className={`text-base font-mono font-bold leading-none ${isSel ? "text-cyan-400" : "text-slate-200"}`}>
                        {cfg.mines}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
                        {cfg.gridSize}×{cfg.gridSize} Grid
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onStartSolo(mode, difficulty);
              }}
              className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 active:scale-98"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Mission</span>
            </button>
          </div>
        )}

        {/* PARTY MODE CONTENT */}
        {activeTab === "party" && (
          <div className="space-y-6">
            <div className="flex gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => {
                  sound.playClick();
                  setPartyTab("create");
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  partyTab === "create"
                    ? "bg-slate-800 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setPartyTab("join");
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  partyTab === "join"
                    ? "bg-slate-800 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Join with Code
              </button>
            </div>

            {partyTab === "create" ? (
              <div className="space-y-5">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Expedition Difficulty
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                      const cfg = DIFFICULTY_PRESETS[d];
                      const isSel = difficulty === d;
                      return (
                        <button
                          key={d}
                          onClick={() => {
                            sound.playClick();
                            setDifficulty(d);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSel
                              ? "bg-cyan-950/40 border-cyan-500/60 text-white"
                              : "bg-slate-900/60 border-white/5 text-slate-400 hover:border-white/10"
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            {cfg.name}
                          </div>
                          <div className={`text-base font-mono font-bold leading-none ${isSel ? "text-cyan-400" : "text-slate-200"}`}>
                            {cfg.mines}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
                            {cfg.gridSize}×{cfg.gridSize} Grid
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-xs text-slate-400 leading-relaxed">
                  All party members spawn together in a coordinated safe landing zone on the planetary cube.
                </div>

                <button
                  onClick={handleCreateParty}
                  className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 active:scale-98"
                >
                  <Users className="w-4 h-4" />
                  <span>Create Party Room</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoinPartySubmit} className="space-y-5">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Room Code
                  </div>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="ENTER 5-LETTER CODE"
                    maxLength={10}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-center text-cyan-300 uppercase focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                {joinError && (
                  <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/50 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isJoining || !joinCodeInput.trim()}
                  className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 active:scale-98"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{isJoining ? "Connecting..." : "Join Party Room"}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Friends Modal */}
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => {
          setShowFriendsModal(false);
          if (profile) {
            friendsManager.getPendingRequests().then((r) => setPendingRequestsCount(r.length));
          }
        }}
        onInviteToParty={async (friendUsername) => {
          let code = partyClient.session?.code;
          if (!code) {
            const sess = await partyClient.createRoom({ mode, difficulty });
            if (sess) {
              code = sess.code;
              onCreateParty(mode, difficulty);
            }
          }
          if (code) {
            await friendsManager.sendPartyInvite(friendUsername, code);
            if (typeof window !== "undefined") {
              const url = `${window.location.origin}?room=${code}`;
              navigator.clipboard.writeText(url);
            }
          }
        }}
      />
    </div>
  );
};
