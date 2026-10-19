import { PartySession, PartyPlayer, GameMode, Difficulty, FaceDirection } from "@/components/game/types";

export type PartyUpdateCallback = (session: PartySession) => void;

class PartyClient {
  public session: PartySession | null = null;
  public playerId: string = "";
  public playerName: string = "Miner";
  public playerColor: string = "#0284c7";

  private broadcastChannel: BroadcastChannel | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listeners: Set<PartyUpdateCallback> = new Set();
  private lastHeartbeatSent: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.playerId =
        localStorage.getItem("3dminer_player_id") ||
        `miner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem("3dminer_player_id", this.playerId);

      this.playerName = localStorage.getItem("3dminer_player_name") || "Miner";
      this.playerColor = localStorage.getItem("3dminer_player_color") || "#0284c7";

      try {
        this.broadcastChannel = new BroadcastChannel("3dminer_party_broadcast");
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === "party_update" && event.data.session) {
            const incoming: PartySession = event.data.session;
            if (this.session && incoming.code === this.session.code) {
              this.session = incoming;
              this.notify();
            }
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel unavailable, falling back to polling", err);
      }
    }
  }

  public setPlayerProfile(name: string, color: string) {
    this.playerName = name;
    this.playerColor = color;
    if (typeof window !== "undefined") {
      localStorage.setItem("3dminer_player_name", name);
      localStorage.setItem("3dminer_player_color", color);
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

  public async createRoom(params: {
    mode?: GameMode;
    difficulty?: Difficulty;
    code?: string;
  }): Promise<PartySession | null> {
    try {
      const res = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          hostId: this.playerId,
          hostName: this.playerName,
          hostColor: this.playerColor,
          mode: params.mode || "surface",
          difficulty: params.difficulty || "medium",
          code: params.code,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        this.session = data.session;
        this.startSync();
        this.broadcastLocally();
        this.notify();
        return this.session;
      }
      return null;
    } catch (err) {
      console.error("Failed to create room:", err);
      return null;
    }
  }

  public async joinRoom(code: string): Promise<PartySession | null> {
    try {
      const res = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          code,
          playerId: this.playerId,
          playerName: this.playerName,
          playerColor: this.playerColor,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        this.session = data.session;
        this.startSync();
        this.broadcastLocally();
        this.notify();
        return this.session;
      }
      return null;
    } catch (err) {
      console.error("Failed to join room:", err);
      return null;
    }
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
    // Throttle heartbeats to ~100ms
    if (now - this.lastHeartbeatSent < 100) return;
    this.lastHeartbeatSent = now;

    // Local optimistic update
    if (this.session.players[this.playerId]) {
      Object.assign(this.session.players[this.playerId], data, { lastPing: Date.now() });
      this.broadcastLocally();
    }

    // Server push (debounced or background)
    fetch(`/api/party/${this.session.code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "heartbeat",
        playerId: this.playerId,
        update: data,
      }),
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.session) {
          this.session = resData.session;
          this.notify();
        }
      })
      .catch(() => {});
  }

  public async sendAction(action: {
    type: "start" | "reveal" | "flag" | "game_over" | "leave" | "reset";
    cellId?: string;
    isFlagged?: boolean;
    explodedBy?: string;
    minesLocations?: string[];
  }) {
    if (!this.session) return;

    // Optimistic local update
    if (action.type === "reveal" && action.cellId && !this.session.revealedCells.includes(action.cellId)) {
      this.session.revealedCells.push(action.cellId);
    } else if (action.type === "flag" && action.cellId) {
      if (action.isFlagged) {
        if (!this.session.flaggedCells.includes(action.cellId)) this.session.flaggedCells.push(action.cellId);
      } else {
        this.session.flaggedCells = this.session.flaggedCells.filter((id) => id !== action.cellId);
      }
    }
    this.broadcastLocally();
    this.notify();

    try {
      const res = await fetch(`/api/party/${this.session.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "action",
          playerId: this.playerId,
          action,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        this.session = data.session;
        this.broadcastLocally();
        this.notify();
      }
    } catch (err) {
      console.error("Failed to send party action:", err);
    }
  }

  public startSync() {
    this.stopSync();
    if (!this.session) return;

    // Polling interval every 500ms for fresh state
    this.pollInterval = setInterval(async () => {
      if (!this.session) return;
      try {
        const res = await fetch(`/api/party/${this.session.code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.session) {
            this.session = data.session;
            this.notify();
          }
        }
      } catch {
        // Silent poll error
      }
    }, 500);
  }

  public stopSync() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public leaveRoom() {
    if (this.session) {
      this.sendAction({ type: "leave" });
    }
    this.stopSync();
    this.session = null;
    this.notify();
  }
}

export const partyClient = new PartyClient();
