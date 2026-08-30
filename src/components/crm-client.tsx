"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { GuavaWidget } from "@/components/guava-widget";
import type { Lead, Session, Tenant } from "@/lib/types";

export function CrmClient({ tenant: initial }: { tenant: Tenant }) {
  const [tenant, setTenant] = useState(initial);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadReason, setLeadReason] = useState("");
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

  useEffect(() => {
    const tick = () => {
      void fetch(`/api/tenants/${tenant.slug}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.tenant) setTenant(data.tenant);
        });
    };
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [tenant.slug]);

  async function patchTenant(patch: Record<string, unknown>) {
    const res = await fetch(`/api/tenants/${tenant.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (data.tenant) setTenant(data.tenant);
    return data.tenant as Tenant | undefined;
  }

  async function armOutbound(leadId?: string) {
    await patchTenant({ pendingCall: { direction: "outbound", leadId } });
  }

  async function addLead() {
    if (!leadName.trim() || !leadReason.trim()) return;
    const res = await fetch(`/api/tenants/${tenant.slug}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: leadName.trim(), phone: leadPhone, reason: leadReason.trim() }),
    });
    const data = await res.json();
    if (data.tenant) {
      setLeadName("");
      setLeadPhone("");
      setLeadReason("");
      const created = data.lead as Lead | undefined;
      await patchTenant({
        pendingCall: { direction: "outbound", leadId: created?.id ?? data.tenant.leads[0]?.id },
      });
    }
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

  const live = sessions.filter((s) => s.status !== "ended");
  const escalated = sessions.filter((s) => s.status === "escalated");
  const queuedLeads = tenant.leads.filter((l) => l.status === "queued" || l.status === "dialing");
  const armedLead =
    tenant.pendingCall?.direction === "outbound"
      ? tenant.leads.find((l) => l.id === tenant.pendingCall?.leadId) ?? null
      : null;
  const records = Object.entries(active?.fields ?? {});

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b px-6 py-5 sm:px-10">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-brass uppercase">Dashboard · {tenant.slug}</p>
          <h1 className="font-serif mt-1 text-2xl font-medium tracking-tight">{tenant.name}</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
            {tenant.role === "platform" ? (
              <>
                Inbound on this desk is Pact itself. Callers are businesses buying a voice agent. Public
                web line{" "}
                <Link href="/line/pact" className="underline underline-offset-4">
                  /line/pact
                </Link>
                . PSTN is the Guava number on /desks.
              </>
            ) : (
              <>
                This is the business home. Public inbound is{" "}
                <Link href={`/line/${tenant.slug}`} className="underline underline-offset-4">
                  /line/{tenant.slug}
                </Link>
                . The orb is outbound when a lead is armed.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant={live.length ? "default" : "secondary"}>
            {live.length ? `${live.length} live` : "idle"}
          </Badge>
          <Link
            href={`/line/${tenant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm no-underline transition-colors hover:text-brass"
          >
            Public line
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="border-b px-6 py-4 sm:px-10">
        <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Pending</p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {escalated.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="rounded-xl border border-destructive/40 px-3 py-1.5 transition-colors hover:bg-destructive/10"
                onClick={() => setActiveId(s.id)}
              >
                Needs operator · {s.callerName}
              </button>
            </li>
          ))}
          {queuedLeads.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className="rounded-xl border px-3 py-1.5 transition-colors hover:bg-muted"
                onClick={() => void armOutbound(l.id)}
              >
                Lead waiting · {l.name}
              </button>
            </li>
          ))}
          {armedLead ? (
            <li className="rounded-xl border border-brass/40 px-3 py-1.5 text-brass">
              Next orb click: outbound to {armedLead.name}
            </li>
          ) : null}
          {escalated.length === 0 && queuedLeads.length === 0 && !armedLead ? (
            <li className="text-muted-foreground">Nothing waiting.</li>
          ) : null}
        </ul>
      </div>

      <main className="mx-auto grid max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[260px_1fr_240px] sm:px-10">
        <section>
          <h2 className="text-sm font-medium">Leads</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Queue a person, click Call, then the floating orb. You play the customer.
          </p>
          <Input className="mt-4" placeholder="Name" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
          <Input
            className="mt-2 font-mono text-xs"
            placeholder="Phone (optional)"
            value={leadPhone}
            onChange={(e) => setLeadPhone(e.target.value)}
          />
          <Input
            className="mt-2"
            placeholder="Job on pickup"
            value={leadReason}
            onChange={(e) => setLeadReason(e.target.value)}
          />
          <Button type="button" size="sm" className="mt-3 w-full rounded-xl" onClick={() => void addLead()}>
            Queue lead
          </Button>
          <ul className="mt-5 divide-y divide-border border-y border-border">
            {tenant.leads.map((lead) => (
              <li key={lead.id} className="py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium">{lead.name}</span>
                    <span className="block text-xs text-muted-foreground">{lead.reason}</span>
                    {lead.phone ? (
                      <span className="block font-mono text-[11px] text-muted-foreground">{lead.phone}</span>
                    ) : null}
                    <span className="text-[11px] uppercase tracking-wide text-brass">{lead.status}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!tenant.outboundEnabled}
                    onClick={() => void armOutbound(lead.id)}
                  >
                    {tenant.pendingCall?.leadId === lead.id ? "Armed" : "Call"}
                  </Button>
                </div>
              </li>
            ))}
            {tenant.leads.length === 0 ? (
              <li className="py-3 text-sm text-muted-foreground">No leads yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="min-h-[480px]">
          <h2 className="text-sm font-medium">Transcript & records</h2>
          <GuavaWidget webrtcCode={tenant.webrtcCode} name={tenant.name} color={tenant.brandColor} />
          {active ? (
            <>
              <p className="mt-4 text-xs text-muted-foreground">
                {active.direction} · {active.callerName} · {active.subject} · {active.status}
              </p>
              {records.length > 0 ? (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-4 text-xs">
                  {records.map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-muted-foreground">{key.replaceAll("_", " ")}</dt>
                      <dd className="mt-0.5">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">No captured fields on this call yet.</p>
              )}
              <ScrollArea className="mt-4 h-[280px]">
                <ul className="space-y-4 pr-3 text-sm">
                  {active.transcript.length === 0 ? (
                    <li className="text-muted-foreground">Transcript appears as they speak.</li>
                  ) : (
                    active.transcript.map((line) => (
                      <li key={line.id}>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-brass">{line.role}</span>
                        <p className="mt-1 leading-relaxed">{line.text}</p>
                      </li>
                    ))
                  )}
                </ul>
              </ScrollArea>
              {active.status !== "ended" ? (
                <>
                  <Textarea className="mt-4" value={whisper} onChange={(e) => setWhisper(e.target.value)} rows={3} />
                  <Button type="button" className="mt-2 rounded-xl" onClick={() => void sendWhisper()}>
                    Whisper to the agent
                  </Button>
                </>
              ) : null}
            </>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              No calls yet. Arm a lead and click the orb, or open the public line for inbound.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium">Call log</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`w-full py-3 text-left transition-colors duration-200 ${
                    s.id === active?.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveId(s.id)}
                >
                  <span className="block font-medium text-foreground">{s.callerName}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.direction} · {s.status} · {s.subject}
                  </span>
                </button>
              </li>
            ))}
            {sessions.length === 0 ? (
              <li className="py-3 text-muted-foreground">Empty until the first Guava call.</li>
            ) : null}
          </ul>
        </section>
      </main>
    </div>
  );
}
