import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// ─── Typing command line ───────────────────────────────────────────────────────
function TypingCommand() {
  const fullText = "$ summarize --meeting=standup --output=tasks";
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (idx.current < fullText.length) {
        setDisplayed(fullText.slice(0, idx.current + 1));
        idx.current++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, 45);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-sm font-mono text-[#39FF88] mt-6 mb-1">
      {displayed}
      <span className="cursor-blink ml-0.5">_</span>
    </p>
  );
}

// ─── Waveform SVG ─────────────────────────────────────────────────────────────
function Waveform() {
  const bars = [14, 28, 42, 36, 56, 48, 64, 52, 40, 68, 44, 32, 56, 48, 36, 60, 44, 28, 52, 40, 64, 36, 48, 56, 32, 44, 60, 40, 52, 36];
  return (
    <div className="relative flex items-end gap-[3px] h-16">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm"
          style={{
            height: `${h}%`,
            background: "#39FF88",
            opacity: 0.7 + (i % 3) * 0.1,
          }}
        />
      ))}
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-sm border border-[#39FF88]/60 bg-[#0A0A0A]/80 flex items-center justify-center cursor-pointer hover:border-[#39FF88] hover:bg-[#39FF88]/10 transition-all duration-150"
          style={{ backdropFilter: "none" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2L12 7L3 12V2Z" fill="#39FF88" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Terminal Mockup (Hero right panel) ──────────────────────────────────────
function HeroTerminal() {
  const timeline = [
    { color: "#39FF88", left: "8%",  label: "Alice" },
    { color: "#FFB800", left: "32%", label: "Bob" },
    { color: "#FF5C5C", left: "58%", label: "Sarah" },
    { color: "#60CFFF", left: "80%", label: "Dev" },
  ];
  const logs = [
    { time: "12:04", msg: "Task assigned", arrow: "→", who: "Sarah Chen", color: "#39FF88" },
    { time: "18:32", msg: "Decision logged", arrow: "→", who: "API migration", color: "#FFB800" },
    { time: "24:11", msg: "Blocker flagged", arrow: "→", who: "auth module", color: "#FF5C5C" },
  ];

  return (
    <div className="float-terminal bg-[#111111] border border-[#262626] rounded-md overflow-hidden w-full max-w-[520px]">
      {/* Chrome bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#262626] bg-[#0D0D0D]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5C5C]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FFB800]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#39FF88]" />
        <span className="ml-3 text-[10px] font-mono text-[#555555] uppercase tracking-widest">
          meeting-summary.ai
        </span>
        <span className="ml-auto text-[9px] font-mono text-[#39FF88]">[live]</span>
      </div>

      <div className="p-5">
        {/* Section label */}
        <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-3">
          // audio-timeline · standup-2026-06-19
        </p>

        {/* Audio timeline line */}
        <div className="relative h-8 mb-5">
          {/* Base track */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-[#262626]" />
          {/* Progress fill */}
          <div className="absolute top-1/2 left-0 h-px bg-[#39FF88]/40" style={{ width: "65%" }} />
          {/* Speaker dots */}
          {timeline.map((dot, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 group"
              style={{ left: dot.left }}
            >
              <div
                className="w-3 h-3 rounded-sm border-2 cursor-pointer transition-transform duration-150 hover:scale-125"
                style={{ borderColor: dot.color, background: `${dot.color}30` }}
              />
              <span
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: dot.color }}
              >
                {dot.label}
              </span>
            </div>
          ))}
          {/* Playhead */}
          <div className="absolute top-0 bottom-0 w-px bg-[#39FF88]" style={{ left: "65%" }}>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-[#39FF88] rounded-sm" />
          </div>
        </div>

        {/* Log output */}
        <div className="space-y-1.5 border-t border-[#262626] pt-4">
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-[#333333] shrink-0">[{log.time}]</span>
              <span className="text-[#888888]">{log.msg}</span>
              <span className="text-[#555555]">{log.arrow}</span>
              <span style={{ color: log.color }} className="font-bold">{log.who}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-[11px] font-mono mt-1">
            <span className="text-[#555555]">$</span>
            <span className="text-[#39FF88]/60">generating action items</span>
            <span className="cursor-blink">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bento Feature Cards ──────────────────────────────────────────────────────
function FeatureCard({ className = "", children, title, kicker }) {
  return (
    <div
      className={`relative bg-[#111111] border border-[#262626] rounded-md p-6 transition-all duration-200 hover:border-[#39FF88]/50 corner-brackets-full group overflow-visible ${className}`}
      style={{ position: "relative" }}
    >
      {/* 4-corner bracket decoration spans */}
      <span className="bracket-bl" />
      <span className="bracket-br" />

      {kicker && (
        <p className="text-[9px] font-mono text-[#39FF88]/60 uppercase tracking-widest mb-2">{kicker}</p>
      )}
      <h3 className="text-sm font-mono font-bold text-[#F5F5F5] mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = ["Product", "Docs", "Changelog", "Pricing"];

  const mockSearchBar = (
    <div className="border border-[#262626] rounded-sm px-3 py-2.5 bg-[#0A0A0A] font-mono text-xs flex items-center gap-2">
      <span className="text-[#555555]">$</span>
      <span className="text-[#888888]">search --query=</span>
      <span className="text-[#39FF88]">"action items Q2"</span>
      <span className="cursor-blink ml-1">_</span>
    </div>
  );

  const asciiFlow = (
    <div className="font-mono text-[10px] leading-relaxed text-[#555555] space-y-1">
      <div><span className="text-[#39FF88]">meeting.mp3</span></div>
      <div>    │</div>
      <div>    ▼</div>
      <div><span className="text-[#888888]">transcribe()</span></div>
      <div>    │</div>
      <div>    ▼</div>
      <div><span className="text-[#888888]">extract_tasks()</span></div>
      <div>    │</div>
      <div>    ▼</div>
      <div><span className="text-[#39FF88]">jira / linear / slack</span></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] relative overflow-x-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid pointer-events-none z-0" />

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 border-b border-[#262626] transition-colors duration-150 ${
          navSolid ? "bg-[#0A0A0A]" : "bg-[#0A0A0A]"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center gap-8">
          {/* Logo */}
          <span className="text-sm font-mono font-bold text-[#F5F5F5] tracking-tight shrink-0">
            [&nbsp;<span className="text-[#39FF88]">MEETLY</span>&nbsp;]
          </span>

          {/* Nav links — center-left */}
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs font-mono uppercase tracking-widest text-[#888888] hover:text-[#39FF88] transition-colors duration-150"
              >
                {link}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-4">
            <Link
              to="/sign-in"
              className="text-xs font-mono text-[#888888] hover:text-[#F5F5F5] transition-colors"
            >
              Sign In
            </Link>
            <Link
              id="nav-get-started"
              to="/sign-up"
              className="px-4 py-1.5 text-xs font-mono font-bold text-[#39FF88] border border-[#39FF88] rounded-sm hover:bg-[#39FF88] hover:text-black transition-all duration-150"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-32 pb-24 max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-16 items-center">
          {/* Left column */}
          <div>
            {/* Terminal comment kicker */}
            <p className="text-sm font-mono text-[#39FF88] mb-5">
              // ai-powered meeting intelligence
            </p>

            {/* Headline */}
            <h1 className="text-5xl lg:text-7xl font-bold font-mono text-[#F5F5F5] leading-[1.05] tracking-tight">
              Meetings that<br />
              actually <span className="text-[#39FF88]">matter.</span>
            </h1>

            {/* Typing command */}
            <TypingCommand />

            {/* Subheadline */}
            <p className="text-base font-mono text-[#888888] max-w-md mt-4 leading-relaxed">
              Drop in your recording. Get a structured brief, verified tasks, and Jira tickets — before the coffee gets cold.
            </p>

            {/* CTAs — left aligned */}
            <div className="flex items-center gap-4 mt-8">
              <button
                id="hero-get-started"
                onClick={() => navigate("/app")}
                className="px-6 py-3 bg-[#39FF88] text-black text-sm font-mono font-bold rounded-sm hover:opacity-90 transition-opacity"
              >
                $ start --free
              </button>
              <button
                id="hero-view-demo"
                className="px-6 py-3 text-sm font-mono font-bold text-[#888888] border border-[#262626] rounded-sm hover:border-[#39FF88] hover:text-[#F5F5F5] transition-all duration-150"
              >
                view demo →
              </button>
            </div>

            {/* Social proof line */}
            <p className="mt-6 text-[10px] font-mono text-[#555555]">
              // used by engineering teams at 40+ startups
            </p>
          </div>

          {/* Right column — terminal mockup */}
          <div className="flex justify-center lg:justify-end">
            <HeroTerminal />
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES ──────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 pb-24">
        {/* Section label */}
        <p className="text-sm font-mono text-[#39FF88] mb-6">// core features</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ gridTemplateRows: "auto auto" }}>
          {/* Large card — col-span-2, row-span-2 */}
          <FeatureCard
            className="md:col-span-2 md:row-span-2"
            kicker="// verifiable proof"
            title="Verifiable Audio Proof"
          >
            <p className="text-xs font-mono text-[#555555] mb-5 max-w-sm leading-relaxed">
              Every task is anchored to its source timestamp. Click any action item and hear the exact moment it was spoken — no disputes.
            </p>
            <Waveform />
            <div className="mt-4 space-y-1.5">
              {[
                { t: "02:14", txt: "Task created → \"Set up auth module\" · Bob", c: "#39FF88" },
                { t: "07:38", txt: "Owner confirmed → Sarah Chen · High priority", c: "#FFB800" },
              ].map((l, i) => (
                <div key={i} className="flex gap-3 text-[10px] font-mono">
                  <span className="text-[#333333] shrink-0">[{l.t}]</span>
                  <span style={{ color: l.c }}>{l.txt}</span>
                </div>
              ))}
            </div>
          </FeatureCard>

          {/* Small card 1 */}
          <FeatureCard kicker="// semantic retrieval" title="Vector Search">
            <p className="text-[11px] font-mono text-[#555555] mb-4 leading-relaxed">
              Ask questions across all your meetings in natural language. Instant, indexed results.
            </p>
            {mockSearchBar}
          </FeatureCard>

          {/* Small card 2 */}
          <FeatureCard kicker="// automations" title="One-Click Exports">
            <p className="text-[11px] font-mono text-[#555555] mb-4 leading-relaxed">
              Push tasks to Jira, Linear, Notion, or Slack with a single command. No copy-paste.
            </p>
            {asciiFlow}
          </FeatureCard>
        </div>
      </section>

      {/* ── STAT SECTION ────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 pb-28">
        <div className="border border-[#262626] bg-[#111111] rounded-md p-10 grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <div>
            <p className="text-7xl font-bold font-mono text-[#39FF88] leading-none">10h</p>
            <p className="text-[10px] font-mono text-[#555555] mt-2 uppercase tracking-widest">per team / week</p>
          </div>
          <div className="border-l border-[#262626] pl-8">
            <p className="text-[10px] font-mono text-[#39FF88] mb-2">// average hours saved</p>
            <p className="text-sm font-mono text-[#888888] leading-relaxed max-w-sm">
              Teams using Meetly recover a full workday every week by eliminating manual note-taking, follow-up emails, and status meetings.
            </p>
            <div className="flex gap-8 mt-6">
              {[
                { n: "97%", label: "accuracy on task extraction" },
                { n: "3min", label: "to first actionable summary" },
                { n: "40+", label: "integrations available" },
              ].map((s) => (
                <div key={s.n}>
                  <p className="text-2xl font-bold font-mono text-[#F5F5F5]">{s.n}</p>
                  <p className="text-[9px] font-mono text-[#555555] mt-0.5">// {s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 pb-28">
        <div className="border border-[#262626] rounded-md p-12 text-center relative overflow-hidden">
          {/* faint grid overlay inside banner */}
          <div className="absolute inset-0 bg-grid opacity-[0.02] pointer-events-none" />
          <p className="text-[10px] font-mono text-[#39FF88] mb-4">// ready to ship?</p>
          <h2 className="text-4xl font-bold font-mono text-[#F5F5F5] mb-4">
            Stop writing notes.<br />Start shipping.
          </h2>
          <p className="text-sm font-mono text-[#555555] mb-8 max-w-md mx-auto">
            Drop your first recording in under 60 seconds. No credit card. No onboarding call.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              id="cta-get-started"
              onClick={() => navigate("/app")}
              className="px-8 py-3 bg-[#39FF88] text-black text-sm font-mono font-bold rounded-sm hover:opacity-90 transition-opacity"
            >
              $ start --free
            </button>
            <button
              id="cta-read-docs"
              className="px-8 py-3 text-sm font-mono font-bold text-[#888888] border border-[#262626] rounded-sm hover:border-[#39FF88] hover:text-[#F5F5F5] transition-all duration-150"
            >
              read the docs →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#262626] max-w-[1200px] mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="text-sm font-mono font-bold text-[#F5F5F5]">
              [&nbsp;<span className="text-[#39FF88]">MEETLY</span>&nbsp;]
            </span>
            <p className="text-[10px] font-mono text-[#333333] mt-1">
              // meeting-to-execution intelligence
            </p>
          </div>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "GitHub", "Status", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-[10px] font-mono text-[#555555] hover:text-[#888888] transition-colors uppercase tracking-widest"
              >
                {link}
              </a>
            ))}
          </div>
          <p className="text-[10px] font-mono text-[#333333]">
            © 2026 Meetly. Built with Groq + Whisper.
          </p>
        </div>
      </footer>
    </div>
  );
}
