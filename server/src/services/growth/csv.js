// Minimal CSV writer. Cells that start with = + - @ (or a tab / CR) are prefixed with an apostrophe so a spreadsheet
// never runs them as a formula (CSV injection), and anything with a comma, quote or newline is quoted.
const cell = (value) => {
  let text = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const toCsv = (header, rows) => [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
