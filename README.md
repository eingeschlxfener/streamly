# streamly

A personal Twitch watchlist built with Next.js App Router, PostgreSQL, and Drizzle ORM.

## Features

- Add a Twitch username or a full channel URL.
- Persistent, private per-browser watchlists stored in PostgreSQL; the browser holds only an HTTP-only workspace cookie.
- Live/offline status, stream thumbnails, viewers, favorites, categories, search, sorting, grid/list layouts, and embedded Twitch playback.
- Optional auto-refresh every 90 seconds while the dashboard is visible.
- Responsive layouts and keyboard shortcuts: `/` to search, `N` to add a creator, and `Escape` to close dialogs.

## Twitch integration

The app works without Twitch credentials by using the public DecAPI status service. That service caches some responses for several minutes. The in-app Refresh action checks actual Twitch channels, including the starter lineup.

For direct official Twitch Helix access, configure these server-only environment variables and restart:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET` (recommended: the app automatically requests and renews an app access token)
- Alternatively, `TWITCH_ACCESS_TOKEN` with a matching client ID

Credentials are never exposed to the client. The app automatically falls back to public status checks if Helix is unavailable. Missing/deleted channels and upstream errors are handled without inventing live statuses.

## Starter lineup

A new workspace begins with six example creators. Those cards are explicitly labeled **Sample activity** and use illustrative game screenshots, not current Twitch activity. Adding your first creator replaces the sample lineup with your own personal watchlist; this is explained in the add dialog. Pressing **Refresh** instead keeps all six channels and replaces their starter snapshots with actual current statuses. Automatic updates only touch real snapshots, leaving the illustrative starter experience unchanged until the user requests a refresh.

## Database and running

Set `DATABASE_URL` to a PostgreSQL database. Schema is in `src/db/schema.ts`.

1. Install dependencies with `npm install`.
2. Apply the schema with `npx drizzle-kit push` (configure `drizzle.config.json` for your database if needed).
3. Run `npm run dev`, or `npm run build` followed by `npm start`.

The production health check is `/api/health`.

## Assets

Hero artwork is custom-generated. Example gaming previews are official Steam store screenshots for ARC Raiders, Counter-Strike 2, and ELDEN RING. Creator avatars are public Twitch profile images. Fonts are locally hosted Manrope and DM Sans.
