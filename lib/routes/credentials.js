'use strict'

const Joi = require('joi')
const Boom = require('boom')

let log = {}
let dao = {}

const getRoute = {
  path: '/clearpass/{username}/credentials',
  method: 'GET',
  handler (req, reply) {
    log.trace('handling request to get credentials for: %s', req.params.username)
    req.api = true
    const apiKey = req.headers['x-clearpass-api-key']
    if (!apiKey) {
      return reply(Boom.badRequest('missing api key header'))
    }
    return dao
      .validateApiKey(apiKey)
      .then((result) => {
        if (!result) {
          return reply(Boom.unauthorized('invalid api key'))
        }
        return dao
          .getCredentials(req.params.username)
          .then((creds) => {
            if (creds) {
              return reply(creds)
            }
            return reply(Boom.notFound('no credentials found'))
          })
          .catch((err) => reply(err))
      })
      .catch((err) => reply(err))
  },
  config: {
    validate: {
      params: {
        username: Joi.string().alphanum().required()
      }
    }
  }
}

module.exports = function init ($log, $dao) {
  log = $log
  dao = $dao

  return [getRoute]
}
