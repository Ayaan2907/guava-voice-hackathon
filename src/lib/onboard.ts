import { getTenant, upsertTenant } from "./store";
import type { Tenant } from "./types";

export function applyOnboardFields(tenant: Tenant, fields: Record<string, string>): Tenant {
  const purpose = fields.purpose?.trim() || tenant.purpose;
  const greeting = fields.greeting?.trim() || tenant.openingScript;
  const maxConcession = fields.max_concession?.trim() || tenant.authority.maxConcession;
  const cannotDo = fields.cannot_do
    ? fields.cannot_do
        .split(/[;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : tenant.authority.cannotDo;

  return {
    ...tenant,
    purpose,
    openingScript: greeting,
    persona: `You represent ${tenant.name}. ${purpose} Stay inside published authority. Never transfer the caller; wait for send_instruction.`,
    authority: {
      ...tenant.authority,
      maxConcession,
      cannotDo,
    },
    onboardComplete: true,
    webrtcCode: tenant.webrtcCode.startsWith("grtc-") ? tenant.webrtcCode : `local-${tenant.slug}`,
  };
}

export function completeOnboard(slug: string, fields: Record<string, string> = {}) {
  const tenant = getTenant(slug);
  if (!tenant) return null;
  return upsertTenant(applyOnboardFields(tenant, fields));
}
