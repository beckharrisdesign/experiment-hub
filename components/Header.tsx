import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-border bg-background-secondary">
      <div className="px-8 py-4">
        <Link
          href="/"
          className="text-2xl font-semibold text-text-primary hover:text-accent-primary transition-colors"
        >
          Experiment Hub
        </Link>
      </div>
    </header>
  );
}

