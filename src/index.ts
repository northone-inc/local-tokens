export { LocalTokenServer } from './server'

// build your own hooks that match the Hook type
export type { Hook } from './hooks'

// built in hooks
export { addCustomClaimsToToken as addCustomClaimsToTokenHook } from './hooks/addCustomClaimsToToken'
export { makeTokensExpired as makeTokensExpiredHook } from './hooks/makeTokensExpired'
