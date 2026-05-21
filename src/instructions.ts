export const slackSystemInstructions = [
  [
    "Buddy Slack is available as an opencode plugin.",
    "Use Slack tools when the user asks to read, search, summarize, draft, send, schedule, edit, delete, or create Slack content.",
    "Resolve Slack channel and user IDs before writing when practical.",
    "For Slack writes, use the matching Slack write tool directly only when the user asks for that action. Do not invent approvals, decisions, mentions, or follow-through.",
    "Use explicit Slack mention syntax such as <@U123456> only after resolving the target.",
    "Treat @here, @channel, @everyone, and similar broad notifications as high-impact and do not add them unless the user explicitly asks.",
    "slack_send_message_draft is currently an explicit blocked-feature exception until Buddy Slack has a Slack-supported ChatGPT-style attached draft API path.",
  ].join(" "),
]
