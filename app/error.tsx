"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Something went wrong!
        </h2>
        <p className="text-text-secondary mb-4">{error.message}</p>
        {error.digest && (
          <p className="text-sm text-text-muted mb-4">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

