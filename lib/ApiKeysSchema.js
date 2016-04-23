'use strict';

module.exports = function init(mongoose) {
  return new mongoose.Schema({
    key: {type: String, required: true, index: true},
    owner: {type: String, required: true, index: false}
  });
};
