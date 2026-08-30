"use client";

import Link from "next/link";
import { GuavaWidget } from "@/components/guava-widget";
import { formatInboundDisplay, PACT_INBOUND_E164 } from "@/lib/platform-schema";
import type { Session, Tenant } from "@/lib/types";

export function PlatformHero({
  tenant,
  sessions,
}: {
  tenant: Tenant;
  sessions: Session[];
}) {
  const number = tenant.inboundPhone || PACT_INBOUND_E164;
  const live = sessions.filter((s) => s.status !== "ended");
  return (
    <section className="border-y border-border py-10">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-brass uppercase">Pact inbound</p>
          <h2 className="font-serif mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
            This number is Pact.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Anyone who dials it is an inbound customer of the platform — a business that wants an AI
            voice desk — not a caller for Northstar or Harbor. The agent qualifies them, answers how
            Pact works, books a callback, or stands up a tenant from what they say.
          </p>
          <p className="mt-6 font-mono text-2xl tracking-tight text-foreground">{formatInboundDisplay(number)}</p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">{number} · Guava listen_phone on the Pact agent only</p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/line/pact" className="no-underline transition-colors hover:text-brass">
              Web line (same agent)
            </Link>
            <Link href="/app/pact" className="no-underline transition-colors hover:text-brass">
              Pact operator desk
            </Link>
          </div>
          {live.length ? (
            <p className="mt-4 text-sm">
              {live.length} live on the Pact line
              {live[0]?.callerName ? ` · ${live[0].callerName}` : ""}
            </p>
          ) : null}
        </div>
        <div>
          <h3 className="text-[11px] tracking-[0.16em] text-brass uppercase">Same agent in the browser</h3>
          <p className="mt-3 mb-6 text-sm text-muted-foreground">
            Judges who will not dial PSTN can use the orb. It is the Pact sales agent, not a tenant desk.
          </p>
          <GuavaWidget webrtcCode={tenant.webrtcCode} name="Pact" color={tenant.brandColor} />
        </div>
      </div>
    </section>
  );
}
