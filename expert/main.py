"""
Pact Expert — one process, many tenants.

Guava has no tenant API. This process is the tenancy: one Agent per desk.

Channels:
  Runner.listen_webrtc(agent, grtc-code)  — in-browser line
  Runner.listen_phone(agent, +E.164)       — dashboard number they pasted
  Agent.call_phone(from, to, variables)      — outbound PSTN

Call shape (documented APIs):
  inbound  → persona, language, one opening script, set_task (no second intro)
  outbound → persona, language, reach_person; on_reach_person sets the job
             without re-introducing. Do not pair with set_voicemail_action.
  questions → DocumentQA (one namespaced instance per tenant)
  human_please → send_instruction, never transfer()
"""

from __future__ import annotations

import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from envutil import load_repo_env

load_repo_env()

PACT_URL = os.environ.get("PACT_URL", "http://127.0.0.1:43147")
INGEST_SECRET = os.environ.get("PACT_INGEST_SECRET", "dev-secret")
WHISPER_PORT = int(os.environ.get("EXPERT_PORT", "18766"))
DEFAULT_FROM = (os.environ.get("GUAVA_AGENT_NUMBER") or "").strip()
HITRUST_LANGS = {"english", "spanish"}

LIVE_CALLS: dict[str, Any] = {}
CALL_TO_SESSION: dict[int, str] = {}
ATTACHED: set[str] = set()
AGENTS: dict[str, Any] = {}
PHONE_LISTEN: dict[str, str] = {}
QA_BY_SLUG: dict[str, Any] = {}
RUNTIME: dict[str, Any] = {"guava": None, "runner": None}


def pact_get(path: str) -> Any:
    with urllib.request.urlopen(f"{PACT_URL}{path}", timeout=5) as res:
        return json.loads(res.read().decode())


def pact_patch_tenant(slug: str, payload: dict[str, Any]) -> None:
    req = urllib.request.Request(
        f"{PACT_URL}/api/tenants/{slug}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="PATCH",
    )
    try:
        urllib.request.urlopen(req, timeout=5).read()
    except urllib.error.URLError as exc:
        print(f"[pact] tenant patch failed: {exc}")


def mint_webrtc_code() -> str:
    from guava import Client

    client = Client()
    return str(client.create_webrtc_agent(ttl=timedelta(hours=12)))


def pact_ingest(payload: dict[str, Any]) -> None:
    req = urllib.request.Request(
        f"{PACT_URL}/api/ingest",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "x-pact-secret": INGEST_SECRET,
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=3).read()
    except urllib.error.URLError as exc:
        print(f"[pact] ingest failed: {exc}")


def session_key(call: Any) -> str:
    ident = id(call)
    if ident not in CALL_TO_SESSION:
        CALL_TO_SESSION[ident] = f"guava_{ident}"
    return CALL_TO_SESSION[ident]


def to_e164(value: str) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None
    digits = "".join(c for c in raw if c.isdigit())
    if len(digits) < 10:
        return None
    if raw.startswith("+"):
        return "+" + digits
    if len(digits) == 10:
        return "+1" + digits
    if len(digits) == 11 and digits.startswith("1"):
        return "+" + digits
    return "+" + digits


def language_mode(langs: dict[str, Any] | None) -> tuple[str, list[str] | None]:
    langs = langs or {}
    primary = langs.get("primary") or "english"
    if primary not in HITRUST_LANGS:
        primary = "english"
    secondary = [
        x for x in (langs.get("secondary") or []) if x in HITRUST_LANGS and x != primary
    ]
    return primary, secondary or None


