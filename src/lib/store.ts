import { readFileSync } from "fs";
import path from "path";
import { publish } from "./bus";
import { ensureSchema, getPool } from "./db";
import { seedTenants } from "./templates";
import type { PactUser, Session, StoreShape, Tenant, TranscriptLine } from "./types";

type Memory = {
  tenants: Tenant[];
  sessions: Session[];
  users: PactUser[];
};

const g = globalThis as unknown as { __pactMem?: Memory; __pactBoot?: Promise<void> };

function seedUsers(): PactUser[] {
  return [
    {
      id: "user_northstar",
      email: "northstar@pact.local",
      password: "demo",
      orgSlug: "northstar",
    },
    {
      id: "user_harbor",
      email: "harbor@pact.local",
      password: "demo",
      orgSlug: "harbor-lane",
    },
  ];
}

function ensureTenantFlags(t: Tenant): Tenant {
  return {
    ...t,
    inboundEnabled: t.inboundEnabled ?? true,
    outboundEnabled: t.outboundEnabled ?? true,
    onboardComplete: t.onboardComplete ?? true,
    inboundBrief: t.inboundBrief ?? t.purpose,
    outboundBrief: t.outboundBrief ?? t.purpose,
    pendingCall: t.pendingCall ?? null,
    inboundPhone: t.inboundPhone ?? "",
    outboundFromNumber: t.outboundFromNumber ?? t.inboundPhone ?? "",
  };
}

function mem(): Memory {
  if (!g.__pactMem) {
    throw new Error("Pact store is not ready. Await ensureStore() first.");
  }
  return g.__pactMem;
}

function jsonFileStore(): StoreShape | null {
  try {
    const raw = readFileSync(path.join(process.cwd(), "data/runtime.json"), "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (Array.isArray(parsed.tenants) && parsed.tenants.length > 0) return parsed;
  } catch {
    // no legacy file
  }
  return null;
}

async function persistTenants() {
  const pool = getPool();
  for (const tenant of mem().tenants) {
    await pool.query(
      `INSERT INTO pact_tenants (slug, data) VALUES ($1, $2::jsonb)
       ON CONFLICT (slug) DO UPDATE SET data = EXCLUDED.data`,
      [tenant.slug, JSON.stringify(tenant)],
    );
  }
}

async function persistUsers() {
  const pool = getPool();
  for (const user of mem().users) {
    await pool.query(
      `INSERT INTO pact_users (id, email, password, org_slug)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password = EXCLUDED.password, org_slug = EXCLUDED.org_slug`,
      [user.id, user.email, user.password, user.orgSlug],
    );
  }
}

async function persistSession(session: Session) {
  await getPool().query(
    `INSERT INTO pact_sessions (id, tenant_slug, data) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (id) DO UPDATE SET tenant_slug = EXCLUDED.tenant_slug, data = EXCLUDED.data`,
    [session.id, session.tenantSlug, JSON.stringify(session)],
  );
}

async function boot() {
  await ensureSchema();
  const pool = getPool();
  const tenantsRes = await pool.query<{ slug: string; data: Tenant }>("SELECT slug, data FROM pact_tenants");
  const usersRes = await pool.query<{ id: string; email: string; password: string; org_slug: string }>(
    "SELECT id, email, password, org_slug FROM pact_users",
  );
  const sessionsRes = await pool.query<{ id: string; data: Session }>("SELECT id, data FROM pact_sessions");

  if (tenantsRes.rows.length > 0) {
    g.__pactMem = {
      tenants: tenantsRes.rows.map((r) => ensureTenantFlags(typeof r.data === "string" ? JSON.parse(r.data) : r.data)),
      users: usersRes.rows.map((u) => ({
        id: u.id,
        email: u.email,
        password: u.password,
        orgSlug: u.org_slug,
      })),
      sessions: sessionsRes.rows
        .map((r) => (typeof r.data === "string" ? (JSON.parse(r.data) as Session) : r.data))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    };
    if (g.__pactMem.users.length === 0) {
      g.__pactMem.users = seedUsers();
      await persistUsers();
    }
    return;
  }

  const legacy = jsonFileStore();
  g.__pactMem = {
    tenants: (legacy?.tenants ?? seedTenants()).map(ensureTenantFlags),
    users: legacy?.users && legacy.users.length > 0 ? legacy.users : seedUsers(),
    sessions: [],
  };
  await persistTenants();
  await persistUsers();
}

export function ensureStore() {
  if (!g.__pactBoot) g.__pactBoot = boot();
  return g.__pactBoot;
}

export function listTenants() {
  return mem().tenants;
}

export function getTenant(slug: string) {
  return mem().tenants.find((t) => t.slug === slug) ?? null;
}

export function upsertTenant(tenant: Tenant) {
  const m = mem();
  const next = ensureTenantFlags(tenant);
  const idx = m.tenants.findIndex((t) => t.slug === next.slug);
  if (idx >= 0) m.tenants[idx] = next;
  else m.tenants.push(next);
  void persistTenants();
  publish({
    type: "tenant.updated",
    tenantSlug: next.slug,
    at: new Date().toISOString(),
  });
  const expert = process.env.EXPERT_URL ?? "http://127.0.0.1:18766";
  void fetch(`${expert}/reload`, { method: "POST", signal: AbortSignal.timeout(2000) }).catch(() => undefined);
  return next;
}

export function getUserByEmail(email: string) {
  return mem().users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function getUserBySlug(orgSlug: string) {
  return mem().users.find((u) => u.orgSlug === orgSlug) ?? null;
}

export function upsertUser(user: PactUser) {
  const m = mem();
  const idx = m.users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (idx >= 0) m.users[idx] = user;
  else m.users.push(user);
  void persistUsers();
  return user;
}

export function listSessions(tenantSlug?: string) {
  const sessions = mem().sessions;
  if (!tenantSlug) return sessions;
  return sessions.filter((s) => s.tenantSlug === tenantSlug);
}

export function findLiveInbound(tenantSlug: string) {
  return (
    mem().sessions.find(
      (s) => s.tenantSlug === tenantSlug && s.direction === "inbound" && s.status !== "ended",
    ) ?? null
  );
}

export function getSession(id: string) {
  return mem().sessions.find((s) => s.id === id) ?? null;
}

export function saveSession(
  session: Session,
  eventType: "session.created" | "session.updated" | "session.ended" = "session.updated",
) {
  const m = mem();
  const idx = m.sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) m.sessions[idx] = session;
  else m.sessions.unshift(session);
  void persistSession(session);
  publish({
    type: eventType,
    tenantSlug: session.tenantSlug,
    sessionId: session.id,
    at: new Date().toISOString(),
  });
  return session;
}

export function addLine(sessionId: string, line: Omit<TranscriptLine, "id" | "at"> & { id?: string; at?: string }) {
  const session = getSession(sessionId);
  if (!session) return null;
  const next: TranscriptLine = {
    id: line.id ?? `line_${Math.random().toString(36).slice(2, 9)}`,
    at: line.at ?? new Date().toISOString(),
    role: line.role,
    text: line.text,
    language: line.language,
    translated: line.translated,
  };
  session.transcript.push(next);
  saveSession(session);
  return session;
}

export function patchSession(id: string, patch: Partial<Session>) {
  const session = getSession(id);
  if (!session) return null;
  Object.assign(session, patch);
  const ended = patch.status === "ended";
  return saveSession(session, ended ? "session.ended" : "session.updated");
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
