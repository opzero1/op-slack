import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { Effect } from "effect"
import { makeSlackClient } from "../src/slack/client.js"
const originalToken = process.env.SLACK_USER_TOKEN

beforeEach(() => {
  process.env.SLACK_USER_TOKEN = "xoxp-test"
})

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.SLACK_USER_TOKEN
  } else {
    process.env.SLACK_USER_TOKEN = originalToken
  }
})

describe("Slack client", () => {
  test("sends bearer token and returns successful Slack JSON", async () => {
    const calls: Array<{ url: string; init?: RequestInit | undefined }> = []
    const client = makeSlackClient(async (input, init) => {
      calls.push({ url: String(input), init })
      return Response.json({ ok: true, user_id: "U123" })
    })

    const result = await Effect.runPromise(client.request("auth.test"))

    expect(result.user_id).toBe("U123")
    expect(calls[0]?.url).toBe("https://slack.com/api/auth.test")
    expect(new Headers(calls[0]?.init?.headers).get("authorization")).toBe("Bearer xoxp-test")
  })

  test("turns Slack ok false responses into SlackApiError", async () => {
    const client = makeSlackClient(async () =>
      Response.json({
        ok: false,
        error: "missing_scope",
        needed: "canvases:write",
        provided: "chat:write",
      }),
    )

    const exit = await Effect.runPromiseExit(client.request("canvases.create"))

    expect(exit._tag).toBe("Failure")
    if (exit._tag === "Failure") {
      const failure = exit.cause.toJSON() as any
      expect(JSON.stringify(failure)).toContain("missing_scope")
    }
  })

  test("includes retry-after metadata for rate limits", async () => {
    const client = makeSlackClient(async () =>
      Response.json(
        {
          ok: false,
          error: "rate_limited",
        },
        {
          status: 429,
          headers: { "retry-after": "10" },
        },
      ),
    )

    const exit = await Effect.runPromiseExit(client.request("chat.postMessage"))

    expect(exit._tag).toBe("Failure")
    if (exit._tag === "Failure") {
      const pretty = JSON.stringify(exit.cause.toJSON())
      expect(pretty).toContain("rate_limited")
      expect(pretty).toContain("retryAfter")
    }
  })
})