def knowledge_qa(current: dict[str, Any], DocumentQA: Any) -> Any:
    slug = current["slug"]
    docs = [d for d in (current.get("knowledge") or []) if d.get("body")]
    qa = QA_BY_SLUG.get(slug)
    if qa is None:
        ids = [str(d.get("id") or f"doc_{i}") for i, d in enumerate(docs)] or ["_empty"]
        bodies = [d["body"] for d in docs] or ["No documents loaded."]
        qa = DocumentQA(documents=bodies, ids=ids, namespace=slug)
        QA_BY_SLUG[slug] = qa
        return qa
    for doc in docs:
        qa.upsert_document(str(doc.get("id") or doc.get("title") or "doc"), doc["body"])
    return qa


def update_lead_status(slug: str, lead_id: str | None, status: str) -> None:
    if not lead_id:
        return
    try:
        current = fetch_tenant(slug)
    except Exception:
        return
    leads = current.get("leads") or []
    changed = False
    for lead in leads:
        if lead.get("id") == lead_id:
            lead["status"] = status
            changed = True
    if changed:
        pact_patch_tenant(slug, {"leads": leads})


class WhisperHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:
        print("[whisper]", fmt % args)

    def _json(self, code: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path in ("/health", "/"):
            self._json(
                200,
                {
                    "ok": True,
                    "calls": len(LIVE_CALLS),
                    "attached": sorted(ATTACHED),
                    "phones": PHONE_LISTEN,
                },
            )
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self._json(400, {"error": "invalid json"})
            return
        if self.path == "/whisper":
            session_id = body.get("sessionId")
            text = body.get("text") or ""
            call = LIVE_CALLS.get(session_id)
            if call is not None and text:
                call.send_instruction(text)
                pact_ingest(
                    {
                        "tenantSlug": body.get("tenantSlug"),
                        "sessionId": session_id,
                        "line": {"role": "system", "text": f"send_instruction: {text}"},
                    }
                )
            self._json(200, {"ok": True})
            return
        if self.path == "/mint":
            try:
                code = mint_webrtc_code()
                self._json(200, {"code": code})
            except Exception as exc:
                self._json(500, {"error": str(exc)})
            return
        if self.path == "/reload":
            try:
                sync_tenants()
                self._json(200, {"ok": True, "attached": sorted(ATTACHED), "phones": PHONE_LISTEN})
            except Exception as exc:
                self._json(500, {"error": str(exc)})
            return
        if self.path == "/dial":
            try:
                result = place_outbound(body)
                self._json(200, result)
            except ValueError as exc:
                self._json(400, {"error": str(exc)})
            except Exception as exc:
                self._json(500, {"error": str(exc)})
            return
        self.send_response(404)
        self.end_headers()


def start_whisper_server() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", WHISPER_PORT), WhisperHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(f"[pact] whisper server on http://127.0.0.1:{WHISPER_PORT}")


def fetch_tenant(slug: str) -> dict[str, Any]:
    tenants = pact_get("/api/tenants")["tenants"]
    for item in tenants:
        if item.get("slug") == slug:
            return item
    raise RuntimeError(f"tenant {slug} missing")


def place_outbound(body: dict[str, Any]) -> dict[str, Any]:
    slug = body.get("slug") or ""
    agent = AGENTS.get(slug)
    if agent is None:
        raise ValueError(f"No live agent for {slug}. Wait for Expert attach.")
    tenant = fetch_tenant(slug)
    from_number = to_e164(body.get("fromNumber") or tenant.get("outboundFromNumber") or tenant.get("inboundPhone") or DEFAULT_FROM)
    to_number = to_e164(body.get("toNumber") or "")
    if not from_number:
        raise ValueError("No from-number. Paste the Guava dashboard number on the Line tab.")
    if not to_number:
        raise ValueError("Lead phone is not a valid E.164 number.")
    contact_name = body.get("contactName") or "the account holder"
    lead_id = body.get("leadId") or ""
    agent.call_phone(
        from_number,
        to_number,
        variables={
            "contact_name": contact_name,
            "lead_id": lead_id,
            "tenant_slug": slug,
            "direction": "outbound",
            "reason": body.get("reason") or "",
        },
    )
    print(f"[pact] {slug} call_phone {from_number} → {to_number} ({contact_name})")
    return {"ok": True, "from": from_number, "to": to_number}


def onboard_schema() -> dict[str, Any]:
    try:
        return pact_get("/api/onboard/schema")
    except Exception:
        return {
            "objective": "Extract the playbook from a dump, or ask only what is missing. Skip means complete.",
            "fields": [
                {"key": "what_you_sell", "description": "What the business does. Extract from a dump. Skip if they skip.", "fieldType": "text", "required": False},
                {"key": "inbound_jobs", "description": "Inbound jobs. Extract or skip.", "fieldType": "text", "required": False},
                {"key": "outbound_jobs", "description": "Outbound jobs. Extract or skip.", "fieldType": "text", "required": False},
                {"key": "greeting", "description": "Opening script. Skip to invent a short one.", "fieldType": "text", "required": False},
                {"key": "max_concession", "description": "Authority cap. Skip if they skip.", "fieldType": "text", "required": False},
                {"key": "cannot_do", "description": "Hard refusals. Skip if they skip.", "fieldType": "text", "required": False},
                {"key": "escalate_when", "description": "When to wait for a whisper. Skip if they skip.", "fieldType": "text", "required": False},
                {"key": "capture_fields", "description": "Facts to capture. Skip if they skip.", "fieldType": "text", "required": False},
                {"key": "knowledge_notes", "description": "Facts the agent may quote. Put leftover dump text here.", "fieldType": "text", "required": False},
            ],
        }


def fields_from(call: Any, specs: list[dict[str, Any]]) -> dict[str, str]:
    out: dict[str, str] = {}
    for spec in specs:
        key = spec.get("key")
        if not key:
            continue
        val = call.get_field(key)
        if val is not None:
            out[key] = str(val)
    return out


def checklist(Field: Any, specs: list[dict[str, Any]]) -> list[Any]:
    items = []
    for spec in specs:
        kwargs: dict[str, Any] = {
            "key": spec["key"],
            "description": spec.get("description") or spec["key"],
            "field_type": spec.get("fieldType") or spec.get("field_type") or "text",
            "required": spec.get("required", True),
        }
        if spec.get("choices"):
            kwargs["choices"] = spec["choices"]
        items.append(Field(**kwargs))
    return items


def apply_persona(call: Any, current: dict[str, Any]) -> None:
    call.set_persona(
        organization_name=current["name"],
        agent_name=current.get("agentName") or "Grace",
        agent_purpose=current.get("persona") or current.get("purpose"),
        voice=current.get("voice") or "grace",
    )
    primary, secondary = language_mode(current.get("languages"))
    call.set_language_mode(primary=primary, secondary=secondary)
    call.add_info(
        "playbook",
        {
            "authority": current.get("authority"),
            "moves": current.get("negotiationMoves"),
            "intents": current.get("intents"),
            "inboundBrief": current.get("inboundBrief"),
            "outboundBrief": current.get("outboundBrief"),
        },
    )


def attach_tenant(guava: Any, runner: Any, tenant: dict[str, Any]) -> None:
    Agent = guava.Agent
    Field = guava.Field
    SuggestedAction = guava.SuggestedAction
    from guava.helpers.rag import DocumentQA

    slug = tenant["slug"]
    agent = Agent(
        name=tenant.get("agentName") or "Grace",
        organization=tenant["name"],
        purpose=tenant.get("purpose") or "",
    )

    def live_tenant() -> dict[str, Any]:
        try:
            return fetch_tenant(slug)
        except Exception:
            return tenant

    def lead_for(call: Any, current: dict[str, Any]) -> dict[str, Any] | None:
        lead_id = call.get_variable("lead_id") or (current.get("pendingCall") or {}).get("leadId")
        if not lead_id:
            return None
        return next((l for l in current.get("leads") or [] if l.get("id") == lead_id), None)

    def start_live_job(call: Any, current: dict[str, Any], outbound: bool, lead: dict[str, Any] | None) -> None:
        specs = current.get("fields") or []
        if outbound:
            name = (lead or {}).get("name") or call.get_variable("contact_name") or "them"
            reason = (lead or {}).get("reason") or call.get_variable("reason") or current.get("outboundBrief")
            objective = current.get("outboundBrief") or current.get("purpose")
            items: list[Any] = [
                f"You already introduced yourself. Do not greet again. Go straight to why you called {name}.",
                f"Job: {reason}" if reason else "Complete the outbound brief.",
                *checklist(Field, specs),
                "Confirm next steps. Answer questions from the knowledge library. Stay inside authority.",
            ]
        else:
            objective = current.get("inboundBrief") or current.get("purpose")
            items = checklist(Field, specs)
        call.set_task(
            f"{slug}_{'outbound' if outbound else 'inbound'}",
            objective=objective or "Help them inside published authority.",
            checklist=items,
        )

    @agent.on_call_start
    def on_call_start(call: Any) -> None:
        sid = session_key(call)
        LIVE_CALLS[sid] = call
        current = live_tenant()
        pending = current.get("pendingCall") or {}
        onboard = not current.get("onboardComplete")
        lead = lead_for(call, current)
        from_pstn = call.get_variable("direction") == "outbound"
        outbound = from_pstn or pending.get("direction") == "outbound"
        if outbound and not lead:
            lead = next(
                (
                    item
                    for item in (current.get("leads") or [])
                    if item.get("status") in ("queued", "dialing")
                ),
                None,
            )

        if pending:
            pact_patch_tenant(slug, {"pendingCall": None})

        if onboard:
            schema = onboard_schema()
            call.set_persona(
                organization_name="Pact",
                agent_name="Pact",
                agent_purpose=(
                    f"You are onboarding {current.get('name')}. Prefer one dump over a questionnaire. "
                    "If they tell you everything in one turn, extract every checklist field from that speech "
                    "and confirm in one short recap. Do not walk the list. Only ask what is still missing. "
                    "If they say skip, skip remaining fields and complete. "
                    "Put leftover facts into knowledge_notes. Do not handle a customer complaint."
                ),
                voice=current.get("voice") or "grace",
            )
            call.read_script(
                f"Pact setup for {current.get('name')}. You can tell me the whole business at once — "
                "what you sell, inbound, outbound, authority, and facts I may quote — or skip anything."
            )
            call.add_info("onboard_goal", schema.get("objective"))
            call.add_info(
                "onboard_rules",
                "Dump: fill many fields from one utterance. Skip: complete immediately. "
                "Never re-ask a fact they already gave.",
            )
            primary, secondary = language_mode(current.get("languages"))
            call.set_language_mode(primary=primary, secondary=secondary)
            call.set_task(
                f"{slug}_onboard",
                objective=schema.get("objective")
                or "Extract the playbook from a dump, or ask only what is missing. Skip means complete.",
                checklist=[
                    "If they dump several topics at once, fill those fields silently. Confirm once. Do not restart.",
                    "If they say skip, skip remaining fields and complete the task immediately.",
                    *checklist(Field, schema.get("fields") or []),
                ],
                completion_criteria=(
                    "Complete as soon as they have given a usable picture of the business, "
                    "OR they said skip / that's all / we're done, even if fields are empty."
                ),
            )
            pact_ingest(
                {
                    "tenantSlug": slug,
                    "sessionId": sid,
                    "kind": "onboard",
                    "status": "live",
                    "subject": "Onboarding intake",
                    "callerName": "Owner",
                }
            )
            return

        if outbound and not current.get("outboundEnabled"):
            call.hangup("Outbound is paused on this desk. Apologize and hang up.")
            return
        if not outbound and not current.get("inboundEnabled"):
            call.hangup("This inbound line is paused. Apologize and hang up.")
            return

        apply_persona(call, current)

        if outbound:
            contact = (lead or {}).get("name") or call.get_variable("contact_name") or "the person we need"
            call.set_variable("contact_name", contact)
            if lead:
                call.set_variable("lead_id", lead.get("id") or "")
                call.set_variable("reason", lead.get("reason") or "")
                call.add_info("lead", lead)
                lead_lang = lead.get("language")
                if lead_lang in HITRUST_LANGS:
                    other = "english" if lead_lang == "spanish" else "spanish"
                    call.set_language_mode(primary=lead_lang, secondary=[other] if other != lead_lang else None)
            call.add_info("direction", "outbound")
            call.add_info("outbound_brief", current.get("outboundBrief") or current.get("purpose"))
            # Widget roleplay: you are the lead. Do not leave voicemail. PSTN still can.
            reach_kwargs: dict[str, Any] = {}
            if from_pstn:
                reach_kwargs["voicemail_message"] = (
                    f"This is {current.get('agentName') or 'Grace'} from {current['name']}. "
                    "Please call us back when you can."
                )
            call.reach_person(contact_full_name=contact, **reach_kwargs)
            update_lead_status(slug, (lead or {}).get("id"), "dialing")
            pact_ingest(
                {
                    "tenantSlug": slug,
                    "sessionId": sid,
                    "kind": "call",
                    "direction": "outbound",
                    "status": "ringing",
                    "subject": (lead or {}).get("reason") or "Outbound",
                    "callerName": contact,
                    "leadId": (lead or {}).get("id"),
                }
            )
            return

        if current.get("openingScript"):
            call.read_script(current["openingScript"])
        call.add_info("direction", "inbound")
        call.add_info("inbound_brief", current.get("inboundBrief") or current.get("purpose"))
        call.add_info("knowledge_hint", "Answer policy questions only via the library.")
        start_live_job(call, current, outbound=False, lead=None)
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": sid,
                "kind": "call",
                "direction": "inbound",
                "status": "live",
                "subject": "Inbound line",
                "callerName": "Caller",
            }
        )

    @agent.on_reach_person
    def on_reach_person(call: Any, outcome: str) -> None:
        current = live_tenant()
        lead = lead_for(call, current)
        sid = session_key(call)
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": sid,
                "kind": "call",
                "direction": "outbound",
                "status": "live" if outcome == "available" else "ended",
                "line": {"role": "system", "text": f"reach_person: {outcome}"},
                "leadId": (lead or {}).get("id"),
            }
        )
        if outcome == "available":
            update_lead_status(slug, (lead or {}).get("id"), "live")
            start_live_job(call, current, outbound=True, lead=lead)
            return
        status = "no_answer"
        if outcome == "do_not_contact":
            status = "completed"
        update_lead_status(slug, (lead or {}).get("id"), status)
        hangup_by_outcome = {
            "unavailable": "Apologize that you missed them. Offer a callback. Hang up.",
            "voicemail": "You already left the voicemail. End the call.",
            "wrong_number": "Apologize for the wrong number. Hang up.",
            "do_not_contact": "Acknowledge the request. Do not call again. Hang up.",
        }
        call.hangup(hangup_by_outcome.get(outcome, "End the call politely."))

    @agent.on_outbound_failed
    def on_outbound_failed(call: Any, event: Any = None) -> None:
        current = live_tenant()
        lead = lead_for(call, current)
        update_lead_status(slug, (lead or {}).get("id"), "no_answer")
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": session_key(call),
                "kind": "call",
                "direction": "outbound",
                "status": "ended",
                "line": {"role": "system", "text": f"outbound failed: {event}"},
            }
        )

    @agent.on_caller_speech
    def on_caller_speech(call: Any, event: Any) -> None:
        current = live_tenant()
        specs = (onboard_schema().get("fields") or []) if not current.get("onboardComplete") else (current.get("fields") or [])
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": session_key(call),
                "kind": "onboard" if not current.get("onboardComplete") else "call",
                "line": {"role": "caller", "text": getattr(event, "utterance", str(event))},
                "fields": fields_from(call, specs),
            }
        )

    @agent.on_agent_speech
    def on_agent_speech(call: Any, event: Any) -> None:
        current = live_tenant()
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": session_key(call),
                "kind": "onboard" if not current.get("onboardComplete") else "call",
                "line": {"role": "agent", "text": getattr(event, "utterance", str(event))},
            }
        )

    @agent.on_question
    def on_question(call: Any, question: str) -> str:
        current = live_tenant()
        if not current.get("onboardComplete"):
            return (
                "This is setup. Extract from what they already said. "
                "If they asked to skip, complete the remaining fields as skipped."
            )
        answer = knowledge_qa(current, DocumentQA).ask(question)
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": session_key(call),
                "line": {"role": "system", "text": f"DocumentQA: {question}"},
            }
        )
        return answer

    def finish_task(call: Any, kind: str) -> None:
        current = live_tenant()
        onboard = kind == "onboard"
        specs = (onboard_schema().get("fields") or []) if onboard else (current.get("fields") or [])
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": session_key(call),
                "kind": "onboard" if onboard else "call",
                "taskComplete": True,
                "fields": fields_from(call, specs),
                "line": {
                    "role": "system",
                    "text": "Guava task complete. Fields written to the desk.",
                },
            }
        )
        if onboard:
            knowledge_qa(live_tenant(), DocumentQA)
            call.send_instruction(
                "Thank them. Say their inbound line and outbound queue will now use this playbook. "
                "They can hang up."
            )
        elif kind == "outbound":
            lead = lead_for(call, current)
            update_lead_status(slug, (lead or {}).get("id"), "completed")

    @agent.on_task_complete(f"{slug}_onboard")
    def on_onboard_complete(call: Any) -> None:
        finish_task(call, "onboard")

    @agent.on_task_complete(f"{slug}_inbound")
    def on_inbound_complete(call: Any) -> None:
        finish_task(call, "inbound")

    @agent.on_task_complete(f"{slug}_outbound")
    def on_outbound_complete(call: Any) -> None:
        finish_task(call, "outbound")

    def on_action_request_handler(call: Any, request: str) -> Any:
        if not live_tenant().get("onboardComplete"):
            return None
        lower = request.lower()
        if any(w in lower for w in ("human", "manager", "person", "supervisor", "agent")):
            return SuggestedAction(key="human_please")
        if any(w in lower for w in ("book", "appointment", "adjuster", "schedule")):
            return SuggestedAction(key="book")
        if any(w in lower for w in ("waive", "goodwill", "discount", "credit")):
            return SuggestedAction(key="negotiate")
        return None

    action_request = getattr(agent, "on_action_request", None) or getattr(
        agent, "on_action_requested", None
    )
    if action_request is not None:
        action_request(on_action_request_handler)

    @agent.on_action("human_please")
    def human_please(call: Any) -> None:
        call.send_instruction(
            "The caller asked for a person. Stay on this call. Do not transfer. "
            "Tell them a licensed operator is on the desk and will instruct you. "
            "Keep collecting fields while you wait."
        )
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": session_key(call),
                "status": "escalated",
            }
        )

    @agent.on_session_end
    def on_session_end(call: Any, event: Any = None) -> None:
        sid = session_key(call)
        pact_ingest({"tenantSlug": slug, "sessionId": sid, "status": "ended"})
        LIVE_CALLS.pop(sid, None)

    @agent.on_action("book")
    def book(call: Any) -> None:
        call.send_instruction("Offer the next concrete calendar slot from the playbook. Confirm date and time out loud.")

    @agent.on_action("negotiate")
    def negotiate(call: Any) -> None:
        current = live_tenant()
        auth = (current.get("authority") or {}).get("maxConcession") or ""
        cannot = (current.get("authority") or {}).get("cannotDo") or []
        call.send_instruction(
            f"Negotiate inside this cap: {auth}. You must refuse: {cannot}. "
            "If they ask above the cap, keep the call and wait for an operator whisper."
        )

    try:
        @agent.on_escalate
        def on_escalate(call: Any, event: Any = None) -> None:
            human_please(call)
    except Exception:
        pass

    AGENTS[slug] = agent
    code = tenant.get("webrtcCode") or ""
    if code.startswith("grtc-"):
        runner.listen_webrtc(agent, code)
        print(f"[pact] {slug} listening on {code}")
    else:
        runner.listen_webrtc(agent)
        print(f"[pact] {slug} has no grtc- code yet; Runner will print a generated one. Paste it in the desk.")
    ensure_phone(tenant)


