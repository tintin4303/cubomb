import { NextRequest, NextResponse } from "next/server";
import { createPartySession, getPartySession, joinPartySession } from "@/lib/partyManager";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, hostId, hostName, hostColor, mode, difficulty, code, playerId, playerName, playerColor } = body;

    if (action === "create") {
      const session = createPartySession({
        hostId: hostId || `player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        hostName: hostName || "Host Miner",
        hostColor: hostColor || "#0284c7",
        mode,
        difficulty,
        code,
      });
      return NextResponse.json({ success: true, session });
    }

    if (action === "join") {
      if (!code) {
        return NextResponse.json({ success: false, error: "Room code required" }, { status: 400 });
      }
      const session = joinPartySession(code, {
        id: playerId || `player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: playerName || "Miner",
        color: playerColor || "#10b981",
      });
      return NextResponse.json({ success: true, session });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Party API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ success: false, error: "Code required" }, { status: 400 });
  }
  const session = getPartySession(code);
  if (!session) {
    return NextResponse.json({ success: false, error: "Party session not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, session });
}
