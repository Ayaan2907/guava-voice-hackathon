import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-serif text-3xl">No desk on this slug</h1>
        <p className="mt-3 text-muted-foreground">
          Tenants are created on signup. Northstar and Harbor Lane ship with the app.
        </p>
        <p className="mt-6">
          <Link href="/app/northstar">Open Northstar dashboard</Link>
          {" · "}
          <Link href="/onboard">Start a desk</Link>
        </p>
      </main>
    </div>
  );
}
