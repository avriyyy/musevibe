"use client";

/**
 * Renders a mermaid diagram to inline SVG. The library loads lazily so the
 * rest of the workspace never pays for it on pages without diagrams. A
 * failed parse falls back to the raw source instead of breaking the page.
 */

import { useEffect, useId, useState } from "react";
import { normalizeMermaidChart } from "@/lib/mermaid-quality";

export default function Mermaid({ chart }: { chart: string }) {
  const [render, setRender] = useState<{
    chart: string;
    svg: string | null;
    failed: boolean;
  }>({ chart: "", svg: null, failed: false });
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const diagramId = `mmd-${rawId}`;

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict",
          themeVariables: {
            background: "#17181d",
            primaryColor: "#23252d",
            primaryTextColor: "#f5f6f8",
            primaryBorderColor: "#3a3d47",
            lineColor: "#9aa0ae",
            secondaryColor: "#23252d",
            tertiaryColor: "#17181d",
            noteBkgColor: "#23252d",
            noteTextColor: "#c9cdd6",
          },
        });
        const { svg: rendered } = await mermaid.render(
          diagramId,
          normalizeMermaidChart(chart),
        );
        if (alive) setRender({ chart, svg: rendered, failed: false });
      } catch {
        if (alive) setRender({ chart, svg: null, failed: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [chart, diagramId]);

  if (render.chart === chart && render.failed) {
    return (
      <div role="alert" className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-[12px] leading-relaxed text-[#c9cdd6]">
          This diagram could not be rendered. Its source is still available below to review or edit.
        </p>
        <pre className="scroll-surface overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-[12px] leading-relaxed text-[#dfe3ea]">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  if (render.chart !== chart || !render.svg) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-white/10 bg-[#17181d] p-6"
      >
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-24 animate-pulse rounded bg-white/5" />
        <span className="sr-only">Rendering diagram</span>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="Diagram"
      className="overflow-x-auto rounded-xl border border-white/10 bg-[#17181d] p-4 [&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:bg-transparent"
      // The SVG string comes from the mermaid renderer, never from model
      // output directly, and links/scripts are disabled by strict mode.
      dangerouslySetInnerHTML={{ __html: render.svg }}
    />
  );
}
