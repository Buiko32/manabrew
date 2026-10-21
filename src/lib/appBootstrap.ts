export type StartupTaskResult =
  { status: "completed" } | { status: "failed"; error: unknown } | { status: "timed-out" };

export async function waitForStartupTask(
  run: () => Promise<unknown>,
  timeoutMs: number,
): Promise<StartupTaskResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const task: Promise<StartupTaskResult> = Promise.resolve()
    .then(run)
    .then(
      () => ({ status: "completed" }),
      (error: unknown) => ({ status: "failed", error }),
    );
  const timeout = new Promise<StartupTaskResult>((resolve) => {
    timeoutId = setTimeout(() => resolve({ status: "timed-out" }), timeoutMs);
  });

  const result = await Promise.race([task, timeout]);
  if (timeoutId !== undefined) clearTimeout(timeoutId);
  return result;
}
