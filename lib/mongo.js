'use strict'

const iron = require('iron')

module.exports = function mongoDaoFactory (collection, encryptionKey, ttl, log) {
  const sealOptions = Object.assign({}, iron.defaults, {ttl})
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
      const credentials = iron.unseal(doc.credentials, encryptionKey, sealOptions)
      return credentials
    } catch (e) {
      log.error('could not unseal credentials: %s', e.message)
      log.debug(e.stack)
      throw e
    }
  }

  dao.storeCredentials = async function storeCreds (username, password) {
    const uname = username.toLowerCase()
    log.trace('attempting to store credentials with lifetime: %s', sealOptions.ttl)
    let sealed
    try {
      sealed = await iron.seal({username: uname, password}, encryptionKey, sealOptions)
    } catch (e) {
      log.error('could not seal credentials for `%s`: %s', uname, e.message)
      log.debug(e.stack)
      throw e
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
