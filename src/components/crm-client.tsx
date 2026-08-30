"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Session, Tenant } from "@/lib/types";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"] as const;

export function CrmClient({ tenant: initial }: { tenant: Tenant }) {
  const [tenant, setTenant] = useState(initial);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [digits, setDigits] = useState("");
  const [whisper, setWhisper] = useState(
    "Stay on the line. Authorize the published cap. Do not waive the core fee.",
  );

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[0] ?? null,
    [sessions, activeId],
  );

  useEffect(() => {
    const es = new EventSource(`/api/desk/stream?tenant=${tenant.slug}`);
    es.onmessage = (msg) => {
      const data = JSON.parse(msg.data) as { sessions?: Session[] };
      if (!data.sessions) return;
      setSessions(data.sessions);
      setActiveId((id) => {
        if (id && data.sessions!.some((s) => s.id === id)) return id;
        return data.sessions![0]?.id ?? null;
      });
    };
    return () => es.close();
  }, [tenant.slug]);

  async function patchFlags(patch: Partial<Pick<Tenant, "inboundEnabled" | "outboundEnabled">>) {
    const res = await fetch(`/api/tenants/${tenant.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (data.tenant) setTenant(data.tenant);
  }

  async function startCall(body: Record<string, unknown>) {
    const res = await fetch("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug: tenant.slug, force: true, ...body }),
    });
    const data = await res.json();
    if (data.session) setActiveId(data.session.id);
  }

  async function sendWhisper() {
    if (!active || !whisper.trim()) return;
    await fetch(`/api/sessions/${active.id}/whisper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: whisper.trim() }),
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const liveCode = tenant.webrtcCode.startsWith("grtc-");

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-brass uppercase">{tenant.slug}</p>
          <h1 className="font-serif text-2xl">{tenant.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={liveCode ? "default" : "secondary"}>{liveCode ? tenant.webrtcCode : "simulator"}</Badge>
          <Link href={`/line/${tenant.slug}`} target="_blank" rel="noreferrer" className="text-sm">
            Public line
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr_300px]">
        <section className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-medium">Web dialpad</h2>
            <p className="mt-1 text-xs text-muted-foreground">Outbound is a web call tonight, not PSTN.</p>
            <Input
              className="mt-3 font-mono tracking-widest"
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/[^\d*#]/g, ""))}
              placeholder="Enter number"
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {KEYS.map((k) => (
                <Button key={k} type="button" variant="outline" onClick={() => setDigits((d) => d + k)}>
                  {k}
                </Button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setDigits((d) => d.slice(0, -1))}>
                Delete
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!tenant.outboundEnabled || digits.length < 3}
                onClick={() =>
                  void startCall({
                    direction: "outbound",
                    callerName: digits,
                    subject: "Outbound web call",
                  })
                }
              >
                Call
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium">Lines</h2>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Inbound web line</span>
              <input
                type="checkbox"
                checked={tenant.inboundEnabled}
                onChange={(e) => void patchFlags({ inboundEnabled: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Outbound web calls</span>
              <input
                type="checkbox"
                checked={tenant.outboundEnabled}
                onChange={(e) => void patchFlags({ outboundEnabled: e.target.checked })}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!tenant.inboundEnabled}
              onClick={() => void startCall({ direction: "inbound" })}
            >
              Simulate inbound
            </Button>
          </div>

          {tenant.leads.length > 0 ? (
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-medium">Queued outreach</h2>
              <ul className="mt-3 space-y-2">
                {tenant.leads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {lead.name}
                      <span className="block text-xs text-muted-foreground">{lead.reason}</span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!tenant.outboundEnabled}
                      onClick={() => void startCall({ direction: "outbound", leadId: lead.id })}
                    >
                      Web call
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border bg-card p-4 min-h-[480px]">
          <h2 className="text-sm font-medium">Live call</h2>
          {active ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                {active.callerName} · {active.subject} · {active.status}
              </p>
              <ScrollArea className="mt-4 h-[320px]">
                <ul className="space-y-3 text-sm pr-3">
                  {active.transcript.map((line) => (
                    <li key={line.id}>
                      <span className="text-xs uppercase tracking-wide text-brass">{line.role}</span>
                      <p>{line.text}</p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <Textarea className="mt-4" value={whisper} onChange={(e) => setWhisper(e.target.value)} rows={3} />
              <Button type="button" className="mt-2" onClick={() => void sendWhisper()} disabled={!active || active.status === "ended"}>
                Whisper (send_instruction)
              </Button>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">No live call. Dial out or simulate inbound.</p>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-medium">Call log</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`w-full rounded-md border px-2 py-2 text-left ${
                    s.id === active?.id ? "border-foreground" : "border-border"
                  }`}
                  onClick={() => setActiveId(s.id)}
                >
                  <span className="block font-medium">{s.callerName}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.direction} · {s.status} · {s.subject}
                  </span>
                </button>
              </li>
            ))}
            {sessions.length === 0 ? <li className="text-muted-foreground">Empty until the first call.</li> : null}
          </ul>
        </section>
      </main>
    </div>
  );
}
