"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { GuavaWidget } from "@/components/guava-widget";
import { ONBOARD_FIELDS } from "@/lib/onboard-schema";
import type { Session, Tenant } from "@/lib/types";

export default function OnboardInterviewPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login?next=/onboard");
          return;
        }
        const t = data.tenant as Tenant | null;
        setTenant(t);
        if (t?.onboardComplete) router.push(`/app/${data.user.orgSlug}`);
      });
  }, [router]);

  useEffect(() => {
    if (!tenant) return;
    const es = new EventSource(`/api/desk/stream?tenant=${tenant.slug}`);
    es.onmessage = (msg) => {
      const data = JSON.parse(msg.data) as { sessions?: Session[]; event?: { type?: string } };
      if (data.sessions) {
        const live =
          data.sessions.find((s) => s.subject === "Onboarding intake" && s.status !== "ended") ??
          data.sessions.find((s) => s.status !== "ended") ??
          data.sessions[0] ??
          null;
        setSession(live);
      }
    };
    return () => es.close();
  }, [tenant]);

  useEffect(() => {
    if (!tenant) return;
    const tick = () => {
      void fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.tenant?.onboardComplete) router.push(`/app/${data.user.orgSlug}`);
          if (data.tenant) setTenant(data.tenant);
        });
    };
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [tenant, router]);

  const fields = session?.fields ?? {};

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-12 px-6 py-14 lg:grid-cols-[1fr_280px] sm:px-10">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-brass uppercase">Guava onboarding</p>
          <h1 className="font-serif mt-3 text-4xl font-medium tracking-tight">Talk the desk into existence</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {tenant ? `${tenant.name} — ` : ""}Say the whole business in one breath if you want: what you sell,
            inbound, outbound, authority, and facts the agent may quote. Pact extracts the checklist from that
            dump and saves leftover facts into the knowledge library. Say skip to skip a step.
          </p>
          <div className="mt-10">
            {tenant ? (
              <GuavaWidget webrtcCode={tenant.webrtcCode} name={`Pact setup · ${tenant.name}`} color={tenant.brandColor} />
            ) : (
              <p className="text-sm text-muted-foreground">Loading desk…</p>
            )}
          </div>
          {session?.transcript.length ? (
            <ol className="mt-8 space-y-4 text-sm">
              {session.transcript
                .filter((l) => l.role === "agent" || l.role === "caller")
                .map((l) => (
                  <li key={l.id}>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-brass">{l.role}</span>
                    <p className="mt-1 leading-relaxed">{l.text}</p>
                  </li>
                ))}
            </ol>
          ) : null}
        </div>
        <aside>
          <h2 className="text-sm font-medium">What Guava extracted</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            A dump fills several at once. Skip leaves a field empty.
          </p>
          <ul className="mt-5 divide-y divide-border border-y border-border text-sm">
            {ONBOARD_FIELDS.map((f) => (
              <li key={f.key} className="py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span>{f.key.replaceAll("_", " ")}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {fields[f.key] ? "set" : session ? "skipped" : "—"}
                  </span>
                </div>
                {fields[f.key] ? <p className="mt-1 text-xs text-muted-foreground">{fields[f.key]}</p> : null}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="mt-6 h-10 w-full rounded-xl"
            onClick={() => tenant && router.push(`/app/${tenant.slug}`)}
            disabled={!tenant?.onboardComplete}
          >
            Open CRM when the interview completes
          </Button>
        </aside>
      </main>
    </div>
  );
}
