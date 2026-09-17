/**
 * Route shell for the converter.
 *
 * `mvds-theme` (app/globals.css) restores MVDS's own dark palette for this
 * subtree — per founder direction the tool is plain base MVDS, not the hub
 * skin. `bg-background` is set here because the body still carries the hub's
 * colour underneath.
 */
export default function SvgToStitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mvds-theme min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
