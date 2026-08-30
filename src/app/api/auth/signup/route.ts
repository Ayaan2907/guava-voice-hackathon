import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { ensureStore, getTenant, getUserByEmail, newId, upsertTenant, upsertUser } from "@/lib/store";
import { slugify } from "@/lib/slug";
import { templateFor } from "@/lib/templates";
import type { Vertical } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    email?: string;
    password?: string;
    name?: string;
    city?: string;
    vertical?: Vertical;
  };
  await ensureStore();
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();
  if (!email || !password || !name) {
    return NextResponse.json({ error: "Email, password, and business name are required." }, { status: 400 });
  }
  if (getUserByEmail(email)) {
    return NextResponse.json({ error: "That email already has a desk." }, { status: 409 });
  }

  let slug = slugify(name);
  if (slug === "pact" || getTenant(slug)) slug = `${slug}-${newId("x").slice(-4)}`;
  const vertical: Vertical = body.vertical ?? "custom";
  const tenant = templateFor(vertical, name, slug);
  if (body.city) tenant.city = body.city.trim();
  tenant.id = newId("tenant");
  tenant.onboardComplete = false;
  upsertTenant(tenant);
  upsertUser({
    id: newId("user"),
    email,
    password,
    orgSlug: slug,
  });
  await setSessionCookie(email, slug);
  return NextResponse.json({ slug, onboardComplete: false });
}
