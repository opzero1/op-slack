import type { ToolContext, ToolResult } from "@opencode-ai/plugin"
import { Effect } from "effect"
import { compactJson, preview } from "../lib/format.js"
import { SlackApiError, SlackUnavailableError } from "../slack/errors.js"

export function runTool(effect: Effect.Effect<ToolResult, Error>): Promise<ToolResult> {
  return Effect.runPromise(effect).catch((error: unknown) => {
    if (error instanceof SlackApiError) {
      return {
        title: `Slack API error: ${error.code}`,
        output: error.message,
        metadata: {
          method: error.method,
          code: error.code,
          detail: error.detail ?? {},
        },
      }
    }
    if (error instanceof SlackUnavailableError) {
      return {
        title: "Slack feature unavailable",
        output: error.message,
        metadata: {
          unavailable: true,
        },
      }
    }
    if (error instanceof Error) {
      return {
        title: "Slack tool error",
        output: error.message,
      }
    }
    return {
      title: "Slack tool error",
      output: String(error),
    }
  })
}

export function jsonResult(title: string, value: unknown, metadata?: Record<string, unknown>): ToolResult {
  return {
    title,
    output: compactJson(value),
    ...(metadata ? { metadata } : {}),
  }
}

export function askWrite(
  ctx: ToolContext,
  input: {
    permission: "slack.write.send" | "slack.write.schedule" | "slack.write.canvas" | "slack.write.draft" | "slack.write.edit" | "slack.write.delete"
    title: string
    channelId?: string
    threadTs?: string
    messageTs?: string
    postAt?: number
    canvasTitle?: string
    text?: string
  },
) {
  return Effect.tryPromise({
    try: () =>
      ctx.ask({
        permission: input.permission,
        patterns: ["*"],
        always: ["*"],
        metadata: {
          action: input.title,
          ...(input.channelId ? { channelId: input.channelId } : {}),
          ...(input.threadTs ? { threadTs: input.threadTs } : {}),
          ...(input.messageTs ? { messageTs: input.messageTs } : {}),
          ...(input.postAt ? { postAt: input.postAt } : {}),
          ...(input.canvasTitle ? { canvasTitle: input.canvasTitle } : {}),
          ...(input.text ? { preview: preview(input.text) } : {}),
        },
      }),
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  })
}
