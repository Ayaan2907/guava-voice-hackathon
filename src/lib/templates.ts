import type { Tenant, Vertical } from "./types";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const VERTICAL_LABELS: Record<Vertical, string> = {
  insurance: "Insurance",
  healthcare: "Healthcare",
  logistics: "Logistics / import-export",
  ecommerce: "E-commerce",
  custom: "Custom desk",
};

export const VERTICAL_BLURBS: Record<Vertical, string> = {
  insurance:
    "FNOL, renewals, deductibles, goodwill. The agent negotiates inside a published authority. Operators whisper when the number is too high.",
  healthcare:
    "Intake, prior-auth status, scheduling. The agent never invents coverage. Operators approve exceptions.",
  logistics:
    "Detention, demurrage, appointment windows. The agent trades time for fees using the tenant playbook.",
  ecommerce:
    "Returns, price-match, damaged goods. The agent holds the line, then books a replacement.",
  custom:
    "Blank desk. You paste the business, the intents, and the documents. Same inbound line and outbound queue.",
};

const now = () => new Date().toISOString();

export function northstarMutual(): Tenant {
  return {
    id: "tenant_northstar",
    slug: "northstar",
    name: "Northstar Mutual",
    vertical: "insurance",
    city: "Oakland, CA",
    tagline: "Personal auto & homeowners. Claims in, renewals out.",
    agentName: "Grace",
    voice: "grace",
    brandColor: "#1f4d3a",
    languages: { primary: "english", secondary: ["spanish"] },
    webrtcCode: "local-northstar",
    inboundPhone: "",
    outboundFromNumber: "",
    openingScript:
      "This call may be recorded for quality and claim handling. You're speaking with Grace at Northstar Mutual. How can I help you today?",
    persona:
      "You are Grace, a calm, precise negotiator for Northstar Mutual. You never invent coverage. You never waive a deductible. You can offer goodwill only inside the published authority. You keep the caller on the line even when a human operator joins — you speak their words, they do not take the call.",
    purpose:
      "Handle inbound claims and policy questions, and run outbound renewal retention. Capture structured fields, answer from the policy library, and negotiate inside authority.",
    authority: {
      maxConcession:
        "Up to $150 goodwill toward a deductible, or 8% loyalty credit on a renewal. Never both on the same call without operator approval.",
      cannotDo: [
        "Waive a deductible",
        "Bind a new policy",
        "Admit liability",
        "Promise a claim payment amount",
        "Offer more than 8% off renewal without an operator whisper",
      ],
      notes:
        "If the caller asks for a person, stay on the line and wait. Do not transfer. An operator will type instructions; speak them as your own.",
    },
    intents: [
      {
        id: "fnol",
        label: "First notice of loss",
        description: "Open a claim, capture loss facts, book an adjuster.",
        action: "collect",
      },
      {
        id: "coverage_question",
        label: "Coverage question",
        description: "Answer only from the policy library (DocumentQA).",
        action: "answer",
      },
      {
        id: "deductible_fight",
        label: "Deductible / goodwill",
        description: "Negotiate inside $150. Escalate above that.",
        action: "negotiate",
      },
      {
        id: "renewal_retention",
        label: "Renewal retention",
        description: "Keep the policy. Loyalty credit up to 8%.",
        action: "negotiate",
      },
      {
        id: "book_adjuster",
        label: "Book adjuster",
        description: "Offer calendar slots for inspection.",
        action: "book",
      },
      {
        id: "human_please",
        label: "Ask for a person",
        description: "Escalate to the desk. Do not transfer the audio.",
        action: "human_please",
      },
    ],
    fields: [
      {
        key: "caller_name",
        fieldType: "text",
        description: "Caller's full name as they want it on the claim",
        required: true,
      },
      {
        key: "policy_number",
        fieldType: "text",
        description: "Policy number, letters and digits. Read it back.",
        required: true,
      },
      {
        key: "loss_type",
        fieldType: "multiple_choice",
        description: "Type of loss",
        required: true,
        choices: ["hail", "wind", "collision", "theft", "water", "other"],
      },
      {
        key: "loss_date",
        fieldType: "date",
        description: "Date the loss occurred",
        required: true,
      },
      {
        key: "outcome",
        fieldType: "multiple_choice",
        description: "How the negotiation closed",
        required: false,
        choices: [
          "claim_opened",
          "goodwill_offered",
          "renewal_saved",
          "escalated",
          "no_agreement",
        ],
      },
    ],
    knowledge: [
      {
        id: "auto-2026",
        title: "Personal auto — 2026 California",
        body: `Northstar Mutual Personal Auto, CA 2026.
Comprehensive covers hail, wind, theft, and fire. Collision covers at-fault and not-at-fault vehicle damage when the collision endorsement is active.
Standard comprehensive deductible is $1,000. Collision deductible is $500 unless the declarations page lists otherwise.
Glass: windshield repair has $0 deductible; replacement follows the comprehensive deductible.
Rental reimbursement: $40/day, 30-day maximum, only if the endorsement is on the declarations.
We never waive a deductible. Goodwill toward a deductible requires a licensed operator and is capped at $150 unless a desk supervisor types a higher number into the live call.
Liability admissions are forbidden. Say: "Your claim will be reviewed. I can't confirm payment on this call."
FNOL: we need name, policy number, loss type, loss date, and a callback number. Photos can be uploaded at northstar.example/claims.
Adjuster inspections for hail are typically offered within 3 business days.`,
      },
      {
        id: "renewal-rules",
        title: "Renewal retention desk",
        body: `Renewal letters go out 45 days before term.
If the premium rose because of a claim, say so plainly. Do not hide the surcharge.
Loyalty credit: 8% of the renewal premium, once per term, only if the policy has been in force 12 months with no lapse.
Stacking loyalty credit with a deductible goodwill is not allowed on the same call.
If the caller asks for more than 8%, stay on the line and wait for an operator whisper. Do not invent a larger discount.
Non-pay lapse: we can reinstate within 14 days with payment plus a $25 fee. After 14 days, treat as new business — you cannot bind it on this call; book a licensed agent callback.`,
      },
    ],
    negotiationMoves: [
      "Name the constraint before the concession: 'The deductible stays. I can apply $150 toward it.'",
      "Trade, don't gift: photos uploaded today → faster adjuster slot.",
      "If they ask for a manager, do not transfer. Pause, then speak the operator's line.",
      "Read back numbers. Never round a premium.",
      "Spanish: switch with set_language_mode. Keep field keys in English.",
    ],
    leads: [
      {
        id: "lead_maria",
        name: "Maria Chen",
        phone: "+1 510 555 0142",
        language: "english",
        reason: "Renewal +18% after a glass claim",
        context:
          "HO-3 Oakland. In force 4 years. Renewal premium $2,410, was $2,042. One windshield replacement in March. Eligible for 8% loyalty ($192.80).",
        status: "queued",
      },
      {
        id: "lead_james",
        name: "James Okonkwo",
        phone: "+1 415 555 0190",
        language: "english",
        reason: "Payment lapse, day 6",
        context:
          "Personal auto. Cancel pending for non-pay. Reinstatement still allowed (inside 14 days) with payment + $25.",
        status: "queued",
      },
      {
        id: "lead_priya",
        name: "Priya Shah",
        phone: "+1 408 555 0177",
        language: "spanish",
        reason: "Hail FNOL follow-up, prefers Spanish",
        context:
          "Called yesterday in English, asked to continue in Spanish. Policy NS-88219. Hail 8/24. Deductible $1,000. Photos not yet uploaded.",
        status: "queued",
      },
    ],
    inboundEnabled: true,
    outboundEnabled: true,
    onboardComplete: true,
    inboundBrief: "Handle inbound callers. Capture the checklist. Negotiate inside the cap.",
    outboundBrief: "On pickup, say why you called, complete the checklist, stay inside the cap.",
    pendingCall: null,
    createdAt: now(),
  };
}

