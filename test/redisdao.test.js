'use strict'

const test = require('tap').test
const log = require('./nullLogger')
const daoFactory = require('../lib/redis')
const Redis = require('ioredis-mock')
const redis = new Redis({})

const key = '123456789012345678901234567890123'

test('storeCredentials works without error', async (t) => {
  t.plan(1)
  const dao = daoFactory({redis, encryptionKey: key, ttl: 100, log})
  try {
    await dao.storeCredentials('foo', 'bar')
    t.pass()
  } catch (e) {
    t.threw(e)
  }
})

test('getCredentials returns stored credentials', async (t) => {
  t.plan(1)
  const dao = daoFactory({redis, encryptionKey: key, ttl: 100, log})
  try {
    await dao.storeCredentials('foo', 'bar')
    const credentials = await dao.getCredentials('foo')
    t.strictDeepEqual(credentials, {
      username: 'foo',
      password: 'bar'
    })
  } catch (e) {
    t.threw(e)
  }
})

test('throws for purged credentials', {timeout: 2600}, (t) => {
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
