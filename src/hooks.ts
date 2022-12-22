import type { Request as ExpressRequest } from 'express'
import { v4 as uuid } from 'uuid'
import Debugger from 'debug'

const debug = Debugger('local-tokens:hooks')

// TODO: consider real JWTPayload, from TokenVerify ?
/**
 * Payload values that can be used in token hooks
 */
interface AcceptedPayloadValues {
  [x: string]: string | boolean | string[] | boolean[]
}

// export type Hook<Options = any | any[]> = (options?: Options) => HookFunction
export type Hook<Options = any | string> = (options?: Options) => HookFunction
export type HookFunction<TPayload = AcceptedPayloadValues> = (token: { payload: TPayload }, req: ExpressRequest) => void

/**
 * oauth-server-hooks supported atm
 */
interface HookTypes {
  /**
   * This allows middleware to modify tokens BEFORE they are signed
   */
  beforeTokenSigning: Map<string, HookFunction>
}

/**
 * Manage hooks for LocalTokenServer
 */
export class LocalTokenHooks {
  private _hooks: HookTypes

  constructor() {
    this._hooks = { beforeTokenSigning: new Map() }
  }

  /**
   * Get all registered hook names
   *
   * @returns {array<string>} Array of hook names
   */
  get registered() {
    return Object.keys(this._hooks) as (keyof HookTypes)[]
  }

  /**
   * Add a hook by name
   * - should match oauth-mock-server hook name
   * - See `./hooks` for examples
   *
   * @param hookName {string} Name of the hook to add (example: beforeTokenSigning)
   * @param fn {function} Hook function to be executed on hookName
   */
  add(hookName: keyof HookTypes, fn: HookFunction) {
    if (!this._hooks[hookName]) {
      throw new Error(`${hookName} Hook not supported`)
    }
    const hookId = uuid()
    this._hooks[hookName].set(hookId, fn)
    debug('Added hook', hookName, hookId)
    return hookId
  }

  /**
   * Remove a hook by name and function
   * - should match oauth-mock-server hook name
   *
   * @param hookName {string} Name of the hook to remove
   * @param hook {function} Hook function to remove
   */
  remove(hookName: keyof HookTypes, hook: string) {
    if (typeof hook === 'string' && this._hooks[hookName].has(hook)) {
      debug('Removing hook', hookName, hook)
      this._hooks[hookName].delete(hook)
      return true
    }
    throw new Error(`Hook not found: ${hookName} id:${hook}`)
  }

  /**
   * Execute all hooks for a given hookName
   * - should match oauth-mock-server hook name
   * - example: beforeTokenSigning
   *
   * @param hookName {string} Name of the hook to execute
   * @param args {array} arguments to pass into hook (example: [token, req])
   */
  async execute(hookName: keyof HookTypes, args: any) {
    if (!this._hooks[hookName]) {
      throw new Error(`${hookName} Hook not supported`)
    }

    this._hooks[hookName].forEach(async (hook, id) => {
      debug('Executing hook', hookName, id)
      if (hook.constructor.name === 'AsyncFunction') {
        await hook.apply(this, args)
      } else {
        hook.apply(this, args)
      }
    })
  }
}
