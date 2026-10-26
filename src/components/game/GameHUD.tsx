"use client";

import React, { useState, useRef } from "react";
import { LogOut } from "lucide-react";
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
  onJoystickMove?: (dir: { x: number; y: number }) => void;
  onJoystickStop?: () => void;
  onResetCamera: () => void;
  onCameraPreset: (preset: "front" | "back" | "top" | "bottom" | "left" | "right") => void;
  onRestart: () => void;
  onChangeDifficulty: (diff: Difficulty) => void;
  onToggleMute: () => void;
  onOpenMenu?: () => void;
  partySession?: PartySession | null;
  currentPlayerId?: string;
  onLeaveParty?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
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

// White Kenney icon displayed on a dark backing with sci-fi glow
const KIcon: React.FC<{ src: string; alt?: string; size?: number; className?: string }> = ({
  src,
  alt = "",
  size = 16,
  className = "",
}) => (
  <img
    src={src}
    alt={alt}
    width={size}
    height={size}
    className={`object-contain shrink-0 ${className}`}
    style={{ filter: "drop-shadow(0 0 2px rgba(100,200,255,0.6))" }}
  />
);

// Seven-segment-style digit display
const SegDisplay: React.FC<{ value: string | number; color?: string; size?: "sm" | "md" | "lg" }> = ({
  value,
  color = "#00e5ff",
  size = "md",
}) => {
  const fontSize = size === "sm" ? "1.05rem" : size === "lg" ? "1.5rem" : "1.25rem";
  return (
    <span
      className="font-mono font-black tabular-nums leading-none"
      style={{
        color,
        fontSize,
        textShadow: `0 0 8px ${color}99, 0 0 16px ${color}44`,
        letterSpacing: "0.04em",
      }}
    >
      {value}
    </span>
  );
};

