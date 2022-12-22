import type { Hook } from '../hooks'

export interface CustomClaim { name: string; value: string | boolean }

export const addCustomClaimsToToken: Hook<CustomClaim[]> = (customClaims) => {
  return (token) => {
    if (customClaims && customClaims.length) {
      customClaims.forEach((claim) => {
        if (claim.name && claim.name.length) {
          token.payload[claim.name] = claim.value
        }
      })
    }
  }
}

export default addCustomClaimsToToken
