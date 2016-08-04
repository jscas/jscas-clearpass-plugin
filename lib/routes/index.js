'use strict'

const fs = require('fs')
const introduce = require('introduce')(__dirname)

const exclude = [
  'index.js'
]

let routes = []

module.exports = function init (log, dao) {
  if (routes.length > 0) {
    return routes
  }

  for (const f of fs.readdirSync(__dirname)) {
    if (exclude.indexOf(f) > -1) {
      continue
    }

    const route = introduce(f)(log, dao)
    routes = routes.concat(route)
  }

  return routes
}
