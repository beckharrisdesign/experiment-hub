import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-border bg-background-secondary">
      <div className="mx-auto max-w-screen-xl px-8 lg:px-16 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-heading text-2xl font-semibold text-text-primary hover:text-accent-primary transition-colors"
        >
          BHD Labs
        </Link>
      </div>
    </header>
  );
}

