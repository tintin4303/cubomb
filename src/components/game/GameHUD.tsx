"use client";

import React, { useState } from "react";
import { Flag, Clock } from "lucide-react";
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
        {/* Sector Status Plate */}
        <div className="hud-panel px-3.5 py-2 rounded-xl pointer-events-auto flex items-center gap-2.5">
          <img src="/ui/dotBlue.png" alt="" className="w-2.5 h-2.5 animate-pulse" />
          <span className="text-xs font-mono font-black tracking-widest text-white">CUBOMB</span>
          <span className="text-slate-600">//</span>
          <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
            {DIFFICULTY_PRESETS[difficulty].name}
          </span>
          {currentMinerFace && (
            <>
              <span className="text-slate-600 hidden sm:inline">//</span>
              <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase hidden sm:inline bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                SEC: {currentMinerFace}
              </span>
            </>
          )}
        </div>

        {/* Center Counters (Tactical Ordinance Telemetry) */}
        <div className="hud-panel px-3.5 sm:px-5 py-2 rounded-xl pointer-events-auto flex items-center gap-3 sm:gap-6 font-mono text-xs">
          {/* Threats / Mines Remaining */}
          <div className="flex items-center gap-2" title="Unneutralized Mines">
            <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <img src="/ui/icon_target.png" alt="" className="w-3.5 h-3.5 invert opacity-90" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block leading-none">Threats</span>
              <span className="font-black text-rose-400 text-sm leading-tight sm:leading-none">
                {minesRemaining.toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-white/10" />

          {/* Active Beacons / Flags */}
          <div className="flex items-center gap-2" title="Deployed Beacons">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Flag className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block leading-none">Beacons</span>
              <span className="font-black text-amber-400 text-sm leading-tight sm:leading-none">
                {flagsPlaced.toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-white/10" />

          {/* Chronometer */}
          <div className="flex items-center gap-2" title="Mission Elapsed Time">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block leading-none">Elapsed</span>
              <span className="font-black text-slate-100 text-sm leading-tight sm:leading-none">{timeStr}</span>
            </div>
          </div>

          {/* Party Crew Link Badge */}
          {partySession && (
            <>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="flex items-center gap-2 text-cyan-400" title="Connected Crew Code">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                  <img src="/ui/icon_signal3.png" alt="" className="w-3.5 h-3.5 invert" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block leading-none">Crew Link</span>
                  <span className="font-black text-cyan-300 text-sm leading-tight sm:leading-none">{partySession.code}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="hud-panel p-1.5 rounded-xl pointer-events-auto flex items-center gap-1">
          <button
            onClick={() => {
              sound.playClick();
              onOpenMenu?.();
            }}
            className="w-8 h-8 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/10 flex items-center justify-center transition-colors group"
            title="Main Menu"
          >
            <img src="/ui/icon_gear.png" alt="Menu" className="w-4 h-4 invert opacity-75 group-hover:opacity-100 group-hover:rotate-45 transition-transform" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            className="w-8 h-8 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/10 flex items-center justify-center transition-colors group"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            <img
              src={isMuted ? "/ui/icon_audioOff.png" : "/ui/icon_audioOn.png"}
              alt="Audio"
              className="w-4 h-4 invert opacity-75 group-hover:opacity-100"
            />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setShowHelp(true);
            }}
            className="w-8 h-8 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/10 flex items-center justify-center transition-colors group"
            title="Tactical Guide"
          >
            <img src="/ui/icon_information.png" alt="Help" className="w-4 h-4 invert opacity-75 group-hover:opacity-100" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="w-8 h-8 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/10 flex items-center justify-center transition-colors group"
            title="Restart Mission"
          >
            <img src="/ui/icon_return.png" alt="Restart" className="w-4 h-4 invert opacity-75 group-hover:opacity-100 group-hover:-rotate-90 transition-transform" />
          </button>
        </div>
      </header>

      {/* Bottom Tactical Floating Input Prompts Bar */}
      <footer className="flex flex-col items-center gap-2.5 w-full pointer-events-none">
        <div className="hud-panel px-3.5 py-1.5 rounded-xl pointer-events-auto flex items-center gap-3 sm:gap-4 text-xs">
          {/* Reset Camera Button */}
          <button
            onClick={() => {
              sound.playClick();
              onResetCamera();
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            title="Recenter Camera Orbit"
          >
            <img src="/ui/crossair_blue.png" alt="" className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono tracking-wider uppercase">Reset View</span>
          </button>

          <div className="h-4 w-[1px] bg-white/15 hidden sm:block" />

          {/* Gamified Graphical Input Prompts */}
          <div className="flex items-center gap-3 sm:gap-4 text-slate-300 font-mono text-[11px]">
            {/* Traverse Prompt */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                <img src="/ui/key_w.png" alt="W" className="w-4 h-4 invert opacity-90" />
                <img src="/ui/key_a.png" alt="A" className="w-4 h-4 invert opacity-90" />
                <img src="/ui/key_s.png" alt="S" className="w-4 h-4 invert opacity-90" />
                <img src="/ui/key_d.png" alt="D" className="w-4 h-4 invert opacity-90" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Move</span>
            </div>

            <span className="text-slate-600 hidden sm:inline">•</span>

            {/* Excavate Prompt */}
            <div className="flex items-center gap-1.5">
              <img src="/ui/mouse_l.png" alt="L-Click" className="w-4 h-4 invert opacity-90" />
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Excavate / Chord</span>
            </div>

            <span className="text-slate-600 hidden sm:inline">•</span>

            {/* Flag Prompt */}
            <div className="flex items-center gap-1.5">
              <img src="/ui/mouse_r.png" alt="R-Click" className="w-4 h-4 invert opacity-90" />
              <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Flag Beacon</span>
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
                <img src="/ui/icon_information.png" alt="" className="w-4 h-4 invert text-cyan-400" />
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
              <div className="bg-slate-900/70 p-3.5 rounded-xl border border-white/5 space-y-2">
                <div className="font-mono text-cyan-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <span>Navigation & Surface Interaction</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="flex gap-0.5">
                    <img src="/ui/key_w.png" alt="W" className="w-4 h-4 invert" />
                    <img src="/ui/key_a.png" alt="A" className="w-4 h-4 invert" />
                    <img src="/ui/key_s.png" alt="S" className="w-4 h-4 invert" />
                    <img src="/ui/key_d.png" alt="D" className="w-4 h-4 invert" />
                  </div>
                  <span>Traverse the astronaut smoothly over all 6 planetary faces.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <img src="/ui/mouse_l.png" alt="Left Click" className="w-4 h-4 invert" />
                  <span><b>Left Click</b>: Excavate a surface block. First click is always safe.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <img src="/ui/mouse_r.png" alt="Right Click" className="w-4 h-4 invert" />
                  <span><b>Right Click / F key</b>: Deploy or retrieve a hazard warning beacon.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-white/10 text-cyan-300 font-bold">CHORD</span>
                  <span>Click an opened number when all its adjacent mines are flagged to sweep open remaining safe tiles.</span>
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
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center mb-3.5 shadow-lg shadow-emerald-500/10">
              <img src="/ui/icon_trophy.png" alt="Victory" className="w-7 h-7 invert opacity-95" />
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
                <img src="/ui/icon_return.png" alt="" className="w-4 h-4" />
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
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 mx-auto flex items-center justify-center mb-3.5 shadow-lg shadow-rose-500/20">
              <img src="/ui/icon_warning.png" alt="Detonation" className="w-7 h-7 invert opacity-95" />
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
                <img src="/ui/icon_return.png" alt="" className="w-4 h-4 invert" />
                <span>{partySession ? "Reset Party Expedition" : "Retry Expedition"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
