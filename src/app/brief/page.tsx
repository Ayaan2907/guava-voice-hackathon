import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { readFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export default function BriefPage() {
  const md = readFileSync(path.join(process.cwd(), "docs/locked-brief.md"), "utf8");
  const sections = md.split(/\n(?=## )/);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs font-medium tracking-[0.18em] text-brass uppercase">Locked · do not pivot</p>
        <article className="prose-brief mt-6 space-y-10">
          {sections.map((block) => {
            const lines = block.trim().split("\n");
            const title = lines[0]?.replace(/^#+\s*/, "") ?? "";
            const body = lines.slice(1).join("\n").trim();
            if (!title) return null;
            const level = lines[0]?.startsWith("# ") ? 1 : 2;
            return (
              <section key={title}>
                {level === 1 ? (
                  <h1 className="font-serif text-4xl leading-tight">{title.replace(" — LOCKED", "")}</h1>
                ) : (
                  <h2 className="font-serif text-2xl">{title}</h2>
                )}
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                  {body}
                </pre>
              </section>
            );
          })}
        </article>
        <p className="mt-12 flex flex-wrap gap-4 text-sm">
          <Link href="/desk/northstar">Open Northstar desk</Link>
          <Link href="/onboard">Sign up a tenant</Link>
          <Link href="/">Home</Link>
        </p>
      </main>
    </div>
  );
}
