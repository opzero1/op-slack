# Buddy Slack

Buddy Slack is an opencode plugin that exposes Slack read and write tools through a project-owned Slack app.

## Install

```bash
bun install
```

Add the plugin to opencode by package name.

```json
{
  "plugin": ["buddy-slack"]
}
```

## Auth

Slack OAuth is local. Set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and `BUDDY_SLACK_REDIRECT_URI`, then call `slack_auth_start` from opencode. Open the returned Slack authorization URL, complete the flow, and call `slack_auth_status`.

OAuth credentials are stored in the macOS Keychain under the `buddy-slack` service. `SLACK_USER_TOKEN` is supported only as a local development fallback.

## Tools

Auth:

- `slack_auth_start`
- `slack_auth_finish`
- `slack_auth_status`
- `slack_disconnect`

Read/search:

- `slack_read_user_profile`
- `slack_search_channels`
- `slack_read_channel`
- `slack_read_thread`
- `slack_search_public`
- `slack_search_public_and_private`
- `slack_search_users`
- `slack_read_canvas`

Write:

- `slack_send_message`
- `slack_schedule_message`
- `slack_create_canvas`
- `slack_edit_message`
- `slack_delete_message`
- `slack_send_message_draft`

## Parity Notes

`slack_send_message_draft` is intentionally unavailable until a Slack-supported API path is found for ChatGPT-style attached drafts. It returns an explicit unavailable error instead of pretending a local pending action is a Slack draft.

Slack write tools use action-scoped opencode permissions such as `slack.write.send`, `slack.write.canvas`, and `slack.write.delete`, so an always-allow decision for one write action does not automatically allow another.

## Verification

```bash
bun run verify
```
