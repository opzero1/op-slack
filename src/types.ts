export type SlackTokenRecord = {
  teamId: string
  teamName?: string
  userId: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  scope?: string
}

export type SlackCurrentPointer = {
  teamId: string
  userId: string
}

export type SlackAuthStatus =
  | {
      connected: true
      source: "env" | "keychain"
      teamId?: string
      teamName?: string
      userId?: string
      expiresAt?: number
      scope?: string
    }
  | {
      connected: false
      reason: "not_connected" | "keychain_unavailable" | "invalid_token" | "missing_env"
      detail?: string
    }

export type SlackApiSuccess = Record<string, unknown> & {
  ok: true
}

export type SlackApiFailure = {
  ok: false
  error: string
  needed?: string
  provided?: string
  response_metadata?: {
    messages?: string[]
    warnings?: string[]
    scopes?: string[]
    acceptedScopes?: string[]
  }
}
