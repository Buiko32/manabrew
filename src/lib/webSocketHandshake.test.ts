import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForWebSocketOpen } from "@/lib/webSocketHandshake";

class FakeWebSocket extends EventTarget {
  readyState = 0;

  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event("open"));
  }

  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }

  fail() {
    this.dispatchEvent(new Event("error"));
  }
}

afterEach(() => vi.useRealTimers());

describe("waitForWebSocketOpen", () => {
  it("resolves once the socket opens", async () => {
    const socket = new FakeWebSocket();
    const opening = waitForWebSocketOpen(socket, 1000);

    socket.open();

    await expect(opening).resolves.toBeUndefined();
  });

  it("rejects if the socket closes before opening", async () => {
    const socket = new FakeWebSocket();
    const opening = waitForWebSocketOpen(socket, 1000);
    const rejection = expect(opening).rejects.toThrow("closed before opening");

    socket.close();

    await rejection;
  });

  it("rejects and closes if the socket errors before opening", async () => {
    const socket = new FakeWebSocket();
    const opening = waitForWebSocketOpen(socket, 1000);
    const rejection = expect(opening).rejects.toThrow("failed to open");

    socket.fail();

    await rejection;
    expect(socket.readyState).toBe(3);
  });

  it("rejects immediately if the socket is already closed", async () => {
    const socket = new FakeWebSocket();
    socket.readyState = 3;

    await expect(waitForWebSocketOpen(socket, 1000)).rejects.toThrow("closed before opening");
  });

  it("rejects and closes the socket when its open handshake times out", async () => {
    vi.useFakeTimers();
    const socket = new FakeWebSocket();
    const opening = waitForWebSocketOpen(socket, 1000);
    const rejection = expect(opening).rejects.toThrow("timed out after 1000ms");

    await vi.advanceTimersByTimeAsync(1000);

    await rejection;
    expect(socket.readyState).toBe(3);
  });
});
