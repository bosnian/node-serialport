'use strict';
var fs = require('fs');

module.exports = function readUnix(bytes, cb) {
  if (!this.isOpen) {
    process.nextTick(function() {
      cb(new Error('Port is not open'));
    });
    return;
  }

  // todo this is silly
  var pool = new Buffer(bytes).fill(255);
  fs.read(this.fd, pool, 0, bytes, null, function(err, bytesRead) {
    if (err && err.code === 'EAGAIN') {
      // TODO this should be epoll
      process.nextTick(function() {
        this.read(bytes, cb);
      }.bind(this));
      return;
    }

    var disconnectError = err && (
         err.code === 'EBADF' // Bad file number means we got closed
      || err.code === 'ENXIO' // No such device or address probably usb disconnect
      || err.code === 'UNKNOWN' // ¯\_(ツ)_/¯
      || err.errno === -1 // generic error
    );

    if (disconnectError) {
      return this.disconnect(err);
    }
    console.log('read', bytesRead, 'bytes of',  pool.toJSON());
    cb(err, pool.slice(0, bytesRead));
  }.bind(this));
};
