/**
 * Route shell for the assessment suite.
 *
 * `efa-theme` (app/globals.css) restores MVDS's own dark palette for this
 * subtree. The hub repaints the design system's semantic tokens in its greens,
 * which is right for the hub — but this is a separate instrument and reads
 * better as plain MVDS. `bg-background` is set here because the body still
 * carries the hub's colour underneath.
 */
export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="efa-theme min-h-screen bg-background text-foreground">{children}</div>;
}
