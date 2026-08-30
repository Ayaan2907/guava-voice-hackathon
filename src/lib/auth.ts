import { cookies } from "next/headers";
import { EMAIL_COOKIE, SLUG_COOKIE } from "./session-cookies";
import { getUserByEmail } from "./store";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export async function setSessionCookie(email: string, orgSlug: string) {
  const jar = await cookies();
  jar.set(EMAIL_COOKIE, email, cookieOpts);
  jar.set(SLUG_COOKIE, orgSlug, cookieOpts);
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(EMAIL_COOKIE);
  jar.delete(SLUG_COOKIE);
}

export async function currentOrg() {
  const jar = await cookies();
  const email = jar.get(EMAIL_COOKIE)?.value ?? "";
  const slug = jar.get(SLUG_COOKIE)?.value ?? "";
  if (!email || !slug) return null;
  const user = getUserByEmail(email);
  if (!user || user.orgSlug !== slug) return null;
  return { user, slug };
}

export function demoPasswordOk(email: string, password: string) {
  const user = getUserByEmail(email);
  return Boolean(user && user.password === password);
}