export function harborLane(): Tenant {
  return {
    id: "tenant_harbor",
    slug: "harbor-lane",
    name: "Harbor Lane Freight",
    vertical: "logistics",
    city: "Long Beach, CA",
    tagline: "Drayage, appointments, detention. The dock does not wait.",
    agentName: "Grace",
    voice: "grace",
    brandColor: "#1c3d5a",
    languages: { primary: "english", secondary: ["spanish"] },
    webrtcCode: "local-harbor-lane",
    inboundPhone: "",
    outboundFromNumber: "",
    openingScript:
      "Harbor Lane Freight, this is Grace. This line is recorded. Are you calling about an appointment, a container, or a detention bill?",
    persona:
      "You are Grace for Harbor Lane Freight. You are brisk, fair, and numeric. You do not invent free days. You can trade appointment moves against detention using the published tariff.",
    purpose:
      "Take inbound disputes and run outbound appointment confirmations. Capture container and bill-of-lading fields. Negotiate detention inside authority.",
    authority: {
      maxConcession:
        "One free day of detention or a $75 appointment-change fee waiver — not both — without an operator.",
      cannotDo: [
        "Waive demurrage billed by the ocean carrier",
        "Guarantee a same-day gate move after 14:00",
        "Change a bonded container without customs docs",
      ],
      notes: "Operator can authorize a second free day by whisper. Stay on the call.",
    },
    intents: [
      {
        id: "detention",
        label: "Detention dispute",
        description: "Argue free days vs. tariff. Trade, don't erase.",
        action: "negotiate",
      },
      {
        id: "appointment",
        label: "Appointment window",
        description: "Book or move a terminal appointment.",
        action: "book",
      },
      {
        id: "tracking",
        label: "Container status",
        description: "Answer from the operations library.",
        action: "answer",
      },
    ],
    fields: [
      {
        key: "caller_name",
        fieldType: "text",
        description: "Shipper or broker name",
        required: true,
      },
      {
        key: "container",
        fieldType: "text",
        description: "Container number, four letters plus seven digits",
        required: true,
      },
      {
        key: "issue",
        fieldType: "multiple_choice",
        description: "Why they called",
        required: true,
        choices: ["detention", "appointment", "tracking", "other"],
      },
    ],
    knowledge: [
      {
        id: "tariff",
        title: "Harbor Lane detention tariff 2026",
        body: `Free time: 24 hours after last-free-day notified by email.
Detention: $150 per day, calendar days, capped at 7 days then layover review.
Appointment change: $75 if more than 4 hours before the window; $150 inside 4 hours.
We cannot waive ocean-carrier demurrage. Say so in the first minute.
One free detention day may be granted if the terminal cut a window we can prove.
After 14:00 local, same-day in-gate is not offered.`,
      },
    ],
    negotiationMoves: [
      "Quote the tariff line before any concession.",
      "Trade a moved appointment for a waived change fee, not for demurrage.",
      "If they threaten to pull the account, escalate. Do not freelance a second free day.",
    ],
    leads: [
      {
        id: "lead_soma",
        name: "Soma Import Co.",
        phone: "+1 562 555 0118",
        language: "english",
        reason: "Confirm Thursday 09:00 pickup, TCLU 4491827",
        context: "Regular shipper. Two no-shows last month. Be firm on the window.",
        status: "queued",
      },
    ],
    inboundEnabled: true,
    outboundEnabled: true,
    onboardComplete: true,
    inboundBrief: "Handle inbound callers. Capture the checklist. Negotiate inside the cap.",
    outboundBrief: "On pickup, say why you called, complete the checklist, stay inside the cap.",
    pendingCall: null,
    createdAt: now(),
  };
}

