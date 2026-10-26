"use client";

import React, { useState, useEffect } from "react";
import { Users, User, ArrowRight, ShieldAlert, LogOut, Play, X } from "lucide-react";
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
  onResume?: () => void;
  canResume?: boolean;
}

// Difficulty metadata for display
const DIFF_META: Record<Difficulty, { label: string; color: string; desc: string; border: string }> = {
  easy:   { label: "EASY",   color: "#34d399", border: "rgba(52,211,153,0.5)",  desc: "Scout" },
  medium: { label: "MEDIUM", color: "#fbbf24", border: "rgba(251,191,36,0.5)", desc: "Soldier" },
  hard:   { label: "HARD",   color: "#f87171", border: "rgba(248,113,113,0.5)", desc: "Commander" },
  custom: { label: "CUSTOM", color: "#a78bfa", border: "rgba(167,139,250,0.5)", desc: "Custom" },
};

export const StartMenu: React.FC<StartMenuProps> = ({
  onStartSolo,
  onJoinParty,
  onCreateParty,
  isMuted,
  onToggleMute,
  onResume,
  canResume,
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
    authManager.getSessionUser().then(() => {
      const p = authManager.getProfile();
      if (p) {
        setProfile(p);
        partyClient.setPlayerProfile(p.username, p.avatar_color);
        friendsManager.getPendingRequests().then((reqs) => setPendingRequestsCount(reqs.length));
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
      friendsManager.getPendingRequests().then((reqs) => setPendingRequestsCount(reqs.length));
    }
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
      setJoinError("Could not connect. Check the code.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "radial-gradient(ellipse at center, rgba(7,20,40,0.97) 0%, rgba(3,6,12,0.99) 100%)" }}>

      {/* Subtle star-field grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(0,229,255,0.04) 1px, transparent 1px),
            radial-gradient(circle, rgba(100,150,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px, 32px 32px",
          backgroundPosition: "0 0, 16px 16px",
        }}
      />

      <div className="relative w-full max-w-md my-auto">

        {/* ====================================================
            HEADER: Logo + Account strip
        ==================================================== */}
        <div className="kenney-panel-lg p-5 mb-3">
          <div className="flex items-center justify-between mb-4">
            {/* Logo */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {/* Animated mine icon placeholder */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>
                  <img src="/ui/icon_target.png" alt="" className="w-5 h-5 object-contain"
                    style={{ filter: "drop-shadow(0 0 4px rgba(239,68,68,0.7))" }} />
                </div>
                <span className="text-2xl font-black font-mono tracking-[0.2em] text-white"
                  style={{ textShadow: "0 0 20px rgba(0,229,255,0.3)" }}>
                  CUBOMB
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 tracking-[0.25em] uppercase mt-0.5 pl-10">
                3D Planetary Minesweeper
              </span>
            </div>

            {/* Top-right controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { sound.playClick(); onToggleMute(); }}
                className="kenney-btn w-8 h-8 flex items-center justify-center"
                title={isMuted ? "Unmute" : "Mute"}
              >
                <img src={isMuted ? "/ui/icon_audioOff.png" : "/ui/icon_audioOn.png"} alt="Audio"
                  className="w-4 h-4 object-contain"
                  style={{ filter: "drop-shadow(0 0 3px rgba(0,229,255,0.5))" }} />
              </button>
              {canResume && (
                <button
                  onClick={() => { sound.playClick(); onResume?.(); }}
                  className="kenney-btn w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white"
                  title="Resume Game"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Resume Banner (if game active) */}
          {canResume && (
            <button
              onClick={() => { sound.playClick(); onResume?.(); }}
              className="w-full kenney-btn-primary py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 mb-3.5"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(5,150,105,0.2) 100%)",
                borderColor: "rgba(52,211,153,0.55)",
                color: "#6ee7b7",
                boxShadow: "0 0 16px rgba(52,211,153,0.2)",
              }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Mission</span>
            </button>
          )}

          {/* Account bar */}
          <div className="kenney-panel-inset p-2.5 flex items-center gap-2.5">
            {profile ? (
              <>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs font-mono"
                  style={{
                    background: profile.avatar_color || "#0284c7",
                    boxShadow: `0 0 8px ${profile.avatar_color || "#0284c7"}88`,
                  }}>
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-bold text-white truncate">{profile.username}</span>
                {/* Friends button */}
                <button
                  onClick={() => { sound.playClick(); setShowFriendsModal(true); }}
                  className="kenney-btn px-2.5 py-1 text-[10px] font-mono flex items-center gap-1 relative"
                >
                  <Users className="w-3 h-3" />
                  <span>Friends</span>
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-[9px] text-slate-950 font-black flex items-center justify-center">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={async () => { sound.playClick(); await authManager.signOut(); setProfile(null); }}
                  className="kenney-btn w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-400"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="flex-1 text-xs text-slate-500 font-mono">Not signed in</span>
                <button
                  onClick={() => { sound.playClick(); setShowAuthModal(true); }}
                  className="kenney-btn-primary px-3 py-1.5 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
                >
                  <User className="w-3 h-3" />
                  <span>Sign In</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ====================================================
            TAB SELECTOR: Solo / Party
        ==================================================== */}
        <div className="kenney-panel-lg p-1.5 mb-3 flex gap-1.5">
          {(["solo", "party"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { sound.playClick(); setActiveTab(tab); }}
              className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
              style={activeTab === tab ? {
                background: "linear-gradient(135deg, rgba(0,229,255,0.18) 0%, rgba(0,100,200,0.12) 100%)",
                border: "1px solid rgba(0,229,255,0.4)",
                color: "#67e8f9",
                boxShadow: "0 0 12px rgba(0,229,255,0.12)",
              } : {
                background: "transparent",
                border: "1px solid transparent",
                color: "#64748b",
              }}
            >
              {tab === "solo" ? <User className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              <span>{tab === "solo" ? "Solo" : "Party"}</span>
            </button>
          ))}
        </div>

        {/* ====================================================
            SOLO TAB
        ==================================================== */}
        {activeTab === "solo" && (
          <div className="kenney-panel-lg p-5 space-y-4">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
              Mission Difficulty
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                const cfg = DIFFICULTY_PRESETS[d];
                const meta = DIFF_META[d];
                const isSel = difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => { sound.playClick(); setDifficulty(d); }}
                    className="relative p-3 rounded-xl text-left transition-all"
                    style={{
                      background: isSel
                        ? `linear-gradient(135deg, ${meta.color}1a 0%, ${meta.color}0a 100%)`
                        : "rgba(8,12,22,0.6)",
                      border: `1px solid ${isSel ? meta.border : "rgba(255,255,255,0.06)"}`,
                      boxShadow: isSel ? `0 0 16px ${meta.color}22` : "none",
                    }}
                  >
                    {isSel && (
                      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                        style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                    )}
                    <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: isSel ? meta.color : "#475569" }}>
                      {meta.label}
                    </div>
                    <div className="text-xl font-black font-mono leading-none"
                      style={{ color: isSel ? meta.color : "#e2e8f0", textShadow: isSel ? `0 0 12px ${meta.color}66` : "none" }}>
                      {cfg.mines}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1.5">
                      {cfg.gridSize}x{cfg.gridSize}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { sound.playClick(); onStartSolo(mode, difficulty); }}
              className="w-full kenney-btn-primary py-3.5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 mt-2"
            >
              <img src="/ui/icon_target.png" alt="" className="w-5 h-5 object-contain"
                style={{ filter: "drop-shadow(0 0 4px rgba(0,229,255,0.6))" }} />
              <span>Launch Mission</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ====================================================
            PARTY TAB
        ==================================================== */}
        {activeTab === "party" && (
          <div className="kenney-panel-lg p-5 space-y-4">
            {/* Sub-tab: Create / Join */}
            <div className="kenney-panel-inset p-1 flex gap-1 rounded-xl">
              {(["create", "join"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { sound.playClick(); setPartyTab(t); }}
                  className="flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all"
                  style={partyTab === t ? {
                    background: "rgba(0,229,255,0.15)",
                    border: "1px solid rgba(0,229,255,0.35)",
                    color: "#67e8f9",
                  } : {
                    background: "transparent",
                    border: "1px solid transparent",
                    color: "#475569",
                  }}
                >
                  {t === "create" ? "Create Room" : "Join with Code"}
                </button>
              ))}
            </div>

            {partyTab === "create" ? (
              <div className="space-y-4">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  Expedition Difficulty
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                    const cfg = DIFFICULTY_PRESETS[d];
                    const meta = DIFF_META[d];
                    const isSel = difficulty === d;
                    return (
                      <button
                        key={d}
                        onClick={() => { sound.playClick(); setDifficulty(d); }}
                        className="p-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: isSel ? `${meta.color}18` : "rgba(8,12,22,0.6)",
                          border: `1px solid ${isSel ? meta.border : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-1"
                          style={{ color: isSel ? meta.color : "#475569" }}>
                          {meta.label}
                        </div>
                        <div className="text-lg font-black font-mono leading-none"
                          style={{ color: isSel ? meta.color : "#e2e8f0" }}>
                          {cfg.mines}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono mt-1">
                          {cfg.gridSize}x{cfg.gridSize}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="kenney-panel-inset p-3 text-xs text-slate-500 leading-relaxed font-mono">
                  All members spawn in a coordinated safe landing zone.
                </div>

                <button
                  onClick={() => { sound.playClick(); onCreateParty(mode, difficulty); }}
                  className="w-full kenney-btn-primary py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Create Party Room</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoinPartySubmit} className="space-y-4">
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Room Code
                  </div>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="XXXXX"
                    maxLength={10}
                    className="w-full rounded-xl px-4 py-3.5 text-2xl font-mono font-black tracking-[0.4em] text-center uppercase focus:outline-none transition-all"
                    style={{
                      background: "rgba(4,8,18,0.9)",
                      border: "1px solid rgba(0,229,255,0.25)",
                      color: "#67e8f9",
                      caretColor: "#67e8f9",
                      textShadow: "0 0 12px rgba(0,229,255,0.4)",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(0,229,255,0.6)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(0,229,255,0.25)"; }}
                  />
                </div>

                {joinError && (
                  <div className="flex items-center gap-2 text-xs text-rose-400 kenney-panel-inset p-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isJoining || !joinCodeInput.trim()}
                  className="w-full kenney-btn-primary py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{isJoining ? "Connecting..." : "Join Party"}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Version stamp */}
        <div className="text-center mt-3 text-[9px] font-mono text-slate-700 tracking-widest uppercase">
          cubomb.space — CC0 assets by kenney.nl
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => {
          setShowFriendsModal(false);
          if (profile) friendsManager.getPendingRequests().then((r) => setPendingRequestsCount(r.length));
        }}
        onInviteToParty={async (friendUsername) => {
          let code = partyClient.session?.code;
          if (!code) {
            const sess = await partyClient.createRoom({ mode, difficulty });
            if (sess) { code = sess.code; onCreateParty(mode, difficulty); }
          }
          if (code) {
            await friendsManager.sendPartyInvite(friendUsername, code);
            if (typeof window !== "undefined") {
              navigator.clipboard.writeText(`${window.location.origin}?room=${code}`);
            }
          }
        }}
      />
    </div>
  );
};
