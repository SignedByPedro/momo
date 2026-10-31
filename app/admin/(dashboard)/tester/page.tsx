import { redirect } from "next/navigation";

export default async function TesterPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const query = await searchParams;
  const clientId = typeof query.client === "string" ? query.client.trim() : "";
  if (clientId) redirect(`/admin/clients/${clientId}/knowledge#tester`);
  redirect("/admin/clients");
}
