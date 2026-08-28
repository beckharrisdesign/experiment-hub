/**
 * `server-only` throws when resolved outside a React Server Component, which is
 * every vitest run. The guard is still worth having — it is what stops a client
 * component importing sharp and breaking the build (the bug this split fixed) —
 * so tests alias it to this no-op rather than dropping it from the source.
 */
export {};
