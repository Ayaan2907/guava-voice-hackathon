import { subscribe } from "@/lib/bus";
import { getSession, listSessions } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) {
    return new Response("tenant required", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send({
        type: "hello",
        sessions: listSessions(tenant),
      });
      const unsub = subscribe((event) => {
        if (event.tenantSlug !== tenant) return;
        const sessions = listSessions(tenant);
        const session = event.sessionId ? getSession(event.sessionId) : null;
        send({ event, sessions, session });
      });
      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);
      const abort = () => {
        clearInterval(ping);
        unsub();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
