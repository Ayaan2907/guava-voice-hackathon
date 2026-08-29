# Pact — LOCKED

**Rank:** #01 · Platform + Guava-native  
**Event:** Guava Voice AI Hackathon · Build Night SF · 29 Aug 2026 · 5:30–9:30 PM PT  
**Status:** LOCKED — ship this, not a one-off voice agent

---

## Tagline

**Multi-tenant negotiation desk — inbound line + outbound queue + operator whisper on Guava's Dialog System.**

> *"Every business gets a desk: playbook, policy library, authority caps, and a human who can steer the call without taking the audio."*

---

## What it is

**Pact** is a SaaS-shaped control plane any business can sign up for:

1. **Onboard** — name + vertical template (insurance, healthcare, logistics, e-commerce, custom).
2. **Configure** — persona, opening script, intents, Field checklist, DocumentQA docs, negotiation authority (what they may concede / must never say), outbound leads.
3. **Inbound** — public web line (`/line/[slug]`) via Guava WebRTC widget (later `listen_phone` on an assigned number).
4. **Outbound** — lead queue on the desk; same Agent brain when someone picks up.
5. **Operator desk** — live transcript, structured fields, playbook panel, **whisper** → `send_instruction` (agent stays on the call; operator is not on the audio).

**Demo vertical:** insurance (Northstar Mutual — FNOL in, renewal out, deductible vs $150 goodwill).  
**Second tenant (proves multi-tenancy):** Harbor Lane Freight — detention tariff, not insurance copy-paste.  
**Platform story:** signup a clinic in 20 seconds → same product, new JSON.

---

## Why this wins (not a voice-agent demo)

| Judges see | Generic FNOL bot | Pact |
|---|---|---|
| Product | One prompt, one tenant | Sign up → desk → line → whisper |
| Guava gap | They market "one log" | We ship the supervisor console they don't |
| Negotiation | Scripted intake | Authority cap vs angry caller; operator types the concession |
| Multi-tenant | N/A | Northstar + Harbor + Bay Clinic in one binary |
| Compliance story | Redaction theater only | Stay on line (no bad `transfer`), EN/ES gloss, recorded opening |

Guava sells insurance FNOL, healthcare intake, collections. Pact is the **desk** those verticals plug into — config, not codebase.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Pact (Next.js) — multi-tenant control plane                │
│  /onboard  /desk/[slug]  /line/[slug]  SSE + /api/ingest    │
└───────────────────────────┬─────────────────────────────────┘
                            │ whisper POST · speech ingest
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Python Expert — guava.Runner (one process)                 │
│  Agent(northstar).listen_webrtc("grtc-…")                   │
│  Agent(harbor).listen_webrtc("grtc-…")                      │
│  … per tenant from Tenant JSON                              │
└───────────────────────────┬─────────────────────────────────┘
                            │ WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Guava Dialog System — STT · LLM · TTS (cascaded)           │
