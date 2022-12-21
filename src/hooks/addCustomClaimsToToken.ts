import type { Hook } from '../hooks'

export type CustomClaims = { name: string; value: string | boolean }[]

export const addCustomClaimsToToken: Hook<CustomClaims> = (customClaims) => {
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
