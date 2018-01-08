'use strict'

const iron = require('iron')

module.exports = function redisDaoFactory (context) {
  const {redis, encryptionKey, ttl, skew, log} = context
  const sealOptions = Object.assign({}, iron.defaults, {
    ttl,
    timestampSkewSec: Number.isInteger(skew) ? skew : iron.defaults.timestampSkewSec
  })
  const dao = {}

  function genKey (id) {
    return encodeURIComponent(`clearpass:${id}`)
  }

  dao.getCredentials = async function redisGetCredentials (userame) {
    const uname = userame.toLowerCase()
    log.trace('retrieving credentials for user: %s', uname)
    let sealed
    try {
      sealed = await redis.get(genKey(uname))
    } catch (e) {
      log.error('problem communicating with redis: %s', e.message)
      log.debug(e.stack)
      throw e
    }
    if (!sealed) {
      throw Error('cannot find sealed credentials')
    }
    try {
      const credentials = await iron.unseal(sealed, encryptionKey, sealOptions)
      return credentials
    } catch (boom) {
      // With correctly configured TTLs, this should be unreachable.
      const e = boom.output.payload
      log.error('could not unseal credentials for `%s`: %s', uname, e.message)
      log.debug(e.stack)
      throw Error('could not unseal credentials')
    }
  }

  dao.storeCredentials = async function redisStoreCredentials (username, password) {
    const uname = username.toLowerCase()
    log.trace('attempting store credentials with lifetime: %s', sealOptions.ttl)
    let sealed
    try {
      sealed = await iron.seal({username: uname, password}, encryptionKey, sealOptions)
    } catch (boom) {
      const e = boom.output.payload
      log.error('could not seal credentials for `%s`: %s', uname, e.message)
      log.debug(e.stack)
      throw Error('could not seal credentials')
    }
    try {
      const key = genKey(uname)
      await redis.set(key, sealed)
      if (ttl > 0) {
        const _ttl = Math.ceil(Math.max(ttl / 1000), 1)
        await redis.expire(key, _ttl)
      }
    } catch (e) {
      log.error('problem communicating with redis: %s', e.message)
      log.debug(e.stack)
      throw e
    }
  }

  return Object.create(dao)
}
