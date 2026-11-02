/** A loggable message from anything thrown — an Error, a Supabase `{ message }`, or a bare value. */
export function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return String(error ?? "unknown");
}
