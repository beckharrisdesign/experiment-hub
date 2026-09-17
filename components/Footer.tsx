import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-background-secondary flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-9 px-4">
      <span className="text-text-primary text-sm font-medium">
        Beck Harris Design
      </span>
      <span className="text-text-primary text-sm">© 2026</span>
      <Link
        href="/policy"
        className="text-text-primary text-sm hover:text-text-secondary"
      >
        Privacy
      </Link>
      <Link
        href="/terms"
        className="text-text-primary text-sm hover:text-text-secondary"
      >
        Terms
      </Link>
    </footer>
  );
}
