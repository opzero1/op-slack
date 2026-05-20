import { tool } from "@opencode-ai/plugin"
import { Effect } from "effect"
import { table } from "../lib/format.js"
import { slackRequest } from "../slack/client.js"
import { jsonResult, runTool } from "./common.js"

const z = tool.schema

export const slack_read_user_profile = tool({
  description: "Read the connected Slack user's profile, or a specific Slack user's profile when user_id is provided.",
  args: {
    user_id: z.string().optional().describe("Slack user ID such as U123456. Omit for the connected user."),
  },
  async execute(args) {
    return runTool(
      Effect.gen(function* () {
        if (args.user_id) {
          const profile = yield* slackRequest("users.info", { query: { user: args.user_id } })
          return jsonResult("Slack user profile", profile)
        }
        const auth = yield* slackRequest("auth.test")
        const userId = typeof auth.user_id === "string" ? auth.user_id : undefined
        if (!userId) return jsonResult("Slack auth test", auth)
        const profile = yield* slackRequest("users.info", { query: { user: userId } })
        return jsonResult("Slack connected user profile", profile)
      }),
    )
  },
})

export const slack_search_channels = tool({
  description: "Search Slack conversations by name using the connected user's visibility.",
  args: {
    query: z.string().optional().describe("Case-insensitive channel name fragment."),
    include_private: z.boolean().optional().describe("Include private channels visible to the user. Defaults to true."),
    limit: z.number().int().min(1).max(200).optional().describe("Maximum conversations to return."),
    cursor: z.string().optional().describe("Slack pagination cursor."),
  },
  async execute(args) {
    return runTool(
      Effect.gen(function* () {
        const response = yield* slackRequest("conversations.list", {
          query: {
            exclude_archived: true,
            limit: args.limit ?? 100,
            cursor: args.cursor,
            types: args.include_private === false ? "public_channel" : "public_channel,private_channel",
          },
        })
        const channels = Array.isArray(response.channels) ? response.channels : []
        const query = args.query?.toLowerCase()
        const filtered = query
          ? channels.filter((item: any) => String(item.name ?? "").toLowerCase().includes(query))
          : channels
        return {
          title: "Slack channels",
          output: table(
            ["ID", "Name", "Private", "Members"],
            filtered.map((item: any) => [
              String(item.id ?? ""),
              String(item.name ?? ""),
              String(Boolean(item.is_private)),
              String(item.num_members ?? ""),
            ]),
          ),
          metadata: {
            response_metadata: response.response_metadata ?? {},
          },
        }
      }),
    )
  },
})

export const slack_read_channel = tool({
  description: "Read recent messages from a Slack channel, DM, MPIM, or private channel visible to the connected user.",
  args: {
    channel_id: z.string().describe("Slack conversation ID."),
    limit: z.number().int().min(1).max(200).optional(),
    cursor: z.string().optional(),
    latest: z.string().optional().describe("Slack timestamp upper bound."),
    oldest: z.string().optional().describe("Slack timestamp lower bound."),
  },
  async execute(args) {
    return runTool(
      slackRequest("conversations.history", {
          query: {
            channel: args.channel_id,
            limit: args.limit ?? 50,
            cursor: args.cursor,
            latest: args.latest,
            oldest: args.oldest,
          },
      }).pipe(Effect.map((response) => jsonResult("Slack channel messages", response))),
    )
  },
})

export const slack_read_thread = tool({
  description: "Read a Slack thread parent and replies.",
  args: {
    channel_id: z.string().describe("Slack conversation ID."),
    message_ts: z.string().describe("Parent message timestamp."),
    limit: z.number().int().min(1).max(200).optional(),
    cursor: z.string().optional(),
  },
  async execute(args) {
    return runTool(
      slackRequest("conversations.replies", {
          query: {
            channel: args.channel_id,
            ts: args.message_ts,
            limit: args.limit ?? 100,
            cursor: args.cursor,
          },
      }).pipe(Effect.map((response) => jsonResult("Slack thread", response))),
    )
  },
})

export const slack_search_public = tool({
  description: "Search public Slack messages visible to the connected user.",
  args: {
    query: z.string().describe("Slack search query."),
    count: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).optional(),
  },
  async execute(args) {
    return runTool(
      slackRequest("search.messages", {
          query: {
            query: args.query,
            count: args.count ?? 20,
            page: args.page,
          },
      }).pipe(Effect.map((response) => jsonResult("Slack public search", response))),
    )
  },
})

export const slack_search_public_and_private = tool({
  description: "Search public and private Slack messages visible to the connected user.",
  args: {
    query: z.string().describe("Slack search query."),
    count: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).optional(),
  },
  async execute(args) {
    return runTool(
      slackRequest("search.messages", {
          query: {
            query: args.query,
            count: args.count ?? 20,
            page: args.page,
          },
      }).pipe(Effect.map((response) => jsonResult("Slack search", response))),
    )
  },
})

export const slack_search_users = tool({
  description: "Search Slack users visible to the connected user.",
  args: {
    query: z.string().optional().describe("Case-insensitive name or email fragment."),
    limit: z.number().int().min(1).max(200).optional(),
    cursor: z.string().optional(),
  },
  async execute(args) {
    return runTool(
      Effect.gen(function* () {
        const response = yield* slackRequest("users.list", {
          query: {
            limit: args.limit ?? 100,
            cursor: args.cursor,
          },
        })
        const members = Array.isArray(response.members) ? response.members : []
        const query = args.query?.toLowerCase()
        const filtered = query
          ? members.filter((item: any) => {
              const values = [item.name, item.real_name, item.profile?.email, item.profile?.display_name]
              return values.some((value) => String(value ?? "").toLowerCase().includes(query))
            })
          : members
        return {
          title: "Slack users",
          output: table(
            ["ID", "Name", "Real Name", "Email"],
            filtered.map((item: any) => [
              String(item.id ?? ""),
              String(item.name ?? ""),
              String(item.real_name ?? ""),
              String(item.profile?.email ?? ""),
            ]),
          ),
          metadata: {
            response_metadata: response.response_metadata ?? {},
          },
        }
      }),
    )
  },
})

export const slack_read_canvas = tool({
  description: "Read Slack canvas sections when the connected workspace exposes canvas APIs.",
  args: {
    canvas_id: z.string().describe("Slack canvas ID."),
  },
  async execute(args) {
    return runTool(
      slackRequest("canvases.sections.lookup", {
          method: "POST",
          body: {
            canvas_id: args.canvas_id,
          },
      }).pipe(Effect.map((response) => jsonResult("Slack canvas", response))),
    )
  },
})
