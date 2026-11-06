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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: "transparent", backgroundColor: "transparent" }}>
        <AppInteractionFeedback />
        {children}
      </body>
    </html>
  );
}
