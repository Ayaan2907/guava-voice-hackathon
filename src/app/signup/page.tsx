"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VERTICAL_BLURBS, VERTICAL_LABELS } from "@/lib/templates";
import type { Vertical } from "@/lib/types";

const CHOICES: Vertical[] = ["insurance", "logistics", "healthcare", "ecommerce", "custom"];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [vertical, setVertical] = useState<Vertical>("custom");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, city, vertical }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create the desk.");
      return;
    }
    router.push("/onboard");
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-6 py-16 sm:px-10">
        <p className="text-[11px] tracking-[0.22em] text-brass uppercase">One org per login</p>
        <h1 className="font-serif mt-3 text-4xl font-medium tracking-tight">Sign up a business</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          After this, Pact interviews you on a Guava line. That call writes inbound, outbound, and
          authority into your playbook. Then the same orb handles live calls.
        </p>
        <form onSubmit={submit} className="mt-10 space-y-7">
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Redwood Health Group" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City (optional)</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sacramento, CA" />
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Starting template</legend>
            <div className="divide-y divide-border border-y border-border">
              {CHOICES.map((v) => (
                <label
                  key={v}
                  className={`block cursor-pointer border-l-2 py-3.5 pl-3 text-sm transition-colors duration-200 ${
                    vertical === v
                      ? "border-brass text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="vertical"
                    checked={vertical === v}
                    onChange={() => setVertical(v)}
                  />
                  <span className="font-medium text-foreground">{VERTICAL_LABELS[v]}</span>
                  <span className="mt-1 block text-muted-foreground">{VERTICAL_BLURBS[v]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="h-10 w-full rounded-xl">
            {pending ? "Creating org…" : "Continue to voice onboarding"}
          </Button>
        </form>
      </main>
    </div>
  );
}
