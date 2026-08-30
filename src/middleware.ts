import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { EMAIL_COOKIE, SLUG_COOKIE } from "@/lib/session-cookies";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/app/")) return NextResponse.next();

  const email = req.cookies.get(EMAIL_COOKIE)?.value;
  const slug = req.cookies.get(SLUG_COOKIE)?.value;
  if (!email || !slug) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const want = pathname.split("/")[2];
  if (want && slug !== want) {
    return NextResponse.redirect(new URL(`/app/${slug}`, req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
