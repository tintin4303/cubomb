"use client";

import React, { useState } from "react";
import {
  Bomb,
  Flag,
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  User,
  HelpCircle,
  Play,
  Trophy,
  Sliders,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Clock,
  Pickaxe,
  Globe,
  Gamepad2,
  Menu,
  Users,
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
  interactMode: "reveal" | "flag";
  followMiner: boolean;
  currentMinerFace?: "top" | "bottom" | "front" | "back" | "left" | "right";
  isMuted: boolean;
  onSetInteractMode: (mode: "reveal" | "flag") => void;
  onToggleFollowMiner: () => void;
  onResetCamera: () => void;
  onCameraPreset: (preset: "front" | "back" | "top" | "bottom" | "left" | "right" | "iso" | "miner") => void;
  onRestart: () => void;
  onChangeDifficulty: (diff: Difficulty) => void;
  onToggleMute: () => void;
  onMinerAction?: (action: "step" | "dig" | "flag", du?: number | string, dv?: number) => void;
  onStartMove?: (dir: "up" | "down" | "left" | "right") => void;
  onStopMove?: () => void;
  onOpenMenu?: () => void;
  partySession?: PartySession | null;
  onLeaveParty?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  minesRemaining,
  totalMines,
  flagsPlaced,
  timeSeconds,
  difficulty,
  interactMode,
  followMiner,
  currentMinerFace,
  isMuted,
  onSetInteractMode,
  onToggleFollowMiner,
  onResetCamera,
  onCameraPreset,
  onRestart,
  onChangeDifficulty,
  onToggleMute,
  onMinerAction,
  onStartMove,
  onStopMove,
  onOpenMenu,
  partySession,
  onLeaveParty,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Format timer MM:SS
  const mins = Math.floor(timeSeconds / 60);
  const secs = timeSeconds % 60;
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-20 overflow-hidden font-sans select-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      {/* --- TOP BAR --- */}
      <header className="flex flex-wrap items-center justify-between gap-3 w-full">
        {/* Game Title & Status */}
        <div className="glass-panel px-4 py-2.5 rounded-xl pointer-events-auto flex items-center gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Bomb className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-300">
                3D MINESWEEPER
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                <span className="capitalize text-cyan-400 font-semibold">Cube</span>
                <span>•</span>
                <span className="capitalize">{DIFFICULTY_PRESETS[difficulty].name}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setShowSettings(true);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition-colors ml-1"
            title="Difficulty & Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        {/* Active Planet Face Indicator */}
        {currentMinerFace && (
          <div className="glass-panel px-3.5 py-2 rounded-xl pointer-events-auto flex items-center gap-2.5 shadow-lg border border-cyan-500/30">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-400/80" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Miner Location</span>
              <span className="text-xs font-mono uppercase font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-200">
                {currentMinerFace} Face
              </span>
            </div>
          </div>
        )}

        {/* Center Counters (Mines & Timer) */}
        <div className="glass-panel px-5 py-2.5 rounded-xl pointer-events-auto flex items-center gap-6 shadow-lg">
          {/* Mine counter */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <Bomb className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Mines</div>
              <div className="text-xl font-mono font-bold text-red-400 leading-none">
                {minesRemaining.toString().padStart(2, "0")}
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-slate-700/60" />

          {/* Flags placed */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Flags</div>
              <div className="text-xl font-mono font-bold text-amber-400 leading-none">
                {flagsPlaced.toString().padStart(2, "0")}
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-slate-700/60" />

          {/* Timer */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Time</div>
              <div className="text-xl font-mono font-bold text-emerald-400 leading-none">
                {timeStr}
              </div>
            </div>
          </div>

          {/* Active Party Indicator */}
          {partySession && (
            <div className="glass-panel px-3 py-1.5 rounded-2xl pointer-events-auto flex items-center gap-2 text-xs shadow-xl border border-purple-500/40 bg-purple-950/40">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="hidden sm:inline">Room:</span>
                <span className="font-mono font-black text-white">{partySession.code}</span>
              </div>
              <div className="flex items-center -space-x-1 pl-1">
                {Object.values(partySession.players || {}).map((p) => (
                  <div
                    key={p.id}
                    className="w-4 h-4 rounded-full border border-slate-900 shadow-sm"
                    style={{ backgroundColor: p.color }}
                    title={`${p.name} (Cleared: ${p.score})`}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  onLeaveParty?.();
                }}
                className="text-[10px] text-rose-400 hover:text-rose-200 font-bold uppercase ml-1 px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-800/40"
              >
                Leave
              </button>
            </div>
          )}
        </div>

        {/* Utility Controls */}
        <div className="glass-panel px-2.5 py-1.5 rounded-2xl pointer-events-auto flex items-center gap-1.5 shadow-xl border border-slate-700/50">
          <button
            onClick={() => {
              sound.playClick();
              onOpenMenu?.();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-900/50 transition-colors flex items-center gap-1 font-bold text-xs"
            title="Start Menu & Party Rooms"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">Menu</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            className={`p-2 rounded-xl transition-colors ${
              isMuted ? "text-red-400 hover:bg-red-950/30" : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setShowHelp(true);
            }}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Restart Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* --- BOTTOM FLOATING ACTION DOCK --- */}
      <footer className="flex flex-col items-center gap-3 w-full">
        <div className="glass-panel px-4 py-2 rounded-2xl pointer-events-auto flex flex-wrap items-center justify-center gap-3 shadow-2xl border border-slate-700/50">
          {/* Interaction Mode Toggle (Walk / Reveal vs Flag Mode) */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700/60 shadow-inner">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement)?.blur();
              }}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                sound.playClick();
                onSetInteractMode("reveal");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                interactMode === "reveal"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-900/30 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Walk & Step Mode: Walk onto tiles to reveal them"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Walk</span>
            </button>

            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement)?.blur();
              }}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                sound.playClick();
                onSetInteractMode("flag");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                interactMode === "flag"
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-950/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Flag Mode: Click or tap any tile anywhere to flag it"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Flag</span>
            </button>
          </div>

          <div className="h-6 w-[1px] bg-slate-700/60 hidden sm:block" />

          {/* Camera & Miner Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement)?.blur();
              }}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                sound.playClick();
                onToggleFollowMiner();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors border ${
                followMiner
                  ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                  : "bg-slate-800/60 border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
              title="Camera follows miner avatar"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Track Miner</span>
            </button>

            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement)?.blur();
              }}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                sound.playClick();
                onResetCamera();
              }}
              className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset Orbit Camera"
            >
              <Compass className="w-4 h-4" />
            </button>

            {/* Quick Face Presets */}
            <div className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
              {(["top", "front", "right", "back", "left", "bottom"] as const).map((face) => (
                <button
                  key={face}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    (e.currentTarget as HTMLElement)?.blur();
                  }}
                  onClick={(e) => {
                    (e.currentTarget as HTMLElement)?.blur();
                    sound.playClick();
                    onCameraPreset(face);
                  }}
                  className={`px-2 py-1 rounded-lg capitalize transition-all ${
                    currentMinerFace === face
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold"
                      : "hover:bg-slate-800 hover:text-white"
                  }`}
                  title={`View ${face} face`}
                >
                  {face}
                </button>
              ))}
              <div className="h-4 w-[1px] bg-slate-700/60 mx-0.5" />
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement)?.blur();
                }}
                onClick={(e) => {
                  (e.currentTarget as HTMLElement)?.blur();
                  sound.playClick();
                  onCameraPreset("iso");
                }}
                className="px-2 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                title="Isometric 3D Orbit"
              >
                Iso
              </button>
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement)?.blur();
                }}
                onClick={(e) => {
                  (e.currentTarget as HTMLElement)?.blur();
                  sound.playClick();
                  onCameraPreset("miner");
                }}
                className="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 transition-colors flex items-center gap-1 font-bold"
                title="Focus Camera directly on Miner"
              >
                <User className="w-3 h-3" />
                <span>Focus</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Helper Text */}
        <div className="text-[11px] text-slate-400/80 tracking-wide font-medium hidden sm:flex items-center gap-3 bg-slate-950/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-800/60 shadow-lg">
          <span>WASD / Arrows: <b className="text-slate-200">Walk</b></span>
          <span>•</span>
          <span>Right-Click / F: <b className="text-amber-300">Flag Anywhere</b></span>
          <span>•</span>
          <span>Click Number: <b className="text-cyan-300">Chord</b></span>
        </div>
      </footer>

      {/* --- MOBILE TOUCH CONTROLS (Dual-Thumb Ergonomic Layout) --- */}
      {/* Left Thumb: 4-Way D-Pad to Walk */}
      <div className="sm:hidden absolute bottom-20 left-3 pointer-events-auto flex flex-col items-center select-none">
        <div className="glass-panel p-1.5 rounded-2xl grid grid-cols-3 gap-1.5 w-36 shadow-2xl border border-slate-700/60 bg-slate-950/85">
          <div />
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget as HTMLElement)?.blur();
              onStartMove?.("up");
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onStopMove?.();
            }}
            onPointerLeave={() => onStopMove?.()}
            onPointerCancel={() => onStopMove?.()}
            onTouchEnd={() => onStopMove?.()}
            className="h-11 rounded-xl bg-slate-800 text-cyan-300 flex items-center justify-center font-bold active:bg-cyan-600 active:text-white transition-all shadow-md active:scale-95"
            aria-label="Walk Up"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <div />
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget as HTMLElement)?.blur();
              onStartMove?.("left");
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onStopMove?.();
            }}
            onPointerLeave={() => onStopMove?.()}
            onPointerCancel={() => onStopMove?.()}
            onTouchEnd={() => onStopMove?.()}
            className="h-11 rounded-xl bg-slate-800 text-cyan-300 flex items-center justify-center font-bold active:bg-cyan-600 active:text-white transition-all shadow-md active:scale-95"
            aria-label="Walk Left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center text-[9px] uppercase tracking-wider text-slate-400 font-black">
            WALK
          </div>
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget as HTMLElement)?.blur();
              onStartMove?.("right");
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onStopMove?.();
            }}
            onPointerLeave={() => onStopMove?.()}
            onPointerCancel={() => onStopMove?.()}
            onTouchEnd={() => onStopMove?.()}
            className="h-11 rounded-xl bg-slate-800 text-cyan-300 flex items-center justify-center font-bold active:bg-cyan-600 active:text-white transition-all shadow-md active:scale-95"
            aria-label="Walk Right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div />
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget as HTMLElement)?.blur();
              onStartMove?.("down");
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onStopMove?.();
            }}
            onPointerLeave={() => onStopMove?.()}
            onPointerCancel={() => onStopMove?.()}
            onTouchEnd={() => onStopMove?.()}
            className="h-11 rounded-xl bg-slate-800 text-cyan-300 flex items-center justify-center font-bold active:bg-cyan-600 active:text-white transition-all shadow-md active:scale-95"
            aria-label="Walk Down"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <div />
        </div>
      </div>

      {/* Right Thumb: Dedicated Flag Button (Toggle Flag Mode Anywhere) */}
      <div className="sm:hidden absolute bottom-20 right-4 pointer-events-auto flex flex-col gap-2.5 items-end select-none">
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.currentTarget as HTMLElement)?.blur();
          }}
          onClick={(e) => {
            (e.currentTarget as HTMLElement)?.blur();
            sound.playClick();
            onSetInteractMode(interactMode === "flag" ? "reveal" : "flag");
          }}
          className={`w-16 h-16 rounded-2xl border font-bold flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all ${
            interactMode === "flag"
              ? "bg-gradient-to-tr from-amber-500 to-orange-500 border-amber-300 text-white ring-4 ring-amber-500/40"
              : "bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white"
          }`}
          title="Toggle Flag Mode Anywhere"
          aria-label="Toggle Flag Mode Anywhere"
        >
          <Flag className={`w-6 h-6 ${interactMode === "flag" ? "text-white" : "text-amber-400"}`} />
          <span className="text-[10px] font-black uppercase mt-1 tracking-wider">
            {interactMode === "flag" ? "Flag ON" : "Flag"}
          </span>
        </button>
      </div>

      {/* --- SETTINGS / DIFFICULTY MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 pointer-events-auto">
          <div className="glass-panel-glow max-w-md w-full rounded-2xl p-6 text-slate-100 shadow-2xl border border-cyan-500/30">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
              <Sliders className="w-5 h-5" /> Game Setup
            </h3>

            {/* Difficulty selection */}
            <div className="mb-6">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2">
                Difficulty
              </label>
              <div className="space-y-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => {
                  const cfg = DIFFICULTY_PRESETS[diff];
                  const isSel = difficulty === diff;
                  return (
                    <button
                      key={diff}
                      onClick={() => {
                        sound.playClick();
                        onChangeDifficulty(diff);
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSel
                          ? "border-cyan-400 bg-cyan-950/40 text-white"
                          : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-200">{cfg.name}</div>
                        <div className="text-[11px] text-slate-400">{cfg.description}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {cfg.mines} Mines
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setShowSettings(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setShowSettings(false);
                  onRestart();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-cyan-900/40 transition-all flex items-center gap-1.5"
              >
                <Play className="w-4 h-4" /> Start New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HOW TO PLAY MODAL --- */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 pointer-events-auto">
          <div className="glass-panel-glow max-w-lg w-full rounded-2xl p-6 text-slate-100 shadow-2xl border border-cyan-500/30">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
              <HelpCircle className="w-5 h-5" /> How to Play
            </h3>

            <div className="space-y-4 text-xs text-slate-300 mb-6 leading-relaxed">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-sky-400 text-sm mb-1 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Controls & Movement</span>
                </div>
                <p>• <b>Rotate Camera</b>: Left-click & drag anywhere outside a block, or swipe.</p>
                <p>• <b>Zoom</b>: Mouse scroll wheel or pinch to zoom.</p>
                <p>• <b>Move Miner</b>: Click any block to pathfind there, or use <b>WASD / Arrow Keys</b>.</p>
                <p>• <b>Dig Tile</b>: Left-click a block, or press <b>Space / E</b> to dig where the miner stands.</p>
                <p>• <b>Flag Tile</b>: Right-click a block, press <b>F / Q</b>, or use Flag Mode toggle.</p>
                <p>• <b>Chording (Pro Tip)</b>: Click an already revealed number when all its mines are flagged to instantly sweep open all remaining safe neighbors!</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-emerald-400 text-sm mb-1 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  <span>3D Rules & Mechanics</span>
                </div>
                <p>• The numbers show how many neighboring blocks contain mines!</p>
                <p>• The miner can walk over the edges to all 6 faces of the cube planet seamlessly.</p>
                <p>• First click is <b>guaranteed safe</b> and unlocks an open cluster!</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  sound.playClick();
                  setShowHelp(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold shadow-lg transition-all"
              >
                Got It, Let's Play!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GAME OVER / VICTORY OVERLAYS --- */}
      {gameState === "won" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="glass-panel-glow max-w-sm w-full rounded-2xl p-6 text-center text-slate-100 shadow-2xl border border-emerald-500/50 animate-bounce-short">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 mb-1">
              MISSION COMPLETE!
            </h2>
            <p className="text-xs text-slate-400 mb-4">You cleared all mines on the cube without a scratch!</p>

            <div className="bg-slate-900/60 rounded-xl p-3 mb-5 border border-slate-800 flex justify-around">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Time Taken</div>
                <div className="text-lg font-mono font-bold text-emerald-400">{timeStr}</div>
              </div>
              <div className="w-[1px] bg-slate-800" />
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Mines Cleared</div>
                <div className="text-lg font-mono font-bold text-cyan-400">{totalMines}</div>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onRestart();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Play Again
            </button>
          </div>
        </div>
      )}

      {gameState === "lost" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="glass-panel-glow max-w-sm w-full rounded-2xl p-6 text-center text-slate-100 shadow-2xl border border-red-500/50">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-red-500/20">
              <Bomb className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 mb-1">
              DETONATION!
            </h2>
            <p className="text-xs text-slate-400 mb-4">You struck a hidden mine. Don&apos;t give up, Commander!</p>

            <button
              onClick={() => {
                sound.playClick();
                onRestart();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-sm shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
