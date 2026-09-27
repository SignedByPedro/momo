import { normalizeUiLanguage } from "@/lib/i18n/ui";
import AcceptAdminInviteClient from "./AcceptInviteClient";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AcceptAdminInvitePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const query = await searchParams;
  return <AcceptAdminInviteClient language={normalizeUiLanguage(query.lang)} />;
}
