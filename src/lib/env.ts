export function getEnv(name: string): string | undefined {
  const value = process.env[name]
  if (value === undefined || value.trim() === "") return undefined
  return value
}

export function requiredEnv(name: string): string {
  const value = getEnv(name)
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

export function commaListEnv(name: string, fallback: readonly string[]): string[] {
  const value = getEnv(name)
  if (!value) return [...fallback]
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
