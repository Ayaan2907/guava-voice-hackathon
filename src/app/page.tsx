import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="desk-grid border-b">
          <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10 sm:py-28">
            <p className="mb-5 text-[11px] font-medium tracking-[0.22em] text-brass uppercase">
              Multi-tenant · inbound + outbound · operator on the line
            </p>
            <h1 className="font-serif max-w-3xl text-[2.5rem] leading-[1.08] font-medium tracking-tight text-pretty sm:text-6xl">
              Not a voice agent. A desk any business can turn on.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Pact is the platform you sell: a company gets a web line and an operator who
              whispers without taking the audio. Call{" "}
              <span className="font-mono text-base text-foreground">+1 (484) 295-1236</span> to
              reach Pact itself — that number is sales and onboarding, not a tenant desk.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/desks"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground no-underline transition-opacity duration-200 hover:opacity-85"
              >
                All desks
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-border px-5 py-2.5 text-sm no-underline transition-colors duration-200 hover:bg-card"
              >
                Sign in to one desk
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-border px-5 py-2.5 text-sm no-underline transition-colors duration-200 hover:bg-card"
              >
                Sign up a business
              </Link>
            </div>
            <p className="mt-8 max-w-xl text-xs leading-relaxed text-muted-foreground">
              Guava Build Night SF · table demo is 2 minutes. Two windows, one call: hail claim →
              “I want a manager” → whisper $150, do not waive → then Priya (Spanish gloss) or Harbor
              Lane. No transfer.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-12 px-6 py-16 sm:grid-cols-2 sm:gap-16 sm:px-10">
          <article>
            <p className="text-[11px] tracking-[0.2em] text-brass uppercase">Surface 1 · inbound</p>
            <h2 className="font-serif mt-3 text-3xl font-medium tracking-tight">Anyone who hits the line</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Website visitor or (later) a phone number. The agent already knows the
              tenant: intents, policy docs, what it may concede, what it must never say.
              It negotiates, books, and answers from the library. If they ask for a
              human, the agent does not transfer the audio away — a desk operator types,
              the agent speaks.
            </p>
          </article>
          <article>
            <p className="text-[11px] tracking-[0.2em] text-brass uppercase">Surface 2 · outbound</p>
            <h2 className="font-serif mt-3 text-3xl font-medium tracking-tight">The business dials out</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Operators queue leads — a renewal, a lapse, a hail follow-up. When someone
              picks up, the same tenant brain negotiates. Tonight the pickup is a WebRTC
              stand-in. Production is Guava <code className="font-mono text-xs">call_phone</code>{" "}
              and <code className="font-mono text-xs">Campaigns</code> after number approval.
            </p>
          </article>
        </section>

        <section className="border-y border-border">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
            <h2 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">
              The niche we demo. The platform we sell.
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Judges hear insurance because Guava already sells FNOL and the back-and-forth
              is brutal: deductibles, goodwill, renewal shock. The same desk object is
              what a clinic, a drayage shop, or a merchant would get — swap the template.
            </p>
            <ul className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
              <li className="border-t border-border pt-5">
                <strong className="font-medium">Insurance (live tenant)</strong>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Northstar Mutual — FNOL in, renewal out. $150 goodwill / 8% loyalty.
                  Spanish follow-up on Priya Shah.
                </p>
              </li>
              <li className="border-t border-border pt-5">
                <strong className="font-medium">Logistics (second tenant)</strong>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Harbor Lane Freight — detention vs. tariff. One free day without a
                  supervisor. Same product, different JSON.
                </p>
              </li>
              <li className="border-t border-border pt-5">
                <strong className="font-medium">Healthcare template</strong>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Intake and prior-auth status. Never invent coverage. Escalate benefits.
                </p>
              </li>
              <li className="border-t border-border pt-5">
                <strong className="font-medium">E-commerce template</strong>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Returns and damage. Replacement before refund. Margin line in the playbook.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
          <h2 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">What Guava actually does here</h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Pact is the multi-tenant control plane. Guava is the Dialog System on the
            call. We do not invent APIs.
          </p>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                  <th className="py-3 pr-4 font-medium">Job</th>
                  <th className="py-3 pr-4 font-medium">Guava primitive</th>
                  <th className="py-3 font-medium">Pact</th>
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
                  <tr key={a} className="border-b border-border">
                    <td className="py-3.5 pr-4">{a}</td>
                    <td className="py-3.5 pr-4 font-mono text-xs">{b}</td>
                    <td className="py-3.5 text-muted-foreground">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-8">
            <Link
              href="/platform"
              className="text-sm no-underline transition-colors duration-200 hover:text-brass"
            >
              Full architecture and tonight&apos;s honest constraints →
            </Link>
          </p>
        </section>
      </main>
      <footer className="border-t border-border px-6 py-10 text-center text-[11px] tracking-wide text-muted-foreground">
        Pact · Guava Build Night SF · House of AI · 29 Aug 2026
      </footer>
    </div>
  );
}
