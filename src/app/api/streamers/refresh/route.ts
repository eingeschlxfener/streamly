import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { streamers } from "@/db/schema";
import { getWorkspace, readStreamers } from "@/lib/watchlist";
import { getSnapshots, twitchProvider } from "@/lib/twitch";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const workspaceId = await getWorkspace();
    const rows = await db.select().from(streamers).where(eq(streamers.workspaceId, workspaceId));
    const targets = rows.filter((row) => !row.isDemo || body.includeSamples === true);
    const { snapshots, failed } = await getSnapshots(targets.map((row) => row.username));
    await Promise.all(targets.map(async (row) => {
      if (!snapshots.has(row.username)) return;
      const fresh = snapshots.get(row.username);
      const snapshot = fresh ? (fresh.status === "offline" && fresh.game === "Twitch" ? { ...fresh, game: row.snapshot.game, category: row.snapshot.category, title: row.snapshot.title } : fresh) : { ...row.snapshot, status: "unknown" as const, title: "This Twitch channel is no longer available", viewers: 0, checkedAt: new Date().toISOString() };
      await db.update(streamers).set({ snapshot, isDemo: false, updatedAt: new Date() }).where(and(eq(streamers.id, row.id), eq(streamers.workspaceId, workspaceId)));
    }));
    return NextResponse.json({ streamers: await readStreamers(workspaceId), provider: twitchProvider(), partial: failed.length > 0, checked: targets.length - failed.length }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Stream status refresh failed", error);
    return NextResponse.json({ error: "Couldn't refresh Twitch right now. Your saved watchlist is safe." }, { status: 503 });
  }
}
