import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
import { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  username: string;
  avatar_color: string;
  total_games: number;
  total_wins: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  difficulty: string;
  time_seconds: number;
  created_at: string;
}

class AuthManager {
  private currentUser: User | null = null;
  private currentProfile: UserProfile | null = null;

  public isAvailable(): boolean {
    return isSupabaseConfigured;
  }

  public async getSessionUser(): Promise<User | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      this.currentUser = user;
      if (user) {
        await this.fetchProfile(user.id);
      }
      return user;
    } catch {
      return null;
    }
  }

  public async fetchProfile(userId: string): Promise<UserProfile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        this.currentProfile = data as UserProfile;
        return this.currentProfile;
      }
      return null;
    } catch {
      return null;
    }
  }

  public getProfile(): UserProfile | null {
    return this.currentProfile;
  }

  public async signUp(
    username: string,
    password: string,
    avatarColor: string = "#0284c7"
  ): Promise<{ error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: "Supabase connection is not available." };
    }

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      return { error: "Please enter a username." };
    }

    // Direct game login handle: username@cubomb.com (valid public TLD for Supabase Auth)
    const email = cleanUsername.includes("@")
      ? cleanUsername.toLowerCase()
      : `${cleanUsername.toLowerCase().replace(/[^a-z0-9_]/g, "")}@cubomb.com`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            avatar_color: avatarColor,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      this.currentUser = data.user;
      if (data.user) {
        const p = await this.fetchProfile(data.user.id);
        if (!p) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            username: cleanUsername,
            avatar_color: avatarColor,
          });
          await this.fetchProfile(data.user.id);
        }
      }
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      return { error: msg };
    }
  }

  public async signIn(identifier: string, password: string): Promise<{ error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: "Supabase connection is not available." };
    }

    const cleanId = identifier.trim();
    let email = cleanId.includes("@")
      ? cleanId.toLowerCase()
      : `${cleanId.toLowerCase().replace(/[^a-z0-9_]/g, "")}@cubomb.com`;

    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Backward compatibility fallback for accounts created with @3dminer.com
      if (error && !cleanId.includes("@")) {
        const legacyEmail = `${cleanId.toLowerCase().replace(/[^a-z0-9_]/g, "")}@3dminer.com`;
        const legacyRes = await supabase.auth.signInWithPassword({
          email: legacyEmail,
          password,
        });
        if (!legacyRes.error) {
          data = legacyRes.data;
          error = null;
        }
      }

      if (error) {
        return { error: error.message };
      }

      this.currentUser = data.user;
      if (data.user) {
        await this.fetchProfile(data.user.id);
      }
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed.";
      return { error: msg };
    }
  }

  public async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      this.currentUser = null;
      this.currentProfile = null;
    } catch {
      // Ignore
    }
  }

  // Save game win / loss to game_records (stays within free-tier quota)
  public async recordGameResult(
    difficulty: string,
    timeSeconds: number,
    won: boolean
  ): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !this.currentUser || !this.currentProfile) return;

    try {
      // 1. Insert game record
      await supabase.from("game_records").insert({
        user_id: this.currentUser.id,
        username: this.currentProfile.username,
        difficulty,
        time_seconds: timeSeconds,
        won,
      });

      // 2. Increment user match counts
      const nextGames = this.currentProfile.total_games + 1;
      const nextWins = this.currentProfile.total_wins + (won ? 1 : 0);
      await supabase
        .from("profiles")
        .update({
          total_games: nextGames,
          total_wins: nextWins,
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.currentUser.id);

      this.currentProfile.total_games = nextGames;
      this.currentProfile.total_wins = nextWins;
    } catch {
      // Fail silently if offline or blocked
    }
  }

  // Fetch top leaderboard times
  public async getLeaderboard(
    difficulty: string = "medium",
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from("game_records")
        .select("id, username, difficulty, time_seconds, created_at")
        .eq("difficulty", difficulty)
        .eq("won", true)
        .order("time_seconds", { ascending: true })
        .limit(limit);

      if (!error && data) {
        return data as LeaderboardEntry[];
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const authManager = new AuthManager();
