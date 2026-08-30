import Link from "next/link";
import { TenantsBoard } from "@/components/tenants-board";
import { SiteHeader } from "@/components/site-header";
import { ensureStore, listSessions, listTenants } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DesksPage() {
  await ensureStore();
  const tenants = listTenants();
  const sessions = listSessions();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
        <p className="text-[11px] tracking-[0.22em] text-brass uppercase">Platform</p>
        <h1 className="font-serif mt-3 text-4xl font-medium tracking-tight sm:text-5xl">All tenants</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          This is the monitor for every desk on Pact. Each row is a different Guava Agent:
          persona, greeting, language, checklist, and DocumentQA. Click a tenant for its
          public line, live calls, and what we inject on the call.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Operator home for one business is <code className="font-mono text-xs">/app/{"{slug}"}</code>.
          Public inbound is <code className="font-mono text-xs">/line/{"{slug}"}</code>.
        </p>
        <div className="mt-10">
          <TenantsBoard tenants={tenants} sessions={sessions} />
        </div>
        <p className="mt-10">
          <Link href="/signup" className="text-sm no-underline transition-colors duration-200 hover:text-brass">
            Sign up another business →
          </Link>
        </p>
      </main>
    </div>
  );
}
