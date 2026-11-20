import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { streamers } from "@/db/schema";
import { getWorkspace, readStreamers, toStreamer } from "@/lib/watchlist";
import { getSnapshots, normalizeUsername, twitchProvider } from "@/lib/twitch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workspaceId = await getWorkspace();
    return NextResponse.json({ streamers: await readStreamers(workspaceId), provider: twitchProvider() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Watchlist load failed", error);
    return NextResponse.json({ error: "Your watchlist couldn't load. Please try refreshing." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const username = typeof body?.username === "string" ? normalizeUsername(body.username) : null;
    if (!username) return NextResponse.json({ error: "Enter a valid Twitch username (3–25 letters, numbers, or underscores)." }, { status: 400 });
    const workspaceId = await getWorkspace();
    const existing = await db.select({ username: streamers.username, isDemo: streamers.isDemo }).from(streamers).where(eq(streamers.workspaceId, workspaceId));
    if (existing.some((s) => s.username === username && !s.isDemo)) return NextResponse.json({ error: `@${username} is already in your watchlist.` }, { status: 409 });
    if (existing.filter((s) => !s.isDemo).length >= 50) return NextResponse.json({ error: "Your watchlist is full. Remove a creator before adding another (50 maximum)." }, { status: 400 });
    const { snapshots } = await getSnapshots([username]);
    if (!snapshots.has(username)) return NextResponse.json({ error: "Twitch is taking a moment. We couldn't verify that channel—please try again shortly." }, { status: 503 });
    const snapshot = snapshots.get(username);
    if (!snapshot) return NextResponse.json({ error: `We couldn't find @${username} on Twitch. Double-check the spelling.` }, { status: 404 });
    const row = await db.transaction(async (tx) => {
      const [saved] = await tx.insert(streamers).values({ workspaceId, username, snapshot }).onConflictDoUpdate({
        target: [streamers.workspaceId, streamers.username],
        set: { snapshot, isDemo: false, updatedAt: new Date() },
        setWhere: eq(streamers.isDemo, true),
      }).returning();
      if (!saved) return null;
      // Sample cards give way to a real, personal lineup on the first successful add.
      await tx.delete(streamers).where(and(eq(streamers.workspaceId, workspaceId), eq(streamers.isDemo, true)));
      return saved;
    });
    if (!row) return NextResponse.json({ error: "That creator is already in your watchlist." }, { status: 409 });
    return NextResponse.json({ streamer: toStreamer(row), streamers: await readStreamers(workspaceId) }, { status: 201 });
  } catch (error) {
    console.error("Add streamer failed", error);
    return NextResponse.json({ error: "We couldn't save that creator. Please try again." }, { status: 500 });
  }
}
