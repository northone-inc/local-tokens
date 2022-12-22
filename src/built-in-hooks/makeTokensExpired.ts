import type { Hook } from '../hooks'

/**
 * Created tokens are expired by default, this hook can be used to extend the expiration time
 */
export const makeTokensExpired: Hook<number> = (minusSeconds = 400) => {
  if (Number.isNaN(minusSeconds) || minusSeconds <= 0) {
    throw new Error('minusSeconds must be a positive number')
  }
  return (token) => {
    const timestamp = Math.floor(Date.now() / 1000)
    token.payload.exp = (timestamp - minusSeconds).toString()
  }
}
export default makeTokensExpired
