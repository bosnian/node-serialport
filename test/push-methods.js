'use strict';

var assert = require('chai').assert;
var processNextTick = require('process-nextick-args');

var pushBindingWrap = require('../lib/push-methods');
var MockBinding = require('../lib/bindings-mock');

describe('pushBindingWrap()', function() {
  it('throws when not passed a binding', function(done) {
    try {
      pushBindingWrap({push: function() {}});
    } catch (e) {
      assert.instanceOf(e, TypeError);
      done();
    }
  });

  it('throws when not passed a push function', function(done) {
    try {
      pushBindingWrap({binding: {}});
    } catch (e) {
      assert.instanceOf(e, TypeError);
      done();
    }
  });

  it('assigns `_read()` only if not already a method', function(done) {
    var mockBinding = new MockBinding({disconnect: function() {}});
    assert.isUndefined(mockBinding._read);
    pushBindingWrap({ binding: mockBinding, push: function() {}});
    assert.equal(typeof mockBinding._read, 'function');

    var _read = function() {};
    var fakeBinding = { _read: _read};
    pushBindingWrap({ binding: fakeBinding, push: function() {}});
    assert.equal(fakeBinding._read, _read);
    done();
  });

  it('assigns `push()` only if not already a method', function(done) {
    var mockBinding = new MockBinding({disconnect: function() {}});
    assert.isUndefined(mockBinding.push);
    pushBindingWrap({ binding: mockBinding, push: function() {}});
    assert.equal(typeof mockBinding.push, 'function');

    var push = function() {};
    var fakeBinding = { push: push};
    pushBindingWrap({ binding: fakeBinding, push: function() {}});
    assert.equal(fakeBinding.push, push);
    done();
  });

  it('throws if _reading is already defined', function(done) {
    var fakeBinding = { _reading: false };
    try {
      pushBindingWrap({ binding: fakeBinding, push: function() {}});
    } catch (e) {
      assert.instanceOf(e, Error);
      done();
    }
  });

  it('throws if _bytesWanted is already defined', function(done) {
    var fakeBinding = { _bytesWanted: 0 };
    try {
      pushBindingWrap({ binding: fakeBinding, push: function() {}});
    } catch (e) {
      assert.instanceOf(e, Error);
      done();
    }
  });

  it("doesn't throw if _reading and _bytesWanted are defined when _read is defined", function(done) {
    var fakeBinding = { _reading: false, _bytesWanted: 0, _read: function() {}};
    pushBindingWrap({ binding: fakeBinding, push: function() {}});
    done();
  });
});

describe('_read()', function() {
  it('calls `read()` with the number of bytes', function(done) {
    var bytesToRead = 5;
    var fakeBinding = {
      read: function(bytes) {
        assert.equal(bytes, bytesToRead);
        done();
      }
    };
    pushBindingWrap({binding: fakeBinding, push: function() {}});
    fakeBinding._read(bytesToRead);
  });

  it("doesn't call `read()` multiple times concurrently but does update _bytesWanted", function(done) {
    var fakeBinding = {
      read: function() {
        processNextTick(function() {
          assert.equal(this._bytesWanted, 10);
          done();
        }.bind(this));
      }
    };
    pushBindingWrap({binding: fakeBinding, push: function() {}});
    fakeBinding._read(5);
    fakeBinding._read(10);
  });

  it('stops pushing when push returns false', function(done) {
    var fakeBinding = {
      read: function(bytes, cb) {
        processNextTick(cb, null, new Buffer([1]));
      },
      push: function() {
        done();
        return false;
      }
    };
    pushBindingWrap({binding: fakeBinding, push: function() {}});
    fakeBinding._read(5);
  });

  it('keeps reading if push() returns true', function(done) {
    // Read 1 bytes at a time so we can do some fun math
    var bytesRead = 0;
    var calledCount = 0;
    var bytesToRead = 5;
    var fakeBinding = {
      read: function(bytes, cb) {
        assert.equal(bytes, bytesToRead - bytesRead);
        processNextTick(cb, null, new Buffer([1]));
      },
      push: function(data) {
        calledCount ++;
        bytesRead = bytesRead + data.length;
        if (bytesRead < bytesToRead) {
          return true;
        }
        assert.equal(calledCount, bytesToRead);
        done();
        return false;
      }
    };
    pushBindingWrap({binding: fakeBinding, push: function() {}});
    fakeBinding._read(bytesToRead);
  });
});