export function templateFor(vertical: Vertical, name: string, slug: string): Tenant {
  const base = {
    insurance: () => {
      const t = northstarMutual();
      t.id = id("tenant");
      t.slug = slug;
      t.name = name;
      t.webrtcCode = `local-${slug}`;
      t.leads = [];
      t.createdAt = now();
      return t;
    },
    healthcare: (): Tenant => ({
      id: id("tenant"),
      slug,
      name,
      vertical: "healthcare",
      city: "",
      tagline: "Intake, scheduling, prior-auth status — never invented coverage.",
      agentName: "Grace",
      voice: "grace",
      brandColor: "#3d4a3a",
      languages: { primary: "english", secondary: ["spanish"] },
      webrtcCode: `local-${slug}`,
      inboundPhone: "",
      outboundFromNumber: "",
      openingScript:
        "This is a recorded clinical-administrative line. I'm Grace. I can help with scheduling and prior-auth status. I cannot give medical advice.",
      persona:
        "You are Grace for a clinic front desk. Warm, exact, never clinical. You do not guess whether a procedure is covered.",
      purpose:
        "Inbound intake and outbound appointment reminders. Capture patient identifiers. Book slots. Escalate coverage fights.",
      authority: {
        maxConcession: "One courtesy reschedule fee waiver per 90 days.",
        cannotDo: [
          "Give medical advice",
          "Confirm a procedure is covered",
          "Share another patient's information",
        ],
        notes: "Prior-auth: read only what is in the knowledge docs. Otherwise book a benefits callback.",
      },
      intents: [
        {
          id: "intake",
          label: "New patient intake",
          description: "Name, DOB, reason for visit, insurance card last-4 only.",
          action: "collect",
        },
        {
          id: "schedule",
          label: "Schedule",
          description: "Offer calendar slots.",
          action: "book",
        },
        {
          id: "prior_auth",
          label: "Prior-auth status",
          description: "Answer from the auth library or escalate.",
          action: "answer",
        },
      ],
      fields: [
        {
          key: "caller_name",
          fieldType: "text",
          description: "Patient name",
          required: true,
        },
        {
          key: "reason",
          fieldType: "text",
          description: "Reason for visit in their words",
          required: true,
        },
      ],
      knowledge: [
        {
          id: "hours",
          title: "Clinic hours and no-show",
          body: "Open Mon–Fri 8:00–17:00. No-show fee $50, waived once per 90 days. Prior-auth status is never guessed.",
        },
      ],
      negotiationMoves: [
        "If they argue coverage, do not improvise. Escalate.",
        "Trade a morning slot for a waived no-show only if the knowledge doc allows it.",
      ],
      leads: [],
      inboundEnabled: true,
      outboundEnabled: true,
      onboardComplete: true,
      inboundBrief: "Handle inbound callers. Capture the checklist. Negotiate inside the cap.",
      outboundBrief: "On pickup, say why you called, complete the checklist, stay inside the cap.",
      pendingCall: null,
      createdAt: now(),
    }),
    logistics: () => {
      const t = harborLane();
      t.id = id("tenant");
      t.slug = slug;
      t.name = name;
      t.webrtcCode = `local-${slug}`;
      t.leads = [];
      t.createdAt = now();
      return t;
    },
    ecommerce: (): Tenant => ({
      id: id("tenant"),
      slug,
      name,
      vertical: "ecommerce",
      city: "",
      tagline: "Returns, damage, price-match. The agent holds the margin line.",
      agentName: "Grace",
      voice: "grace",
      brandColor: "#4a3728",
      languages: { primary: "english", secondary: ["spanish"] },
      webrtcCode: `local-${slug}`,
      inboundPhone: "",
      outboundFromNumber: "",
      openingScript:
        "Thanks for calling. This is Grace. I can help with an order, a return, or a damaged shipment.",
      persona:
        "You are Grace for a merchant desk. Helpful, not soft. You do not stack discounts. You offer a replacement or store credit inside authority.",
      purpose:
        "Inbound post-purchase and outbound restock outreach. Capture order id. Negotiate returns.",
      authority: {
        maxConcession: "15% store credit or free return label — not both — without an operator.",
        cannotDo: [
          "Refund outside the 30-day window without a whisper",
          "Price-match a marketplace listing you cannot verify",
        ],
        notes: "Damaged-in-transit: always offer replacement first, refund second.",
      },
      intents: [
        {
          id: "return",
          label: "Return",
          description: "Window, condition, label.",
          action: "negotiate",
        },
        {
          id: "damage",
          label: "Damaged goods",
          description: "Replacement vs refund.",
          action: "negotiate",
        },
      ],
      fields: [
        {
          key: "order_id",
          fieldType: "text",
          description: "Order number",
          required: true,
        },
        {
          key: "ask",
          fieldType: "multiple_choice",
          description: "What they want",
          required: true,
          choices: ["refund", "replacement", "store_credit", "other"],
        },
      ],
      knowledge: [
        {
          id: "returns",
          title: "Returns policy",
          body: "30 days, unused, with tags. Free label on damaged goods. 15% courtesy credit if they keep a cosmetic-damage item.",
        },
      ],
      negotiationMoves: [
        "Offer replacement before refund on damage.",
        "Do not stack 15% credit with a free label unless an operator whispers it.",
      ],
      leads: [],
      inboundEnabled: true,
      outboundEnabled: true,
      onboardComplete: true,
      inboundBrief: "Handle inbound callers. Capture the checklist. Negotiate inside the cap.",
      outboundBrief: "On pickup, say why you called, complete the checklist, stay inside the cap.",
      pendingCall: null,
      createdAt: now(),
    }),
    custom: (): Tenant => ({
      id: id("tenant"),
      slug,
      name,
      vertical: "custom",
      city: "",
      tagline: "Your desk. Your docs. Same inbound line and outbound queue.",
      agentName: "Grace",
      voice: "grace",
      brandColor: "#2c2a26",
      languages: { primary: "english", secondary: [] },
      webrtcCode: `local-${slug}`,
      inboundPhone: "",
      outboundFromNumber: "",
      openingScript: `This is ${name}. How can I help you today?`,
      persona: `You represent ${name}. Stay inside the playbook. Do not invent policy.`,
      purpose: "Inbound questions and outbound follow-ups for this business.",
      authority: {
        maxConcession: "None until an operator sets it.",
        cannotDo: ["Promise anything not in the knowledge library"],
        notes: "Paste documents in the desk. Until then, collect the ask and book a callback.",
      },
      intents: [
        {
          id: "help",
          label: "Help",
          description: "Understand what they need and capture it.",
          action: "collect",
        },
      ],
      fields: [
        {
          key: "caller_name",
          fieldType: "text",
          description: "Caller name",
          required: true,
        },
        {
          key: "ask",
          fieldType: "text",
          description: "What they need, in their words",
          required: true,
        },
      ],
      knowledge: [],
      negotiationMoves: ["If it is not in the docs, say so and escalate."],
      leads: [],
    inboundEnabled: true,
    outboundEnabled: true,
    onboardComplete: false,
    inboundBrief: "",
    outboundBrief: "",
    pendingCall: null,
    createdAt: now(),
    }),
  };

  return base[vertical]();
}

export function seedTenants(): Tenant[] {
  return [northstarMutual(), harborLane()];
}
