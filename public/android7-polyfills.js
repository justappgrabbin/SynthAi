(function (g) {
  'use strict';

  if (!g.globalThis) g.globalThis = g;

  if (!Object.values) {
    Object.values = function (obj) {
      return Object.keys(Object(obj)).map(function (key) { return obj[key]; });
    };
  }

  if (!Object.entries) {
    Object.entries = function (obj) {
      return Object.keys(Object(obj)).map(function (key) { return [key, obj[key]]; });
    };
  }

  if (!Object.fromEntries) {
    Object.fromEntries = function (entries) {
      var out = {};
      for (var i = 0; i < entries.length; i += 1) out[entries[i][0]] = entries[i][1];
      return out;
    };
  }

  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, 'at', {
      configurable: true,
      writable: true,
      value: function (index) {
        var i = Number(index) || 0;
        if (i < 0) i += this.length;
        return this[i];
      }
    });
  }

  if (!Array.prototype.flat) {
    Object.defineProperty(Array.prototype, 'flat', {
      configurable: true,
      writable: true,
      value: function (depth) {
        var d = depth === undefined ? 1 : Number(depth);
        var out = [];
        function push(value, level) {
          if (Array.isArray(value) && level > 0) {
            for (var i = 0; i < value.length; i += 1) push(value[i], level - 1);
          } else {
            out.push(value);
          }
        }
        for (var i = 0; i < this.length; i += 1) push(this[i], d);
        return out;
      }
    });
  }

  if (!Array.prototype.flatMap) {
    Object.defineProperty(Array.prototype, 'flatMap', {
      configurable: true,
      writable: true,
      value: function (fn, thisArg) {
        return Array.prototype.map.call(this, fn, thisArg).flat(1);
      }
    });
  }

  if (!String.prototype.replaceAll) {
    Object.defineProperty(String.prototype, 'replaceAll', {
      configurable: true,
      writable: true,
      value: function (search, replacement) {
        if (search instanceof RegExp) {
          if (!search.global) throw new TypeError('replaceAll regex must be global');
          return this.replace(search, replacement);
        }
        return this.split(String(search)).join(String(replacement));
      }
    });
  }

  if (!Promise.prototype.finally) {
    Promise.prototype.finally = function (handler) {
      var P = this.constructor || Promise;
      return this.then(
        function (value) { return P.resolve(handler()).then(function () { return value; }); },
        function (reason) { return P.resolve(handler()).then(function () { throw reason; }); }
      );
    };
  }

  if (typeof g.structuredClone !== 'function') {
    g.structuredClone = function (value) {
      if (value === undefined) return undefined;
      return JSON.parse(JSON.stringify(value));
    };
  }

  if (typeof g.queueMicrotask !== 'function') {
    g.queueMicrotask = function (fn) { Promise.resolve().then(fn); };
  }

  if (typeof g.CustomEvent !== 'function') {
    g.CustomEvent = function CustomEvent(type, params) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent(type, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
      return event;
    };
    g.CustomEvent.prototype = g.Event.prototype;
  }

  if (g.crypto && typeof g.crypto.randomUUID !== 'function' && typeof g.crypto.getRandomValues === 'function') {
    g.crypto.randomUUID = function () {
      var bytes = new Uint8Array(16);
      g.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      var hex = [];
      for (var i = 0; i < bytes.length; i += 1) hex.push((bytes[i] + 256).toString(16).slice(1));
      return hex.slice(0, 4).join('') + '-' + hex.slice(4, 6).join('') + '-' +
        hex.slice(6, 8).join('') + '-' + hex.slice(8, 10).join('') + '-' + hex.slice(10).join('');
    };
  }
})(typeof window !== 'undefined' ? window : this);
