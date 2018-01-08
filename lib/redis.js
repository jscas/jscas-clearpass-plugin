'use strict'

const iron = require('iron')

module.exports = function redisDaoFactory (redis, encryptionKey, ttl, log) {
  const sealOptions = Object.assign({}, iron.defaults, {ttl})
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
    try {
      const credentials = await iron.unseal(sealed, encryptionKey, sealOptions)
      return credentials
    } catch (e) {
      log.error('could not unseal credentials for `%s`: %s', uname, e.message)
      log.debug(e.stack)
      throw e
    }
  }

  dao.storeCredentials = async function redisStoreCredentials (username, password) {
    const uname = username.toLowerCase()
    log.trace('attempting store credentials with lifetime: %s', sealOptions.ttl)
    let sealed
    try {
      sealed = await iron.seal({username: uname, password}, encryptionKey, sealOptions)
    } catch (e) {
      log.error('could not seal credentials for `%s`: %s', uname, e.message)
      log.debug(e.stack)
      throw e
    }
    try {
      const key = genKey(uname)
      await redis.set(key, sealed)
      if (ttl > 0) {
        await redis.expire(key, (ttl / 1000) + 10)
      }
    } catch (e) {
      log.error('problem communicating with redis: %s', e.message)
      log.debug(e.stack)
      throw e
    }
  }

  return Object.create(dao)
}
