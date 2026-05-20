import { Effect } from "effect"
import { getEnv } from "../lib/env.js"
import type { SlackCurrentPointer, SlackTokenRecord } from "../types.js"
import * as Keychain from "./keychain.js"

export class TokenStoreError extends Error {
  readonly _tag = "TokenStoreError"

  constructor(message: string) {
    super(message)
  }
}

export type StoredSlackToken = {
  source: "env" | "keychain"
  token: SlackTokenRecord
}

function parseJson<T>(value: string, label: string) {
  return Effect.try({
    try: () => JSON.parse(value) as T,
    catch: () => new TokenStoreError(`Invalid ${label} JSON in keychain`),
  })
}

export function readToken(): Effect.Effect<StoredSlackToken | undefined, Error> {
  return Effect.gen(function* () {
    const envToken = getEnv("SLACK_USER_TOKEN")
    if (envToken) {
      return {
        source: "env" as const,
        token: {
          teamId: "env",
          userId: "env",
          accessToken: envToken,
        } satisfies SlackTokenRecord,
      }
    }
    const pointerText = yield* Keychain.readCurrent()
    if (!pointerText) return undefined
    const pointer = yield* parseJson<SlackCurrentPointer>(pointerText, "current Slack pointer")
    const tokenText = yield* Keychain.readSecret(Keychain.tokenAccount(pointer.teamId, pointer.userId))
    if (!tokenText) return undefined
    const token = yield* parseJson<SlackTokenRecord>(tokenText, "Slack token")
    return {
      source: "keychain" as const,
      token,
    }
  })
}

export function writeToken(token: SlackTokenRecord) {
  return Effect.all([
    Keychain.writeSecret(Keychain.tokenAccount(token.teamId, token.userId), JSON.stringify(token)),
    Keychain.writeCurrent(JSON.stringify({ teamId: token.teamId, userId: token.userId } satisfies SlackCurrentPointer)),
  ]).pipe(Effect.asVoid)
}

export function deleteToken() {
  return Effect.gen(function* () {
    const pointerText = yield* Keychain.readCurrent()
    if (!pointerText) return
    const pointer = yield* parseJson<SlackCurrentPointer>(pointerText, "current Slack pointer")
    yield* Keychain.deleteSecret(Keychain.tokenAccount(pointer.teamId, pointer.userId))
    yield* Keychain.deleteCurrent()
  })
}
