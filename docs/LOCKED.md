# Pact — locked idea

**Status:** LOCKED · 29 Aug 2026  
**Event:** Guava Voice AI Hackathon Build Night SF

---

## One sentence

**Pact is a multi-tenant negotiation desk** — any business signs up, gets an inbound web line and an outbound queue, and an operator who can whisper without taking the call. Insurance is the demo. The product is the desk.

---

## What we are selling (not building)

| Ship | Do not ship |
|------|-------------|
| A platform any business can turn on | A single FNOL voice agent |
| Signup → playbook + docs + authority → live line | A prompt demo with no tenancy |
| Operator desk (whisper, fields, RAG, outbound queue) | Glass-box supervisor as the whole product |
| Multi-tenant: new business = config, not code | Wing Mic wrap, AdvanceIQ / Power BI chat |

---

## Niche

**Demo vertical: insurance** — FNOL inbound, renewal outbound, deductible vs goodwill. Real negotiation, Guava’s vertical, brutal back-and-forth.

**Same product, other templates on signup:** healthcare intake, logistics detention, e-commerce returns.

**Seeded tenants in the app:** Northstar Mutual (insurance), Harbor Lane Freight (logistics).

---

## Two surfaces

1. **Public line** — `/line/[slug]`  
   Website inbound. Guava WebRTC widget when `webrtcCode` is `grtc-…`. Built-in simulator until a key/code is pasted.

2. **Operator desk** — `/desk/[slug]`  
   Live transcript, structured fields, playbook, DocumentQA library, whisper box, outbound leads, language gloss.

---

## The three capabilities (combined)

1. **Business brain** — persona, opening script, intents, authority caps, knowledge docs (RAG).
2. **Negotiation loop** — `set_task` + Field, agent trades inside authority, escalates when ask exceeds cap.
3. **Human-in-the-loop without transfer** — operator types → `send_instruction` → agent speaks. Caller never leaves the AI line. No `transfer()` for HITL (no 3-way audio).

**Bilingual (fold-in):** `set_language_mode` + English gloss on desk for Spanish callers. Voice: `grace`. HITRUST/PCI: EN+ES only.

---

## Multi-tenant model

Guava has no tenant API. Pact owns tenancy:

- **Tenant JSON:** slug, persona, authority, intents, fields, knowledge, leads, webrtc code, brand.
- **One Expert process:** `Runner.listen_webrtc(agent, code)` per tenant.
- **Signup:** POST `/api/tenants/create` → template copied → desk + line URLs immediately.

---

## Guava APIs we use

`Agent`, `Runner`, `listen_webrtc`, `Client.create_webrtc_agent`, widget `guava-widget.js`, `set_persona`, `read_script`, `set_task`, `Field`, `add_info`, `send_instruction`, `set_language_mode`, `on_question` + `DocumentQA(namespace=slug)`, `on_action_requested` / `on_action`, `on_caller_speech`, `on_agent_speech`, `on_escalate` (or `human_please` action), later `reach_person` / `call_phone` / `Campaigns`.

**Refuse tonight:** `transfer()` as supervisor path, Campaigns/SMS/phone without approval, Conversations API for live desk (post-call only), invented REST.

**Footguns:** remounting the widget kills WebRTC; if `on_action_requested` is implemented, caller-triggered `on_escalate` is disabled — handle “human please” as an action.

---

## Outbound (honest)

**Tonight:** lead queue UI + WebRTC stand-in / simulator (Priya = Spanish gloss).  
**Production:** same Agent + `call_phone` or `Campaigns` + `reach_person` after number approval.

---

## 90-second demo loop (locked)

1. Homepage — “Not a voice agent. A desk any business can turn on.”
2. **Onboard** a fake clinic (20s) — proves tenancy.
3. **Two windows:** `/line/northstar` + `/desk/northstar`. Inbound hail claim → “I want a manager” → whisper **$150 goodwill, do not waive** → fields fill → call ends without transfer.
4. **Outbound** Maria (renewal) or Priya (Spanish + EN gloss).
5. **Switch tenant** to Harbor Lane — detention/container copy, same product.

At the venue: `guava login`, paste `grtc-` codes in Line tab, `python expert/main.py`.

---

## Stack (locked)

- **Control plane:** Next.js 15, TypeScript, Tailwind, shadcn/ui
- **Voice Expert:** Python `guava-sdk`, one Runner, many agents
- **Tonight’s channel:** WebRTC only

---

## Repo

Browse: https://cursor.com/codebase/ayaan2907/guava-voice-hackathon  
Design detail: [pact-design.md](./pact-design.md)
