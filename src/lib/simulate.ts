import { applyOnboardFields } from "./onboard";
import { addLine, getSession, getTenant, patchSession, upsertTenant } from "./store";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function say(
  sessionId: string,
  role: "caller" | "agent" | "system",
  text: string,
  extra?: { language?: string; translated?: string; delay?: number },
) {
  await sleep(extra?.delay ?? 900);
  const session = getSession(sessionId);
  if (!session || session.status === "ended") return false;
  if (session.pendingWhisper && role === "agent") {
    const whisper = session.pendingWhisper;
    patchSession(sessionId, {
      pendingWhisper: null,
      status: session.status === "escalated" ? "live" : session.status,
    });
    addLine(sessionId, {
      role: "system",
      text: `Operator whisper applied: “${whisper}”`,
    });
    addLine(sessionId, {
      role: "agent",
      text: whisper,
    });
    return true;
  }
  addLine(sessionId, {
    role,
    text,
    language: extra?.language,
    translated: extra?.translated,
  });
  return true;
}

function setField(sessionId: string, key: string, value: string) {
  const session = getSession(sessionId);
  if (!session) return;
  patchSession(sessionId, { fields: { ...session.fields, [key]: value } });
}

export async function runInboundSimulation(sessionId: string) {
  const session = getSession(sessionId);
  const tenant = session ? getTenant(session.tenantSlug) : null;
  if (!session || !tenant) return;

  patchSession(sessionId, { status: "live" });

  if (tenant.vertical === "logistics") {
    await runHarborInbound(sessionId);
    return;
  }

  await say(sessionId, "agent", tenant.openingScript, { delay: 400 });
  await say(sessionId, "caller", "Hi — hail wrecked my roof last Sunday. I need this paid. And don't start with the deductible.");
  setField(sessionId, "loss_type", "hail");
  setField(sessionId, "loss_date", "2026-08-23");
  await say(
    sessionId,
    "agent",
    "I'm sorry you're dealing with that. I can open a first notice of loss on this call. Who am I speaking with, and what's the policy number?",
  );
  await say(sessionId, "caller", "Daniel Reyes. Policy NS-44108.");
  setField(sessionId, "caller_name", "Daniel Reyes");
  setField(sessionId, "policy_number", "NS-44108");
  patchSession(sessionId, { callerName: "Daniel Reyes" });
  await say(
    sessionId,
    "agent",
    "Thank you, Daniel. Policy NS-44108. Hail is covered under comprehensive. Your comprehensive deductible is $1,000 — I can't waive it. I can open the claim, book an adjuster, and I have a $150 goodwill toward that deductible if we get photos uploaded today.",
  );
  await say(
    sessionId,
    "caller",
    "A thousand dollars? That's a joke. Waive it. I want a manager. Now.",
  );
  patchSession(sessionId, { status: "escalated" });
  await say(
    sessionId,
    "system",
    "Caller asked for a person. Agent stayed on the line (send_instruction, not transfer). Waiting on the desk.",
    { delay: 500 },
  );
  await say(
    sessionId,
    "agent",
    "I'm keeping you on this line with me. A licensed operator is on the desk. I won't transfer you into a void.",
  );

  // Wait for an operator whisper, then close. If none arrives, continue with the default authority line.
  const deadline = Date.now() + 18000;
  while (Date.now() < deadline) {
    const live = getSession(sessionId);
    if (!live || live.status === "ended") return;
    if (live.pendingWhisper) {
      await say(sessionId, "agent", ""); // whisper interceptor
      break;
    }
    await sleep(400);
  }

  const after = getSession(sessionId);
  if (!after || after.status === "ended") return;
  if (!after.transcript.some((l) => l.role === "system" && l.text.startsWith("Operator whisper"))) {
    await say(
      sessionId,
      "agent",
      "I can apply $150 toward the deductible. I still cannot waive it. If you upload photos today I can hold Thursday 10:30 for the adjuster.",
    );
  }

  setField(sessionId, "outcome", "goodwill_offered");
  await say(sessionId, "caller", "Fine. Book Thursday. But I want that $150 in writing.");
  await say(
    sessionId,
    "agent",
    "Thursday 10:30 is held. Claim FNOL-9182 is open. You'll get the $150 goodwill confirmation by email in the next few minutes, and a link to upload photos. Is there anything else?",
  );
  await say(sessionId, "caller", "That's it.");
  await say(sessionId, "agent", "Take care, Daniel. We'll be on the roof Thursday.");
  patchSession(sessionId, { status: "ended", endedAt: new Date().toISOString() });
}

