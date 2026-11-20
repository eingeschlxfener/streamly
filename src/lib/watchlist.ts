import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { streamers, workspaces } from "@/db/schema";
import { DEMO_STREAMERS } from "@/lib/demo";
import type { Streamer, StreamSnapshot } from "@/lib/types";

const COOKIE_NAME = "streamly_workspace";
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function getWorkspace(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing && isUuid(existing)) {
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, existing)).limit(1);
    if (workspace) return workspace.id;
  }
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({ id });
    await tx.insert(streamers).values(DEMO_STREAMERS.map((demo, index) => {
      const { id: _id, username, favorite, isDemo, ...snapshot } = demo;
      void _id;
      return { workspaceId: id, username, favorite, isDemo, snapshot: snapshot as StreamSnapshot, createdAt: new Date(Date.now() + index) };
    }));
  });
  jar.set(COOKIE_NAME, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return id;
}

export function toStreamer(row: typeof streamers.$inferSelect): Streamer {
  return { ...row.snapshot, id: row.id, username: row.username, favorite: row.favorite, isDemo: row.isDemo };
}

export async function readStreamers(workspaceId: string): Promise<Streamer[]> {
  const rows = await db.select().from(streamers).where(eq(streamers.workspaceId, workspaceId)).orderBy(asc(streamers.createdAt), asc(streamers.id));
  return rows.map(toStreamer);
}
