import type { PlaybookField, Vertical } from "./types";

export const PACT_PLATFORM_SLUG = "pact";

export const PACT_INBOUND_E164 = "+14842951236";

export function formatInboundDisplay(e164: string) {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}

/** Inbound callers on the Pact DID are buying a desk, not calling a tenant. */
export const PLATFORM_SALES_FIELDS: PlaybookField[] = [
  {
    key: "contact_name",
    fieldType: "text",
    description: "Caller name. Extract if they already said it. Skip if they skip.",
    required: false,
  },
  {
    key: "company_name",
    fieldType: "text",
    description: "Business they want a voice desk for. Extract from a dump. Skip if they skip.",
    required: false,
  },
  {
    key: "industry",
    fieldType: "text",
    description: "Insurance, logistics, clinic, retail, or their words. Skip if they skip.",
    required: false,
  },
  {
    key: "contact_email",
    fieldType: "text",
    description: "Email to send the desk login. Skip if they skip.",
    required: false,
  },
  {
    key: "callback_phone",
    fieldType: "text",
    description: "Number to call them back on. Skip if they skip.",
    required: false,
  },
  {
    key: "inbound_jobs",
    fieldType: "text",
    description: "Why their customers would call the desk. Extract or skip.",
    required: false,
  },
  {
    key: "outbound_jobs",
    fieldType: "text",
    description: "Why their desk would dial out. Extract or skip.",
    required: false,
  },
  {
    key: "authority_notes",
    fieldType: "text",
    description: "What the agent may concede and what it must refuse. Skip if they skip.",
    required: false,
  },
  {
    key: "next_step",
    fieldType: "multiple_choice",
    description: "What they want after this call.",
    required: false,
    choices: ["stand_up_desk", "book_callback", "questions_only"],
  },
];

export const PLATFORM_SALES_OBJECTIVE =
  "You are Pact selling AI voice desks to businesses. Qualify the caller, answer how the product works, book a callback, or stand up a desk from what they tell you. Prefer one dump. Skip means move on. You are not handling a tenant's end-customer complaint.";

export function verticalFromIndustry(raw: string | undefined): Vertical {
  const s = (raw || "").toLowerCase();
  if (/(insur|claim|fnol|policy)/.test(s)) return "insurance";
  if (/(clinic|health|patient|prior.?auth)/.test(s)) return "healthcare";
  if (/(freight|logist|dray|detention|container)/.test(s)) return "logistics";
  if (/(e-?comm|retail|return|shopify|merchant)/.test(s)) return "ecommerce";
  return "custom";
}
