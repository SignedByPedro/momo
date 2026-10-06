import { requireAdmin } from "@/lib/admin/auth";
import { getOrganizations } from "@/lib/admin/organizations";
import TesterClient from "./TesterClient";

export default async function TesterPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  await requireAdmin();
  const [organizations, query] = await Promise.all([getOrganizations(), searchParams]);
  const clients = organizations
    .filter((organization) => organization.status !== "purge_due")
    .map((organization) => ({
      id: organization.id,
      name: organization.name,
      status: organization.status,
    }));
  const initialClientId = clients.some((client) => client.id === query.client) ? query.client ?? "" : "";

  return <TesterClient clients={clients} initialClientId={initialClientId} />;
}
