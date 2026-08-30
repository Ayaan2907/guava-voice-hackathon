import Link from "next/link";

export function SiteHeader({ dark }: { dark?: boolean }) {
  return (
    <header
      className={`border-b px-6 py-5 sm:px-10 ${
        dark ? "border-border bg-background" : "border-border bg-background"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-8">
        <Link href="/" className="flex items-baseline gap-3 no-underline">
          <span className="font-serif text-[1.35rem] leading-none tracking-tight">Pact</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-[13px] tracking-wide">
          <Link
            href="/desks"
            className="text-muted-foreground no-underline transition-colors duration-200 hover:text-foreground"
          >
            Platform
          </Link>
          <Link
            href="/platform"
            className="hidden text-muted-foreground no-underline transition-colors duration-200 hover:text-foreground sm:inline"
          >
            How it works
          </Link>
          <Link
            href="/brief"
            className="hidden text-muted-foreground no-underline transition-colors duration-200 hover:text-foreground md:inline"
          >
            Brief
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground no-underline transition-colors duration-200 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-foreground no-underline transition-opacity duration-200 hover:opacity-70"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
