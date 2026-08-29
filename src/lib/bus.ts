import type { PactEvent } from "./types";

type Handler = (event: PactEvent) => void;

const g = globalThis as unknown as { __pactBus?: Set<Handler> };

function handlers() {
  if (!g.__pactBus) g.__pactBus = new Set();
  return g.__pactBus;
}

export function publish(event: PactEvent) {
  for (const h of handlers()) {
    try {
      h(event);
    } catch {
      // A dead SSE client should not take down the desk.
    }
  }
}

export function subscribe(handler: Handler) {
  handlers().add(handler);
  return () => {
    handlers().delete(handler);
  };
}
