import type { Hook } from '../hooks'

/**
 * Use Audience as Client ID and conform to Auth0 and token-verify
 */
export const addAudienceToConform: Hook = (audience: string) => {
  return (token, _) => {
    token.payload.aud = [audience]
  }
}
