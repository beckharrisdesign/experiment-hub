"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export default function MermaidDiagram({ chart, className = "" }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          // Map to the site's design tokens as close as possible
          primaryColor: "#1e293b",       // background-secondary
          primaryTextColor: "#e2e8f0",   // text-primary
          primaryBorderColor: "#334155", // border
          lineColor: "#64748b",          // text-secondary
          secondaryColor: "#0f172a",     // background-primary
          tertiaryColor: "#1e293b",
          background: "#0f172a",
          nodeBorder: "#334155",
          clusterBkg: "#1e293b",
          titleColor: "#e2e8f0",
          edgeLabelBackground: "#1e293b",
          activeTaskBkgColor: "#6366f1", // accent-primary
          activeTaskBorderColor: "#6366f1",
          fontFamily: "inherit",
          fontSize: "14px",
        },
      });

      const id = idRef.current;
      try {
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(rendered);
      } catch {
        // ignore render errors
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
