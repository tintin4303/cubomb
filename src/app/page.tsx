"use client";

import dynamic from "next/dynamic";
import { Pickaxe } from "lucide-react";

// Dynamically import Three.js game with SSR disabled to prevent server-side WebGL errors
const MinesweeperGame = dynamic(
  () => import("@/components/game/MinesweeperGame").then((mod) => mod.MinesweeperGame),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-slate-950 text-slate-200">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/30">
            <Pickaxe className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="text-xl font-bold tracking-wider text-cyan-400 animate-pulse">
          LOADING CUBOMB...
        </div>
        <p className="text-xs text-slate-500 mt-2">Preparing 3D Cube &amp; Miner Avatar</p>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <MinesweeperGame />
    </main>
  );
}
