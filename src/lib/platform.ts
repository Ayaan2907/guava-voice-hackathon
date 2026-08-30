import { applyOnboardFields } from "./onboard-schema";
import { PACT_PLATFORM_SLUG, verticalFromIndustry } from "./platform-schema";
import { slugify } from "./slug";
import { getTenant, newId, upsertTenant, upsertUser } from "./store";
import { templateFor } from "./templates";
import type { Tenant } from "./types";

export function provisionTenantFromSales(fields: Record<string, string>): Tenant | null {
  const name = (fields.company_name || "").trim();
  if (!name) return null;
  let slug = slugify(name);
  if (slug === PACT_PLATFORM_SLUG || getTenant(slug)) slug = `${slug}-${newId("x").slice(-4)}`;
  const tenant = templateFor(verticalFromIndustry(fields.industry), name, slug);
  tenant.id = newId("tenant");
  tenant.role = "customer";
  tenant.city = "";
  const dumped = applyOnboardFields(tenant, {
    what_you_sell: fields.industry || name,
    inbound_jobs: fields.inbound_jobs || "",
    outbound_jobs: fields.outbound_jobs || "",
    cannot_do: fields.authority_notes || "",
    knowledge_notes: [fields.industry, fields.inbound_jobs, fields.outbound_jobs, fields.authority_notes]
      .filter(Boolean)
      .join("\n\n"),
  });
  const nextStep = (fields.next_step || "").trim();
  dumped.onboardComplete = nextStep === "stand_up_desk" || Boolean(fields.inbound_jobs || fields.outbound_jobs);
  upsertTenant(dumped);
  const email = (fields.contact_email || "").trim().toLowerCase();
  if (email) {
    upsertUser({
      id: newId("user"),
      email,
      password: "demo",
      orgSlug: dumped.slug,
    });
  }
  return dumped;
}
