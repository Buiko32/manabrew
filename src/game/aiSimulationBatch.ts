/**
 * Runs independent simulation jobs with a fixed maximum concurrency.
 * Results may finish out of order; callers should sort them by game number
 * before aggregating statistics or building a chronological game log.
 */
export async function runJobsConcurrently<T>(
  count: number,
  concurrency: number,
  shouldStop: () => boolean,
  run: (index: number) => Promise<T>,
  onComplete: (result: T) => void,
): Promise<void> {
  const lanes = Number.isFinite(concurrency)
    ? Math.min(count, Math.max(1, Math.floor(concurrency)))
    : 1;
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: lanes }, async () => {
      while (!shouldStop() && nextIndex < count) {
        const index = nextIndex++;
        const result = await run(index);
        if (shouldStop()) return;
        onComplete(result);
      }
    }),
  );
}
