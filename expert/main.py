"""
Pact Expert — one process, many tenants.

Guava has no tenant API. This process is the tenancy: one Agent per desk,
attached with Runner.listen_webrtc(agent, code).

Live loop (documented APIs only):
  on_call_start      → set_persona, read_script, add_info, set_language_mode, set_task
  on_question        → DocumentQA.ask (namespace = tenant slug)
  on_caller_speech / on_agent_speech → POST Pact /api/ingest
  on_action_requested → goodwill / book / human_please
  human_please       → send_instruction, do NOT transfer()
  /whisper HTTP      → call.send_instruction (operator stays off the audio)

Tonight: WebRTC only. Outbound phone/SMS/Campaigns need approval.
If GUAVA_API_KEY is missing, this still serves /whisper so the Next.js desk works.
"""

from __future__ import annotations

import json
import os
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

PACT_URL = os.environ.get("PACT_URL", "http://127.0.0.1:43147")
INGEST_SECRET = os.environ.get("PACT_INGEST_SECRET", "dev-secret")
WHISPER_PORT = int(os.environ.get("EXPERT_PORT", "18766"))

# session_id -> Guava Call (filled only when guava-sdk is live)
LIVE_CALLS: dict[str, Any] = {}
CALL_TO_SESSION: dict[int, str] = {}


def pact_get(path: str) -> Any:
    with urllib.request.urlopen(f"{PACT_URL}{path}", timeout=5) as res:
        return json.loads(res.read().decode())


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


class WhisperHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:
        print("[whisper]", fmt % args)

    def do_GET(self) -> None:
        if self.path in ("/health", "/"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "calls": len(LIVE_CALLS)}).encode())
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(length) or b"{}")
        if self.path == "/whisper":
            session_id = body.get("sessionId")
            text = body.get("text") or ""
            call = LIVE_CALLS.get(session_id)
            if call is not None and text:
                # Operator is not on the audio. Agent speaks this as itself.
                call.send_instruction(text)
                pact_ingest(
                    {
                        "tenantSlug": body.get("tenantSlug"),
                        "sessionId": session_id,
                        "line": {"role": "system", "text": f"send_instruction: {text}"},
                    }
                )
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        self.send_response(404)
        self.end_headers()


def start_whisper_server() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", WHISPER_PORT), WhisperHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(f"[pact] whisper server on http://127.0.0.1:{WHISPER_PORT}")


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
    docs = [d["body"] for d in tenant.get("knowledge") or [] if d.get("body")]
    qa = DocumentQA(documents=docs or ["No documents loaded for this tenant."], namespace=slug)

    def fields_for(call: Any) -> dict[str, str]:
        out: dict[str, str] = {}
        for spec in tenant.get("fields") or []:
            key = spec["key"]
            val = call.get_field(key)
            if val is not None:
                out[key] = str(val)
        return out

    @agent.on_call_start
    def on_call_start(call: Any) -> None:
        sid = session_key(call)
        LIVE_CALLS[sid] = call
        langs = tenant.get("languages") or {"primary": "english", "secondary": ["spanish"]}
        call.set_persona(
            organization_name=tenant["name"],
            agent_name=tenant.get("agentName") or "Grace",
            agent_purpose=tenant.get("persona") or tenant.get("purpose"),
            voice=tenant.get("voice") or "grace",
        )
        if tenant.get("openingScript"):
            call.read_script(tenant["openingScript"])
        call.add_info("playbook", {
            "authority": tenant.get("authority"),
            "moves": tenant.get("negotiationMoves"),
            "intents": tenant.get("intents"),
        })
        call.add_info("knowledge_hint", "Answer coverage and policy questions only via the library.")
        secondary = langs.get("secondary") or []
        call.set_language_mode(primary=langs.get("primary") or "english", secondary=secondary or None)
        checklist = []
        for spec in tenant.get("fields") or []:
            kwargs: dict[str, Any] = {
                "key": spec["key"],
                "description": spec.get("description") or spec["key"],
                "field_type": spec.get("fieldType") or "text",
                "required": spec.get("required", True),
            }
            if spec.get("choices"):
                kwargs["choices"] = spec["choices"]
            checklist.append(Field(**kwargs))
        call.set_task(
            f"{slug}_negotiate",
            objective=tenant.get("purpose") or "Help the caller inside the published authority.",
            checklist=checklist,
        )
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": sid,
                "status": "live",
                "subject": "Guava WebRTC",
                "callerName": "Web caller",
            }
        )

    @agent.on_caller_speech
    def on_caller_speech(call: Any, event: Any) -> None:
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": session_key(call),
                "line": {"role": "caller", "text": getattr(event, "utterance", str(event))},
                "fields": fields_for(call),
            }
        )

    @agent.on_agent_speech
    def on_agent_speech(call: Any, event: Any) -> None:
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": session_key(call),
                "line": {"role": "agent", "text": getattr(event, "utterance", str(event))},
            }
        )

    @agent.on_question
    def on_question(call: Any, question: str) -> str:
        answer = qa.ask(question)
        pact_ingest(
            {
                "tenantSlug": slug,
                "sessionId": session_key(call),
                "line": {"role": "system", "text": f"DocumentQA: {question}"},
            }
        )
        return answer

    @agent.on_action_requested
    def on_action_requested(call: Any, request: str) -> Any:
        lower = request.lower()
        if any(w in lower for w in ("human", "manager", "person", "supervisor", "agent")):
            return SuggestedAction(key="human_please")
        if any(w in lower for w in ("book", "appointment", "adjuster", "schedule")):
            return SuggestedAction(key="book")
        if any(w in lower for w in ("waive", "goodwill", "discount", "credit")):
            return SuggestedAction(key="negotiate")
        return None

    @agent.on_action("human_please")
    def human_please(call: Any) -> None:
        # transfer() would bridge the call AWAY. Operator types; agent speaks.
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

    @agent.on_action("book")
    def book(call: Any) -> None:
        call.send_instruction("Offer the next concrete calendar slot from the playbook. Confirm date and time out loud.")

    @agent.on_action("negotiate")
    def negotiate(call: Any) -> None:
        auth = (tenant.get("authority") or {}).get("maxConcession") or ""
        cannot = (tenant.get("authority") or {}).get("cannotDo") or []
        call.send_instruction(
            f"Negotiate inside this cap: {auth}. You must refuse: {cannot}. "
            "If they ask above the cap, keep the call and wait for an operator whisper."
        )

    try:
        @agent.on_escalate
        def on_escalate(call: Any, event: Any = None) -> None:
            human_please(call)
    except Exception:
        # Older SDKs may not expose on_escalate; human_please covers the demo.
        pass

    code = tenant.get("webrtcCode") or ""
    if code.startswith("grtc-"):
        runner.listen_webrtc(agent, code)
        print(f"[pact] {slug} listening on {code}")
    else:
        runner.listen_webrtc(agent)
        print(f"[pact] {slug} has no grtc- code yet; Runner will print a generated one. Paste it in the desk.")


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
        print("[pact] GUAVA_API_KEY not set. Desk simulation still works in the Next app.")
        print("[pact] At the venue: export the key, paste grtc- codes, rerun this file.")
        threading.Event().wait()
        return

    import guava
    from guava import Runner

    runner = Runner()
    for tenant in tenants:
        attach_tenant(guava, runner, tenant)
    print("[pact] Runner starting. Ctrl-C to stop.")
    runner.run()


if __name__ == "__main__":
    main()
