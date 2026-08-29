"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VERTICAL_BLURBS, VERTICAL_LABELS } from "@/lib/templates";
import type { Vertical } from "@/lib/types";

const CHOICES: Vertical[] = ["insurance", "logistics", "healthcare", "ecommerce", "custom"];

export default function OnboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [vertical, setVertical] = useState<Vertical>("insurance");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/tenants/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, city, vertical }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create the desk.");
      return;
    }
    router.push(`/desk/${data.tenant.slug}`);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-12">
        <p className="text-xs tracking-[0.16em] text-brass uppercase">New tenant</p>
        <h1 className="font-serif mt-2 text-4xl">Stand up a desk</h1>
        <p className="mt-3 text-muted-foreground">
          This is the product: a business name and a vertical. We copy a playbook,
          assign an inbound web line, and give you the same operator console Northstar
          uses. No new repo. No new Expert process per customer — one Runner, many
          agents.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Redwood Health Group"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City (optional)</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Sacramento, CA"
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Vertical template</legend>
            <div className="grid gap-2">
              {CHOICES.map((v) => (
                <label
                  key={v}
                  className={`cursor-pointer rounded-lg border p-3 text-sm ${
                    vertical === v ? "border-foreground bg-card" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="vertical"
                    checked={vertical === v}
                    onChange={() => setVertical(v)}
                  />
                  <span className="font-medium">{VERTICAL_LABELS[v]}</span>
                  <span className="mt-1 block text-muted-foreground">{VERTICAL_BLURBS[v]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Spinning up…" : "Create desk and open console"}
          </Button>
        </form>
      </main>
    </div>
  );
}
