import type { Metadata } from "next";
import PresentationExperience from "./PresentationExperience";

export const metadata: Metadata = {
  title: "Momo · Apresentação",
  description: "Apresentação interativa do Momo.",
};

export default function PresentationPage() {
  return <PresentationExperience />;
}
