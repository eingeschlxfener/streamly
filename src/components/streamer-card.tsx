"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BadgeCheck, Ellipsis, ExternalLink, Eye, Heart, Play, Radio, Trash2 } from "lucide-react";
import Twitch from "@/components/twitch-icon";
import type { Streamer } from "@/lib/types";

export function compactNumber(number: number) { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(number); }

export function Avatar({ streamer, className = "" }: { streamer: Pick<Streamer, "avatarUrl" | "displayName">; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <span className={`avatar ${className}`}>{streamer.avatarUrl && !failed ? <img src={streamer.avatarUrl} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span>{streamer.displayName.slice(0, 2).toUpperCase()}</span>}</span>;
}

export default function StreamerCard({ streamer, onPreview, onFavorite, onRemove, disabled }: { streamer: Streamer; onPreview: (streamer: Streamer) => void; onFavorite: (streamer: Streamer) => void; onRemove: (streamer: Streamer) => void; disabled: boolean }) {
  const [menu, setMenu] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const live = streamer.status === "live";

  useEffect(() => { setImageFailed(false); }, [streamer.thumbnailUrl]);
  useEffect(() => {
    if (!menu) return;
    function outside(event: MouseEvent) { if (!menuRef.current?.contains(event.target as Node)) setMenu(false); }
    function key(event: KeyboardEvent) { if (event.key === "Escape") setMenu(false); }
    document.addEventListener("mousedown", outside); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", key); };
  }, [menu]);

  return (
    <article className={`streamer-card ${live ? "is-live" : "is-offline"}`}>
      <button className="stream-thumbnail" onClick={() => onPreview(streamer)} aria-label={`Preview ${streamer.displayName}'s ${live ? "live stream" : "channel"}`}>
        {streamer.thumbnailUrl && !imageFailed ? <img className="thumbnail-image" src={streamer.thumbnailUrl} alt={`${streamer.game} stream preview`} loading="lazy" onError={() => setImageFailed(true)} /> : <div className="thumbnail-placeholder"><Radio size={60} strokeWidth={0.8} /></div>}
        <div className="thumbnail-shade" />
        <span className={`status-badge ${live ? "badge-live" : "badge-offline"}`}><span />{live ? "LIVE" : streamer.status === "unknown" ? "UNAVAILABLE" : "OFFLINE"}</span>
        {live ? <><span className="viewer-badge"><Eye size={12} />{compactNumber(streamer.viewers)} viewers</span><span className="thumbnail-corner"><Twitch size={15} /></span><span className="play-hover"><Play size={23} fill="currentColor" /></span></> : <div className="offline-message"><Avatar streamer={streamer} /><span>Good things take a little downtime.</span></div>}
        <span className="preview-hover">{live ? "Watch stream" : "Visit channel"}<ArrowUpRight size={13} /></span>
      </button>
      <div className="card-body">
        <div className="creator-row">
          <button className="creator-avatar-button" onClick={() => onPreview(streamer)} aria-label={`Open ${streamer.displayName}`}><Avatar streamer={streamer} /><span className={`avatar-status ${live ? "online" : ""}`} /></button>
          <div className="creator-meta"><button onClick={() => onPreview(streamer)} className="creator-name">{streamer.displayName}<BadgeCheck size={14} className="verified-badge" /></button><span className="creator-game">{streamer.game}</span></div>
          <button className={`favorite-button ${streamer.favorite ? "is-favorite" : ""}`} title={streamer.favorite ? "Remove from favorites" : "Add to favorites"} aria-label={`${streamer.favorite ? "Unfavorite" : "Favorite"} ${streamer.displayName}`} aria-pressed={streamer.favorite} disabled={disabled} onClick={() => onFavorite(streamer)}><Heart size={17} fill={streamer.favorite ? "currentColor" : "none"} /></button>
        </div>
        <p className="stream-title" title={streamer.title}>{streamer.title}</p>
        <div className="card-footer"><span className="stream-tag">{streamer.category}</span><span className="stream-language">{streamer.isDemo ? "Sample" : "Twitch"}</span><div className="card-menu-wrap" ref={menuRef}><button className={`icon-button more-button ${menu ? "menu-is-open" : ""}`} aria-label={`Options for ${streamer.displayName}`} aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu(!menu)}><Ellipsis size={18} /></button>{menu && <div className="card-menu" role="menu"><a role="menuitem" href={`https://www.twitch.tv/${streamer.username}`} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)}><ExternalLink size={14} />Open on Twitch<ArrowUpRight size={12} /></a><button role="menuitem" className="danger-text" disabled={disabled} onClick={() => { setMenu(false); onRemove(streamer); }}><Trash2 size={14} />Remove streamer</button></div>}</div></div>
      </div>
    </article>
  );
}
