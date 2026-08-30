import { NextResponse } from "next/server";
import { PLATFORM_SALES_FIELDS, PLATFORM_SALES_OBJECTIVE } from "@/lib/platform-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    objective: PLATFORM_SALES_OBJECTIVE,
    fields: PLATFORM_SALES_FIELDS,
  });
}
