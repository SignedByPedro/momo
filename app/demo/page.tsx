import type { Metadata } from "next";
import DemoExperience from "./DemoExperience";

export const metadata: Metadata = {
  title: "Momo",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoExperience />;
}
