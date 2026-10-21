import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForStartupTask } from "@/lib/appBootstrap";

describe("waitForStartupTask", () => {
  afterEach(() => vi.useRealTimers());

  it("continues when optional startup work exceeds its time budget", async () => {
    vi.useFakeTimers();
    const task = vi.fn(() => new Promise<void>(() => {}));

    const startup = waitForStartupTask(task, 1000);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(startup).resolves.toEqual({ status: "timed-out" });
    expect(task).toHaveBeenCalledOnce();
  });

  it("reports rejected startup work without blocking app mount", async () => {
    const error = new Error("locale chunk unavailable");

    await expect(waitForStartupTask(() => Promise.reject(error), 1000)).resolves.toEqual({
      status: "failed",
      error,
    });
  });

  it("reports synchronous startup failures", async () => {
    const error = new Error("startup failed immediately");

    await expect(
      waitForStartupTask(() => {
        throw error;
      }, 1000),
    ).resolves.toEqual({ status: "failed", error });
  });

  it("returns when startup work completes normally", async () => {
    await expect(waitForStartupTask(async () => {}, 1000)).resolves.toEqual({
      status: "completed",
    });
  });
});