async function runHarborInbound(sessionId: string) {
  await say(sessionId, "agent", "Harbor Lane Freight, this is Grace. This line is recorded. Are you calling about an appointment, a container, or a detention bill?");
  await say(sessionId, "caller", "Detention on TCLU 4491827. Your driver sat two extra days. I'm not paying $300.");
  setField(sessionId, "container", "TCLU4491827");
  setField(sessionId, "issue", "detention");
  await say(
    sessionId,
    "agent",
    "I have TCLU 4491827. Tariff is $150 a day after free time. I can grant one free day if the terminal cut a window we can prove. I cannot waive ocean-carrier demurrage, and I cannot erase both days without a supervisor.",
  );
  await say(sessionId, "caller", "Then get a supervisor. This is a $40,000/month account.");
  patchSession(sessionId, { status: "escalated" });
  await say(sessionId, "system", "Escalation. Agent still on the call. Waiting for a whisper.");
  const deadline = Date.now() + 16000;
  while (Date.now() < deadline) {
    const live = getSession(sessionId);
    if (!live || live.status === "ended") return;
    if (live.pendingWhisper) {
      await say(sessionId, "agent", "");
      break;
    }
    await sleep(400);
  }
  setField(sessionId, "caller_name", "Soma Import Co.");
  const after = getSession(sessionId);
  if (!after || after.status === "ended") return;
  if (!after.transcript.some((l) => l.role === "system" && l.text.startsWith("Operator whisper"))) {
    await say(
      sessionId,
      "agent",
      "One free day applied. Remaining detention is $150. I can also move Friday's appointment to 09:00 without a change fee. Deal?",
    );
  }
  await say(sessionId, "caller", "Deal. Send the credit.");
  patchSession(sessionId, { status: "ended", endedAt: new Date().toISOString() });
}

