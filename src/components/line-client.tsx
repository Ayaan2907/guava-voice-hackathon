"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Session, Tenant } from "@/lib/types";

export function LineClient({ tenant }: { tenant: Tenant }) {
  const [session, setSession] = useState<Session | null>(null);
  const [say, setSay] = useState("");
  const live = tenant.webrtcCode.startsWith("grtc-");
  const mounted = useRef(false);

  useEffect(() => {
    if (!live || mounted.current) return;
    mounted.current = true;
    const script = document.createElement("script");
    script.src = "https://app.goguava.ai/static/build/webrtc-widgets/guava-widget.js";
    script.setAttribute("webrtc-code", tenant.webrtcCode);
    script.setAttribute("gw-name", tenant.name);
    script.setAttribute("gw-color", tenant.brandColor);
    script.setAttribute("enable-chat", "");
    document.body.appendChild(script);
    // Do not remove on unmount. Guava's widget has no resume; remounting kills WebRTC.
  }, [live, tenant.brandColor, tenant.name, tenant.webrtcCode]);

  useEffect(() => {
    const es = new EventSource(`/api/desk/stream?tenant=${tenant.slug}`);
    es.onmessage = (msg) => {
      const data = JSON.parse(msg.data) as { sessions?: Session[] };
      if (!data.sessions) return;
      setSession((current) => {
        if (current) return data.sessions!.find((s) => s.id === current.id) ?? current;
        return data.sessions!.find((s) => s.status !== "ended") ?? data.sessions![0] ?? null;
      });
    };
    return () => es.close();
  }, [tenant.slug]);

  async function start() {
    const res = await fetch("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug: tenant.slug, direction: "inbound" }),
    });
    const data = await res.json();
    if (data.session) setSession(data.session);
  }

  async function send() {
    if (!session || !say.trim()) return;
    await fetch(`/api/sessions/${session.id}/say`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: say.trim(), role: "caller" }),
    });
    setSay("");
  }

  return (
    <div className="min-h-screen bg-[#f3efe6] text-[#1c1916]">
      <header className="flex items-center justify-between border-b border-[#d4cbb8] px-4 py-3">
        <div>
          <div className="text-xs tracking-[0.16em] uppercase text-[#8a6a3b]">Public line</div>
          <h1 className="font-serif text-2xl">{tenant.name}</h1>
          <p className="text-sm text-[#6b6458]">{tenant.tagline}</p>
        </div>
        <Link href={`/desk/${tenant.slug}`} className="text-sm">
          Operator desk →
        </Link>
      </header>

      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8 lg:grid-cols-[1fr_280px]">
        <section className="rounded-xl border border-[#d4cbb8] bg-[#faf7f0] p-5">
          {live ? (
            <p className="mb-4 text-sm text-[#6b6458]">
              Live Guava widget is mounted for <span className="font-mono">{tenant.webrtcCode}</span>.
              Use the orb. Do not navigate away — the widget does not resume.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-[#6b6458]">
                This tenant is on a simulated inbound line until a <span className="font-mono">grtc-</span>{" "}
                code is pasted in the desk. Open the operator desk in another window, then start
                here — you&apos;ll see the same call.
              </p>
              {!session ? (
                <Button onClick={start}>Talk to {tenant.agentName}</Button>
              ) : (
                <div>
                  <ol className="mb-4 max-h-[50vh] space-y-3 overflow-y-auto text-sm">
                    {session.transcript
                      .filter((l) => l.role !== "system" && l.role !== "operator")
                      .map((l) => (
                        <li key={l.id}>
                          <span className="text-xs uppercase tracking-wide text-[#8a6a3b]">
                            {l.role === "agent" ? tenant.agentName : "You"}
                          </span>
                          <p>{l.text}</p>
                        </li>
                      ))}
                  </ol>
                  {session.status !== "ended" ? (
                    <div className="flex gap-2">
                      <Textarea
                        value={say}
                        onChange={(e) => setSay(e.target.value)}
                        placeholder="Add a line as the caller (optional — the demo also runs itself)"
                        rows={2}
                      />
                      <Button onClick={send}>Say</Button>
                    </div>
                  ) : (
                    <p className="text-sm text-[#6b6458]">Call ended.</p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
        <aside className="text-sm text-[#6b6458]">
          <h2 className="font-medium text-[#1c1916]">What this line can do</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {tenant.intents.map((i) => (
              <li key={i.id}>{i.label}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs">
            Recorded line. {tenant.agentName} represents {tenant.name}. A human may
            whisper instructions; they are not on the audio.
          </p>
        </aside>
      </main>
    </div>
  );
}
