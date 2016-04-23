'use strict';


let log;
let interceptor;

function Interceptor(dao) {
  this.dao = dao;
}

Interceptor.prototype.hook = function hook(request, reply, username, password) {
  log.debug('intercepting password for user: %s', username);
  return this.dao
    .storeCredentials(username, password)
    .then(() => Promise.resolve())
    .catch((err) => Promise.reject(err));
};

module.exports = function init($log, $dao) {
  if (interceptor) {
    return interceptor;
  }
  log = $log;
  interceptor = new Interceptor($dao);
  return interceptor;
};
