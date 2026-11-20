import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "streamly — your people, live.",
  description: "All your favorite Twitch creators. One happy place. Build your personal watchlist, see who's live, and pull up a stream without the noise.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
