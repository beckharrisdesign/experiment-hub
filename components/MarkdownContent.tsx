"use client";

interface MarkdownContentProps {
  content: string;
  maxLines?: number;
  className?: string;
  variant?: "dark" | "light";
}

function renderMarkdownLine(
  line: string,
  idx: number,
  t: { heading: string; body: string; bold: string; muted: string },
) {
  if (line.startsWith("# ")) {
    return (
      <h1 key={idx} className={`text-lg font-semibold mt-4 mb-2 ${t.heading}`}>
        {line.replace("# ", "")}
      </h1>
    );
  }
  if (line.startsWith("## ")) {
    return (
      <h2
        key={idx}
        className={`text-base font-semibold mt-3 mb-2 ${t.heading}`}
      >
        {line.replace("## ", "")}
      </h2>
    );
  }
  if (line.startsWith("### ")) {
    return (
      <h3 key={idx} className={`text-sm font-semibold mt-2 mb-1 ${t.heading}`}>
        {line.replace("### ", "")}
      </h3>
    );
  }

  if (line.trim().startsWith("- ")) {
    const bulletContent = line.replace("- ", "");
    const parts = bulletContent.split(/(\*\*[^*]+\*\*)/g);
    return (
      <div key={idx} className={`ml-4 my-1 ${t.body}`}>
        •{" "}
        {parts.map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i} className={t.bold}>
              {part.replace(/\*\*/g, "")}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </div>
    );
  }

  if (line.trim()) {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={idx} className={`my-1 ${t.body}`}>
        {parts.map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i} className={t.bold}>
              {part.replace(/\*\*/g, "")}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    );
  }

  return <br key={idx} />;
}

export default function MarkdownContent({
  content,
  maxLines,
  className = "",
  variant = "dark",
}: MarkdownContentProps) {
  if (!content || content.trim().length === 0) return null;

  const t =
    variant === "light"
      ? {
          heading: "text-text-dark",
          body: "text-text-dark-secondary",
          bold: "text-text-dark",
          muted: "text-text-dark-secondary",
        }
      : {
          heading: "text-text-primary",
          body: "text-text-secondary",
          bold: "text-text-primary",
          muted: "text-text-muted",
        };

  const lines = content.split("\n");
  const displayLines = maxLines ? lines.slice(0, maxLines) : lines;
  const hasMore = maxLines && lines.length > maxLines;

  return (
    <div
      className={`prose ${variant === "light" ? "" : "prose-invert"} max-w-none ${className}`}
    >
      <div className={`text-sm whitespace-pre-wrap ${t.body}`}>
        {displayLines.map((line, idx) => renderMarkdownLine(line, idx, t))}
        {hasMore && (
          <p className={`mt-2 text-xs italic ${t.muted}`}>
            ... ({lines.length - maxLines!} more lines)
          </p>
        )}
      </div>
    </div>
  );
}
