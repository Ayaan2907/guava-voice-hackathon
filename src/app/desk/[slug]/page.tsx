import { notFound } from "next/navigation";
import { DeskClient } from "@/components/desk-client";
import { getTenant } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DeskPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = getTenant(slug);
  if (!tenant) notFound();
  return <DeskClient tenant={tenant} />;
}
