import { redirect } from "next/navigation";
import { requireAdminCookie } from "@/lib/admin-auth";
import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const isAuthenticated = await requireAdminCookie();

  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background-primary">
      <header className="border-b border-border-dark px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            ← Hub
          </Link>
          <span className="text-text-primary font-semibold">Admin</span>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Log out
          </button>
        </form>
      </header>
      <main className="px-6 py-8 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
