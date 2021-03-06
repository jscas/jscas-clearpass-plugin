'use strict'

const test = require('tap').test
const log = require('./nullLogger')
const daoFactory = require('../lib/mongo')
const mongodb = require('mongodb')

const key = '123456789012345678901234567890123'

test('mongo dao', (t) => {
  let mongoClient
  let collection
  t.beforeEach((done) => {
    mongodb.MongoClient.connect('mongodb://localhost:27017/testing', (err, client) => {
      if (err) t.threw(err)
      mongoClient = client
      collection = client.db('testing').collection('clearpass')
      done()
    })
  })
  t.afterEach((done) => {
    collection.remove({}, done)
    mongoClient.close()
  })

  t.test('storeCredentials works without error', async (t) => {
    t.plan(1)
    const dao = daoFactory({
      mongo: collection,
      encryptionKey: key,
      ttl: 100,
      log
    })
    try {
      await dao.storeCredentials('foo', 'bar')
      t.pass()
    } catch (e) {
      t.threw(e)
    }
  })

  t.test('getCredentials returns stored credentials', async (t) => {
    t.plan(1)
    const dao = daoFactory({
      mongo: collection,
      encryptionKey: key,
      ttl: 100,
      log
    })
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

  t.test('getCredentials throws for expired credentials', (t) => {
    t.plan(1)
    const dao = daoFactory({
      mongo: collection,
      encryptionKey: key,
      ttl: 100,
      skew: 0,
      log
    })
    dao.storeCredentials('foo', 'bar')
      .then(() => {
        setTimeout(() => {
          dao.getCredentials('foo')
            .then(() => t.fail('should not happen'))
            .catch((e) => t.match(e, /not unseal/))
        }, 1000)
      })
      .catch(t.threw)
  })

  t.end()
})
