"use client";

interface MarkdownContentProps {
  content: string;
  maxLines?: number;
  className?: string;
}

function renderMarkdownLine(line: string, idx: number) {
  // Handle headers
  if (line.startsWith("# ")) {
    return (
      <h1 key={idx} className="text-lg font-semibold text-text-primary mt-4 mb-2">
        {line.replace("# ", "")}
      </h1>
    );
  }
  if (line.startsWith("## ")) {
    return (
      <h2 key={idx} className="text-base font-semibold text-text-primary mt-3 mb-2">
        {line.replace("## ", "")}
      </h2>
    );
  }
  if (line.startsWith("### ")) {
    return (
      <h3 key={idx} className="text-sm font-semibold text-text-primary mt-2 mb-1">
        {line.replace("### ", "")}
      </h3>
    );
  }
  
  // Handle bullet points
  if (line.trim().startsWith("- ")) {
    const bulletContent = line.replace("- ", "");
    // Process inline bold in bullet points
    const parts = bulletContent.split(/(\*\*[^*]+\*\*)/g);
    return (
      <div key={idx} className="ml-4 my-1 text-text-secondary">
        •{" "}
        {parts.map((part, partIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={partIdx} className="text-text-primary">
                {part.replace(/\*\*/g, "")}
              </strong>
            );
          }
          return <span key={partIdx}>{part}</span>;
        })}
      </div>
    );
  }
  
  // Regular text with inline bold
  if (line.trim()) {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={idx} className="my-1 text-text-secondary">
        {parts.map((part, partIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={partIdx} className="text-text-primary">
                {part.replace(/\*\*/g, "")}
              </strong>
            );
          }
          return <span key={partIdx}>{part}</span>;
        })}
      </p>
    );
  }
  
  return <br key={idx} />;
}

export default function MarkdownContent({
  content,
  maxLines,
  className = "",
}: MarkdownContentProps) {
  if (!content || content.trim().length === 0) {
    return null;
  }
  
  const lines = content.split("\n");
  const displayLines = maxLines ? lines.slice(0, maxLines) : lines;
  const hasMore = maxLines && lines.length > maxLines;

  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <div className="text-sm text-text-secondary whitespace-pre-wrap">
        {displayLines.map((line, idx) => renderMarkdownLine(line, idx))}
        {hasMore && (
          <p className="mt-2 text-xs text-text-muted italic">
            ... ({lines.length - maxLines} more lines)
          </p>
        )}
      </div>
    </div>
  );
}

