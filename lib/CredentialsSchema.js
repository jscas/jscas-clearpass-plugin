'use strict';

module.exports = function init(mongoose) {
  return new mongoose.Schema({
    username: {type: String, required: true, index: true},
    credentials: {type: String, required: true, index: false},
    created: {type: Date, required: true, default: new Date()}
  });
};
