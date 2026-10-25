"use client";

import React, { useState } from "react";
import { Users, Copy, Check, Play, LogOut, Crown, Radio } from "lucide-react";
import { PartySession, DIFFICULTY_PRESETS } from "./types";
import { sound } from "./sound";
import { partyClient } from "@/lib/partyClient";

interface PartyLobbyModalProps {
  session: PartySession;
  currentPlayerId: string;
  onStartGame: () => void;
  onLeaveParty: () => void;
}

export const PartyLobbyModal: React.FC<PartyLobbyModalProps> = ({
  session,
  currentPlayerId,
  onStartGame,
  onLeaveParty,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const isHost = session.hostId === currentPlayerId;
  const players = Object.values(session.players || {});
  const diffCfg = DIFFICULTY_PRESETS[session.difficulty] || DIFFICULTY_PRESETS.medium;

  const handleCopyLink = () => {
    sound.playClick();
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}?room=${session.code}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = () => {
    sound.playClick();
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(session.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto">
      <div className="glass-panel-glow max-w-md w-full rounded-3xl p-6 text-slate-100 shadow-2xl border border-purple-500/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-lg">
            <Users className="w-5 h-5" />
            <span>Party Expedition Lobby</span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onLeaveParty();
            }}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>

        {/* Room Code & Mission Card */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-purple-900/40 text-center mb-5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>Room Code</span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold lowercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{partyClient.isConnectedRealtime ? "realtime edge" : "connected"}</span>
            </span>
          </div>

          <div className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 tracking-widest mb-1">
            {session.code}
          </div>

          <div className="text-[11px] text-slate-400 mb-3.5">
            Mission: <span className="text-purple-300 font-bold capitalize">{diffCfg.name}</span> ({diffCfg.mines} Mines, {diffCfg.gridSize}×{diffCfg.gridSize} Cube)
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyCode}
              className="py-2 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/50 border border-purple-500/40 text-xs text-purple-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? "Code Copied!" : "Copy Code"}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="py-2 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/50 border border-purple-500/40 text-xs text-purple-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        {/* Player Roster */}
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Explorers Joined</span>
            <span className="font-mono text-purple-300">{players.length} / 8</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {players.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-xs font-bold text-slate-200">
                    {p.name} {p.id === currentPlayerId && <span className="text-cyan-400 text-[10px]">(You)</span>}
                  </span>
                </div>
                {p.isHost && (
                  <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700/60 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" /> Host
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        {isHost ? (
          <button
            onClick={() => {
              sound.playClick();
              onStartGame();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:brightness-110 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-purple-950/40 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Launch Expedition</span>
          </button>
        ) : (
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
            <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>Waiting for host to launch expedition...</span>
          </div>
        )}
      </div>
    </div>
  );
};
