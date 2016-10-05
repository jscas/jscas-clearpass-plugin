'use strict'

const Promise = require('bluebird')

module.exports = function factory (log, dao) {
  return {
    hook (parameters) {
      log.trace('intercepting password for user: %s', parameters.username)
      return dao
        .storeCredentials(parameters.username, parameters.password)
        .then(() => Promise.resolve())
        .catch((err) => Promise.reject(err))
    }
  }
}
