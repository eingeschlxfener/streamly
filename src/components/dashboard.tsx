"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownWideNarrow, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronRight, CircleHelp, Gamepad2, Grid2X2, Heart, LayoutGrid, List, LoaderCircle, Menu, MessageCircle, Palette, Plus, Radio, RefreshCw, Search, SearchX, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import AddStreamer from "@/components/add-streamer";
import Modal from "@/components/modal";
import StreamerCard, { Avatar, compactNumber } from "@/components/streamer-card";
import TwitchIcon from "@/components/twitch-icon";
import type { StreamCategory, Streamer, StreamerResponse, StreamStatus } from "@/lib/types";

type Scope = "all" | "favorites" | StreamCategory;
type StatusFilter = "all" | Exclude<StreamStatus, "unknown">;
type Sort = "live" | "viewers" | "az" | "added";

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}

function embedUrl(username: string) {
  if (typeof window === "undefined") return "";
  const parents = new Set([window.location.hostname]);
  try { Array.from(window.location.ancestorOrigins || []).forEach((origin) => parents.add(new URL(origin).hostname)); } catch { /* The current host is sufficient outside a frame. */ }
  const params = new URLSearchParams({ channel: username, autoplay: "true", muted: "true" });
  parents.forEach((parent) => params.append("parent", parent));
  return `https://player.twitch.tv/?${params}`;
}

