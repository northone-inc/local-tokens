import { JwtClient } from 'token-verify'
import { describe, expect, it } from 'vitest'
import Debugger from 'debug'
import { faker } from '@faker-js/faker'
import type { Hook } from '../src/hooks'
import LocalTokenServer from '../src/server'

const debug = Debugger('local-tokens:hooks:test')

describe('Hooks', async () => {
  it('can add new beforeTokenSigning hooks', async () => {
    const audience = 'apiAudience'
    const server = new LocalTokenServer({ audience, secret: faker.internet.password() })
    const { jwksUri, issuerUri } = await server.start(3000, 'localhost')
    const { ClientCredentials } = server.buildClients()
    const verify = new JwtClient({ audience, jwksUri, issuer: [issuerUri] })
    // reccomended approach
    const addFooToPayload: Hook = (value: string) => {
      return (token) => {
        token.payload.addFooToPayload = value
      }
    }
    const fakeFooValue = faker.internet.domainName()
    server.hooks.add('beforeTokenSigning', addFooToPayload(fakeFooValue))

    // direct inline approach (not recommended for sharable hooks)
    server.hooks.add('beforeTokenSigning', (token) => {
      token.payload.foo = 'bar'
    })

    // advanced - conditional claims based on request scopes
    const fancyId = faker.datatype.number({ min: 100, max: 500 })
    const fancyScope = `fancy:${fancyId}`
    server.hooks.add('beforeTokenSigning', (token, req) => {
      const scopes = req.body.scope.split(' ').map(row => row.trim())
      debug('scopes', scopes)
      for (const scope of scopes) {
        if (scope.indexOf('fancy:') === 0) {
          const id = scope.split(':')[1]
          token.payload.fancyId = id
          break
        }
      }
    })

    // ok now get a client and try it out
    const res = await ClientCredentials.getToken({
      scope: `email ${fancyScope}`,
    })

    const token = res.token.access_token
    const payload = await verify.verifyAndDecode(token)
    await server.stop()

    // direct inline approach
    expect(payload).toHaveProperty('foo')
    expect(payload.foo).toStrictEqual('bar')
    // reccomended approach
    expect(payload).toHaveProperty('addFooToPayload')
    expect(payload.addFooToPayload).toStrictEqual(fakeFooValue)
    // advanced - conditional claims based on request scopes
    expect(payload).toHaveProperty('fancyId')
    expect(payload.fancyId).toBe(fancyId.toString())
  })

  it('can remove custom hook using hookId', async () => {
    const audience = 'apiAudience'
    const server = new LocalTokenServer({ audience, secret: faker.internet.password() })
    const { jwksUri, issuerUri } = await server.start(3000, 'localhost')
    const { ResourceOwnerPassword } = server.buildClients()
    const jwtClient = new JwtClient({ audience, jwksUri, issuer: [issuerUri] })

    // define a basic hook that adds a foo property to the token payload
    const fooValue = faker.internet.domainName()
    const foohook = (value: string) => {
      return (token) => {
        token.payload.foo = value
      }
    }
    const hookId = server.hooks.add('beforeTokenSigning', foohook(fooValue))
    const res1 = await ResourceOwnerPassword.getToken({
      username: faker.internet.email(),
      password: faker.internet.password(),
      scope: 'email',
    })
    const token1 = res1.token.access_token
    const foodPayload = await jwtClient.verifyAndDecode(token1)

    // remove using function reference
    server.hooks.remove('beforeTokenSigning', hookId)

    const res2 = await ResourceOwnerPassword.getToken({
      username: faker.internet.email(),
      password: faker.internet.password(),
      scope: 'email',
    })
    const token2 = res2.token.access_token
    const unfoodPayload = await jwtClient.verifyAndDecode(token2)
    // stop server before expectations to limit hanging servers
    await server.stop()
    expect(foodPayload.foo).toBe(fooValue)
    expect(unfoodPayload.foo).toBeUndefined()
  })
})
