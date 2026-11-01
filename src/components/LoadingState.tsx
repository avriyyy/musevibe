/**
 * Loading placeholders for the workspace.
 *
 * A single pulsing dot told the reader nothing about what was coming. These
 * skeletons mirror the layout that is about to appear (rail, document, canvas
 * frames) so the wait reads as the page assembling itself.
 */
function Block({
  width,
  height = 12,
  radius = 6,
  className = "",
}: {
  width: string;
  height?: number;
  radius?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`musevibe-shimmer block ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

function LoaderLabel({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2 text-[12px] font-medium text-[#9aa0ae]">
      <span
        aria-hidden
        className="musevibe-loader-ring size-3.5 rounded-full border-2 border-white/15 border-t-[#8ab4ff]"
      />
      {label}
    </span>
  );
}

/** Full workspace shell: top bar, project rail, document page. */
export function WorkspaceSkeleton({
  label = "Opening your project",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-dvh bg-[#0b0c10] text-[#f5f6f8]"
    >
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-3">
          <Block width="18px" height={18} radius={5} />
          <Block width="132px" height={11} />
        </div>
        <LoaderLabel label={label} />
      </div>
      <div className="flex min-h-[calc(100dvh-56px)]">
        <aside className="hidden w-[248px] shrink-0 border-r border-white/10 p-4 md:block">
          <Block width="96px" height={10} />
          <div className="mt-5 space-y-3">
            {["72%", "84%", "64%", "78%", "58%", "70%"].map((width, index) => (
              <div key={index} className="flex items-center gap-3">
                <Block width="20px" height={20} radius={6} />
                <Block width={width} height={10} />
              </div>
            ))}
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-6 py-8 md:px-10">
          <Block width="58%" height={26} radius={8} className="max-w-[420px]" />
          <div className="mt-4 flex gap-2">
            <Block width="74px" height={22} radius={999} />
            <Block width="96px" height={22} radius={999} />
          </div>
          <div className="mt-9 max-w-[640px] space-y-3">
            <Block width="34%" height={14} />
            <Block width="100%" height={11} />
            <Block width="96%" height={11} />
            <Block width="88%" height={11} />
            <div className="pt-4" />
            <Block width="28%" height={14} />
            <Block width="100%" height={11} />
            <Block width="92%" height={11} />
            <Block width="73%" height={11} />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Design view placeholder: the three style frames plus a page frame. */
export function CanvasSkeleton({
  label = "Opening the design canvas",
}: {
  label?: string;
}) {
  const frames = [
    { width: "232px", height: 148 },
    { width: "232px", height: 148 },
    { width: "232px", height: 148 },
    { width: "340px", height: 216 },
  ];
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid h-full place-items-center bg-[#0b0c10] px-6"
    >
      <div className="w-full max-w-[780px]">
        <div className="flex flex-wrap items-start gap-4">
          {frames.map((frame, index) => (
            <div
              key={index}
              className="flex-1 rounded-2xl border border-white/10 bg-white/[0.02] p-3"
              style={{ minWidth: frame.width, minHeight: frame.height }}
            >
              <Block width="52%" height={9} />
              <div className="mt-4 space-y-2.5">
                <Block width="100%" height={8} />
                <Block width="84%" height={8} />
                <Block width="66%" height={8} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <LoaderLabel label={label} />
        </div>
      </div>
    </div>
  );
}
