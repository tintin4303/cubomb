import { PartySession, PartyPlayer, GameMode, Difficulty, DIFFICULTY_PRESETS, FaceDirection } from "@/components/game/types";

// In-memory global store for party rooms
declare global {
  var __3dminer_party_sessions: Map<string, PartySession> | undefined;
}

if (!global.__3dminer_party_sessions) {
  global.__3dminer_party_sessions = new Map<string, PartySession>();
}

const sessions = global.__3dminer_party_sessions;

// Clean up stale sessions older than 4 hours
function cleanStaleSessions() {
  const now = Date.now();
  for (const [code, session] of sessions.entries()) {
    if (now - session.updatedAt > 4 * 60 * 60 * 1000) {
      sessions.delete(code);
    }
  }
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createPartySession(params: {
  hostId: string;
  hostName: string;
  hostColor: string;
  mode?: GameMode;
  difficulty?: Difficulty;
  code?: string;
}): PartySession {
  cleanStaleSessions();

  const code = (params.code || generateRoomCode()).toUpperCase();
  const diff = params.difficulty || "medium";
  const cfg = DIFFICULTY_PRESETS[diff] || DIFFICULTY_PRESETS.medium;
  const mode = params.mode || "surface";

  const hostPlayer: PartyPlayer = {
    id: params.hostId,
    name: params.hostName || "Host Miner",
    color: params.hostColor || "#0284c7",
    isHost: true,
    coord: { face: "top" as FaceDirection, u: Math.floor(cfg.gridSize / 2), v: Math.floor(cfg.gridSize / 2) },
    position: { x: 0, y: (cfg.gridSize / 2) * 1.1 + 0.5, z: 0 },
    normal: { x: 0, y: 1, z: 0 },
    facing: 0,
    action: "idle",
    score: 0,
    lastPing: Date.now(),
  };

  const session: PartySession = {
    code,
    hostId: params.hostId,
    gameState: "lobby",
    mode,
    difficulty: diff,
    gridSize: cfg.gridSize,
    mines: cfg.mines,
    revealedCells: [],
    flaggedCells: [],
    players: {
      [params.hostId]: hostPlayer,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  sessions.set(code, session);
  return session;
}

export function getPartySession(code: string): PartySession | null {
  const s = sessions.get(code.toUpperCase());
  return s || null;
}

export function joinPartySession(code: string, player: { id: string; name: string; color: string }): PartySession | null {
  const session = sessions.get(code.toUpperCase());
  if (!session) return null;

  if (!session.players[player.id]) {
    const half = Math.floor(session.gridSize / 2);
    session.players[player.id] = {
      id: player.id,
      name: player.name || "Explorer",
      color: player.color || "#10b981",
      isHost: session.hostId === player.id,
      coord: { face: "top" as FaceDirection, u: half, v: half },
      position: { x: 0, y: half * 1.1 + 0.5, z: 0 },
      normal: { x: 0, y: 1, z: 0 },
      facing: 0,
      action: "idle",
      score: 0,
      lastPing: Date.now(),
    };
  } else {
    session.players[player.id].name = player.name;
    session.players[player.id].color = player.color;
    session.players[player.id].lastPing = Date.now();
  }

  session.updatedAt = Date.now();
  return session;
}

export function updatePartyPlayer(
  code: string,
  playerId: string,
  update: Partial<PartyPlayer>
): PartySession | null {
  const session = sessions.get(code.toUpperCase());
  if (!session || !session.players[playerId]) return null;

  Object.assign(session.players[playerId], update, { lastPing: Date.now() });
  session.updatedAt = Date.now();
  return session;
}

export function applyPartyAction(
  code: string,
  action: {
    type: "start" | "reveal" | "flag" | "game_over" | "leave" | "reset";
    playerId: string;
    cellId?: string;
    isFlagged?: boolean;
    explodedBy?: string;
    minesLocations?: string[];
  }
): PartySession | null {
  const session = sessions.get(code.toUpperCase());
  if (!session) return null;

  switch (action.type) {
    case "start":
      session.gameState = "playing";
      if (action.minesLocations) {
        session.mineLocations = action.minesLocations;
      }
      break;

    case "reveal":
      if (action.cellId && !session.revealedCells.includes(action.cellId)) {
        session.revealedCells.push(action.cellId);
        if (session.players[action.playerId]) {
          session.players[action.playerId].score += 1;
        }
      }
      break;

    case "flag":
      if (action.cellId) {
        if (action.isFlagged) {
          if (!session.flaggedCells.includes(action.cellId)) {
            session.flaggedCells.push(action.cellId);
          }
        } else {
          session.flaggedCells = session.flaggedCells.filter((id) => id !== action.cellId);
        }
      }
      break;

    case "game_over":
      session.gameState = "lost";
      session.explodedBy = action.explodedBy || session.players[action.playerId]?.name || "A miner";
      break;

    case "reset":
      session.gameState = "playing";
      session.revealedCells = [];
      session.flaggedCells = [];
      session.explodedBy = undefined;
      break;

    case "leave":
      delete session.players[action.playerId];
      if (session.hostId === action.playerId) {
        const remaining = Object.keys(session.players);
        if (remaining.length > 0) {
          session.hostId = remaining[0];
          session.players[remaining[0]].isHost = true;
        } else {
          sessions.delete(code.toUpperCase());
          return null;
        }
      }
      break;
  }

  session.updatedAt = Date.now();
  return session;
}
