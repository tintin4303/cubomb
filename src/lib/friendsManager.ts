import { getSupabaseClient } from "./supabaseClient";
import { authManager, UserProfile } from "./authManager";

export interface FriendEntry {
  friendshipId: string;
  friendId: string;
  username: string;
  avatar_color: string;
  total_wins: number;
  total_games: number;
  created_at: string;
}

export interface FriendRequestEntry {
  friendshipId: string;
  requesterId: string;
  username: string;
  avatar_color: string;
  created_at: string;
}

export interface PartyInviteEntry {
  id: string;
  from_username: string;
  to_username: string;
  room_code: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

class FriendsManager {
  // Fetch accepted friends
  public async getFriendsList(): Promise<FriendEntry[]> {
    const supabase = getSupabaseClient();
    const profile = authManager.getProfile();
    if (!supabase || !profile) return [];

    try {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          user:profiles!friendships_user_id_fkey(id, username, avatar_color, total_wins, total_games),
          friend:profiles!friendships_friend_id_fkey(id, username, avatar_color, total_wins, total_games)
        `)
        .eq("status", "accepted")
        .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);

      if (error || !data) {
        // Fallback without foreign key join if types require manual fetch
        return await this.getFriendsListManual(profile.id);
      }

      const results: FriendEntry[] = [];
      data.forEach((row: any) => {
        const isSelfUser = row.user_id === profile.id;
        const other = isSelfUser ? row.friend : row.user;
        if (other) {
          results.push({
            friendshipId: row.id,
            friendId: other.id,
            username: other.username,
            avatar_color: other.avatar_color,
            total_wins: other.total_wins,
            total_games: other.total_games,
            created_at: row.created_at,
          });
        }
      });

      return results;
    } catch {
      return await this.getFriendsListManual(profile.id);
    }
  }

  // Fallback manual lookup for friends
  private async getFriendsListManual(currentUserId: string): Promise<FriendEntry[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data: rows, error } = await supabase
        .from("friendships")
        .select("id, user_id, friend_id, created_at")
        .eq("status", "accepted")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (error || !rows || rows.length === 0) return [];

      const targetIds = rows.map((r) => (r.user_id === currentUserId ? r.friend_id : r.user_id));
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, username, avatar_color, total_wins, total_games")
        .in("id", targetIds);

      if (pErr || !profiles) return [];

      const profMap = new Map<string, UserProfile>();
      profiles.forEach((p: any) => profMap.set(p.id, p));

      const list: FriendEntry[] = [];
      rows.forEach((r) => {
        const otherId = r.user_id === currentUserId ? r.friend_id : r.user_id;
        const p = profMap.get(otherId);
        if (p) {
          list.push({
            friendshipId: r.id,
            friendId: p.id,
            username: p.username,
            avatar_color: p.avatar_color,
            total_wins: p.total_wins,
            total_games: p.total_games,
            created_at: r.created_at,
          });
        }
      });

      return list;
    } catch {
      return [];
    }
  }

  // Fetch incoming pending requests
  public async getPendingRequests(): Promise<FriendRequestEntry[]> {
    const supabase = getSupabaseClient();
    const profile = authManager.getProfile();
    if (!supabase || !profile) return [];

    try {
      const { data: rows, error } = await supabase
        .from("friendships")
        .select("id, user_id, created_at")
        .eq("friend_id", profile.id)
        .eq("status", "pending");

      if (error || !rows || rows.length === 0) return [];

      const requesterIds = rows.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_color")
        .in("id", requesterIds);

      const profMap = new Map<string, { username: string; avatar_color: string }>();
      (profiles || []).forEach((p: any) => profMap.set(p.id, p));

      const list: FriendRequestEntry[] = [];
      rows.forEach((r) => {
        const p = profMap.get(r.user_id);
        if (p) {
          list.push({
            friendshipId: r.id,
            requesterId: r.user_id,
            username: p.username,
            avatar_color: p.avatar_color,
            created_at: r.created_at,
          });
        }
      });

      return list;
    } catch {
      return [];
    }
  }

  // Send a friend request by username
  public async sendFriendRequest(targetUsername: string): Promise<{ error?: string }> {
    const supabase = getSupabaseClient();
    const profile = authManager.getProfile();
    if (!supabase || !profile) {
      return { error: "You must be signed in to add friends." };
    }

    const cleanName = targetUsername.trim();
    if (!cleanName) {
      return { error: "Please enter a valid username." };
    }

    if (cleanName.toLowerCase() === profile.username.toLowerCase()) {
      return { error: "You cannot add yourself as a friend." };
    }

    try {
      // 1. Look up target profile
      const { data: targetProfile, error: searchErr } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("username", cleanName)
        .single();

      if (searchErr || !targetProfile) {
        return { error: `Explorer "${cleanName}" not found.` };
      }

      // 2. Check existing relationship
      const { data: existing } = await supabase
        .from("friendships")
        .select("id, status, user_id")
        .or(
          `and(user_id.eq.${profile.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${profile.id})`
        )
        .maybeSingle();

      if (existing) {
        if (existing.status === "accepted") {
          return { error: `You and ${targetProfile.username} are already friends.` };
        }
        if (existing.status === "pending") {
          return {
            error:
              existing.user_id === profile.id
                ? "Friend request already sent."
                : "This explorer already sent you a request! Check your Requests tab.",
          };
        }
      }

      // 3. Insert friendship request
      const { error: insertErr } = await supabase.from("friendships").insert({
        user_id: profile.id,
        friend_id: targetProfile.id,
        status: "pending",
      });

      if (insertErr) {
        return { error: insertErr.message };
      }

      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send request.";
      return { error: msg };
    }
  }

  // Accept a pending friend request
  public async acceptFriendRequest(friendshipId: string): Promise<{ error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: "Supabase not connected." };

    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", friendshipId);

      if (error) return { error: error.message };
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept request.";
      return { error: msg };
    }
  }

  // Decline / cancel a friend request
  public async declineFriendRequest(friendshipId: string): Promise<{ error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: "Supabase not connected." };

    try {
      const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);

      if (error) return { error: error.message };
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to decline request.";
      return { error: msg };
    }
  }

  // Remove an existing friend
  public async removeFriend(friendshipId: string): Promise<{ error?: string }> {
    return this.declineFriendRequest(friendshipId);
  }

  // Send in-game party invitation to a friend
  public async sendPartyInvite(toUsername: string, roomCode: string): Promise<{ error?: string }> {
    const supabase = getSupabaseClient();
    const profile = authManager.getProfile();
    if (!supabase || !profile) return { error: "Please sign in to invite friends." };

    try {
      // 1. Insert into party_invites table
      const { data, error } = await supabase
        .from("party_invites")
        .insert({
          from_username: profile.username,
          to_username: toUsername.trim(),
          room_code: roomCode.trim().toUpperCase(),
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.warn("Could not insert invite to database, broadcasting via Realtime channel:", error.message);
      }

      // 2. Broadcast immediately over Realtime channel for instant notification
      const chan = supabase.channel(`party_invites_${toUsername.trim().toLowerCase()}`);
      chan.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          chan.send({
            type: "broadcast",
            event: "new_invite",
            payload: {
              id: data?.id || `inv_${Date.now()}`,
              from_username: profile.username,
              to_username: toUsername.trim(),
              room_code: roomCode.trim().toUpperCase(),
            },
          });
          setTimeout(() => {
            try {
              supabase.removeChannel(chan);
            } catch {}
          }, 3000);
        }
      });

      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send party invite.";
      return { error: msg };
    }
  }

  // Get active pending party invites for current user
  public async getPendingPartyInvites(): Promise<PartyInviteEntry[]> {
    const supabase = getSupabaseClient();
    const profile = authManager.getProfile();
    if (!supabase || !profile) return [];

    try {
      const { data, error } = await supabase
        .from("party_invites")
        .select("*")
        .eq("to_username", profile.username)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error || !data) return [];
      return data as PartyInviteEntry[];
    } catch {
      return [];
    }
  }

  // Respond to a party invite (accepted or declined)
  public async respondToPartyInvite(
    inviteId: string,
    status: "accepted" | "declined"
  ): Promise<{ error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: "Supabase not connected." };

    try {
      const { error } = await supabase
        .from("party_invites")
        .update({ status })
        .eq("id", inviteId);

      if (error) return { error: error.message };
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update invite.";
      return { error: msg };
    }
  }

  // Real-time listener for incoming party invites
  public subscribeToIncomingInvites(
    callback: (invite: { id: string; from_username: string; room_code: string }) => void
  ): () => void {
    const supabase = getSupabaseClient();
    const profile = authManager.getProfile();
    if (!supabase || !profile) return () => {};

    const chanName = `party_invites_${profile.username.toLowerCase()}`;
    const channel = supabase.channel(chanName);

    channel.on("broadcast", { event: "new_invite" }, ({ payload }) => {
      if (payload) {
        callback(payload);
      }
    });

    channel.subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }
}

export const friendsManager = new FriendsManager();
