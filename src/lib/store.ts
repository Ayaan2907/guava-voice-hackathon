import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { publish } from "./bus";
import { seedTenants } from "./templates";
import type { PactUser, Session, StoreShape, Tenant, TranscriptLine } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "runtime.json");

type Memory = {
  tenants: Tenant[];
  sessions: Session[];
  users: PactUser[];
};

const g = globalThis as unknown as { __pactMem?: Memory };

function mem(): Memory {
  if (!g.__pactMem) {
    g.__pactMem = load();
  }
  return g.__pactMem;
}

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
  };
}

function load(): Memory {
  try {
    const raw = readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (Array.isArray(parsed.tenants) && parsed.tenants.length > 0) {
      return {
        tenants: parsed.tenants.map(ensureTenantFlags),
        sessions: [],
        users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : seedUsers(),
      };
    }
  } catch {
    // first boot
  }
  return { tenants: seedTenants(), sessions: [], users: seedUsers() };
}

function persist() {
  mkdirSync(DATA_DIR, { recursive: true });
  const payload: StoreShape = { tenants: mem().tenants, users: mem().users };
  writeFileSync(STORE_PATH, JSON.stringify(payload, null, 2));
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
  persist();
  publish({
    type: "tenant.updated",
    tenantSlug: next.slug,
    at: new Date().toISOString(),
  });
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
  persist();
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

export function saveSession(session: Session, eventType: "session.created" | "session.updated" | "session.ended" = "session.updated") {
  const m = mem();
  const idx = m.sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) m.sessions[idx] = session;
  else m.sessions.unshift(session);
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
