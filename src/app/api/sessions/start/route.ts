import { NextResponse } from "next/server";
import { ensureStore, getTenant } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureStore();
  const body = (await req.json()) as { tenantSlug?: string };
  const tenant = getTenant(body.tenantSlug ?? "");
  if (!tenant) return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
  return NextResponse.json(
    {
      error:
        "Pact does not simulate voice. Open the public line and talk through the Guava widget. The desk fills from live ingest.",
      line: `/line/${tenant.slug}`,
    },
    { status: 409 },
  );
}
