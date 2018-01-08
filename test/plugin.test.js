'use strict'

const test = require('tap').test
const sget = require('simple-get')
const fastify = require('fastify')
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

test('works with a mongo connection', (t) => {
  t.plan(3)
  const server = fastify()

  let port = 0
  const mocko = require('mockgo')
  t.tearDown((done) => mocko.shutDown(done))
  mocko.getConnection((err, conn) => {
    if (err) t.threw(err)

    server
      .register(require('fastify-mongodb'), {client: conn})
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