export default function Dashboard({ initialStreamers }: { initialStreamers: Streamer[] }) {
  const [streamers, setStreamers] = useState(initialStreamers);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [scope, setScope] = useState<Scope>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("live");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showAdd, setShowAdd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [watching, setWatching] = useState<Streamer | null>(null);
  const [removing, setRemoving] = useState<Streamer | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);
  const [pendingFavorites, setPendingFavorites] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState(false);
  const [provider, setProvider] = useState<"twitch" | "decapi">("decapi");
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const lineupRef = useRef<HTMLElement>(null);

  const notify = useCallback((text: string, error = false) => setNotice({ text, error }), []);

  const loadWatchlist = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await requestJson<StreamerResponse>("/api/streamers");
      setStreamers(data.streamers); setProvider(data.provider); setReady(true);
    } catch { setLoadError(true); }
  }, []);

  useEffect(() => { void loadWatchlist(); }, [loadWatchlist]);
  useEffect(() => {
    try {
      setAutoRefresh(localStorage.getItem("streamly-auto-refresh") !== "false");
      const savedView = localStorage.getItem("streamly-view");
      if (savedView === "list") setView("list");
    } catch { /* Watchlists still work when localStorage is unavailable. */ }
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 5500); return () => clearTimeout(timer); }, [notice]);

  const refresh = useCallback(async (manual = true) => {
    if (refreshing || !ready) return;
    setRefreshing(true);
    try {
      const data = await requestJson<StreamerResponse>("/api/streamers/refresh", { method: "POST", body: JSON.stringify({ includeSamples: manual }) });
      setStreamers(data.streamers); setProvider(data.provider); setLastChecked(true);
      if (manual) notify(data.partial ? "Some channels couldn't update. Your watchlist is safe—try again shortly." : "You're all caught up. Live status updated.", Boolean(data.partial));
    } catch (error) { if (manual) notify(error instanceof Error ? error.message : "Couldn't refresh Twitch right now.", true); }
    finally { setRefreshing(false); }
  }, [refreshing, ready, notify]);

  useEffect(() => {
    if (!autoRefresh || !ready) return;
    const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(false); }, 90000);
    return () => clearInterval(interval);
  }, [autoRefresh, ready, refresh]);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const element = event.target as HTMLElement;
      if (element.matches("input, textarea, select") || element.isContentEditable || event.ctrlKey || event.metaKey || showAdd || showHelp || watching || removing) return;
      if (event.key === "/") { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key.toLowerCase() === "n" && ready) { event.preventDefault(); setShowAdd(true); }
    }
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [showAdd, showHelp, watching, removing, ready]);

  async function addStreamer(username: string) {
    const data = await requestJson<{ streamer: Streamer; streamers: Streamer[] }>("/api/streamers", { method: "POST", body: JSON.stringify({ username }) });
    setStreamers(data.streamers); setShowAdd(false);
    setScope("all"); setStatus("all"); setSearch("");
    notify(`${data.streamer.displayName} is in. Make yourself comfortable.`);
  }

  async function favoriteStreamer(streamer: Streamer) {
    if (!ready || pendingFavorites.includes(streamer.id)) return;
    setPendingFavorites((current) => [...current, streamer.id]);
    setStreamers((current) => current.map((s) => s.id === streamer.id ? { ...s, favorite: !streamer.favorite } : s));
    try {
      await requestJson(`/api/streamers/${streamer.id}`, { method: "PATCH", body: JSON.stringify({ favorite: !streamer.favorite }) });
    } catch (error) {
      setStreamers((current) => current.map((s) => s.id === streamer.id ? { ...s, favorite: streamer.favorite } : s));
      notify(error instanceof Error ? error.message : "Couldn't save your favorite.", true);
    } finally { setPendingFavorites((current) => current.filter((id) => id !== streamer.id)); }
  }

  async function removeStreamer() {
    if (!removing || removingBusy) return;
    setRemovingBusy(true);
    try {
      await requestJson(`/api/streamers/${removing.id}`, { method: "DELETE" });
      setStreamers((current) => current.filter((s) => s.id !== removing.id));
      notify(`${removing.displayName} was removed from your watchlist.`); setRemoving(null);
    } catch (error) { notify(error instanceof Error ? error.message : "Couldn't remove this creator.", true); }
    finally { setRemovingBusy(false); }
  }

  function navigate(nextScope: Scope, nextStatus: StatusFilter = "all") { setScope(nextScope); setStatus(nextStatus); setSearch(""); setMobileOpen(false); }
  function openAdd() { setMobileOpen(false); if (ready) setShowAdd(true); else void loadWatchlist(); }
  function toggleAutoRefresh() { setAutoRefresh((current) => { try { localStorage.setItem("streamly-auto-refresh", String(!current)); } catch { /* Optional preference. */ } return !current; }); }
  function changeView(next: "grid" | "list") { setView(next); try { localStorage.setItem("streamly-view", next); } catch { /* Optional preference. */ } }

  const liveStreamers = streamers.filter((s) => s.status === "live");
  const favoriteCount = streamers.filter((s) => s.favorite).length;
  const sampleCount = streamers.filter((s) => s.isDemo).length;
  const scoped = useMemo(() => streamers.filter((s) => scope === "all" || (scope === "favorites" ? s.favorite : s.category === scope)), [streamers, scope]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = scoped.filter((s) => (status === "all" || s.status === status) && (!query || `${s.username} ${s.displayName} ${s.game} ${s.title}`.toLowerCase().includes(query)));
    if (sort === "live") result.sort((a, b) => Number(b.status === "live") - Number(a.status === "live"));
    if (sort === "viewers") result.sort((a, b) => b.viewers - a.viewers);
    if (sort === "az") result.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return result;
  }, [scoped, status, search, sort]);
  const pageTitle = scope === "favorites" ? "Your favorites" : scope !== "all" ? scope : status === "live" ? "Live right now" : "Your watchlist";
  const pageDescription = scope === "favorites" ? "The ones you always make time for. We get it." : scope !== "all" ? "A little more of what you're into. All in one place." : "All your favorite people. One happy place.";
  const categories = [{ name: "Gaming" as const, icon: Gamepad2 }, { name: "Just Chatting" as const, icon: MessageCircle }, { name: "Creative" as const, icon: Palette }];

  return (
    <div className="app-shell">
      {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <button className="brand" onClick={() => navigate("all")} aria-label="streamly home"><span className="brand-mark"><svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m7 7 7 7-7 7M14 7l7 7-7 7" stroke="currentColor" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>streamly<span className="brand-dot">.</span></span></button>
        <div className="sidebar-section-label">YOUR SPACE</div>
        <nav className="primary-nav" aria-label="Your library">
          <button className={`nav-item ${scope === "all" && status !== "live" ? "active" : ""}`} onClick={() => navigate("all")}><LayoutGrid size={18} /><span>Watchlist</span><span className="nav-count">{streamers.length}</span></button>
          <button className={`nav-item ${scope === "all" && status === "live" ? "active" : ""}`} onClick={() => navigate("all", "live")}><Radio size={18} /><span>Live now</span><span className="nav-count live-count">{liveStreamers.length}</span></button>
          <button className={`nav-item ${scope === "favorites" ? "active" : ""}`} onClick={() => navigate("favorites")}><Heart size={18} /><span>Favorites</span><span className="nav-count">{favoriteCount}</span></button>
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-section-label category-label">YOUR KIND OF CONTENT</div>
        <nav className="category-nav" aria-label="Stream categories">{categories.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${scope === name ? "active" : ""}`} onClick={() => navigate(name)}><Icon size={17} /><span>{name}</span><span className="category-count">{streamers.filter((s) => s.category === name).length}</span></button>)}</nav>
        {liveStreamers.length > 0 && <div className="sidebar-live"><div className="sidebar-section-label">ON AIR <span className="tiny-live-dot" /></div>{liveStreamers.slice(0, 3).map((streamer) => <button className="sidebar-creator" key={streamer.id} onClick={() => { setWatching(streamer); setMobileOpen(false); }}><Avatar streamer={streamer} /><span className="sidebar-creator-info"><strong>{streamer.displayName}</strong><span>{streamer.game}</span></span><span className="sidebar-watching">{compactNumber(streamer.viewers)}<span /></span></button>)}</div>}
        <div className="sidebar-bottom"><div className="sidebar-promo"><span className="promo-icon"><Sparkles size={20} /></span><h3>A little more<br />your kind of live.</h3><p>Your next favorite is just<br />a username away.</p><button onClick={openAdd}>Add a streamer<Plus size={15} /></button><span className="promo-orbit orbit-one" /><span className="promo-orbit orbit-two" /></div><button className="help-link" onClick={() => { setShowHelp(true); setMobileOpen(false); }}><CircleHelp size={16} />How streamly works<ArrowUpRight size={14} /></button><div className="sidebar-profile"><span className="profile-avatar">Y<span /></span><span><strong>Your little corner</strong><small>Saved on this browser</small></span><ShieldCheck size={16} /></div></div>
      </aside>

      <div className="main-shell">
        <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen}><Menu size={20} /></button><Grid2X2 size={15} /><span>My space</span><ChevronRight size={12} /><strong>{scope === "all" ? "Watchlist" : scope}</strong></div><div className="topbar-actions"><button className={`auto-refresh ${autoRefresh ? "auto-on" : ""}`} onClick={toggleAutoRefresh} aria-pressed={autoRefresh} title="Automatically check your added streamers every 90 seconds"><span className="tiny-live-dot" />Auto-refresh<span className="auto-state">{autoRefresh ? "on" : "off"}</span></button><span className="topbar-divider" /><button className="icon-button topbar-help" title="How streamly works" aria-label="How streamly works" onClick={() => setShowHelp(true)}><CircleHelp size={18} /></button><button className="topbar-avatar" title="About your personal space" aria-label="About your personal space" onClick={() => setShowHelp(true)}>Y</button></div></header>

        <main className="main-content">
          <div className="page-heading"><div><div className="title-row"><h1>{pageTitle}</h1><span className="title-count">{scope === "all" && status === "live" ? liveStreamers.length : scoped.length}</span></div><p>{pageDescription}</p></div><div className="page-heading-actions"><button className="button button-secondary refresh-button" onClick={() => void refresh(true)} disabled={!ready || refreshing} title="Check current Twitch status, including the sample lineup"><RefreshCw size={15} className={refreshing ? "spin" : ""} /><span>{refreshing ? "Refreshing" : "Refresh"}</span></button><button className="button button-primary" onClick={openAdd} disabled={!ready && !loadError}><Plus size={17} />Add streamer</button></div></div>

          {loadError && <div className="load-error" role="alert">We couldn't load your saved watchlist. Your changes are safe.<button onClick={() => void loadWatchlist()}>Try again<RefreshCw size={13} /></button></div>}

          <section className="hero" aria-labelledby="hero-title"><img className="hero-art" src="/images/hero-world.jpg" alt="A traveler overlooking an otherworldly valley beneath a luminous blue planet" fetchPriority="high" /><div className="hero-gradient" /><div className="hero-content"><div className="hero-eyebrow"><span />YOUR FRONT-ROW SEAT</div><h2 id="hero-title">Good streams.<br />Great company.</h2><p>Less looking around. More hanging out.</p><button className="hero-button" onClick={() => { navigate("all", "live"); lineupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>See who's live<ArrowUpRight size={16} /></button></div><div className="hero-top-note"><span className="hero-note-line" />CURATED BY YOU. ALWAYS.</div><button className="hero-company" onClick={() => { navigate("all"); lineupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span className="avatar-stack">{streamers.slice(0, 3).map((streamer) => <Avatar key={streamer.id} streamer={streamer} />)}</span><span><strong>Your people. Right here.</strong><span>Find your corner of the internet.</span></span><ArrowUpRight size={16} /></button></section>

          <section className="lineup" ref={lineupRef} aria-label="Your streamers">
            <div className="lineup-toolbar"><div className="status-tabs" role="tablist" aria-label="Filter stream status">{([{ key: "all", label: "All streamers" }, { key: "live", label: "Live now" }, { key: "offline", label: "Offline" }] as const).map((tab) => <button key={tab.key} role="tab" aria-selected={status === tab.key} className={`status-tab ${status === tab.key ? "selected" : ""}`} onClick={() => setStatus(tab.key)}>{tab.key === "live" && <span className="tab-live-dot" />}{tab.label}<span className="tab-count">{tab.key === "all" ? scoped.length : scoped.filter((s) => s.status === tab.key).length}</span></button>)}</div><div className="toolbar-right"><div className="search-field"><Search size={15} /><input ref={searchRef} aria-label="Search streamers" placeholder="Find a streamer…" value={search} onChange={(e) => setSearch(e.target.value)} />{search ? <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={13} /></button> : <kbd>/</kbd>}</div><div className="view-switch" aria-label="Watchlist layout"><button className={view === "grid" ? "selected" : ""} aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => changeView("grid")}><LayoutGrid size={16} /></button><button className={view === "list" ? "selected" : ""} aria-label="List view" aria-pressed={view === "list"} onClick={() => changeView("list")}><List size={17} /></button></div></div></div>
            <div className="lineup-subheader"><div className="lineup-summary"><span>{visible.length} {visible.length === 1 ? "streamer" : "streamers"}<span className="summary-dot">·</span>{status === "offline" ? "Taking a little downtime" : `${scoped.filter((s) => s.status === "live").length} live right now`}</span>{sampleCount > 0 && <button className="sample-label" onClick={() => setShowHelp(true)} title="Starter cards use example activity. Refresh for current Twitch status.">Sample activity<CircleHelp size={11} /></button>}</div><div className="sort-control"><ArrowDownWideNarrow size={13} /><span>Sort by:</span><select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort streamers"><option value="live">Live first</option><option value="viewers">Most viewers</option><option value="az">Name A–Z</option><option value="added">Date added</option></select><ChevronDown size={12} /></div></div>
            {visible.length ? <div className={`streamer-grid ${view === "list" ? "list-view" : ""}`}>{visible.map((streamer) => <StreamerCard key={streamer.id} streamer={streamer} onPreview={setWatching} onFavorite={(s) => void favoriteStreamer(s)} onRemove={setRemoving} disabled={!ready || pendingFavorites.includes(streamer.id)} />)}</div> : <div className="empty-state"><span><SearchX size={29} strokeWidth={1.4} /></span><h3>{search ? "No familiar faces found." : status === "live" ? "A quiet moment. They'll be back." : scope === "favorites" ? "Your favorites belong here." : "Make this place yours."}</h3><p>{search ? "Try another username, game, or stream title." : scope === "favorites" ? "Tap the heart on any creator to keep them extra close." : "Add a creator or change your filters to find your people."}</p><div><button className="button button-secondary" onClick={() => { navigate("all"); }}>Show all streamers</button><button className="button button-primary" onClick={openAdd}><Plus size={15} />Add streamer</button></div></div>}
          </section>
          <footer className="page-footer"><span><Sparkles size={13} />Just your favorites. No algorithm.</span><span>{lastChecked ? <><span className="tiny-live-dot" />Checked just now</> : <>A little less noise. A lot more you.</>}<span className="footer-divider" /><TwitchIcon size={13} />Powered by Twitch</span></footer>
        </main>
      </div>

      {showAdd && <AddStreamer onClose={() => setShowAdd(false)} onAdd={addStreamer} hasSamples={sampleCount > 0} />}
      {watching && <Modal onClose={() => setWatching(null)} titleId="watch-title" wide><div className="watch-heading"><Avatar streamer={watching} /><div><h2 id="watch-title">{watching.displayName}<span className={`watch-status ${watching.status === "live" ? "watch-live" : ""}`}>{watching.status === "live" ? "LIVE" : watching.status === "offline" ? "OFFLINE" : "UNAVAILABLE"}</span></h2><p>{watching.game}</p></div></div>{watching.isDemo && <p className="sample-player-note"><Sparkles size={13} />The card shows sample activity. The player below shows this channel's actual current status.</p>}{watching.status === "live" ? <div className="twitch-player"><iframe src={embedUrl(watching.username)} title={`${watching.displayName} on Twitch`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div> : <div className="offline-player"><Avatar streamer={watching} /><Radio size={25} /><h3>Taking a little breather.</h3><p>{watching.displayName} isn't streaming on this watchlist right now.<br />Visit their channel for videos and their next live stream.</p><a href={`https://www.twitch.tv/${watching.username}`} target="_blank" rel="noopener noreferrer" className="button button-primary"><TwitchIcon size={16} />Visit channel<ArrowUpRight size={15} /></a></div>}<div className="watch-footer"><span>Pull up a chair. You're in good company.</span><a className="button button-secondary" href={`https://www.twitch.tv/${watching.username}`} target="_blank" rel="noopener noreferrer">Open on Twitch<ArrowUpRight size={14} /></a></div><p className="player-fallback">Player not loading? Your browser may block embedded video. Open the channel directly on Twitch.</p></Modal>}
      {removing && <Modal onClose={() => { if (!removingBusy) setRemoving(null); }} titleId="remove-title"><div className="dialog-illustration remove-illustration"><Trash2 size={25} /></div><span className="eyebrow">YOUR WATCHLIST, YOUR CALL</span><h2 id="remove-title">Part ways for now?</h2><p className="dialog-description">Remove <strong>{removing.displayName}</strong> from your watchlist? You can always add them again when the mood strikes.</p><div className="confirm-actions"><button className="button button-secondary" disabled={removingBusy} onClick={() => setRemoving(null)}>Keep them around</button><button className="button button-danger" disabled={removingBusy} onClick={() => void removeStreamer()}>{removingBusy ? <LoaderCircle size={16} className="spin" /> : <Trash2 size={15} />}Remove streamer</button></div></Modal>}
      {showHelp && <Modal onClose={() => setShowHelp(false)} titleId="help-title"><div className="dialog-illustration"><Radio size={29} strokeWidth={1.6} /></div><span className="eyebrow">A LITTLE LESS NOISE</span><h2 id="help-title">Your people, all together.</h2><p className="dialog-description">A small corner of the internet, made for the streams you actually love.</p><div className="help-steps"><div><span>01</span><div><h3>Bring your favorites</h3><p>Add any Twitch username or channel link. No Twitch account or login required.</p></div></div><div><span>02</span><div><h3>Know when to pull up a chair</h3><p>Added creators update every 90 seconds while you're here. Public status checks may lag by a few minutes.</p></div></div><div><span>03</span><div><h3>Make this little space yours</h3><p>Favorite creators, filter your lineup, and preview streams. Your watchlist is saved privately for this browser.</p></div></div></div>{sampleCount > 0 && <div className="help-sample"><Sparkles size={16} /><div><strong>A little inspiration to get started</strong><p>The starter lineup uses sample activity and game artwork, not current live statuses. Hit Refresh to check the actual channels, or add anyone to begin your own lineup.</p></div></div>}<div className="connection-status"><span className="tiny-live-dot" /><span>{provider === "twitch" ? "Connected to the official Twitch API" : "Connected via public Twitch status · DecAPI"}</span><ShieldCheck size={14} /></div><button className="button button-primary help-done" onClick={() => setShowHelp(false)}>Make yourself comfortable<ArrowRight size={16} /></button></Modal>}
      {notice && <div className={`toast ${notice.error ? "toast-error" : ""}`} role="status"><span className="toast-icon">{notice.error ? <CircleHelp size={17} /> : <Check size={17} />}</span><span>{notice.text}</span><button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={14} /></button></div>}
    </div>
  );
}
