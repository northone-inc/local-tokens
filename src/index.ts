import { LocalTokenServer } from './server'

export { LocalTokenServer } from './server'

// build your own hooks that match the Hook type
export type { Hook, HookFunction } from './hooks'

// built in hooks
export { addCustomClaimsToToken as addCustomClaimsToTokenHook } from './built-in-hooks/addCustomClaimsToToken'
export { makeTokensExpired as makeTokensExpiredHook } from './built-in-hooks/makeTokensExpired'
export { makeSignatureInvalid as makeSignatureInvalidHook } from './built-in-hooks/makeSignatureInvalid'

export default LocalTokenServer
