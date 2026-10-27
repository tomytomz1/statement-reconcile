import { Container, Heading, Section } from "@/components/ui/primitives";
import { exampleCsv, exampleStatement, type ExampleKind } from "@/lib/seo/statement-example";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

export function StatementExample({ kind }: { kind: ExampleKind }) {
  const sample = exampleStatement(kind);
  const card = kind === "card";
  const csv = exampleCsv(kind);
  const fileName = card ? "example-card-transactions.csv" : "example-bank-transactions.csv";

  return (
    <Section tone="raised" labelledBy="worked-statement-example">
      <Container>
        <div className="max-w-3xl">
          <p className="text-ink-600 text-xs font-semibold uppercase tracking-wider">
            Downloadable worked example
          </p>
          <Heading id="worked-statement-example" className="mt-3">
            {card
              ? "See how card purchases and payments affect the amount owed"
              : "See how deposits and withdrawals reconcile to the ending balance"}
          </Heading>
          <p className="text-ink-700 mt-4 text-sm leading-relaxed">
            This is a small, entirely fictional example to explain the columns and arithmetic.
            It is not a processed customer statement or a claim that our converter has verified
            any particular bank or card format. Your own files are evaluated by the product
            separately before checkout.
          </p>
        </div>
        <div className="border-ink-200 mt-6 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              Fictional statement transactions with the running balance after each entry
            </caption>
            <thead className="bg-ink-50 text-ink-900">
              <tr>
                <th scope="col" className="border-ink-200 border-b px-4 py-3">Date</th>
                <th scope="col" className="border-ink-200 border-b px-4 py-3">Fictional transaction</th>
                <th scope="col" className="border-ink-200 border-b px-4 py-3 text-right">Change</th>
                <th scope="col" className="border-ink-200 border-b px-4 py-3 text-right">
                  {card ? "Amount owed" : "Balance"}
                </th>
              </tr>
            </thead>
            <tbody className="text-ink-800">
              {sample.transactions.map((row) => (
                <tr key={row.date}>
                  <td className="border-ink-100 border-b px-4 py-3 whitespace-nowrap">{row.date}</td>
                  <th scope="row" className="border-ink-100 border-b px-4 py-3 font-medium">
                    {row.description}
                  </th>
                  <td className="border-ink-100 border-b px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    {money(row.movementCents)}
                  </td>
                  <td className="border-ink-100 border-b px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    {money(row.balanceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-ink-200 mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5">
          <div className="text-ink-800 text-sm leading-relaxed">
            <strong>{money(sample.openingCents)}</strong>
            <span className="mx-2">+</span>
            <strong>{money(sample.netChangeCents)}</strong>
            <span className="mx-2">=</span>
            <strong>{money(sample.closingCents)}</strong>
            <p className="text-ink-600 mt-1 text-xs">
              {card ? "Example amount owed, including charges and credits" : "Example opening balance, net activity, and closing balance"}
            </p>
          </div>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
            download={fileName}
            className="bg-accent-700 hover:bg-accent-800 inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold text-white"
          >
            Download example CSV
          </a>
        </div>
        <p className="text-ink-600 mt-3 text-xs leading-relaxed">
          The example CSV has Date, Posted Date, Description, Debit, Credit, Amount and Balance
          columns. Dates and numbers are synthetic. A real conversion may have different
          available fields depending on the original PDF and verification result.
        </p>
      </Container>
    </Section>
  );
}
