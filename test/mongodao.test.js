'use strict'

const test = require('tap').test
const log = require('./nullLogger')
const daoFactory = require('../lib/mongo')
const mockgo = require('mockgo')

const key = '123456789012345678901234567890123'

test('mongo dao', (t) => {
  let collection
  t.beforeEach((done) => {
    mockgo.getConnection((err, conn) => {
      if (err) t.threw(err)
      collection = conn.collection('clearpass')
      collection.remove({}, done)
    })
  })
  t.tearDown((done) => {
    mockgo.shutDown(done)
  })

  t.test('storeCredentials works without error', async (t) => {
    t.plan(1)
    const dao = daoFactory(collection, key, 100, log)
    try {
      await dao.storeCredentials('foo', 'bar')
      t.pass()
    } catch (e) {
      t.threw(e)
    }
  })

  t.test('getCredentials returns stored credentials', async (t) => {
    t.plan(1)
    const dao = daoFactory(collection, key, 100, log)
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

  t.end()
})
