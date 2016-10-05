'use strict'

const Promise = require('bluebird')
const Joi = require('joi')
const introduce = require('introduce')(__dirname)

const configSchema = Joi.object().keys({
  encryptionKey: Joi.string().min(32).required()
})

let log
let mongoose
let config
let server

module.exports.name = 'clearpass'
module.exports.plugin = function plugin (settings, context) {
  log = context.logger
  mongoose = context.dataSources.mongoose

  if (!mongoose) {
    return Promise.reject(new Error('mongoose data source is required'))
  }

  config = Joi.validate(settings, configSchema)
  if (config.error) {
    return Promise.reject(new Error(config.error))
  }

  return Promise.resolve({})
}

module.exports.postInit = function postInit (context) {
  server = context.server

  const dao = introduce('lib/dao')(log, mongoose, config.value.encryptionKey)
  const interceptor = introduce('lib/interceptor')(log, dao)

  const routes = introduce('lib/routes')(log, dao)
  server.route(routes)

  return Promise.resolve({
    hooks: {
      preAuth: interceptor.hook
    }
  })
}
