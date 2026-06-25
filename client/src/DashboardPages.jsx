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
  return (
    <div className="p-8 max-w-2xl">
      <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-1">// config · settings</p>
      <h1 className="text-2xl font-bold font-mono text-[#F5F5F5] mb-1">$ settings</h1>
      <p className="text-sm font-mono text-[#888888] mt-2 mb-8">// workspace configuration</p>

      {[
        { section: "account", items: ["Email address", "Display name", "Change password"] },
        { section: "integrations", items: ["Jira", "Linear", "Slack", "Notion"] },
        { section: "preferences", items: ["Default summary format", "Auto-export tasks", "Language"] },
      ].map(({ section, items }) => (
        <div key={section} className="mb-6">
          <p className="text-[9px] font-mono text-[#39FF88] uppercase tracking-widest mb-3">
            // {section}
          </p>
          <div className="flex flex-col gap-1.5">
            {items.map(item => (
              <div
                key={item}
                className="flex items-center justify-between bg-[#111111] border border-[#262626] rounded-sm px-4 py-3 hover:border-[#39FF88]/30 transition-colors cursor-pointer group"
              >
                <p className="text-xs font-mono text-[#888888] group-hover:text-[#F5F5F5] transition-colors">
                  {item}
                </p>
                <span className="text-[#333333] group-hover:text-[#39FF88] font-mono text-xs transition-colors">→</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
