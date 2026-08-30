"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GuavaWidget } from "@/components/guava-widget";
import type { Session, Tenant } from "@/lib/types";

export function LineClient({ tenant: initial }: { tenant: Tenant }) {
  const [tenant, setTenant] = useState(initial);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void fetch(`/api/tenants/${tenant.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingCall: { direction: "inbound" } }),
    }).then(() => undefined);

    const tick = () => {
      void fetch(`/api/tenants/${tenant.slug}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.tenant) setTenant(data.tenant);
        });
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [tenant.slug]);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-end justify-between gap-6 border-b px-6 py-6 sm:px-10">
        <div>
          <div className="text-[11px] tracking-[0.22em] text-brass uppercase">Public line</div>
          <h1 className="font-serif mt-1 text-3xl font-medium tracking-tight">{tenant.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tenant.tagline}</p>
          {tenant.inboundPhone ? (
            <p className="mt-2 font-mono text-xs text-brass">Call {tenant.inboundPhone}</p>
          ) : null}
        </div>
        <Link href={`/app/${tenant.slug}`} className="text-sm no-underline transition-colors hover:text-brass">
          Dashboard →
        </Link>
      </header>

      <main className="mx-auto grid max-w-4xl gap-12 px-6 py-12 lg:grid-cols-[1fr_240px] sm:px-10">
        <section>
          <GuavaWidget webrtcCode={tenant.webrtcCode} name={tenant.name} color={tenant.brandColor} />
          {session ? (
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Live session {session.status} · {session.callerName}. Transcript is on the operator desk.
            </p>
          ) : (
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Click the orb and speak as a customer calling in. Transcript and records land on the
              dashboard at /app/{tenant.slug}.
            </p>
          )}
        </section>
        <aside className="text-sm text-muted-foreground">
          <h2 className="font-medium text-foreground">What this line can do</h2>
          <ul className="mt-3 space-y-2 border-t border-border pt-3">
            {tenant.intents.map((i) => (
              <li key={i.id}>{i.label}</li>
            ))}
          </ul>
          <p className="mt-6 text-xs leading-relaxed">
            Recorded line. {tenant.agentName} represents {tenant.name}. A human may whisper instructions; they
            are not on the audio.
          </p>
        </aside>
      </main>
    </div>
  );
}
