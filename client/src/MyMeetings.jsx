/**
 * MyMeetings.jsx — My Meetings dashboard page
 *
 * Backend schema:
 *   Meeting: { _id(ObjectId), userId, title, summary, participants[], actionItems[taskId], duration(s), status, audioPath }
 *   Task:    { _id, userId, meetingId, title, description, assignee, priority, status, sourceQuote, startTime, endTime, audioClipPath, blockedBy }
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./auth";
import { meetingsApi, tasksApi } from "./lib/api";
import { fmtDur, fmtTime, assigneeColor, dateFromObjectId } from "./lib/format";
import { TASK_COLUMNS, TASK_STATUS, MEETING_STATUS, PRIORITY } from "./lib/constants";
import { LogoMarkProcessing } from "./LogoMark";
import Toast from "./components/Toast";
import AudioPlayer from "./components/AudioPlayer";

// ─── Avatar (square monogram) ─────────────────────────────────────────────────
function Avatar({ name, size = 28 }) {
  const color = assigneeColor(name);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      title={name}
      style={{ width: size, height: size, background: `${color}20`, color, border: `1px solid ${color}40`, flexShrink: 0 }}
      className="rounded-sm flex items-center justify-center text-[9px] font-bold font-mono"
    >
      {initials}
    </div>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const c = PRIORITY[priority] || PRIORITY.Low;
  return (
    <span
      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm shrink-0 select-none"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}
    >
      [{priority?.toLowerCase() || "low"}]
    </span>
  );
}

// ─── Status badge (clickable for tasks, static for meetings) ──────────────────
function StatusBadge({ status, onClick, variant = "task" }) {
  const map = variant === "meeting" ? MEETING_STATUS : TASK_STATUS;
  const cfg = map[status] || (variant === "meeting" ? MEETING_STATUS["Uploaded"] : TASK_STATUS["To Do"]);
  return (
    <span
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm shrink-0 select-none
        ${onClick ? "cursor-pointer hover:opacity-70 transition-opacity" : ""}`}
      style={{ color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Upload panel ─────────────────────────────────────────────────────────────
function UploadPanel({ onProcessed, token }) {
  const [mode, setMode] = useState("transcript"); // start with transcript — lower latency demo
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (mode === "audio") {
        if (!file) { setError("Select an audio file first"); return; }
        result = await meetingsApi.uploadAudio(token, file, title || "Untitled Meeting");
      } else {
        if (!transcript.trim()) { setError("Paste a transcript first"); return; }
        result = await meetingsApi.processTranscript(token, transcript.trim(), title || "Untitled Meeting");
      }
      onProcessed(result);
      setTitle(""); setTranscript(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#111111] border border-[#262626] rounded-sm">
      {/* Panel header + mode toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]">
        <div>
          <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest">// new meeting</p>
        </div>
        <div className="flex border border-[#262626] rounded-sm overflow-hidden">
          {[["transcript", "paste"], ["audio", "audio"]].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1 text-[9px] font-mono uppercase tracking-widest transition-all ${
                mode === m ? "bg-[#39FF88] text-black font-bold" : "text-[#555555] hover:text-[#888888]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-2.5">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="// meeting title (optional)"
          className="w-full h-8 px-3 bg-[#0A0A0A] border border-[#262626] rounded-sm text-[11px] font-mono text-[#F5F5F5] placeholder-[#333333] outline-none focus:border-[#39FF88] transition-colors"
        />

        {mode === "audio" ? (
          <div
            onClick={() => fileRef.current?.click()}
            className={`border border-dashed rounded-sm p-5 text-center cursor-pointer transition-colors ${
              file ? "border-[#39FF88]/60 bg-[#39FF88]/5" : "border-[#262626] hover:border-[#39FF88]/30"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.mp4"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <p className="text-[11px] font-mono text-[#39FF88] font-bold truncate">{file.name}</p>
                <p className="text-[9px] font-mono text-[#555555] mt-1">
                  {(file.size / 1_048_576).toFixed(2)} MB · click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-mono text-[#555555]">$ drop audio or click to browse</p>
                <p className="text-[9px] font-mono text-[#333333] mt-1">// mp3 · wav · m4a · ogg · webm</p>
              </>
            )}
          </div>
        ) : (
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder={"// paste transcript here...\n\nAlice: Let's review Q2 priorities...\nBob: We should focus on the API work first..."}
            rows={7}
            className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-sm text-[11px] font-mono text-[#F5F5F5] placeholder-[#333333] outline-none focus:border-[#39FF88] resize-y transition-colors leading-relaxed"
          />
        )}

        {error && (
          <p className="text-[10px] font-mono text-[#FF5C5C] flex items-center gap-1.5">
            <span className="font-bold">✗</span> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-9 bg-[#39FF88] text-black text-[10px] font-mono font-bold rounded-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
        >
          {loading
            ? <LogoMarkProcessing size={14} label={mode === "audio" ? "transcribing..." : "summarizing..."} />
            : `$ run-ai --mode=${mode}`
          }
        </button>
      </form>
    </div>
  );
}

// ─── Meeting sidebar list ─────────────────────────────────────────────────────
function MeetingSidebar({ meetings, activeMeetingId, onSelect, onShowAll, loading }) {
  return (
    <aside className="flex flex-col gap-1">
      {/* All meetings button */}
      <button
        onClick={onShowAll}
        className={`text-left px-3 py-2 rounded-sm border text-[11px] font-mono transition-all ${
          !activeMeetingId
            ? "border-l-2 border-l-[#39FF88] border-[#262626] bg-[#39FF88]/5 text-[#39FF88]"
            : "border-[#262626] text-[#555555] hover:text-[#888888] hover:bg-[#111111] border-l-2 border-l-transparent"
        }`}
      >
        // all meetings
        <span className="ml-2 text-[9px]">[{meetings.length}]</span>
      </button>

      {/* Skeleton */}
      {loading && [1, 2, 3].map(i => (
        <div key={i} className="h-14 bg-[#111111] border border-[#262626] rounded-sm animate-pulse" />
      ))}

      {/* Meeting entries */}
      {!loading && meetings.length === 0 && (
        <p className="text-[9px] font-mono text-[#333333] px-3 py-3">// no meetings yet</p>
      )}

      {!loading && meetings.map(m => {
        const isActive = m._id === activeMeetingId;
        const mCfg = MEETING_STATUS[m.status] || MEETING_STATUS["Uploaded"];
        const date = dateFromObjectId(m._id);
        return (
          <button
            key={m._id}
            onClick={() => onSelect(m._id)}
            className={`text-left px-3 py-2.5 rounded-sm border transition-all ${
              isActive
                ? "border-l-2 border-l-[#39FF88] border-[#262626] bg-[#111111]"
                : "border-[#262626] hover:bg-[#111111] border-l-2 border-l-transparent"
            }`}
          >
            <p className={`text-[11px] font-mono font-semibold truncate ${isActive ? "text-[#39FF88]" : "text-[#F5F5F5]"}`}>
              {m.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {date && (
                <span className="text-[9px] font-mono text-[#555555]">
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {m.duration ? (
                <span className="text-[9px] font-mono text-[#555555]">· {fmtDur(m.duration)}</span>
              ) : null}
              <span className="text-[9px] font-mono" style={{ color: mCfg.color }}>{mCfg.label}</span>
            </div>
          </button>
        );
      })}
    </aside>
  );
}

// ─── Meeting detail strip ─────────────────────────────────────────────────────
function MeetingDetail({ meeting, taskCount }) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  if (!meeting) return null;

  return (
    <div className="bg-[#111111] border border-[#262626] rounded-sm mb-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4 px-5 py-3.5">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest mb-0.5">
            // active · {meeting.status}
          </p>
          <h2 className="text-sm font-mono font-bold text-[#F5F5F5] truncate">{meeting.title}</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-[9px] font-mono text-[#555555]">
            {meeting.duration && <span>duration: {fmtDur(meeting.duration)}</span>}
            {meeting.participants?.length > 0 && (
              <span>
                participants: {meeting.participants.slice(0, 5).join(", ")}
                {meeting.participants.length > 5 ? ` +${meeting.participants.length - 5}` : ""}
              </span>
            )}
            <span>{taskCount} action item{taskCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={meeting.status} variant="meeting" />
          {meeting.summary && (
            <button
              onClick={() => setSummaryOpen(o => !o)}
              className="text-[9px] font-mono text-[#555555] hover:text-[#39FF88] border border-[#262626] hover:border-[#39FF88]/40 px-2 py-1 rounded-sm transition-colors"
            >
              {summaryOpen ? "hide" : "summary"} →
            </button>
          )}
        </div>
      </div>
      {summaryOpen && meeting.summary && (
        <div className="px-5 py-4 border-t border-[#262626] animate-fade-in">
          <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest mb-2">// ai summary</p>
          <p className="text-[11px] font-mono text-[#888888] leading-relaxed whitespace-pre-wrap">{meeting.summary}</p>
        </div>
      )}
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onStatusChange, onPlayAudio }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TASK_STATUS[task.status] || TASK_STATUS["To Do"];
  const currentIdx = TASK_COLUMNS.indexOf(task.status);
  const nextStatus = TASK_COLUMNS[(currentIdx + 1) % TASK_COLUMNS.length];

  return (
    <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm hover:border-[#39FF88]/40 transition-colors group">
      <div className="p-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-[11px] font-mono font-semibold text-[#F5F5F5] leading-snug group-hover:text-[#39FF88] transition-colors">
            {task.title}
          </p>
          <button
            aria-label={expanded ? "Collapse" : "Expand"}
            onClick={() => setExpanded(o => !o)}
            className="text-[#333333] hover:text-[#555555] shrink-0 mt-0.5 text-[10px] font-mono transition-colors"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <PriorityBadge priority={task.priority} />
          <StatusBadge
            status={task.status}
            onClick={() => onStatusChange(task._id, nextStatus)}
          />
          {task.assignee && task.assignee !== "Unassigned" && (
            <div className="flex items-center gap-1 ml-auto">
              <Avatar name={task.assignee} size={18} />
              <span className="text-[9px] font-mono text-[#555555] truncate max-w-[80px]">{task.assignee.split(" ")[0]}</span>
            </div>
          )}
        </div>

        {/* Audio proof CTA — shown whenever clip exists */}
        {task.audioClipPath ? (
          <button
            onClick={() => onPlayAudio(task)}
            className="mt-2.5 flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-sm border border-[#39FF88]/20 bg-[#39FF88]/5 hover:bg-[#39FF88]/10 hover:border-[#39FF88]/40 transition-all group/audio"
          >
            <span className="w-4 h-4 rounded-sm bg-[#39FF88]/20 flex items-center justify-center text-[8px] text-[#39FF88] shrink-0 group-hover/audio:bg-[#39FF88]/30">▶</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-mono text-[#39FF88] font-bold truncate">audio proof</p>
              <p className="text-[8px] font-mono text-[#555555]">[{fmtTime(task.startTime)}–{fmtTime(task.endTime)}]</p>
            </div>
          </button>
        ) : null}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[#262626] px-3 py-3 space-y-2.5 animate-fade-in">
          {task.description && (
            <p className="text-[10px] font-mono text-[#888888] leading-relaxed">{task.description}</p>
          )}
          {task.sourceQuote && (
            <div className="border-l-2 border-[#39FF88]/30 pl-2.5">
              <p className="text-[9px] font-mono text-[#555555] italic leading-relaxed">
                &ldquo;{task.sourceQuote}&rdquo;
              </p>
            </div>
          )}
          {/* Quick status move */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[9px] font-mono text-[#333333]">// move to:</span>
            {TASK_COLUMNS.filter(c => c !== task.status).map(col => {
              const c = TASK_STATUS[col];
              return (
                <button
                  key={col}
                  onClick={() => onStatusChange(task._id, col)}
                  className="text-[9px] font-mono px-1.5 py-0.5 border border-[#262626] rounded-sm hover:border-[#39FF88]/40 transition-colors"
                  style={{ color: c.color }}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Kanban board ─────────────────────────────────────────────────────────────
function KanbanBoard({ tasks, onStatusChange, onPlayAudio, loading }) {
  if (loading) return (
    <div className="flex items-center gap-3 py-10">
      <LogoMarkProcessing size={18} label="loading tasks..." />
    </div>
  );

  if (!tasks.length) return (
    <div className="border border-dashed border-[#1A1A1A] rounded-sm py-12 text-center">
      <p className="text-sm font-mono text-[#555555]">$ no tasks</p>
      <p className="text-[10px] font-mono text-[#333333] mt-1">// process a meeting to generate action items</p>
    </div>
  );

  const byCol = TASK_COLUMNS.reduce((a, c) => ({ ...a, [c]: tasks.filter(t => t.status === c) }), {});

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {TASK_COLUMNS.map(col => {
        const cfg = TASK_STATUS[col];
        const items = byCol[col];
        return (
          <div key={col} className="flex flex-col gap-2">
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#111111] border border-[#262626] rounded-sm">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-sm" style={{ background: cfg.dot }} />
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#888888]">{col}</span>
              </div>
              <span className="text-[9px] font-mono text-[#333333] tabular-nums">[{items.length}]</span>
            </div>
            {/* Cards */}
            <div className="flex flex-col gap-2 min-h-[60px]">
              {items.map(t => (
                <TaskCard
                  key={t._id}
                  task={t}
                  onStatusChange={onStatusChange}
                  onPlayAudio={onPlayAudio}
                />
              ))}
              {items.length === 0 && (
                <div className="border border-dashed border-[#1A1A1A] rounded-sm py-4 flex justify-center">
                  <span className="text-[9px] font-mono text-[#2A2A2A]">// empty</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Audio Proofs view ───────────────────────────────────────────────────────
function AudioProofsView({ tasks, meetings, onPlay }) {
  // Tasks that have an audio clip
  const proofTasks = tasks.filter(t => t.audioClipPath);

  // Group by meetingId
  const byMeeting = proofTasks.reduce((acc, t) => {
    const key = t.meetingId || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  if (!proofTasks.length) return (
    <div className="py-16 border border-dashed border-[#262626] rounded-sm flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border border-[#262626] rounded-sm flex items-center justify-center text-[#333333] font-mono text-lg">
        ▶
      </div>
      <p className="text-sm font-mono text-[#555555]">$ no audio proofs</p>
      <p className="text-[10px] font-mono text-[#333333] text-center max-w-xs">
        // audio proofs are generated when you upload a <span className="text-[#888888]">recording</span> (not a transcript).
        <br />switch to "audio" mode in the upload panel.
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest">// {proofTasks.length} clip{proofTasks.length !== 1 ? "s" : ""} available</p>
      </div>

      {Object.entries(byMeeting).map(([meetingId, clips]) => {
        const meeting = meetings.find(m => m._id === meetingId);
        return (
          <div key={meetingId}>
            {/* Meeting label */}
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-sm bg-[#39FF88] shrink-0" />
              <p className="text-[10px] font-mono text-[#888888] font-bold">
                {meeting ? meeting.title : "Unknown Meeting"}
              </p>
              {meeting?.duration && (
                <span className="text-[9px] font-mono text-[#333333]">// {fmtDur(meeting.duration)}</span>
              )}
            </div>

            {/* Clip list */}
            <div className="flex flex-col gap-2">
              {clips.map(task => (
                <div
                  key={task._id}
                  className="flex items-center gap-4 bg-[#111111] border border-[#262626] rounded-sm px-4 py-3 hover:border-[#39FF88]/40 transition-colors group"
                >
                  {/* Play button */}
                  <button
                    onClick={() => onPlay(task)}
                    className="w-8 h-8 rounded-sm bg-[#39FF88]/10 border border-[#39FF88]/30 flex items-center justify-center text-[#39FF88] hover:bg-[#39FF88]/20 transition-colors shrink-0"
                    aria-label={`Play audio proof for ${task.title}`}
                  >
                    <span className="text-xs">▶</span>
                  </button>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold text-[#F5F5F5] truncate group-hover:text-[#39FF88] transition-colors">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[9px] font-mono text-[#555555]">
                        [{fmtTime(task.startTime)} – {fmtTime(task.endTime)}]
                      </span>
                      {task.assignee && task.assignee !== "Unassigned" && (
                        <span className="text-[9px] font-mono text-[#555555]">// {task.assignee}</span>
                      )}
                    </div>
                  </div>

                  {/* Source quote snippet */}
                  {task.sourceQuote && (
                    <p className="text-[9px] font-mono text-[#555555] italic hidden md:block max-w-[240px] truncate">
                      &ldquo;{task.sourceQuote}&rdquo;
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} variant="task" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── People view ──────────────────────────────────────────────────────────────
function PeopleView({ tasks }) {
  if (!tasks.length) return (
    <div className="py-10 text-center">
      <p className="text-sm font-mono text-[#555555]">$ no tasks assigned yet</p>
    </div>
  );

  const byAssignee = tasks.reduce((acc, t) => {
    const key = t.assignee || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Object.entries(byAssignee).sort(([a], [b]) => a.localeCompare(b)).map(([name, items]) => {
        const color = assigneeColor(name);
        const done = items.filter(t => t.status === "Done").length;
        const pct = Math.round((done / items.length) * 100);
        return (
          <div key={name} className="bg-[#111111] border border-[#262626] rounded-sm hover:border-[#39FF88]/30 transition-colors">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#262626]">
              <Avatar name={name} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-bold text-[#F5F5F5] truncate">{name}</p>
                <p className="text-[9px] font-mono text-[#555555]">
                  // {items.length} task{items.length !== 1 ? "s" : ""} · {done} done
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color }}>
                [{pct}%]
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-0.5 bg-[#1A1A1A]">
              <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className="p-3 space-y-1.5">
              {items.map(t => {
                const sc = TASK_STATUS[t.status] || TASK_STATUS["To Do"];
                return (
                  <div key={t._id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: sc.dot }} />
                    <p className="text-[10px] font-mono text-[#888888] truncate flex-1">{t.title}</p>
                    <PriorityBadge priority={t.priority} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MyMeetings() {
  const { token } = useAuth();

  const [meetings, setMeetings]               = useState([]);
  const [tasks, setTasks]                     = useState([]);
  const [activeMeetingId, setActiveMeetingId] = useState(null);
  const [view, setView]                       = useState("kanban");
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [loadingTasks, setLoadingTasks]       = useState(false);
  const [toast, setToast]                     = useState(null);
  const [playingTask, setPlayingTask]         = useState(null);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, []);

  // ── Load meetings on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadingMeetings(true);
    meetingsApi.list(token)
      .then(data => { if (!cancelled) setMeetings(Array.isArray(data) ? data : []); })
      .catch(err => { if (!cancelled) notify(err.message, "error"); })
      .finally(() => { if (!cancelled) setLoadingMeetings(false); });
    return () => { cancelled = true; };
  }, [token]);

  // ── Load tasks when active meeting changes ──────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadingTasks(true);
    tasksApi.list(token, activeMeetingId)
      .then(data => { if (!cancelled) setTasks(Array.isArray(data) ? data : []); })
      .catch(err => { if (!cancelled) notify(err.message, "error"); })
      .finally(() => { if (!cancelled) setLoadingTasks(false); });
    return () => { cancelled = true; };
  }, [token, activeMeetingId]);

  // ── After a meeting is processed ───────────────────────────────────────────
  function handleProcessed({ meeting, tasks: newTasks }) {
    if (meeting) {
      setMeetings(prev => [meeting, ...prev]);
      setActiveMeetingId(meeting._id);
    }
    if (Array.isArray(newTasks)) setTasks(newTasks);
    notify(`"${meeting?.title}" processed — ${newTasks?.length ?? 0} action items`);
  }

  // ── Task status change ──────────────────────────────────────────────────────
  async function handleStatusChange(taskId, newStatus) {
    // Optimistic update
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      const updated = await tasksApi.update(token, taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === taskId ? updated : t));
    } catch (err) {
      notify(err.message, "error");
      // Revert on error
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: t.status } : t));
    }
  }

  const activeMeeting = meetings.find(m => m._id === activeMeetingId) ?? null;

  return (
    <div className="p-6">
      {/* Toasts + audio player */}
      <Toast msg={toast?.msg} type={toast?.type} />
      <AudioPlayer task={playingTask} onClose={() => setPlayingTask(null)} />

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-0.5">
            // my-meetings · workspace
          </p>
          <h1 className="text-xl font-bold font-mono text-[#F5F5F5]">$ my-meetings</h1>
        </div>
        {/* View toggle */}
        <div className="flex border border-[#262626] rounded-sm overflow-hidden">
          {[["kanban", "kanban"], ["people", "people"], ["proofs", "▶ audio"]].map(([key, label]) => (
            <button
              key={key}
              id={`view-${key}`}
              onClick={() => setView(key)}
              className={`px-4 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest transition-all ${
                view === key
                  ? key === "proofs" ? "bg-[#39FF88] text-black" : "bg-[#39FF88] text-black"
                  : "text-[#555555] hover:text-[#888888]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-5">
        {/* Left rail: upload + meeting list */}
        <div className="w-60 shrink-0 flex flex-col gap-4">
          <UploadPanel onProcessed={handleProcessed} token={token} />
          <MeetingSidebar
            meetings={meetings}
            activeMeetingId={activeMeetingId}
            onSelect={setActiveMeetingId}
            onShowAll={() => setActiveMeetingId(null)}
            loading={loadingMeetings}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          <MeetingDetail meeting={activeMeeting} taskCount={tasks.length} />
          {view === "kanban" && (
            <KanbanBoard tasks={tasks} onStatusChange={handleStatusChange} onPlayAudio={setPlayingTask} loading={loadingTasks} />
          )}
          {view === "people" && (
            <PeopleView tasks={tasks} />
          )}
          {view === "proofs" && (
            <AudioProofsView tasks={tasks} meetings={meetings} onPlay={setPlayingTask} />
          )}
        </div>
      </div>
    </div>
  );
}
