import { Context, Effect, Layer } from "effect"
import { readToken } from "../auth/token-store.js"
import type { SlackApiFailure, SlackApiSuccess } from "../types.js"
import { SlackApiError } from "./errors.js"

export type SlackRequestOptions = {
  method?: "GET" | "POST"
  query?: Record<string, string | number | boolean | undefined>
  body?: Record<string, unknown>
}

export type SlackClient = {
  request: <T extends SlackApiSuccess = SlackApiSuccess>(
    method: string,
    options?: SlackRequestOptions,
  ) => Effect.Effect<T, SlackApiError>
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function withQuery(url: URL, query?: SlackRequestOptions["query"]) {
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  return url
}

export function makeSlackClient(fetchImpl: FetchLike = fetch): SlackClient {
  return {
    request<T extends SlackApiSuccess>(method: string, options: SlackRequestOptions = {}) {
      return Effect.gen(function* () {
        const token = yield* readToken().pipe(
          Effect.mapError((error) => new SlackApiError(method, "auth_unavailable", { message: error.message })),
        )
        if (!token) return yield* Effect.fail(new SlackApiError(method, "not_connected"))

        const httpMethod = options.method ?? (options.body ? "POST" : "GET")
        const url = withQuery(new URL(`https://slack.com/api/${method}`), options.query)
        const response = yield* Effect.tryPromise({
          try: () =>
            fetchImpl(url, {
              method: httpMethod,
              headers: {
                authorization: `Bearer ${token.token.accessToken}`,
                ...(options.body ? { "content-type": "application/json; charset=utf-8" } : {}),
              },
              ...(options.body ? { body: JSON.stringify(options.body) } : {}),
            }),
          catch: (error) =>
            new SlackApiError(method, "network_error", {
              message: error instanceof Error ? error.message : String(error),
            }),
        })

        const retryAfter = response.headers.get("retry-after")
        const json = yield* Effect.tryPromise({
          try: () => response.json() as Promise<SlackApiSuccess | SlackApiFailure>,
          catch: (error) =>
            new SlackApiError(method, "invalid_json", {
              status: response.status,
              message: error instanceof Error ? error.message : String(error),
            }),
        })

        if (!response.ok && json.ok !== false) {
          return yield* Effect.fail(
            new SlackApiError(method, `http_${response.status}`, {
              status: response.status,
              ...(retryAfter ? { retryAfter } : {}),
            }),
          )
        }
        if (json.ok === false) {
          return yield* Effect.fail(
            new SlackApiError(method, json.error, {
              ...json,
              ...(retryAfter ? { retryAfter } : {}),
            }),
          )
        }
        return json as T
      })
    },
  }
}

export class SlackClientService extends Context.Tag("buddy-sos/SlackClient")<SlackClientService, SlackClient>() {}

export const SlackClientLive = Layer.succeed(SlackClientService, makeSlackClient())

export function slackRequest<T extends SlackApiSuccess = SlackApiSuccess>(method: string, options?: SlackRequestOptions) {
  return Effect.gen(function* () {
    const client = yield* SlackClientService
    return yield* client.request<T>(method, options)
  }).pipe(Effect.provide(SlackClientLive))
}
