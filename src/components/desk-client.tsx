"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Session, Tenant } from "@/lib/types";

const WHISPER_PRESETS = [
  "Authorize $150 goodwill toward the deductible. Do not waive it. Book Thursday 10:30.",
  "Match is a no. Cap at 8% loyalty plus waive the $25 glass fee next term.",
  "Second free detention day approved. Still no ocean demurrage waiver.",
  "Stay in Spanish. Confirm photos tonight. Do not switch back to English unless they ask.",
];

export function DeskClient({ tenant: initial }: { tenant: Tenant }) {
  const [tenant, setTenant] = useState(initial);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [whisper, setWhisper] = useState(WHISPER_PRESETS[0]);
  const [webrtc, setWebrtc] = useState(initial.webrtcCode);
  const [savingCode, setSavingCode] = useState(false);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[0] ?? null,
    [sessions, activeId],
  );

  useEffect(() => {
    const es = new EventSource(`/api/desk/stream?tenant=${tenant.slug}`);
    es.onmessage = (msg) => {
      const data = JSON.parse(msg.data) as {
        sessions?: Session[];
        session?: Session | null;
      };
      if (data.sessions) {
        setSessions(data.sessions);
        setActiveId((id) => {
          if (id && data.sessions!.some((s) => s.id === id)) return id;
          return data.sessions![0]?.id ?? null;
        });
      }
    };
    return () => es.close();
  }, [tenant.slug]);

  async function startInbound() {
    const res = await fetch("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug: tenant.slug, direction: "inbound" }),
    });
    const data = await res.json();
    if (data.session) setActiveId(data.session.id);
  }

  async function startOutbound(leadId: string) {
    const res = await fetch("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug: tenant.slug,
        direction: "outbound",
        leadId,
      }),
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

  async function saveCode() {
    setSavingCode(true);
    const res = await fetch(`/api/tenants/${tenant.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webrtcCode: webrtc.trim() }),
    });
    const data = await res.json();
    setSavingCode(false);
    if (data.tenant) setTenant(data.tenant);
  }

  const live = sessions.filter((s) => s.status !== "ended");

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-serif text-lg text-foreground no-underline">
            Pact
          </Link>
          <span className="text-muted-foreground">/</span>
          <div>
            <div className="text-sm font-medium">{tenant.name}</div>
            <div className="text-xs text-muted-foreground">
              {tenant.vertical} · {tenant.city || "desk"} · line{" "}
              <span className="font-mono">{tenant.webrtcCode}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[10px] tracking-wider">
            {live.length ? `${live.length} live` : "idle"}
          </Badge>
          <Link
            href={`/line/${tenant.slug}`}
            target="_blank"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open public line
          </Link>
          <Button size="sm" onClick={startInbound}>
            Simulate inbound
          </Button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-57px)] lg:grid-cols-[240px_1fr_320px]">
        <aside className="border-b border-border lg:border-r lg:border-b-0">
          <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground uppercase tracking-wider">
            Lines
          </div>
          <div className="p-2">
            {sessions.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                No calls yet. Simulate inbound, or open the public line in another
                window and start a conversation.
              </p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={`mb-1 w-full rounded-md px-2 py-2 text-left text-sm ${
                    active?.id === s.id ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{s.callerName}</span>
                    <StatusChip status={s.status} />
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.direction} · {s.subject}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[420px] flex-col">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
              Waiting for a line.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
                <div>
                  <div className="text-sm font-medium">{active.callerName}</div>
                  <div className="text-xs text-muted-foreground">
                    {active.subject} · {active.language}
                    {active.status === "escalated" ? " · wants a person — stay on the line" : ""}
                  </div>
                </div>
                <StatusChip status={active.status} />
              </div>
              <ScrollArea className="h-[48vh] lg:h-auto lg:flex-1">
                <ol className="space-y-3 p-4">
                  {active.transcript.length === 0 ? (
                    <li className="text-sm text-muted-foreground">Connecting…</li>
                  ) : (
                    active.transcript.map((line) => (
                      <li key={line.id} className="text-sm">
                        <div className="mb-0.5 flex items-center gap-2 text-[11px] tracking-wide uppercase">
                          <span
                            className={
                              line.role === "agent"
                                ? "text-live"
                                : line.role === "operator"
                                  ? "text-brass"
                                  : line.role === "system"
                                    ? "text-muted-foreground"
                                    : "text-foreground"
                            }
                          >
                            {line.role}
                          </span>
                          {line.language && line.language !== "english" ? (
                            <span className="text-muted-foreground">{line.language}</span>
                          ) : null}
                        </div>
                        <p>{line.text}</p>
                        {line.translated ? (
                          <p className="mt-1 text-xs text-muted-foreground">EN · {line.translated}</p>
                        ) : null}
                      </li>
                    ))
                  )}
                </ol>
              </ScrollArea>
              <div className="border-t border-border p-3">
                <p className="mb-2 text-[11px] tracking-wider text-brass uppercase">
                  Operator whisper → send_instruction · agent stays on the call
                </p>
                <div className="mb-2 flex flex-wrap gap-1">
                  {WHISPER_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setWhisper(p)}
                      className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {p.slice(0, 28)}…
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={whisper}
                    onChange={(e) => setWhisper(e.target.value)}
                    rows={3}
                    className="min-h-[72px]"
                    placeholder="Type what the agent should say. You are not on the audio."
                  />
                  <Button onClick={sendWhisper} disabled={!active || active.status === "ended"}>
                    Whisper
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="border-t border-border lg:border-t-0 lg:border-l">
          <Tabs defaultValue="fields">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-2">
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="playbook">Playbook</TabsTrigger>
              <TabsTrigger value="outbound">Outbound</TabsTrigger>
              <TabsTrigger value="line">Line</TabsTrigger>
            </TabsList>
            <TabsContent value="fields" className="p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Structured capture from <code>set_task</code> / Field. Empty until the
                agent collects it.
              </p>
              <dl className="space-y-2 text-sm">
                {tenant.fields.map((f) => (
                  <div key={f.key} className="flex justify-between gap-3 border-b border-border/60 py-1">
                    <dt className="font-mono text-xs text-muted-foreground">{f.key}</dt>
                    <dd className="text-right">
                      {active?.fields[f.key] ? (
                        active.fields[f.key]
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6">
                <h3 className="text-xs tracking-wider text-muted-foreground uppercase">Authority</h3>
                <p className="mt-2 text-sm">{tenant.authority.maxConcession}</p>
                <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                  {tenant.authority.cannotDo.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="playbook" className="space-y-4 p-4 text-sm">
              <div>
                <h3 className="text-xs tracking-wider text-muted-foreground uppercase">Persona</h3>
                <p className="mt-1 text-muted-foreground">{tenant.persona}</p>
              </div>
              <div>
                <h3 className="text-xs tracking-wider text-muted-foreground uppercase">Intents</h3>
                <ul className="mt-2 space-y-1">
                  {tenant.intents.map((i) => (
                    <li key={i.id}>
                      <span className="font-medium">{i.label}</span>
                      <span className="text-muted-foreground"> — {i.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs tracking-wider text-muted-foreground uppercase">Knowledge (DocumentQA)</h3>
                {tenant.knowledge.map((doc) => (
                  <details key={doc.id} className="mt-2 rounded-md border border-border p-2">
                    <summary className="cursor-pointer text-sm">{doc.title}</summary>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                      {doc.body}
                    </pre>
                  </details>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="outbound" className="p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Tonight this places a WebRTC stand-in. After approval:{" "}
                <code>reach_person</code> then the same task.
              </p>
              <ul className="space-y-3">
                {tenant.leads.map((lead) => (
                  <li key={lead.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{lead.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{lead.phone}</div>
                      </div>
                      <Button size="sm" onClick={() => startOutbound(lead.id)}>
                        Place call
                      </Button>
                    </div>
                    <p className="mt-2 text-xs">{lead.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{lead.context}</p>
                    {lead.language !== "english" ? (
                      <p className="mt-1 text-[11px] text-brass">Language: {lead.language}</p>
                    ) : null}
                  </li>
                ))}
                {tenant.leads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No leads queued on this tenant yet.</p>
                ) : null}
              </ul>
            </TabsContent>
            <TabsContent value="line" className="space-y-3 p-4 text-sm">
              <p className="text-xs text-muted-foreground">
                Paste a real <code>grtc-</code> code from the Guava dashboard or{" "}
                <code>Client.create_webrtc_agent()</code>. Until then the public line
                runs the Pact simulator so you can still demo the desk.
              </p>
              <Input
                value={webrtc}
                onChange={(e) => setWebrtc(e.target.value)}
                className="font-mono text-xs"
              />
              <Button size="sm" onClick={saveCode} disabled={savingCode}>
                {savingCode ? "Saving…" : "Save inbound code"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Widget:{" "}
                <code className="break-all">
                  {`<script src="https://app.goguava.ai/static/build/webrtc-widgets/guava-widget.js" webrtc-code="${webrtc}">`}
                </code>
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/desk/northstar" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Northstar
                </Link>
                <Link href="/desk/harbor-lane" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Harbor Lane
                </Link>
                <Link href="/onboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  New tenant
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: Session["status"] }) {
  const map: Record<Session["status"], string> = {
    ringing: "bg-brass/20 text-brass",
    live: "bg-live/15 text-live",
    escalated: "bg-destructive/20 text-destructive",
    ended: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] tracking-wider uppercase ${map[status]}`}>
      {status}
    </span>
  );
}
