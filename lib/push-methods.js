'use strict';


function _read(bytes) {
  this._bytesWanted = bytes;
  if (this._reading) {
    return;
  }
  this._reading = true;
  this.read(bytes, function(err, data) {
    this._reading = false;
    if (err) {
      return this.emit('error', err);
    }

    this._bytesWanted = this._bytesWanted - data.length;
    if (this._bytesWanted <= 0) {
      this._bytesWanted = 1024;
    }

    if (this.push(data)) {
      this._read(this._bytesWanted);
    }
  }.bind(this));
}


function pushBindingWrap(opt) {
  if (typeof opt.binding !== 'object') {
    throw new TypeError('binding is not an object');
  }
  if (typeof opt.push !== 'function') {
    throw new TypeError('push is not a function');
  }

  var binding = opt.binding;

  if (typeof binding._read !== 'function') {
    binding._read = _read;
    if (binding._reading !== undefined || binding._bytesWanted !== undefined) {
      throw new Error('pushBindingWrap._read() uses _reading and _bytesWanted but they are already defined');
    }
    binding._bytesWanted = 0;
    binding._reading = false;
  }
  if (typeof binding.push !== 'function') {
    binding.push = opt.push;
  }
  return binding;
};


module.exports = pushBindingWrap;
