/**
 * DashboardHome.jsx — Dashboard landing page with stats + recent meetings
 *
 * Fixes:
 *  - Date from ObjectId _id (MongoDB has no meetingDate/createdAt field by default)
 *  - Stable assignee colors via hash (not module-level mutable counter)
 *  - Imports from shared lib/api + lib/format + lib/constants
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { meetingsApi, tasksApi } from "./lib/api";
import { fmtDur, dateFromObjectId, assigneeColor, getGreeting } from "./lib/format";
import { MEETING_STATUS } from "./lib/constants";

// ─── Stat card with staggered fade-up ────────────────────────────────────────
function StatCard({ label, value, trend, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const isPos = trend?.startsWith("+");
  const isNeg = trend?.startsWith("-");

  return (
    <div
      className={`bg-[#111111] border border-[#262626] rounded-sm p-5 hover:border-[#39FF88]/30 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
      style={{ transition: "opacity 0.3s ease, transform 0.3s ease", transitionDelay: `${delay}ms` }}
    >
      <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-3">
        // {label}
      </p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-bold font-mono text-[#F5F5F5] leading-none tabular-nums">{value}</p>
        {trend && trend !== "0" && (
          <span
            className="text-[10px] font-mono font-bold shrink-0 mb-0.5 tabular-nums"
            style={{ color: isPos ? "#39FF88" : isNeg ? "#FF5C5C" : "#888888" }}
          >
            [{trend}]
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Avatar stack (square monograms) ─────────────────────────────────────────
function AvatarStack({ names = [], max = 4 }) {
  const shown = names.slice(0, max);
  const rest = names.length - max;
  if (!names.length) return null;
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {shown.map((name, i) => {
        const color = assigneeColor(name);
        const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
        return (
          <div
            key={i}
            title={name}
            className="w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-bold shrink-0"
            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
          >
            {initials}
          </div>
        );
      })}
      {rest > 0 && (
        <div className="w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-mono text-[#555555] bg-[#0A0A0A] border border-[#262626]">
          +{rest}
        </div>
      )}
    </div>
  );
}

// ─── Meeting row ──────────────────────────────────────────────────────────────
function MeetingRow({ meeting, idx, onClick }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80 + idx * 55);
    return () => clearTimeout(t);
  }, [idx]);

  const taskCount = Array.isArray(meeting.actionItems) ? meeting.actionItems.length : 0;
  const mCfg = MEETING_STATUS[meeting.status] || MEETING_STATUS["Uploaded"];
  const date = dateFromObjectId(meeting._id);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onClick()}
      className={`flex items-center gap-4 bg-[#111111] border border-[#262626] rounded-sm px-5 py-3.5
        hover:border-[#39FF88]/50 hover:bg-[#131313] cursor-pointer transition-all duration-200 group ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{ transition: "opacity 0.25s ease, transform 0.25s ease, border-color 0.15s, background 0.15s", transitionDelay: `${idx * 55}ms` }}
    >
      <span className="text-[9px] font-mono text-[#333333] w-5 shrink-0 tabular-nums">
        {String(idx + 1).padStart(2, "0")}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono font-semibold text-[#F5F5F5] truncate group-hover:text-[#39FF88] transition-colors">
          {meeting.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {date && (
            <span className="text-[9px] font-mono text-[#555555]">
              {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
          {meeting.duration && (
            <span className="text-[9px] font-mono text-[#555555]">· {fmtDur(meeting.duration)}</span>
          )}
        </div>
      </div>

      {meeting.participants?.length > 0 && (
        <AvatarStack names={meeting.participants} max={4} />
      )}

      {taskCount > 0 && (
        <span className="text-[9px] font-mono text-[#39FF88]/60 shrink-0 hidden sm:block">
          [{taskCount} task{taskCount !== 1 ? "s" : ""}]
        </span>
      )}

      <span
        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm shrink-0"
        style={{ color: mCfg.color, background: `${mCfg.color}15`, border: `1px solid ${mCfg.color}30` }}
      >
        {mCfg.label}
      </span>

      <span className="text-[#333333] group-hover:text-[#39FF88] transition-colors text-sm font-mono shrink-0">→</span>
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="h-[62px] bg-[#111111] border border-[#262626] rounded-sm animate-pulse" />
  );
}

// ─── Dashboard Home ───────────────────────────────────────────────────────────
export default function DashboardHome() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        meetingsApi.list(token),
        tasksApi.list(token),
      ]);
      setMeetings(Array.isArray(m) ? m : []);
      setTasks(Array.isArray(t) ? t : []);
    } catch {
      // silently show empty state — errors logged in api.js
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Derived stats
  const totalMeetings = meetings.length;
  const totalTasks    = tasks.length;
  const doneTasks     = tasks.filter(t => t.status === "Done").length;
  const highPri       = tasks.filter(t => t.priority === "High" && t.status !== "Done").length;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const STATS = [
    { label: "meetings",        value: totalMeetings,   trend: totalMeetings > 0 ? `+${totalMeetings}` : null },
    { label: "action items",    value: totalTasks,       trend: totalTasks > 0 ? `+${totalTasks}` : null },
    { label: "completed",       value: `${completionPct}%`, trend: completionPct > 0 ? `+${completionPct}%` : null },
    { label: "high priority",   value: highPri,          trend: highPri > 0 ? `-${highPri}` : null },
  ];

  const displayName = user?.name || user?.email?.split("@")[0] || "user";

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] font-mono text-[#555555] uppercase tracking-widest mb-1">
            // dashboard · home
          </p>
          <h1 className="text-2xl font-bold font-mono text-[#F5F5F5]">
            $ {getGreeting()},{" "}
            <span className="text-[#39FF88]">{displayName}</span>
          </h1>
          <p className="text-sm font-mono text-[#888888] mt-1">
            // {totalMeetings} meeting{totalMeetings !== 1 ? "s" : ""} processed
            {totalTasks > 0 ? ` · ${doneTasks}/${totalTasks} tasks done` : ""}
          </p>
        </div>
        <button
          id="home-new-meeting"
          onClick={() => navigate("/dashboard/meetings")}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#39FF88] text-black text-xs font-mono font-bold rounded-sm hover:opacity-90 transition-opacity shrink-0"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Meeting
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        {STATS.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 70} />
        ))}
      </div>

      {/* Recent meetings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-0.5">
              // recent activity
            </p>
            <h2 className="text-sm font-mono font-bold text-[#F5F5F5]">Recent Meetings</h2>
          </div>
          {meetings.length > 0 && (
            <button
              onClick={() => navigate("/dashboard/meetings")}
              className="text-[10px] font-mono text-[#888888] hover:text-[#39FF88] transition-colors border border-[#262626] hover:border-[#39FF88]/40 px-3 py-1.5 rounded-sm"
            >
              view all →
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#262626] rounded-sm">
            <p className="text-sm font-mono text-[#555555]">$ no meetings found</p>
            <span className="text-[#39FF88] font-mono text-sm animate-pulse mt-1">_</span>
            <p className="text-[10px] font-mono text-[#333333] mt-4 mb-4">
              // upload your first recording to get started
            </p>
            <button
              onClick={() => navigate("/dashboard/meetings")}
              className="px-5 py-2 bg-[#39FF88] text-black text-xs font-mono font-bold rounded-sm hover:opacity-90 transition-opacity"
            >
              $ new-meeting --init
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {meetings.slice(0, 10).map((m, i) => (
              <MeetingRow
                key={m._id}
                meeting={m}
                idx={i}
                onClick={() => navigate("/dashboard/meetings")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-5 border-t border-[#262626]">
        <p className="text-[9px] font-mono text-[#2A2A2A]">
          // minutes · groq + whisper · llama-3.3-70b · mongodb
          <span className="ml-4 text-[#39FF88]/30">// all systems nominal</span>
        </p>
      </div>
    </div>
  );
}
