"use client";

export default function TokyoShellPreview() {
  return (
    <div className="flex min-h-[720px] gap-6 rounded-[36px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,16,30,0.98),rgba(7,10,22,0.98))] p-6">
      <aside className="w-24 rounded-[30px] border border-[#7aa2f7]/10 bg-[linear-gradient(180deg,rgba(14,19,35,0.92),rgba(8,11,24,0.94))] p-3">
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-3">
            {["O", "T", "$", "M", "S", "G"].map((item, index) => (
              <div
                key={item}
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${
                  index === 0
                    ? "border-[#7aa2f7]/18 bg-[#7aa2f7]/12 text-[#7dcfff]"
                    : "border-white/8 bg-white/4 text-slate-400"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-slate-300">
            {"<"}
          </div>
        </div>
      </aside>

      <div className="flex-1 space-y-5">
        <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,22,38,0.92),rgba(9,12,24,0.96))] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#7aa2f7]/16 bg-[#7aa2f7]/10 text-[#7dcfff]">
              /
            </div>
            <div className="flex-1">
              <div className="rounded-[22px] border border-[#7aa2f7]/14 bg-[linear-gradient(180deg,rgba(18,24,41,0.98),rgba(8,11,24,0.99))] px-4 py-3 text-sm text-slate-400">
                Type a command or search...
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,20,36,0.98),rgba(7,10,22,0.99))] p-5">
          <div className="mb-4">
            <div className="hud-label">staging</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Shell direction preview
            </h2>
          </div>
          <div className="space-y-3">
            {["Gateway prompt", "Planner response", "Tool invocation"].map((row) => (
              <div
                key={row}
                className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,24,41,0.74),rgba(8,11,24,0.9))] px-4 py-4 text-slate-200"
              >
                {row}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
