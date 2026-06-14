/**
 * Exporta CSV compatível com Excel/Numbers em pt-BR:
 * BOM para acentuação correta, ponto e vírgula como separador
 * (a vírgula é o separador decimal) e células sempre entre aspas.
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const content =
    "\uFEFF" + [headers, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Valor numérico no formato decimal pt-BR ("1234,56") para uso em células CSV. */
export function amountToCSV(value: number): string {
  return value.toFixed(2).replace(".", ",");
}
