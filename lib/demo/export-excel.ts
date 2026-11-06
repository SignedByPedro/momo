import {
  PRICE_BANDS,
  QUESTION_IDS,
  demoPhaseLabel,
  priceLabel,
  type DemoLanguage,
  type DemoSessionState,
  type PriceBand,
} from "@/lib/demo/script";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cell(value: string | number, type: "String" | "Number" = "String") {
  return `<Cell><Data ss:Type="${type}">${escapeXml(String(value))}</Data></Cell>`;
}

function row(cells: string[]) {
  return `<Row>${cells.join("")}</Row>`;
}

function interestLabel(session: DemoSessionState, language: DemoLanguage) {
  if (session.interested === true) return language === "en" ? "Yes" : "Sim";
  if (session.interested === false) return language === "en" ? "Not interested" : "Não estou interessado";
  return "";
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().replace("T", " ").slice(0, 19);
}

function questionFlags(session: DemoSessionState) {
  return QUESTION_IDS.map((id) => (session.questionsSeen.includes(id) ? "1" : "0"));
}

function countBy<T extends string>(values: Array<T | null | undefined>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value ?? "";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function buildDemoStatsExcel(sessions: DemoSessionState[], language: DemoLanguage) {
  const headers =
    language === "en"
      ? [
          "Name",
          "Price",
          "Interest",
          "Contact",
          "Stage",
          "Language",
          "Q1 purpose",
          "Q2 why",
          "Q3 what",
          "Created at",
          "Updated at",
          "Completed at",
        ]
      : [
          "Nome",
          "Valor",
          "Interesse",
          "Contacto",
          "Fase",
          "Idioma",
          "P1 purpose",
          "P2 why",
          "P3 what",
          "Criado em",
          "Atualizado em",
          "Concluído em",
        ];

  const responseRows = [
    row(headers.map((header) => cell(header))),
    ...sessions.map((session) => {
      const [q1, q2, q3] = questionFlags(session);
      return row([
        cell(session.visitorName ?? ""),
        cell(session.priceBand ? priceLabel(session.priceBand) : ""),
        cell(interestLabel(session, language)),
        cell(session.email ?? ""),
        cell(demoPhaseLabel(session.phase, language)),
        cell(session.language.toUpperCase()),
        cell(q1),
        cell(q2),
        cell(q3),
        cell(formatDate(session.createdAt)),
        cell(formatDate(session.updatedAt)),
        cell(formatDate(session.completedAt)),
      ]);
    }),
  ];

  const priceCounts = countBy(sessions.map((session) => session.priceBand));
  const interestCounts = countBy(
    sessions.map((session) =>
      session.interested === true ? "yes" : session.interested === false ? "no" : "blank",
    ),
  );
  const phaseCounts = countBy(sessions.map((session) => session.phase));

  const summaryTitle = language === "en" ? "Metric" : "Métrica";
  const summaryValue = language === "en" ? "Count" : "Total";
  const summaryRows = [
    row([cell(summaryTitle), cell(summaryValue)]),
    row([cell(language === "en" ? "Sessions" : "Sessões"), cell(sessions.length, "Number")]),
    row([
      cell(language === "en" ? "With contact" : "Com contacto"),
      cell(sessions.filter((session) => Boolean(session.email)).length, "Number"),
    ]),
    row([cell(language === "en" ? "Interested" : "Interessados"), cell(interestCounts.get("yes") ?? 0, "Number")]),
    row([
      cell(language === "en" ? "Not interested" : "Não interessados"),
      cell(interestCounts.get("no") ?? 0, "Number"),
    ]),
    ...PRICE_BANDS.map((band: PriceBand) =>
      row([
        cell(language === "en" ? `Price ${priceLabel(band)}` : `Valor ${priceLabel(band)}`),
        cell(priceCounts.get(band) ?? 0, "Number"),
      ]),
    ),
    ...["awaiting_name", "exploring", "awaiting_price", "awaiting_interest", "awaiting_email", "free"].map((phase) =>
      row([
        cell(
          language === "en"
            ? `Stage ${demoPhaseLabel(phase as DemoSessionState["phase"], "en")}`
            : `Fase ${demoPhaseLabel(phase as DemoSessionState["phase"], "pt")}`,
        ),
        cell(phaseCounts.get(phase) ?? 0, "Number"),
      ]),
    ),
  ];

  const responsesName = language === "en" ? "Responses" : "Respostas";
  const summaryName = language === "en" ? "Summary" : "Resumo";

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="${escapeXml(responsesName)}">
  <Table>
${responseRows.join("\n")}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="${escapeXml(summaryName)}">
  <Table>
${summaryRows.join("\n")}
  </Table>
 </Worksheet>
</Workbook>`;
}
