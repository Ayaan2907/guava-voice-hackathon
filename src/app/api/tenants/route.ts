import { NextResponse } from "next/server";
import { listTenants } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tenants: listTenants() });
}
