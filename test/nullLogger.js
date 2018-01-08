'use strict'

const log = Object.create(require('abstract-logging'))
log.child = () => log

module.exports = log
