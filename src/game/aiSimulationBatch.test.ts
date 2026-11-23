import { describe, expect, it } from "vitest";
import { runJobsConcurrently } from "./aiSimulationBatch";

describe("AI simulation job scheduling", () => {
  it("keeps two games running at once without starting a third", async () => {
    let active = 0;
    let peak = 0;
    const completed: number[] = [];

    await runJobsConcurrently(
      6,
      2,
      () => false,
      async (index) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, index % 2 === 0 ? 6 : 1));
        active -= 1;
        return index;
      },
      (index) => completed.push(index),
    );

    expect(peak).toBe(2);
    expect(active).toBe(0);
    expect([...completed].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("keeps phone simulations sequential", async () => {
    let active = 0;
    let peak = 0;
    await runJobsConcurrently(
      4,
      1,
      () => false,
      async (index) => {
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
        return index;
      },
      () => {},
    );
    expect(peak).toBe(1);
  });

  it("stops scheduling new games when cancelled", async () => {
    let cancelled = false;
    const completed: number[] = [];
    await runJobsConcurrently(
      20,
      2,
      () => cancelled,
      async (index) => index,
      (index) => {
        completed.push(index);
        if (completed.length === 2) cancelled = true;
      },
    );
    expect(completed).toHaveLength(2);
  });
});
