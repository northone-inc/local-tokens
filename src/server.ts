import { OAuth2Server } from 'oauth2-mock-server'
import { ClientCredentials, ResourceOwnerPassword } from 'simple-oauth2'
import type { ModuleOptions as SimpleOAuth2ModuleOptions } from 'simple-oauth2'

import Debugger from 'debug'

import { LocalTokenHooks } from './hooks'
import { addAudienceToConform } from './built-in-hooks/addAudienceToConform'

const debug = Debugger('local-tokens:server')

interface LocalTokensConfig {
  /**
   * Audience, aka the Client ID
   * - Used to generate tokens
   * - Used to validate tokens
   * - Used to build simple-oauth2 clients
   * - Set as payload.aud
  */
  audience: string
  /**
   * Secret, aka the Client Secret
   */
  secret: string
}

interface LocalTokensLive {
  /**
   * JSON Web Key Store URL
   */
  jwksUri: string
  /**
   * Well-known OpenID Configuration URL
   */
  openidUri: string
  /**
   * Issuer URL, aka Server URL
   */
  issuerUri: string
  /**
   * Audience, aka the Client ID
   */
  audience: string
}

type Audience = string

/**
 * LocalTokenServer
 * - An In-memory oauth-mock-server for generating and validating tokens
 * - Includes JSON Web Key Stores (jwks) support
 */
export class LocalTokenServer {
  public hooks: LocalTokenHooks
  // private
  private _instance: OAuth2Server
  private _config: LocalTokensConfig

  constructor(config: LocalTokensConfig | Audience) {
    if (typeof config === 'string') {
      this._config = { audience: config, secret: 'secret' }
    } else {
      this._config = config
    }
    this._instance = new OAuth2Server()
    this.hooks = new LocalTokenHooks()

    this.hooks.add('beforeTokenSigning', addAudienceToConform(this._config.audience))

    for (let index = 0; index < this.hooks.registered.length; index++) {
      const hookName = this.hooks.registered[index]
      debug('Registering hook', hookName)
      const serviceHookExecutor = async (token: any, req: any) => {
        const handler = (resolve: (value: unknown) => void, reject: (reason?: any) => void) => {
          try {
            this.hooks.execute(hookName, [token, req])
            resolve(1)
          } catch (err) {
            reject(err)
          }
        }
        // maybe unnecessary to re-bind to this, but I'm paranoid
        return new Promise(handler.bind(this))
      }
      this._instance.service.on(hookName, serviceHookExecutor.bind(this))
    }

    return this
  }

  /**
   * Get the issuer URL
   *  - Requires server started
   *
   * @returns {string} The issuer URL
   */
  get issuer() {
    if (!this._instance.issuer.url) {
      throw new Error('Issuer URL is not available, did you start the server?')
    }
    return this._instance.issuer.url
  }

  /**
   * Build new simple-oauth2 clients, configured to this server
   */
  buildClients() {
    const clientConfiguration: SimpleOAuth2ModuleOptions = {
      client: {
        id: this._config.audience,
        secret: this._config.secret,
      },
      auth: {
        tokenHost: this.issuer,
        tokenPath: '/token',
        // revokePath: '/revoke',
      },
    }

    debug('clientConfiguration', clientConfiguration)

    return {
      ClientCredentials: new ClientCredentials(clientConfiguration),
      ResourceOwnerPassword: new ResourceOwnerPassword(clientConfiguration),
      config: clientConfiguration,
    }
  }

  /**
   * Start oauth mock server
   *
   * @param port {number}
   * @param hostname {string}
   */
  async start(port = 3000, hostname = 'localhost'): Promise<LocalTokensLive> {
    debug('Starting server')
    if (this._instance.issuer.keys.toJSON().length === 0) {
      // Generate a new RSA key and add it to the keystore
      await this._instance.issuer.keys.generate('RS256')
      debug('Generated new RSA key')
    }

    // start server
    await this._instance.start(port, hostname)
    debug('Server started')
    debug('Issuer URL:', this.issuer)
    debug('JWKS URL:', `${this._instance.issuer.url}/jwks`)
    debug('Audience + client_id:', this._config.audience)
    return {
      jwksUri: `${this._instance.issuer.url}/jwks`,
      openidUri: `${this._instance.issuer.url}/.well-known/openid-configuration`,
      issuerUri: this.issuer,
      audience: this._config.audience,
    }
  }

  async stop() {
    await this._instance.stop()
    debug('Server stopped')
    return this
  }
}

export default LocalTokenServer