export async function runOutboundSimulation(sessionId: string) {
  const session = getSession(sessionId);
  const tenant = session ? getTenant(session.tenantSlug) : null;
  if (!session || !tenant) return;

  patchSession(sessionId, { status: "ringing" });
  await say(sessionId, "system", "Outbound WebRTC stand-in. Production uses call_phone / Campaigns + reach_person after number approval.", { delay: 300 });
  await sleep(700);
  patchSession(sessionId, { status: "live" });

  const spanish = session.language === "spanish";

  if (spanish) {
    await say(
      sessionId,
      "agent",
      "Hola, ¿hablo con Priya Shah? Soy Grace de Northstar Mutual, le llamo por su reclamo de granizo.",
      { language: "spanish", translated: "Hi, is this Priya Shah? I'm Grace from Northstar Mutual, calling about your hail claim." },
    );
    await say(
      sessionId,
      "caller",
      "Sí, soy Priya. ¿Puede seguir en español?",
      { language: "spanish", translated: "Yes, this is Priya. Can you keep going in Spanish?" },
    );
    await say(
      sessionId,
      "system",
      "set_language_mode primary=spanish. Transcripts stay in the spoken language; the desk shows the English gloss.",
    );
    await say(
      sessionId,
      "agent",
      "Por supuesto. Su deducible es de mil dólares. No puedo eximirlo. Si sube las fotos hoy, puedo aplicar 150 dólares de cortesía y agendar al ajustador el jueves.",
      {
        language: "spanish",
        translated:
          "Of course. Your deductible is one thousand dollars. I cannot waive it. If you upload photos today, I can apply $150 goodwill and book the adjuster Thursday.",
      },
    );
    await say(
      sessionId,
      "caller",
      "Está bien. Jueves está bien. Gracias.",
      { language: "spanish", translated: "Okay. Thursday is fine. Thank you." },
    );
    setField(sessionId, "outcome", "goodwill_offered");
    patchSession(sessionId, { status: "ended", endedAt: new Date().toISOString() });
    return;
  }

  await say(
    sessionId,
    "agent",
    `Hi, is this ${session.callerName}? I'm Grace with ${tenant.name}. I have two minutes about your ${session.subject.toLowerCase()}.`,
  );
  await say(sessionId, "caller", "Yeah, that's me. Make it fast — the renewal letter is aggressive.");
  await say(
    sessionId,
    "agent",
    "Your premium went from $2,042 to $2,410 after the March glass claim. I can apply an 8% loyalty credit — $192.80 — if we keep the policy in force. I cannot go higher without a supervisor on this desk.",
  );
  await say(sessionId, "caller", "I got a quote at $1,980 next door. Beat it or I'm gone.");
  patchSession(sessionId, { status: "escalated" });
  await say(sessionId, "system", "Ask is below the public quote and above 8%. Agent stayed. Waiting on the desk.");

  const deadline = Date.now() + 16000;
  while (Date.now() < deadline) {
    const live = getSession(sessionId);
    if (!live || live.status === "ended") return;
    if (live.pendingWhisper) {
      await say(sessionId, "agent", "");
      break;
    }
    await sleep(400);
  }

  const after = getSession(sessionId);
  if (!after || after.status === "ended") return;
  if (!after.transcript.some((l) => l.role === "system" && l.text.startsWith("Operator whisper"))) {
    await say(
      sessionId,
      "agent",
      "I can do the 8% credit. I can't match $1,980 on this call. If you stay, I'll also waive the $25 glass-endorsement fee on the next term.",
    );
  }
  await say(sessionId, "caller", "I'll think about it. Email me the 8% in writing.");
  setField(sessionId, "outcome", "renewal_saved");
  patchSession(sessionId, { status: "ended", endedAt: new Date().toISOString() });
}

export async function runOnboardSimulation(sessionId: string) {
  const session = getSession(sessionId);
  const tenant = session ? getTenant(session.tenantSlug) : null;
  if (!session || !tenant) return;

  patchSession(sessionId, { status: "live", callerName: "Founder", subject: "Onboarding intake" });
  await say(
    sessionId,
    "agent",
    `I'm Pact. I'll set up ${tenant.name} from this call — what you sell, what I may concede, and what I must never do. Nobody transfers you off this line.`,
    { delay: 400 },
  );
  await say(
    sessionId,
    "caller",
    `We're ${tenant.name}. We need inbound questions and outbound follow-ups handled without giving away the store.`,
  );
  setField(
    sessionId,
    "purpose",
    `Help callers for ${tenant.name} inside published authority. Capture the ask. Escalate with a whisper, never a transfer.`,
  );
  await say(sessionId, "agent", "What's the most you want me to concede without a human typing in my ear?");
  await say(sessionId, "caller", "Small goodwill only. Never waive the core fee. Never admit liability.");
  setField(sessionId, "max_concession", "Modest goodwill only — operator whisper for anything larger.");
  setField(sessionId, "cannot_do", "Waive core fees; Admit liability; Invent policy");
  await say(sessionId, "agent", "And the first sentence I should say when someone hits your web line?");
  await say(sessionId, "caller", `This is ${tenant.name}. How can I help you today?`);
  setField(sessionId, "greeting", `This is ${tenant.name}. How can I help you today?`);
  await say(
    sessionId,
    "agent",
    "That's enough to stand up your desk. I'll save this as your playbook. You can change inbound, outbound, and whispers from the CRM.",
  );

  const live = getSession(sessionId);
  const fresh = getTenant(tenant.slug);
  if (live && fresh) {
    upsertTenant(applyOnboardFields(fresh, live.fields));
  }
  patchSession(sessionId, { status: "ended", endedAt: new Date().toISOString() });
}
