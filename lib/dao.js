'use strict';

const path = require('path');
const Iron = require('iron');

const sealOptions = Iron.defaults;

let dao;
let log;
let mongoose;
let Credentials;
let Keys;

function DAO(encryptionKey) {
  this.encryptionKey = encryptionKey;
}

DAO.prototype.getCredentials = function getCreds(username) {
  return new Promise((resolve, reject) =>
    Credentials.findOne({username: {$eq: username}}, (findErr, result) => {
      if (findErr) {
        log.error('could not find credentials for "%s": %s', username, findErr.message);
        log.debug(findErr.stack)
        return reject(findErr);
      }
      if (!result) {
        log.error('no credentials found for: %s', username);
        return resolve(null);
      }
      Iron.unseal(result.credentials, this.encryptionKey, sealOptions, (unsealErr, unsealed) => {
        if (unsealErr) {
          log.error('could not unseal credentials: %s', unsealErr.message);
          log.debug(unsealErr.stack)
          return reject(unsealErr);
        }
        return resolve(unsealed);
      });
    })
  );
};

DAO.prototype.storeCredentials = function storeCreds(username, password) {
  return new Promise((resolve, reject) =>
    Iron.seal({username, password}, this.encryptionKey, sealOptions, (sealErr, sealed) => {
      if (sealErr) {
        log.error('could not seal credentials for storage: %s', sealErr.message);
        log.debug(sealErr.stack)
        return reject(sealErr);
      }
      Credentials.findOneAndUpdate(
        {username: {$eq: username}},
        {username: username, credentials: sealed},
        {upsert: true},
        (findErr) => {
          if (findErr) {
            log.error('could not store sealed credentials: %s', findErr.message);
            log.debug(findErr.stack)
            return reject(findErr);
          }
          log.trace('stored sealed credentials for: %s', username);
          return resolve();
        }
      );
    })
  );
};

DAO.prototype.storeApiKey = function storeApiKey(owner, key) {
  return new Promise((resolve, reject) => {
    Keys.findOneAndUpdate(
      {owner: {$eq: owner}},
      {owner, key},
      {upsert: true},
      (err) => {
        if (err) {
          log.error('could not store api key: %s', err.message);
          return reject(err);
        }
        return resolve();
      }
    );
  });
};

DAO.prototype.validateApiKey = function validateApiKey(apiKey) {
  return new Promise((resolve, reject) => {
    Keys.count({key: {$eq: apiKey}}, (err, result) => {
      if (err) {
        log.error('could not validate api key: %s', err.message);
        return reject(err);
      }
      return resolve(result === 1);
    });
  });
};

module.exports = function init($log, $mongoose, $encKey) {
  if (dao) {
    return dao;
  }

  log = $log;
  mongoose = $mongoose;

  const CredentialsSchema = require(path.join(__dirname, 'CredentialsSchema'))(mongoose);
  Credentials = mongoose.model('ClearpassCredential', CredentialsSchema);

  const ApiKeysSchema = require(path.join(__dirname, 'ApiKeysSchema'))(mongoose);
  Keys = mongoose.model('ClearpassApiKey', ApiKeysSchema);

  dao = new DAO($encKey);
  return dao;
};
