import * as THREE from "three";

export type GameMode = "surface";
export type Difficulty = "easy" | "medium" | "hard" | "custom";

export type FaceDirection = "top" | "bottom" | "front" | "back" | "left" | "right";

export interface CellData {
  id: string;
  x: number;
  y: number;
  z: number;
  face?: FaceDirection; // for surface mode
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  mesh?: THREE.Mesh;
  sprite?: THREE.Sprite;
  flagMesh?: THREE.Group;
  mineMesh?: THREE.Group | THREE.Mesh;
  bedrockMesh?: THREE.Group | THREE.Mesh;
  isOuter?: boolean;
}

export type GameState = "idle" | "playing" | "won" | "lost";

export interface GameStats {
  timeSeconds: number;
  minesRemaining: number;
  totalMines: number;
  flagsPlaced: number;
  cellsRevealed: number;
  totalSafeCells: number;
  bestTime?: number;
}

export interface DifficultyConfig {
  name: string;
  gridSize: number;
  mines: number;
  description: string;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    name: "Novice",
    gridSize: 5,
    mines: 20,
    description: "5×5 faces (150 tiles, 20 mines). Great for quick expeditions!",
  },
  medium: {
    name: "Explorer",
    gridSize: 7,
    mines: 45,
    description: "7×7 faces (294 tiles, 45 mines). Deep quarry exploration.",
  },
  hard: {
    name: "Colossus (100 Mines)",
    gridSize: 9,
    mines: 99,
    description: "9×9 faces (486 tiles, 99 mines). The true 100-mine 3D challenge!",
  },
  custom: {
    name: "Surveyor",
    gridSize: 8,
    mines: 70,
    description: "8×8 faces (384 tiles, 70 mines).",
  },
};

export interface PartyPlayer {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  coord: { face: FaceDirection; u: number; v: number };
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  facing: number;
  action: "idle" | "walk" | "dig" | "celebrate" | "dead";
  score: number;
  lastPing: number;
}

export interface PartySession {
  code: string;
  hostId: string;
  gameState: "lobby" | "playing" | "won" | "lost";
  mode: GameMode;
  difficulty: Difficulty;
  gridSize: number;
  mines: number;
  revealedCells: string[];
  flaggedCells: string[];
  mineLocations?: string[];
  players: Record<string, PartyPlayer>;
  explodedBy?: string;
  createdAt: number;
  updatedAt: number;
}
