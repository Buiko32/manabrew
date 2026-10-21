type OpenableWebSocket = Pick<
  WebSocket,
  "readyState" | "addEventListener" | "removeEventListener" | "close"
>;

export function waitForWebSocketOpen(socket: OpenableWebSocket, timeoutMs: number): Promise<void> {
  if (socket.readyState === 1) return Promise.resolve();
  if (socket.readyState === 3) return Promise.reject(new Error("WebSocket closed before opening"));

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("error", onError);
      socket.removeEventListener("close", onClose);
    };
    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onOpen: EventListener = () => settle();
    const onError: EventListener = () => {
      settle(new Error("WebSocket failed to open"));
      socket.close();
    };
    const onClose: EventListener = () => settle(new Error("WebSocket closed before opening"));
    const timeout = setTimeout(() => {
      settle(new Error(`WebSocket open timed out after ${timeoutMs}ms`));
      socket.close();
    }, timeoutMs);

    socket.addEventListener("open", onOpen);
    socket.addEventListener("error", onError);
    socket.addEventListener("close", onClose);
  });
}
