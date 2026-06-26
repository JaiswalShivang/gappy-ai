import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// ─── Typing command line ───────────────────────────────────────────────────────
function TypingCommand() {
  const fullText = "$ summarize --meeting=standup --output=tasks";
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (idx.current < fullText.length) {
        setDisplayed(fullText.slice(0, idx.current + 1));
        idx.current++;
      } else {
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
          style={{ height: `${h}%`, background: "#39FF88", opacity: 0.7 + (i % 3) * 0.1 }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 rounded-sm border border-[#39FF88]/60 bg-[#0A0A0A]/80 flex items-center justify-center cursor-pointer hover:border-[#39FF88] hover:bg-[#39FF88]/10 transition-all duration-150">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2L12 7L3 12V2Z" fill="#39FF88" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Hero Terminal Mockup ─────────────────────────────────────────────────────
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
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#262626] bg-[#0D0D0D]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5C5C]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FFB800]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#39FF88]" />
        <span className="ml-3 text-[10px] font-mono text-[#555555] uppercase tracking-widest">meeting-summary.ai</span>
        <span className="ml-auto text-[9px] font-mono text-[#39FF88]">[live]</span>
      </div>

      <div className="p-5">
        <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-3">
          // audio-timeline · standup-2026-06-19
        </p>

        <div className="relative h-8 mb-5">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-[#262626]" />
          <div className="absolute top-1/2 left-0 h-px bg-[#39FF88]/40" style={{ width: "65%" }} />
          {timeline.map((dot, i) => (
            <div key={i} className="absolute top-1/2 -translate-y-1/2 group" style={{ left: dot.left }}>
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
          <div className="absolute top-0 bottom-0 w-px bg-[#39FF88]" style={{ left: "65%" }}>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-[#39FF88] rounded-sm" />
          </div>
        </div>

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
      className={`relative bg-[#111111] border border-[#262626] rounded-md p-6 transition-all duration-200 hover:border-[#39FF88]/50 overflow-hidden group ${className}`}
    >
      {kicker && (
        <p className="text-[9px] font-mono text-[#39FF88]/60 uppercase tracking-widest mb-2">{kicker}</p>
      )}
      <h3 className="text-sm font-mono font-bold text-[#F5F5F5] mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ─── How It Works Step ────────────────────────────────────────────────────────
function HowItWorksStep({ step, title, desc, code, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`flex flex-col gap-4 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Step number */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono font-bold text-[#39FF88] border border-[#39FF88]/40 px-2 py-0.5 rounded-sm bg-[#39FF88]/5">
          {String(step).padStart(2, "0")}
        </span>
        <div className="flex-1 h-px bg-[#262626]" />
      </div>

      <h3 className="text-lg font-mono font-bold text-[#F5F5F5]">{title}</h3>
      <p className="text-sm font-mono text-[#888888] leading-relaxed">{desc}</p>

      {/* Code block */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-sm p-4 font-mono text-[11px] space-y-1">
        {code.map((line, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-[#333333] select-none w-4 shrink-0 text-right">{i + 1}</span>
            <span dangerouslySetInnerHTML={{ __html: line }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────
function TestimonialCard({ quote, name, role, company, color, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`bg-[#111111] border border-[#262626] rounded-md p-6 hover:border-[#39FF88]/30 transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms`, transition: "opacity 0.4s ease, transform 0.4s ease, border-color 0.2s" }}
    >
      <p className="text-[9px] font-mono uppercase tracking-widest mb-4" style={{ color }}>// testimonial</p>
      <p className="text-sm font-mono text-[#F5F5F5] leading-relaxed mb-5">
        <span style={{ color }} className="select-none">&gt; </span>
        &quot;{quote}&quot;
      </p>
      <div className="flex items-center gap-3 pt-4 border-t border-[#1A1A1A]">
        <div
          className="w-8 h-8 rounded-sm flex items-center justify-center text-[10px] font-bold font-mono shrink-0"
          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
        >
          {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-[11px] font-mono font-bold text-[#F5F5F5]">{name}</p>
          <p className="text-[9px] font-mono text-[#555555]">// {role} · {company}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────
function PricingCard({ plan, price, desc, features, highlight = false, cta, onCta }) {
  return (
    <div
      className={`flex flex-col rounded-md p-6 border transition-all duration-200 hover:translate-y-[-2px] ${
        highlight
          ? "bg-[#39FF88]/5 border-[#39FF88]/50 shadow-[0_0_40px_#39FF8810]"
          : "bg-[#111111] border-[#262626] hover:border-[#39FF88]/30"
      }`}
    >
      {highlight && (
        <span className="text-[9px] font-mono font-bold text-black bg-[#39FF88] px-2 py-0.5 rounded-sm self-start mb-4">
          // most popular
        </span>
      )}
      <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-2">{plan}</p>
      <p className="text-4xl font-bold font-mono text-[#F5F5F5] mb-1">
        {price}
        {price !== "Free" && price !== "Custom" && (
          <span className="text-sm font-normal text-[#555555]">/mo</span>
        )}
      </p>
      <p className="text-[11px] font-mono text-[#888888] mb-6 leading-relaxed">{desc}</p>

      <ul className="flex flex-col gap-2.5 flex-1 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] font-mono text-[#888888]">
            <span className="text-[#39FF88] shrink-0 mt-px">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        className={`h-10 w-full rounded-sm text-xs font-mono font-bold transition-all duration-150 ${
          highlight
            ? "bg-[#39FF88] text-black hover:opacity-90"
            : "border border-[#262626] text-[#888888] hover:border-[#39FF88] hover:text-[#F5F5F5]"
        }`}
      >
        {cta}
      </button>
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

  const navLinks = [
    { label: "Features",     href: "#features"     },
    { label: "How it works", href: "#how-it-works"  },
    { label: "Pricing",      href: "#pricing"       },
  ];

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

  const HOW_IT_WORKS = [
    {
      step: 1,
      title: "Upload your recording",
      desc: "Drop in an audio file from Zoom, Meet, Teams — any format. Or paste a raw transcript directly.",
      code: [
        `<span class="text-[#555555]">// supports mp3, wav, m4a, webm, ogg</span>`,
        `<span class="text-[#39FF88]">POST</span> <span class="text-[#888888]">/api/meetings/upload</span>`,
        `<span class="text-[#555555]">Content-Type: multipart/form-data</span>`,
        `<span class="text-[#555555]">Authorization: Bearer</span> <span class="text-[#FFB800]">••••••••</span>`,
      ],
    },
    {
      step: 2,
      title: "AI extracts every action item",
      desc: "Groq Whisper transcribes segment-by-segment with real timestamps. LLaMA-3 then parses each task, its assignee, priority, and the exact moment it was spoken.",
      code: [
        `<span class="text-[#555555]">// extracted in &lt; 30 seconds</span>`,
        `<span class="text-[#39FF88]">{</span>`,
        `  <span class="text-[#FFB800]">"title"</span><span class="text-[#888888]">: "Set up auth module",</span>`,
        `  <span class="text-[#FFB800]">"assignee"</span><span class="text-[#888888]">: "Sarah Chen",</span>`,
        `  <span class="text-[#FFB800]">"priority"</span><span class="text-[#888888]">: "High",</span>`,
        `  <span class="text-[#FFB800]">"startTime"</span><span class="text-[#888888]">: 134 </span><span class="text-[#555555]">// 2m 14s</span>`,
        `<span class="text-[#39FF88]">}</span>`,
      ],
    },
    {
      step: 3,
      title: "Ship and search",
      desc: "Tasks appear in a Kanban board instantly. Click any task to play its audio proof clip. Search semantically across all past meetings using vector embeddings.",
      code: [
        `<span class="text-[#555555]">// semantic search across all tasks</span>`,
        `<span class="text-[#39FF88]">GET</span> <span class="text-[#888888]">/api/search?q=</span><span class="text-[#39FF88]">"API work assigned to Sarah"</span>`,
        `<span class="text-[#555555]">// → returns top 5 matching tasks</span>`,
        `<span class="text-[#555555]">// → ranked by vector similarity score</span>`,
      ],
    },
  ];

  const TESTIMONIALS = [
    {
      quote: "We used to spend 45 minutes after every standup writing up notes. Now we just upload the recording and everything is done.",
      name: "Sarah Chen",
      role: "VP Engineering",
      company: "Acme Corp",
      color: "#39FF88",
    },
    {
      quote: "The audio proof feature is brilliant. No more 'I never said that' debates. The clip plays right there.",
      name: "James Rivera",
      role: "Product Lead",
      company: "BuildFast",
      color: "#FFB800",
    },
    {
      quote: "Semantic search across all our past meetings is a game changer. I found a decision from 3 months ago in seconds.",
      name: "Priya Nair",
      role: "CTO",
      company: "LoopStack",
      color: "#60CFFF",
    },
  ];

  const PLANS = [
    {
      plan: "Starter",
      price: "Free",
      desc: "For individuals and small teams getting started.",
      features: [
        "5 meetings / month",
        "Audio upload + transcript paste",
        "AI task extraction",
        "Kanban task board",
        "7-day data retention",
      ],
      cta: "$ start --free",
      highlight: false,
    },
    {
      plan: "Pro",
      price: "$12",
      desc: "For growing teams that need more power and history.",
      features: [
        "Unlimited meetings",
        "Audio proof clips",
        "Semantic vector search",
        "People view & analytics",
        "Unlimited data retention",
        "Priority AI processing",
      ],
      cta: "$ upgrade --pro",
      highlight: true,
    },
    {
      plan: "Enterprise",
      price: "Custom",
      desc: "For orgs with SSO, compliance, and custom integrations.",
      features: [
        "Everything in Pro",
        "SSO / SAML",
        "Jira & Linear integration",
        "Custom AI models",
        "Dedicated support",
        "SLA + audit logs",
      ],
      cta: "$ contact --sales",
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] relative overflow-x-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid pointer-events-none z-0" />

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
          navSolid ? "bg-[#0A0A0A] border-[#262626]" : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="text-sm font-mono font-bold text-[#F5F5F5] tracking-tight shrink-0 hover:text-[#39FF88] transition-colors">
            [&nbsp;<span className="text-[#39FF88]">MINUTES</span>&nbsp;]
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs font-mono text-[#888888] hover:text-[#39FF88] transition-colors duration-150"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/sign-in"
              className="text-xs font-mono text-[#888888] hover:text-[#F5F5F5] transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              id="nav-get-started"
              to="/sign-up"
              className="px-4 py-1.5 text-xs font-mono font-bold text-[#39FF88] border border-[#39FF88] rounded-sm hover:bg-[#39FF88] hover:text-black transition-all duration-150"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-32 pb-24 max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-16 items-center">
          <div>
            <p className="text-sm font-mono text-[#39FF88] mb-5">
              // ai-powered meeting intelligence
            </p>
            <h1 className="text-5xl lg:text-7xl font-bold font-mono text-[#F5F5F5] leading-[1.05] tracking-tight">
              Meetings that<br />
              actually <span className="text-[#39FF88]">matter.</span>
            </h1>
            <TypingCommand />
            <p className="text-base font-mono text-[#888888] max-w-md mt-4 leading-relaxed">
              Drop in your recording. Get a structured brief, verified tasks, and audio-timestamped evidence — before the coffee gets cold.
            </p>

            <div className="flex items-center gap-4 mt-8">
              <button
                id="hero-get-started"
                onClick={() => navigate("/sign-up")}
                className="px-6 py-3 bg-[#39FF88] text-black text-sm font-mono font-bold rounded-sm hover:opacity-90 transition-opacity"
              >
                $ start --free
              </button>
              <a
                href="#how-it-works"
                className="px-6 py-3 text-sm font-mono font-bold text-[#888888] border border-[#262626] rounded-sm hover:border-[#39FF88] hover:text-[#F5F5F5] transition-all duration-150"
              >
                see how it works →
              </a>
            </div>

            <p className="mt-6 text-[10px] font-mono text-[#555555]">
              // no credit card required · free tier available
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <HeroTerminal />
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ───────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-[#1A1A1A] py-6 mb-0">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <p className="text-[9px] font-mono text-[#333333] uppercase tracking-widest shrink-0">// trusted by engineering teams at</p>
            {["Acme Corp", "BuildFast", "LoopStack", "NovaTech", "DevPulse"].map((name) => (
              <span key={name} className="text-xs font-mono text-[#3A3A3A] hover:text-[#555555] transition-colors cursor-default">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES ───────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 max-w-[1200px] mx-auto px-6 py-24">
        <p className="text-[10px] font-mono text-[#39FF88] uppercase tracking-widest mb-2">// core features</p>
        <h2 className="text-3xl font-bold font-mono text-[#F5F5F5] mb-10">Everything your team needs.</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ gridTemplateRows: "auto auto" }}>
          <FeatureCard className="md:col-span-2 md:row-span-2" kicker="// verifiable proof" title="Verifiable Audio Proof">
            <p className="text-xs font-mono text-[#555555] mb-5 max-w-sm leading-relaxed">
              Every task is anchored to its source timestamp. Click any action item and hear the exact moment it was spoken — no disputes, no ambiguity.
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

          <FeatureCard kicker="// semantic retrieval" title="Vector Search">
            <p className="text-[11px] font-mono text-[#555555] mb-4 leading-relaxed">
              Ask questions across all your meetings in natural language. Powered by local embeddings + MongoDB Atlas.
            </p>
            {mockSearchBar}
          </FeatureCard>

          <FeatureCard kicker="// automations" title="One-Click Exports">
            <p className="text-[11px] font-mono text-[#555555] mb-4 leading-relaxed">
              Push tasks to Jira, Linear, Notion, or Slack with a single command. No copy-paste ever.
            </p>
            {asciiFlow}
          </FeatureCard>
        </div>

        {/* Feature list row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { icon: "⚡", label: "Sub-30s processing" },
            { icon: "🔒", label: "JWT auth + bcrypt" },
            { icon: "📊", label: "Kanban task board" },
            { icon: "👥", label: "People analytics" },
          ].map(({ icon, label }) => (
            <div key={label} className="bg-[#111111] border border-[#1A1A1A] rounded-sm px-4 py-3 flex items-center gap-2.5 hover:border-[#262626] transition-colors">
              <span className="text-base">{icon}</span>
              <span className="text-[11px] font-mono text-[#888888]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 bg-[#0D0D0D] border-y border-[#1A1A1A] py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="text-[10px] font-mono text-[#39FF88] uppercase tracking-widest mb-2">// how it works</p>
          <h2 className="text-3xl font-bold font-mono text-[#F5F5F5] mb-14">Three steps. Zero manual work.</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {HOW_IT_WORKS.map((step, i) => (
              <HowItWorksStep key={step.step} {...step} delay={i * 120} />
            ))}
          </div>
        </div>
      </section>

      {/* ── STAT SECTION ─────────────────────────────────────────────────────── */}
      <section id="stats" className="relative z-10 max-w-[1200px] mx-auto px-6 py-24">
        <div className="border border-[#262626] bg-[#111111] rounded-md p-10 grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <div>
            <p className="text-7xl font-bold font-mono text-[#39FF88] leading-none">10h</p>
            <p className="text-[10px] font-mono text-[#555555] mt-2 uppercase tracking-widest">per team / week</p>
          </div>
          <div className="border-l border-[#262626] pl-8">
            <p className="text-[10px] font-mono text-[#39FF88] mb-2">// average hours saved</p>
            <p className="text-sm font-mono text-[#888888] leading-relaxed max-w-sm">
              Teams using Minutes recover a full workday every week by eliminating manual note-taking, follow-up emails, and status meetings.
            </p>
            <div className="flex flex-wrap gap-8 mt-6">
              {[
                { n: "97%",  label: "accuracy on task extraction" },
                { n: "30s",  label: "avg time to first summary" },
                { n: "384",  label: "vector dimensions per task" },
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

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 bg-[#0D0D0D] border-y border-[#1A1A1A] py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="text-[10px] font-mono text-[#39FF88] uppercase tracking-widest mb-2">// from the teams</p>
          <h2 className="text-3xl font-bold font-mono text-[#F5F5F5] mb-10">Teams love it.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={t.name} {...t} delay={i * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 max-w-[1200px] mx-auto px-6 py-24">
        <p className="text-[10px] font-mono text-[#39FF88] uppercase tracking-widest mb-2">// pricing</p>
        <h2 className="text-3xl font-bold font-mono text-[#F5F5F5] mb-2">Simple, transparent pricing.</h2>
        <p className="text-sm font-mono text-[#888888] mb-10">// start free. upgrade when you're ready.</p>

        {/* Free beta banner */}
        <div className="flex items-start gap-3 bg-[#39FF88]/5 border border-[#39FF88]/30 rounded-sm px-5 py-3.5 mb-8">
          <span className="w-2 h-2 rounded-sm bg-[#39FF88] animate-pulse shrink-0 mt-0.5" />
          <p className="text-xs font-mono text-[#888888] leading-relaxed">
            <span className="text-[#39FF88] font-bold">// beta · everything is currently free — </span>
            no credit card, no limits. pricing kicks in post-launch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.plan}
              {...plan}
              onCta={() => navigate(plan.price === "Custom" ? "/" : "/sign-up")}
            />
          ))}
        </div>
        <p className="text-[10px] font-mono text-[#333333] mt-6 text-center">
          // all plans include: JWT auth · MongoDB storage · Groq AI processing · REST API access
        </p>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 pb-24">
        <div className="border border-[#262626] rounded-md p-12 text-center relative overflow-hidden">
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
              onClick={() => navigate("/sign-up")}
              className="px-8 py-3 bg-[#39FF88] text-black text-sm font-mono font-bold rounded-sm hover:opacity-90 transition-opacity"
            >
              $ start --free
            </button>
            <a
              href="#how-it-works"
              className="px-8 py-3 text-sm font-mono font-bold text-[#888888] border border-[#262626] rounded-sm hover:border-[#39FF88] hover:text-[#F5F5F5] transition-all duration-150"
            >
              how it works →
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#262626]">
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-10 mb-10">
            {/* Brand */}
            <div>
              <span className="text-sm font-mono font-bold text-[#F5F5F5]">
                [&nbsp;<span className="text-[#39FF88]">MINUTES</span>&nbsp;]
              </span>
              <p className="text-[10px] font-mono text-[#333333] mt-1">// meeting-to-execution intelligence</p>
              <p className="text-[10px] font-mono text-[#2A2A2A] mt-4 leading-relaxed max-w-[220px]">
                Built with Groq Whisper · LLaMA-3 · MongoDB Atlas · React 19 · FastAPI
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest mb-3">// product</p>
              {["Features", "How it Works", "Pricing", "Changelog"].map((l) => (
                <a key={l} href="#" className="block text-[11px] font-mono text-[#555555] hover:text-[#888888] transition-colors mb-1.5">
                  {l}
                </a>
              ))}
            </div>

            {/* Company */}
            <div>
              <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest mb-3">// company</p>
              {["About", "Blog", "Careers", "Contact"].map((l) => (
                <a key={l} href="#" className="block text-[11px] font-mono text-[#555555] hover:text-[#888888] transition-colors mb-1.5">
                  {l}
                </a>
              ))}
            </div>

            {/* Legal */}
            <div>
              <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest mb-3">// legal</p>
              {["Privacy Policy", "Terms of Service", "Security", "Status"].map((l) => (
                <a key={l} href="#" className="block text-[11px] font-mono text-[#555555] hover:text-[#888888] transition-colors mb-1.5">
                  {l}
                </a>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-[#1A1A1A] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <p className="text-[10px] font-mono text-[#2A2A2A]">© 2026 Minutes. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-sm bg-[#39FF88] animate-pulse" />
              <span className="text-[9px] font-mono text-[#333333]">// all systems nominal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
