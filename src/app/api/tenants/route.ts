import { NextResponse } from "next/server";
import { ensureStore, listTenants } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureStore();
  return NextResponse.json({ tenants: listTenants() });
}
