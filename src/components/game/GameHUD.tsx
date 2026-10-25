"use client";

import React, { useState } from "react";
import {
  Bomb,
  Flag,
  RotateCcw,
  Volume2,
  VolumeX,
  Crosshair,
  HelpCircle,
  Clock,
  Menu,
  Users,
  Trophy,
} from "lucide-react";
import { Difficulty, GameState, DIFFICULTY_PRESETS, PartySession } from "./types";
import { sound } from "./sound";

interface GameHUDProps {
  gameState: GameState;
  minesRemaining: number;
  totalMines: number;
  flagsPlaced: number;
  timeSeconds: number;
  difficulty: Difficulty;
  currentMinerFace?: "top" | "bottom" | "front" | "back" | "left" | "right";
  isMuted: boolean;
  onResetCamera: () => void;
  onCameraPreset: (preset: "front" | "back" | "top" | "bottom" | "left" | "right") => void;
  onRestart: () => void;
  onChangeDifficulty: (diff: Difficulty) => void;
  onToggleMute: () => void;
  onOpenMenu?: () => void;
  partySession?: PartySession | null;
  currentPlayerId?: string;
  onLeaveParty?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  minesRemaining,
  totalMines,
  flagsPlaced,
  timeSeconds,
  difficulty,
  currentMinerFace,
  isMuted,
  onResetCamera,
  onRestart,
  onToggleMute,
  onOpenMenu,
  partySession,
  currentPlayerId,
  onLeaveParty,
}) => {
  const [showHelp, setShowHelp] = useState(false);

  // Format timer MM:SS
  const mins = Math.floor(timeSeconds / 60);
  const secs = timeSeconds % 60;
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-20 overflow-hidden font-sans select-none">
      {/* Top Telemetry Bar */}
      <header className="flex items-center justify-between gap-3 w-full max-w-5xl mx-auto">
        {/* Branding & Status */}
        <div className="glass-panel px-3.5 py-2 rounded-xl pointer-events-auto flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs font-mono font-black tracking-widest text-white">CUBOMB</span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] font-mono text-slate-400 uppercase">
            {DIFFICULTY_PRESETS[difficulty].name}
          </span>
          {currentMinerFace && (
            <>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-[11px] font-mono text-cyan-400 uppercase hidden sm:inline">
                {currentMinerFace}
              </span>
            </>
          )}
        </div>

        {/* Center Counters (Mines, Flags, Timer) */}
        <div className="glass-panel px-4 py-2 rounded-xl pointer-events-auto flex items-center gap-4 sm:gap-6 font-mono text-xs">
          {/* Mines Remaining */}
          <div className="flex items-center gap-1.5" title="Mines Remaining">
            <Bomb className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-bold text-rose-400 text-sm leading-none">
              {minesRemaining.toString().padStart(2, "0")}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Flags Placed */}
          <div className="flex items-center gap-1.5" title="Flags Placed">
            <Flag className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-amber-400 text-sm leading-none">
              {flagsPlaced.toString().padStart(2, "0")}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Timer */}
          <div className="flex items-center gap-1.5" title="Mission Time">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-200 text-sm leading-none">{timeStr}</span>
          </div>

          {/* Party Badge */}
          {partySession && (
            <>
              <div className="h-4 w-[1px] bg-white/10" />
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Users className="w-3.5 h-3.5" />
                <span>{partySession.code}</span>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="glass-panel p-1.5 rounded-xl pointer-events-auto flex items-center gap-1">
          <button
            onClick={() => {
              sound.playClick();
              onOpenMenu?.();
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
            title="Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setShowHelp(true);
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
            title="Restart Mission"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Bottom Floating Control Bar */}
      <footer className="flex flex-col items-center gap-2.5 w-full pointer-events-none">
        <div className="glass-panel px-3 py-1.5 rounded-xl pointer-events-auto flex items-center gap-3 text-xs">
          <button
            onClick={() => {
              sound.playClick();
              onResetCamera();
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors flex items-center gap-1.5"
            title="Reset View"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset Camera</span>
          </button>

          <div className="h-3 w-[1px] bg-white/10" />

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>WASD: <b className="text-slate-200">Move</b></span>
            <span>•</span>
            <span>Click: <b className="text-cyan-400">Dig / Chord</b></span>
            <span>•</span>
            <span>Right-Click: <b className="text-amber-400">Flag</b></span>
          </div>
        </div>
      </footer>

      {/* HOW TO PLAY MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 text-slate-100 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">How to Play</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                <div className="font-bold text-white mb-1">Exploration & Controls</div>
                <p>• <b>WASD / Arrow Keys</b>: Walk the astronaut seamlessly across all 6 cube faces.</p>
                <p>• <b>Left Click</b>: Excavate a tile block.</p>
                <p>• <b>Right Click / F key</b>: Place or remove a warning flag.</p>
                <p>• <b>Chording</b>: Click an open number when its mines are flagged to sweep open all surrounding safe tiles instantly.</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                <div className="font-bold text-white mb-1">Planetary Minefield Rules</div>
                <p>• Numbers show how many adjacent neighboring blocks contain buried mines.</p>
                <p>• The first excavation is guaranteed safe and opens an initial clearing.</p>
                <p>• Clear every safe tile across the cube to complete the expedition.</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Return to Mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY OVERLAY */}
      {gameState === "won" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="glass-panel max-w-sm w-full rounded-2xl p-6 text-center text-slate-100 shadow-2xl border border-emerald-500/40">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-1">
              Mission Accomplished
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {partySession ? "The planetary minefield was fully cleared by your crew." : "All mines located and neutralized."}
            </p>

            <div className="bg-slate-900/80 rounded-xl p-3 mb-5 border border-white/5 flex justify-around font-mono text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Time</div>
                <div className="text-base font-bold text-emerald-400">{timeStr}</div>
              </div>
              <div className="w-[1px] bg-white/10" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Mines</div>
                <div className="text-base font-bold text-cyan-400">{totalMines}</div>
              </div>
            </div>

            {partySession && partySession.hostId !== currentPlayerId ? (
              <div className="space-y-2">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 text-xs text-slate-400 font-medium">
                  Waiting for host to launch next expedition...
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onLeaveParty?.();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Leave Party
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  sound.playClick();
                  onRestart();
                }}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{partySession ? "Next Party Expedition" : "Play Again"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* DEFEAT OVERLAY */}
      {gameState === "lost" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="glass-panel max-w-sm w-full rounded-2xl p-6 text-center text-slate-100 shadow-2xl border border-rose-500/40">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 mx-auto flex items-center justify-center mb-3">
              <Bomb className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-1">
              Mine Detonation
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              {partySession?.explodedBy
                ? `Detonated by ${partySession.explodedBy}.`
                : "A hidden mine was triggered."}
            </p>

            {partySession && partySession.hostId !== currentPlayerId ? (
              <div className="space-y-2">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 text-xs text-slate-400 font-medium">
                  Waiting for host to reset expedition...
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onLeaveParty?.();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Leave Party
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  sound.playClick();
                  onRestart();
                }}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{partySession ? "Reset Party Expedition" : "Try Again"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
