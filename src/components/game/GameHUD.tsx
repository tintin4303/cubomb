"use client";

import React, { useState } from "react";
import {
  Flag,
  Clock,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pickaxe,
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
  interactMode?: "reveal" | "flag";
  onToggleInteractMode?: () => void;
  onStartMove?: (dir: "up" | "down" | "left" | "right") => void;
  onStopMove?: () => void;
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
  interactMode = "reveal",
  onToggleInteractMode,
  onStartMove,
  onStopMove,
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
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5 z-20 overflow-hidden font-sans select-none">
      {/* Top Telemetry Bar */}
      <header className="flex items-center justify-between gap-2 sm:gap-3 w-full max-w-5xl mx-auto">
        {/* Sector Status Plate */}
        <div className="hud-panel px-3 py-2 rounded-xl pointer-events-auto flex items-center gap-2 sm:gap-2.5 shadow-lg">
          <img src="/ui/dotBlue.png" alt="" className="w-3 h-3 animate-pulse shrink-0" />
          <span className="text-xs font-mono font-black tracking-widest text-white">CUBOMB</span>
          <span className="text-slate-600 hidden xs:inline">//</span>
          <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase hidden xs:inline">
            {DIFFICULTY_PRESETS[difficulty].name}
          </span>
          {currentMinerFace && (
            <>
              <span className="text-slate-600 hidden sm:inline">//</span>
              <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase hidden sm:inline bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800/50">
                SEC: {currentMinerFace}
              </span>
            </>
          )}
        </div>

        {/* Center Counters (Tactical Ordinance Telemetry) */}
        <div className="hud-panel px-3 sm:px-5 py-2 rounded-xl pointer-events-auto flex items-center gap-2.5 sm:gap-6 font-mono text-xs shadow-lg">
          {/* Threats / Mines Remaining */}
          <div className="flex items-center gap-1.5 sm:gap-2" title="Unneutralized Mines">
            <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
              <img src="/ui/icon_target.png" alt="" className="w-4 h-4 object-contain brightness-150" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block leading-none">Threats</span>
              <span className="font-black text-rose-400 text-xs sm:text-sm leading-tight sm:leading-none">
                {minesRemaining.toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="h-5 sm:h-6 w-[1px] bg-white/10" />

          {/* Active Beacons / Flags */}
          <div className="flex items-center gap-1.5 sm:gap-2" title="Deployed Beacons">
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Flag className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block leading-none">Beacons</span>
              <span className="font-black text-amber-400 text-xs sm:text-sm leading-tight sm:leading-none">
                {flagsPlaced.toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="h-5 sm:h-6 w-[1px] bg-white/10" />

          {/* Chronometer */}
          <div className="flex items-center gap-1.5 sm:gap-2" title="Mission Elapsed Time">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block leading-none">Elapsed</span>
              <span className="font-black text-slate-100 text-xs sm:text-sm leading-tight sm:leading-none">{timeStr}</span>
            </div>
          </div>

          {/* Party Crew Link Badge */}
          {partySession && (
            <>
              <div className="h-5 sm:h-6 w-[1px] bg-white/10" />
              <div className="flex items-center gap-1.5 sm:gap-2 text-cyan-400" title="Connected Crew Code">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <img src="/ui/icon_signal3.png" alt="" className="w-4 h-4 object-contain brightness-150" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block leading-none">Crew Link</span>
                  <span className="font-black text-cyan-300 text-xs sm:text-sm leading-tight sm:leading-none">{partySession.code}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="hud-panel p-1 rounded-xl pointer-events-auto flex items-center gap-1 shadow-lg">
          <button
            onClick={() => {
              sound.playClick();
              onOpenMenu?.();
            }}
            className="w-8 h-8 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-white/20 flex items-center justify-center transition-colors group"
            title="Main Menu"
          >
            <img src="/ui/icon_gear.png" alt="Menu" className="w-4 h-4 object-contain opacity-90 group-hover:opacity-100 group-hover:rotate-45 transition-transform" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            className="w-8 h-8 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-white/20 flex items-center justify-center transition-colors group"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            <img
              src={isMuted ? "/ui/icon_audioOff.png" : "/ui/icon_audioOn.png"}
              alt="Audio"
              className={`w-4 h-4 object-contain ${isMuted ? "opacity-60" : "opacity-95"}`}
            />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setShowHelp(true);
            }}
            className="w-8 h-8 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-white/20 flex items-center justify-center transition-colors group"
            title="Tactical Guide"
          >
            <img src="/ui/icon_information.png" alt="Help" className="w-4 h-4 object-contain opacity-90 group-hover:opacity-100" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="w-8 h-8 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-white/20 flex items-center justify-center transition-colors group"
            title="Restart Mission"
          >
            <img src="/ui/icon_return.png" alt="Restart" className="w-4 h-4 object-contain opacity-90 group-hover:opacity-100 group-hover:-rotate-90 transition-transform" />
          </button>
        </div>
      </header>

      {/* MOBILE CONTROLS OVERLAY (Only visible on small touch screens) */}
      <div className="sm:hidden pointer-events-none w-full flex items-end justify-between px-2 pb-2">
        {/* Mobile Left Thumb: Directional D-Pad */}
        <div className="pointer-events-auto flex flex-col items-center select-none">
          <div className="grid grid-cols-3 gap-1 w-32 h-32 p-1.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 shadow-2xl">
            <div />
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onStartMove?.("up");
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onStopMove?.();
              }}
              onPointerLeave={() => onStopMove?.()}
              onPointerCancel={() => onStopMove?.()}
              onTouchEnd={() => onStopMove?.()}
              className="rounded-xl bg-slate-900 border border-white/10 active:bg-cyan-600 text-cyan-300 active:text-white flex items-center justify-center shadow transition-all active:scale-95"
              aria-label="Move Up"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <div />

            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onStartMove?.("left");
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onStopMove?.();
              }}
              onPointerLeave={() => onStopMove?.()}
              onPointerCancel={() => onStopMove?.()}
              onTouchEnd={() => onStopMove?.()}
              className="rounded-xl bg-slate-900 border border-white/10 active:bg-cyan-600 text-cyan-300 active:text-white flex items-center justify-center shadow transition-all active:scale-95"
              aria-label="Move Left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-center">
              <img src="/ui/crossair_blue.png" alt="" className="w-4 h-4 opacity-75" />
            </div>

            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onStartMove?.("right");
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onStopMove?.();
              }}
              onPointerLeave={() => onStopMove?.()}
              onPointerCancel={() => onStopMove?.()}
              onTouchEnd={() => onStopMove?.()}
              className="rounded-xl bg-slate-900 border border-white/10 active:bg-cyan-600 text-cyan-300 active:text-white flex items-center justify-center shadow transition-all active:scale-95"
              aria-label="Move Right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div />
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onStartMove?.("down");
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onStopMove?.();
              }}
              onPointerLeave={() => onStopMove?.()}
              onPointerCancel={() => onStopMove?.()}
              onTouchEnd={() => onStopMove?.()}
              className="rounded-xl bg-slate-900 border border-white/10 active:bg-cyan-600 text-cyan-300 active:text-white flex items-center justify-center shadow transition-all active:scale-95"
              aria-label="Move Down"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <div />
          </div>
        </div>

        {/* Mobile Right Thumb: Action & Camera Controls */}
        <div className="pointer-events-auto flex flex-col gap-2.5 items-end select-none">
          {/* Dig vs Flag Mode Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleInteractMode?.();
            }}
            className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 ${
              interactMode === "flag"
                ? "bg-amber-950/85 border-amber-500/70 text-amber-300 shadow-amber-500/25"
                : "bg-cyan-950/85 border-cyan-500/70 text-cyan-300 shadow-cyan-500/25"
            }`}
            title={interactMode === "flag" ? "Mode: Flagging Hazard" : "Mode: Excavating"}
          >
            {interactMode === "flag" ? (
              <>
                <Flag className="w-5 h-5 text-amber-400" />
                <span className="text-[9px] font-mono font-black uppercase mt-0.5 tracking-wider text-amber-200">Flag</span>
              </>
            ) : (
              <>
                <Pickaxe className="w-5 h-5 text-cyan-400" />
                <span className="text-[9px] font-mono font-black uppercase mt-0.5 tracking-wider text-cyan-200">Dig</span>
              </>
            )}
          </button>

          {/* Quick Recenter Camera */}
          <button
            onClick={() => {
              sound.playClick();
              onResetCamera();
            }}
            className="w-11 h-11 rounded-xl bg-slate-900/90 border border-white/15 text-cyan-300 flex items-center justify-center shadow-lg active:scale-95 transition-all"
            title="Reset Camera View"
          >
            <img src="/ui/crossair_blue.png" alt="" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DESKTOP FLOATING INPUT PROMPTS BAR (Hidden on mobile) */}
      <footer className="hidden sm:flex flex-col items-center gap-2.5 w-full pointer-events-none">
        <div className="hud-panel px-4 py-2 rounded-xl pointer-events-auto flex items-center gap-4 text-xs shadow-xl">
          {/* Reset Camera Button */}
          <button
            onClick={() => {
              sound.playClick();
              onResetCamera();
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            title="Recenter Camera Orbit"
          >
            <img src="/ui/crossair_blue.png" alt="" className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono tracking-wider uppercase">Reset View</span>
          </button>

          <div className="h-4 w-[1px] bg-white/15" />

          {/* Gamified Graphical Input Prompts */}
          <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
            {/* Traverse Prompt */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-100 font-mono font-black text-[10px] shadow-sm">W</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-100 font-mono font-black text-[10px] shadow-sm">A</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-100 font-mono font-black text-[10px] shadow-sm">S</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-100 font-mono font-black text-[10px] shadow-sm">D</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Move</span>
            </div>

            <span className="text-slate-600">•</span>

            {/* Excavate Prompt */}
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono font-bold text-[10px]">L-CLICK</span>
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Dig / Chord</span>
            </div>

            <span className="text-slate-600">•</span>

            {/* Flag Prompt */}
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono font-bold text-[10px]">R-CLICK</span>
              <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Flag Hazard</span>
            </div>
          </div>
        </div>
      </footer>

      {/* HOW TO PLAY MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto">
          <div className="hud-panel max-w-md w-full rounded-2xl p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <img src="/ui/icon_information.png" alt="" className="w-4 h-4 object-contain" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">Tactical Exploration Manual</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-xs text-slate-400 hover:text-white font-mono"
              >
                [CLOSE]
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="bg-slate-900/70 p-3.5 rounded-xl border border-white/5 space-y-2.5">
                <div className="font-mono text-cyan-400 font-bold text-[11px] uppercase tracking-wider">
                  Navigation & Surface Interaction
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="flex gap-1 shrink-0">
                    <span className="px-1 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-100 font-mono text-[9px] font-black">W</span>
                    <span className="px-1 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-100 font-mono text-[9px] font-black">A</span>
                    <span className="px-1 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-100 font-mono text-[9px] font-black">S</span>
                    <span className="px-1 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-100 font-mono text-[9px] font-black">D</span>
                  </div>
                  <span>Traverse the astronaut smoothly over all 6 planetary faces (or use touch D-pad on mobile).</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono text-[9px] font-bold shrink-0">LEFT CLICK</span>
                  <span>Excavate a surface block. Initial landing is guaranteed safe.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono text-[9px] font-bold shrink-0">RIGHT CLICK</span>
                  <span>Deploy or retrieve a hazard warning beacon (or tap the Dig/Flag mobile button).</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-cyan-300 font-mono text-[9px] font-bold shrink-0">CHORD</span>
                  <span>Click an opened number when all its neighboring mines are flagged to sweep open remaining safe tiles.</span>
                </div>
              </div>

              <div className="bg-slate-900/70 p-3.5 rounded-xl border border-white/5">
                <div className="font-mono text-amber-400 font-bold text-[11px] uppercase tracking-wider mb-1.5">
                  Sub-surface Scan Telemetry
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Numeric tags indicate exactly how many buried mines occupy adjacent blocks in 3D space. Sweep the entire planetary crust to secure the expedition.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-cyan-500/20"
              >
                Resume Expedition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY OVERLAY */}
      {gameState === "won" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto">
          <div className="hud-panel max-w-sm w-full rounded-2xl p-6 text-center text-slate-100 shadow-2xl border border-emerald-500/40">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 mx-auto flex items-center justify-center mb-3.5 shadow-lg shadow-emerald-500/20">
              <img src="/ui/icon_trophy.png" alt="Victory" className="w-7 h-7 object-contain" />
            </div>
            <h2 className="text-lg font-mono font-black text-emerald-400 uppercase tracking-widest mb-1">
              Mission Accomplished
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {partySession ? "The planetary minefield was fully cleared by your crew." : "All sub-surface mines secured and neutralized."}
            </p>

            <div className="bg-slate-900/80 rounded-xl p-3 mb-5 border border-white/10 flex justify-around font-mono text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Mission Time</div>
                <div className="text-base font-black text-emerald-400">{timeStr}</div>
              </div>
              <div className="w-[1px] bg-white/10" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Mines Cleared</div>
                <div className="text-base font-black text-cyan-400">{totalMines}</div>
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
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <img src="/ui/icon_return.png" alt="" className="w-4 h-4 object-contain brightness-0" />
                <span>{partySession ? "Next Party Expedition" : "Launch Next Mission"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* DEFEAT OVERLAY */}
      {gameState === "lost" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto">
          <div className="hud-panel-danger max-w-sm w-full rounded-2xl p-6 text-center text-slate-100 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 mx-auto flex items-center justify-center mb-3.5 shadow-lg shadow-rose-500/25">
              <img src="/ui/icon_warning.png" alt="Detonation" className="w-7 h-7 object-contain" />
            </div>
            <h2 className="text-lg font-mono font-black text-rose-400 uppercase tracking-widest mb-1">
              Critical Detonation
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              {partySession?.explodedBy
                ? `Buried ordnance triggered by ${partySession.explodedBy}.`
                : "A buried ordnance was struck during excavation."}
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
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
              >
                <img src="/ui/icon_return.png" alt="" className="w-4 h-4 object-contain" />
                <span>{partySession ? "Reset Party Expedition" : "Retry Expedition"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
