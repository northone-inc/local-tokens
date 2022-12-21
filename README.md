# Local Tokens

Get a working oauth mock server for testing, with pre-configured clients to generate tokens

## Features
- Start a local oauth mock server
- Can utilize JWKS URIs for token validation
- Can generate tokens via Client Credentials and Password Grants
- Works with token-verify

---

**Overview**
- [Local Tokens](#local-tokens)
  - [Features](#features)
  - [Example Test](#example-test)
  - [Using Hooks](#using-hooks)
  - [Debugging](#debugging)
  - [Contributor Commands](#contributor-commands)
  - [Attributions](#attributions)


## Example Test

We love [vitest](https://www.npmjs.com/package/vitest), but should work in any test-runner you like:

```typescript
import LocalTokens from 'local-tokens'
import { JwtClient } from 'token-verify'

describe('My Program', () => {
  it('can create token with pre-built password grant client', async () => {
    const audience = 'apiAudience'
    const server = new LocalTokenServer({ audience, secret: 'not-really-a-secret' })
    // start the server, to resolve URLs
    const { openidUri, tokenHost, jwksUri } = await server.start(3000, 'localhost')
    // openidUri - tokenHost/.well-known/openid-configuration
    // jwksUri - tokenHost/jwks
    // tokenHost - http://localhost:3000

    // ok now get a client and try it out
    // - ClientCredentials client also available
    const { ResourceOwnerPassword } = server.buildClients()

    expect(ResourceOwnerPassword).toBeTruthy()
    expect(ResourceOwnerPassword).toHaveProperty('getToken')

    const res = await ResourceOwnerPassword.getToken({
      // any username and password are accepted
      username: 'foo',
      password: 'bar',
      // scopes are respected unless hooks have modified
      scope: 'openid offline_access profile email address phone',
    })

    const token = res.token.access_token

    // verify token and get payload
    const verify = new JwtClient({ audience, jwksUri, issuer: [tokenHost] })
    const payload = await verify.verifyAndDecode(token)
    console.log('payload', payload)
    // success
    expect(payload.aud).toBeStrict([audience])
    await server.stop()
  })
})
```

## Using Hooks

Hooks are how to modify the server behaviour when creating tokens, validating requests and more!

---

## Debugging

Local Tokens server utilizes the well-known [debug](https://www.npmjs.com/package/debug) package, so debugging scopes is similar to expressjs

`DEBUG=local-tokens:* npm run test`

## Contributor Commands


| Command                         | Purpoose                      |
|---------------------------------|-------------------------------|
| `make install` or `brew bundle` | install system dependencies   |
| `npm run test`                  | execute vitest                |
| `npm run build` or `make build` | build for any nodejs platform |


## Attributions
- https://github.com/axa-group/oauth2-mock-server
- https://www.npmjs.com/package/simple-oauth2