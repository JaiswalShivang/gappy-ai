import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";

// ─── API ──────────────────────────────────────────────────────────────────────
async function apiAuth(endpoint, body) {
  const res = await fetch(`/api/auth/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ─── Left decorative panel ─────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-col relative bg-[#0A0A0A] border-r border-[#262626] w-[480px] shrink-0 overflow-hidden">
      {/* Faint grid */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      {/* Slow scanline */}
      <div className="scanline-slow absolute inset-0 pointer-events-none" />

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 relative z-10">

        {/* Terminal testimonial card */}
        <div className="w-full max-w-sm bg-[#111111] border border-[#262626] rounded-md overflow-hidden">
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#262626] bg-[#0D0D0D]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5C5C]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFB800]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#39FF88]" />
            <span className="ml-3 text-[10px] font-mono text-[#555555] uppercase tracking-widest">
              testimonial.log
            </span>
          </div>

          <div className="p-6">
            <p className="text-[#888888] font-mono text-[9px] uppercase tracking-widest mb-3">
              // stdout · customer-feedback
            </p>
            <p className="text-[#F5F5F5] font-mono text-base leading-relaxed">
              <span className="text-[#39FF88] select-none">&gt; </span>
              &quot;This tool saved our engineering team 10 hours a week in miscommunications.&quot;
            </p>
            <p className="font-mono text-sm text-[#39FF88] mt-4">
              // Sarah Chen, VP Engineering
            </p>
            <p className="font-mono text-[10px] text-[#555555] mt-1">
              // Acme Corp · Series B
            </p>
            <div className="mt-4 flex items-center gap-1 font-mono text-[11px] text-[#555555]">
              <span>$</span>
              <span className="cursor-blink text-[#39FF88]">_</span>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="flex gap-8 mt-10">
          {[
            { n: "10h", label: "saved / week" },
            { n: "97%", label: "task accuracy" },
            { n: "40+", label: "integrations" },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <p className="text-2xl font-bold font-mono text-[#F5F5F5]">{s.n}</p>
              <p className="text-[9px] font-mono text-[#555555] mt-0.5 uppercase tracking-widest">
                // {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom-left logo */}
      <div className="absolute bottom-6 left-6 z-10">
        <span className="text-sm font-mono font-bold text-[#F5F5F5]">
          [&nbsp;<span className="text-[#39FF88]">GAPPY</span>&nbsp;AI]
        </span>
        <p className="text-[9px] font-mono text-[#555555] mt-0.5">// meeting-to-execution</p>
      </div>
    </div>
  );
}

// ─── Field component ───────────────────────────────────────────────────────────
function Field({ id, label, type = "text", value, onChange, placeholder, autoComplete }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[10px] font-mono text-[#888888] uppercase tracking-widest"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-10 px-3 bg-[#111111] border border-[#262626] rounded-sm text-xs font-mono text-[#F5F5F5] placeholder-[#333333] focus:outline-none focus:border-[#39FF88] transition-colors"
      />
    </div>
  );
}

// ─── Error notice ──────────────────────────────────────────────────────────────
function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="border border-[#FF5C5C]/30 bg-[#FF5C5C]/8 rounded-sm px-3 py-2.5">
      <p className="text-[11px] font-mono text-[#FF5C5C]">
        <span className="font-bold">✗ error:</span> {msg}
      </p>
    </div>
  );
}

// ─── Sign-In form ──────────────────────────────────────────────────────────────
function SignInForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("email and password are required"); return; }
    setLoading(true);
    try {
      const { token, user } = await apiAuth("login", { email: email.trim(), password });
      login(token, user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <ErrorBox msg={error} />
      <Field
        id="signin-email"
        label="// email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
      />
      <Field
        id="signin-password"
        label="// password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
      />
      <button
        id="signin-submit"
        type="submit"
        disabled={loading}
        className="h-10 bg-[#39FF88] text-black text-xs font-mono font-bold rounded-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border border-black/30 border-t-black rounded-full animate-spin" />
            authenticating...
          </>
        ) : "$ sign-in --exec"}
      </button>
    </form>
  );
}

// ─── Sign-Up form ──────────────────────────────────────────────────────────────
function SignUpForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("email and password are required"); return; }
    if (password.length < 6) { setError("password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("passwords do not match"); return; }
    setLoading(true);
    try {
      const { token, user } = await apiAuth("register", {
        email: email.trim(),
        password,
        name: name.trim(),
      });
      login(token, user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <ErrorBox msg={error} />
      <Field
        id="signup-name"
        label="// name"
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Sarah Chen"
        autoComplete="name"
      />
      <Field
        id="signup-email"
        label="// email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
      />
      <Field
        id="signup-password"
        label="// password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="min. 6 characters"
        autoComplete="new-password"
      />
      <Field
        id="signup-confirm"
        label="// confirm password"
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
      />
      <button
        id="signup-submit"
        type="submit"
        disabled={loading}
        className="h-10 bg-[#39FF88] text-black text-xs font-mono font-bold rounded-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border border-black/30 border-t-black rounded-full animate-spin" />
            creating account...
          </>
        ) : "$ create-account --exec"}
      </button>
    </form>
  );
}

// ─── Right panel ───────────────────────────────────────────────────────────────
function RightPanel({ mode }) {
  const isSignIn = mode === "sign-in";

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16 bg-[#0A0A0A] relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="text-sm font-mono font-bold text-[#F5F5F5] hover:text-[#39FF88] transition-colors">
            [&nbsp;<span className="text-[#39FF88]">GAPPY</span>&nbsp;AI]
          </Link>
        </div>

        {/* Heading */}
        <p className="text-[10px] font-mono text-[#555555] uppercase tracking-widest mb-2">
          // auth · {isSignIn ? "returning user" : "new account"}
        </p>
        <h1 className="text-2xl font-bold font-mono text-[#39FF88] mb-1">
          {isSignIn ? "$ sign-in" : "$ create-account"}
        </h1>
        <p className="text-xs font-mono text-[#888888] mb-8">
          {isSignIn
            ? "// enter credentials to continue"
            : "// spin up your workspace in seconds"}
        </p>

        {/* Form */}
        {isSignIn ? <SignInForm /> : <SignUpForm />}

        {/* Footer links */}
        <div className="mt-6 pt-5 border-t border-[#262626] flex flex-col gap-1.5">
          {isSignIn ? (
            <p className="text-[11px] font-mono text-[#555555]">
              // don&apos;t have an account?{" "}
              <Link to="/sign-up" className="text-[#39FF88] hover:underline">
                sign-up →
              </Link>
            </p>
          ) : (
            <p className="text-[11px] font-mono text-[#555555]">
              // already have an account?{" "}
              <Link to="/sign-in" className="text-[#39FF88] hover:underline">
                sign-in →
              </Link>
            </p>
          )}
          <p className="text-[10px] font-mono text-[#333333]">
            // or{" "}
            <Link to="/" className="hover:text-[#555555] transition-colors">
              return to home →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Page ─────────────────────────────────────────────────────────────────
export default function AuthPage({ mode = "sign-in" }) {
  const { isAuthed } = useAuth();
  const navigate = useNavigate();

  // Redirect already-logged-in users straight to app
  useEffect(() => {
    if (isAuthed) navigate("/dashboard", { replace: true });
  }, [isAuthed, navigate]);

  return (
    <div className="min-h-screen flex bg-[#0A0A0A]">
      <LeftPanel />
      <RightPanel mode={mode} />
    </div>
  );
}
