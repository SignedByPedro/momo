import { normalizeUiLanguage } from "@/lib/i18n/ui";
import AcceptInviteClient from "./AcceptInviteClient";

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const query = await searchParams;
  return <AcceptInviteClient language={normalizeUiLanguage(query.lang)} />;
}
