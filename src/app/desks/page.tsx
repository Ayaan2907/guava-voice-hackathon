import Link from "next/link";
import { PlatformHero } from "@/components/platform-hero";
import { TenantsBoard } from "@/components/tenants-board";
import { SiteHeader } from "@/components/site-header";
import { ensureStore, getPlatformTenant, listCustomerTenants, listSessions } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DesksPage() {
  await ensureStore();
  const platform = getPlatformTenant();
  const tenants = listCustomerTenants();
  const sessions = listSessions();
  const pactSessions = platform ? listSessions(platform.slug) : [];
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
        <p className="text-[11px] tracking-[0.22em] text-brass uppercase">Platform</p>
        <h1 className="font-serif mt-3 text-4xl font-medium tracking-tight sm:text-5xl">Pact</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Pact sells voice desks. The phone number below is ours. Customer companies below each have
          a web line and an operator dashboard. They do not share this DID.
        </p>
        {platform ? <PlatformHero tenant={platform} sessions={pactSessions} /> : null}
        <h2 className="font-serif mt-14 text-2xl font-medium tracking-tight">Customer desks</h2>
        <p className="mt-2 mb-8 max-w-xl text-sm text-muted-foreground">
          Each row is a different Guava Agent. Public inbound is{" "}
          <code className="font-mono text-xs">/line/{"{slug}"}</code>. Operator home is{" "}
          <code className="font-mono text-xs">/app/{"{slug}"}</code>.
        </p>
        <TenantsBoard tenants={tenants} sessions={sessions} />
        <p className="mt-10">
          <Link href="/signup" className="text-sm no-underline transition-colors duration-200 hover:text-brass">
            Sign up another business →
          </Link>
        </p>
      </main>
    </div>
  );
}
