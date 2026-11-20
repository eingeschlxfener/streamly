import type { StreamCategory, StreamSnapshot } from "@/lib/types";

type TwitchUser = { id: string; login: string; display_name: string; profile_image_url: string; offline_image_url: string };
type TwitchStream = { user_login: string; title: string; game_name: string; viewer_count: number; thumbnail_url: string; started_at: string };
let tokenCache: { token: string; expiresAt: number } | null = null;
const snapshotCache = new Map<string, { snapshot: StreamSnapshot | null; expiresAt: number }>();

export function twitchProvider(): "twitch" | "decapi" {
  return process.env.TWITCH_CLIENT_ID && (process.env.TWITCH_CLIENT_SECRET || process.env.TWITCH_ACCESS_TOKEN) ? "twitch" : "decapi";
}

function categoryFor(game: string): StreamCategory {
  if (/just chatting|talk shows|irl|travel|food/i.test(game)) return "Just Chatting";
  if (/music|art\b|makers|drawing|software|creative/i.test(game)) return "Creative";
  return "Gaming";
}

async function getToken(): Promise<string> {
  if (process.env.TWITCH_ACCESS_TOKEN) return process.env.TWITCH_ACCESS_TOKEN;
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID!, client_secret: process.env.TWITCH_CLIENT_SECRET!, grant_type: "client_credentials" }),
    cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Twitch authentication is temporarily unavailable.");
  const data = await response.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 120) * 1000 };
  return tokenCache.token;
}

async function helix<T>(path: string, token: string): Promise<T[]> {
  const response = await fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: { "Client-Id": process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}` },
    cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (response.status === 401) tokenCache = null;
    throw new Error("Twitch is temporarily unavailable.");
  }
  return (await response.json()).data;
}

async function officialSnapshots(usernames: string[]): Promise<Map<string, StreamSnapshot | null>> {
  const token = await getToken();
  const [users, streams] = await Promise.all([
    helix<TwitchUser>(`users?${usernames.map((u) => `login=${encodeURIComponent(u)}`).join("&")}`, token),
    helix<TwitchStream>(`streams?first=100&${usernames.map((u) => `user_login=${encodeURIComponent(u)}`).join("&")}`, token),
  ]);
  const result = new Map<string, StreamSnapshot | null>();
  for (const username of usernames) {
    const user = users.find((u) => u.login.toLowerCase() === username);
    if (!user) { result.set(username, null); continue; }
    const live = streams.find((s) => s.user_login.toLowerCase() === username);
    const game = live?.game_name || "Twitch";
    result.set(username, {
      displayName: user.display_name, avatarUrl: user.profile_image_url,
      thumbnailUrl: live ? live.thumbnail_url.replace("{width}", "640").replace("{height}", "360") : user.offline_image_url || "",
      status: live ? "live" : "offline", title: live?.title || "Waiting for their next stream", game,
      category: categoryFor(game), viewers: live?.viewer_count || 0,
      startedAt: live?.started_at || null, checkedAt: new Date().toISOString(),
    });
  }
  return result;
}

async function publicText(endpoint: string, username: string): Promise<string> {
  const response = await fetch(`https://decapi.me/twitch/${endpoint}/${encodeURIComponent(username)}`, {
    cache: "no-store", signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("The public Twitch status service is busy. Please try again shortly.");
  const text = (await response.text()).trim();
  if (/rate.?limit|too many requests|<!doctype|<html/i.test(text)) throw new Error("The public Twitch status service is busy. Please try again shortly.");
  return text;
}

async function publicSnapshot(username: string): Promise<StreamSnapshot | null> {
  const [avatar, uptime] = await Promise.all([publicText("avatar", username), publicText("uptime", username)]);
  if (/not found|does not exist|no user|could not find|invalid user/i.test(`${avatar} ${uptime}`)) return null;
  if (!/^https:\/\/static-cdn\.jtvnw\.net\//.test(avatar)) throw new Error("Could not verify that Twitch username. Please try again.");
  const offline = /offline/i.test(uptime);
  const live = !offline && /\d+\s*(day|hour|minute|second)/i.test(uptime);
  if (!offline && !live) throw new Error("Twitch status is temporarily unavailable. Please try again.");
  const [title, game, viewers] = await Promise.all([
    publicText("title", username).catch(() => "Waiting for their next stream"),
    publicText("game", username).catch(() => "Twitch"),
    live ? publicText("viewercount", username).catch(() => "0") : Promise.resolve("0"),
  ]);
  const safeGame = game.length < 100 && !/error|not found/i.test(game) ? game : "Twitch";
  return {
    displayName: username, avatarUrl: avatar,
    thumbnailUrl: live ? `https://static-cdn.jtvnw.net/previews-ttv/live_user_${username}-640x360.jpg` : "",
    status: live ? "live" : "offline", title: title.slice(0, 350), game: safeGame,
    category: categoryFor(safeGame), viewers: live ? Number(viewers.replace(/,/g, "")) || 0 : 0,
    startedAt: null, checkedAt: new Date().toISOString(),
  };
}

export async function getSnapshots(usernames: string[]) {
  const snapshots = new Map<string, StreamSnapshot | null>();
  const failed: string[] = [];
  const pending = usernames.filter((username) => {
    const cached = snapshotCache.get(username);
    if (cached && cached.expiresAt > Date.now()) { snapshots.set(username, cached.snapshot); return false; }
    return true;
  });
  if (pending.length && twitchProvider() === "twitch") {
    try {
      const official = await officialSnapshots(pending);
      for (const [username, snapshot] of official) {
        snapshots.set(username, snapshot);
        snapshotCache.set(username, { snapshot, expiresAt: Date.now() + 60000 });
      }
      return { snapshots, failed };
    } catch (error) { console.warn("Using public Twitch status fallback:", error instanceof Error ? error.message : "upstream unavailable"); }
  }
  // Small batches respect the public service rather than making an unbounded burst.
  for (let i = 0; i < pending.length; i += 6) {
    await Promise.all(pending.slice(i, i + 6).map(async (username) => {
      try {
        const snapshot = await publicSnapshot(username);
        snapshots.set(username, snapshot);
        if (snapshotCache.size > 2000) snapshotCache.clear();
        snapshotCache.set(username, { snapshot, expiresAt: Date.now() + 90000 });
      } catch { failed.push(username); }
    }));
  }
  return { snapshots, failed };
}

export function normalizeUsername(input: string): string | null {
  let username = input.trim();
  if (/^(https?:\/\/)?(www\.)?twitch\.tv\//i.test(username)) {
    try {
      const url = new URL(username.startsWith("http") ? username : `https://${username}`);
      if (!["twitch.tv", "www.twitch.tv"].includes(url.hostname)) return null;
      username = url.pathname.split("/").filter(Boolean)[0] || "";
    } catch { return null; }
  }
  username = username.replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_]{3,25}$/.test(username) ? username : null;
}
