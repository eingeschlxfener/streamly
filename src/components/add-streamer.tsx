"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, LoaderCircle, Plus, Radio, ShieldCheck, Sparkles } from "lucide-react";
import Twitch from "@/components/twitch-icon";
import Modal from "@/components/modal";

export default function AddStreamer({ onClose, onAdd, hasSamples }: { onClose: () => void; onAdd: (username: string) => Promise<void>; hasSamples: boolean }) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || busy) return;
    setError(""); setBusy(true);
    try { await onAdd(username); }
    catch (err) { setError(err instanceof Error ? err.message : "Couldn't add this streamer. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} titleId="add-title">
      <div className="dialog-illustration"><Radio size={29} strokeWidth={1.6} /><span className="dialog-spark">✦</span></div>
      <span className="eyebrow">MAKE YOURSELF AT HOME</span>
      <h2 id="add-title">Bring your people.</h2>
      <p className="dialog-description">One username. A little more good company.<br />Add any Twitch creator to your personal watchlist.</p>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="twitch-username">Twitch username</label>
        <div className={`username-field ${error ? "field-error" : ""}`}>
          <Twitch size={18} /><span>twitch.tv/</span>
          <input id="twitch-username" name="username" data-autofocus autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="your_favorite_streamer" value={username} maxLength={150} onChange={(e) => { setUsername(e.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "add-error" : "username-hint"} disabled={busy} required />
        </div>
        {error ? <p className="form-error" id="add-error" role="alert">{error}</p> : <p className="field-hint" id="username-hint">A username or a full Twitch channel link both work.</p>}
        <div className="suggestion-row"><span>Need inspiration?</span>{["northernlion", "caseoh_", "caedrel"].map((name) => <button key={name} type="button" disabled={busy} onClick={() => { setUsername(name); setError(""); }}>{name}<ArrowUpRight size={11} /></button>)}</div>
        {hasSamples && <p className="sample-replace-note"><Sparkles size={12} />Your first add replaces the sample lineup with your own.</p>}
        <button className="button button-primary add-submit" disabled={!username.trim() || busy} type="submit">{busy ? <><LoaderCircle size={17} className="spin" /> Finding your creator…</> : <><Plus size={18} /> Add to watchlist</>}</button>
      </form>
      <p className="privacy-note"><ShieldCheck size={14} /> No Twitch login needed. Just good streams.</p>
    </Modal>
  );
}
