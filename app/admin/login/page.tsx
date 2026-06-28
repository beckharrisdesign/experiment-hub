interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <div className="w-full max-w-sm">
        <h1 className="text-text-primary text-xl font-semibold mb-6">
          Hub Admin
        </h1>
        <form action="/api/admin/login" method="POST" className="space-y-4">
          <div>
            <label
              htmlFor="secret"
              className="block text-sm text-text-secondary mb-1"
            >
              Password
            </label>
            <input
              id="secret"
              name="secret"
              type="password"
              autoFocus
              required
              className="w-full px-3 py-2 rounded bg-background-secondary border border-border-dark text-text-primary focus:outline-none focus:border-accent-primary"
            />
          </div>
          {error && <p className="text-sm text-red-400">Incorrect password.</p>}
          <button
            type="submit"
            className="w-full py-2 rounded bg-accent-primary text-white font-medium hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
