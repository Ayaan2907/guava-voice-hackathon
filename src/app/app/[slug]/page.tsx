import { redirect } from "next/navigation";
import { CrmClient } from "@/components/crm-client";
import { currentOrg } from "@/lib/auth";
import { getTenant } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CrmPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await currentOrg();
  if (!org) redirect("/login");
  if (org.slug !== slug) redirect(`/app/${org.slug}`);
  const tenant = getTenant(slug);
  if (!tenant) redirect("/login");
  if (!tenant.onboardComplete) redirect("/onboard");
  return <CrmClient tenant={tenant} />;
}
