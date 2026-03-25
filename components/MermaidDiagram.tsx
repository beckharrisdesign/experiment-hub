"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export default function MermaidDiagram({
  chart,
  className = "",
}: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          primaryColor: "#cff7d3", // background-mint
          primaryTextColor: "#194b31", // text-dark
          primaryBorderColor: "#194b31", // border-dark
          lineColor: "#14ae5c", // accent-primary
          secondaryColor: "#e8fef0",
          tertiaryColor: "#f7fff8", // background-light
          background: "#f7fff8",
          nodeBorder: "#194b31",
          clusterBkg: "#e8fef0",
          clusterBorder: "#194b31",
          titleColor: "#194b31",
          edgeLabelBackground: "#f7fff8",
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
    return () => {
      cancelled = true;
    };
  }, [chart]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
