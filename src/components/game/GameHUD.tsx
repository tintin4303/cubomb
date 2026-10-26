"use client";

import React, { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

// Reusable Kenney glass-panel button
const KBtn: React.FC<{
  onClick: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, title, className = "", children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`kenney-btn ${className}`}
  >
    {children}
  </button>
);

// White Kenney icon displayed on a dark backing so it shows up
const KIcon: React.FC<{ src: string; alt?: string; size?: number; className?: string }> = ({
  src,
  alt = "",
  size = 18,
  className = "",
}) => (
  <img
    src={src}
    alt={alt}
    width={size}
    height={size}
    className={`object-contain ${className}`}
    style={{ filter: "drop-shadow(0 0 2px rgba(100,200,255,0.6))" }}
  />
);

// Seven-segment-style digit display
const SegDisplay: React.FC<{ value: string | number; color?: string }> = ({
  value,
  color = "#00e5ff",
}) => (
  <span
    className="font-mono font-black tabular-nums"
    style={{
      color,
      fontSize: "1.4rem",
      lineHeight: 1,
      textShadow: `0 0 8px ${color}99, 0 0 16px ${color}44`,
      letterSpacing: "0.05em",
    }}
  >
    {value}
  </span>
);

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  minesRemaining,
  totalMines,
  flagsPlaced,
  timeSeconds,
  difficulty,
  currentMinerFace,
  isMuted,
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

  const mins = Math.floor(timeSeconds / 60);
  const secs = timeSeconds % 60;
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  const threatPct = totalMines > 0 ? (minesRemaining / totalMines) * 100 : 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-20 overflow-hidden select-none">

      {/* ============================================================
          TOP BAR
      ============================================================ */}
      <header className="flex items-start gap-2 p-3 sm:p-4">

        {/* LEFT: Threat Counter */}
        <div className="kenney-panel px-3 py-2 pointer-events-auto flex flex-col gap-1 min-w-[80px]">
          <div className="flex items-center gap-1.5">
            <KIcon src="/ui/icon_target.png" size={14} />
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-400/80">Threats</span>
          </div>
          <SegDisplay value={minesRemaining.toString().padStart(2, "0")} color="#f87171" />
          {/* threat bar */}
          <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden mt-0.5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${threatPct}%`,
                background: `linear-gradient(90deg, #ef4444, #fbbf24)`,
                boxShadow: "0 0 6px #ef444488",
              }}
            />
          </div>
        </div>

        {/* CENTER: Title + Timer + Sector */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          {/* Title plate */}
          <div className="kenney-panel px-4 py-1.5 flex items-center gap-3">
            <img src="/ui/dotBlue.png" alt="" className="w-2.5 h-2.5 animate-pulse shrink-0" />
            <span className="text-sm font-black font-mono tracking-[0.3em] text-white">CUBOMB</span>
            <span className="text-[10px] font-mono text-cyan-400/70 tracking-wider uppercase hidden sm:inline">
              {DIFFICULTY_PRESETS[difficulty].name}
            </span>
            {currentMinerFace && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", color: "#67e8f9" }}>
                {currentMinerFace.toUpperCase()}
              </span>
            )}
          </div>

          {/* Timer */}
          <div className="kenney-panel px-4 py-2 flex items-center gap-2">
            <img src="/ui/dotBlue.png" alt="" className="w-2 h-2 shrink-0" style={{ filter: "hue-rotate(0deg)" }} />
            <SegDisplay value={timeStr} color="#e2e8f0" />
          </div>
        </div>

        {/* RIGHT: Flags + Controls */}
        <div className="flex flex-col gap-1.5 items-end pointer-events-auto">
          {/* Flag counter */}
          <div className="kenney-panel px-3 py-2 flex flex-col gap-1 min-w-[80px] items-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-400/80">Beacons</span>
              <KIcon src="/ui/icon_warning.png" size={14} />
            </div>
            <SegDisplay value={flagsPlaced.toString().padStart(2, "0")} color="#fbbf24" />
            {partySession && (
              <div className="flex items-center gap-1 mt-0.5">
                <KIcon src="/ui/icon_signal3.png" size={10} />
                <span className="text-[9px] font-mono text-cyan-300 tracking-widest">{partySession.code}</span>
              </div>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex gap-1">
            <KBtn onClick={() => { sound.playClick(); onOpenMenu?.(); }} title="Main Menu">
              <KIcon src="/ui/icon_gear.png" size={16} />
            </KBtn>
            <KBtn onClick={() => { sound.playClick(); onToggleMute(); }} title={isMuted ? "Unmute" : "Mute"}>
              <KIcon src={isMuted ? "/ui/icon_audioOff.png" : "/ui/icon_audioOn.png"} size={16} />
            </KBtn>
            <KBtn onClick={() => { sound.playClick(); setShowHelp(true); }} title="Guide">
              <KIcon src="/ui/icon_information.png" size={16} />
            </KBtn>
            <KBtn onClick={() => { sound.playClick(); onRestart(); }} title="Restart">
              <KIcon src="/ui/icon_return.png" size={16} />
            </KBtn>
          </div>
        </div>
      </header>

      {/* ============================================================
          MOBILE CONTROLS (touch only)
      ============================================================ */}
      <div className="sm:hidden pointer-events-none w-full flex items-end justify-between px-3 pb-3">
        {/* D-Pad: left thumb */}
        <div className="pointer-events-auto" style={{ touchAction: "none" }}>
          <div className="relative w-32 h-32">
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/ui/crossair_blue.png" alt="" className="w-6 h-6 opacity-50" />
            </div>
            {/* Up */}
            <button
              className="dpad-btn absolute top-0 left-1/2 -translate-x-1/2"
              onPointerDown={(e) => { e.stopPropagation(); onStartMove?.("up"); }}
              onPointerUp={(e) => { e.stopPropagation(); onStopMove?.(); }}
              onPointerLeave={() => onStopMove?.()}
              onPointerCancel={() => onStopMove?.()}
              aria-label="Up"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            {/* Down */}
            <button
              className="dpad-btn absolute bottom-0 left-1/2 -translate-x-1/2"
              onPointerDown={(e) => { e.stopPropagation(); onStartMove?.("down"); }}
              onPointerUp={(e) => { e.stopPropagation(); onStopMove?.(); }}
              onPointerLeave={() => onStopMove?.()}
              onPointerCancel={() => onStopMove?.()}
              aria-label="Down"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            {/* Left */}
            <button
              className="dpad-btn absolute left-0 top-1/2 -translate-y-1/2"
              onPointerDown={(e) => { e.stopPropagation(); onStartMove?.("left"); }}
              onPointerUp={(e) => { e.stopPropagation(); onStopMove?.(); }}
              onPointerLeave={() => onStopMove?.()}
              onPointerCancel={() => onStopMove?.()}
              aria-label="Left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {/* Right */}
            <button
              className="dpad-btn absolute right-0 top-1/2 -translate-y-1/2"
              onPointerDown={(e) => { e.stopPropagation(); onStartMove?.("right"); }}
              onPointerUp={(e) => { e.stopPropagation(); onStopMove?.(); }}
              onPointerLeave={() => onStopMove?.()}
              onPointerCancel={() => onStopMove?.()}
              aria-label="Right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reset view: right thumb */}
        <div className="pointer-events-auto">
          <button
            onClick={() => { sound.playClick(); onResetCamera(); }}
            className="kenney-btn flex flex-col items-center gap-1 px-3 py-2.5"
          >
            <img src="/ui/crossair_blue.png" alt="" className="w-5 h-5" />
            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-300">View</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          DESKTOP CONTROL PROMPTS BAR
      ============================================================ */}
      <footer className="hidden sm:flex justify-center pb-4 pointer-events-none">
        <div className="kenney-panel px-4 py-2.5 pointer-events-auto flex items-center gap-5">
          {/* Reset view */}
          <button
            onClick={() => { sound.playClick(); onResetCamera(); }}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
          >
            <img src="/ui/crossair_blue.png" alt="" className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Reset View</span>
          </button>

          <div className="w-px h-4 bg-white/10" />

          {/* WASD walk */}
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <img src="/ui/key_w.png" alt="W" className="w-6 h-6 object-contain"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,229,255,0.4))" }} />
              <img src="/ui/key_a.png" alt="A" className="w-6 h-6 object-contain"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,229,255,0.4))" }} />
              <img src="/ui/key_s.png" alt="S" className="w-6 h-6 object-contain"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,229,255,0.4))" }} />
              <img src="/ui/key_d.png" alt="D" className="w-6 h-6 object-contain"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,229,255,0.4))" }} />
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Walk</span>
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* Click to flag */}
          <div className="flex items-center gap-2">
            <img src="/ui/mouse_l.png" alt="Left click" className="w-6 h-6 object-contain"
              style={{ filter: "drop-shadow(0 1px 2px rgba(251,191,36,0.5))" }} />
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Flag</span>
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* Chord */}
          <div className="flex items-center gap-2">
            <span
              className="px-1.5 py-0.5 font-mono font-black text-[10px] rounded"
              style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.35)", color: "#67e8f9" }}
            >
              NUM
            </span>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Chord</span>
          </div>
        </div>
      </footer>

      {/* ============================================================
          HOW TO PLAY MODAL
      ============================================================ */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto">
          <div className="kenney-panel-lg max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <KIcon src="/ui/icon_information.png" size={16} />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-300">Tactical Manual</span>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="kenney-btn px-2 py-1 text-[10px] font-mono"
              >
                CLOSE
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="kenney-panel-inset p-3.5 space-y-3">
                <div className="font-mono text-cyan-400 font-bold text-[11px] uppercase tracking-wider mb-1">Controls</div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5 shrink-0">
                    {["key_w", "key_a", "key_s", "key_d"].map((k) => (
                      <img key={k} src={`/ui/${k}.png`} alt={k} className="w-6 h-6 object-contain"
                        style={{ filter: "drop-shadow(0 1px 3px rgba(0,229,255,0.5))" }} />
                    ))}
                  </div>
                  <span>Walk the astronaut — stepping on any hidden block clears it.</span>
                </div>
                <div className="flex items-center gap-3">
                  <img src="/ui/mouse_l.png" alt="click" className="w-6 h-6 object-contain shrink-0"
                    style={{ filter: "drop-shadow(0 1px 3px rgba(251,191,36,0.6))" }} />
                  <span>Click / Tap a block to place or remove a warning flag.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="shrink-0 px-2 py-0.5 font-mono font-black text-[10px] rounded"
                    style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.35)", color: "#67e8f9" }}>
                    NUM
                  </span>
                  <span>Click an opened number when all its mines are flagged to chord-sweep safe tiles.</span>
                </div>
              </div>

              <div className="kenney-panel-inset p-3.5">
                <div className="font-mono text-amber-400 font-bold text-[11px] uppercase tracking-wider mb-1.5">Goal</div>
                <p>Numbers show how many mines touch adjacent blocks. Sweep the entire surface to win.</p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-5 kenney-btn-primary py-2.5 text-xs font-black uppercase tracking-wider"
            >
              Resume Expedition
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          VICTORY OVERLAY
      ============================================================ */}
      {gameState === "won" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto">
          <div className="kenney-panel-lg max-w-sm w-full p-6 text-center text-slate-100"
            style={{ borderColor: "rgba(52,211,153,0.5)", boxShadow: "0 0 40px rgba(52,211,153,0.15), 0 20px 60px rgba(0,0,0,0.8)" }}>
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-2xl"
              style={{ background: "rgba(52,211,153,0.12)", border: "2px solid rgba(52,211,153,0.4)", boxShadow: "0 0 20px rgba(52,211,153,0.2)" }}>
              <KIcon src="/ui/icon_trophy.png" size={32} />
            </div>

            <h2 className="text-xl font-mono font-black uppercase tracking-widest mb-1"
              style={{ color: "#34d399", textShadow: "0 0 20px rgba(52,211,153,0.4)" }}>
              Mission Accomplished
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              {partySession ? "Planetary minefield cleared by your crew." : "All mines secured and neutralized."}
            </p>

            <div className="kenney-panel-inset p-3 mb-5 flex justify-around font-mono text-xs">
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Time</div>
                <SegDisplay value={timeStr} color="#34d399" />
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Cleared</div>
                <SegDisplay value={totalMines} color="#67e8f9" />
              </div>
            </div>

            {partySession && partySession.hostId !== currentPlayerId ? (
              <div className="space-y-2">
                <div className="kenney-panel-inset p-2.5 text-xs text-slate-400">
                  Waiting for host to launch next expedition...
                </div>
                <button onClick={() => { sound.playClick(); onLeaveParty?.(); }}
                  className="w-full kenney-btn py-2.5 text-xs font-bold uppercase tracking-wider">
                  Leave Party
                </button>
              </div>
            ) : (
              <button onClick={() => { sound.playClick(); onRestart(); }}
                className="w-full kenney-btn-primary py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #059669, #34d399)", boxShadow: "0 4px 20px rgba(52,211,153,0.3)" }}>
                <KIcon src="/ui/icon_return.png" size={16} />
                <span>{partySession ? "Next Party Expedition" : "Launch Next Mission"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          DEFEAT OVERLAY
      ============================================================ */}
      {gameState === "lost" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto">
          <div className="kenney-panel-lg max-w-sm w-full p-6 text-center text-slate-100"
            style={{ borderColor: "rgba(239,68,68,0.45)", boxShadow: "0 0 50px rgba(239,68,68,0.12), 0 20px 60px rgba(0,0,0,0.85)" }}>

            {/* Pulsing danger icon */}
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-2xl animate-pulse"
              style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.45)", boxShadow: "0 0 25px rgba(239,68,68,0.2)" }}>
              <KIcon src="/ui/icon_warning.png" size={32} />
            </div>

            <h2 className="text-xl font-mono font-black uppercase tracking-widest mb-1"
              style={{ color: "#f87171", textShadow: "0 0 20px rgba(239,68,68,0.4)" }}>
              Critical Detonation
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              {partySession?.explodedBy
                ? `Buried ordnance triggered by ${partySession.explodedBy}.`
                : "A buried ordnance was struck during exploration."}
            </p>

            {partySession && partySession.hostId !== currentPlayerId ? (
              <div className="space-y-2">
                <div className="kenney-panel-inset p-2.5 text-xs text-slate-400">
                  Waiting for host to reset expedition...
                </div>
                <button onClick={() => { sound.playClick(); onLeaveParty?.(); }}
                  className="w-full kenney-btn py-2.5 text-xs font-bold uppercase tracking-wider">
                  Leave Party
                </button>
              </div>
            ) : (
              <button onClick={() => { sound.playClick(); onRestart(); }}
                className="w-full kenney-btn-danger py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
                <KIcon src="/ui/icon_return.png" size={16} />
                <span>{partySession ? "Reset Party Expedition" : "Retry Expedition"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
