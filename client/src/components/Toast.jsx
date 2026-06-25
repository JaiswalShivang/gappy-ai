/**
 * components/Toast.jsx — Global toast notification
 *
 * Usage: <Toast msg="saved!" type="success" />
 *        <Toast msg="failed" type="error" />
 *
 * Renders nothing when msg is null/undefined.
 */
export default function Toast({ msg, type = "success" }) {
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 font-mono text-xs rounded-sm border animate-fade-in-up shadow-lg
        ${isErr
          ? "bg-[#FF5C5C]/10 border-[#FF5C5C]/30 text-[#FF5C5C]"
          : "bg-[#39FF88]/10 border-[#39FF88]/30 text-[#39FF88]"
        }`}
    >
      <span className="shrink-0 font-bold">{isErr ? "✗" : "✓"}</span>
      <span className="max-w-[320px] truncate">{msg}</span>
    </div>
  );
}
