import { applyOnboardFields } from "./onboard-schema";
import { getTenant, upsertTenant } from "./store";

export { applyOnboardFields, ONBOARD_FIELDS, onboardReady } from "./onboard-schema";

export function completeOnboard(slug: string, fields: Record<string, string> = {}) {
  const tenant = getTenant(slug);
  if (!tenant || tenant.role === "platform") return tenant ?? null;
  return upsertTenant(applyOnboardFields(tenant, fields));
}
