import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-border bg-background-secondary">
      <div className="px-8 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-semibold text-text-primary hover:text-accent-primary transition-colors"
        >
          Experiment Hub
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/workflow"
            className="text-sm text-text-secondary hover:text-accent-primary transition-colors"
          >
            Workflow
          </Link>
        </nav>
      </div>
    </header>
  );
}

