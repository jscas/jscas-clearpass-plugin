'use strict'

const test = require('tap').test
const sget = require('simple-get')
const fastify = require('fastify')
const mongodb = require('mongodb')
const plugin = require('../')

const key = require('crypto').randomBytes(32).toString('hex')

test('rejects for invalid options object', (t) => {
  t.test('missing options object', (t) => {
    t.plan(2)
    plugin({}, null, (err) => {
      t.type(err, Error)
      t.match(err, /must supply/)
    })
  })

  t.test('invalid encryption key', (t) => {
    t.plan(2)
    plugin({}, {encryptionKey: '123455'}, (err) => {
      t.type(err, Error)
      t.match(err, /32 characters/)
    })
  })

  t.test('missing auth keys', (t) => {
    t.plan(2)
    plugin({}, {encryptionKey: key}, (err) => {
      t.type(err, Error)
      t.match(err, /supply array/)
    })
  })

  t.test('auth keys must be array', (t) => {
    t.plan(2)
    plugin({}, {encryptionKey: key, authKeys: ''}, (err) => {
      t.type(err, Error)
      t.match(err, /supply array/)
    })
  })

  t.test('auth keys must be array with elements', (t) => {
    t.plan(2)
    plugin({}, {encryptionKey: key, authKeys: []}, (err) => {
      t.type(err, Error)
      t.match(err, /supply array/)
    })
  })

  t.test('must have data store', (t) => {
    t.plan(2)
    plugin({}, {encryptionKey: key, authKeys: ['123456']}, (err) => {
      t.type(err, Error)
      t.match(err, /redis or mongo/)
    })
  })

  t.end()
})

test('works with a redis connection', (t) => {
  t.plan(3)
  const server = fastify()

  const Redis = require('ioredis-mock')
  const redis = new Redis({})
  server
    .register(require('fastify-redis'), {client: redis})
    .decorate('jscasHooks', {})
    .decorate('registerHook', function (name, fn) {
      this.jscasHooks[name] = fn
    })
    .register(plugin, {
      encryptionKey: key,
      authKeys: ['123456']
    })

  server.listen(0, (err) => {
    if (err) t.threw(err)
    server.server.unref()
    const port = server.server.address().port

    server.jscasHooks.preAuth({username: 'foo', password: 'bar'})
      .then((result) => {
        t.ok(result)
        sget(
          {
            url: `http://127.0.0.1:${port}/clearpass/foo/credentials`,
            headers: {
              'authorization': 'bearer 123456'
            }
          },
          (err, res, data) => {
            if (err) t.threw(err)
            t.is(res.statusCode, 200)
            let d = ''
            res.on('data', (data) => {
              d = d + data.toString()
            })
            res.on('end', () => {
              t.strictDeepEqual(JSON.parse(d), {
                username: 'foo',
                password: 'bar'
              })
            })
          }
        )
      })
      .catch(t.threw)
  })
})

test('mongodb based tests', (t) => {
  t.tearDown((done) => {
    mongodb.MongoClient.connect('mongodb://localhost:27017/clearpass')
      .then((client) => {
        return client.db('clearpass').dropDatabase()
          .then(() => client.close())
          .catch((err) => {
            t.threw(err)
          })
      })
      .catch((err) => {
        t.threw(err)
      })
  })

  t.test('works with a mongo connection', (t) => {
    t.plan(3)
    const server = fastify()
    t.tearDown(() => server.close())

    let port = 0
    mongodb.MongoClient.connect('mongodb://localhost:27017/clearpass', (err, conn) => {
      if (err) t.threw(err)

      server
        .register(require('fastify-mongodb'), {client: conn})
        .decorate('jscasHooks', {})
        .decorate('registerHook', function (name, fn) {
          this.jscasHooks[name] = fn
        })
        .register(plugin, {
          encryptionKey: key,
          authKeys: ['123456'],
          mongodbName: 'clearpass'
        })

      server.listen(0, (err) => {
        if (err) t.threw(err)
        server.server.unref()
        port = server.server.address().port

        server.jscasHooks.preAuth({username: 'foo', password: 'bar'})
          .then((result) => {
            t.ok(result)
            doRequest()
          })
          .catch(t.threw)
      })
    })

    const doRequest = () => sget(
      {
        url: `http://127.0.0.1:${port}/clearpass/foo/credentials`,
        headers: {
          'authorization': 'bearer 123456'
        }
      },
      (err, res, data) => {
        if (err) t.threw(err)
        t.is(res.statusCode, 200)
        let d = ''
        res.on('data', (data) => {
          d = d + data.toString()
        })
        res.on('end', () => {
          t.strictDeepEqual(JSON.parse(d), {
            username: 'foo',
            password: 'bar'
          })
        })
      }
    )
  })

  t.test('returns error for expired credentials', (t) => {
    t.plan(3)
    const server = fastify()
    t.tearDown(() => server.close())

    let port = 0
    mongodb.MongoClient.connect('mongodb://localhost:27017/clearpass', (err, conn) => {
      if (err) t.threw(err)

      server
        .register(require('fastify-mongodb'), {client: conn})
        .decorate('jscasHooks', {})
        .decorate('registerHook', function (name, fn) {
          this.jscasHooks[name] = fn
        })
        .register(plugin, {
          encryptionKey: key,
          authKeys: ['123456'],
          ttl: 100,
          skew: 0,
          mongodbName: 'clearpass'
        })

      server.listen(0, (err) => {
        if (err) t.threw(err)
        server.server.unref()
        port = server.server.address().port

        server.jscasHooks.preAuth({username: 'foo', password: 'bar'})
          .then((result) => {
            t.ok(result)
            setTimeout(doRequest, 1000)
          })
          .catch(t.threw)
      })
    })

    const doRequest = () => sget(
      {
        url: `http://127.0.0.1:${port}/clearpass/foo/credentials`,
        headers: {
          'authorization': 'bearer 123456'
        }
      },
      (err, res, data) => {
        if (err) t.threw(err)
        t.is(res.statusCode, 500)
        let d = ''
        res.on('data', (data) => {
          d = d + data.toString()
        })
        res.on('end', () => {
          t.is(
            JSON.parse(d).message,
            'clearpass: failed to lookup credentials'
          )
        })
      }
    )
  })

  t.end()
})
