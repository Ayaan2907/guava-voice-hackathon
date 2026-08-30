import { NextResponse } from "next/server";
import { provisionTenantFromSales } from "@/lib/platform";
import { ensureStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureStore();
  const secret = req.headers.get("x-pact-secret");
  if (secret !== (process.env.PACT_INGEST_SECRET ?? "dev-secret")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { fields?: Record<string, string> };
  const tenant = provisionTenantFromSales(body.fields ?? {});
  if (!tenant) {
    return NextResponse.json({ ok: false, reason: "Need a company name to stand up a desk." });
  }
  return NextResponse.json({
    ok: true,
    tenant,
    line: `/line/${tenant.slug}`,
    desk: `/app/${tenant.slug}`,
  });
}
