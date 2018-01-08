'use strict'

const test = require('tap').test
const log = require('./nullLogger')
const daoFactory = require('../lib/redis')
const Redis = require('ioredis-mock')
const redis = new Redis({})

const key = '123456789012345678901234567890123'

test('storeCredentials works without error', async (t) => {
  t.plan(1)
  const dao = daoFactory(redis, key, 100, log)
  try {
    await dao.storeCredentials('foo', 'bar')
    t.pass()
  } catch (e) {
    t.threw(e)
  }
})

test('getCredentials returns stored credentials', async (t) => {
  t.plan(1)
  const dao = daoFactory(redis, key, 100, log)
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
