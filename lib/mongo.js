'use strict'

const iron = require('iron')

module.exports = function mongoDaoFactory (context) {
  const {mongo: collection, encryptionKey, ttl, skew, log} = context
  const sealOptions = Object.assign({}, iron.defaults, {
    ttl,
    timestampSkewSec: Number.isInteger(skew) ? skew : iron.defaults.timestampSkewSec
  })
  const dao = {}

  dao.getCredentials = async function (username) {
    const uname = username.toLowerCase()
    log.trace('retrieving credentials for user: %s', uname)
    let doc
    try {
      doc = await collection.findOne({
        username: {$eq: uname}
      })
    } catch (e) {
      log.error('could not lookup credentials for `%s`: %s', uname, e.message)
      log.debug(e.stack)
      throw e
    }
    try {
      const credentials = await iron.unseal(doc.credentials, encryptionKey, sealOptions)
      return credentials
    } catch (boom) {
      const e = boom.output.payload
      log.error('could not unseal credentials: %s', e.message)
      log.debug(e.stack)
      throw Error('could not unseal credentials')
    }
  }

  dao.storeCredentials = async function storeCreds (username, password) {
    const uname = username.toLowerCase()
    log.trace('attempting to store credentials with lifetime: %s', sealOptions.ttl)
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
      await collection.findOneAndUpdate(
        {username: {$eq: uname}},
        {username: uname, credentials: sealed},
        {upsert: true}
      )
    } catch (e) {
      log.error('could not store sealed credentials: %s', e.message)
      log.debug(e.stack)
      throw e
    }
  }

  return Object.create(dao)
}
