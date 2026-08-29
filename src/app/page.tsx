import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="desk-grid border-b">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
            <p className="mb-4 text-xs font-medium tracking-[0.18em] text-brass uppercase">
              Multi-tenant · inbound + outbound · operator on the line
            </p>
            <h1 className="font-serif max-w-3xl text-4xl leading-[1.1] text-pretty sm:text-6xl">
              Not a voice agent. A desk any business can turn on.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Pact is the negotiation OS you sell: a company signs up, we load their
              playbook, documents, and authority, and they get an inbound web line plus
              an outbound queue. The agent stays on the call. Operators whisper. New
              tenants are config, not a new codebase.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/desk/northstar"
                className="rounded-md bg-primary px-4 py-2.5 text-sm text-primary-foreground no-underline"
              >
                Demo: Northstar Mutual
              </Link>
              <Link
                href="/line/northstar"
                className="rounded-md border border-border bg-card px-4 py-2.5 text-sm no-underline"
              >
                Be the inbound caller
              </Link>
              <Link
                href="/onboard"
                className="rounded-md px-4 py-2.5 text-sm text-muted-foreground no-underline"
              >
                Sign up another business
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-6">
            <p className="text-xs tracking-[0.16em] text-brass uppercase">Surface 1 · inbound</p>
            <h2 className="font-serif mt-2 text-2xl">Anyone who hits the line</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Website visitor or (later) a phone number. The agent already knows the
              tenant: intents, policy docs, what it may concede, what it must never say.
              It negotiates, books, and answers from the library. If they ask for a
              human, the agent does not transfer the audio away — a desk operator types,
              the agent speaks.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-card p-6">
            <p className="text-xs tracking-[0.16em] text-brass uppercase">Surface 2 · outbound</p>
            <h2 className="font-serif mt-2 text-2xl">The business dials out</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Operators queue leads — a renewal, a lapse, a hail follow-up. When someone
              picks up, the same tenant brain negotiates. Tonight the pickup is a WebRTC
              stand-in. Production is Guava <code className="font-mono text-xs">call_phone</code>{" "}
              and <code className="font-mono text-xs">Campaigns</code> after number approval.
            </p>
          </article>
        </section>

        <section className="border-y border-border bg-card/60">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="font-serif text-3xl">The niche we demo. The platform we sell.</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Judges hear insurance because Guava already sells FNOL and the back-and-forth
              is brutal: deductibles, goodwill, renewal shock. The same desk object is
              what a clinic, a drayage shop, or a merchant would get — swap the template.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              <li className="rounded-lg border border-border p-4">
                <strong>Insurance (live tenant)</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  Northstar Mutual — FNOL in, renewal out. $150 goodwill / 8% loyalty.
                  Spanish follow-up on Priya Shah.
                </p>
              </li>
              <li className="rounded-lg border border-border p-4">
                <strong>Logistics (second tenant)</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  Harbor Lane Freight — detention vs. tariff. One free day without a
                  supervisor. Same product, different JSON.
                </p>
              </li>
              <li className="rounded-lg border border-border p-4">
                <strong>Healthcare template</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  Intake and prior-auth status. Never invent coverage. Escalate benefits.
                </p>
              </li>
              <li className="rounded-lg border border-border p-4">
                <strong>E-commerce template</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  Returns and damage. Replacement before refund. Margin line in the playbook.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="font-serif text-3xl">What Guava actually does here</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Pact is the multi-tenant control plane. Guava is the Dialog System on the
            call. We do not invent APIs.
          </p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Job</th>
                  <th className="py-2 pr-4 font-medium">Guava primitive</th>
                  <th className="py-2 font-medium">Pact</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {[
                  ["One process, many businesses", "Runner.listen_webrtc(agent, code)", "Each tenant owns a grtc- code"],
                  ["Know the business", "set_persona + add_info + DocumentQA", "Playbook + knowledge per tenant"],
                  ["Negotiate in structure", "set_task + Field", "Intents and authority caps"],
                  ["Stay on the line with a human", "on_escalate + send_instruction", "Operator whisper (never transfer)"],
                  ["Spanish caller, English desk", "set_language_mode + on_caller_speech", "Gloss column on the transcript"],
                  ["Website inbound", "WebRTC widget webrtc-code=", "/line/[slug]"],
                  ["True outbound later", "reach_person + Campaigns / call_phone", "Lead queue UI tonight"],
                ].map(([a, b, c]) => (
                  <tr key={a} className="border-b border-border/70">
                    <td className="py-3 pr-4">{a}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{b}</td>
                    <td className="py-3 text-muted-foreground">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6">
            <Link href="/platform">Full architecture and tonight&apos;s honest constraints →</Link>
          </p>
        </section>
      </main>
      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        Pact · Guava Build Night SF · House of AI · 29 Aug 2026
      </footer>
    </div>
  );
}
