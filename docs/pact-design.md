# Pact Design — negotiation desk platform
Date: 2026-08-29
Event: Guava Voice AI Hackathon Build Night SF

## One-line

Pact is a multi-tenant negotiation desk. Any business signs up, gets an inbound web line and an outbound queue, and an operator who can whisper without taking the call. Insurance is the demo tenant. The product we sell is the desk.

## Why this, not a single voice agent

A one-off FNOL agent is a demo. A desk that Northstar Mutual, Harbor Lane Freight, and a clinic signed up for in the same binary is a company. Judges should see: onboard → config → live line, not "watch my prompt."

## Niche

**Demo vertical: insurance** (FNOL inbound, renewal outbound, deductible/goodwill fights). Matches Guava's own insurance story and has a real negotiation (cap vs ask).

**Same object, other templates:** healthcare intake, logistics detention, e-commerce returns. Signup copies a template. No new Expert per customer.

## Two surfaces

1. **Public line** `/line/[slug]` — website inbound. Guava widget when `webrtcCode` starts with `grtc-`. Simulator otherwise so the desk is demoable without a key.
2. **Operator desk** `/desk/[slug]` — live transcript, fields, playbook, knowledge, whisper, outbound leads.

## What is multi-tenant

Guava does not have tenants. Pact does:

- Tenant JSON: persona, opening script, authority, intents, Field list, DocumentQA docs, leads, webrtc code.
- One Python process: `Runner.listen_webrtc(agent, code)` per tenant.
- New business = POST `/api/tenants/create`. No deploy per customer.

## Guava APIs (real)

Use: Agent, Runner, listen_webrtc, Client.create_webrtc_agent, widget `guava-widget.js` + `webrtc-code`, set_persona, read_script, set_task, Field, add_info, send_instruction, set_language_mode, on_question + DocumentQA(namespace=slug), on_action_requested / on_action, on_caller_speech, on_agent_speech, on_escalate, reach_person / Campaigns / call_phone later.

Refuse tonight: `transfer()` as HITL (bridges audio away; no 3-way), Campaigns/SMS/phone without approval, Conversations API as a live supervisor feed (post-call only), invented REST to create agents.

If `on_action_requested` is implemented, caller-triggered `on_escalate` is disabled — handle "human please" as an action (`human_please` → send_instruction).

Widget must not remount. Official embed guides remove the script on cleanup; that kills WebRTC. The public line is a dedicated route and leaves the script in place.

HITRUST/PCI language: English + Spanish. Non-English voice: `grace` only.

## Tonight vs production outbound

Tonight: lead → "Place call" → WebRTC stand-in / simulator (second browser as the customer, or Priya's Spanish gloss in-app).

Production: same Agent, `call_phone` or `Runner.attach_campaign`, `reach_person` on answer, then the same task/playbook.

## Demo loop (90 seconds)

1. Homepage: "not a voice agent."
2. Onboard a fake clinic (proves tenancy).
3. Two windows: `/line/northstar` + `/desk/northstar`. Start inbound. Wait for "I want a manager." Whisper $150. Fields fill. Do not transfer.
4. Outbound Maria (renewal) or Priya (Spanish gloss on the desk).
5. Switch tenant to Harbor Lane without restarting a new product.
