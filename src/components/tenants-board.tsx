"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { VERTICAL_LABELS } from "@/lib/templates";
import type { Session, Tenant } from "@/lib/types";

function origin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function TenantsBoard({
  tenants: initialTenants,
  sessions: initialSessions,
}: {
  tenants: Tenant[];
  sessions: Session[];
}) {
  const [tenants, setTenants] = useState(initialTenants);
  const [sessions, setSessions] = useState(initialSessions);
  const [open, setOpen] = useState<string | null>(initialTenants[0]?.slug ?? null);

  useEffect(() => {
    const tick = () => {
      void Promise.all([
        fetch("/api/tenants").then((r) => r.json()),
        fetch("/api/sessions").then((r) => r.json()),
      ]).then(([t, s]) => {
        if (t.tenants) setTenants(t.tenants);
        if (s.sessions) setSessions(s.sessions);
      });
    };
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);

  const byTenant = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const list = map.get(s.tenantSlug) ?? [];
      list.push(s);
      map.set(s.tenantSlug, list);
    }
    return map;
  }, [sessions]);

  return (
    <div className="divide-y divide-border border-y border-border">
      {tenants.map((t) => {
        const calls = byTenant.get(t.slug) ?? [];
        const live = calls.filter((s) => s.status !== "ended");
        const selected = open === t.slug;
        const line = `${origin()}/line/${t.slug}`;
        return (
          <article key={t.slug}>
            <button
              type="button"
              className="flex w-full flex-wrap items-start justify-between gap-4 py-6 text-left transition-colors duration-200 hover:text-brass"
              onClick={() => setOpen(selected ? null : t.slug)}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">{t.name}</h2>
                  <Badge variant="secondary">{VERTICAL_LABELS[t.vertical]}</Badge>
                  {t.onboardComplete ? null : <Badge variant="outline">onboarding</Badge>}
                  {live.length ? <Badge>{live.length} live</Badge> : null}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{t.tagline || t.purpose}</p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {t.agentName} · {t.voice} · {t.languages.primary}
                  {t.languages.secondary.length ? ` + ${t.languages.secondary.join(", ")}` : ""}
                </p>
              </div>
              <div className="text-right text-xs tabular-nums text-muted-foreground">
                <div>{calls.length} calls</div>
                <div>{t.leads.length} leads</div>
              </div>
            </button>

            {selected ? (
              <div className="grid gap-8 pb-8 lg:grid-cols-3">
                <div>
                  <h3 className="text-[11px] tracking-[0.16em] text-brass uppercase">Public line</h3>
                  <p className="mt-3 break-all font-mono text-xs">
                    <Link href={`/line/${t.slug}`} className="no-underline hover:text-brass">
                      {line || `/line/${t.slug}`}
                    </Link>
                  </p>
                  {t.role === "platform" && t.inboundPhone ? (
                    <p className="mt-1 font-mono text-xs">Pact PSTN {t.inboundPhone}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">WebRTC inbound — this desk does not own the Pact DID.</p>
                  )}
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{t.webrtcCode}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <Link href={`/line/${t.slug}`} className="no-underline transition-colors hover:text-brass">
                      Open line
                    </Link>
                    <Link href={`/app/${t.slug}`} className="no-underline transition-colors hover:text-brass">
                      Operator dashboard
                    </Link>
                  </div>
                </div>

                <div>
                  <h3 className="text-[11px] tracking-[0.16em] text-brass uppercase">Calls</h3>
                  <ul className="mt-3 divide-y divide-border text-sm">
                    {calls.slice(0, 8).map((s) => (
                      <li key={s.id} className="py-2.5 first:pt-0">
                        <div className="font-medium">{s.callerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.direction} · {s.status} · {s.subject}
                        </div>
                      </li>
                    ))}
                    {calls.length === 0 ? (
                      <li className="text-muted-foreground">No calls yet. Use the public line or arm a lead.</li>
                    ) : null}
                  </ul>
                </div>

                <div>
                  <h3 className="text-[11px] tracking-[0.16em] text-brass uppercase">Guava customization</h3>
                  <dl className="mt-3 space-y-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">set_persona</dt>
                      <dd className="mt-0.5">
                        {t.agentName} for {t.name}. Cap: {t.authority.maxConcession}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">opening (read_script)</dt>
                      <dd className="mt-0.5">{t.openingScript || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">language_mode</dt>
                      <dd className="mt-0.5">
                        {t.languages.primary}
                        {t.languages.secondary.length ? ` / ${t.languages.secondary.join(", ")}` : " only"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">set_task inbound / outbound</dt>
                      <dd className="mt-0.5">
                        In: {t.inboundBrief || "—"}
                        <br />
                        Out: {t.outboundBrief || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">must refuse</dt>
                      <dd className="mt-0.5">{t.authority.cannotDo.join("; ") || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">DocumentQA</dt>
                      <dd className="mt-0.5">{t.knowledge.map((d) => d.title).join(", ") || "none yet"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">intents</dt>
                      <dd className="mt-0.5">{t.intents.map((i) => i.label).join(", ") || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">fields</dt>
                      <dd className="mt-0.5">{t.fields.map((f) => f.key).join(", ") || "—"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
      {tenants.length === 0 ? (
        <p className="py-8 text-muted-foreground">No tenants yet. Sign up a business.</p>
      ) : null}
    </div>
  );
}
