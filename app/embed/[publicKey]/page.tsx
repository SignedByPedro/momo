import EmbeddedClientWidget from "@/components/widget/EmbeddedClientWidget";
import { getPublicWidgetBundle } from "@/lib/widget/public-widget";
import EmbedTransparency from "./EmbedTransparency";

export const dynamic = "force-dynamic";

const transparentDocumentStyle = `
  :root, html, body {
    background: rgba(0, 0, 0, 0) !important;
    background-color: rgba(0, 0, 0, 0) !important;
    background-image: none !important;
    color-scheme: normal !important;
  }

  html, body {
    overflow: hidden !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body {
    min-height: 0 !important;
  }

  .momo-embed-root {
    background: rgba(0, 0, 0, 0) !important;
    background-color: rgba(0, 0, 0, 0) !important;
    background-image: none !important;
  }
`;

export default async function EmbeddedWidgetPage({
  params,
}: {
  params: Promise<{ publicKey: string }>;
}) {
  const { publicKey } = await params;
  const bundle = await getPublicWidgetBundle(publicKey);

  if (!bundle) {
    return (
      <>
        <style>{transparentDocumentStyle}</style>
        <EmbedTransparency />
      </>
    );
  }

  return (
    <>
      <style>{transparentDocumentStyle}</style>
      <EmbedTransparency />
      <EmbeddedClientWidget
        publicKey={publicKey}
        organizationName={bundle.organization.name}
        primaryLanguage={bundle.organization.primary_language}
        agentName={bundle.agent.name}
        welcomeMessage={bundle.agent.welcome_message}
        placeholder={bundle.agent.placeholder}
        widgetConfig={bundle.widget}
      />
    </>
  );
}
