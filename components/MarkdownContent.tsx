"use client";

/** @figma 9VJTxmBWKgeCDTyJLsYM7I:27:3311 */
interface MarkdownContentProps {
  content: string;
  maxLines?: number;
  className?: string;
  variant?: "dark" | "light";
}

function renderMarkdownLine(
  line: string,
  idx: number,
  t: { heading: string; body: string; bold: string; muted: string; hr: string },
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
        className={`text-sm font-semibold mt-4 mb-2 tracking-[0.01em] ${t.heading}`}
      >
        {line.replace("## ", "")}
      </h2>
    );
  }
  if (line.startsWith("### ")) {
    return (
      <h3
        key={idx}
        className={`text-sm font-semibold mt-3 mb-1 tracking-[0.01em] ${t.heading}`}
      >
        {line.replace("### ", "")}
      </h3>
    );
  }

  if (line.trim() === "---") {
    return <hr key={idx} className={`my-4 ${t.hr}`} />;
  }

  if (line.trim().startsWith("- ")) {
    const bulletContent = line.replace("- ", "");
    const parts = bulletContent.split(/(\*\*[^*]+\*\*)/g);
    return (
      <div key={idx} className={`ml-4 mb-2 leading-5 ${t.body}`}>
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
      <p key={idx} className={`mb-3 leading-5 ${t.body}`}>
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
          hr: "border-border-dark/40",
        }
      : {
          heading: "text-text-primary",
          body: "text-text-secondary",
          bold: "text-text-primary",
          muted: "text-text-muted",
          hr: "border-border",
        };

  const lines = content.split("\n");
  const displayLines = maxLines ? lines.slice(0, maxLines) : lines;
  const hasMore = maxLines && lines.length > maxLines;

  // Group consecutive bullet lines into <ul> blocks so we can add
  // bottom margin after the whole list, not just each item.
  const grouped: React.ReactNode[] = [];
  let i = 0;
  while (i < displayLines.length) {
    const line = displayLines[i];
    if (line.trim().startsWith("- ")) {
      const bulletLines: string[] = [];
      while (
        i < displayLines.length &&
        displayLines[i].trim().startsWith("- ")
      ) {
        bulletLines.push(displayLines[i]);
        i++;
      }
      grouped.push(
        <ul key={`ul-${i}`} className={`mb-4 ${t.body}`}>
          {bulletLines.map((bl, bi) => {
            const bulletContent = bl.replace(/^\s*-\s/, "");
            const parts = bulletContent.split(/(\*\*[^*]+\*\*)/g);
            return (
              <li key={bi} className="ml-4 mb-2 leading-5 list-none">
                •{" "}
                {parts.map((part, pi) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={pi} className={t.bold}>
                      {part.replace(/\*\*/g, "")}
                    </strong>
                  ) : (
                    <span key={pi}>{part}</span>
                  ),
                )}
              </li>
            );
          })}
        </ul>,
      );
    } else {
      grouped.push(renderMarkdownLine(line, i, t));
      i++;
    }
  }

  return (
    <div
      className={`prose ${variant === "light" ? "" : "prose-invert"} max-w-none ${className}`}
    >
      <div className={`text-sm leading-5 whitespace-pre-wrap ${t.body}`}>
        {grouped}
        {hasMore && (
          <p className={`mt-2 text-xs italic ${t.muted}`}>
            ... ({lines.length - maxLines!} more lines)
          </p>
        )}
      </div>
    </div>
  );
}
