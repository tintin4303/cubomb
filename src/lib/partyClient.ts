import { PartySession, PartyPlayer, GameMode, Difficulty, FaceDirection, DIFFICULTY_PRESETS } from "@/components/game/types";
import { getSupabaseClient } from "./supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PartyUpdateCallback = (session: PartySession) => void;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class PartyClient {
  public session: PartySession | null = null;
  public playerId: string = "";
  public playerName: string = "Miner";
  public playerColor: string = "#0284c7";
  public isConnectedRealtime: boolean = false;

  private realtimeChannel: RealtimeChannel | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private listeners: Set<PartyUpdateCallback> = new Set();
  private lastHeartbeatSent: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.playerId =
        localStorage.getItem("cubomb_player_id") ||
        localStorage.getItem("3dminer_player_id") ||
        `miner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem("cubomb_player_id", this.playerId);

      this.playerName =
        localStorage.getItem("cubomb_player_name") ||
        localStorage.getItem("3dminer_player_name") ||
        "Miner";
      this.playerColor =
        localStorage.getItem("cubomb_player_color") ||
        localStorage.getItem("3dminer_player_color") ||
        "#0284c7";

      try {
        this.broadcastChannel = new BroadcastChannel("cubomb_party_broadcast");
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === "party_update" && event.data.session) {
            const incoming: PartySession = event.data.session;
            if (this.session && incoming.code === this.session.code) {
              this.syncSessionState(incoming);
            }
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel unavailable, using network transport", err);
      }
    }
  }

  public setPlayerProfile(name: string, color: string) {
    this.playerName = name;
    this.playerColor = color;
    if (typeof window !== "undefined") {
      localStorage.setItem("cubomb_player_name", name);
      localStorage.setItem("cubomb_player_color", color);
    }
    if (this.session && this.session.players[this.playerId]) {
      this.session.players[this.playerId].name = name;
      this.session.players[this.playerId].color = color;
      this.notify();
    }
    if (this.realtimeChannel && this.isConnectedRealtime) {
      this.realtimeChannel.track({
        id: this.playerId,
        name: this.playerName,
        color: this.playerColor,
        isHost: this.session?.hostId === this.playerId,
      });
    }
  }

  public subscribe(cb: PartyUpdateCallback): () => void {
    this.listeners.add(cb);
    if (this.session) cb(this.session);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    if (!this.session) return;
    this.listeners.forEach((cb) => cb(this.session!));
  }

  private broadcastLocally() {
    if (this.broadcastChannel && this.session) {
      try {
        this.broadcastChannel.postMessage({
          type: "party_update",
          session: this.session,
        });
      } catch (err) {
        console.error("Local broadcast failed", err);
      }
    }
  }

  // Set up Supabase Realtime Channel for global low-latency multiplayer
  private setupRealtimeChannel(code: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch {}
      this.realtimeChannel = null;
    }

    const chanName = `cubomb_party_${code.toUpperCase()}`;
    const channel = supabase.channel(chanName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: this.playerId },
      },
    });

    // 1. Presence Sync
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      this.handlePresenceSync(state);
    });

    // 2. High-speed Player Pose (Avatar movement / rotation / animation)
    channel.on("broadcast", { event: "player_pose" }, ({ payload }) => {
      if (payload?.playerId && payload.playerId !== this.playerId) {
        this.handleRemotePose(payload);
      }
    });

    // 3. Gameplay Action (Reveal, Flag, Start, Game Over, Reset)
    channel.on("broadcast", { event: "party_action" }, ({ payload }) => {
      if (payload?.action) {
        this.handleRemoteAction(payload.action);
      }
    });

    // 4. Request full state from host upon entering ongoing game
    channel.on("broadcast", { event: "request_state" }, ({ payload }) => {
      if (this.session && this.session.hostId === this.playerId) {
        channel.send({
          type: "broadcast",
          event: "sync_state",
          payload: {
            session: this.session,
            targetPlayerId: payload?.playerId,
          },
        });
      }
    });

    // 5. State snapshot received from host
    channel.on("broadcast", { event: "sync_state" }, ({ payload }) => {
      if (payload?.session && (!payload.targetPlayerId || payload.targetPlayerId === this.playerId)) {
        this.syncSessionState(payload.session);
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        this.isConnectedRealtime = true;
        channel.track({
          id: this.playerId,
          name: this.playerName,
          color: this.playerColor,
          isHost: this.session?.hostId === this.playerId,
        });

        // If we are not host, request existing board layout & state from host
        if (this.session?.hostId !== this.playerId) {
          channel.send({
            type: "broadcast",
            event: "request_state",
            payload: { playerId: this.playerId },
          });
        }
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        this.isConnectedRealtime = false;
      }
    });

    this.realtimeChannel = channel;
  }

  private handlePresenceSync(presenceState: Record<string, any[]>) {
    if (!this.session) return;
    const presentIds = new Set<string>();

    Object.entries(presenceState).forEach(([pId, presences]) => {
      if (!presences || presences.length === 0) return;
      presentIds.add(pId);
      const p = presences[0];

      if (!this.session!.players[pId]) {
        const half = Math.floor(this.session!.gridSize / 2);
        this.session!.players[pId] = {
          id: pId,
          name: p.name || "Explorer",
          color: p.color || "#10b981",
          isHost: p.isHost ?? (this.session!.hostId === pId),
          coord: { face: "top" as FaceDirection, u: half, v: half },
          position: { x: 0, y: half * 1.1 + 0.5, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
          facing: 0,
          action: "idle",
          score: 0,
          lastPing: Date.now(),
        };
      } else {
        if (p.name) this.session!.players[pId].name = p.name;
        if (p.color) this.session!.players[pId].color = p.color;
        if (p.isHost !== undefined) this.session!.players[pId].isHost = p.isHost;
        this.session!.players[pId].lastPing = Date.now();
      }
    });

    // Prune players who left the room (except local player)
    Object.keys(this.session.players).forEach((pId) => {
      if (pId !== this.playerId && !presentIds.has(pId)) {
        delete this.session!.players[pId];
      }
    });

    // Host migration if original host disconnected
    if (this.session.hostId && !presentIds.has(this.session.hostId) && this.session.hostId !== this.playerId) {
      const remaining = Object.keys(this.session.players);
      if (remaining.length > 0) {
        this.session.hostId = remaining[0];
        if (this.session.players[remaining[0]]) {
          this.session.players[remaining[0]].isHost = true;
        }
        if (remaining[0] === this.playerId && this.realtimeChannel) {
          this.realtimeChannel.track({
            id: this.playerId,
            name: this.playerName,
            color: this.playerColor,
            isHost: true,
          });
        }
      }
    }

    this.notify();
  }

  private handleRemotePose(data: {
    playerId: string;
    coord?: { face: FaceDirection; u: number; v: number };
    position: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
    facing?: number;
    action: "idle" | "walk" | "dig" | "celebrate" | "dead";
  }) {
    if (!this.session) return;
    const player = this.session.players[data.playerId];
    if (player) {
      player.position = data.position;
      player.normal = data.normal;
      if (data.coord) player.coord = data.coord;
      if (data.facing !== undefined) player.facing = data.facing;
      player.action = data.action;
      player.lastPing = Date.now();
    } else {
      const half = Math.floor(this.session.gridSize / 2);
      this.session.players[data.playerId] = {
        id: data.playerId,
        name: "Explorer",
        color: "#10b981",
        isHost: false,
        coord: data.coord || { face: "top", u: half, v: half },
        position: data.position,
        normal: data.normal,
        facing: data.facing || 0,
        action: data.action || "idle",
        score: 0,
        lastPing: Date.now(),
      };
    }
  }

  private handleRemoteAction(action: {
    type: "start" | "reveal" | "flag" | "game_over" | "leave" | "reset";
    playerId: string;
    cellId?: string;
    isFlagged?: boolean;
    explodedBy?: string;
    minesLocations?: string[];
  }) {
    if (!this.session) return;

    switch (action.type) {
      case "start":
        this.session.gameState = "playing";
        if (action.minesLocations) {
          this.session.mineLocations = action.minesLocations;
        }
        break;

      case "reveal":
        if (action.minesLocations && !this.session.mineLocations) {
          this.session.mineLocations = action.minesLocations;
        }
        if (action.cellId && !this.session.revealedCells.includes(action.cellId)) {
          this.session.revealedCells.push(action.cellId);
          if (this.session.players[action.playerId]) {
            this.session.players[action.playerId].score += 1;
          }
        }
        break;

      case "flag":
        if (action.cellId) {
          if (action.isFlagged) {
            if (!this.session.flaggedCells.includes(action.cellId)) {
              this.session.flaggedCells.push(action.cellId);
            }
          } else {
            this.session.flaggedCells = this.session.flaggedCells.filter((id) => id !== action.cellId);
          }
        }
        break;

      case "game_over":
        this.session.gameState = "lost";
        this.session.explodedBy = action.explodedBy || this.session.players[action.playerId]?.name || "A miner";
        break;

      case "reset":
        this.session.gameState = "playing";
        this.session.revealedCells = [];
        this.session.flaggedCells = [];
        this.session.explodedBy = undefined;
        if (action.minesLocations) {
          this.session.mineLocations = action.minesLocations;
        } else {
          this.session.mineLocations = undefined;
        }
        Object.values(this.session.players).forEach((p) => {
          p.score = 0;
        });
        break;

      case "leave":
        delete this.session.players[action.playerId];
        if (this.session.hostId === action.playerId) {
          const remaining = Object.keys(this.session.players);
          if (remaining.length > 0) {
            this.session.hostId = remaining[0];
            if (this.session.players[remaining[0]]) {
              this.session.players[remaining[0]].isHost = true;
            }
          }
        }
        break;
    }

    this.session.updatedAt = Date.now();
    this.broadcastLocally();
    this.notify();
  }

  private syncSessionState(incoming: PartySession) {
    if (!incoming) return;
    if (!this.session) {
      this.session = incoming;
    } else {
      this.session.gameState = incoming.gameState;
      this.session.hostId = incoming.hostId;
      this.session.mode = incoming.mode;
      this.session.difficulty = incoming.difficulty;
      this.session.gridSize = incoming.gridSize;
      this.session.mines = incoming.mines;
      this.session.revealedCells = incoming.revealedCells || [];
      this.session.flaggedCells = incoming.flaggedCells || [];
      if (incoming.mineLocations) this.session.mineLocations = incoming.mineLocations;
      if (incoming.explodedBy) this.session.explodedBy = incoming.explodedBy;

      // Merge players while keeping local player up-to-date
      Object.entries(incoming.players || {}).forEach(([pId, p]) => {
        if (pId !== this.playerId) {
          this.session!.players[pId] = p;
        }
      });
    }
    this.notify();
  }

  public async createRoom(params: {
    mode?: GameMode;
    difficulty?: Difficulty;
    code?: string;
  }): Promise<PartySession | null> {
    const code = (params.code || generateRoomCode()).toUpperCase();
    const diff = params.difficulty || "medium";
    const cfg = DIFFICULTY_PRESETS[diff] || DIFFICULTY_PRESETS.medium;
    const mode = params.mode || "surface";

    const half = Math.floor(cfg.gridSize / 2);
    const hostPlayer: PartyPlayer = {
      id: this.playerId,
      name: this.playerName,
      color: this.playerColor,
      isHost: true,
      coord: { face: "top" as FaceDirection, u: half, v: half },
      position: { x: 0, y: half * 1.1 + 0.5, z: 0 },
      normal: { x: 0, y: 1, z: 0 },
      facing: 0,
      action: "idle",
      score: 0,
      lastPing: Date.now(),
    };

    const session: PartySession = {
      code,
      hostId: this.playerId,
      gameState: "lobby",
      mode,
      difficulty: diff,
      gridSize: cfg.gridSize,
      mines: cfg.mines,
      revealedCells: [],
      flaggedCells: [],
      players: {
        [this.playerId]: hostPlayer,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.session = session;
    this.setupRealtimeChannel(code);
    this.startSync();
    this.broadcastLocally();
    this.notify();

    // Persist to Supabase party_rooms table across all Vercel instances
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from("party_rooms")
        .upsert({
          code,
          host_id: this.playerId,
          host_name: this.playerName,
          host_color: this.playerColor,
          mode,
          difficulty: diff,
          grid_size: cfg.gridSize,
          mines: cfg.mines,
          game_state: "lobby",
          updated_at: new Date().toISOString(),
        })
        .then(
          ({ error }) => {
            if (error) console.warn("Notice: party_rooms table update:", error.message);
          },
          () => {}
        );
    }

    // Register with serverless API in background as fallback store
    fetch("/api/party", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        hostId: this.playerId,
        hostName: this.playerName,
        hostColor: this.playerColor,
        mode,
        difficulty: diff,
        code,
      }),
    }).catch(() => {});

    return this.session;
  }

  public async joinRoom(code: string): Promise<PartySession | null> {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) return null;

    if (!this.session || this.session.code !== cleanCode) {
      const cfg = DIFFICULTY_PRESETS.medium;
      const half = Math.floor(cfg.gridSize / 2);
      this.session = {
        code: cleanCode,
        hostId: "",
        gameState: "lobby",
        mode: "surface",
        difficulty: "medium",
        gridSize: cfg.gridSize,
        mines: cfg.mines,
        revealedCells: [],
        flaggedCells: [],
        players: {
          [this.playerId]: {
            id: this.playerId,
            name: this.playerName,
            color: this.playerColor,
            isHost: false,
            coord: { face: "top" as FaceDirection, u: half, v: half },
            position: { x: 0, y: half * 1.1 + 0.5, z: 0 },
            normal: { x: 0, y: 1, z: 0 },
            facing: 0,
            action: "idle",
            score: 0,
            lastPing: Date.now(),
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    this.setupRealtimeChannel(cleanCode);
    this.startSync();
    this.broadcastLocally();
    this.notify();

    // Query Supabase party_rooms table for persistent session info
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: dbRoom } = await supabase
          .from("party_rooms")
          .select("*")
          .eq("code", cleanCode)
          .maybeSingle();

        if (dbRoom) {
          const cfg = DIFFICULTY_PRESETS[dbRoom.difficulty as Difficulty] || DIFFICULTY_PRESETS.medium;
          const half = Math.floor((dbRoom.grid_size || cfg.gridSize) / 2);
          this.session = {
            code: cleanCode,
            hostId: dbRoom.host_id,
            gameState: dbRoom.game_state || "lobby",
            mode: dbRoom.mode || "surface",
            difficulty: dbRoom.difficulty || "medium",
            gridSize: dbRoom.grid_size || cfg.gridSize,
            mines: dbRoom.mines || cfg.mines,
            revealedCells: dbRoom.revealed_cells || [],
            flaggedCells: dbRoom.flagged_cells || [],
            mineLocations: dbRoom.mine_locations || undefined,
            explodedBy: dbRoom.exploded_by || undefined,
            players: {
              ...(this.session?.players || {}),
              [this.playerId]: {
                id: this.playerId,
                name: this.playerName,
                color: this.playerColor,
                isHost: dbRoom.host_id === this.playerId,
                coord: { face: "top" as FaceDirection, u: half, v: half },
                position: { x: 0, y: half * 1.1 + 0.5, z: 0 },
                normal: { x: 0, y: 1, z: 0 },
                facing: 0,
                action: "idle",
                score: 0,
                lastPing: Date.now(),
              },
            },
            createdAt: new Date(dbRoom.created_at).getTime() || Date.now(),
            updatedAt: Date.now(),
          };
          this.broadcastLocally();
          this.notify();
        }
      } catch (err) {
        console.warn("party_rooms query notice:", err);
      }
    }

    // Query API in parallel to populate room configuration
    try {
      const res = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          code: cleanCode,
          playerId: this.playerId,
          playerName: this.playerName,
          playerColor: this.playerColor,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          this.syncSessionState(data.session);
        }
      }
    } catch {}

    return this.session;
  }

  public sendHeartbeat(data: {
    coord: { face: FaceDirection; u: number; v: number };
    position: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
    facing: number;
    action: "idle" | "walk" | "dig" | "celebrate" | "dead";
  }) {
    if (!this.session) return;
    const now = performance.now();
    // Throttle heartbeats to ~45ms (~22Hz)
    if (now - this.lastHeartbeatSent < 45) return;
    this.lastHeartbeatSent = now;

    // Local optimistic update
    if (this.session.players[this.playerId]) {
      Object.assign(this.session.players[this.playerId], data, { lastPing: Date.now() });
    }

    // High-speed broadcast over Supabase Realtime WebSocket
    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: "broadcast",
        event: "player_pose",
        payload: {
          playerId: this.playerId,
          ...data,
        },
      });
    }

    this.broadcastLocally();
  }

  public async sendAction(action: {
    type: "start" | "reveal" | "flag" | "game_over" | "leave" | "reset";
    cellId?: string;
    isFlagged?: boolean;
    explodedBy?: string;
    minesLocations?: string[];
  }) {
    if (!this.session) return;

    const fullAction = {
      ...action,
      playerId: this.playerId,
    };

    // 1. Optimistic local update
    this.handleRemoteAction(fullAction);

    // 2. Broadcast immediately over Supabase Realtime WebSocket
    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: "broadcast",
        event: "party_action",
        payload: { action: fullAction },
      });
    }

    // 3. Update Supabase party_rooms row for state persistence
    const supabase = getSupabaseClient();
    if (supabase && this.session) {
      supabase
        .from("party_rooms")
        .update({
          game_state: this.session.gameState,
          mine_locations: this.session.mineLocations || [],
          revealed_cells: this.session.revealedCells || [],
          flagged_cells: this.session.flaggedCells || [],
          exploded_by: this.session.explodedBy || null,
          updated_at: new Date().toISOString(),
        })
        .eq("code", this.session.code)
        .then(
          () => {},
          () => {}
        );
    }

    // 4. Sync to API route as persistent fallback
    try {
      fetch(`/api/party/${this.session.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "action",
          playerId: this.playerId,
          action: fullAction,
        }),
      }).catch(() => {});
    } catch {}
  }

  public startSync() {
    this.stopSync();
    if (!this.session) return;

    // Gentle 3-second background poll as fallback if Realtime drops
    this.pollInterval = setInterval(async () => {
      if (!this.session) return;
      try {
        const res = await fetch(`/api/party/${this.session.code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.session) {
            this.syncSessionState(data.session);
          }
        }
      } catch {}
    }, 3000);
  }

  public stopSync() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public leaveRoom() {
    if (this.session) {
      this.sendAction({ type: "leave" });
    }
    if (this.realtimeChannel) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) supabase.removeChannel(this.realtimeChannel);
      } catch {}
      this.realtimeChannel = null;
    }
    this.stopSync();
    this.session = null;
    this.isConnectedRealtime = false;
    this.notify();
  }
}

export const partyClient = new PartyClient();
