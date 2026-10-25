"use client";

import React, { useState, useEffect } from "react";
import {
  Gamepad2,
  Users,
  User,
  Play,
  Globe,
  Volume2,
  VolumeX,
  HelpCircle,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Zap,
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

const AVATAR_COLORS = [
  { name: "Cyan", hex: "#0284c7" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Ice Blue", hex: "#38bdf8" },
];

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
  const [mode, setMode] = useState<GameMode>("surface");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [playerName, setPlayerName] = useState<string>("Miner");
  const [selectedColor, setSelectedColor] = useState<string>("#0284c7");
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
        setPlayerName(p.username);
        setSelectedColor(p.avatar_color);
        partyClient.setPlayerProfile(p.username, p.avatar_color);
        friendsManager.getPendingRequests().then((reqs) => {
          setPendingRequestsCount(reqs.length);
        });
      }
    });

    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("cubomb_player_name") || localStorage.getItem("3dminer_player_name");
      const savedColor = localStorage.getItem("cubomb_player_color") || localStorage.getItem("3dminer_player_color");
      if (savedName && !authManager.getProfile()) setPlayerName(savedName);
      if (savedColor && !authManager.getProfile()) setSelectedColor(savedColor);

      // Check URL for ?room=CODE
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
      setPlayerName(p.username);
      setSelectedColor(p.avatar_color);
      partyClient.setPlayerProfile(p.username, p.avatar_color);
      friendsManager.getPendingRequests().then((reqs) => {
        setPendingRequestsCount(reqs.length);
      });
    }
  };

  const handleNameChange = (val: string) => {
    const cleaned = val.slice(0, 16);
    setPlayerName(cleaned);
    partyClient.setPlayerProfile(cleaned, selectedColor);
  };

  const handleColorChange = (hex: string) => {
    setSelectedColor(hex);
    partyClient.setPlayerProfile(playerName, hex);
  };

  const handleCreateParty = () => {
    sound.playClick();
    partyClient.setPlayerProfile(playerName, selectedColor);
    onCreateParty(mode, difficulty);
  };

  const handleJoinPartySubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;

    setIsJoining(true);
    setJoinError(null);
    sound.playClick();

    partyClient.setPlayerProfile(playerName, selectedColor);

    try {
      await onJoinParty(code);
    } catch {
      setJoinError("Failed to connect to party room.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overflow-y-auto">
      <div className="glass-panel-glow max-w-xl w-full rounded-3xl p-6 md:p-8 text-slate-100 shadow-2xl border border-cyan-500/30 my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/40 border border-cyan-400/30">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-blue-300 font-mono">
                CUBOMB
              </h1>
              <p className="text-[11px] text-slate-400 tracking-wide font-medium">
                Planetary Cube Minefield Expedition
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Friends Button (when logged in) */}
            {profile && (
              <button
                onClick={() => {
                  sound.playClick();
                  setShowFriendsModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-900/60 transition-all flex items-center gap-1.5 text-xs font-bold shadow-md shadow-purple-950/40 relative"
                title="Friends Expedition"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Friends</span>
                {pendingRequestsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-[10px] text-slate-950 font-black flex items-center justify-center">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}

            {/* User Account / Profile Badge */}
            {profile ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 shadow-md">
                <div
                  className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: profile.avatar_color }}
                />
                <span className="text-xs font-bold text-white max-w-[90px] truncate">
                  {profile.username}
                </span>
                <button
                  onClick={async () => {
                    sound.playClick();
                    await authManager.signOut();
                    setProfile(null);
                  }}
                  className="text-[10px] text-slate-400 hover:text-rose-400 uppercase font-black ml-1"
                  title="Sign Out"
                >
                  Exit
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  sound.playClick();
                  setShowAuthModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-900/60 transition-all flex items-center gap-1.5 text-xs font-bold shadow-md shadow-cyan-950/40"
                title="Sign In or Register"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Account</span>
              </button>
            )}

            <button
              onClick={() => {
                sound.playClick();
                onToggleMute();
              }}
              className={`p-2.5 rounded-xl border transition-all ${
                isMuted
                  ? "bg-red-950/30 border-red-500/40 text-red-400"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              }`}
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onOpenHelp();
              }}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player Profile Setup */}
        <div className="bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md border border-white/20 shrink-0"
              style={{ backgroundColor: selectedColor }}
            >
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Miner Call Sign
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={16}
                placeholder="Miner Name"
                className="w-full sm:w-36 bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 text-center sm:text-right">
              Suit Accent Color
            </label>
            <div className="flex items-center gap-1.5 justify-center sm:justify-end">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => handleColorChange(c.hex)}
                  className={`w-6 h-6 rounded-lg transition-transform ${
                    selectedColor === c.hex ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "hover:scale-105 opacity-80"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs (Solo vs Party) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-6">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab("solo");
            }}
            className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === "solo"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-900/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Solo Expedition</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab("party");
            }}
            className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === "party"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Party Mode</span>
          </button>
        </div>

        {/* --- SOLO EXPEDITION TAB --- */}
        {activeTab === "solo" && (
          <div className="space-y-5">
            {/* Difficulty Preset */}
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2">
                Mission Difficulty
              </label>
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
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSel
                          ? "border-cyan-400 bg-cyan-950/50 text-white font-bold shadow-md shadow-cyan-900/30"
                          : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs uppercase tracking-wider text-slate-300 mb-0.5">{cfg.name}</div>
                      <div className="text-sm font-mono font-black text-cyan-400">{cfg.mines} Mines</div>
                      <div className="text-[10px] text-slate-400 mt-1">{cfg.gridSize}×{cfg.gridSize} Grid</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={() => {
                sound.playClick();
                onStartSolo(mode, difficulty);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:brightness-110 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-900/40 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Launch Solo Expedition</span>
            </button>
          </div>
        )}

        {/* --- PARTY MODE (MULTIPLAYER) TAB --- */}
        {activeTab === "party" && (
          <div className="space-y-5">
            {/* Create vs Join Sub-tabs */}
            <div className="flex gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => {
                  sound.playClick();
                  setPartyTab("create");
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  partyTab === "create"
                    ? "bg-purple-950/60 text-purple-300 border border-purple-500/40 font-bold"
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
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  partyTab === "join"
                    ? "bg-purple-950/60 text-purple-300 border border-purple-500/40 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Join with Code
              </button>
            </div>

            {partyTab === "create" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2">
                    Difficulty for Party
                  </label>
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
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            isSel
                              ? "border-purple-400 bg-purple-950/50 text-white font-bold"
                              : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-200">{cfg.name}</div>
                          <div className="text-[11px] font-mono text-purple-400">{cfg.mines} Mines</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <p>• As host, you control game start and difficulty.</p>
                  <p>• All players walk and clear mines together on the shared cube planet.</p>
                </div>

                <button
                  onClick={handleCreateParty}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:brightness-110 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-purple-950/40 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <Users className="w-5 h-5" />
                  <span>Create Party Room</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoinPartySubmit} className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2">
                    Enter Party Room Code
                  </label>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. MINE-7"
                    maxLength={10}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-center text-purple-300 uppercase focus:outline-none focus:border-purple-400"
                  />
                </div>

                {joinError && (
                  <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/60 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isJoining || !joinCodeInput.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:brightness-110 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-purple-950/40 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                  <span>{isJoining ? "Connecting..." : "Join Party Expedition"}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Supabase Free-Tier Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Friends System Modal */}
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
