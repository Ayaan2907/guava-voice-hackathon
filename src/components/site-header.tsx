import Link from "next/link";

export function SiteHeader({ dark }: { dark?: boolean }) {
  return (
    <header
      className={`flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 ${
        dark ? "border-border bg-background/80 backdrop-blur" : "border-border bg-background/90 backdrop-blur"
      }`}
    >
      <Link href="/" className="flex items-baseline gap-2 no-underline">
        <span className="font-serif text-xl tracking-tight">Pact</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">negotiation desk</span>
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        <Link href="/desks" className="text-muted-foreground hover:text-foreground">
          Desks
        </Link>
        <Link href="/brief" className="text-muted-foreground hover:text-foreground">
          Locked brief
        </Link>
        <Link href="/platform" className="text-muted-foreground hover:text-foreground">
          How it works
        </Link>
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          Sign in
        </Link>
        <Link href="/signup" className="text-muted-foreground hover:text-foreground">
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground no-underline hover:opacity-90"
        >
          Open desk
        </Link>
      </nav>
    </header>
  );
}
