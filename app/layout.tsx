import type { Metadata } from "next";
import "./globals.css";
import AppInteractionFeedback from "./_components/AppInteractionFeedback";

export const metadata: Metadata = {
  title: "Momo",
  description: "Momo is an AI assistant that helps organizations stay available, answer questions and support the people who reach out.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" style={{ background: "transparent", backgroundColor: "transparent" }}>
      <body style={{ background: "transparent", backgroundColor: "transparent" }}>
        <AppInteractionFeedback />
        {children}
      </body>
    </html>
  );
}
