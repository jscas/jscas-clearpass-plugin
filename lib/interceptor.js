'use strict';


let log;
let interceptor;

function Interceptor(dao) {
  this.dao = dao;
}

Interceptor.prototype.hook = function hook(parameters) {
  log.trace('intercepting password for user: %s', parameters.username);
  return this.dao
    .storeCredentials(parameters.username, parameters.password)
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
