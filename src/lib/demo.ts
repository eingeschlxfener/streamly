import type { Streamer } from "@/lib/types";

export const DEMO_STREAMERS: Streamer[] = [
  {
    id: "demo-shroud", username: "shroud", displayName: "shroud",
    avatarUrl: "/images/shroud.jpg", thumbnailUrl: "/images/arc-raiders.jpg",
    status: "live", title: "Back topside. One more run.", game: "ARC Raiders", category: "Gaming",
    viewers: 12400, startedAt: null, checkedAt: null, favorite: true, isDemo: true,
  },
  {
    id: "demo-tarik", username: "tarik", displayName: "tarik",
    avatarUrl: "/images/tarik.jpg", thumbnailUrl: "/images/counter-strike.jpg",
    status: "live", title: "Ranked with the crew. Let's get it.", game: "Counter-Strike 2", category: "Gaming",
    viewers: 28600, startedAt: null, checkedAt: null, favorite: false, isDemo: true,
  },
  {
    id: "demo-lirik", username: "lirik", displayName: "LIRIK",
    avatarUrl: "/images/lirik.jpg", thumbnailUrl: "/images/elden-ring.jpg",
    status: "live", title: "a very normal, relaxing adventure", game: "ELDEN RING", category: "Gaming",
    viewers: 18200, startedAt: null, checkedAt: null, favorite: false, isDemo: true,
  },
  {
    id: "demo-pokimane", username: "pokimane", displayName: "pokimane",
    avatarUrl: "/images/pokimane.jpg", thumbnailUrl: "/images/hero-world.jpg",
    status: "offline", title: "A little catch-up, a little chaos ♡", game: "Just Chatting", category: "Just Chatting",
    viewers: 0, startedAt: null, checkedAt: null, favorite: true, isDemo: true,
  },
  {
    id: "demo-xqc", username: "xqc", displayName: "xQc",
    avatarUrl: "/images/xqc.jpg", thumbnailUrl: "/images/counter-strike.jpg",
    status: "offline", title: "Something new. Probably chaos.", game: "Variety", category: "Gaming",
    viewers: 0, startedAt: null, checkedAt: null, favorite: false, isDemo: true,
  },
  {
    id: "demo-lilypichu", username: "lilypichu", displayName: "lilypichu",
    avatarUrl: "/images/lilypichu.jpg", thumbnailUrl: "/images/elden-ring.jpg",
    status: "offline", title: "Drawing, music & cozy company", game: "Art", category: "Creative",
    viewers: 0, startedAt: null, checkedAt: null, favorite: false, isDemo: true,
  },
];
