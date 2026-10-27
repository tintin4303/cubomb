"use client";

import React, { useState } from "react";
import { Users, Copy, Check, Play, LogOut, Crown } from "lucide-react";
import { PartySession, DIFFICULTY_PRESETS } from "./types";
import { sound } from "./sound";
import { partyClient } from "@/lib/partyClient";
import { getPilotSkin } from "./skins";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto">
      <div className="glass-panel max-w-md w-full rounded-2xl p-6 text-slate-100 shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-5">
          <div className="flex items-center gap-2 text-white font-mono font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>EXPEDITION LOBBY</span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onLeaveParty();
            }}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>

        {/* Room Code & Mission Telemetry */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 text-center mb-5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>Room Code</span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold lowercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{partyClient.isConnectedRealtime ? "realtime sync" : "active"}</span>
            </span>
          </div>

          <div className="text-3xl font-mono font-black text-white tracking-widest mb-2">
            {session.code}
          </div>

          <div className="text-xs text-slate-400 mb-4">
            Mission: <span className="text-slate-200 font-bold">{diffCfg.name}</span> ({diffCfg.mines} Mines • {diffCfg.gridSize}×{diffCfg.gridSize})
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyCode}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/5 text-xs text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? "Copied" : "Copy Code"}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/5 text-xs text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        {/* Explorer Roster */}
        <div className="mb-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
            <span>Connected Explorers</span>
            <span className="font-mono text-cyan-400">{players.length} / 8</span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {players.map((p) => {
              const pSkin = getPilotSkin(p.skinId || p.color);
              return (
                <div
                  key={p.id}
                  className="bg-slate-900/50 border border-white/5 p-2.5 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: pSkin.previewColor, boxShadow: `0 0 6px ${pSkin.previewColor}` }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">
                        {p.name} {p.id === currentPlayerId && <span className="text-cyan-400 text-[10px]">(You)</span>}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        {pSkin.name}
                      </span>
                    </div>
                  </div>
                  {p.isHost && (
                    <span className="text-[10px] bg-slate-800 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" /> Host
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        {isHost ? (
          <button
            onClick={() => {
              sound.playClick();
              onStartGame();
            }}
            className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Expedition</span>
          </button>
        ) : (
          <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 text-center text-xs text-slate-400">
            Waiting for expedition host to launch...
          </div>
        )}
      </div>
    </div>
  );
};
