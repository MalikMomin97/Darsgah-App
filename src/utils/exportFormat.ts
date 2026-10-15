/** Escaping helpers for report HTML and CSV exports. */

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Quotes a CSV cell, doubling embedded quotes. */
export function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',');
}