def ensure_phone(tenant: dict[str, Any]) -> None:
    slug = tenant["slug"]
    agent = AGENTS.get(slug)
    runner = RUNTIME.get("runner")
    if agent is None or runner is None:
        return
    phone = to_e164(tenant.get("inboundPhone") or DEFAULT_FROM)
    if not phone:
        return
    already = PHONE_LISTEN.get(slug)
    if already == phone:
        return
    if already and already != phone:
        print(f"[pact] {slug} inbound number changed {already} → {phone}. Restart Expert to rebind listen_phone.")
        return
    taken = next((s for s, n in PHONE_LISTEN.items() if n == phone and s != slug), None)
    if taken:
        print(f"[pact] {phone} already listening for {taken}; skip {slug}")
        return
    try:
        runner.listen_phone(agent, phone)
        PHONE_LISTEN[slug] = phone
        print(f"[pact] {slug} listen_phone {phone}")
    except Exception as exc:
        print(f"[pact] listen_phone failed for {slug} {phone}: {exc}")


def ensure_tenant(guava: Any, runner: Any, tenant: dict[str, Any]) -> None:
    slug = tenant["slug"]
    if slug not in ATTACHED:
        code = tenant.get("webrtcCode") or ""
        if not str(code).startswith("grtc-"):
            minted = mint_webrtc_code()
            tenant["webrtcCode"] = minted
            pact_patch_tenant(slug, {"webrtcCode": minted})
            print(f"[pact] minted WebRTC for {slug}")
        attach_tenant(guava, runner, tenant)
        ATTACHED.add(slug)
        return
    ensure_phone(tenant)


