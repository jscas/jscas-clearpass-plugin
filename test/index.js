'use strict'
/* eslint-env node, mocha */

const expect = require('chai').expect

suite('tests')

test('a simple test', function simple (done) {
  expect(1).to.equal(1)
  done()
})
