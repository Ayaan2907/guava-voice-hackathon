import { NextResponse } from "next/server";
import { ONBOARD_FIELDS } from "@/lib/onboard-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    fields: ONBOARD_FIELDS,
    objective:
      "Onboard this business. If they dump everything in one turn, extract every checklist field from that speech and confirm in one short recap — do not walk the list. Only ask what is still missing. If they say skip, skip remaining fields and complete. Put leftover facts into knowledge_notes so DocumentQA can quote them. Do not handle a customer complaint on this call.",
  });
}
