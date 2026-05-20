export function compactJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, "\\|").replace(/\n/g, " ")
  return [
    `| ${headers.map(escape).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`),
  ].join("\n")
}

export function preview(value: string, max = 500): string {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1)}...`
}
