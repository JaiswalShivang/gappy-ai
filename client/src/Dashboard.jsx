import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { searchApi } from "./lib/api";
import { fmtTime, assigneeColor } from "./lib/format";
import { PRIORITY, TASK_STATUS } from "./lib/constants";
import LogoMark from "./LogoMark";

// ─── Icons (inline SVG, no external dep needed) ───────────────────────────────
const Icons = {
  Home: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Meetings: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
      <rect x="3" y="4" width="18" height="18" rx="0"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Live: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="0"/>
    </svg>
  ),
  Settings: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  Bell: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  Search: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Plus: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
};

// ─── Nav items config ──────────────────────────────────────────────────────────
const NAV = [
  { label: "Home",        to: "/dashboard",          Icon: Icons.Home     },
  { label: "My Meetings", to: "/dashboard/meetings",  Icon: Icons.Meetings },
  { label: "Live Stream", to: "/dashboard/live",      Icon: Icons.Live     },
  { label: "Settings",    to: "/dashboard/settings",  Icon: Icons.Settings },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-[#0A0A0A] border-r border-[#262626] flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#262626] shrink-0">
        <LogoMark size={22} withWordmark />
        <p className="text-[9px] font-mono text-[#333333] mt-2">// meeting-to-execution</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <p className="text-[9px] font-mono text-[#333333] uppercase tracking-widest px-6 mb-2">
          // navigation
        </p>
        {NAV.map(({ label, to, Icon }) => {
          // Exact match for home, prefix match for others
          const isActive = to === "/dashboard"
            ? location.pathname === "/dashboard"
            : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/dashboard"}
              className={`relative flex items-center gap-3 px-6 py-2.5 text-xs font-mono transition-all duration-150 group
                ${isActive
                  ? "text-[#39FF88] bg-[#111111] border-l-2 border-[#39FF88]"
                  : "text-[#888888] hover:text-[#F5F5F5] hover:bg-[#111111] border-l-2 border-transparent"
                }`}
            >
              {/* icon container */}
              <span
                className={`w-6 h-6 flex items-center justify-center rounded-sm shrink-0 transition-colors
                  ${isActive ? "bg-[#39FF88]/10 text-[#39FF88]" : "text-[#555555] group-hover:text-[#888888]"}`}
              >
                <Icon />
              </span>
              <span className="tracking-wide">{label}</span>
              {isActive && (
                <span className="ml-auto text-[8px] font-mono text-[#39FF88]/60">[active]</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom status + user */}
      <div className="border-t border-[#262626] p-4 space-y-3 shrink-0">
        {/* User row */}
        {user && (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-sm flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: "#39FF8820", color: "#39FF88", border: "1px solid #39FF8840" }}
            >
              {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono font-semibold text-[#F5F5F5] truncate">
                {user.name || user.email}
              </p>
              <p className="text-[9px] font-mono text-[#555555] truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#555555] hover:text-[#FF5C5C] transition-colors p-1"
              title="Sign out"
            >
              <Icons.LogOut />
            </button>
          </div>
        )}
        {/* Status line */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-sm bg-[#39FF88] animate-pulse shrink-0" />
          <span className="text-[9px] font-mono text-[#555555]">// status: connected</span>
        </div>
      </div>
    </aside>
  );
}

// ─── Semantic Search Dropdown ─────────────────────────────────────────────────
function SearchDropdown({ results, loading, error, query, onClose }) {
  const priorityCfg = (p) => PRIORITY[p] || PRIORITY.Low;
  const statusCfg  = (s) => TASK_STATUS[s] || TASK_STATUS["To Do"];

  return (
    <div
      className="absolute left-0 right-0 top-[calc(100%+6px)] bg-[#0D0D0D] border border-[#2A2A2A] rounded-sm shadow-2xl z-[200] overflow-hidden"
      style={{ maxHeight: 440 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1E1E1E]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-sm bg-[#39FF88] animate-pulse" />
          <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest">
            // semantic search
          </p>
          {!loading && !error && (
            <span className="text-[9px] font-mono text-[#333333] ml-1">
              — {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-[#555555] hover:text-[#FF5C5C] text-[10px] font-mono">✕</button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="w-1.5 h-1.5 rounded-sm bg-[#39FF88] animate-ping" />
            <p className="text-[10px] font-mono text-[#555555]">// searching task vectors...</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="px-4 py-4">
            {error.includes("index") || error.includes("vectorSearch") ? (
              <>
                <p className="text-[10px] font-mono text-[#FF5C5C] mb-2">// vector search index not configured</p>
                <p className="text-[9px] font-mono text-[#555555] leading-relaxed">
                  Create an Atlas Search index named <span className="text-[#FFB800]">'task_embedding_index'</span> on the
                  <span className="text-[#39FF88]"> tasks</span> collection with field{" "}
                  <span className="text-[#39FF88]">embedding</span> (384 dims, cosine).
                </p>
              </>
            ) : (
              <p className="text-[10px] font-mono text-[#FF5C5C]">// error: {error}</p>
            )}
          </div>
        )}

        {/* No results */}
        {!loading && !error && results.length === 0 && (
          <div className="px-4 py-5 text-center">
            <p className="text-[10px] font-mono text-[#555555]">// no matching tasks found</p>
            <p className="text-[9px] font-mono text-[#333333] mt-1">// try different phrasing or keywords</p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && results.map((task, i) => {
          const score = task.searchScore ?? 0;
          const pCfg  = priorityCfg(task.priority);
          const sCfg  = statusCfg(task.status);
          const aColor = assigneeColor(task.assignee);
          return (
            <div
              key={task._id}
              className="flex items-start gap-3 px-4 py-3 border-b border-[#1A1A1A] hover:bg-[#111111] transition-colors cursor-default group"
            >
              {/* Rank + score bar */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <span className="text-[8px] font-mono text-[#333333] tabular-nums w-4 text-center">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="w-0.5 h-10 bg-[#1A1A1A] rounded-sm overflow-hidden">
                  <div
                    className="w-full bg-[#39FF88] rounded-sm transition-all"
                    style={{ height: `${Math.round(score * 100)}%` }}
                  />
                </div>
                <span className="text-[7px] font-mono text-[#39FF88]/50 tabular-nums">
                  {Math.round(score * 100)}%
                </span>
              </div>

              {/* Task content */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono font-semibold text-[#F5F5F5] truncate group-hover:text-[#39FF88] transition-colors">
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-[9px] font-mono text-[#555555] mt-0.5 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                )}
                {task.sourceQuote && (
                  <p className="text-[9px] font-mono text-[#444444] italic mt-1 truncate">
                    &ldquo;{task.sourceQuote}&rdquo;
                  </p>
                )}
                {/* Timestamps */}
                {(task.startTime != null && task.endTime != null) && (
                  <p className="text-[8px] font-mono text-[#333333] mt-1">
                    [{fmtTime(task.startTime)} – {fmtTime(task.endTime)}]
                  </p>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className="text-[8px] font-mono font-bold px-1 py-0.5 rounded-sm"
                  style={{ color: pCfg.color, background: pCfg.bg, border: `1px solid ${pCfg.border}` }}
                >
                  [{task.priority?.toLowerCase() || "low"}]
                </span>
                <span
                  className="text-[8px] font-mono font-bold px-1 py-0.5 rounded-sm"
                  style={{ color: sCfg.color, background: `${sCfg.color}15`, border: `1px solid ${sCfg.color}30` }}
                >
                  {sCfg.label}
                </span>
                {task.assignee && task.assignee !== "Unassigned" && (
                  <span className="text-[8px] font-mono" style={{ color: aColor }}>
                    @{task.assignee.split(" ")[0]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#1A1A1A]">
        <p className="text-[8px] font-mono text-[#2A2A2A]">
          // powered by all-MiniLM-L6-v2 · mongodb atlas $vectorSearch
        </p>
      </div>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ onNewMeeting }) {
  const { token } = useAuth();
  const [query, setQuery]         = useState("");
  const [focused, setFocused]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [results, setResults]     = useState([]);
  const [error, setError]         = useState("");
  const [showDrop, setShowDrop]   = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const wrapRef   = useRef(null);
  const timerRef  = useRef(null);

  // Debounced semantic search
  useEffect(() => {
    clearTimeout(timerRef.current);
    const q = query.trim();
    if (!q) { setResults([]); setError(""); setShowDrop(false); return; }
    setShowDrop(true);
    setLoading(true);
    setError("");
    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchApi.query(token, q, 5);
        setResults(data.results || []);
        setError("");
      } catch (err) {
        setError(err.message || "search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [query, token]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="fixed top-0 left-64 right-0 h-14 bg-[#0A0A0A] border-b border-[#262626] z-30 flex items-center px-6 gap-4">
      {/* Semantic search bar */}
      <div ref={wrapRef} className="relative flex-1 max-w-lg">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888] pointer-events-none">
          <Icons.Search />
        </span>
        <input
          id="semantic-search-input"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (query.trim()) setShowDrop(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === "Escape" && (setShowDrop(false), setQuery(""))}
          placeholder="$ semantic-search --tasks 'assign API work to Sarah'..."
          className={`w-full h-8 pl-8 pr-3 bg-[#141414] border rounded-sm text-xs font-mono text-[#F5F5F5] placeholder-[#555555] outline-none transition-colors
            ${focused ? "border-[#39FF88]" : "border-[#2E2E2E]"}`}
        />
        {focused && !query && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#39FF88] text-xs font-mono leading-none animate-pulse">_</span>
        )}
        {loading && query && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-sm bg-[#39FF88] animate-ping" />
        )}

        {/* Results dropdown */}
        {showDrop && query.trim() && (
          <SearchDropdown
            results={results}
            loading={loading}
            error={error}
            query={query.trim()}
            onClose={() => { setShowDrop(false); setQuery(""); }}
          />
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notification button */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center bg-[#111111] border border-[#262626] rounded-sm text-[#555555] hover:text-[#F5F5F5] hover:border-[#39FF88]/50 transition-all relative"
          >
            <Icons.Bell />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#39FF88] rounded-sm" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-10 w-72 bg-[#111111] border border-[#262626] rounded-sm shadow-xl z-50">
              <div className="px-4 py-2.5 border-b border-[#262626] flex items-center justify-between">
                <p className="text-[10px] font-mono text-[#888888] uppercase tracking-widest">// notifications</p>
                <button onClick={() => setNotifOpen(false)} className="text-[#555555] hover:text-[#F5F5F5] text-[10px] font-mono">✕</button>
              </div>
              {[
                { msg: "Standup summary ready", time: "2m ago", color: "#39FF88" },
                { msg: "3 tasks assigned to you", time: "1h ago", color: "#FFB800" },
                { msg: "Q2 Planning recorded", time: "3h ago", color: "#888888" },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-[#262626] hover:bg-[#0A0A0A] cursor-pointer">
                  <span className="w-1.5 h-1.5 rounded-sm mt-1.5 shrink-0" style={{ background: n.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-[#F5F5F5]">{n.msg}</p>
                    <p className="text-[9px] font-mono text-[#555555] mt-0.5">// {n.time}</p>
                  </div>
                </div>
              ))}
              <div className="px-4 py-2">
                <p className="text-[9px] font-mono text-[#555555] text-center">// end of notifications</p>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[#262626]" />

        {/* New meeting CTA */}
        <button
          id="topbar-new-meeting"
          onClick={onNewMeeting}
          className="flex items-center gap-1.5 px-3 h-8 bg-[#39FF88] text-black text-[10px] font-mono font-bold rounded-sm hover:opacity-90 transition-opacity"
        >
          <Icons.Plus />
          New Meeting
        </button>
      </div>
    </header>
  );
}

// ─── Dashboard shell ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      <div className="fixed inset-0 bg-grid pointer-events-none z-0 opacity-50" />
      <Sidebar />
      <Topbar onNewMeeting={() => navigate("/dashboard/meetings")} />
      {/* Page content */}
      <main className="ml-64 pt-14 min-h-screen relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
