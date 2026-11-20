export type StreamStatus = "live" | "offline" | "unknown";
export type StreamCategory = "Gaming" | "Just Chatting" | "Creative";

export type StreamSnapshot = {
  displayName: string;
  avatarUrl: string;
  thumbnailUrl: string;
  status: StreamStatus;
  title: string;
  game: string;
  category: StreamCategory;
  viewers: number;
  startedAt: string | null;
  checkedAt: string | null;
};

export type Streamer = StreamSnapshot & {
  id: string;
  username: string;
  favorite: boolean;
  isDemo: boolean;
};

export type StreamerResponse = {
  streamers: Streamer[];
  provider: "twitch" | "decapi";
  partial?: boolean;
};
