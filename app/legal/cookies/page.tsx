import {
  LegalList,
  LegalSection,
  LegalShell,
  LegalTable,
} from "../_components/LegalShell";
import { normalizeLegalLanguage } from "../legal-config";

export default async function CookiesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const query = await searchParams;
  const language = normalizeLegalLanguage(query.lang);
  const en = language === "en";

  return (
    <LegalShell
      language={language}
      path="/legal/cookies"
      eyebrow={en ? "Device storage" : "Armazenamento no dispositivo"}
      title={en ? "Cookies & Local Storage" : "Cookies e Armazenamento Local"}
      intro={
        en
          ? "This draft reflects the current Momo codebase: essential authentication storage for the portals and a language preference stored in the browser. No advertising or marketing analytics integration is currently present in the application code reviewed for this version."
          : "Este rascunho reflete o código atual do Momo: armazenamento essencial de autenticação nos portais e uma preferência de idioma guardada no browser. Não existe atualmente no código revisto desta versão uma integração de analytics publicitária ou de marketing."
      }
    >
      <LegalTable
        headers={en ? ["Technology", "Purpose", "Category", "Current consent approach"] : ["Tecnologia", "Finalidade", "Categoria", "Abordagem atual de consentimento"]}
        rows={[
          [
            en ? "Supabase authentication cookies" : "Cookies de autenticação Supabase",
            en ? "Maintain authenticated sessions for authorised customer/admin portal users and refresh those sessions securely." : "Manter sessões autenticadas de utilizadores autorizados dos portais de cliente/admin e renovar essas sessões de forma segura.",
            en ? "Strictly necessary / security" : "Estritamente necessário / segurança",
            en ? "Required for the requested authenticated service; not used for advertising." : "Necessário para o serviço autenticado solicitado; não é utilizado para publicidade.",
          ],
          [
            "localStorage: momo-language",
            en ? "Remember whether the user selected Portuguese or English in the Momo commercial chat." : "Recordar se o utilizador selecionou Português ou Inglês no chat comercial do Momo.",
            en ? "User-requested preference" : "Preferência solicitada pelo utilizador",
            en ? "Used only to remember the chosen language and not for cross-site tracking." : "Utilizado apenas para recordar o idioma escolhido e não para tracking entre websites.",
          ],
        ]}
      />

      <LegalSection title={en ? "No marketing/analytics cookie banner at this stage" : "Sem banner de cookies de marketing/analytics nesta fase"}>
        <p>{en ? "Because the current reviewed application does not include non-essential advertising or marketing analytics cookies, this draft does not introduce a generic consent banner merely for appearance. Essential authentication storage remains necessary for signed-in portal functions." : "Como a aplicação atual revista não inclui cookies não essenciais de publicidade ou analytics de marketing, este rascunho não introduz um banner genérico de consentimento apenas por aparência. O armazenamento essencial de autenticação continua necessário para as funções autenticadas do portal."}</p>
        <p>{en ? "If Momo later adds analytics, advertising, behavioural tracking or another non-essential technology that stores or accesses information on the user's device, it must be reviewed before activation and, where consent is required, blocked until valid consent is obtained." : "Se o Momo adicionar mais tarde analytics, publicidade, tracking comportamental ou outra tecnologia não essencial que armazene ou aceda a informação no dispositivo do utilizador, essa tecnologia deve ser revista antes da ativação e, quando seja exigido consentimento, bloqueada até ser obtido consentimento válido."}</p>
      </LegalSection>

      <LegalSection title={en ? "Browser controls" : "Controlos do browser"}>
        <LegalList>
          <li>{en ? "Users can remove stored language preferences through browser site-data controls; Momo will recreate the preference when a language is selected again." : "Os utilizadores podem remover a preferência de idioma através dos controlos de dados do website no browser; o Momo volta a criá-la quando for novamente selecionado um idioma."}</li>
          <li>{en ? "Blocking authentication cookies can prevent login and portal sessions from working correctly." : "Bloquear cookies de autenticação pode impedir que o login e as sessões do portal funcionem corretamente."}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={en ? "Server-side logs are different from cookies" : "Logs server-side são diferentes de cookies"}>
        <p>{en ? "Hosting and security providers may process request metadata such as IP addresses in server-side logs or for abuse prevention. Those activities are described in the Privacy Policy and are not the same as placing advertising cookies on the user's device." : "Fornecedores de alojamento e segurança podem tratar metadados de pedidos, como endereços IP, em logs server-side ou para prevenção de abuso. Essas atividades são descritas na Política de Privacidade e não são o mesmo que colocar cookies publicitários no dispositivo do utilizador."}</p>
      </LegalSection>
    </LegalShell>
  );
}
