import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { streamers } from "@/db/schema";
import { getWorkspace, isUuid, toStreamer } from "@/lib/watchlist";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "Creator not found. Refresh your watchlist and try again." }, { status: 404 });
    const body = await request.json().catch(() => null);
    if (typeof body?.favorite !== "boolean") return NextResponse.json({ error: "A favorite value is required." }, { status: 400 });
    const workspaceId = await getWorkspace();
    const [row] = await db.update(streamers).set({ favorite: body.favorite, updatedAt: new Date() }).where(and(eq(streamers.id, id), eq(streamers.workspaceId, workspaceId))).returning();
    if (!row) return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    return NextResponse.json({ streamer: toStreamer(row) });
  } catch { return NextResponse.json({ error: "Couldn't update this creator. Please try again." }, { status: 500 }); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    const workspaceId = await getWorkspace();
    const rows = await db.delete(streamers).where(and(eq(streamers.id, id), eq(streamers.workspaceId, workspaceId))).returning({ id: streamers.id });
    if (!rows.length) return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Couldn't remove this creator. Please try again." }, { status: 500 }); }
}
