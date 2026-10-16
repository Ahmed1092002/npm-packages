/**
 * Standard RFC 4180 compliant CSV utility.
 */

/**
 * Escapes an individual field for RFC 4180 compliant CSV output.
 *
 * Rules:
 * - null or undefined produces an empty string.
 * - If the value contains double quotes, commas, CR, LF, or leading/trailing whitespace,
 *   it must be surrounded by double quotes.
 * - Any inner double quote `"` must be escaped as `""`.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Check if quoting is required
  const needsQuoting =
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.startsWith(' ') ||
    str.endsWith(' ');

  if (!needsQuoting) {
    return str;
  }

  // Escape inner double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Formats an array of field values into a single CSV row.
 */
export function formatCsvRow(fields: unknown[]): string {
  return fields.map(escapeCsvField).join(',');
}

/**
 * Formats headers and row data into a full RFC 4180 CSV string.
 * Uses CRLF line breaks according to standard specification.
 */
export function formatCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = formatCsvRow(headers);
  const dataLines = rows.map((row) => formatCsvRow(row));

  return [headerLine, ...dataLines].join('\r\n') + '\r\n';
}
