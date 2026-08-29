/**
 * Fails loudly if a server-only module is pulled into a client bundle.
 *
 * The `server-only` package does this at build time, but adding it would mean
 * regenerating pnpm-lock.yaml and the hub's CI installs with --frozen-lockfile.
 * This is the same guarantee one step later: the import throws in the browser
 * rather than shipping sharp to it.
 *
 * The failure it prevents is real — the stack UI imports the module registry for
 * labels and ranges, and a combined declarations/implementations file broke the
 * build with `UnhandledSchemeError: node:events`.
 */
export function assertServerOnly(moduleName: string): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      `${moduleName} is server-only and must not be imported from a client component.`,
    );
  }
}
