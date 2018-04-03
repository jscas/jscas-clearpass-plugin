'use strict'

const test = require('tap').test
const log = require('./nullLogger')
const daoFactory = require('../lib/redis')
const Redis = require('ioredis')
const key = '123456789012345678901234567890123'

test('redisdao', (t) => {
  let connected
  let redis
  t.beforeEach((done) => {
    if (!connected) {
      redis = new Redis()
      redis.connect(() => {
        connected = true
        done()
      })
    } else {
      done()
    }
  })
  t.tearDown(() => redis.disconnect())

  t.test('storeCredentials works without error', (t) => {
    t.plan(1)
    const dao = daoFactory({redis, encryptionKey: key, ttl: 100, log})
    dao.storeCredentials('foo', 'bar').then(t.pass).catch(t.threw)
  })

  t.test('getCredentials returns stored credentials', (t) => {
    t.plan(1)
    const dao = daoFactory({redis, encryptionKey: key, ttl: 100, log})
    dao.storeCredentials('foo', 'bar')
      .then(() => dao.getCredentials('foo'))
      .then((credentials) => {
        t.strictDeepEqual(credentials, {
          username: 'foo',
          password: 'bar'
        })
      })
      .catch(t.threw)
  })

  t.test('throws for purged credentials', {timeout: 2600}, (t) => {
    t.plan(1)
    const dao = daoFactory({redis, encryptionKey: key, ttl: 100, skew: 1, log})
    dao.storeCredentials('foo', 'bar')
      .then(() => {
        setTimeout(() => {
          dao.getCredentials('foo').catch((e) => t.match(e, /cannot find/))
        }, 2500)
      })
      .catch(t.threw)
  })

  t.test('throws when unable to unseal credentials', {timeout: 2600}, (t) => {
    t.plan(1)
    const dao = daoFactory({redis, encryptionKey: key, ttl: 100, skew: 1, log})
    dao.storeCredentials('foo', 'bar')
      .then(() => redis.set('clearpass%3Afoo', 'nope'))
      .then(() => dao.getCredentials('foo'))
      .then(() => t.fail('should not succeed'))
      .catch((err) => t.match(err, /could not unseal credentials/))
  })

  t.end()
})
