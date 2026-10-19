import { NextRequest, NextResponse } from "next/server";
import { getPartySession, updatePartyPlayer, applyPartyAction } from "@/lib/partyManager";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const session = getPartySession(code);
  if (!session) {
    return NextResponse.json({ success: false, error: "Party session not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, session });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { type, playerId, update, action } = body;

    if (type === "heartbeat") {
      const session = updatePartyPlayer(code, playerId, update);
      if (!session) {
        return NextResponse.json({ success: false, error: "Session or player not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, session });
    }

    if (type === "action") {
      const session = applyPartyAction(code, {
        type: action.type,
        playerId,
        cellId: action.cellId,
        isFlagged: action.isFlagged,
        explodedBy: action.explodedBy,
        minesLocations: action.minesLocations,
      });
      if (!session) {
        return NextResponse.json({ success: false, error: "Action could not be applied" }, { status: 404 });
      }
      return NextResponse.json({ success: true, session });
    }

    return NextResponse.json({ success: false, error: "Invalid request type" }, { status: 400 });
  } catch (error) {
    console.error("Party update error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
