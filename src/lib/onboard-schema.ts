import type { Intent, KnowledgeDoc, PlaybookField, Tenant } from "./types";

/** Voice interview. Fields are skippable; a single dump should fill many at once. */
export const ONBOARD_FIELDS: PlaybookField[] = [
  {
    key: "what_you_sell",
    fieldType: "text",
    description:
      "What the business sells or handles. Extract from a dump if they already said it. Do not re-ask. Skip if they skip.",
    required: false,
  },
  {
    key: "inbound_jobs",
    fieldType: "text",
    description:
      "Why people call in. Extract from their dump if present. Skip if they skip.",
    required: false,
  },
  {
    key: "outbound_jobs",
    fieldType: "text",
    description:
      "Why the desk dials out. Extract from their dump if present. Skip if they skip.",
    required: false,
  },
  {
    key: "greeting",
    fieldType: "text",
    description:
      "Recorded opening line. Invent a short one from the business name only if they skip.",
    required: false,
  },
  {
    key: "agent_name",
    fieldType: "text",
    description: "Name the agent should use. Skip defaults to Grace.",
    required: false,
  },
  {
    key: "max_concession",
    fieldType: "text",
    description: "The most the agent may offer without a whisper. Skip if they skip.",
    required: false,
  },
  {
    key: "cannot_do",
    fieldType: "text",
    description: "Hard refusals. Extract from the dump. Skip if they skip.",
    required: false,
  },
  {
    key: "escalate_when",
    fieldType: "text",
    description: "When to wait for an operator whisper. Skip if they skip.",
    required: false,
  },
  {
    key: "capture_fields",
    fieldType: "text",
    description: "Facts to capture on live calls. Extract if they listed them. Skip if they skip.",
    required: false,
  },
  {
    key: "knowledge_notes",
    fieldType: "text",
    description:
      "Every policy, tariff, price, script, or fact they stated that the agent may quote. If they dumped a long explanation, put the leftover facts here — do not discard them. Skip only if they gave nothing to quote.",
    required: false,
  },
];

export const ONBOARD_REQUIRED = ONBOARD_FIELDS.filter((f) => f.required).map((f) => f.key);

function splitList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[;\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function intentsFromJobs(raw: string, action: Intent["action"]): Intent[] {
  return splitList(raw).map((label, i) => ({
    id: `${action}_${i}_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24)}`,
    label,
    description: label,
    action,
  }));
}

function fieldsFromCapture(raw: string): PlaybookField[] {
  const items = splitList(raw);
  if (items.length === 0) {
    return [
      { key: "caller_name", fieldType: "text", description: "Caller name", required: true },
      { key: "callback", fieldType: "text", description: "Callback number or email", required: false },
    ];
  }
  return items.map((label) => ({
    key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 32) || "field",
    fieldType: "text" as const,
    description: label,
    required: true,
  }));
}

export function applyOnboardFields(tenant: Tenant, fields: Record<string, string>): Tenant {
  const what = fields.what_you_sell?.trim() || tenant.purpose;
  const inboundJobs = fields.inbound_jobs?.trim() || "";
  const outboundJobs = fields.outbound_jobs?.trim() || "";
  const greeting =
    fields.greeting?.trim() ||
    tenant.openingScript ||
    `This is ${fields.agent_name?.trim() || tenant.agentName} at ${tenant.name}. How can I help you today?`;
  const agentName = fields.agent_name?.trim() || tenant.agentName;
  const maxConcession =
    fields.max_concession?.trim() || tenant.authority.maxConcession || "None until an operator sets it.";
  const cannotDo = splitList(fields.cannot_do);
  const escalateWhen =
    fields.escalate_when?.trim() ||
    tenant.authority.notes ||
    "If they ask above the cap or for a person, stay on the line and wait for a whisper.";
  const knowledgeChunks = [
    fields.knowledge_notes,
    fields.what_you_sell,
    inboundJobs,
    outboundJobs,
    maxConcession,
    fields.cannot_do,
    escalateWhen,
    fields.capture_fields,
    fields.greeting,
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  const knowledge = [...new Set(knowledgeChunks)].join("\n\n") || undefined;
  const inboundBrief =
    fields.inbound_jobs?.trim() ||
    tenant.inboundBrief ||
    "Handle inbound callers inside published authority. Capture the checklist. Escalate instead of conceding.";
  const outboundBrief =
    fields.outbound_jobs?.trim() ||
    tenant.outboundBrief ||
    "On pickup, state why you called, complete the checklist, negotiate inside the cap.";

  const inboundIntents = intentsFromJobs(inboundJobs, "collect");
  const outboundIntents = intentsFromJobs(outboundJobs, "negotiate");
  const playbookFields = fieldsFromCapture(fields.capture_fields ?? "");

  const docs: KnowledgeDoc[] = knowledge
    ? [
        {
          id: "doc_onboard",
          title: `${tenant.name} playbook`,
          body: knowledge,
        },
      ]
    : tenant.knowledge;

  const purpose = `${what} Inbound: ${inboundBrief}. Outbound: ${outboundBrief}`;
  const persona = `You are ${agentName} for ${tenant.name}. ${what} You never invent facts — quote the knowledge library. You negotiate inside this cap: ${maxConcession}. You must refuse: ${cannotDo.join("; ") || tenant.authority.cannotDo.join("; ")}. When ${escalateWhen}, stay on the line and wait for send_instruction. Never transfer.`;

  return {
    ...tenant,
    agentName,
    purpose,
    openingScript: greeting,
    persona,
    inboundBrief,
    outboundBrief,
    authority: {
      maxConcession,
      cannotDo: cannotDo.length ? cannotDo : tenant.authority.cannotDo,
      notes: escalateWhen,
    },
    intents: [...inboundIntents, ...outboundIntents].length
      ? [...inboundIntents, ...outboundIntents]
      : tenant.intents,
    fields: playbookFields,
    knowledge: docs,
    negotiationMoves: [
      `Stay inside: ${maxConcession}`,
      `Refuse: ${(cannotDo.length ? cannotDo : tenant.authority.cannotDo).join("; ")}`,
      `Escalate when: ${escalateWhen}`,
    ],
    onboardComplete: true,
    webrtcCode: tenant.webrtcCode.startsWith("grtc-") ? tenant.webrtcCode : `local-${tenant.slug}`,
  };
}

export function onboardReady(fields: Record<string, string>) {
  const filled = Object.values(fields).filter((v) => Boolean(v?.trim())).length;
  return Boolean(fields.what_you_sell?.trim() || fields.knowledge_notes?.trim() || filled >= 2);
}
