import { useState } from "react";
import { useAuth } from "./auth";

// Placeholder pages for dashboard sub-routes
export function LiveStreamPage() {
  return (
    <div className="p-8">
      <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-1">// live-stream · beta</p>
      <h1 className="text-2xl font-bold font-mono text-[#F5F5F5] mb-1">
        $ live-stream <span className="text-[#FFB800]">--status=coming-soon</span>
      </h1>
      <p className="text-sm font-mono text-[#888888] mt-2">
        // real-time meeting transcription + summarization in-progress
      </p>
      <div className="mt-8 border border-dashed border-[#262626] rounded-sm p-10 max-w-lg">
        <p className="text-[10px] font-mono text-[#555555] mb-2">// roadmap item</p>
        <p className="text-xs font-mono text-[#888888] leading-relaxed">
          Live audio stream → real-time Whisper transcription → instant action item extraction.<br/>
          ETA: Q3 2026.
        </p>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-[#555555]">
          <span className="w-1.5 h-1.5 rounded-sm bg-[#FFB800] animate-pulse" />
          // [in development]
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user, login, token } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue]     = useState(user?.name || "");
  const [nameSaved, setNameSaved]     = useState(false);

  function saveName() {
    if (!nameValue.trim()) return;
    // Persist display name update in localStorage (no backend endpoint for profile yet)
    const updatedUser = { ...user, name: nameValue.trim() };
    login(token, updatedUser);
    setEditingName(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  }

  const TECH_STACK = [
    { label: "Transcription",   value: "Groq Whisper (whisper-large-v3)" },
    { label: "AI Extraction",   value: "Groq Cloud (llama-3.3-70b-versatile)" },
    { label: "Embeddings",      value: "all-MiniLM-L6-v2 · 384-dim cosine" },
    { label: "Vector Search",   value: "MongoDB Atlas $vectorSearch" },
    { label: "Audio Slicing",   value: "FFmpeg + HTML5 Media Fragments" },
    { label: "Auth",            value: "JWT · bcrypt · PyJWT" },
    { label: "Frontend",        value: "React 19 · Vite · Tailwind CSS v4" },
    { label: "Backend",         value: "FastAPI · Motor · Pydantic v2" },
  ];

  const INTEGRATIONS = [
    { name: "Jira",    status: "coming soon",  color: "#555555" },
    { name: "Linear",  status: "coming soon",  color: "#555555" },
    { name: "Slack",   status: "coming soon",  color: "#555555" },
    { name: "Notion",  status: "coming soon",  color: "#555555" },
  ];

  return (
    <div className="p-8 max-w-2xl">
      <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-1">// config · settings</p>
      <h1 className="text-2xl font-bold font-mono text-[#F5F5F5] mb-1">$ settings</h1>
      <p className="text-sm font-mono text-[#888888] mt-2 mb-8">// workspace configuration</p>

      {/* ── Account ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest mb-3">// account</p>
        <div className="flex flex-col gap-2">

          {/* Email (read-only) */}
          <div className="bg-[#111111] border border-[#262626] rounded-sm px-4 py-3">
            <p className="text-[9px] font-mono text-[#555555] mb-1">// email</p>
            <p className="text-xs font-mono text-[#F5F5F5]">{user?.email || "—"}</p>
          </div>

          {/* Display name (editable) */}
          <div className="bg-[#111111] border border-[#262626] rounded-sm px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-mono text-[#555555]">// display name</p>
              {nameSaved && <span className="text-[9px] font-mono text-[#39FF88]">[saved ✓]</span>}
            </div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  className="flex-1 h-7 px-2 bg-[#0A0A0A] border border-[#39FF88] rounded-sm text-xs font-mono text-[#F5F5F5] outline-none"
                />
                <button onClick={saveName} className="text-[9px] font-mono text-[#39FF88] border border-[#39FF88]/40 px-2 py-1 rounded-sm hover:bg-[#39FF88]/10 transition-colors">save</button>
                <button onClick={() => setEditingName(false)} className="text-[9px] font-mono text-[#555555] hover:text-[#F5F5F5] transition-colors">cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-[#F5F5F5]">{user?.name || "—"}</p>
                <button
                  onClick={() => { setNameValue(user?.name || ""); setEditingName(true); }}
                  className="text-[9px] font-mono text-[#555555] hover:text-[#39FF88] transition-colors"
                >
                  edit →
                </button>
              </div>
            )}
          </div>

          {/* Password (placeholder) */}
          <div className="bg-[#111111] border border-[#262626] rounded-sm px-4 py-3">
            <p className="text-[9px] font-mono text-[#555555] mb-1">// password</p>
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-[#333333] tracking-widest">••••••••••••</p>
              <span className="text-[9px] font-mono text-[#333333]">[change password — coming soon]</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Integrations ────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest mb-3">// integrations</p>
        <div className="flex flex-col gap-2">
          {INTEGRATIONS.map(({ name, status, color }) => (
            <div key={name} className="flex items-center justify-between bg-[#111111] border border-[#262626] rounded-sm px-4 py-3">
              <p className="text-xs font-mono text-[#888888]">{name}</p>
              <span className="text-[9px] font-mono" style={{ color }}>[{status}]</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tech stack ──────────────────────────────────────────────── */}
      <div>
        <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest mb-3">// tech stack</p>
        <div className="flex flex-col gap-1.5">
          {TECH_STACK.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 bg-[#111111] border border-[#1A1A1A] rounded-sm px-4 py-2.5">
              <p className="text-[9px] font-mono text-[#555555] uppercase tracking-wider shrink-0 w-28">{label}</p>
              <p className="text-[10px] font-mono text-[#888888] text-right">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-[9px] font-mono text-[#2A2A2A] mt-4">// minutes · hackathon build · 2026</p>
      </div>
    </div>
  );
}
