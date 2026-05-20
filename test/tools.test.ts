import { describe, expect, test } from "bun:test"
import type { ToolContext } from "@opencode-ai/plugin"
import { slack_send_message_draft } from "../src/tools/write.js"

function fakeContext(permissions: unknown[]): ToolContext {
  return {
    sessionID: "ses_1",
    messageID: "msg_1",
    agent: "test",
    directory: process.cwd(),
    worktree: process.cwd(),
    abort: new AbortController().signal,
    metadata() {},
    async ask(input) {
      permissions.push(input)
    },
  }
}

describe("Slack write tools", () => {
  test("draft tool asks for scoped permission then returns explicit unavailable result", async () => {
    const permissions: unknown[] = []
    const result = await slack_send_message_draft.execute(
      {
        channel_id: "C123",
        message: "hello",
      },
      fakeContext(permissions),
    )

    expect(typeof result).toBe("object")
    expect(permissions).toHaveLength(1)
    expect(JSON.stringify(permissions[0])).toContain("slack.write.draft")
    expect(JSON.stringify(result)).toContain("unavailable")
    expect(JSON.stringify(result)).toContain("blocked feature exception")
  })
})
