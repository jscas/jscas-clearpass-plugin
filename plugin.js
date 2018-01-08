'use strict'

const fp = require('fastify-plugin')

module.exports = fp(function clearpassPlugin (server, options, next) {
  if (!options || Object.prototype.toString.apply(options) !== '[object Object]') {
    return next(Error('clearpass: must supply an options object'))
  }
  if (!options.encryptionKey || options.encryptionKey.length < 32) {
    return next(Error('clearpass: encryptionKey must be at least 32 characters'))
  }
  if (!options.authKeys || !Array.isArray(options.authKeys) || options.authKeys.length === 0) {
    return next(Error('clearpass: must supply array of authorization keys'))
  }
  if (!server.redis && !server.mongo) {
    return next(Error('clearpass: server must have a redis or mongo connection registered'))
  }

  const ttl = options.ttl || 0
  const daoContext = {
    redis: undefined,
    mongo: undefined,
    encryptionKey: options.encryptionKey,
    ttl: ttl,
    skew: options.skew,
    log: server.log
  }
  let dao
  if (server.redis) {
    daoContext.redis = server.redis
    dao = require('./lib/redis')(daoContext)
  } else {
    daoContext.mongo = server.mongo.db.collection('clearpass')
    dao = require('./lib/mongo')(daoContext)
  }

  const getOptions = {
    schema: {
      params: {
        type: 'object',
        properties: {
          username: { type: 'string' }
        }
      },

      response: {
        200: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            password: { type: 'string' }
          }
        }
      }
    }
  }

  server
    .register(require('fastify-bearer-auth'), {keys: new Set(options.authKeys)})
    .get('/clearpass/:username/credentials', getOptions, async function (req, reply) {
      req.log.trace('handling request to get credentials for: %s', req.params.username)
      try {
        const credentials = await dao.getCredentials(req.params.username)
        reply.send(credentials)
      } catch (e) {
        req.log.error(e.message)
        req.log.debug(e.stack)
        return Error('clearpass: failed to lookup credentials')
      }
    })

  server.registerHook('preAuth', async function clearpassHook (context) {
    if (!context.username || !context.password) return
    await dao.storeCredentials(context.username, context.password)
    return true
  })

  next()
})

module.exports.pluginName = 'clearpass'