// Roblox-style 360-degree virtual draggable thumbstick
const VirtualJoystick: React.FC<{
  onMove?: (dir: { x: number; y: number }) => void;
  onStop?: () => void;
}> = ({ onMove, onStop }) => {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);

  const maxRadius = 38;

  const updateKnob = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius;
      clampedY = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: clampedX, y: clampedY });

    const nx = clampedX / maxRadius;
    const ny = -clampedY / maxRadius;
    onMove?.({ x: nx, y: ny });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (touchIdRef.current !== null) return;
    touchIdRef.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActive(true);
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (touchIdRef.current !== e.pointerId) return;
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (touchIdRef.current !== e.pointerId) return;
    touchIdRef.current = null;
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    onStop?.();
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-32 h-32 rounded-full flex items-center justify-center select-none cursor-pointer"
      style={{
        background: active
          ? "radial-gradient(circle, rgba(0,229,255,0.15) 0%, rgba(6,12,24,0.92) 75%)"
          : "radial-gradient(circle, rgba(14,24,44,0.7) 0%, rgba(6,12,24,0.88) 80%)",
        border: active ? "1.5px solid rgba(0,229,255,0.6)" : "1.5px solid rgba(0,229,255,0.25)",
        boxShadow: active
          ? "0 0 24px rgba(0,229,255,0.25), inset 0 0 16px rgba(0,229,255,0.12)"
          : "0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
        touchAction: "none",
      }}
    >
      {/* Direction guide crosshair markings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
        <div className="w-16 h-px bg-cyan-400" />
        <div className="h-16 w-px bg-cyan-400 absolute" />
      </div>
      <div className="absolute w-20 h-20 rounded-full border border-cyan-500/20 pointer-events-none" />

      {/* Draggable thumb knob */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center pointer-events-none shadow-xl"
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          transition: active ? "none" : "transform 0.18s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
          background: active
            ? "linear-gradient(135deg, rgba(0,229,255,0.5) 0%, rgba(2,132,199,0.9) 100%)"
            : "linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)",
          border: active ? "2px solid #67e8f9" : "1.5px solid rgba(0,229,255,0.4)",
          boxShadow: active ? "0 0 16px rgba(0,229,255,0.6)" : "0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        <div className="w-3.5 h-3.5 rounded-full bg-cyan-300 opacity-90 shadow-sm" />
      </div>
    </div>
  );
};

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  minesRemaining,
  totalMines,
  flagsPlaced,
  timeSeconds,
  difficulty,
  currentMinerFace,
  isMuted,
  onJoystickMove,
  onJoystickStop,
  onResetCamera,
  onRestart,
  onToggleMute,
  onOpenMenu,
  partySession,
  currentPlayerId,
  onLeaveParty,
  onZoomIn,
  onZoomOut,
}) => {
  const [showHelp, setShowHelp] = useState(false);

  const mins = Math.floor(timeSeconds / 60);
  const secs = timeSeconds % 60;
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  const threatPct = totalMines > 0 ? Math.max(0, Math.min(100, (minesRemaining / totalMines) * 100)) : 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-20 overflow-hidden select-none">

      {/* ============================================================
          TOP HUD (Responsive for both Mobile & Desktop)
      ============================================================ */}
      <header className="w-full max-w-5xl mx-auto p-2 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 pointer-events-none">

        {/* ----------------- MOBILE ROW 1 (Brand + Quick Actions) ----------------- */}
        <div className="flex sm:hidden items-center justify-between w-full pointer-events-auto">
          {/* Brand + Sector chip */}
          <div className="kenney-panel px-2.5 py-1.5 flex items-center gap-2 shadow-md">
            <img src="/ui/dotBlue.png" alt="" className="w-2 h-2 animate-pulse shrink-0" />
            <span className="text-xs font-black font-mono tracking-widest text-white">CUBOMB</span>
            {currentMinerFace && (
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase"
                style={{
                  background: "rgba(0,229,255,0.12)",
                  border: "1px solid rgba(0,229,255,0.3)",
                  color: "#67e8f9",
                }}
              >
                {currentMinerFace}
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="kenney-panel p-1 flex items-center gap-1 shadow-md">
            <KBtn onClick={() => { sound.playClick(); onOpenMenu?.(); }} title="Exit to Menu" className="w-7 h-7 p-1">
              <LogOut className="w-3.5 h-3.5 text-slate-300 hover:text-rose-400 transition-colors" />
            </KBtn>
            <KBtn onClick={() => { sound.playClick(); onToggleMute(); }} title={isMuted ? "Unmute" : "Mute"} className="w-7 h-7 p-1">
              <KIcon src={isMuted ? "/ui/icon_audioOff.png" : "/ui/icon_audioOn.png"} size={14} />
            </KBtn>
            <KBtn onClick={() => { sound.playClick(); setShowHelp(true); }} title="Tactical Guide" className="w-7 h-7 p-1">
              <KIcon src="/ui/icon_information.png" size={14} />
            </KBtn>
            <KBtn onClick={() => { sound.playClick(); onRestart(); }} title="Restart Mission" className="w-7 h-7 p-1">
              <KIcon src="/ui/icon_return.png" size={14} />
            </KBtn>
          </div>
        </div>

        {/* ----------------- DESKTOP LEFT: Sector Plate (sm+ only) ----------------- */}
        <div className="hidden sm:flex kenney-panel px-3.5 py-2 pointer-events-auto items-center gap-2.5 shadow-lg">
          <img src="/ui/dotBlue.png" alt="" className="w-2.5 h-2.5 animate-pulse shrink-0" />
          <span className="text-sm font-black font-mono tracking-[0.25em] text-white">CUBOMB</span>
          <span className="text-slate-600">//</span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {DIFFICULTY_PRESETS[difficulty].name}
          </span>
          {currentMinerFace && (
            <>
              <span className="text-slate-600">//</span>
              <span
                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase"
                style={{
                  background: "rgba(0,229,255,0.12)",
                  border: "1px solid rgba(0,229,255,0.3)",
                  color: "#67e8f9",
                }}
              >
                SEC: {currentMinerFace}
              </span>
            </>
          )}
        </div>

        {/* ----------------- CENTER: Tactical Telemetry HUD (All screens) ----------------- */}
        <div className="flex justify-center w-full sm:w-auto pointer-events-auto">
          <div className="kenney-panel px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-3 sm:gap-5 w-full sm:w-auto shadow-lg">

            {/* Bombs Counter */}
            <div className="flex items-center gap-1.5 sm:gap-2" title="Unneutralized Bombs">
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" }}
              >
                <KIcon src="/ui/icon_target.png" size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400/80 leading-none">
                  Bombs
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <SegDisplay value={minesRemaining.toString().padStart(2, "0")} color="#f87171" size="sm" />
                </div>
                {/* Bomb threat progress bar */}
                <div className="w-10 sm:w-12 h-1 rounded-full bg-slate-800/80 overflow-hidden mt-0.5 hidden xs:block">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${threatPct}%`,
                      background: "linear-gradient(90deg, #ef4444, #fbbf24)",
                      boxShadow: "0 0 4px #ef4444aa",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 sm:h-7 bg-white/10 shrink-0" />

            {/* Mission Elapsed Time */}
            <div className="flex flex-col items-center px-1" title="Mission Elapsed Time">
              <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                Elapsed
              </span>
              <SegDisplay value={timeStr} color="#e2e8f0" size="sm" />
            </div>

            {/* Divider */}
            <div className="w-px h-6 sm:h-7 bg-white/10 shrink-0" />

            {/* Beacons Deployed */}
            <div className="flex items-center gap-1.5 sm:gap-2" title="Deployed Beacons">
              <div className="flex flex-col items-end">
                <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400/80 leading-none">
                  Beacons
                </span>
                <div className="mt-0.5">
                  <SegDisplay value={flagsPlaced.toString().padStart(2, "0")} color="#fbbf24" size="sm" />
                </div>
              </div>
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)" }}
              >
                <KIcon src="/ui/icon_warning.png" size={14} />
              </div>
            </div>

            {/* Party Crew Link Badge (if active) */}
            {partySession && (
              <>
                <div className="w-px h-6 sm:h-7 bg-white/10 shrink-0" />
                <div className="flex items-center gap-1" title="Party Room Code">
                  <KIcon src="/ui/icon_signal3.png" size={12} />
                  <span className="text-[10px] sm:text-[11px] font-mono font-black text-cyan-300 tracking-widest">
                    {partySession.code}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ----------------- DESKTOP RIGHT: Action Controls (sm+ only) ----------------- */}
        <div className="hidden sm:flex kenney-panel p-1 pointer-events-auto items-center gap-1 shadow-lg">
          <KBtn
            onClick={() => {
              sound.playClick();
              onOpenMenu?.();
            }}
            title="Exit to Menu"
            className="w-8 h-8"
          >
            <LogOut className="w-4 h-4 text-slate-300 hover:text-rose-400 transition-colors" />
          </KBtn>
          <KBtn
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
            className="w-8 h-8"
          >
            <KIcon src={isMuted ? "/ui/icon_audioOff.png" : "/ui/icon_audioOn.png"} size={16} />
          </KBtn>
          <KBtn
            onClick={() => {
              sound.playClick();
              setShowHelp(true);
            }}
            title="Tactical Guide"
            className="w-8 h-8"
          >
            <KIcon src="/ui/icon_information.png" size={16} />
          </KBtn>
          <KBtn
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            title="Restart Mission"
            className="w-8 h-8"
          >
            <KIcon src="/ui/icon_return.png" size={16} />
          </KBtn>
        </div>
      </header>

      {/* ============================================================
          MOBILE CONTROLS (Draggable Joystick + Zoom/View Controls)
      ============================================================ */}
      <div
        className="sm:hidden pointer-events-none w-full flex items-end justify-between px-4 pb-6"
        style={{
          paddingBottom: "max(2.25rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))",
        }}
      >
        {/* Roblox-Style Draggable Virtual Thumbstick: left thumb */}
        <div className="pointer-events-auto" style={{ touchAction: "none" }}>
          <VirtualJoystick onMove={onJoystickMove} onStop={onJoystickStop} />
        </div>

        {/* Right thumb: Camera Zoom & View cluster */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5 select-none">
          {/* Zoom In */}
          <button
            onClick={() => { sound.playClick(); onZoomIn?.(); }}
            className="kenney-btn w-10 h-10 flex items-center justify-center font-mono font-black text-cyan-300 text-base shadow-xl active:scale-95"
            title="Zoom In"
            aria-label="Zoom In"
          >
            +
          </button>
          {/* Zoom Out */}
          <button
            onClick={() => { sound.playClick(); onZoomOut?.(); }}
            className="kenney-btn w-10 h-10 flex items-center justify-center font-mono font-black text-cyan-300 text-base shadow-xl active:scale-95"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            -
          </button>
          {/* Reset view */}
          <button
            onClick={() => { sound.playClick(); onResetCamera(); }}
            className="kenney-btn w-10 h-11 flex flex-col items-center justify-center gap-0.5 shadow-xl active:scale-95"
            title="Reset Camera View"
            aria-label="Reset View"
          >
            <img src="/ui/crossair_blue.png" alt="" className="w-4 h-4 object-contain" />
            <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-cyan-300">View</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          DESKTOP CONTROL PROMPTS BAR (Hidden on mobile)
      ============================================================ */}
      <footer className="hidden sm:flex justify-center pb-4 pointer-events-none">
        <div className="kenney-panel px-4 py-2.5 pointer-events-auto flex items-center gap-5 shadow-xl">
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
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Walk to Reveal</span>
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* Deploy Beacon */}
          <div className="flex items-center gap-2">
            <img src="/ui/mouse_l.png" alt="Left click" className="w-6 h-6 object-contain"
              style={{ filter: "drop-shadow(0 1px 2px rgba(251,191,36,0.5))" }} />
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Deploy Beacon</span>
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
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Chord Sweep</span>
          </div>
        </div>
      </footer>

      {/* ============================================================
          HOW TO PLAY MODAL
      ============================================================ */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto">
          <div className="kenney-panel-lg max-w-md w-full p-5 sm:p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <KIcon src="/ui/icon_information.png" size={16} />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-300">Tactical Manual</span>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="kenney-btn px-2.5 py-1 text-[10px] font-mono"
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
                  <span>Walk the astronaut — stepping onto any hidden block reveals it.</span>
                </div>
                <div className="flex items-center gap-3">
                  <img src="/ui/mouse_l.png" alt="click" className="w-6 h-6 object-contain shrink-0"
                    style={{ filter: "drop-shadow(0 1px 3px rgba(251,191,36,0.6))" }} />
                  <span>Click or tap an unopened block to deploy a warning beacon.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="shrink-0 px-2 py-0.5 font-mono font-black text-[10px] rounded"
                    style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.35)", color: "#67e8f9" }}>
                    NUM
                  </span>
                  <span>Click an opened number when all its adjacent bombs have beacons deployed to sweep safe neighbor tiles.</span>
                </div>
              </div>

              <div className="kenney-panel-inset p-3.5">
                <div className="font-mono text-amber-400 font-bold text-[11px] uppercase tracking-wider mb-1.5">Mission Objective</div>
                <p>Numeric tags indicate how many bombs occupy adjacent blocks in 3D space. Sweep the entire planetary crust to secure the expedition.</p>
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
          <div
            className="kenney-panel-lg max-w-sm w-full p-5 sm:p-6 text-center text-slate-100"
            style={{
              borderColor: "rgba(52,211,153,0.5)",
              boxShadow: "0 0 40px rgba(52,211,153,0.15), 0 20px 60px rgba(0,0,0,0.8)",
            }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-2xl"
              style={{
                background: "rgba(52,211,153,0.12)",
                border: "2px solid rgba(52,211,153,0.4)",
                boxShadow: "0 0 20px rgba(52,211,153,0.2)",
              }}
            >
              <KIcon src="/ui/icon_trophy.png" size={32} />
            </div>

            <h2
              className="text-xl font-mono font-black uppercase tracking-widest mb-1"
              style={{ color: "#34d399", textShadow: "0 0 20px rgba(52,211,153,0.4)" }}
            >
              Mission Accomplished
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              {partySession ? "Planetary bomb field cleared by your crew." : "All bombs secured and neutralized."}
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
                <button
                  onClick={() => { sound.playClick(); onLeaveParty?.(); }}
                  className="w-full kenney-btn py-2.5 text-xs font-bold uppercase tracking-wider"
                >
                  Leave Party
                </button>
              </div>
            ) : (
              <button
                onClick={() => { sound.playClick(); onRestart(); }}
                className="w-full kenney-btn-primary py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #059669, #34d399)", boxShadow: "0 4px 20px rgba(52,211,153,0.3)" }}
              >
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
          <div
            className="kenney-panel-lg max-w-sm w-full p-5 sm:p-6 text-center text-slate-100"
            style={{
              borderColor: "rgba(239,68,68,0.45)",
              boxShadow: "0 0 50px rgba(239,68,68,0.12), 0 20px 60px rgba(0,0,0,0.85)",
            }}
          >
            {/* Pulsing danger icon */}
            <div
              className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-2xl animate-pulse"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "2px solid rgba(239,68,68,0.45)",
                boxShadow: "0 0 25px rgba(239,68,68,0.2)",
              }}
            >
              <KIcon src="/ui/icon_warning.png" size={32} />
            </div>

            <h2
              className="text-xl font-mono font-black uppercase tracking-widest mb-1"
              style={{ color: "#f87171", textShadow: "0 0 20px rgba(239,68,68,0.4)" }}
            >
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
                <button
                  onClick={() => { sound.playClick(); onLeaveParty?.(); }}
                  className="w-full kenney-btn py-2.5 text-xs font-bold uppercase tracking-wider"
                >
                  Leave Party
                </button>
              </div>
            ) : (
              <button
                onClick={() => { sound.playClick(); onRestart(); }}
                className="w-full kenney-btn-danger py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
              >
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
