import { tool } from "@opencode-ai/plugin"
import { Effect } from "effect"
import { deleteToken, readToken } from "../auth/token-store.js"
import { startOAuth, waitForOAuth } from "../auth/oauth.js"
import type { SlackAuthStatus } from "../types.js"
import { jsonResult, runTool } from "./common.js"

export const slack_auth_start = tool({
  description: "Start local Slack OAuth for Buddy Slack and return the Slack authorization URL.",
  args: {},
  async execute() {
    return runTool(
      Effect.gen(function* () {
        const started = yield* startOAuth()
        return {
          title: "Slack OAuth started",
          output: [
            "Open this Slack authorization URL, approve the app, then run `slack_auth_finish` or `slack_auth_status`.",
            "",
            started.url,
            "",
            `Redirect URI: ${started.redirectUri}`,
          ].join("\n"),
          metadata: {
            redirectUri: started.redirectUri,
          },
        }
      }),
    )
  },
})

export const slack_auth_finish = tool({
  description: "Wait for a pending local Slack OAuth callback and persist the resulting token in the OS keychain.",
  args: {},
  async execute() {
    return runTool(
      Effect.gen(function* () {
        const token = yield* waitForOAuth()
        return jsonResult("Slack OAuth complete", {
          connected: true,
          teamId: token.teamId,
          teamName: token.teamName,
          userId: token.userId,
          expiresAt: token.expiresAt,
          scope: token.scope,
        })
      }),
    )
  },
})

export const slack_auth_status = tool({
  description: "Show whether Buddy Slack has a Slack user token available from env or OS keychain.",
  args: {},
  async execute() {
    return runTool(
      Effect.gen(function* () {
        const current = yield* readToken()
        const status: SlackAuthStatus = current
          ? {
              connected: true,
              source: current.source,
              teamId: current.token.teamId,
              userId: current.token.userId,
              ...(current.token.teamName ? { teamName: current.token.teamName } : {}),
              ...(current.token.expiresAt ? { expiresAt: current.token.expiresAt } : {}),
              ...(current.token.scope ? { scope: current.token.scope } : {}),
            }
          : {
              connected: false,
              reason: "not_connected",
            }
        return jsonResult("Slack auth status", status)
      }),
    )
  },
})

export const slack_disconnect = tool({
  description: "Remove the current Buddy Slack token pointer and token from the OS keychain.",
  args: {},
  async execute() {
    return runTool(
      Effect.gen(function* () {
        yield* deleteToken()
        return {
          title: "Slack disconnected",
          output: "Removed the current Buddy Slack token from the OS keychain.",
        }
      }),
    )
  },
})
