import type { Plugin, PluginModule } from "@opencode-ai/plugin"
import { slackSystemInstructions } from "./instructions.js"
import {
  slack_auth_finish,
  slack_auth_start,
  slack_auth_status,
  slack_disconnect,
} from "./tools/auth.js"
import {
  slack_read_canvas,
  slack_read_channel,
  slack_read_thread,
  slack_read_user_profile,
  slack_search_channels,
  slack_search_public,
  slack_search_public_and_private,
  slack_search_users,
} from "./tools/read.js"
import {
  slack_create_canvas,
  slack_delete_message,
  slack_edit_message,
  slack_schedule_message,
  slack_send_message,
  slack_send_message_draft,
} from "./tools/write.js"

export const server: Plugin = async () => ({
  "experimental.chat.system.transform": async (_input, output) => {
    output.system.push(...slackSystemInstructions)
  },
  tool: {
    slack_auth_start,
    slack_auth_finish,
    slack_auth_status,
    slack_disconnect,
    slack_read_user_profile,
    slack_search_channels,
    slack_read_channel,
    slack_read_thread,
    slack_search_public,
    slack_search_public_and_private,
    slack_search_users,
    slack_read_canvas,
    slack_send_message,
    slack_send_message_draft,
    slack_schedule_message,
    slack_create_canvas,
    slack_edit_message,
    slack_delete_message,
  },
})

export default {
  id: "buddy.slack",
  server,
} satisfies PluginModule
