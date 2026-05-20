export class SlackApiError extends Error {
  readonly _tag = "SlackApiError"

  constructor(
    readonly method: string,
    readonly code: string,
    readonly detail?: Record<string, unknown>,
  ) {
    super(`Slack ${method} failed: ${code}`)
  }
}

export class SlackUnavailableError extends Error {
  readonly _tag = "SlackUnavailableError"

  constructor(message: string) {
    super(message)
  }
}
