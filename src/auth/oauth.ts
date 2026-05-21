import { Effect } from "effect"
import { commaListEnv, getEnv, requiredEnv } from "../lib/env.js"
import type { SlackTokenRecord } from "../types.js"
import { writeToken } from "./token-store.js"

const DEFAULT_USER_SCOPES = [
  "users:read",
  "users:read.email",
  "channels:read",
  "groups:read",
  "im:read",
  "mpim:read",
  "channels:history",
  "groups:history",
  "im:history",
  "mpim:history",
  "search:read",
  "chat:write",
  "canvases:read",
  "canvases:write",
] as const

type PendingOAuth = {
  state: string
  startedAt: number
  redirectUri: string
  server: Bun.Server<unknown>
  result?: Promise<SlackTokenRecord>
}

let pending: PendingOAuth | undefined

export class OAuthError extends Error {
  readonly _tag = "OAuthError"

  constructor(message: string) {
    super(message)
  }
}

function redirectUri() {
  return getEnv("BUDDY_SLACK_REDIRECT_URI") ?? "http://127.0.0.1:34267/oauth/slack/callback"
}

function randomState() {
  return crypto.randomUUID().replace(/-/g, "")
}

function html(message: string) {
  return new Response(`<html><body><p>${message}</p></body></html>`, {
    headers: { "content-type": "text/html; charset=utf-8" },
  })
}

function exchangeCode(code: string, redirect: string) {
  return Effect.tryPromise({
    try: async () => {
      const body = new URLSearchParams({
        client_id: requiredEnv("SLACK_CLIENT_ID"),
        client_secret: requiredEnv("SLACK_CLIENT_SECRET"),
        code,
        redirect_uri: redirect,
      })
      const response = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      })
      const json = (await response.json()) as any
      if (!json.ok) {
        throw new Error(json.error ?? `Slack OAuth failed with HTTP ${response.status}`)
      }
      const authed = json.authed_user ?? {}
      const accessToken = authed.access_token
      if (typeof accessToken !== "string" || accessToken.length === 0) {
        throw new Error("Slack OAuth response did not include authed_user.access_token")
      }
      const teamId = String(json.team?.id ?? json.team_id ?? "unknown")
      const userId = String(authed.id ?? json.authed_user_id ?? "unknown")
      const expiresIn = typeof authed.expires_in === "number" ? authed.expires_in : undefined
      const token: SlackTokenRecord = {
        teamId,
        ...(typeof json.team?.name === "string" ? { teamName: json.team.name } : {}),
        userId,
        accessToken,
        ...(typeof authed.refresh_token === "string" ? { refreshToken: authed.refresh_token } : {}),
        ...(expiresIn ? { expiresAt: Date.now() + expiresIn * 1000 } : {}),
        ...(typeof authed.scope === "string" ? { scope: authed.scope } : {}),
      }
      await Effect.runPromise(writeToken(token))
      return token
    },
    catch: (error) => new OAuthError(error instanceof Error ? error.message : "Slack OAuth exchange failed"),
  })
}

function startServer(state: string, redirect: string) {
  const callbackUrl = new URL(redirect)
  let resolve!: (value: SlackTokenRecord) => void
  let reject!: (error: unknown) => void
  const result = new Promise<SlackTokenRecord>((ok, fail) => {
    resolve = ok
    reject = fail
  })

  const server = Bun.serve({
    hostname: callbackUrl.hostname,
    port: Number(callbackUrl.port || 80),
    fetch(request) {
      const url = new URL(request.url)
      if (url.pathname !== callbackUrl.pathname) return new Response("Not found", { status: 404 })
      if (url.searchParams.get("state") !== state) {
        reject(new OAuthError("Slack OAuth state mismatch"))
        return html("Buddy Slack authorization failed: state mismatch.")
      }
      const code = url.searchParams.get("code")
      if (!code) {
        reject(new OAuthError("Slack OAuth callback did not include a code"))
        return html("Buddy Slack authorization failed: missing code.")
      }
      Effect.runPromise(exchangeCode(code, redirect)).then(resolve, reject)
      return html("Buddy Slack authorization complete. You can return to opencode.")
    },
  })

  return { server, result }
}

export function startOAuth() {
  return Effect.try({
    try: () => {
      const redirect = redirectUri()
      const state = randomState()
      pending?.server.stop(true)
      const { server, result } = startServer(state, redirect)
      pending = {
        state,
        startedAt: Date.now(),
        redirectUri: redirect,
        server,
        result,
      }

      const url = new URL("https://slack.com/oauth/v2/authorize")
      url.searchParams.set("client_id", requiredEnv("SLACK_CLIENT_ID"))
      url.searchParams.set("user_scope", commaListEnv("BUDDY_SLACK_USER_SCOPES", DEFAULT_USER_SCOPES).join(","))
      url.searchParams.set("redirect_uri", redirect)
      url.searchParams.set("state", state)
      return {
        url: url.toString(),
        redirectUri: redirect,
        state,
      }
    },
    catch: (error) => new OAuthError(error instanceof Error ? error.message : "Unable to start Slack OAuth"),
  })
}

export function waitForOAuth() {
  return Effect.tryPromise({
    try: async () => {
      if (!pending?.result) throw new Error("No Slack OAuth flow is pending. Run slack_auth_start first.")
      const token = await pending.result
      pending.server.stop(true)
      pending = undefined
      return token
    },
    catch: (error) => new OAuthError(error instanceof Error ? error.message : "Slack OAuth did not complete"),
  })
}
