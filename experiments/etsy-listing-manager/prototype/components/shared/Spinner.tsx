export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  // Explicit CSS vars + shrink-0 so the ring stays visible in flex layouts
  // (token classes like border-text-* can be dropped if Tailwind omits them from the build)
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${sizes[size]} shrink-0 box-border border-2 border-solid rounded-full animate-spin border-[color:var(--text-muted)] border-t-[color:var(--accent-primary)]`}
    />
  );
}

