import http from 'http'
import Debugger from 'debug'
import { describe, expect, it } from 'vitest'
import { JwtClient } from 'token-verify'
import LocalTokenServer from '../src/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debugger('local-tokens:server:test')

describe('LocalTokenServer', async () => {
  it('server can stop, stop, and provide jwks_uri', async () => {
    const audience = 'apiAudience'
    const server = new LocalTokenServer({ audience, secret: 'not-a-secret' })

    const { openidUri, jwksUri } = await server.start()
    const openidConfiguration = await getJsonHttp(openidUri)
    expect(openidConfiguration).toBeTruthy()
    expect(openidConfiguration).toHaveProperty('issuer')
    expect(openidConfiguration).toHaveProperty('jwks_uri')
    expect((openidConfiguration as any).jwks_uri).toBe(jwksUri)
    await server.stop()
  })
  it('can create token with pre-built password grant client', async () => {
    const secret = 'not-a-secret'
    const audience = 'apiAudience'
    const server = new LocalTokenServer({ audience, secret })
    const { openidUri, issuerUri, jwksUri } = await server.start(3000, 'localhost')
    const openidConfiguration = await getJsonHttp(openidUri)
    expect(openidConfiguration).toHaveProperty('jwks_uri')

    // ok now get a client and try it out
    const { ResourceOwnerPassword } = server.buildClients()

    expect(ResourceOwnerPassword).toBeTruthy()
    expect(ResourceOwnerPassword).toHaveProperty('getToken')
    const res = await ResourceOwnerPassword.getToken({
      username: 'foo',
      password: 'bar',
      scope: 'openid offline_access profile email address phone',
    })

    const token = res.token.access_token
    const verify = new JwtClient({ audience, jwksUri, issuer: [issuerUri] })
    await verify.verifyAndDecode(token)
    await server.stop()
  })
  it('can create token with pre-built client credentials grant client', async () => {
    const secret = 'not-a-secret'
    const audience = 'apiAudience'
    const server = new LocalTokenServer({ audience, secret })
    const { openidUri, jwksUri, issuerUri } = await server.start(3000, 'localhost')
    const openidConfiguration = await getJsonHttp(openidUri)
    expect(openidConfiguration).toHaveProperty('jwks_uri')

    // ok now get a client and try it out
    const { ClientCredentials } = server.buildClients()

    expect(ClientCredentials).toBeTruthy()
    expect(ClientCredentials).toHaveProperty('getToken')

    const res = await ClientCredentials.getToken({
      scope: 'openid offline_access profile email address phone',
    })

    const token = res.token.access_token
    const verify = new JwtClient({ audience, jwksUri, issuer: [issuerUri] })
    const payload = await verify.verifyAndDecode(token)
    expect(payload).toHaveProperty('aud')
    expect(payload.aud).toBeTruthy()
    expect(payload.aud).toHaveLength(1)
    expect(payload.aud).toStrictEqual([audience])
    await server.stop()
  })
})

/**
 * Get JSON from HTTP url
 * - doesn't support HTTPS
 *
 * @param url {string}
 * @returns json
 */
export async function getJsonHttp(url: string) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const { statusCode } = res
      if (statusCode !== 200) {
        reject(new Error(`Request Failed.\nStatus Code: ${statusCode}`))
      }
      // res.setEncoding('utf8')
      const data: any[] = []
      res.on('data', (chunk: any) => data.push(chunk))
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data.join(''))
          resolve(parsedData)
        }
        catch (e) {
          reject(e)
        }
      })
    }).on('error', (e) => {
      reject(e)
    })
  })
}
