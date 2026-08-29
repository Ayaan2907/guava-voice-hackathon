import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function PlatformPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs tracking-[0.16em] text-brass uppercase">Architecture</p>
        <h1 className="font-serif mt-2 text-4xl">How Pact is actually built</h1>
        <p className="mt-4 text-muted-foreground">
          Guava has no multi-tenant API. Tenancy is ours. Guava has no live supervisor
          websocket. The operator loop is ours, sitting on{" "}
          <code className="font-mono text-sm">send_instruction</code>. Campaigns and
          SMS need approval — so tonight outbound is honest theater on WebRTC.
        </p>

        <h2 className="font-serif mt-12 text-2xl">The idea, tightened</h2>
        <p className="mt-3 leading-relaxed">
          Sell a <strong>desk</strong>, not an agent. A desk is: identity, documents,
          intents, authority, an inbound interface, an outbound queue, and a human who
          can join without ripping the AI off the call. Insurance is the demo vertical
          because the negotiation is real (deductible vs goodwill, renewal vs churn)
          and Guava already talks FNOL. Healthcare, logistics, and e-commerce are the
          same object with a different template.
        </p>

        <h2 className="font-serif mt-12 text-2xl">Two surfaces</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 leading-relaxed">
          <li>
            <strong>Public line</strong> (<code className="font-mono text-sm">/line/[slug]</code>
            ). Starts as the official Guava WebRTC widget (
            <code className="font-mono text-sm">guava-widget.js</code> +{" "}
            <code className="font-mono text-sm">webrtc-code</code>
            ). That page must not remount the script — Guava&apos;s widget has no
            session resume, and the official Lovable guide unmounts it on cleanup,
            which kills the call on navigation.
          </li>
          <li>
            <strong>Operator desk</strong> (
            <code className="font-mono text-sm">/desk/[slug]</code>
            ). Live transcript from <code className="font-mono text-sm">on_caller_speech</code>{" "}
            / <code className="font-mono text-sm">on_agent_speech</code>, fields from{" "}
            <code className="font-mono text-sm">set_task</code>, RAG hits from{" "}
            <code className="font-mono text-sm">on_question</code> + DocumentQA,
            whisper box → <code className="font-mono text-sm">send_instruction</code>,
            language chip → <code className="font-mono text-sm">set_language_mode</code>.
            Outbound button queues a lead. Pickup tonight = a second browser as the
            customer, or this app&apos;s simulation.
          </li>
        </ol>

        <h2 className="font-serif mt-12 text-2xl">Infrastructure</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs leading-relaxed">
{`Browser  /line/[slug]     widget → Dialog System (STT · LLM · TTS)
Browser  /desk/[slug]     SSE ← Pact control plane (Next.js)
                 │
                 │  POST /whisper
                 ▼
Python Expert    Runner
  Agent(northstar).listen_webrtc("grtc-…")
  Agent(harbor).listen_webrtc("grtc-…")
  on_call_start → set_persona, read_script, add_info(playbook), set_task, set_language_mode
  on_question   → DocumentQA(namespace=tenant.slug)
  on_escalate   → stay on call, ping desk  (do not transfer)
  on_action     → book / goodwill / callback
  on_*_speech   → POST /api/ingest
  poll/POST     → send_instruction(operator text)`}
        </pre>

        <h2 className="font-serif mt-12 text-2xl">Multi-tenant, concretely</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
          <li>Signup writes a Tenant JSON (playbook, docs, leads, webrtc code).</li>
          <li>
            Expert uses <code className="font-mono text-sm">guava.Runner</code> — one
            process, one Agent per tenant,{" "}
            <code className="font-mono text-sm">listen_webrtc(agent, code)</code>.
          </li>
          <li>
            Codes come from <code className="font-mono text-sm">Client.create_webrtc_agent()</code>{" "}
            or the dashboard. Until a real <code className="font-mono text-sm">grtc-</code>{" "}
            code is pasted, the line runs in simulation so the product is demoable
            without a key.
          </li>
          <li>
            Phone inbound is the same Agent with{" "}
            <code className="font-mono text-sm">listen_phone</code> once a number is
            approved. No product rewrite.
          </li>
        </ul>

        <h2 className="font-serif mt-12 text-2xl">Guava APIs we use — and refuse</h2>
        <p className="mt-3 leading-relaxed">
          <strong>Use:</strong> Agent, Runner, listen_webrtc, set_persona, read_script,
          set_task, Field, add_info, send_instruction, set_language_mode, on_question +
          DocumentQA, on_action_requested / on_action, on_caller_speech,
          on_agent_speech, on_escalate, reach_person (when outbound is live),
          create_webrtc_agent, widget script.
        </p>
        <p className="mt-3 leading-relaxed">
          <strong>Do not use tonight:</strong> transfer() as the human-in-the-loop
          (it bridges the call <em>away</em> — no 3-way, operator cannot speak into
          the same audio). Campaigns / SMS / listen_phone without event approval.
          Conversations API for the live desk (it is post-call). Invented REST to
          “create agents.”
        </p>
        <p className="mt-3 leading-relaxed">
          <strong>Warning:</strong> if you implement{" "}
          <code className="font-mono text-sm">on_action_request</code>, caller-triggered{" "}
          <code className="font-mono text-sm">on_escalate</code> is disabled — handle
          “human please” yourself as an action. HITRUST/PCI language is English+Spanish
          only; <code className="font-mono text-sm">grace</code> is the non-English voice.
        </p>

        <h2 className="font-serif mt-12 text-2xl">Four-hour execution</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed">
          <li>This console + two seeded tenants (done).</li>
          <li>
            At the venue: <code className="font-mono text-sm">guava login</code>, paste
            two <code className="font-mono text-sm">grtc-</code> codes into tenant
            settings, run <code className="font-mono text-sm">python expert/main.py</code>.
          </li>
          <li>
            Demo loop: homepage → onboard a fake clinic in 20 seconds → Northstar
            inbound (two windows) → wait for “I want a manager” → whisper $150 →
            outbound Maria or Priya (Spanish gloss).
          </li>
          <li>Do not spend the night on billing, auth, or a second component library.</li>
        </ol>

        <p className="mt-10">
          <Link href="/desk/northstar">Open the Northstar desk →</Link>
        </p>
      </main>
    </div>
  );
}
