"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Session, Tenant } from "@/lib/types";

export default function OnboardInterviewPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login?next=/onboard");
          return;
        }
        setTenant(data.tenant);
        if (data.tenant?.onboardComplete) router.push(`/app/${data.user.orgSlug}`);
      });
  }, [router]);

  useEffect(() => {
    if (!tenant) return;
    const es = new EventSource(`/api/desk/stream?tenant=${tenant.slug}`);
    es.onmessage = (msg) => {
      const data = JSON.parse(msg.data) as { sessions?: Session[] };
      if (!data.sessions) return;
      const live =
        data.sessions.find((s) => s.subject === "Onboarding intake") ??
        data.sessions.find((s) => s.status !== "ended") ??
        data.sessions[0] ??
        null;
      setSession(live);
    };
    return () => es.close();
  }, [tenant]);

  async function start() {
    if (!tenant) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug: tenant.slug, kind: "onboard", force: true }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not start intake.");
      return;
    }
    setSession(data.session);
  }

  async function finish() {
    const res = await fetch("/api/onboard/complete", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not save playbook.");
      return;
    }
    router.push(`/app/${data.tenant.slug}`);
  }

  const done = Boolean(tenant?.onboardComplete || session?.status === "ended");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-xs tracking-[0.16em] text-brass uppercase">One Guava call</p>
        <h1 className="font-serif mt-2 text-4xl">Teach Pact your desk</h1>
        <p className="mt-3 text-muted-foreground">
          {tenant ? `${tenant.name} — ` : ""}this interview writes purpose, greeting, and authority. Simulator
          tonight if live audio is still attaching. After it ends, you get the CRM.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void start()} disabled={pending || !tenant}>
            {pending ? "Starting…" : "Start intake"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void finish()} disabled={!tenant}>
            {done ? "Open CRM" : "Skip and use defaults"}
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <ScrollArea className="mt-8 h-[420px] rounded-xl border bg-card p-4">
          <ul className="space-y-3 text-sm">
            {(session?.transcript ?? []).map((line) => (
              <li key={line.id}>
                <span className="text-xs tracking-wide text-brass uppercase">{line.role}</span>
                <p className="mt-0.5">{line.text}</p>
              </li>
            ))}
            {!session ? <li className="text-muted-foreground">Press start. The agent will interview you.</li> : null}
          </ul>
        </ScrollArea>
      </main>
    </div>
  );
}
