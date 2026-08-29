import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { listTenants } from "@/lib/store";
import { VERTICAL_LABELS } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default function DesksPage() {
  const tenants = listTenants();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-4xl">Every tenant is a desk</h1>
        <p className="mt-3 text-muted-foreground">
          Same binary. Different JSON. Open a console or the public line.
        </p>
        <ul className="mt-8 space-y-3">
          {tenants.map((t) => (
            <li key={t.slug} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-2xl">{t.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {VERTICAL_LABELS[t.vertical]}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
              <p className="mt-2 font-mono text-xs">{t.webrtcCode}</p>
              <div className="mt-3 flex gap-4 text-sm">
                <Link href={`/desk/${t.slug}`}>Desk</Link>
                <Link href={`/line/${t.slug}`}>Public line</Link>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <Link href="/onboard">Start another desk →</Link>
        </p>
      </main>
    </div>
  );
}
