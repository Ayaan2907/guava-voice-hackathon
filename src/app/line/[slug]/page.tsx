import { notFound } from "next/navigation";
import { LineClient } from "@/components/line-client";
import { getTenant } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = getTenant(slug);
  if (!tenant) notFound();
  return <LineClient tenant={tenant} />;
}
