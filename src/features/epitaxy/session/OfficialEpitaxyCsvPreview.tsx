/**
 * Official cd5fd `EpitaxyCsvPreview` — `epitaxy-document-csv-frame` / head.
 */
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch === "\r") continue;
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function OfficialEpitaxyCsvPreview({
  contents,
  delimiter,
}: {
  contents: string;
  delimiter: "," | "\t" | ";";
}) {
  const rows = parseDelimited(contents, delimiter);
  const header = rows[0] ?? [];
  const body = rows.slice(1);
  return (
    <div className="epitaxy-document-csv-frame flex-1 min-h-0 overflow-auto select-text">
      <div className="flex min-h-control shrink-0 items-center gap-md border-b border-alpha-2 px-xl py-xs box-content">
        <span className="epitaxy-document-csv-head text-footnote text-muted tabular-nums">
          {Math.max(0, rows.length - (header.length > 0 ? 1 : 0))} rows
        </span>
      </div>
      <table className="w-full border-collapse text-code text-t8">
        {header.length > 0 ? (
          <thead>
            <tr>
              {header.map((cell, index) => (
                <th className="border-b border-alpha-2 px-md py-xs text-left text-footnote text-muted" key={index}>
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {(row.length > 0 ? row : header.map(() => "")).map((cell, c) => (
                <td className="border-b border-alpha-2 px-md py-xs align-top" key={c}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
