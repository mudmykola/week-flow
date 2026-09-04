const FORMULA_PREFIX_CHARS = new Set(['=', '+', '-', '@'])

export function escapeCsvField(value: unknown) {
  let text = String(value ?? '')
  if (FORMULA_PREFIX_CHARS.has(text[0] ?? '')) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
