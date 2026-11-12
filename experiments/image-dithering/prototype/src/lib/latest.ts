/** Latest-wins guard for async work: take a token when starting; drop the result if a newer token exists. */
export function createLatest() {
  let current = 0;
  return { next: () => ++current, isCurrent: (token: number) => token === current };
}