└─────────────────────────────────────────────────────────────┘
```

**Tenant object (ours, not Guava's):** slug, persona, openingScript, authority, intents[], fields[], knowledge[], leads[], webrtcCode.

**Per-call loop:**

- `on_call_start` → `set_persona`, `read_script`, `add_info(playbook)`, `set_language_mode`, `set_task` + Fields
- `on_question` → `DocumentQA(namespace=slug)`
- `on_caller_speech` / `on_agent_speech` → POST `/api/ingest` → desk SSE
- `on_action("human_please")` → `send_instruction` + desk **escalated** — **never `transfer()`**
- Operator types → POST `/whisper` → Expert → `call.send_instruction(text)`

---

## Guava APIs — USE

| Job | API |
|---|---|
| Many tenants, one process | `Runner.listen_webrtc(agent, code)` |
| Website inbound | `guava-widget.js` + `webrtc-code="grtc-…"` |
| Codes | `Client.create_webrtc_agent()` or dashboard |
| Identity + playbook | `set_persona`, `read_script`, `add_info` |
| Structured negotiation | `set_task`, `Field` |
| RAG | `on_question` + `DocumentQA(documents, namespace=slug)` |
| Human-in-the-loop | `send_instruction` (whisper) |
| Bilingual | `set_language_mode`, `on_caller_speech` (desk shows EN gloss) |
| Escalation | `on_action("human_please")` or `on_escalate` → stay on line |
| Outbound (post-approval) | `reach_person`, `call_phone`, `Campaigns` |

---

## Guava APIs — REFUSE TONIGHT

- **`transfer()` as HITL** — bridges call away; no 3-way; operator cannot speak into same audio
- **Campaigns / SMS / `listen_phone`** without event approval
- **Conversations API** for live desk (post-call only)
- **Invented REST** to create agents
- **Widget remount** on SPA navigation (kills WebRTC; dedicated `/line` route only)
- **Wing Mic wrap**, AdvanceIQ / Power BI chat

**Caveat:** if `on_action_requested` is implemented, caller-triggered `on_escalate` is disabled — handle "human please" as an action.

**HITRUST/PCI:** EN + ES only. Non-English voice: `grace`.

---

## Clock plan (4 hours · 5:30–9:30 PM)

| Block | Time | Deliverable |
|---|---|---|
| **Already shipped** | — | Next app, 2 tenants, simulator, desk UI, whisper, onboard, Expert stub |
| **Venue setup** | 5:30–6:00 | `guava login`, `GUAVA_API_KEY`, paste 2× `grtc-` codes in desk Line tab |
| **Live voice** | 6:00–7:00 | `python expert/main.py`, widget on `/line/northstar`, ingest wired |
| **Demo hardening** | 7:00–8:00 | Rehearse 90s loop twice; Priya Spanish outbound; Harbor inbound |
| **Polish + submit** | 8:00–9:15 | README, 60s screen recording, deploy URL if possible |
| **Buffer** | 9:15–9:30 | Wi‑Fi / key / widget debug |

**Do not spend time on:** auth, billing, Postgres, second component library, real phone outbound.

---

## Demo script (60–90s)

**0:00–0:15 — Platform, not agent**  
Homepage → *"Not a voice agent. A desk any business can turn on."*

**0:15–0:30 — Tenancy**  
`/onboard` → "Bay Clinic" · healthcare → lands on `/desk/bay-clinic`. Same console as Northstar.

**0:30–0:55 — Inbound + whisper (hero)**  
Two windows: `/line/northstar` + `/desk/northstar`. Hail FNOL. Caller: *"Waive the deductible. I want a manager."*  
Desk goes **escalated**. Operator whispers: *"$150 goodwill. Do not waive. Book Thursday 10:30."*  
Agent speaks it. Fields fill. **No transfer.**

**0:55–1:15 — Outbound + bilingual**  
Desk → Outbound → **Priya Shah**. Spanish on the line, English gloss on the desk.

**1:15–1:25 — Second vertical**  
Switch to **Harbor Lane** → detention on TCLU container. Same product, different tariff JSON.

**Close:** *"Guava runs the voice. Pact is what you sell to the next business — signup, config, line, desk."*

---

## How you win

1. **Sell the platform** — signup + two tenants + whisper in one repo.
2. **Fill Guava's marketing gap** — live supervisor / one-log console (they only have post-call Conversations API).
3. **Real negotiation** — $1,000 deductible vs $150 cap; renewal +18% vs 8% loyalty.
4. **Honest about outbound** — WebRTC stand-in tonight; `Campaigns` on the roadmap slide, not faked as live dialer.
5. **Clean stack** — Node Expert is wrong; Python Expert + Next console matches docs.

---

## Fallbacks

| Failure | Fallback |
|---|---|
| No `GUAVA_API_KEY` at door | Built-in simulator — full desk + whisper loop (already works) |
| Widget won't connect | Desk "Simulate inbound" + narrate widget URL for judges after |
| One `grtc-` code only | Demo Northstar live; Harbor stays simulator |
| Expert crash | Next.js simulator only; show `expert/main.py` in README |
| SSE drops | Refresh desk; sessions in memory |

---

## Fold-ins (already in product — do NOT split into separate apps)

- **Glass Box / supervisor console** → `/desk/[slug]` (transcript, fields, playbook)
- **Operator Whisper** → whisper box → `send_instruction`
- **Babel Operator** → Spanish lines + EN gloss on desk
- **Warm Brief** → playbook + authority panel (escalation context via `add_info`)
- **DocumentQA / RAG** → knowledge tab + `on_question`

---

## Repo map (what to open at the venue)

| Path | Purpose |
|---|---|
| `npm run dev` → `:43147` | Control plane |
| `/desk/northstar` | Operator console (dark) |
| `/line/northstar` | Inbound caller |
| `/onboard` | Signup theater |
| `expert/main.py` | Guava Runner + ingest |
| `docs/locked-brief.md` | This file |
| `archive/brief-v1/` | Old 7-idea static site (historical) |

---

## Locked decision

**Ship Pact.** Insurance demo. Multi-tenant signup. Whisper without transfer. WebRTC tonight. No pivot to single-tenant FNOL, no Wing Mic, no AdvanceIQ.

*Locked 29 Aug 2026.*
