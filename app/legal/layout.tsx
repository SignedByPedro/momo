import type { Metadata } from "next";
import { legalIsPublished } from "./legal-config";

export const metadata: Metadata = {
  title: "Legal · Momo",
  description: "Legal information for the Momo AI customer support platform.",
  robots: legalIsPublished
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
