import { NextResponse } from "next/server";
import { getTenant, newId, upsertTenant } from "@/lib/store";
import { templateFor } from "@/lib/templates";
import type { Vertical } from "@/lib/types";

export const dynamic = "force-dynamic";

function slugify(name: string) {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return s || "desk";
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    vertical?: Vertical;
    city?: string;
    webrtcCode?: string;
  };
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  }
  const vertical: Vertical = body.vertical ?? "custom";
  let slug = slugify(name);
  if (getTenant(slug)) slug = `${slug}-${newId("x").slice(-4)}`;
  const tenant = templateFor(vertical, name, slug);
  if (body.city) tenant.city = body.city.trim();
  if (body.webrtcCode?.trim()) tenant.webrtcCode = body.webrtcCode.trim();
  tenant.id = newId("tenant");
  upsertTenant(tenant);
  return NextResponse.json({ tenant });
}
