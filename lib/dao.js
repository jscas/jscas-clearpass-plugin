'use strict'

const path = require('path')
const Promise = require('bluebird')
const Iron = require('iron')

module.exports = function factory (log, mongoose, opbeat, encryptionKey, ttl) {
  const CredentialsSchema = require(path.join(__dirname, 'CredentialsSchema'))(mongoose)
  const Credentials = mongoose.model('ClearpassCredential', CredentialsSchema)

  const ApiKeysSchema = require(path.join(__dirname, 'ApiKeysSchema'))(mongoose)
  const Keys = mongoose.model('ClearpassApiKey', ApiKeysSchema)

  const sealOptions = Object.assign({}, Iron.defaults, {ttl})
  const dao = {}

  dao.getCredentials = function getCreds (username) {
    const _username = username.toLowerCase()
    opbeat.setUserContext({username: _username})
    return new Promise((resolve, reject) =>
      Credentials.findOne({username: {$eq: _username}}, (findErr, result) => {
        if (findErr) {
          log.error('could not find credentials for "%s": %s', _username, findErr.message)
          log.debug(findErr.stack)
          opbeat.captureError(findErr)
          return reject(findErr)
        }
        if (!result) {
          log.error('no credentials found for: %s', _username)
          return resolve(null)
        }
        Iron.unseal(result.credentials, encryptionKey, sealOptions, (unsealErr, unsealed) => {
          if (unsealErr) {
            log.error('could not unseal credentials: %s', unsealErr.message)
            log.debug(unsealErr.stack)
            opbeat.captureError(unsealErr)
            return reject(unsealErr)
          }
          return resolve(unsealed)
        })
      })
    )
  }

  dao.storeCredentials = function storeCreds (username, password) {
    const _username = username.toLowerCase()
    opbeat.setUserContext({username: _username})
    log.trace('attempting store credentials with lifetime: %s', sealOptions.ttl)
    return new Promise((resolve, reject) =>
      Iron.seal({username: _username, password}, encryptionKey, sealOptions, (sealErr, sealed) => {
        if (sealErr) {
          log.error('could not seal credentials for storage: %s', sealErr.message)
          log.debug(sealErr.stack)
          opbeat.captureError(sealErr)
          return reject(sealErr)
        }
        Credentials.findOneAndUpdate(
          {username: {$eq: _username}},
          {username: _username, credentials: sealed},
          {upsert: true},
          (findErr) => {
            if (findErr) {
              log.error('could not store sealed credentials: %s', findErr.message)
              log.debug(findErr.stack)
              opbeat.captureError(findErr)
              return reject(findErr)
            }
            log.trace('stored sealed credentials for: %s', _username)
            return resolve()
          }
        )
      })
    )
  }

  dao.storeApiKey = function storeApiKey (owner, key) {
    return new Promise((resolve, reject) => {
      Keys.findOneAndUpdate(
        {owner: {$eq: owner}},
        {owner, key},
        {upsert: true},
        (err) => {
          if (err) {
            log.error('could not store api key: %s', err.message)
            return reject(err)
          }
          return resolve()
        }
      )
    })
  }

  dao.validateApiKey = function validateApiKey (apiKey) {
    return new Promise((resolve, reject) => {
      Keys.count({key: {$eq: apiKey}}, (err, result) => {
        if (err) {
          log.error('could not validate api key: %s', err.message)
          return reject(err)
        }
        return resolve(result === 1)
      })
    })
  }

  return dao
}