import { tool } from "@opencode-ai/plugin"
import { Effect } from "effect"
import { slackRequest } from "../slack/client.js"
import { SlackUnavailableError } from "../slack/errors.js"
import { askWrite, jsonResult, runTool } from "./common.js"

const z = tool.schema

export const slack_send_message = tool({
  description: "Send a Slack message as the connected user.",
  args: {
    channel_id: z.string().describe("Slack conversation ID."),
    message: z.string().min(1).describe("Slack-ready message text."),
    thread_ts: z.string().optional().describe("Thread timestamp for replies. Omit for normal messages."),
  },
  async execute(args, ctx) {
    return runTool(
      Effect.gen(function* () {
        yield* askWrite(ctx, {
          permission: "slack.write.send",
          title: "send message",
          channelId: args.channel_id,
          text: args.message,
          ...(args.thread_ts ? { threadTs: args.thread_ts } : {}),
        })
        const response = yield* slackRequest("chat.postMessage", {
          method: "POST",
          body: {
            channel: args.channel_id,
            text: args.message,
            ...(args.thread_ts ? { thread_ts: args.thread_ts } : {}),
          },
        })
        return jsonResult("Slack message sent", response)
      }),
    )
  },
})

export const slack_schedule_message = tool({
  description: "Schedule a Slack message as the connected user.",
  args: {
    channel_id: z.string().describe("Slack conversation ID."),
    message: z.string().min(1).describe("Slack-ready message text."),
    post_at: z.number().int().describe("Unix timestamp when Slack should post the message."),
    thread_ts: z.string().optional().describe("Thread timestamp for replies. Omit for normal messages."),
  },
  async execute(args, ctx) {
    return runTool(
      Effect.gen(function* () {
        yield* askWrite(ctx, {
          permission: "slack.write.schedule",
          title: "schedule message",
          channelId: args.channel_id,
          postAt: args.post_at,
          text: args.message,
          ...(args.thread_ts ? { threadTs: args.thread_ts } : {}),
        })
        const response = yield* slackRequest("chat.scheduleMessage", {
          method: "POST",
          body: {
            channel: args.channel_id,
            text: args.message,
            post_at: args.post_at,
            ...(args.thread_ts ? { thread_ts: args.thread_ts } : {}),
          },
        })
        return jsonResult("Slack message scheduled", response)
      }),
    )
  },
})

export const slack_create_canvas = tool({
  description: "Create a Slack canvas from markdown content as the connected user.",
  args: {
    title: z.string().min(1).describe("Canvas title."),
    content: z.string().min(1).describe("Markdown canvas content."),
  },
  async execute(args, ctx) {
    return runTool(
      Effect.gen(function* () {
        yield* askWrite(ctx, {
          permission: "slack.write.canvas",
          title: "create canvas",
          canvasTitle: args.title,
          text: args.content,
        })
        const response = yield* slackRequest("canvases.create", {
          method: "POST",
          body: {
            title: args.title,
            document_content: {
              type: "markdown",
              markdown: args.content,
            },
          },
        })
        return jsonResult("Slack canvas created", response)
      }),
    )
  },
})

export const slack_send_message_draft = tool({
  description: "Create an attached Slack draft. Currently unavailable until a Slack-supported ChatGPT-style draft API path is identified.",
  args: {
    channel_id: z.string().describe("Slack conversation ID."),
    message: z.string().min(1).describe("Slack-ready draft text."),
    thread_ts: z.string().optional().describe("Thread timestamp for draft replies."),
  },
  async execute(args, ctx) {
    return runTool(
      Effect.gen(function* () {
        yield* askWrite(ctx, {
          permission: "slack.write.draft",
          title: "create attached draft",
          channelId: args.channel_id,
          text: args.message,
          ...(args.thread_ts ? { threadTs: args.thread_ts } : {}),
        })
        return yield* Effect.fail(
          new SlackUnavailableError(
            "slack_send_message_draft is unavailable: Buddy Slack has not found a Slack-supported API path for ChatGPT-style attached drafts. This is a blocked feature exception, not a local draft substitute.",
          ),
        )
      }),
    )
  },
})

export const slack_edit_message = tool({
  description: "Edit a Slack message as the connected user when Slack allows the user to update it.",
  args: {
    channel_id: z.string().describe("Slack conversation ID."),
    message_id: z.string().describe("Slack message timestamp to edit."),
    message: z.string().min(1).describe("New Slack-ready message text."),
  },
  async execute(args, ctx) {
    return runTool(
      Effect.gen(function* () {
        yield* askWrite(ctx, {
          permission: "slack.write.edit",
          title: "edit message",
          channelId: args.channel_id,
          messageTs: args.message_id,
          text: args.message,
        })
        const response = yield* slackRequest("chat.update", {
          method: "POST",
          body: {
            channel: args.channel_id,
            ts: args.message_id,
            text: args.message,
          },
        })
        return jsonResult("Slack message edited", response)
      }),
    )
  },
})

export const slack_delete_message = tool({
  description: "Delete a Slack message as the connected user when Slack allows the user to delete it.",
  args: {
    channel_id: z.string().describe("Slack conversation ID."),
    message_id: z.string().describe("Slack message timestamp to delete."),
  },
  async execute(args, ctx) {
    return runTool(
      Effect.gen(function* () {
        yield* askWrite(ctx, {
          permission: "slack.write.delete",
          title: "delete message",
          channelId: args.channel_id,
          messageTs: args.message_id,
        })
        const response = yield* slackRequest("chat.delete", {
          method: "POST",
          body: {
            channel: args.channel_id,
            ts: args.message_id,
          },
        })
        return jsonResult("Slack message deleted", response)
      }),
    )
  },
})
