"use client";

/**
 * Renders a mermaid diagram to inline SVG. The library loads lazily so the
 * rest of the workspace never pays for it on pages without diagrams. A
 * failed parse falls back to the raw source instead of breaking the page.
 */

import { useEffect, useId, useState } from "react";

/**
 * Models love inventing crow's-foot cardinalities mermaid rejects, most
 * often `oM`/`Mo` where the spec only allows `o{`/`}o`. Those lines fail
 * the whole render and the diagram degrades to a code dump, so repair the
 * relationship operator before handing the chart to the renderer. Only
 * relationship lines (containing `--`) are touched; labels after the
 * colon are left alone.
 */
function repairChart(chart: string): string {
  return chart
    .split("\n")
    .map((line) => {
      if (!line.includes("--")) return line;
      const cut = line.indexOf(":");
      const head = cut === -1 ? line : line.slice(0, cut);
      const tail = cut === -1 ? "" : line.slice(cut);
      const fixed = head.replace(/oM/g, "o{").replace(/Mo/g, "}o");
      return fixed + tail;
    })
    .join("\n");
}

export default function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const diagramId = `mmd-${rawId}`;

  useEffect(() => {
    let alive = true;
    // Clearing the previous render is part of loading the new chart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSvg(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailed(false);
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({          startOnLoad: false,
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
        const { svg: rendered } = await mermaid.render(diagramId, repairChart(chart));
        if (alive) setSvg(rendered);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [chart, diagramId]);

  if (failed) {
    return (
      <pre className="scroll-surface overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[12px] leading-relaxed text-[#dfe3ea]">
        <code>{chart}</code>
      </pre>
    );
  }

  if (!svg) {
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
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
