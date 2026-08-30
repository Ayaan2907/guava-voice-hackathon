"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("northstar@pact.local");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not sign in.");
      return;
    }
    if (data.onboardComplete === false) {
      router.push("/onboard");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next?.startsWith("/app/") ? next : `/app/${data.slug}`);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16 sm:px-10">
        <p className="text-[11px] tracking-[0.22em] text-brass uppercase">Your org only</p>
        <h1 className="font-serif mt-3 text-4xl font-medium tracking-tight">Sign in</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Demo: <span className="font-mono text-xs">northstar@pact.local</span> /{" "}
          <span className="font-mono text-xs">demo</span>. Harbor:{" "}
          <span className="font-mono text-xs">harbor@pact.local</span>. Pact sales desk:{" "}
          <span className="font-mono text-xs">pact@pact.local</span>.
        </p>
        <form onSubmit={submit} className="mt-10 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="h-10 w-full rounded-xl">
            {pending ? "Signing in…" : "Open desk"}
          </Button>
        </form>
        <p className="mt-8 text-sm text-muted-foreground">
          New business?{" "}
          <a href="/signup" className="text-foreground underline-offset-4 transition-colors hover:text-brass hover:underline">
            Sign up
          </a>
        </p>
      </main>
    </div>
  );
}
