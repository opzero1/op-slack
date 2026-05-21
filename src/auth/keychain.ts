import { Effect } from "effect"

const SERVICE = "buddy-slack"
const CURRENT_ACCOUNT = "__current__"

export class KeychainError extends Error {
  readonly _tag = "KeychainError"

  constructor(
    readonly operation: string,
    message: string,
  ) {
    super(message)
  }
}

function decodeOutput(output: Uint8Array): string {
  return new TextDecoder().decode(output).trim()
}

function security(args: string[]) {
  return Effect.tryPromise({
    try: async () => {
      const proc = Bun.spawn(["security", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      })
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).arrayBuffer(),
        new Response(proc.stderr).arrayBuffer(),
        proc.exited,
      ])
      if (exitCode !== 0) {
        throw new Error(decodeOutput(new Uint8Array(stderr)) || `security exited with ${exitCode}`)
      }
      return decodeOutput(new Uint8Array(stdout))
    },
    catch: (error) =>
      new KeychainError("security", error instanceof Error ? error.message : "Unknown keychain failure"),
  })
}

export function readSecret(account: string) {
  return security(["find-generic-password", "-a", account, "-s", SERVICE, "-w"]).pipe(
    Effect.catchTag("KeychainError", (error) => {
      if (error.message.includes("could not be found")) return Effect.succeed(undefined)
      return Effect.fail(error)
    }),
  )
}

export function writeSecret(account: string, value: string) {
  return security(["add-generic-password", "-a", account, "-s", SERVICE, "-w", value, "-U"]).pipe(Effect.asVoid)
}

export function deleteSecret(account: string) {
  return security(["delete-generic-password", "-a", account, "-s", SERVICE]).pipe(
    Effect.catchTag("KeychainError", (error) => {
      if (error.message.includes("could not be found")) return Effect.void
      return Effect.fail(error)
    }),
  )
}

export function readCurrent() {
  return readSecret(CURRENT_ACCOUNT)
}

export function writeCurrent(value: string) {
  return writeSecret(CURRENT_ACCOUNT, value)
}

export function deleteCurrent() {
  return deleteSecret(CURRENT_ACCOUNT)
}

export function tokenAccount(teamId: string, userId: string) {
  return `${teamId}:${userId}`
}