def sync_tenants() -> None:
    guava = RUNTIME.get("guava")
    runner = RUNTIME.get("runner")
    if guava is None or runner is None:
        return
    tenants = pact_get("/api/tenants")["tenants"]
    for tenant in tenants:
        try:
            ensure_tenant(guava, runner, tenant)
        except Exception as exc:
            print(f"[pact] attach failed for {tenant.get('slug')}: {exc}")


def poll_tenants() -> None:
    while True:
        time.sleep(4)
        try:
            sync_tenants()
        except Exception as exc:
            print(f"[pact] tenant poll failed: {exc}")


def main() -> None:
    start_whisper_server()
    try:
        tenants = pact_get("/api/tenants")["tenants"]
    except Exception as exc:
        print(f"[pact] could not load tenants from {PACT_URL}: {exc}")
        print("[pact] whisper server is up; start Next.js and retry.")
        threading.Event().wait()
        return

    api_key = os.environ.get("GUAVA_API_KEY")
    if not api_key:
        print("[pact] GUAVA_API_KEY not set. Live WebRTC will not start.")
        print("[pact] Put the key in .env and rerun this file.")
        threading.Event().wait()
        return

    import guava
    from guava import Runner

    runner = Runner()
    RUNTIME["guava"] = guava
    RUNTIME["runner"] = runner
    for tenant in tenants:
        try:
            ensure_tenant(guava, runner, tenant)
        except Exception as exc:
            print(f"[pact] attach failed for {tenant.get('slug')}: {exc}")
    threading.Thread(target=poll_tenants, daemon=True).start()
    print("[pact] Runner starting. Ctrl-C to stop.")
    runner.run()


if __name__ == "__main__":
    main()
