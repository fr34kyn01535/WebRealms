(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
module.exports = asPromise;

/**
 * Callback as used by {@link util.asPromise}.
 * @typedef asPromiseCallback
 * @type {function}
 * @param {Error|null} error Error, if any
 * @param {...*} params Additional arguments
 * @returns {undefined}
 */

/**
 * Returns a promise from a node-style callback function.
 * @memberof util
 * @param {asPromiseCallback} fn Function to call
 * @param {*} ctx Function context
 * @param {...*} params Function arguments
 * @returns {Promise<*>} Promisified function
 */
function asPromise(fn, ctx/*, varargs */) {
    var params  = new Array(arguments.length - 1),
        offset  = 0,
        index   = 2,
        pending = true;
    while (index < arguments.length)
        params[offset++] = arguments[index++];
    return new Promise(function executor(resolve, reject) {
        params[offset] = function callback(err/*, varargs */) {
            if (pending) {
                pending = false;
                if (err)
                    reject(err);
                else {
                    var params = new Array(arguments.length - 1),
                        offset = 0;
                    while (offset < params.length)
                        params[offset++] = arguments[offset];
                    resolve.apply(null, params);
                }
            }
        };
        try {
            fn.apply(ctx || null, params);
        } catch (err) {
            if (pending) {
                pending = false;
                reject(err);
            }
        }
    });
}

},{}],2:[function(require,module,exports){
"use strict";

/**
 * A minimal base64 implementation for number arrays.
 * @memberof util
 * @namespace
 */
var base64 = exports;

/**
 * Calculates the byte length of a base64 encoded string.
 * @param {string} string Base64 encoded string
 * @returns {number} Byte length
 */
base64.length = function length(string) {
    var p = string.length;
    if (!p)
        return 0;
    var n = 0;
    while (--p % 4 > 1 && string.charAt(p) === "=")
        ++n;
    return Math.ceil(string.length * 3) / 4 - n;
};

// Base64 encoding table
var b64 = new Array(64);

// Base64 decoding table
var s64 = new Array(123);

// 65..90, 97..122, 48..57, 43, 47
for (var i = 0; i < 64;)
    s64[b64[i] = i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i - 59 | 43] = i++;

/**
 * Encodes a buffer to a base64 encoded string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} Base64 encoded string
 */
base64.encode = function encode(buffer, start, end) {
    var string = []; // alt: new Array(Math.ceil((end - start) / 3) * 4);
    var i = 0, // output index
        j = 0, // goto index
        t;     // temporary
    while (start < end) {
        var b = buffer[start++];
        switch (j) {
            case 0:
                string[i++] = b64[b >> 2];
                t = (b & 3) << 4;
                j = 1;
                break;
            case 1:
                string[i++] = b64[t | b >> 4];
                t = (b & 15) << 2;
                j = 2;
                break;
            case 2:
                string[i++] = b64[t | b >> 6];
                string[i++] = b64[b & 63];
                j = 0;
                break;
        }
    }
    if (j) {
        string[i++] = b64[t];
        string[i  ] = 61;
        if (j === 1)
            string[i + 1] = 61;
    }
    return String.fromCharCode.apply(String, string);
};

var invalidEncoding = "invalid encoding";

/**
 * Decodes a base64 encoded string to a buffer.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Number of bytes written
 * @throws {Error} If encoding is invalid
 */
base64.decode = function decode(string, buffer, offset) {
    var start = offset;
    var j = 0, // goto index
        t;     // temporary
    for (var i = 0; i < string.length;) {
        var c = string.charCodeAt(i++);
        if (c === 61 && j > 1)
            break;
        if ((c = s64[c]) === undefined)
            throw Error(invalidEncoding);
        switch (j) {
            case 0:
                t = c;
                j = 1;
                break;
            case 1:
                buffer[offset++] = t << 2 | (c & 48) >> 4;
                t = c;
                j = 2;
                break;
            case 2:
                buffer[offset++] = (t & 15) << 4 | (c & 60) >> 2;
                t = c;
                j = 3;
                break;
            case 3:
                buffer[offset++] = (t & 3) << 6 | c;
                j = 0;
                break;
        }
    }
    if (j === 1)
        throw Error(invalidEncoding);
    return offset - start;
};

/**
 * Tests if the specified string appears to be base64 encoded.
 * @param {string} string String to test
 * @returns {boolean} `true` if probably base64 encoded, otherwise false
 */
base64.test = function test(string) {
    return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(string);
};

},{}],3:[function(require,module,exports){
"use strict";
module.exports = EventEmitter;

/**
 * Constructs a new event emitter instance.
 * @classdesc A minimal event emitter.
 * @memberof util
 * @constructor
 */
function EventEmitter() {

    /**
     * Registered listeners.
     * @type {Object.<string,*>}
     * @private
     */
    this._listeners = {};
}

/**
 * Registers an event listener.
 * @param {string} evt Event name
 * @param {function} fn Listener
 * @param {*} [ctx] Listener context
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.on = function on(evt, fn, ctx) {
    (this._listeners[evt] || (this._listeners[evt] = [])).push({
        fn  : fn,
        ctx : ctx || this
    });
    return this;
};

/**
 * Removes an event listener or any matching listeners if arguments are omitted.
 * @param {string} [evt] Event name. Removes all listeners if omitted.
 * @param {function} [fn] Listener to remove. Removes all listeners of `evt` if omitted.
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.off = function off(evt, fn) {
    if (evt === undefined)
        this._listeners = {};
    else {
        if (fn === undefined)
            this._listeners[evt] = [];
        else {
            var listeners = this._listeners[evt];
            for (var i = 0; i < listeners.length;)
                if (listeners[i].fn === fn)
                    listeners.splice(i, 1);
                else
                    ++i;
        }
    }
    return this;
};

/**
 * Emits an event by calling its listeners with the specified arguments.
 * @param {string} evt Event name
 * @param {...*} args Arguments
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.emit = function emit(evt) {
    var listeners = this._listeners[evt];
    if (listeners) {
        var args = [],
            i = 1;
        for (; i < arguments.length;)
            args.push(arguments[i++]);
        for (i = 0; i < listeners.length;)
            listeners[i].fn.apply(listeners[i++].ctx, args);
    }
    return this;
};

},{}],4:[function(require,module,exports){
"use strict";

module.exports = factory(factory);

/**
 * Reads / writes floats / doubles from / to buffers.
 * @name util.float
 * @namespace
 */

/**
 * Writes a 32 bit float to a buffer using little endian byte order.
 * @name util.float.writeFloatLE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Writes a 32 bit float to a buffer using big endian byte order.
 * @name util.float.writeFloatBE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Reads a 32 bit float from a buffer using little endian byte order.
 * @name util.float.readFloatLE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Reads a 32 bit float from a buffer using big endian byte order.
 * @name util.float.readFloatBE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Writes a 64 bit double to a buffer using little endian byte order.
 * @name util.float.writeDoubleLE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Writes a 64 bit double to a buffer using big endian byte order.
 * @name util.float.writeDoubleBE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Reads a 64 bit double from a buffer using little endian byte order.
 * @name util.float.readDoubleLE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Reads a 64 bit double from a buffer using big endian byte order.
 * @name util.float.readDoubleBE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

// Factory function for the purpose of node-based testing in modified global environments
function factory(exports) {

    // float: typed array
    if (typeof Float32Array !== "undefined") (function() {

        var f32 = new Float32Array([ -0 ]),
            f8b = new Uint8Array(f32.buffer),
            le  = f8b[3] === 128;

        function writeFloat_f32_cpy(val, buf, pos) {
            f32[0] = val;
            buf[pos    ] = f8b[0];
            buf[pos + 1] = f8b[1];
            buf[pos + 2] = f8b[2];
            buf[pos + 3] = f8b[3];
        }

        function writeFloat_f32_rev(val, buf, pos) {
            f32[0] = val;
            buf[pos    ] = f8b[3];
            buf[pos + 1] = f8b[2];
            buf[pos + 2] = f8b[1];
            buf[pos + 3] = f8b[0];
        }

        /* istanbul ignore next */
        exports.writeFloatLE = le ? writeFloat_f32_cpy : writeFloat_f32_rev;
        /* istanbul ignore next */
        exports.writeFloatBE = le ? writeFloat_f32_rev : writeFloat_f32_cpy;

        function readFloat_f32_cpy(buf, pos) {
            f8b[0] = buf[pos    ];
            f8b[1] = buf[pos + 1];
            f8b[2] = buf[pos + 2];
            f8b[3] = buf[pos + 3];
            return f32[0];
        }

        function readFloat_f32_rev(buf, pos) {
            f8b[3] = buf[pos    ];
            f8b[2] = buf[pos + 1];
            f8b[1] = buf[pos + 2];
            f8b[0] = buf[pos + 3];
            return f32[0];
        }

        /* istanbul ignore next */
        exports.readFloatLE = le ? readFloat_f32_cpy : readFloat_f32_rev;
        /* istanbul ignore next */
        exports.readFloatBE = le ? readFloat_f32_rev : readFloat_f32_cpy;

    // float: ieee754
    })(); else (function() {

        function writeFloat_ieee754(writeUint, val, buf, pos) {
            var sign = val < 0 ? 1 : 0;
            if (sign)
                val = -val;
            if (val === 0)
                writeUint(1 / val > 0 ? /* positive */ 0 : /* negative 0 */ 2147483648, buf, pos);
            else if (isNaN(val))
                writeUint(2143289344, buf, pos);
            else if (val > 3.4028234663852886e+38) // +-Infinity
                writeUint((sign << 31 | 2139095040) >>> 0, buf, pos);
            else if (val < 1.1754943508222875e-38) // denormal
                writeUint((sign << 31 | Math.round(val / 1.401298464324817e-45)) >>> 0, buf, pos);
            else {
                var exponent = Math.floor(Math.log(val) / Math.LN2),
                    mantissa = Math.round(val * Math.pow(2, -exponent) * 8388608) & 8388607;
                writeUint((sign << 31 | exponent + 127 << 23 | mantissa) >>> 0, buf, pos);
            }
        }

        exports.writeFloatLE = writeFloat_ieee754.bind(null, writeUintLE);
        exports.writeFloatBE = writeFloat_ieee754.bind(null, writeUintBE);

        function readFloat_ieee754(readUint, buf, pos) {
            var uint = readUint(buf, pos),
                sign = (uint >> 31) * 2 + 1,
                exponent = uint >>> 23 & 255,
                mantissa = uint & 8388607;
            return exponent === 255
                ? mantissa
                ? NaN
                : sign * Infinity
                : exponent === 0 // denormal
                ? sign * 1.401298464324817e-45 * mantissa
                : sign * Math.pow(2, exponent - 150) * (mantissa + 8388608);
        }

        exports.readFloatLE = readFloat_ieee754.bind(null, readUintLE);
        exports.readFloatBE = readFloat_ieee754.bind(null, readUintBE);

    })();

    // double: typed array
    if (typeof Float64Array !== "undefined") (function() {

        var f64 = new Float64Array([-0]),
            f8b = new Uint8Array(f64.buffer),
            le  = f8b[7] === 128;

        function writeDouble_f64_cpy(val, buf, pos) {
            f64[0] = val;
            buf[pos    ] = f8b[0];
            buf[pos + 1] = f8b[1];
            buf[pos + 2] = f8b[2];
            buf[pos + 3] = f8b[3];
            buf[pos + 4] = f8b[4];
            buf[pos + 5] = f8b[5];
            buf[pos + 6] = f8b[6];
            buf[pos + 7] = f8b[7];
        }

        function writeDouble_f64_rev(val, buf, pos) {
            f64[0] = val;
            buf[pos    ] = f8b[7];
            buf[pos + 1] = f8b[6];
            buf[pos + 2] = f8b[5];
            buf[pos + 3] = f8b[4];
            buf[pos + 4] = f8b[3];
            buf[pos + 5] = f8b[2];
            buf[pos + 6] = f8b[1];
            buf[pos + 7] = f8b[0];
        }

        /* istanbul ignore next */
        exports.writeDoubleLE = le ? writeDouble_f64_cpy : writeDouble_f64_rev;
        /* istanbul ignore next */
        exports.writeDoubleBE = le ? writeDouble_f64_rev : writeDouble_f64_cpy;

        function readDouble_f64_cpy(buf, pos) {
            f8b[0] = buf[pos    ];
            f8b[1] = buf[pos + 1];
            f8b[2] = buf[pos + 2];
            f8b[3] = buf[pos + 3];
            f8b[4] = buf[pos + 4];
            f8b[5] = buf[pos + 5];
            f8b[6] = buf[pos + 6];
            f8b[7] = buf[pos + 7];
            return f64[0];
        }

        function readDouble_f64_rev(buf, pos) {
            f8b[7] = buf[pos    ];
            f8b[6] = buf[pos + 1];
            f8b[5] = buf[pos + 2];
            f8b[4] = buf[pos + 3];
            f8b[3] = buf[pos + 4];
            f8b[2] = buf[pos + 5];
            f8b[1] = buf[pos + 6];
            f8b[0] = buf[pos + 7];
            return f64[0];
        }

        /* istanbul ignore next */
        exports.readDoubleLE = le ? readDouble_f64_cpy : readDouble_f64_rev;
        /* istanbul ignore next */
        exports.readDoubleBE = le ? readDouble_f64_rev : readDouble_f64_cpy;

    // double: ieee754
    })(); else (function() {

        function writeDouble_ieee754(writeUint, off0, off1, val, buf, pos) {
            var sign = val < 0 ? 1 : 0;
            if (sign)
                val = -val;
            if (val === 0) {
                writeUint(0, buf, pos + off0);
                writeUint(1 / val > 0 ? /* positive */ 0 : /* negative 0 */ 2147483648, buf, pos + off1);
            } else if (isNaN(val)) {
                writeUint(0, buf, pos + off0);
                writeUint(2146959360, buf, pos + off1);
            } else if (val > 1.7976931348623157e+308) { // +-Infinity
                writeUint(0, buf, pos + off0);
                writeUint((sign << 31 | 2146435072) >>> 0, buf, pos + off1);
            } else {
                var mantissa;
                if (val < 2.2250738585072014e-308) { // denormal
                    mantissa = val / 5e-324;
                    writeUint(mantissa >>> 0, buf, pos + off0);
                    writeUint((sign << 31 | mantissa / 4294967296) >>> 0, buf, pos + off1);
                } else {
                    var exponent = Math.floor(Math.log(val) / Math.LN2);
                    if (exponent === 1024)
                        exponent = 1023;
                    mantissa = val * Math.pow(2, -exponent);
                    writeUint(mantissa * 4503599627370496 >>> 0, buf, pos + off0);
                    writeUint((sign << 31 | exponent + 1023 << 20 | mantissa * 1048576 & 1048575) >>> 0, buf, pos + off1);
                }
            }
        }

        exports.writeDoubleLE = writeDouble_ieee754.bind(null, writeUintLE, 0, 4);
        exports.writeDoubleBE = writeDouble_ieee754.bind(null, writeUintBE, 4, 0);

        function readDouble_ieee754(readUint, off0, off1, buf, pos) {
            var lo = readUint(buf, pos + off0),
                hi = readUint(buf, pos + off1);
            var sign = (hi >> 31) * 2 + 1,
                exponent = hi >>> 20 & 2047,
                mantissa = 4294967296 * (hi & 1048575) + lo;
            return exponent === 2047
                ? mantissa
                ? NaN
                : sign * Infinity
                : exponent === 0 // denormal
                ? sign * 5e-324 * mantissa
                : sign * Math.pow(2, exponent - 1075) * (mantissa + 4503599627370496);
        }

        exports.readDoubleLE = readDouble_ieee754.bind(null, readUintLE, 0, 4);
        exports.readDoubleBE = readDouble_ieee754.bind(null, readUintBE, 4, 0);

    })();

    return exports;
}

// uint helpers

function writeUintLE(val, buf, pos) {
    buf[pos    ] =  val        & 255;
    buf[pos + 1] =  val >>> 8  & 255;
    buf[pos + 2] =  val >>> 16 & 255;
    buf[pos + 3] =  val >>> 24;
}

function writeUintBE(val, buf, pos) {
    buf[pos    ] =  val >>> 24;
    buf[pos + 1] =  val >>> 16 & 255;
    buf[pos + 2] =  val >>> 8  & 255;
    buf[pos + 3] =  val        & 255;
}

function readUintLE(buf, pos) {
    return (buf[pos    ]
          | buf[pos + 1] << 8
          | buf[pos + 2] << 16
          | buf[pos + 3] << 24) >>> 0;
}

function readUintBE(buf, pos) {
    return (buf[pos    ] << 24
          | buf[pos + 1] << 16
          | buf[pos + 2] << 8
          | buf[pos + 3]) >>> 0;
}

},{}],5:[function(require,module,exports){
"use strict";
module.exports = inquire;

/**
 * Requires a module only if available.
 * @memberof util
 * @param {string} moduleName Module to require
 * @returns {?Object} Required module if available and not empty, otherwise `null`
 */
function inquire(moduleName) {
    try {
        var mod = eval("quire".replace(/^/,"re"))(moduleName); // eslint-disable-line no-eval
        if (mod && (mod.length || Object.keys(mod).length))
            return mod;
    } catch (e) {} // eslint-disable-line no-empty
    return null;
}

},{}],6:[function(require,module,exports){
"use strict";
module.exports = pool;

/**
 * An allocator as used by {@link util.pool}.
 * @typedef PoolAllocator
 * @type {function}
 * @param {number} size Buffer size
 * @returns {Uint8Array} Buffer
 */

/**
 * A slicer as used by {@link util.pool}.
 * @typedef PoolSlicer
 * @type {function}
 * @param {number} start Start offset
 * @param {number} end End offset
 * @returns {Uint8Array} Buffer slice
 * @this {Uint8Array}
 */

/**
 * A general purpose buffer pool.
 * @memberof util
 * @function
 * @param {PoolAllocator} alloc Allocator
 * @param {PoolSlicer} slice Slicer
 * @param {number} [size=8192] Slab size
 * @returns {PoolAllocator} Pooled allocator
 */
function pool(alloc, slice, size) {
    var SIZE   = size || 8192;
    var MAX    = SIZE >>> 1;
    var slab   = null;
    var offset = SIZE;
    return function pool_alloc(size) {
        if (size < 1 || size > MAX)
            return alloc(size);
        if (offset + size > SIZE) {
            slab = alloc(SIZE);
            offset = 0;
        }
        var buf = slice.call(slab, offset, offset += size);
        if (offset & 7) // align to 32 bit
            offset = (offset | 7) + 1;
        return buf;
    };
}

},{}],7:[function(require,module,exports){
"use strict";

/**
 * A minimal UTF8 implementation for number arrays.
 * @memberof util
 * @namespace
 */
var utf8 = exports;

/**
 * Calculates the UTF8 byte length of a string.
 * @param {string} string String
 * @returns {number} Byte length
 */
utf8.length = function utf8_length(string) {
    var len = 0,
        c = 0;
    for (var i = 0; i < string.length; ++i) {
        c = string.charCodeAt(i);
        if (c < 128)
            len += 1;
        else if (c < 2048)
            len += 2;
        else if ((c & 0xFC00) === 0xD800 && (string.charCodeAt(i + 1) & 0xFC00) === 0xDC00) {
            ++i;
            len += 4;
        } else
            len += 3;
    }
    return len;
};

/**
 * Reads UTF8 bytes as a string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} String read
 */
utf8.read = function utf8_read(buffer, start, end) {
    var len = end - start;
    if (len < 1)
        return "";
    var parts = null,
        chunk = [],
        i = 0, // char offset
        t;     // temporary
    while (start < end) {
        t = buffer[start++];
        if (t < 128)
            chunk[i++] = t;
        else if (t > 191 && t < 224)
            chunk[i++] = (t & 31) << 6 | buffer[start++] & 63;
        else if (t > 239 && t < 365) {
            t = ((t & 7) << 18 | (buffer[start++] & 63) << 12 | (buffer[start++] & 63) << 6 | buffer[start++] & 63) - 0x10000;
            chunk[i++] = 0xD800 + (t >> 10);
            chunk[i++] = 0xDC00 + (t & 1023);
        } else
            chunk[i++] = (t & 15) << 12 | (buffer[start++] & 63) << 6 | buffer[start++] & 63;
        if (i > 8191) {
            (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
            i = 0;
        }
    }
    if (parts) {
        if (i)
            parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
        return parts.join("");
    }
    return String.fromCharCode.apply(String, chunk.slice(0, i));
};

/**
 * Writes a string as UTF8 bytes.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Bytes written
 */
utf8.write = function utf8_write(string, buffer, offset) {
    var start = offset,
        c1, // character 1
        c2; // character 2
    for (var i = 0; i < string.length; ++i) {
        c1 = string.charCodeAt(i);
        if (c1 < 128) {
            buffer[offset++] = c1;
        } else if (c1 < 2048) {
            buffer[offset++] = c1 >> 6       | 192;
            buffer[offset++] = c1       & 63 | 128;
        } else if ((c1 & 0xFC00) === 0xD800 && ((c2 = string.charCodeAt(i + 1)) & 0xFC00) === 0xDC00) {
            c1 = 0x10000 + ((c1 & 0x03FF) << 10) + (c2 & 0x03FF);
            ++i;
            buffer[offset++] = c1 >> 18      | 240;
            buffer[offset++] = c1 >> 12 & 63 | 128;
            buffer[offset++] = c1 >> 6  & 63 | 128;
            buffer[offset++] = c1       & 63 | 128;
        } else {
            buffer[offset++] = c1 >> 12      | 224;
            buffer[offset++] = c1 >> 6  & 63 | 128;
            buffer[offset++] = c1       & 63 | 128;
        }
    }
    return offset - start;
};

},{}],8:[function(require,module,exports){
// minimal library entry point.

"use strict";
module.exports = require("./src/index-minimal");

},{"./src/index-minimal":9}],9:[function(require,module,exports){
"use strict";
var protobuf = exports;

/**
 * Build type, one of `"full"`, `"light"` or `"minimal"`.
 * @name build
 * @type {string}
 * @const
 */
protobuf.build = "minimal";

/**
 * Named roots.
 * This is where pbjs stores generated structures (the option `-r, --root` specifies a name).
 * Can also be used manually to make roots available accross modules.
 * @name roots
 * @type {Object.<string,Root>}
 * @example
 * // pbjs -r myroot -o compiled.js ...
 *
 * // in another module:
 * require("./compiled.js");
 *
 * // in any subsequent module:
 * var root = protobuf.roots["myroot"];
 */
protobuf.roots = {};

// Serialization
protobuf.Writer       = require("./writer");
protobuf.BufferWriter = require("./writer_buffer");
protobuf.Reader       = require("./reader");
protobuf.BufferReader = require("./reader_buffer");

// Utility
protobuf.util         = require("./util/minimal");
protobuf.rpc          = require("./rpc");
protobuf.configure    = configure;

/* istanbul ignore next */
/**
 * Reconfigures the library according to the environment.
 * @returns {undefined}
 */
function configure() {
    protobuf.Reader._configure(protobuf.BufferReader);
    protobuf.util._configure();
}

// Configure serialization
protobuf.Writer._configure(protobuf.BufferWriter);
configure();

},{"./reader":10,"./reader_buffer":11,"./rpc":12,"./util/minimal":15,"./writer":16,"./writer_buffer":17}],10:[function(require,module,exports){
"use strict";
module.exports = Reader;

var util      = require("./util/minimal");

var BufferReader; // cyclic

var LongBits  = util.LongBits,
    utf8      = util.utf8;

/* istanbul ignore next */
function indexOutOfRange(reader, writeLength) {
    return RangeError("index out of range: " + reader.pos + " + " + (writeLength || 1) + " > " + reader.len);
}

/**
 * Constructs a new reader instance using the specified buffer.
 * @classdesc Wire format reader using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 * @param {Uint8Array} buffer Buffer to read from
 */
function Reader(buffer) {

    /**
     * Read buffer.
     * @type {Uint8Array}
     */
    this.buf = buffer;

    /**
     * Read buffer position.
     * @type {number}
     */
    this.pos = 0;

    /**
     * Read buffer length.
     * @type {number}
     */
    this.len = buffer.length;
}

var create_array = typeof Uint8Array !== "undefined"
    ? function create_typed_array(buffer) {
        if (buffer instanceof Uint8Array || Array.isArray(buffer))
            return new Reader(buffer);
        throw Error("illegal buffer");
    }
    /* istanbul ignore next */
    : function create_array(buffer) {
        if (Array.isArray(buffer))
            return new Reader(buffer);
        throw Error("illegal buffer");
    };

/**
 * Creates a new reader using the specified buffer.
 * @function
 * @param {Uint8Array|Buffer} buffer Buffer to read from
 * @returns {Reader|BufferReader} A {@link BufferReader} if `buffer` is a Buffer, otherwise a {@link Reader}
 * @throws {Error} If `buffer` is not a valid buffer
 */
Reader.create = util.Buffer
    ? function create_buffer_setup(buffer) {
        return (Reader.create = function create_buffer(buffer) {
            return util.Buffer.isBuffer(buffer)
                ? new BufferReader(buffer)
                /* istanbul ignore next */
                : create_array(buffer);
        })(buffer);
    }
    /* istanbul ignore next */
    : create_array;

Reader.prototype._slice = util.Array.prototype.subarray || /* istanbul ignore next */ util.Array.prototype.slice;

/**
 * Reads a varint as an unsigned 32 bit value.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.uint32 = (function read_uint32_setup() {
    var value = 4294967295; // optimizer type-hint, tends to deopt otherwise (?!)
    return function read_uint32() {
        value = (         this.buf[this.pos] & 127       ) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) <<  7) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 14) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 21) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] &  15) << 28) >>> 0; if (this.buf[this.pos++] < 128) return value;

        /* istanbul ignore if */
        if ((this.pos += 5) > this.len) {
            this.pos = this.len;
            throw indexOutOfRange(this, 10);
        }
        return value;
    };
})();

/**
 * Reads a varint as a signed 32 bit value.
 * @returns {number} Value read
 */
Reader.prototype.int32 = function read_int32() {
    return this.uint32() | 0;
};

/**
 * Reads a zig-zag encoded varint as a signed 32 bit value.
 * @returns {number} Value read
 */
Reader.prototype.sint32 = function read_sint32() {
    var value = this.uint32();
    return value >>> 1 ^ -(value & 1) | 0;
};

/* eslint-disable no-invalid-this */

function readLongVarint() {
    // tends to deopt with local vars for octet etc.
    var bits = new LongBits(0, 0);
    var i = 0;
    if (this.len - this.pos > 4) { // fast route (lo)
        for (; i < 4; ++i) {
            // 1st..4th
            bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
        // 5th
        bits.lo = (bits.lo | (this.buf[this.pos] & 127) << 28) >>> 0;
        bits.hi = (bits.hi | (this.buf[this.pos] & 127) >>  4) >>> 0;
        if (this.buf[this.pos++] < 128)
            return bits;
        i = 0;
    } else {
        for (; i < 3; ++i) {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
            // 1st..3th
            bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
        // 4th
        bits.lo = (bits.lo | (this.buf[this.pos++] & 127) << i * 7) >>> 0;
        return bits;
    }
    if (this.len - this.pos > 4) { // fast route (hi)
        for (; i < 5; ++i) {
            // 6th..10th
            bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
    } else {
        for (; i < 5; ++i) {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
            // 6th..10th
            bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
    }
    /* istanbul ignore next */
    throw Error("invalid varint encoding");
}

/* eslint-enable no-invalid-this */

/**
 * Reads a varint as a signed 64 bit value.
 * @name Reader#int64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a varint as an unsigned 64 bit value.
 * @name Reader#uint64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a zig-zag encoded varint as a signed 64 bit value.
 * @name Reader#sint64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a varint as a boolean.
 * @returns {boolean} Value read
 */
Reader.prototype.bool = function read_bool() {
    return this.uint32() !== 0;
};

function readFixed32_end(buf, end) { // note that this uses `end`, not `pos`
    return (buf[end - 4]
          | buf[end - 3] << 8
          | buf[end - 2] << 16
          | buf[end - 1] << 24) >>> 0;
}

/**
 * Reads fixed 32 bits as an unsigned 32 bit integer.
 * @returns {number} Value read
 */
Reader.prototype.fixed32 = function read_fixed32() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    return readFixed32_end(this.buf, this.pos += 4);
};

/**
 * Reads fixed 32 bits as a signed 32 bit integer.
 * @returns {number} Value read
 */
Reader.prototype.sfixed32 = function read_sfixed32() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    return readFixed32_end(this.buf, this.pos += 4) | 0;
};

/* eslint-disable no-invalid-this */

function readFixed64(/* this: Reader */) {

    /* istanbul ignore if */
    if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 8);

    return new LongBits(readFixed32_end(this.buf, this.pos += 4), readFixed32_end(this.buf, this.pos += 4));
}

/* eslint-enable no-invalid-this */

/**
 * Reads fixed 64 bits.
 * @name Reader#fixed64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads zig-zag encoded fixed 64 bits.
 * @name Reader#sfixed64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a float (32 bit) as a number.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.float = function read_float() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    var value = util.float.readFloatLE(this.buf, this.pos);
    this.pos += 4;
    return value;
};

/**
 * Reads a double (64 bit float) as a number.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.double = function read_double() {

    /* istanbul ignore if */
    if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 4);

    var value = util.float.readDoubleLE(this.buf, this.pos);
    this.pos += 8;
    return value;
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @returns {Uint8Array} Value read
 */
Reader.prototype.bytes = function read_bytes() {
    var length = this.uint32(),
        start  = this.pos,
        end    = this.pos + length;

    /* istanbul ignore if */
    if (end > this.len)
        throw indexOutOfRange(this, length);

    this.pos += length;
    return start === end // fix for IE 10/Win8 and others' subarray returning array of size 1
        ? new this.buf.constructor(0)
        : this._slice.call(this.buf, start, end);
};

/**
 * Reads a string preceeded by its byte length as a varint.
 * @returns {string} Value read
 */
Reader.prototype.string = function read_string() {
    var bytes = this.bytes();
    return utf8.read(bytes, 0, bytes.length);
};

/**
 * Skips the specified number of bytes if specified, otherwise skips a varint.
 * @param {number} [length] Length if known, otherwise a varint is assumed
 * @returns {Reader} `this`
 */
Reader.prototype.skip = function skip(length) {
    if (typeof length === "number") {
        /* istanbul ignore if */
        if (this.pos + length > this.len)
            throw indexOutOfRange(this, length);
        this.pos += length;
    } else {
        do {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
        } while (this.buf[this.pos++] & 128);
    }
    return this;
};

/**
 * Skips the next element of the specified wire type.
 * @param {number} wireType Wire type received
 * @returns {Reader} `this`
 */
Reader.prototype.skipType = function(wireType) {
    switch (wireType) {
        case 0:
            this.skip();
            break;
        case 1:
            this.skip(8);
            break;
        case 2:
            this.skip(this.uint32());
            break;
        case 3:
            do { // eslint-disable-line no-constant-condition
                if ((wireType = this.uint32() & 7) === 4)
                    break;
                this.skipType(wireType);
            } while (true);
            break;
        case 5:
            this.skip(4);
            break;

        /* istanbul ignore next */
        default:
            throw Error("invalid wire type " + wireType + " at offset " + this.pos);
    }
    return this;
};

Reader._configure = function(BufferReader_) {
    BufferReader = BufferReader_;

    var fn = util.Long ? "toLong" : /* istanbul ignore next */ "toNumber";
    util.merge(Reader.prototype, {

        int64: function read_int64() {
            return readLongVarint.call(this)[fn](false);
        },

        uint64: function read_uint64() {
            return readLongVarint.call(this)[fn](true);
        },

        sint64: function read_sint64() {
            return readLongVarint.call(this).zzDecode()[fn](false);
        },

        fixed64: function read_fixed64() {
            return readFixed64.call(this)[fn](true);
        },

        sfixed64: function read_sfixed64() {
            return readFixed64.call(this)[fn](false);
        }

    });
};

},{"./util/minimal":15}],11:[function(require,module,exports){
"use strict";
module.exports = BufferReader;

// extends Reader
var Reader = require("./reader");
(BufferReader.prototype = Object.create(Reader.prototype)).constructor = BufferReader;

var util = require("./util/minimal");

/**
 * Constructs a new buffer reader instance.
 * @classdesc Wire format reader using node buffers.
 * @extends Reader
 * @constructor
 * @param {Buffer} buffer Buffer to read from
 */
function BufferReader(buffer) {
    Reader.call(this, buffer);

    /**
     * Read buffer.
     * @name BufferReader#buf
     * @type {Buffer}
     */
}

/* istanbul ignore else */
if (util.Buffer)
    BufferReader.prototype._slice = util.Buffer.prototype.slice;

/**
 * @override
 */
BufferReader.prototype.string = function read_string_buffer() {
    var len = this.uint32(); // modifies pos
    return this.buf.utf8Slice(this.pos, this.pos = Math.min(this.pos + len, this.len));
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @name BufferReader#bytes
 * @function
 * @returns {Buffer} Value read
 */

},{"./reader":10,"./util/minimal":15}],12:[function(require,module,exports){
"use strict";

/**
 * Streaming RPC helpers.
 * @namespace
 */
var rpc = exports;

/**
 * RPC implementation passed to {@link Service#create} performing a service request on network level, i.e. by utilizing http requests or websockets.
 * @typedef RPCImpl
 * @type {function}
 * @param {Method|rpc.ServiceMethod} method Reflected or static method being called
 * @param {Uint8Array} requestData Request data
 * @param {RPCImplCallback} callback Callback function
 * @returns {undefined}
 * @example
 * function rpcImpl(method, requestData, callback) {
 *     if (protobuf.util.lcFirst(method.name) !== "myMethod") // compatible with static code
 *         throw Error("no such method");
 *     asynchronouslyObtainAResponse(requestData, function(err, responseData) {
 *         callback(err, responseData);
 *     });
 * }
 */

/**
 * Node-style callback as used by {@link RPCImpl}.
 * @typedef RPCImplCallback
 * @type {function}
 * @param {?Error} error Error, if any, otherwise `null`
 * @param {?Uint8Array} [response] Response data or `null` to signal end of stream, if there hasn't been an error
 * @returns {undefined}
 */

rpc.Service = require("./rpc/service");

},{"./rpc/service":13}],13:[function(require,module,exports){
"use strict";
module.exports = Service;

var util = require("../util/minimal");

// Extends EventEmitter
(Service.prototype = Object.create(util.EventEmitter.prototype)).constructor = Service;

/**
 * A service method callback as used by {@link rpc.ServiceMethod|ServiceMethod}.
 *
 * Differs from {@link RPCImplCallback} in that it is an actual callback of a service method which may not return `response = null`.
 * @typedef rpc.ServiceMethodCallback
 * @type {function}
 * @param {?Error} error Error, if any
 * @param {?Message} [response] Response message
 * @returns {undefined}
 */

/**
 * A service method part of a {@link rpc.ServiceMethodMixin|ServiceMethodMixin} and thus {@link rpc.Service} as created by {@link Service.create}.
 * @typedef rpc.ServiceMethod
 * @type {function}
 * @param {Message|Object.<string,*>} request Request message or plain object
 * @param {rpc.ServiceMethodCallback} [callback] Node-style callback called with the error, if any, and the response message
 * @returns {Promise<Message>} Promise if `callback` has been omitted, otherwise `undefined`
 */

/**
 * A service method mixin.
 *
 * When using TypeScript, mixed in service methods are only supported directly with a type definition of a static module (used with reflection). Otherwise, explicit casting is required.
 * @typedef rpc.ServiceMethodMixin
 * @type {Object.<string,rpc.ServiceMethod>}
 * @example
 * // Explicit casting with TypeScript
 * (myRpcService["myMethod"] as protobuf.rpc.ServiceMethod)(...)
 */

/**
 * Constructs a new RPC service instance.
 * @classdesc An RPC service as returned by {@link Service#create}.
 * @exports rpc.Service
 * @extends util.EventEmitter
 * @augments rpc.ServiceMethodMixin
 * @constructor
 * @param {RPCImpl} rpcImpl RPC implementation
 * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
 * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
 */
function Service(rpcImpl, requestDelimited, responseDelimited) {

    if (typeof rpcImpl !== "function")
        throw TypeError("rpcImpl must be a function");

    util.EventEmitter.call(this);

    /**
     * RPC implementation. Becomes `null` once the service is ended.
     * @type {?RPCImpl}
     */
    this.rpcImpl = rpcImpl;

    /**
     * Whether requests are length-delimited.
     * @type {boolean}
     */
    this.requestDelimited = Boolean(requestDelimited);

    /**
     * Whether responses are length-delimited.
     * @type {boolean}
     */
    this.responseDelimited = Boolean(responseDelimited);
}

/**
 * Calls a service method through {@link rpc.Service#rpcImpl|rpcImpl}.
 * @param {Method|rpc.ServiceMethod} method Reflected or static method
 * @param {function} requestCtor Request constructor
 * @param {function} responseCtor Response constructor
 * @param {Message|Object.<string,*>} request Request message or plain object
 * @param {rpc.ServiceMethodCallback} callback Service callback
 * @returns {undefined}
 */
Service.prototype.rpcCall = function rpcCall(method, requestCtor, responseCtor, request, callback) {

    if (!request)
        throw TypeError("request must be specified");

    var self = this;
    if (!callback)
        return util.asPromise(rpcCall, self, method, requestCtor, responseCtor, request);

    if (!self.rpcImpl) {
        setTimeout(function() { callback(Error("already ended")); }, 0);
        return undefined;
    }

    try {
        return self.rpcImpl(
            method,
            requestCtor[self.requestDelimited ? "encodeDelimited" : "encode"](request).finish(),
            function rpcCallback(err, response) {

                if (err) {
                    self.emit("error", err, method);
                    return callback(err);
                }

                if (response === null) {
                    self.end(/* endedByRPC */ true);
                    return undefined;
                }

                if (!(response instanceof responseCtor)) {
                    try {
                        response = responseCtor[self.responseDelimited ? "decodeDelimited" : "decode"](response);
                    } catch (err) {
                        self.emit("error", err, method);
                        return callback(err);
                    }
                }

                self.emit("data", response, method);
                return callback(null, response);
            }
        );
    } catch (err) {
        self.emit("error", err, method);
        setTimeout(function() { callback(err); }, 0);
        return undefined;
    }
};

/**
 * Ends this service and emits the `end` event.
 * @param {boolean} [endedByRPC=false] Whether the service has been ended by the RPC implementation.
 * @returns {rpc.Service} `this`
 */
Service.prototype.end = function end(endedByRPC) {
    if (this.rpcImpl) {
        if (!endedByRPC) // signal end to rpcImpl
            this.rpcImpl(null, null, null);
        this.rpcImpl = null;
        this.emit("end").off();
    }
    return this;
};

},{"../util/minimal":15}],14:[function(require,module,exports){
"use strict";
module.exports = LongBits;

var util = require("../util/minimal");

/**
 * Constructs new long bits.
 * @classdesc Helper class for working with the low and high bits of a 64 bit value.
 * @memberof util
 * @constructor
 * @param {number} lo Low 32 bits, unsigned
 * @param {number} hi High 32 bits, unsigned
 */
function LongBits(lo, hi) {

    // note that the casts below are theoretically unnecessary as of today, but older statically
    // generated converter code might still call the ctor with signed 32bits. kept for compat.

    /**
     * Low bits.
     * @type {number}
     */
    this.lo = lo >>> 0;

    /**
     * High bits.
     * @type {number}
     */
    this.hi = hi >>> 0;
}

/**
 * Zero bits.
 * @memberof util.LongBits
 * @type {util.LongBits}
 */
var zero = LongBits.zero = new LongBits(0, 0);

zero.toNumber = function() { return 0; };
zero.zzEncode = zero.zzDecode = function() { return this; };
zero.length = function() { return 1; };

/**
 * Zero hash.
 * @memberof util.LongBits
 * @type {string}
 */
var zeroHash = LongBits.zeroHash = "\0\0\0\0\0\0\0\0";

/**
 * Constructs new long bits from the specified number.
 * @param {number} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.fromNumber = function fromNumber(value) {
    if (value === 0)
        return zero;
    var sign = value < 0;
    if (sign)
        value = -value;
    var lo = value >>> 0,
        hi = (value - lo) / 4294967296 >>> 0;
    if (sign) {
        hi = ~hi >>> 0;
        lo = ~lo >>> 0;
        if (++lo > 4294967295) {
            lo = 0;
            if (++hi > 4294967295)
                hi = 0;
        }
    }
    return new LongBits(lo, hi);
};

/**
 * Constructs new long bits from a number, long or string.
 * @param {Long|number|string} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.from = function from(value) {
    if (typeof value === "number")
        return LongBits.fromNumber(value);
    if (util.isString(value)) {
        /* istanbul ignore else */
        if (util.Long)
            value = util.Long.fromString(value);
        else
            return LongBits.fromNumber(parseInt(value, 10));
    }
    return value.low || value.high ? new LongBits(value.low >>> 0, value.high >>> 0) : zero;
};

/**
 * Converts this long bits to a possibly unsafe JavaScript number.
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {number} Possibly unsafe number
 */
LongBits.prototype.toNumber = function toNumber(unsigned) {
    if (!unsigned && this.hi >>> 31) {
        var lo = ~this.lo + 1 >>> 0,
            hi = ~this.hi     >>> 0;
        if (!lo)
            hi = hi + 1 >>> 0;
        return -(lo + hi * 4294967296);
    }
    return this.lo + this.hi * 4294967296;
};

/**
 * Converts this long bits to a long.
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long} Long
 */
LongBits.prototype.toLong = function toLong(unsigned) {
    return util.Long
        ? new util.Long(this.lo | 0, this.hi | 0, Boolean(unsigned))
        /* istanbul ignore next */
        : { low: this.lo | 0, high: this.hi | 0, unsigned: Boolean(unsigned) };
};

var charCodeAt = String.prototype.charCodeAt;

/**
 * Constructs new long bits from the specified 8 characters long hash.
 * @param {string} hash Hash
 * @returns {util.LongBits} Bits
 */
LongBits.fromHash = function fromHash(hash) {
    if (hash === zeroHash)
        return zero;
    return new LongBits(
        ( charCodeAt.call(hash, 0)
        | charCodeAt.call(hash, 1) << 8
        | charCodeAt.call(hash, 2) << 16
        | charCodeAt.call(hash, 3) << 24) >>> 0
    ,
        ( charCodeAt.call(hash, 4)
        | charCodeAt.call(hash, 5) << 8
        | charCodeAt.call(hash, 6) << 16
        | charCodeAt.call(hash, 7) << 24) >>> 0
    );
};

/**
 * Converts this long bits to a 8 characters long hash.
 * @returns {string} Hash
 */
LongBits.prototype.toHash = function toHash() {
    return String.fromCharCode(
        this.lo        & 255,
        this.lo >>> 8  & 255,
        this.lo >>> 16 & 255,
        this.lo >>> 24      ,
        this.hi        & 255,
        this.hi >>> 8  & 255,
        this.hi >>> 16 & 255,
        this.hi >>> 24
    );
};

/**
 * Zig-zag encodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBits.prototype.zzEncode = function zzEncode() {
    var mask =   this.hi >> 31;
    this.hi  = ((this.hi << 1 | this.lo >>> 31) ^ mask) >>> 0;
    this.lo  = ( this.lo << 1                   ^ mask) >>> 0;
    return this;
};

/**
 * Zig-zag decodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBits.prototype.zzDecode = function zzDecode() {
    var mask = -(this.lo & 1);
    this.lo  = ((this.lo >>> 1 | this.hi << 31) ^ mask) >>> 0;
    this.hi  = ( this.hi >>> 1                  ^ mask) >>> 0;
    return this;
};

/**
 * Calculates the length of this longbits when encoded as a varint.
 * @returns {number} Length
 */
LongBits.prototype.length = function length() {
    var part0 =  this.lo,
        part1 = (this.lo >>> 28 | this.hi << 4) >>> 0,
        part2 =  this.hi >>> 24;
    return part2 === 0
         ? part1 === 0
           ? part0 < 16384
             ? part0 < 128 ? 1 : 2
             : part0 < 2097152 ? 3 : 4
           : part1 < 16384
             ? part1 < 128 ? 5 : 6
             : part1 < 2097152 ? 7 : 8
         : part2 < 128 ? 9 : 10;
};

},{"../util/minimal":15}],15:[function(require,module,exports){
(function (global){
"use strict";
var util = exports;

// used to return a Promise where callback is omitted
util.asPromise = require("@protobufjs/aspromise");

// converts to / from base64 encoded strings
util.base64 = require("@protobufjs/base64");

// base class of rpc.Service
util.EventEmitter = require("@protobufjs/eventemitter");

// float handling accross browsers
util.float = require("@protobufjs/float");

// requires modules optionally and hides the call from bundlers
util.inquire = require("@protobufjs/inquire");

// converts to / from utf8 encoded strings
util.utf8 = require("@protobufjs/utf8");

// provides a node-like buffer pool in the browser
util.pool = require("@protobufjs/pool");

// utility to work with the low and high bits of a 64 bit value
util.LongBits = require("./longbits");

/**
 * An immuable empty array.
 * @memberof util
 * @type {Array.<*>}
 * @const
 */
util.emptyArray = Object.freeze ? Object.freeze([]) : /* istanbul ignore next */ []; // used on prototypes

/**
 * An immutable empty object.
 * @type {Object}
 * @const
 */
util.emptyObject = Object.freeze ? Object.freeze({}) : /* istanbul ignore next */ {}; // used on prototypes

/**
 * Whether running within node or not.
 * @memberof util
 * @type {boolean}
 * @const
 */
util.isNode = Boolean(global.process && global.process.versions && global.process.versions.node);

/**
 * Tests if the specified value is an integer.
 * @function
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is an integer
 */
util.isInteger = Number.isInteger || /* istanbul ignore next */ function isInteger(value) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
};

/**
 * Tests if the specified value is a string.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a string
 */
util.isString = function isString(value) {
    return typeof value === "string" || value instanceof String;
};

/**
 * Tests if the specified value is a non-null object.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a non-null object
 */
util.isObject = function isObject(value) {
    return value && typeof value === "object";
};

/**
 * Checks if a property on a message is considered to be present.
 * This is an alias of {@link util.isSet}.
 * @function
 * @param {Object} obj Plain object or message instance
 * @param {string} prop Property name
 * @returns {boolean} `true` if considered to be present, otherwise `false`
 */
util.isset =

/**
 * Checks if a property on a message is considered to be present.
 * @param {Object} obj Plain object or message instance
 * @param {string} prop Property name
 * @returns {boolean} `true` if considered to be present, otherwise `false`
 */
util.isSet = function isSet(obj, prop) {
    var value = obj[prop];
    if (value != null && obj.hasOwnProperty(prop)) // eslint-disable-line eqeqeq, no-prototype-builtins
        return typeof value !== "object" || (Array.isArray(value) ? value.length : Object.keys(value).length) > 0;
    return false;
};

/*
 * Any compatible Buffer instance.
 * This is a minimal stand-alone definition of a Buffer instance. The actual type is that exported by node's typings.
 * @typedef Buffer
 * @type {Uint8Array}
 */

/**
 * Node's Buffer class if available.
 * @type {?function(new: Buffer)}
 */
util.Buffer = (function() {
    try {
        var Buffer = util.inquire("buffer").Buffer;
        // refuse to use non-node buffers if not explicitly assigned (perf reasons):
        return Buffer.prototype.utf8Write ? Buffer : /* istanbul ignore next */ null;
    } catch (e) {
        /* istanbul ignore next */
        return null;
    }
})();

/**
 * Internal alias of or polyfull for Buffer.from.
 * @type {?function}
 * @param {string|number[]} value Value
 * @param {string} [encoding] Encoding if value is a string
 * @returns {Uint8Array}
 * @private
 */
util._Buffer_from = null;

/**
 * Internal alias of or polyfill for Buffer.allocUnsafe.
 * @type {?function}
 * @param {number} size Buffer size
 * @returns {Uint8Array}
 * @private
 */
util._Buffer_allocUnsafe = null;

/**
 * Creates a new buffer of whatever type supported by the environment.
 * @param {number|number[]} [sizeOrArray=0] Buffer size or number array
 * @returns {Uint8Array|Buffer} Buffer
 */
util.newBuffer = function newBuffer(sizeOrArray) {
    /* istanbul ignore next */
    return typeof sizeOrArray === "number"
        ? util.Buffer
            ? util._Buffer_allocUnsafe(sizeOrArray)
            : new util.Array(sizeOrArray)
        : util.Buffer
            ? util._Buffer_from(sizeOrArray)
            : typeof Uint8Array === "undefined"
                ? sizeOrArray
                : new Uint8Array(sizeOrArray);
};

/**
 * Array implementation used in the browser. `Uint8Array` if supported, otherwise `Array`.
 * @type {?function(new: Uint8Array, *)}
 */
util.Array = typeof Uint8Array !== "undefined" ? Uint8Array /* istanbul ignore next */ : Array;

/*
 * Any compatible Long instance.
 * This is a minimal stand-alone definition of a Long instance. The actual type is that exported by long.js.
 * @typedef Long
 * @type {Object}
 * @property {number} low Low bits
 * @property {number} high High bits
 * @property {boolean} unsigned Whether unsigned or not
 */

/**
 * Long.js's Long class if available.
 * @type {?function(new: Long)}
 */
util.Long = /* istanbul ignore next */ global.dcodeIO && /* istanbul ignore next */ global.dcodeIO.Long || util.inquire("long");

/**
 * Regular expression used to verify 2 bit (`bool`) map keys.
 * @type {RegExp}
 * @const
 */
util.key2Re = /^true|false|0|1$/;

/**
 * Regular expression used to verify 32 bit (`int32` etc.) map keys.
 * @type {RegExp}
 * @const
 */
util.key32Re = /^-?(?:0|[1-9][0-9]*)$/;

/**
 * Regular expression used to verify 64 bit (`int64` etc.) map keys.
 * @type {RegExp}
 * @const
 */
util.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/;

/**
 * Converts a number or long to an 8 characters long hash string.
 * @param {Long|number} value Value to convert
 * @returns {string} Hash
 */
util.longToHash = function longToHash(value) {
    return value
        ? util.LongBits.from(value).toHash()
        : util.LongBits.zeroHash;
};

/**
 * Converts an 8 characters long hash string to a long or number.
 * @param {string} hash Hash
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long|number} Original value
 */
util.longFromHash = function longFromHash(hash, unsigned) {
    var bits = util.LongBits.fromHash(hash);
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, unsigned);
    return bits.toNumber(Boolean(unsigned));
};

/**
 * Merges the properties of the source object into the destination object.
 * @memberof util
 * @param {Object.<string,*>} dst Destination object
 * @param {Object.<string,*>} src Source object
 * @param {boolean} [ifNotSet=false] Merges only if the key is not already set
 * @returns {Object.<string,*>} Destination object
 */
function merge(dst, src, ifNotSet) { // used by converters
    for (var keys = Object.keys(src), i = 0; i < keys.length; ++i)
        if (dst[keys[i]] === undefined || !ifNotSet)
            dst[keys[i]] = src[keys[i]];
    return dst;
}

util.merge = merge;

/**
 * Converts the first character of a string to lower case.
 * @param {string} str String to convert
 * @returns {string} Converted string
 */
util.lcFirst = function lcFirst(str) {
    return str.charAt(0).toLowerCase() + str.substring(1);
};

/**
 * Creates a custom error constructor.
 * @memberof util
 * @param {string} name Error name
 * @returns {function} Custom error constructor
 */
function newError(name) {

    function CustomError(message, properties) {

        if (!(this instanceof CustomError))
            return new CustomError(message, properties);

        // Error.call(this, message);
        // ^ just returns a new error instance because the ctor can be called as a function

        Object.defineProperty(this, "message", { get: function() { return message; } });

        /* istanbul ignore next */
        if (Error.captureStackTrace) // node
            Error.captureStackTrace(this, CustomError);
        else
            Object.defineProperty(this, "stack", { value: (new Error()).stack || "" });

        if (properties)
            merge(this, properties);
    }

    (CustomError.prototype = Object.create(Error.prototype)).constructor = CustomError;

    Object.defineProperty(CustomError.prototype, "name", { get: function() { return name; } });

    CustomError.prototype.toString = function toString() {
        return this.name + ": " + this.message;
    };

    return CustomError;
}

util.newError = newError;

/**
 * Constructs a new protocol error.
 * @classdesc Error subclass indicating a protocol specifc error.
 * @memberof util
 * @extends Error
 * @constructor
 * @param {string} message Error message
 * @param {Object.<string,*>=} properties Additional properties
 * @example
 * try {
 *     MyMessage.decode(someBuffer); // throws if required fields are missing
 * } catch (e) {
 *     if (e instanceof ProtocolError && e.instance)
 *         console.log("decoded so far: " + JSON.stringify(e.instance));
 * }
 */
util.ProtocolError = newError("ProtocolError");

/**
 * So far decoded message instance.
 * @name util.ProtocolError#instance
 * @type {Message}
 */

/**
 * Builds a getter for a oneof's present field name.
 * @param {string[]} fieldNames Field names
 * @returns {function():string|undefined} Unbound getter
 */
util.oneOfGetter = function getOneOf(fieldNames) {
    var fieldMap = {};
    for (var i = 0; i < fieldNames.length; ++i)
        fieldMap[fieldNames[i]] = 1;

    /**
     * @returns {string|undefined} Set field name, if any
     * @this Object
     * @ignore
     */
    return function() { // eslint-disable-line consistent-return
        for (var keys = Object.keys(this), i = keys.length - 1; i > -1; --i)
            if (fieldMap[keys[i]] === 1 && this[keys[i]] !== undefined && this[keys[i]] !== null)
                return keys[i];
    };
};

/**
 * Builds a setter for a oneof's present field name.
 * @param {string[]} fieldNames Field names
 * @returns {function(?string):undefined} Unbound setter
 */
util.oneOfSetter = function setOneOf(fieldNames) {

    /**
     * @param {string} name Field name
     * @returns {undefined}
     * @this Object
     * @ignore
     */
    return function(name) {
        for (var i = 0; i < fieldNames.length; ++i)
            if (fieldNames[i] !== name)
                delete this[fieldNames[i]];
    };
};

/* istanbul ignore next */
/**
 * Lazily resolves fully qualified type names against the specified root.
 * @param {Root} root Root instanceof
 * @param {Object.<number,string|ReflectionObject>} lazyTypes Type names
 * @returns {undefined}
 * @deprecated since 6.7.0 static code does not emit lazy types anymore
 */
util.lazyResolve = function lazyResolve(root, lazyTypes) {
    for (var i = 0; i < lazyTypes.length; ++i) {
        for (var keys = Object.keys(lazyTypes[i]), j = 0; j < keys.length; ++j) {
            var path = lazyTypes[i][keys[j]].split("."),
                ptr  = root;
            while (path.length)
                ptr = ptr[path.shift()];
            lazyTypes[i][keys[j]] = ptr;
        }
    }
};

/**
 * Default conversion options used for {@link Message#toJSON} implementations. Longs, enums and bytes are converted to strings by default.
 * @type {ConversionOptions}
 */
util.toJSONOptions = {
    longs: String,
    enums: String,
    bytes: String
};

util._configure = function() {
    var Buffer = util.Buffer;
    /* istanbul ignore if */
    if (!Buffer) {
        util._Buffer_from = util._Buffer_allocUnsafe = null;
        return;
    }
    // because node 4.x buffers are incompatible & immutable
    // see: https://github.com/dcodeIO/protobuf.js/pull/665
    util._Buffer_from = Buffer.from !== Uint8Array.from && Buffer.from ||
        /* istanbul ignore next */
        function Buffer_from(value, encoding) {
            return new Buffer(value, encoding);
        };
    util._Buffer_allocUnsafe = Buffer.allocUnsafe ||
        /* istanbul ignore next */
        function Buffer_allocUnsafe(size) {
            return new Buffer(size);
        };
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./longbits":14,"@protobufjs/aspromise":1,"@protobufjs/base64":2,"@protobufjs/eventemitter":3,"@protobufjs/float":4,"@protobufjs/inquire":5,"@protobufjs/pool":6,"@protobufjs/utf8":7}],16:[function(require,module,exports){
"use strict";
module.exports = Writer;

var util      = require("./util/minimal");

var BufferWriter; // cyclic

var LongBits  = util.LongBits,
    base64    = util.base64,
    utf8      = util.utf8;

/**
 * Constructs a new writer operation instance.
 * @classdesc Scheduled writer operation.
 * @constructor
 * @param {function(*, Uint8Array, number)} fn Function to call
 * @param {number} len Value byte length
 * @param {*} val Value to write
 * @ignore
 */
function Op(fn, len, val) {

    /**
     * Function to call.
     * @type {function(Uint8Array, number, *)}
     */
    this.fn = fn;

    /**
     * Value byte length.
     * @type {number}
     */
    this.len = len;

    /**
     * Next operation.
     * @type {Writer.Op|undefined}
     */
    this.next = undefined;

    /**
     * Value to write.
     * @type {*}
     */
    this.val = val; // type varies
}

/* istanbul ignore next */
function noop() {} // eslint-disable-line no-empty-function

/**
 * Constructs a new writer state instance.
 * @classdesc Copied writer state.
 * @memberof Writer
 * @constructor
 * @param {Writer} writer Writer to copy state from
 * @private
 * @ignore
 */
function State(writer) {

    /**
     * Current head.
     * @type {Writer.Op}
     */
    this.head = writer.head;

    /**
     * Current tail.
     * @type {Writer.Op}
     */
    this.tail = writer.tail;

    /**
     * Current buffer length.
     * @type {number}
     */
    this.len = writer.len;

    /**
     * Next state.
     * @type {?State}
     */
    this.next = writer.states;
}

/**
 * Constructs a new writer instance.
 * @classdesc Wire format writer using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 */
function Writer() {

    /**
     * Current length.
     * @type {number}
     */
    this.len = 0;

    /**
     * Operations head.
     * @type {Object}
     */
    this.head = new Op(noop, 0, 0);

    /**
     * Operations tail
     * @type {Object}
     */
    this.tail = this.head;

    /**
     * Linked forked states.
     * @type {?Object}
     */
    this.states = null;

    // When a value is written, the writer calculates its byte length and puts it into a linked
    // list of operations to perform when finish() is called. This both allows us to allocate
    // buffers of the exact required size and reduces the amount of work we have to do compared
    // to first calculating over objects and then encoding over objects. In our case, the encoding
    // part is just a linked list walk calling operations with already prepared values.
}

/**
 * Creates a new writer.
 * @function
 * @returns {BufferWriter|Writer} A {@link BufferWriter} when Buffers are supported, otherwise a {@link Writer}
 */
Writer.create = util.Buffer
    ? function create_buffer_setup() {
        return (Writer.create = function create_buffer() {
            return new BufferWriter();
        })();
    }
    /* istanbul ignore next */
    : function create_array() {
        return new Writer();
    };

/**
 * Allocates a buffer of the specified size.
 * @param {number} size Buffer size
 * @returns {Uint8Array} Buffer
 */
Writer.alloc = function alloc(size) {
    return new util.Array(size);
};

// Use Uint8Array buffer pool in the browser, just like node does with buffers
/* istanbul ignore else */
if (util.Array !== Array)
    Writer.alloc = util.pool(Writer.alloc, util.Array.prototype.subarray);

/**
 * Pushes a new operation to the queue.
 * @param {function(Uint8Array, number, *)} fn Function to call
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.push = function push(fn, len, val) {
    this.tail = this.tail.next = new Op(fn, len, val);
    this.len += len;
    return this;
};

function writeByte(val, buf, pos) {
    buf[pos] = val & 255;
}

function writeVarint32(val, buf, pos) {
    while (val > 127) {
        buf[pos++] = val & 127 | 128;
        val >>>= 7;
    }
    buf[pos] = val;
}

/**
 * Constructs a new varint writer operation instance.
 * @classdesc Scheduled varint writer operation.
 * @extends Op
 * @constructor
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @ignore
 */
function VarintOp(len, val) {
    this.len = len;
    this.next = undefined;
    this.val = val;
}

VarintOp.prototype = Object.create(Op.prototype);
VarintOp.prototype.fn = writeVarint32;

/**
 * Writes an unsigned 32 bit value as a varint.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.uint32 = function write_uint32(value) {
    // here, the call to this.push has been inlined and a varint specific Op subclass is used.
    // uint32 is by far the most frequently used operation and benefits significantly from this.
    this.len += (this.tail = this.tail.next = new VarintOp(
        (value = value >>> 0)
                < 128       ? 1
        : value < 16384     ? 2
        : value < 2097152   ? 3
        : value < 268435456 ? 4
        :                     5,
    value)).len;
    return this;
};

/**
 * Writes a signed 32 bit value as a varint.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.int32 = function write_int32(value) {
    return value < 0
        ? this.push(writeVarint64, 10, LongBits.fromNumber(value)) // 10 bytes per spec
        : this.uint32(value);
};

/**
 * Writes a 32 bit value as a varint, zig-zag encoded.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.sint32 = function write_sint32(value) {
    return this.uint32((value << 1 ^ value >> 31) >>> 0);
};

function writeVarint64(val, buf, pos) {
    while (val.hi) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = (val.lo >>> 7 | val.hi << 25) >>> 0;
        val.hi >>>= 7;
    }
    while (val.lo > 127) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = val.lo >>> 7;
    }
    buf[pos++] = val.lo;
}

/**
 * Writes an unsigned 64 bit value as a varint.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.uint64 = function write_uint64(value) {
    var bits = LongBits.from(value);
    return this.push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a signed 64 bit value as a varint.
 * @function
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.int64 = Writer.prototype.uint64;

/**
 * Writes a signed 64 bit value as a varint, zig-zag encoded.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.sint64 = function write_sint64(value) {
    var bits = LongBits.from(value).zzEncode();
    return this.push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a boolish value as a varint.
 * @param {boolean} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.bool = function write_bool(value) {
    return this.push(writeByte, 1, value ? 1 : 0);
};

function writeFixed32(val, buf, pos) {
    buf[pos    ] =  val         & 255;
    buf[pos + 1] =  val >>> 8   & 255;
    buf[pos + 2] =  val >>> 16  & 255;
    buf[pos + 3] =  val >>> 24;
}

/**
 * Writes an unsigned 32 bit value as fixed 32 bits.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.fixed32 = function write_fixed32(value) {
    return this.push(writeFixed32, 4, value >>> 0);
};

/**
 * Writes a signed 32 bit value as fixed 32 bits.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.sfixed32 = Writer.prototype.fixed32;

/**
 * Writes an unsigned 64 bit value as fixed 64 bits.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.fixed64 = function write_fixed64(value) {
    var bits = LongBits.from(value);
    return this.push(writeFixed32, 4, bits.lo).push(writeFixed32, 4, bits.hi);
};

/**
 * Writes a signed 64 bit value as fixed 64 bits.
 * @function
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.sfixed64 = Writer.prototype.fixed64;

/**
 * Writes a float (32 bit).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.float = function write_float(value) {
    return this.push(util.float.writeFloatLE, 4, value);
};

/**
 * Writes a double (64 bit float).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.double = function write_double(value) {
    return this.push(util.float.writeDoubleLE, 8, value);
};

var writeBytes = util.Array.prototype.set
    ? function writeBytes_set(val, buf, pos) {
        buf.set(val, pos); // also works for plain array values
    }
    /* istanbul ignore next */
    : function writeBytes_for(val, buf, pos) {
        for (var i = 0; i < val.length; ++i)
            buf[pos + i] = val[i];
    };

/**
 * Writes a sequence of bytes.
 * @param {Uint8Array|string} value Buffer or base64 encoded string to write
 * @returns {Writer} `this`
 */
Writer.prototype.bytes = function write_bytes(value) {
    var len = value.length >>> 0;
    if (!len)
        return this.push(writeByte, 1, 0);
    if (util.isString(value)) {
        var buf = Writer.alloc(len = base64.length(value));
        base64.decode(value, buf, 0);
        value = buf;
    }
    return this.uint32(len).push(writeBytes, len, value);
};

/**
 * Writes a string.
 * @param {string} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.string = function write_string(value) {
    var len = utf8.length(value);
    return len
        ? this.uint32(len).push(utf8.write, len, value)
        : this.push(writeByte, 1, 0);
};

/**
 * Forks this writer's state by pushing it to a stack.
 * Calling {@link Writer#reset|reset} or {@link Writer#ldelim|ldelim} resets the writer to the previous state.
 * @returns {Writer} `this`
 */
Writer.prototype.fork = function fork() {
    this.states = new State(this);
    this.head = this.tail = new Op(noop, 0, 0);
    this.len = 0;
    return this;
};

/**
 * Resets this instance to the last state.
 * @returns {Writer} `this`
 */
Writer.prototype.reset = function reset() {
    if (this.states) {
        this.head   = this.states.head;
        this.tail   = this.states.tail;
        this.len    = this.states.len;
        this.states = this.states.next;
    } else {
        this.head = this.tail = new Op(noop, 0, 0);
        this.len  = 0;
    }
    return this;
};

/**
 * Resets to the last state and appends the fork state's current write length as a varint followed by its operations.
 * @returns {Writer} `this`
 */
Writer.prototype.ldelim = function ldelim() {
    var head = this.head,
        tail = this.tail,
        len  = this.len;
    this.reset().uint32(len);
    if (len) {
        this.tail.next = head.next; // skip noop
        this.tail = tail;
        this.len += len;
    }
    return this;
};

/**
 * Finishes the write operation.
 * @returns {Uint8Array} Finished buffer
 */
Writer.prototype.finish = function finish() {
    var head = this.head.next, // skip noop
        buf  = this.constructor.alloc(this.len),
        pos  = 0;
    while (head) {
        head.fn(head.val, buf, pos);
        pos += head.len;
        head = head.next;
    }
    // this.head = this.tail = null;
    return buf;
};

Writer._configure = function(BufferWriter_) {
    BufferWriter = BufferWriter_;
};

},{"./util/minimal":15}],17:[function(require,module,exports){
"use strict";
module.exports = BufferWriter;

// extends Writer
var Writer = require("./writer");
(BufferWriter.prototype = Object.create(Writer.prototype)).constructor = BufferWriter;

var util = require("./util/minimal");

var Buffer = util.Buffer;

/**
 * Constructs a new buffer writer instance.
 * @classdesc Wire format writer using node buffers.
 * @extends Writer
 * @constructor
 */
function BufferWriter() {
    Writer.call(this);
}

/**
 * Allocates a buffer of the specified size.
 * @param {number} size Buffer size
 * @returns {Buffer} Buffer
 */
BufferWriter.alloc = function alloc_buffer(size) {
    return (BufferWriter.alloc = util._Buffer_allocUnsafe)(size);
};

var writeBytesBuffer = Buffer && Buffer.prototype instanceof Uint8Array && Buffer.prototype.set.name === "set"
    ? function writeBytesBuffer_set(val, buf, pos) {
        buf.set(val, pos); // faster than copy (requires node >= 4 where Buffers extend Uint8Array and set is properly inherited)
                           // also works for plain array values
    }
    /* istanbul ignore next */
    : function writeBytesBuffer_copy(val, buf, pos) {
        if (val.copy) // Buffer values
            val.copy(buf, pos, 0, val.length);
        else for (var i = 0; i < val.length;) // plain array values
            buf[pos++] = val[i++];
    };

/**
 * @override
 */
BufferWriter.prototype.bytes = function write_bytes_buffer(value) {
    if (util.isString(value))
        value = util._Buffer_from(value, "base64");
    var len = value.length >>> 0;
    this.uint32(len);
    if (len)
        this.push(writeBytesBuffer, len, value);
    return this;
};

function writeStringBuffer(val, buf, pos) {
    if (val.length < 40) // plain js is faster for short strings (probably due to redundant assertions)
        util.utf8.write(val, buf, pos);
    else
        buf.utf8Write(val, pos);
}

/**
 * @override
 */
BufferWriter.prototype.string = function write_string_buffer(value) {
    var len = Buffer.byteLength(value);
    this.uint32(len);
    if (len)
        this.push(writeStringBuffer, len, value);
    return this;
};


/**
 * Finishes the write operation.
 * @name BufferWriter#finish
 * @function
 * @returns {Buffer} Finished buffer
 */

},{"./util/minimal":15,"./writer":16}],18:[function(require,module,exports){
/*eslint-disable block-scoped-var, no-redeclare, no-control-regex, no-prototype-builtins*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.webrealms = (function() {

    /**
     * Namespace webrealms.
     * @exports webrealms
     * @namespace
     */
    var webrealms = {};

    webrealms.ProtocolMessage = (function() {

        /**
         * Properties of a ProtocolMessage.
         * @typedef webrealms.ProtocolMessage$Properties
         * @type {Object}
         * @property {webrealms.ProtocolMessage.MessageType} [Type] ProtocolMessage Type.
         * @property {webrealms.ProtocolMessage.PingMessage$Properties} [Ping] ProtocolMessage Ping.
         * @property {webrealms.ProtocolMessage.PongMessage$Properties} [Pong] ProtocolMessage Pong.
         * @property {webrealms.ProtocolMessage.HelloMessage$Properties} [Hello] ProtocolMessage Hello.
         * @property {webrealms.ProtocolMessage.ByeMessage$Properties} [Bye] ProtocolMessage Bye.
         * @property {webrealms.ProtocolMessage.PositionMessage$Properties} [Position] ProtocolMessage Position.
         * @property {webrealms.ProtocolMessage.RotationMessage$Properties} [Rotation] ProtocolMessage Rotation.
         */

        /**
         * Constructs a new ProtocolMessage.
         * @exports webrealms.ProtocolMessage
         * @constructor
         * @param {webrealms.ProtocolMessage$Properties=} [properties] Properties to set
         */
        function ProtocolMessage(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProtocolMessage Type.
         * @type {webrealms.ProtocolMessage.MessageType}
         */
        ProtocolMessage.prototype.Type = 0;

        /**
         * ProtocolMessage Ping.
         * @type {(webrealms.ProtocolMessage.PingMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Ping = null;

        /**
         * ProtocolMessage Pong.
         * @type {(webrealms.ProtocolMessage.PongMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Pong = null;

        /**
         * ProtocolMessage Hello.
         * @type {(webrealms.ProtocolMessage.HelloMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Hello = null;

        /**
         * ProtocolMessage Bye.
         * @type {(webrealms.ProtocolMessage.ByeMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Bye = null;

        /**
         * ProtocolMessage Position.
         * @type {(webrealms.ProtocolMessage.PositionMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Position = null;

        /**
         * ProtocolMessage Rotation.
         * @type {(webrealms.ProtocolMessage.RotationMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Rotation = null;

        /**
         * Creates a new ProtocolMessage instance using the specified properties.
         * @param {webrealms.ProtocolMessage$Properties=} [properties] Properties to set
         * @returns {webrealms.ProtocolMessage} ProtocolMessage instance
         */
        ProtocolMessage.create = function create(properties) {
            return new ProtocolMessage(properties);
        };

        /**
         * Encodes the specified ProtocolMessage message. Does not implicitly {@link webrealms.ProtocolMessage.verify|verify} messages.
         * @param {webrealms.ProtocolMessage$Properties} message ProtocolMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProtocolMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.Type != null && message.hasOwnProperty("Type"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.Type);
            if (message.Ping != null && message.hasOwnProperty("Ping"))
                $root.webrealms.ProtocolMessage.PingMessage.encode(message.Ping, writer.uint32(/* id 16, wireType 2 =*/130).fork()).ldelim();
            if (message.Pong != null && message.hasOwnProperty("Pong"))
                $root.webrealms.ProtocolMessage.PongMessage.encode(message.Pong, writer.uint32(/* id 17, wireType 2 =*/138).fork()).ldelim();
            if (message.Hello != null && message.hasOwnProperty("Hello"))
                $root.webrealms.ProtocolMessage.HelloMessage.encode(message.Hello, writer.uint32(/* id 18, wireType 2 =*/146).fork()).ldelim();
            if (message.Bye != null && message.hasOwnProperty("Bye"))
                $root.webrealms.ProtocolMessage.ByeMessage.encode(message.Bye, writer.uint32(/* id 19, wireType 2 =*/154).fork()).ldelim();
            if (message.Position != null && message.hasOwnProperty("Position"))
                $root.webrealms.ProtocolMessage.PositionMessage.encode(message.Position, writer.uint32(/* id 20, wireType 2 =*/162).fork()).ldelim();
            if (message.Rotation != null && message.hasOwnProperty("Rotation"))
                $root.webrealms.ProtocolMessage.RotationMessage.encode(message.Rotation, writer.uint32(/* id 21, wireType 2 =*/170).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ProtocolMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.verify|verify} messages.
         * @param {webrealms.ProtocolMessage$Properties} message ProtocolMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProtocolMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ProtocolMessage message from the specified reader or buffer.
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {webrealms.ProtocolMessage} ProtocolMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProtocolMessage.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.Type = reader.uint32();
                    break;
                case 16:
                    message.Ping = $root.webrealms.ProtocolMessage.PingMessage.decode(reader, reader.uint32());
                    break;
                case 17:
                    message.Pong = $root.webrealms.ProtocolMessage.PongMessage.decode(reader, reader.uint32());
                    break;
                case 18:
                    message.Hello = $root.webrealms.ProtocolMessage.HelloMessage.decode(reader, reader.uint32());
                    break;
                case 19:
                    message.Bye = $root.webrealms.ProtocolMessage.ByeMessage.decode(reader, reader.uint32());
                    break;
                case 20:
                    message.Position = $root.webrealms.ProtocolMessage.PositionMessage.decode(reader, reader.uint32());
                    break;
                case 21:
                    message.Rotation = $root.webrealms.ProtocolMessage.RotationMessage.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ProtocolMessage message from the specified reader or buffer, length delimited.
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {webrealms.ProtocolMessage} ProtocolMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProtocolMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProtocolMessage message.
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {?string} `null` if valid, otherwise the reason why it is not
         */
        ProtocolMessage.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.Type != null && message.hasOwnProperty("Type"))
                switch (message.Type) {
                default:
                    return "Type: enum value expected";
                case 0:
                case 16:
                case 17:
                case 18:
                case 19:
                case 21:
                    break;
                }
            if (message.Ping != null && message.hasOwnProperty("Ping")) {
                var error = $root.webrealms.ProtocolMessage.PingMessage.verify(message.Ping);
                if (error)
                    return "Ping." + error;
            }
            if (message.Pong != null && message.hasOwnProperty("Pong")) {
                var error = $root.webrealms.ProtocolMessage.PongMessage.verify(message.Pong);
                if (error)
                    return "Pong." + error;
            }
            if (message.Hello != null && message.hasOwnProperty("Hello")) {
                var error = $root.webrealms.ProtocolMessage.HelloMessage.verify(message.Hello);
                if (error)
                    return "Hello." + error;
            }
            if (message.Bye != null && message.hasOwnProperty("Bye")) {
                var error = $root.webrealms.ProtocolMessage.ByeMessage.verify(message.Bye);
                if (error)
                    return "Bye." + error;
            }
            if (message.Position != null && message.hasOwnProperty("Position")) {
                var error = $root.webrealms.ProtocolMessage.PositionMessage.verify(message.Position);
                if (error)
                    return "Position." + error;
            }
            if (message.Rotation != null && message.hasOwnProperty("Rotation")) {
                var error = $root.webrealms.ProtocolMessage.RotationMessage.verify(message.Rotation);
                if (error)
                    return "Rotation." + error;
            }
            return null;
        };

        /**
         * Creates a ProtocolMessage message from a plain object. Also converts values to their respective internal types.
         * @param {Object.<string,*>} object Plain object
         * @returns {webrealms.ProtocolMessage} ProtocolMessage
         */
        ProtocolMessage.fromObject = function fromObject(object) {
            if (object instanceof $root.webrealms.ProtocolMessage)
                return object;
            var message = new $root.webrealms.ProtocolMessage();
            switch (object.Type) {
            case "NONE":
            case 0:
                message.Type = 0;
                break;
            case "PING":
            case 16:
                message.Type = 16;
                break;
            case "PONG":
            case 17:
                message.Type = 17;
                break;
            case "HELLO":
            case 18:
                message.Type = 18;
                break;
            case "BYE":
            case 19:
                message.Type = 19;
                break;
            case "POSITION_ROTATION":
            case 21:
                message.Type = 21;
                break;
            }
            if (object.Ping != null) {
                if (typeof object.Ping !== "object")
                    throw TypeError(".webrealms.ProtocolMessage.Ping: object expected");
                message.Ping = $root.webrealms.ProtocolMessage.PingMessage.fromObject(object.Ping);
            }
            if (object.Pong != null) {
                if (typeof object.Pong !== "object")
                    throw TypeError(".webrealms.ProtocolMessage.Pong: object expected");
                message.Pong = $root.webrealms.ProtocolMessage.PongMessage.fromObject(object.Pong);
            }
            if (object.Hello != null) {
                if (typeof object.Hello !== "object")
                    throw TypeError(".webrealms.ProtocolMessage.Hello: object expected");
                message.Hello = $root.webrealms.ProtocolMessage.HelloMessage.fromObject(object.Hello);
            }
            if (object.Bye != null) {
                if (typeof object.Bye !== "object")
                    throw TypeError(".webrealms.ProtocolMessage.Bye: object expected");
                message.Bye = $root.webrealms.ProtocolMessage.ByeMessage.fromObject(object.Bye);
            }
            if (object.Position != null) {
                if (typeof object.Position !== "object")
                    throw TypeError(".webrealms.ProtocolMessage.Position: object expected");
                message.Position = $root.webrealms.ProtocolMessage.PositionMessage.fromObject(object.Position);
            }
            if (object.Rotation != null) {
                if (typeof object.Rotation !== "object")
                    throw TypeError(".webrealms.ProtocolMessage.Rotation: object expected");
                message.Rotation = $root.webrealms.ProtocolMessage.RotationMessage.fromObject(object.Rotation);
            }
            return message;
        };

        /**
         * Creates a ProtocolMessage message from a plain object. Also converts values to their respective internal types.
         * This is an alias of {@link webrealms.ProtocolMessage.fromObject}.
         * @function
         * @param {Object.<string,*>} object Plain object
         * @returns {webrealms.ProtocolMessage} ProtocolMessage
         */
        ProtocolMessage.from = ProtocolMessage.fromObject;

        /**
         * Creates a plain object from a ProtocolMessage message. Also converts values to other types if specified.
         * @param {webrealms.ProtocolMessage} message ProtocolMessage
         * @param {$protobuf.ConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProtocolMessage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.Type = options.enums === String ? "NONE" : 0;
                object.Ping = null;
                object.Pong = null;
                object.Hello = null;
                object.Bye = null;
                object.Position = null;
                object.Rotation = null;
            }
            if (message.Type != null && message.hasOwnProperty("Type"))
                object.Type = options.enums === String ? $root.webrealms.ProtocolMessage.MessageType[message.Type] : message.Type;
            if (message.Ping != null && message.hasOwnProperty("Ping"))
                object.Ping = $root.webrealms.ProtocolMessage.PingMessage.toObject(message.Ping, options);
            if (message.Pong != null && message.hasOwnProperty("Pong"))
                object.Pong = $root.webrealms.ProtocolMessage.PongMessage.toObject(message.Pong, options);
            if (message.Hello != null && message.hasOwnProperty("Hello"))
                object.Hello = $root.webrealms.ProtocolMessage.HelloMessage.toObject(message.Hello, options);
            if (message.Bye != null && message.hasOwnProperty("Bye"))
                object.Bye = $root.webrealms.ProtocolMessage.ByeMessage.toObject(message.Bye, options);
            if (message.Position != null && message.hasOwnProperty("Position"))
                object.Position = $root.webrealms.ProtocolMessage.PositionMessage.toObject(message.Position, options);
            if (message.Rotation != null && message.hasOwnProperty("Rotation"))
                object.Rotation = $root.webrealms.ProtocolMessage.RotationMessage.toObject(message.Rotation, options);
            return object;
        };

        /**
         * Creates a plain object from this ProtocolMessage message. Also converts values to other types if specified.
         * @param {$protobuf.ConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProtocolMessage.prototype.toObject = function toObject(options) {
            return this.constructor.toObject(this, options);
        };

        /**
         * Converts this ProtocolMessage to JSON.
         * @returns {Object.<string,*>} JSON object
         */
        ProtocolMessage.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * MessageType enum.
         * @name MessageType
         * @memberof webrealms.ProtocolMessage
         * @enum {number}
         * @property {number} NONE=0 NONE value
         * @property {number} PING=16 PING value
         * @property {number} PONG=17 PONG value
         * @property {number} HELLO=18 HELLO value
         * @property {number} BYE=19 BYE value
         * @property {number} POSITION_ROTATION=21 POSITION_ROTATION value
         */
        ProtocolMessage.MessageType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "NONE"] = 0;
            values[valuesById[16] = "PING"] = 16;
            values[valuesById[17] = "PONG"] = 17;
            values[valuesById[18] = "HELLO"] = 18;
            values[valuesById[19] = "BYE"] = 19;
            values[valuesById[21] = "POSITION_ROTATION"] = 21;
            return values;
        })();

        ProtocolMessage.PingMessage = (function() {

            /**
             * Properties of a PingMessage.
             * @typedef webrealms.ProtocolMessage.PingMessage$Properties
             * @type {Object}
             */

            /**
             * Constructs a new PingMessage.
             * @exports webrealms.ProtocolMessage.PingMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.PingMessage$Properties=} [properties] Properties to set
             */
            function PingMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new PingMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.PingMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.PingMessage} PingMessage instance
             */
            PingMessage.create = function create(properties) {
                return new PingMessage(properties);
            };

            /**
             * Encodes the specified PingMessage message. Does not implicitly {@link webrealms.ProtocolMessage.PingMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PingMessage$Properties} message PingMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PingMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified PingMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.PingMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PingMessage$Properties} message PingMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PingMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a PingMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.PingMessage} PingMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PingMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage.PingMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a PingMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.PingMessage} PingMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PingMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a PingMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            PingMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                return null;
            };

            /**
             * Creates a PingMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PingMessage} PingMessage
             */
            PingMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.webrealms.ProtocolMessage.PingMessage)
                    return object;
                return new $root.webrealms.ProtocolMessage.PingMessage();
            };

            /**
             * Creates a PingMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.PingMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PingMessage} PingMessage
             */
            PingMessage.from = PingMessage.fromObject;

            /**
             * Creates a plain object from a PingMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.PingMessage} message PingMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PingMessage.toObject = function toObject() {
                return {};
            };

            /**
             * Creates a plain object from this PingMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PingMessage.prototype.toObject = function toObject(options) {
                return this.constructor.toObject(this, options);
            };

            /**
             * Converts this PingMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            PingMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return PingMessage;
        })();

        ProtocolMessage.PongMessage = (function() {

            /**
             * Properties of a PongMessage.
             * @typedef webrealms.ProtocolMessage.PongMessage$Properties
             * @type {Object}
             */

            /**
             * Constructs a new PongMessage.
             * @exports webrealms.ProtocolMessage.PongMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.PongMessage$Properties=} [properties] Properties to set
             */
            function PongMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new PongMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.PongMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.PongMessage} PongMessage instance
             */
            PongMessage.create = function create(properties) {
                return new PongMessage(properties);
            };

            /**
             * Encodes the specified PongMessage message. Does not implicitly {@link webrealms.ProtocolMessage.PongMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PongMessage$Properties} message PongMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PongMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified PongMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.PongMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PongMessage$Properties} message PongMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PongMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a PongMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.PongMessage} PongMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PongMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage.PongMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a PongMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.PongMessage} PongMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PongMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a PongMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            PongMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                return null;
            };

            /**
             * Creates a PongMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PongMessage} PongMessage
             */
            PongMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.webrealms.ProtocolMessage.PongMessage)
                    return object;
                return new $root.webrealms.ProtocolMessage.PongMessage();
            };

            /**
             * Creates a PongMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.PongMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PongMessage} PongMessage
             */
            PongMessage.from = PongMessage.fromObject;

            /**
             * Creates a plain object from a PongMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.PongMessage} message PongMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PongMessage.toObject = function toObject() {
                return {};
            };

            /**
             * Creates a plain object from this PongMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PongMessage.prototype.toObject = function toObject(options) {
                return this.constructor.toObject(this, options);
            };

            /**
             * Converts this PongMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            PongMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return PongMessage;
        })();

        ProtocolMessage.HelloMessage = (function() {

            /**
             * Properties of a HelloMessage.
             * @typedef webrealms.ProtocolMessage.HelloMessage$Properties
             * @type {Object}
             * @property {Uint8Array} [Id] HelloMessage Id.
             * @property {string} [Name] HelloMessage Name.
             */

            /**
             * Constructs a new HelloMessage.
             * @exports webrealms.ProtocolMessage.HelloMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.HelloMessage$Properties=} [properties] Properties to set
             */
            function HelloMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * HelloMessage Id.
             * @type {Uint8Array}
             */
            HelloMessage.prototype.Id = $util.newBuffer([]);

            /**
             * HelloMessage Name.
             * @type {string}
             */
            HelloMessage.prototype.Name = "";

            /**
             * Creates a new HelloMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.HelloMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.HelloMessage} HelloMessage instance
             */
            HelloMessage.create = function create(properties) {
                return new HelloMessage(properties);
            };

            /**
             * Encodes the specified HelloMessage message. Does not implicitly {@link webrealms.ProtocolMessage.HelloMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.HelloMessage$Properties} message HelloMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HelloMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.Id != null && message.hasOwnProperty("Id"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.Id);
                if (message.Name != null && message.hasOwnProperty("Name"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.Name);
                return writer;
            };

            /**
             * Encodes the specified HelloMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.HelloMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.HelloMessage$Properties} message HelloMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HelloMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a HelloMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.HelloMessage} HelloMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HelloMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage.HelloMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.Id = reader.bytes();
                        break;
                    case 2:
                        message.Name = reader.string();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a HelloMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.HelloMessage} HelloMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HelloMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a HelloMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            HelloMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.Id != null && message.hasOwnProperty("Id"))
                    if (!(message.Id && typeof message.Id.length === "number" || $util.isString(message.Id)))
                        return "Id: buffer expected";
                if (message.Name != null && message.hasOwnProperty("Name"))
                    if (!$util.isString(message.Name))
                        return "Name: string expected";
                return null;
            };

            /**
             * Creates a HelloMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.HelloMessage} HelloMessage
             */
            HelloMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.webrealms.ProtocolMessage.HelloMessage)
                    return object;
                var message = new $root.webrealms.ProtocolMessage.HelloMessage();
                if (object.Id != null)
                    if (typeof object.Id === "string")
                        $util.base64.decode(object.Id, message.Id = $util.newBuffer($util.base64.length(object.Id)), 0);
                    else if (object.Id.length)
                        message.Id = object.Id;
                if (object.Name != null)
                    message.Name = String(object.Name);
                return message;
            };

            /**
             * Creates a HelloMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.HelloMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.HelloMessage} HelloMessage
             */
            HelloMessage.from = HelloMessage.fromObject;

            /**
             * Creates a plain object from a HelloMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.HelloMessage} message HelloMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            HelloMessage.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.Id = options.bytes === String ? "" : [];
                    object.Name = "";
                }
                if (message.Id != null && message.hasOwnProperty("Id"))
                    object.Id = options.bytes === String ? $util.base64.encode(message.Id, 0, message.Id.length) : options.bytes === Array ? Array.prototype.slice.call(message.Id) : message.Id;
                if (message.Name != null && message.hasOwnProperty("Name"))
                    object.Name = message.Name;
                return object;
            };

            /**
             * Creates a plain object from this HelloMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            HelloMessage.prototype.toObject = function toObject(options) {
                return this.constructor.toObject(this, options);
            };

            /**
             * Converts this HelloMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            HelloMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return HelloMessage;
        })();

        ProtocolMessage.ByeMessage = (function() {

            /**
             * Properties of a ByeMessage.
             * @typedef webrealms.ProtocolMessage.ByeMessage$Properties
             * @type {Object}
             */

            /**
             * Constructs a new ByeMessage.
             * @exports webrealms.ProtocolMessage.ByeMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.ByeMessage$Properties=} [properties] Properties to set
             */
            function ByeMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new ByeMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.ByeMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.ByeMessage} ByeMessage instance
             */
            ByeMessage.create = function create(properties) {
                return new ByeMessage(properties);
            };

            /**
             * Encodes the specified ByeMessage message. Does not implicitly {@link webrealms.ProtocolMessage.ByeMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.ByeMessage$Properties} message ByeMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ByeMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified ByeMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.ByeMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.ByeMessage$Properties} message ByeMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ByeMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ByeMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.ByeMessage} ByeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ByeMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage.ByeMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ByeMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.ByeMessage} ByeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ByeMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ByeMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            ByeMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                return null;
            };

            /**
             * Creates a ByeMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.ByeMessage} ByeMessage
             */
            ByeMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.webrealms.ProtocolMessage.ByeMessage)
                    return object;
                return new $root.webrealms.ProtocolMessage.ByeMessage();
            };

            /**
             * Creates a ByeMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.ByeMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.ByeMessage} ByeMessage
             */
            ByeMessage.from = ByeMessage.fromObject;

            /**
             * Creates a plain object from a ByeMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.ByeMessage} message ByeMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ByeMessage.toObject = function toObject() {
                return {};
            };

            /**
             * Creates a plain object from this ByeMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ByeMessage.prototype.toObject = function toObject(options) {
                return this.constructor.toObject(this, options);
            };

            /**
             * Converts this ByeMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            ByeMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return ByeMessage;
        })();

        ProtocolMessage.PositionMessage = (function() {

            /**
             * Properties of a PositionMessage.
             * @typedef webrealms.ProtocolMessage.PositionMessage$Properties
             * @type {Object}
             * @property {number} [X] PositionMessage X.
             * @property {number} [Y] PositionMessage Y.
             * @property {number} [Z] PositionMessage Z.
             */

            /**
             * Constructs a new PositionMessage.
             * @exports webrealms.ProtocolMessage.PositionMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.PositionMessage$Properties=} [properties] Properties to set
             */
            function PositionMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * PositionMessage X.
             * @type {number}
             */
            PositionMessage.prototype.X = 0;

            /**
             * PositionMessage Y.
             * @type {number}
             */
            PositionMessage.prototype.Y = 0;

            /**
             * PositionMessage Z.
             * @type {number}
             */
            PositionMessage.prototype.Z = 0;

            /**
             * Creates a new PositionMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.PositionMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.PositionMessage} PositionMessage instance
             */
            PositionMessage.create = function create(properties) {
                return new PositionMessage(properties);
            };

            /**
             * Encodes the specified PositionMessage message. Does not implicitly {@link webrealms.ProtocolMessage.PositionMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PositionMessage$Properties} message PositionMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PositionMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.X != null && message.hasOwnProperty("X"))
                    writer.uint32(/* id 1, wireType 5 =*/13).float(message.X);
                if (message.Y != null && message.hasOwnProperty("Y"))
                    writer.uint32(/* id 2, wireType 5 =*/21).float(message.Y);
                if (message.Z != null && message.hasOwnProperty("Z"))
                    writer.uint32(/* id 3, wireType 5 =*/29).float(message.Z);
                return writer;
            };

            /**
             * Encodes the specified PositionMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.PositionMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PositionMessage$Properties} message PositionMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PositionMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a PositionMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.PositionMessage} PositionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PositionMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage.PositionMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.X = reader.float();
                        break;
                    case 2:
                        message.Y = reader.float();
                        break;
                    case 3:
                        message.Z = reader.float();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a PositionMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.PositionMessage} PositionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PositionMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a PositionMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            PositionMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.X != null && message.hasOwnProperty("X"))
                    if (typeof message.X !== "number")
                        return "X: number expected";
                if (message.Y != null && message.hasOwnProperty("Y"))
                    if (typeof message.Y !== "number")
                        return "Y: number expected";
                if (message.Z != null && message.hasOwnProperty("Z"))
                    if (typeof message.Z !== "number")
                        return "Z: number expected";
                return null;
            };

            /**
             * Creates a PositionMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PositionMessage} PositionMessage
             */
            PositionMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.webrealms.ProtocolMessage.PositionMessage)
                    return object;
                var message = new $root.webrealms.ProtocolMessage.PositionMessage();
                if (object.X != null)
                    message.X = Number(object.X);
                if (object.Y != null)
                    message.Y = Number(object.Y);
                if (object.Z != null)
                    message.Z = Number(object.Z);
                return message;
            };

            /**
             * Creates a PositionMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.PositionMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PositionMessage} PositionMessage
             */
            PositionMessage.from = PositionMessage.fromObject;

            /**
             * Creates a plain object from a PositionMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.PositionMessage} message PositionMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PositionMessage.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.X = 0;
                    object.Y = 0;
                    object.Z = 0;
                }
                if (message.X != null && message.hasOwnProperty("X"))
                    object.X = message.X;
                if (message.Y != null && message.hasOwnProperty("Y"))
                    object.Y = message.Y;
                if (message.Z != null && message.hasOwnProperty("Z"))
                    object.Z = message.Z;
                return object;
            };

            /**
             * Creates a plain object from this PositionMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PositionMessage.prototype.toObject = function toObject(options) {
                return this.constructor.toObject(this, options);
            };

            /**
             * Converts this PositionMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            PositionMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return PositionMessage;
        })();

        ProtocolMessage.RotationMessage = (function() {

            /**
             * Properties of a RotationMessage.
             * @typedef webrealms.ProtocolMessage.RotationMessage$Properties
             * @type {Object}
             * @property {number} [X] RotationMessage X.
             * @property {number} [Y] RotationMessage Y.
             * @property {number} [Z] RotationMessage Z.
             * @property {number} [W] RotationMessage W.
             */

            /**
             * Constructs a new RotationMessage.
             * @exports webrealms.ProtocolMessage.RotationMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.RotationMessage$Properties=} [properties] Properties to set
             */
            function RotationMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * RotationMessage X.
             * @type {number}
             */
            RotationMessage.prototype.X = 0;

            /**
             * RotationMessage Y.
             * @type {number}
             */
            RotationMessage.prototype.Y = 0;

            /**
             * RotationMessage Z.
             * @type {number}
             */
            RotationMessage.prototype.Z = 0;

            /**
             * RotationMessage W.
             * @type {number}
             */
            RotationMessage.prototype.W = 0;

            /**
             * Creates a new RotationMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.RotationMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.RotationMessage} RotationMessage instance
             */
            RotationMessage.create = function create(properties) {
                return new RotationMessage(properties);
            };

            /**
             * Encodes the specified RotationMessage message. Does not implicitly {@link webrealms.ProtocolMessage.RotationMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.RotationMessage$Properties} message RotationMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RotationMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.X != null && message.hasOwnProperty("X"))
                    writer.uint32(/* id 1, wireType 5 =*/13).float(message.X);
                if (message.Y != null && message.hasOwnProperty("Y"))
                    writer.uint32(/* id 2, wireType 5 =*/21).float(message.Y);
                if (message.Z != null && message.hasOwnProperty("Z"))
                    writer.uint32(/* id 3, wireType 5 =*/29).float(message.Z);
                if (message.W != null && message.hasOwnProperty("W"))
                    writer.uint32(/* id 4, wireType 5 =*/37).float(message.W);
                return writer;
            };

            /**
             * Encodes the specified RotationMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.RotationMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.RotationMessage$Properties} message RotationMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RotationMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a RotationMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.RotationMessage} RotationMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RotationMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage.RotationMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.X = reader.float();
                        break;
                    case 2:
                        message.Y = reader.float();
                        break;
                    case 3:
                        message.Z = reader.float();
                        break;
                    case 4:
                        message.W = reader.float();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a RotationMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.RotationMessage} RotationMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RotationMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a RotationMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            RotationMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.X != null && message.hasOwnProperty("X"))
                    if (typeof message.X !== "number")
                        return "X: number expected";
                if (message.Y != null && message.hasOwnProperty("Y"))
                    if (typeof message.Y !== "number")
                        return "Y: number expected";
                if (message.Z != null && message.hasOwnProperty("Z"))
                    if (typeof message.Z !== "number")
                        return "Z: number expected";
                if (message.W != null && message.hasOwnProperty("W"))
                    if (typeof message.W !== "number")
                        return "W: number expected";
                return null;
            };

            /**
             * Creates a RotationMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.RotationMessage} RotationMessage
             */
            RotationMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.webrealms.ProtocolMessage.RotationMessage)
                    return object;
                var message = new $root.webrealms.ProtocolMessage.RotationMessage();
                if (object.X != null)
                    message.X = Number(object.X);
                if (object.Y != null)
                    message.Y = Number(object.Y);
                if (object.Z != null)
                    message.Z = Number(object.Z);
                if (object.W != null)
                    message.W = Number(object.W);
                return message;
            };

            /**
             * Creates a RotationMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.RotationMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.RotationMessage} RotationMessage
             */
            RotationMessage.from = RotationMessage.fromObject;

            /**
             * Creates a plain object from a RotationMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.RotationMessage} message RotationMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            RotationMessage.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.X = 0;
                    object.Y = 0;
                    object.Z = 0;
                    object.W = 0;
                }
                if (message.X != null && message.hasOwnProperty("X"))
                    object.X = message.X;
                if (message.Y != null && message.hasOwnProperty("Y"))
                    object.Y = message.Y;
                if (message.Z != null && message.hasOwnProperty("Z"))
                    object.Z = message.Z;
                if (message.W != null && message.hasOwnProperty("W"))
                    object.W = message.W;
                return object;
            };

            /**
             * Creates a plain object from this RotationMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            RotationMessage.prototype.toObject = function toObject(options) {
                return this.constructor.toObject(this, options);
            };

            /**
             * Converts this RotationMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            RotationMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return RotationMessage;
        })();

        return ProtocolMessage;
    })();

    return webrealms;
})();

module.exports = $root;

},{"protobufjs/minimal":8}],19:[function(require,module,exports){
"use strict";

exports.__esModule = true;
var root = require("../proto/webrealms.proto.js");
var Worker = function () {
    function Worker() {
        var message = root.webrealms.ProtocolMessage;
        var socket = this.socket = new WebSocket(window.document.location.href.replace("http", "ws"));
        socket.onopen = function () {
            console.log("Opening a connection...");
            socket.send('MSG');
            socket.binaryType = "arraybuffer";
        };
        socket.onclose = function (evt) {
            postMessage("disconnect", "*", [evt.type]);
        };
        socket.onmessage = function (event) {
            postMessage("message", "*", [message.decode(event.data)]);
        };
    }
    Worker.prototype.onmessage = function (args) {
        self.postMessage("You said: " + args.data, "*");
    };
    ;
    return Worker;
}();
exports.Worker = Worker;

},{"../proto/webrealms.proto.js":18}]},{},[19])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQHByb3RvYnVmanMvYXNwcm9taXNlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL2Jhc2U2NC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9ldmVudGVtaXR0ZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQHByb3RvYnVmanMvZmxvYXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQHByb3RvYnVmanMvaW5xdWlyZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9wb29sL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL3V0ZjgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9taW5pbWFsLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL2luZGV4LW1pbmltYWwuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvcmVhZGVyLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3JlYWRlcl9idWZmZXIuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvcnBjLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3JwYy9zZXJ2aWNlLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3V0aWwvbG9uZ2JpdHMuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvdXRpbC9taW5pbWFsLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3dyaXRlci5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy93cml0ZXJfYnVmZmVyLmpzIiwic3JjL3Byb3RvL3dlYnJlYWxtcy5wcm90by5qcyIsInNyYy93b3JrZXIvY2xpZW50Lndvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzE5Q0EsbUJBQW1EO0FBRW5EO0FBSUk7QUFDSSxZQUFJLEFBQU8sVUFBRyxBQUFJLEtBQUMsQUFBUyxVQUFDLEFBQWUsQUFBQztBQUM3QyxZQUFJLEFBQU0sU0FBRyxBQUFJLEtBQUMsQUFBTSxTQUFHLElBQUksQUFBUyxVQUFDLEFBQU0sT0FBQyxBQUFRLFNBQUMsQUFBUSxTQUFDLEFBQUksS0FBQyxBQUFPLFFBQUMsQUFBTSxRQUFDLEFBQUksQUFBQyxBQUFDLEFBQUM7QUFFN0YsQUFBTSxlQUFDLEFBQU0sU0FBRztBQUNaLEFBQU8sb0JBQUMsQUFBRyxJQUFDLEFBQXlCLEFBQUMsQUFBQztBQUN2QyxBQUFNLG1CQUFDLEFBQUksS0FBQyxBQUFLLEFBQUMsQUFBQztBQUNuQixBQUFNLG1CQUFDLEFBQVUsYUFBRyxBQUFhLEFBQUMsQUFDdEM7QUFBQztBQUVELEFBQU0sZUFBQyxBQUFPLFVBQUcsVUFBUyxBQUFlO0FBQ3JDLEFBQVcsd0JBQUMsQUFBWSxjQUFDLEFBQUcsS0FBQyxDQUFDLEFBQUcsSUFBQyxBQUFJLEFBQUMsQUFBQyxBQUFDLEFBQzdDO0FBQUM7QUFFRCxBQUFNLGVBQUMsQUFBUyxZQUFHLFVBQVMsQUFBSztBQUM3QixBQUFXLHdCQUFDLEFBQVMsV0FBQyxBQUFHLEtBQUMsQ0FBQyxBQUFPLFFBQUMsQUFBTSxPQUFDLEFBQUssTUFBQyxBQUFJLEFBQUMsQUFBQyxBQUFDLEFBQUMsQUFDNUQ7QUFBQyxBQUNMO0FBQUM7QUFFTSxxQkFBUyxZQUFoQixVQUFpQixBQUFJO0FBQ2pCLEFBQUksYUFBQyxBQUFXLFlBQUMsQUFBWSxlQUFHLEFBQUksS0FBQyxBQUFJLE1BQUMsQUFBRyxBQUFDLEFBQUMsQUFDbkQ7QUFBQztBQUFBLEFBQUM7QUFFTixXQUFBLEFBQUM7QUEzQkQsQUEyQkM7QUEzQlksaUJBQU0iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gYXNQcm9taXNlO1xyXG5cclxuLyoqXHJcbiAqIENhbGxiYWNrIGFzIHVzZWQgYnkge0BsaW5rIHV0aWwuYXNQcm9taXNlfS5cclxuICogQHR5cGVkZWYgYXNQcm9taXNlQ2FsbGJhY2tcclxuICogQHR5cGUge2Z1bmN0aW9ufVxyXG4gKiBAcGFyYW0ge0Vycm9yfG51bGx9IGVycm9yIEVycm9yLCBpZiBhbnlcclxuICogQHBhcmFtIHsuLi4qfSBwYXJhbXMgQWRkaXRpb25hbCBhcmd1bWVudHNcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblxyXG4vKipcclxuICogUmV0dXJucyBhIHByb21pc2UgZnJvbSBhIG5vZGUtc3R5bGUgY2FsbGJhY2sgZnVuY3Rpb24uXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBwYXJhbSB7YXNQcm9taXNlQ2FsbGJhY2t9IGZuIEZ1bmN0aW9uIHRvIGNhbGxcclxuICogQHBhcmFtIHsqfSBjdHggRnVuY3Rpb24gY29udGV4dFxyXG4gKiBAcGFyYW0gey4uLip9IHBhcmFtcyBGdW5jdGlvbiBhcmd1bWVudHNcclxuICogQHJldHVybnMge1Byb21pc2U8Kj59IFByb21pc2lmaWVkIGZ1bmN0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBhc1Byb21pc2UoZm4sIGN0eC8qLCB2YXJhcmdzICovKSB7XHJcbiAgICB2YXIgcGFyYW1zICA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSksXHJcbiAgICAgICAgb2Zmc2V0ICA9IDAsXHJcbiAgICAgICAgaW5kZXggICA9IDIsXHJcbiAgICAgICAgcGVuZGluZyA9IHRydWU7XHJcbiAgICB3aGlsZSAoaW5kZXggPCBhcmd1bWVudHMubGVuZ3RoKVxyXG4gICAgICAgIHBhcmFtc1tvZmZzZXQrK10gPSBhcmd1bWVudHNbaW5kZXgrK107XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gZXhlY3V0b3IocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgcGFyYW1zW29mZnNldF0gPSBmdW5jdGlvbiBjYWxsYmFjayhlcnIvKiwgdmFyYXJncyAqLykge1xyXG4gICAgICAgICAgICBpZiAocGVuZGluZykge1xyXG4gICAgICAgICAgICAgICAgcGVuZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycilcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChvZmZzZXQgPCBwYXJhbXMubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXNbb2Zmc2V0KytdID0gYXJndW1lbnRzW29mZnNldF07XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZS5hcHBseShudWxsLCBwYXJhbXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBmbi5hcHBseShjdHggfHwgbnVsbCwgcGFyYW1zKTtcclxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgaWYgKHBlbmRpbmcpIHtcclxuICAgICAgICAgICAgICAgIHBlbmRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vKipcclxuICogQSBtaW5pbWFsIGJhc2U2NCBpbXBsZW1lbnRhdGlvbiBmb3IgbnVtYmVyIGFycmF5cy5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxudmFyIGJhc2U2NCA9IGV4cG9ydHM7XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgYnl0ZSBsZW5ndGggb2YgYSBiYXNlNjQgZW5jb2RlZCBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgQmFzZTY0IGVuY29kZWQgc3RyaW5nXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IEJ5dGUgbGVuZ3RoXHJcbiAqL1xyXG5iYXNlNjQubGVuZ3RoID0gZnVuY3Rpb24gbGVuZ3RoKHN0cmluZykge1xyXG4gICAgdmFyIHAgPSBzdHJpbmcubGVuZ3RoO1xyXG4gICAgaWYgKCFwKVxyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgdmFyIG4gPSAwO1xyXG4gICAgd2hpbGUgKC0tcCAlIDQgPiAxICYmIHN0cmluZy5jaGFyQXQocCkgPT09IFwiPVwiKVxyXG4gICAgICAgICsrbjtcclxuICAgIHJldHVybiBNYXRoLmNlaWwoc3RyaW5nLmxlbmd0aCAqIDMpIC8gNCAtIG47XHJcbn07XHJcblxyXG4vLyBCYXNlNjQgZW5jb2RpbmcgdGFibGVcclxudmFyIGI2NCA9IG5ldyBBcnJheSg2NCk7XHJcblxyXG4vLyBCYXNlNjQgZGVjb2RpbmcgdGFibGVcclxudmFyIHM2NCA9IG5ldyBBcnJheSgxMjMpO1xyXG5cclxuLy8gNjUuLjkwLCA5Ny4uMTIyLCA0OC4uNTcsIDQzLCA0N1xyXG5mb3IgKHZhciBpID0gMDsgaSA8IDY0OylcclxuICAgIHM2NFtiNjRbaV0gPSBpIDwgMjYgPyBpICsgNjUgOiBpIDwgNTIgPyBpICsgNzEgOiBpIDwgNjIgPyBpIC0gNCA6IGkgLSA1OSB8IDQzXSA9IGkrKztcclxuXHJcbi8qKlxyXG4gKiBFbmNvZGVzIGEgYnVmZmVyIHRvIGEgYmFzZTY0IGVuY29kZWQgc3RyaW5nLlxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZmZlciBTb3VyY2UgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCBTb3VyY2Ugc3RhcnRcclxuICogQHBhcmFtIHtudW1iZXJ9IGVuZCBTb3VyY2UgZW5kXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEJhc2U2NCBlbmNvZGVkIHN0cmluZ1xyXG4gKi9cclxuYmFzZTY0LmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShidWZmZXIsIHN0YXJ0LCBlbmQpIHtcclxuICAgIHZhciBzdHJpbmcgPSBbXTsgLy8gYWx0OiBuZXcgQXJyYXkoTWF0aC5jZWlsKChlbmQgLSBzdGFydCkgLyAzKSAqIDQpO1xyXG4gICAgdmFyIGkgPSAwLCAvLyBvdXRwdXQgaW5kZXhcclxuICAgICAgICBqID0gMCwgLy8gZ290byBpbmRleFxyXG4gICAgICAgIHQ7ICAgICAvLyB0ZW1wb3JhcnlcclxuICAgIHdoaWxlIChzdGFydCA8IGVuZCkge1xyXG4gICAgICAgIHZhciBiID0gYnVmZmVyW3N0YXJ0KytdO1xyXG4gICAgICAgIHN3aXRjaCAoaikge1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICBzdHJpbmdbaSsrXSA9IGI2NFtiID4+IDJdO1xyXG4gICAgICAgICAgICAgICAgdCA9IChiICYgMykgPDwgNDtcclxuICAgICAgICAgICAgICAgIGogPSAxO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgIHN0cmluZ1tpKytdID0gYjY0W3QgfCBiID4+IDRdO1xyXG4gICAgICAgICAgICAgICAgdCA9IChiICYgMTUpIDw8IDI7XHJcbiAgICAgICAgICAgICAgICBqID0gMjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICBzdHJpbmdbaSsrXSA9IGI2NFt0IHwgYiA+PiA2XTtcclxuICAgICAgICAgICAgICAgIHN0cmluZ1tpKytdID0gYjY0W2IgJiA2M107XHJcbiAgICAgICAgICAgICAgICBqID0gMDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChqKSB7XHJcbiAgICAgICAgc3RyaW5nW2krK10gPSBiNjRbdF07XHJcbiAgICAgICAgc3RyaW5nW2kgIF0gPSA2MTtcclxuICAgICAgICBpZiAoaiA9PT0gMSlcclxuICAgICAgICAgICAgc3RyaW5nW2kgKyAxXSA9IDYxO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBzdHJpbmcpO1xyXG59O1xyXG5cclxudmFyIGludmFsaWRFbmNvZGluZyA9IFwiaW52YWxpZCBlbmNvZGluZ1wiO1xyXG5cclxuLyoqXHJcbiAqIERlY29kZXMgYSBiYXNlNjQgZW5jb2RlZCBzdHJpbmcgdG8gYSBidWZmZXIuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgU291cmNlIHN0cmluZ1xyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZmZlciBEZXN0aW5hdGlvbiBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCBEZXN0aW5hdGlvbiBvZmZzZXRcclxuICogQHJldHVybnMge251bWJlcn0gTnVtYmVyIG9mIGJ5dGVzIHdyaXR0ZW5cclxuICogQHRocm93cyB7RXJyb3J9IElmIGVuY29kaW5nIGlzIGludmFsaWRcclxuICovXHJcbmJhc2U2NC5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUoc3RyaW5nLCBidWZmZXIsIG9mZnNldCkge1xyXG4gICAgdmFyIHN0YXJ0ID0gb2Zmc2V0O1xyXG4gICAgdmFyIGogPSAwLCAvLyBnb3RvIGluZGV4XHJcbiAgICAgICAgdDsgICAgIC8vIHRlbXBvcmFyeVxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOykge1xyXG4gICAgICAgIHZhciBjID0gc3RyaW5nLmNoYXJDb2RlQXQoaSsrKTtcclxuICAgICAgICBpZiAoYyA9PT0gNjEgJiYgaiA+IDEpXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGlmICgoYyA9IHM2NFtjXSkgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoaW52YWxpZEVuY29kaW5nKTtcclxuICAgICAgICBzd2l0Y2ggKGopIHtcclxuICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgdCA9IGM7XHJcbiAgICAgICAgICAgICAgICBqID0gMTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gdCA8PCAyIHwgKGMgJiA0OCkgPj4gNDtcclxuICAgICAgICAgICAgICAgIHQgPSBjO1xyXG4gICAgICAgICAgICAgICAgaiA9IDI7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9ICh0ICYgMTUpIDw8IDQgfCAoYyAmIDYwKSA+PiAyO1xyXG4gICAgICAgICAgICAgICAgdCA9IGM7XHJcbiAgICAgICAgICAgICAgICBqID0gMztcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gKHQgJiAzKSA8PCA2IHwgYztcclxuICAgICAgICAgICAgICAgIGogPSAwO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGogPT09IDEpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoaW52YWxpZEVuY29kaW5nKTtcclxuICAgIHJldHVybiBvZmZzZXQgLSBzdGFydDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUZXN0cyBpZiB0aGUgc3BlY2lmaWVkIHN0cmluZyBhcHBlYXJzIHRvIGJlIGJhc2U2NCBlbmNvZGVkLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFN0cmluZyB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgcHJvYmFibHkgYmFzZTY0IGVuY29kZWQsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuYmFzZTY0LnRlc3QgPSBmdW5jdGlvbiB0ZXN0KHN0cmluZykge1xyXG4gICAgcmV0dXJuIC9eKD86W0EtWmEtejAtOSsvXXs0fSkqKD86W0EtWmEtejAtOSsvXXsyfT09fFtBLVphLXowLTkrL117M309KT8kLy50ZXN0KHN0cmluZyk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IGV2ZW50IGVtaXR0ZXIgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgQSBtaW5pbWFsIGV2ZW50IGVtaXR0ZXIuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVnaXN0ZXJlZCBsaXN0ZW5lcnMuXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsKj59XHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICB0aGlzLl9saXN0ZW5lcnMgPSB7fTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVycyBhbiBldmVudCBsaXN0ZW5lci5cclxuICogQHBhcmFtIHtzdHJpbmd9IGV2dCBFdmVudCBuYW1lXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIExpc3RlbmVyXHJcbiAqIEBwYXJhbSB7Kn0gW2N0eF0gTGlzdGVuZXIgY29udGV4dFxyXG4gKiBAcmV0dXJucyB7dXRpbC5FdmVudEVtaXR0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2dCwgZm4sIGN0eCkge1xyXG4gICAgKHRoaXMuX2xpc3RlbmVyc1tldnRdIHx8ICh0aGlzLl9saXN0ZW5lcnNbZXZ0XSA9IFtdKSkucHVzaCh7XHJcbiAgICAgICAgZm4gIDogZm4sXHJcbiAgICAgICAgY3R4IDogY3R4IHx8IHRoaXNcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVtb3ZlcyBhbiBldmVudCBsaXN0ZW5lciBvciBhbnkgbWF0Y2hpbmcgbGlzdGVuZXJzIGlmIGFyZ3VtZW50cyBhcmUgb21pdHRlZC5cclxuICogQHBhcmFtIHtzdHJpbmd9IFtldnRdIEV2ZW50IG5hbWUuIFJlbW92ZXMgYWxsIGxpc3RlbmVycyBpZiBvbWl0dGVkLlxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBbZm5dIExpc3RlbmVyIHRvIHJlbW92ZS4gUmVtb3ZlcyBhbGwgbGlzdGVuZXJzIG9mIGBldnRgIGlmIG9taXR0ZWQuXHJcbiAqIEByZXR1cm5zIHt1dGlsLkV2ZW50RW1pdHRlcn0gYHRoaXNgXHJcbiAqL1xyXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uIG9mZihldnQsIGZuKSB7XHJcbiAgICBpZiAoZXZ0ID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgdGhpcy5fbGlzdGVuZXJzID0ge307XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgdGhpcy5fbGlzdGVuZXJzW2V2dF0gPSBbXTtcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVyc1tldnRdO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7KVxyXG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyc1tpXS5mbiA9PT0gZm4pXHJcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICArK2k7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogRW1pdHMgYW4gZXZlbnQgYnkgY2FsbGluZyBpdHMgbGlzdGVuZXJzIHdpdGggdGhlIHNwZWNpZmllZCBhcmd1bWVudHMuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBldnQgRXZlbnQgbmFtZVxyXG4gKiBAcGFyYW0gey4uLip9IGFyZ3MgQXJndW1lbnRzXHJcbiAqIEByZXR1cm5zIHt1dGlsLkV2ZW50RW1pdHRlcn0gYHRoaXNgXHJcbiAqL1xyXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KGV2dCkge1xyXG4gICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVyc1tldnRdO1xyXG4gICAgaWYgKGxpc3RlbmVycykge1xyXG4gICAgICAgIHZhciBhcmdzID0gW10sXHJcbiAgICAgICAgICAgIGkgPSAxO1xyXG4gICAgICAgIGZvciAoOyBpIDwgYXJndW1lbnRzLmxlbmd0aDspXHJcbiAgICAgICAgICAgIGFyZ3MucHVzaChhcmd1bWVudHNbaSsrXSk7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7KVxyXG4gICAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4uYXBwbHkobGlzdGVuZXJzW2krK10uY3R4LCBhcmdzKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShmYWN0b3J5KTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyAvIHdyaXRlcyBmbG9hdHMgLyBkb3VibGVzIGZyb20gLyB0byBidWZmZXJzLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0XHJcbiAqIEBuYW1lc3BhY2VcclxuICovXHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgMzIgYml0IGZsb2F0IHRvIGEgYnVmZmVyIHVzaW5nIGxpdHRsZSBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC53cml0ZUZsb2F0TEVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgVGFyZ2V0IGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFRhcmdldCBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIDMyIGJpdCBmbG9hdCB0byBhIGJ1ZmZlciB1c2luZyBiaWcgZW5kaWFuIGJ5dGUgb3JkZXIuXHJcbiAqIEBuYW1lIHV0aWwuZmxvYXQud3JpdGVGbG9hdEJFXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmIFRhcmdldCBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHBvcyBUYXJnZXQgYnVmZmVyIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIDMyIGJpdCBmbG9hdCBmcm9tIGEgYnVmZmVyIHVzaW5nIGxpdHRsZSBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC5yZWFkRmxvYXRMRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgU291cmNlIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFNvdXJjZSBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSAzMiBiaXQgZmxvYXQgZnJvbSBhIGJ1ZmZlciB1c2luZyBiaWcgZW5kaWFuIGJ5dGUgb3JkZXIuXHJcbiAqIEBuYW1lIHV0aWwuZmxvYXQucmVhZEZsb2F0QkVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmIFNvdXJjZSBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHBvcyBTb3VyY2UgYnVmZmVyIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIDY0IGJpdCBkb3VibGUgdG8gYSBidWZmZXIgdXNpbmcgbGl0dGxlIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LndyaXRlRG91YmxlTEVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgVGFyZ2V0IGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFRhcmdldCBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIDY0IGJpdCBkb3VibGUgdG8gYSBidWZmZXIgdXNpbmcgYmlnIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LndyaXRlRG91YmxlQkVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgVGFyZ2V0IGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFRhcmdldCBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgNjQgYml0IGRvdWJsZSBmcm9tIGEgYnVmZmVyIHVzaW5nIGxpdHRsZSBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC5yZWFkRG91YmxlTEVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmIFNvdXJjZSBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHBvcyBTb3VyY2UgYnVmZmVyIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgNjQgYml0IGRvdWJsZSBmcm9tIGEgYnVmZmVyIHVzaW5nIGJpZyBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC5yZWFkRG91YmxlQkVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmIFNvdXJjZSBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHBvcyBTb3VyY2UgYnVmZmVyIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLy8gRmFjdG9yeSBmdW5jdGlvbiBmb3IgdGhlIHB1cnBvc2Ugb2Ygbm9kZS1iYXNlZCB0ZXN0aW5nIGluIG1vZGlmaWVkIGdsb2JhbCBlbnZpcm9ubWVudHNcclxuZnVuY3Rpb24gZmFjdG9yeShleHBvcnRzKSB7XHJcblxyXG4gICAgLy8gZmxvYXQ6IHR5cGVkIGFycmF5XHJcbiAgICBpZiAodHlwZW9mIEZsb2F0MzJBcnJheSAhPT0gXCJ1bmRlZmluZWRcIikgKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICB2YXIgZjMyID0gbmV3IEZsb2F0MzJBcnJheShbIC0wIF0pLFxyXG4gICAgICAgICAgICBmOGIgPSBuZXcgVWludDhBcnJheShmMzIuYnVmZmVyKSxcclxuICAgICAgICAgICAgbGUgID0gZjhiWzNdID09PSAxMjg7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHdyaXRlRmxvYXRfZjMyX2NweSh2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGYzMlswXSA9IHZhbDtcclxuICAgICAgICAgICAgYnVmW3BvcyAgICBdID0gZjhiWzBdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgMV0gPSBmOGJbMV07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAyXSA9IGY4YlsyXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDNdID0gZjhiWzNdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGVGbG9hdF9mMzJfcmV2KHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgZjMyWzBdID0gdmFsO1xyXG4gICAgICAgICAgICBidWZbcG9zICAgIF0gPSBmOGJbM107XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAxXSA9IGY4YlsyXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDJdID0gZjhiWzFdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgM10gPSBmOGJbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMud3JpdGVGbG9hdExFID0gbGUgPyB3cml0ZUZsb2F0X2YzMl9jcHkgOiB3cml0ZUZsb2F0X2YzMl9yZXY7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBleHBvcnRzLndyaXRlRmxvYXRCRSA9IGxlID8gd3JpdGVGbG9hdF9mMzJfcmV2IDogd3JpdGVGbG9hdF9mMzJfY3B5O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkRmxvYXRfZjMyX2NweShidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmOGJbMF0gPSBidWZbcG9zICAgIF07XHJcbiAgICAgICAgICAgIGY4YlsxXSA9IGJ1Zltwb3MgKyAxXTtcclxuICAgICAgICAgICAgZjhiWzJdID0gYnVmW3BvcyArIDJdO1xyXG4gICAgICAgICAgICBmOGJbM10gPSBidWZbcG9zICsgM107XHJcbiAgICAgICAgICAgIHJldHVybiBmMzJbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkRmxvYXRfZjMyX3JldihidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmOGJbM10gPSBidWZbcG9zICAgIF07XHJcbiAgICAgICAgICAgIGY4YlsyXSA9IGJ1Zltwb3MgKyAxXTtcclxuICAgICAgICAgICAgZjhiWzFdID0gYnVmW3BvcyArIDJdO1xyXG4gICAgICAgICAgICBmOGJbMF0gPSBidWZbcG9zICsgM107XHJcbiAgICAgICAgICAgIHJldHVybiBmMzJbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMucmVhZEZsb2F0TEUgPSBsZSA/IHJlYWRGbG9hdF9mMzJfY3B5IDogcmVhZEZsb2F0X2YzMl9yZXY7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBleHBvcnRzLnJlYWRGbG9hdEJFID0gbGUgPyByZWFkRmxvYXRfZjMyX3JldiA6IHJlYWRGbG9hdF9mMzJfY3B5O1xyXG5cclxuICAgIC8vIGZsb2F0OiBpZWVlNzU0XHJcbiAgICB9KSgpOyBlbHNlIChmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGVGbG9hdF9pZWVlNzU0KHdyaXRlVWludCwgdmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgICAgICB2YXIgc2lnbiA9IHZhbCA8IDAgPyAxIDogMDtcclxuICAgICAgICAgICAgaWYgKHNpZ24pXHJcbiAgICAgICAgICAgICAgICB2YWwgPSAtdmFsO1xyXG4gICAgICAgICAgICBpZiAodmFsID09PSAwKVxyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDEgLyB2YWwgPiAwID8gLyogcG9zaXRpdmUgKi8gMCA6IC8qIG5lZ2F0aXZlIDAgKi8gMjE0NzQ4MzY0OCwgYnVmLCBwb3MpO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChpc05hTih2YWwpKVxyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDIxNDMyODkzNDQsIGJ1ZiwgcG9zKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAodmFsID4gMy40MDI4MjM0NjYzODUyODg2ZSszOCkgLy8gKy1JbmZpbml0eVxyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KChzaWduIDw8IDMxIHwgMjEzOTA5NTA0MCkgPj4+IDAsIGJ1ZiwgcG9zKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAodmFsIDwgMS4xNzU0OTQzNTA4MjIyODc1ZS0zOCkgLy8gZGVub3JtYWxcclxuICAgICAgICAgICAgICAgIHdyaXRlVWludCgoc2lnbiA8PCAzMSB8IE1hdGgucm91bmQodmFsIC8gMS40MDEyOTg0NjQzMjQ4MTdlLTQ1KSkgPj4+IDAsIGJ1ZiwgcG9zKTtcclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXhwb25lbnQgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbCkgLyBNYXRoLkxOMiksXHJcbiAgICAgICAgICAgICAgICAgICAgbWFudGlzc2EgPSBNYXRoLnJvdW5kKHZhbCAqIE1hdGgucG93KDIsIC1leHBvbmVudCkgKiA4Mzg4NjA4KSAmIDgzODg2MDc7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoKHNpZ24gPDwgMzEgfCBleHBvbmVudCArIDEyNyA8PCAyMyB8IG1hbnRpc3NhKSA+Pj4gMCwgYnVmLCBwb3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBleHBvcnRzLndyaXRlRmxvYXRMRSA9IHdyaXRlRmxvYXRfaWVlZTc1NC5iaW5kKG51bGwsIHdyaXRlVWludExFKTtcclxuICAgICAgICBleHBvcnRzLndyaXRlRmxvYXRCRSA9IHdyaXRlRmxvYXRfaWVlZTc1NC5iaW5kKG51bGwsIHdyaXRlVWludEJFKTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVhZEZsb2F0X2llZWU3NTQocmVhZFVpbnQsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIHZhciB1aW50ID0gcmVhZFVpbnQoYnVmLCBwb3MpLFxyXG4gICAgICAgICAgICAgICAgc2lnbiA9ICh1aW50ID4+IDMxKSAqIDIgKyAxLFxyXG4gICAgICAgICAgICAgICAgZXhwb25lbnQgPSB1aW50ID4+PiAyMyAmIDI1NSxcclxuICAgICAgICAgICAgICAgIG1hbnRpc3NhID0gdWludCAmIDgzODg2MDc7XHJcbiAgICAgICAgICAgIHJldHVybiBleHBvbmVudCA9PT0gMjU1XHJcbiAgICAgICAgICAgICAgICA/IG1hbnRpc3NhXHJcbiAgICAgICAgICAgICAgICA/IE5hTlxyXG4gICAgICAgICAgICAgICAgOiBzaWduICogSW5maW5pdHlcclxuICAgICAgICAgICAgICAgIDogZXhwb25lbnQgPT09IDAgLy8gZGVub3JtYWxcclxuICAgICAgICAgICAgICAgID8gc2lnbiAqIDEuNDAxMjk4NDY0MzI0ODE3ZS00NSAqIG1hbnRpc3NhXHJcbiAgICAgICAgICAgICAgICA6IHNpZ24gKiBNYXRoLnBvdygyLCBleHBvbmVudCAtIDE1MCkgKiAobWFudGlzc2EgKyA4Mzg4NjA4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV4cG9ydHMucmVhZEZsb2F0TEUgPSByZWFkRmxvYXRfaWVlZTc1NC5iaW5kKG51bGwsIHJlYWRVaW50TEUpO1xyXG4gICAgICAgIGV4cG9ydHMucmVhZEZsb2F0QkUgPSByZWFkRmxvYXRfaWVlZTc1NC5iaW5kKG51bGwsIHJlYWRVaW50QkUpO1xyXG5cclxuICAgIH0pKCk7XHJcblxyXG4gICAgLy8gZG91YmxlOiB0eXBlZCBhcnJheVxyXG4gICAgaWYgKHR5cGVvZiBGbG9hdDY0QXJyYXkgIT09IFwidW5kZWZpbmVkXCIpIChmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgdmFyIGY2NCA9IG5ldyBGbG9hdDY0QXJyYXkoWy0wXSksXHJcbiAgICAgICAgICAgIGY4YiA9IG5ldyBVaW50OEFycmF5KGY2NC5idWZmZXIpLFxyXG4gICAgICAgICAgICBsZSAgPSBmOGJbN10gPT09IDEyODtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGVEb3VibGVfZjY0X2NweSh2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGY2NFswXSA9IHZhbDtcclxuICAgICAgICAgICAgYnVmW3BvcyAgICBdID0gZjhiWzBdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgMV0gPSBmOGJbMV07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAyXSA9IGY4YlsyXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDNdID0gZjhiWzNdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgNF0gPSBmOGJbNF07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA1XSA9IGY4Yls1XTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDZdID0gZjhiWzZdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgN10gPSBmOGJbN107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZURvdWJsZV9mNjRfcmV2KHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgZjY0WzBdID0gdmFsO1xyXG4gICAgICAgICAgICBidWZbcG9zICAgIF0gPSBmOGJbN107XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAxXSA9IGY4Yls2XTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDJdID0gZjhiWzVdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgM10gPSBmOGJbNF07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA0XSA9IGY4YlszXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDVdID0gZjhiWzJdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgNl0gPSBmOGJbMV07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA3XSA9IGY4YlswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy53cml0ZURvdWJsZUxFID0gbGUgPyB3cml0ZURvdWJsZV9mNjRfY3B5IDogd3JpdGVEb3VibGVfZjY0X3JldjtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMud3JpdGVEb3VibGVCRSA9IGxlID8gd3JpdGVEb3VibGVfZjY0X3JldiA6IHdyaXRlRG91YmxlX2Y2NF9jcHk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWREb3VibGVfZjY0X2NweShidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmOGJbMF0gPSBidWZbcG9zICAgIF07XHJcbiAgICAgICAgICAgIGY4YlsxXSA9IGJ1Zltwb3MgKyAxXTtcclxuICAgICAgICAgICAgZjhiWzJdID0gYnVmW3BvcyArIDJdO1xyXG4gICAgICAgICAgICBmOGJbM10gPSBidWZbcG9zICsgM107XHJcbiAgICAgICAgICAgIGY4Yls0XSA9IGJ1Zltwb3MgKyA0XTtcclxuICAgICAgICAgICAgZjhiWzVdID0gYnVmW3BvcyArIDVdO1xyXG4gICAgICAgICAgICBmOGJbNl0gPSBidWZbcG9zICsgNl07XHJcbiAgICAgICAgICAgIGY4Yls3XSA9IGJ1Zltwb3MgKyA3XTtcclxuICAgICAgICAgICAgcmV0dXJuIGY2NFswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWREb3VibGVfZjY0X3JldihidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmOGJbN10gPSBidWZbcG9zICAgIF07XHJcbiAgICAgICAgICAgIGY4Yls2XSA9IGJ1Zltwb3MgKyAxXTtcclxuICAgICAgICAgICAgZjhiWzVdID0gYnVmW3BvcyArIDJdO1xyXG4gICAgICAgICAgICBmOGJbNF0gPSBidWZbcG9zICsgM107XHJcbiAgICAgICAgICAgIGY4YlszXSA9IGJ1Zltwb3MgKyA0XTtcclxuICAgICAgICAgICAgZjhiWzJdID0gYnVmW3BvcyArIDVdO1xyXG4gICAgICAgICAgICBmOGJbMV0gPSBidWZbcG9zICsgNl07XHJcbiAgICAgICAgICAgIGY4YlswXSA9IGJ1Zltwb3MgKyA3XTtcclxuICAgICAgICAgICAgcmV0dXJuIGY2NFswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRG91YmxlTEUgPSBsZSA/IHJlYWREb3VibGVfZjY0X2NweSA6IHJlYWREb3VibGVfZjY0X3JldjtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMucmVhZERvdWJsZUJFID0gbGUgPyByZWFkRG91YmxlX2Y2NF9yZXYgOiByZWFkRG91YmxlX2Y2NF9jcHk7XHJcblxyXG4gICAgLy8gZG91YmxlOiBpZWVlNzU0XHJcbiAgICB9KSgpOyBlbHNlIChmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGVEb3VibGVfaWVlZTc1NCh3cml0ZVVpbnQsIG9mZjAsIG9mZjEsIHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgdmFyIHNpZ24gPSB2YWwgPCAwID8gMSA6IDA7XHJcbiAgICAgICAgICAgIGlmIChzaWduKVxyXG4gICAgICAgICAgICAgICAgdmFsID0gLXZhbDtcclxuICAgICAgICAgICAgaWYgKHZhbCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDAsIGJ1ZiwgcG9zICsgb2ZmMCk7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMSAvIHZhbCA+IDAgPyAvKiBwb3NpdGl2ZSAqLyAwIDogLyogbmVnYXRpdmUgMCAqLyAyMTQ3NDgzNjQ4LCBidWYsIHBvcyArIG9mZjEpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTmFOKHZhbCkpIHtcclxuICAgICAgICAgICAgICAgIHdyaXRlVWludCgwLCBidWYsIHBvcyArIG9mZjApO1xyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDIxNDY5NTkzNjAsIGJ1ZiwgcG9zICsgb2ZmMSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsID4gMS43OTc2OTMxMzQ4NjIzMTU3ZSszMDgpIHsgLy8gKy1JbmZpbml0eVxyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDAsIGJ1ZiwgcG9zICsgb2ZmMCk7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoKHNpZ24gPDwgMzEgfCAyMTQ2NDM1MDcyKSA+Pj4gMCwgYnVmLCBwb3MgKyBvZmYxKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBtYW50aXNzYTtcclxuICAgICAgICAgICAgICAgIGlmICh2YWwgPCAyLjIyNTA3Mzg1ODUwNzIwMTRlLTMwOCkgeyAvLyBkZW5vcm1hbFxyXG4gICAgICAgICAgICAgICAgICAgIG1hbnRpc3NhID0gdmFsIC8gNWUtMzI0O1xyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlVWludChtYW50aXNzYSA+Pj4gMCwgYnVmLCBwb3MgKyBvZmYwKTtcclxuICAgICAgICAgICAgICAgICAgICB3cml0ZVVpbnQoKHNpZ24gPDwgMzEgfCBtYW50aXNzYSAvIDQyOTQ5NjcyOTYpID4+PiAwLCBidWYsIHBvcyArIG9mZjEpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZXhwb25lbnQgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbCkgLyBNYXRoLkxOMik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4cG9uZW50ID09PSAxMDI0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvbmVudCA9IDEwMjM7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFudGlzc2EgPSB2YWwgKiBNYXRoLnBvdygyLCAtZXhwb25lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlVWludChtYW50aXNzYSAqIDQ1MDM1OTk2MjczNzA0OTYgPj4+IDAsIGJ1ZiwgcG9zICsgb2ZmMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVVaW50KChzaWduIDw8IDMxIHwgZXhwb25lbnQgKyAxMDIzIDw8IDIwIHwgbWFudGlzc2EgKiAxMDQ4NTc2ICYgMTA0ODU3NSkgPj4+IDAsIGJ1ZiwgcG9zICsgb2ZmMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV4cG9ydHMud3JpdGVEb3VibGVMRSA9IHdyaXRlRG91YmxlX2llZWU3NTQuYmluZChudWxsLCB3cml0ZVVpbnRMRSwgMCwgNCk7XHJcbiAgICAgICAgZXhwb3J0cy53cml0ZURvdWJsZUJFID0gd3JpdGVEb3VibGVfaWVlZTc1NC5iaW5kKG51bGwsIHdyaXRlVWludEJFLCA0LCAwKTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVhZERvdWJsZV9pZWVlNzU0KHJlYWRVaW50LCBvZmYwLCBvZmYxLCBidWYsIHBvcykge1xyXG4gICAgICAgICAgICB2YXIgbG8gPSByZWFkVWludChidWYsIHBvcyArIG9mZjApLFxyXG4gICAgICAgICAgICAgICAgaGkgPSByZWFkVWludChidWYsIHBvcyArIG9mZjEpO1xyXG4gICAgICAgICAgICB2YXIgc2lnbiA9IChoaSA+PiAzMSkgKiAyICsgMSxcclxuICAgICAgICAgICAgICAgIGV4cG9uZW50ID0gaGkgPj4+IDIwICYgMjA0NyxcclxuICAgICAgICAgICAgICAgIG1hbnRpc3NhID0gNDI5NDk2NzI5NiAqIChoaSAmIDEwNDg1NzUpICsgbG87XHJcbiAgICAgICAgICAgIHJldHVybiBleHBvbmVudCA9PT0gMjA0N1xyXG4gICAgICAgICAgICAgICAgPyBtYW50aXNzYVxyXG4gICAgICAgICAgICAgICAgPyBOYU5cclxuICAgICAgICAgICAgICAgIDogc2lnbiAqIEluZmluaXR5XHJcbiAgICAgICAgICAgICAgICA6IGV4cG9uZW50ID09PSAwIC8vIGRlbm9ybWFsXHJcbiAgICAgICAgICAgICAgICA/IHNpZ24gKiA1ZS0zMjQgKiBtYW50aXNzYVxyXG4gICAgICAgICAgICAgICAgOiBzaWduICogTWF0aC5wb3coMiwgZXhwb25lbnQgLSAxMDc1KSAqIChtYW50aXNzYSArIDQ1MDM1OTk2MjczNzA0OTYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRG91YmxlTEUgPSByZWFkRG91YmxlX2llZWU3NTQuYmluZChudWxsLCByZWFkVWludExFLCAwLCA0KTtcclxuICAgICAgICBleHBvcnRzLnJlYWREb3VibGVCRSA9IHJlYWREb3VibGVfaWVlZTc1NC5iaW5kKG51bGwsIHJlYWRVaW50QkUsIDQsIDApO1xyXG5cclxuICAgIH0pKCk7XHJcblxyXG4gICAgcmV0dXJuIGV4cG9ydHM7XHJcbn1cclxuXHJcbi8vIHVpbnQgaGVscGVyc1xyXG5cclxuZnVuY3Rpb24gd3JpdGVVaW50TEUodmFsLCBidWYsIHBvcykge1xyXG4gICAgYnVmW3BvcyAgICBdID0gIHZhbCAgICAgICAgJiAyNTU7XHJcbiAgICBidWZbcG9zICsgMV0gPSAgdmFsID4+PiA4ICAmIDI1NTtcclxuICAgIGJ1Zltwb3MgKyAyXSA9ICB2YWwgPj4+IDE2ICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDNdID0gIHZhbCA+Pj4gMjQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdyaXRlVWludEJFKHZhbCwgYnVmLCBwb3MpIHtcclxuICAgIGJ1Zltwb3MgICAgXSA9ICB2YWwgPj4+IDI0O1xyXG4gICAgYnVmW3BvcyArIDFdID0gIHZhbCA+Pj4gMTYgJiAyNTU7XHJcbiAgICBidWZbcG9zICsgMl0gPSAgdmFsID4+PiA4ICAmIDI1NTtcclxuICAgIGJ1Zltwb3MgKyAzXSA9ICB2YWwgICAgICAgICYgMjU1O1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkVWludExFKGJ1ZiwgcG9zKSB7XHJcbiAgICByZXR1cm4gKGJ1Zltwb3MgICAgXVxyXG4gICAgICAgICAgfCBidWZbcG9zICsgMV0gPDwgOFxyXG4gICAgICAgICAgfCBidWZbcG9zICsgMl0gPDwgMTZcclxuICAgICAgICAgIHwgYnVmW3BvcyArIDNdIDw8IDI0KSA+Pj4gMDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVhZFVpbnRCRShidWYsIHBvcykge1xyXG4gICAgcmV0dXJuIChidWZbcG9zICAgIF0gPDwgMjRcclxuICAgICAgICAgIHwgYnVmW3BvcyArIDFdIDw8IDE2XHJcbiAgICAgICAgICB8IGJ1Zltwb3MgKyAyXSA8PCA4XHJcbiAgICAgICAgICB8IGJ1Zltwb3MgKyAzXSkgPj4+IDA7XHJcbn1cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gaW5xdWlyZTtcclxuXHJcbi8qKlxyXG4gKiBSZXF1aXJlcyBhIG1vZHVsZSBvbmx5IGlmIGF2YWlsYWJsZS5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWUgTW9kdWxlIHRvIHJlcXVpcmVcclxuICogQHJldHVybnMgez9PYmplY3R9IFJlcXVpcmVkIG1vZHVsZSBpZiBhdmFpbGFibGUgYW5kIG5vdCBlbXB0eSwgb3RoZXJ3aXNlIGBudWxsYFxyXG4gKi9cclxuZnVuY3Rpb24gaW5xdWlyZShtb2R1bGVOYW1lKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHZhciBtb2QgPSBldmFsKFwicXVpcmVcIi5yZXBsYWNlKC9eLyxcInJlXCIpKShtb2R1bGVOYW1lKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1ldmFsXHJcbiAgICAgICAgaWYgKG1vZCAmJiAobW9kLmxlbmd0aCB8fCBPYmplY3Qua2V5cyhtb2QpLmxlbmd0aCkpXHJcbiAgICAgICAgICAgIHJldHVybiBtb2Q7XHJcbiAgICB9IGNhdGNoIChlKSB7fSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5XHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBwb29sO1xyXG5cclxuLyoqXHJcbiAqIEFuIGFsbG9jYXRvciBhcyB1c2VkIGJ5IHtAbGluayB1dGlsLnBvb2x9LlxyXG4gKiBAdHlwZWRlZiBQb29sQWxsb2NhdG9yXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHtudW1iZXJ9IHNpemUgQnVmZmVyIHNpemVcclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl9IEJ1ZmZlclxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBBIHNsaWNlciBhcyB1c2VkIGJ5IHtAbGluayB1dGlsLnBvb2x9LlxyXG4gKiBAdHlwZWRlZiBQb29sU2xpY2VyXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IFN0YXJ0IG9mZnNldFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZW5kIEVuZCBvZmZzZXRcclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl9IEJ1ZmZlciBzbGljZVxyXG4gKiBAdGhpcyB7VWludDhBcnJheX1cclxuICovXHJcblxyXG4vKipcclxuICogQSBnZW5lcmFsIHB1cnBvc2UgYnVmZmVyIHBvb2wuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge1Bvb2xBbGxvY2F0b3J9IGFsbG9jIEFsbG9jYXRvclxyXG4gKiBAcGFyYW0ge1Bvb2xTbGljZXJ9IHNsaWNlIFNsaWNlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gW3NpemU9ODE5Ml0gU2xhYiBzaXplXHJcbiAqIEByZXR1cm5zIHtQb29sQWxsb2NhdG9yfSBQb29sZWQgYWxsb2NhdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBwb29sKGFsbG9jLCBzbGljZSwgc2l6ZSkge1xyXG4gICAgdmFyIFNJWkUgICA9IHNpemUgfHwgODE5MjtcclxuICAgIHZhciBNQVggICAgPSBTSVpFID4+PiAxO1xyXG4gICAgdmFyIHNsYWIgICA9IG51bGw7XHJcbiAgICB2YXIgb2Zmc2V0ID0gU0laRTtcclxuICAgIHJldHVybiBmdW5jdGlvbiBwb29sX2FsbG9jKHNpemUpIHtcclxuICAgICAgICBpZiAoc2l6ZSA8IDEgfHwgc2l6ZSA+IE1BWClcclxuICAgICAgICAgICAgcmV0dXJuIGFsbG9jKHNpemUpO1xyXG4gICAgICAgIGlmIChvZmZzZXQgKyBzaXplID4gU0laRSkge1xyXG4gICAgICAgICAgICBzbGFiID0gYWxsb2MoU0laRSk7XHJcbiAgICAgICAgICAgIG9mZnNldCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBidWYgPSBzbGljZS5jYWxsKHNsYWIsIG9mZnNldCwgb2Zmc2V0ICs9IHNpemUpO1xyXG4gICAgICAgIGlmIChvZmZzZXQgJiA3KSAvLyBhbGlnbiB0byAzMiBiaXRcclxuICAgICAgICAgICAgb2Zmc2V0ID0gKG9mZnNldCB8IDcpICsgMTtcclxuICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgfTtcclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8qKlxyXG4gKiBBIG1pbmltYWwgVVRGOCBpbXBsZW1lbnRhdGlvbiBmb3IgbnVtYmVyIGFycmF5cy5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxudmFyIHV0ZjggPSBleHBvcnRzO1xyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIFVURjggYnl0ZSBsZW5ndGggb2YgYSBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgU3RyaW5nXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IEJ5dGUgbGVuZ3RoXHJcbiAqL1xyXG51dGY4Lmxlbmd0aCA9IGZ1bmN0aW9uIHV0ZjhfbGVuZ3RoKHN0cmluZykge1xyXG4gICAgdmFyIGxlbiA9IDAsXHJcbiAgICAgICAgYyA9IDA7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGMgPSBzdHJpbmcuY2hhckNvZGVBdChpKTtcclxuICAgICAgICBpZiAoYyA8IDEyOClcclxuICAgICAgICAgICAgbGVuICs9IDE7XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8IDIwNDgpXHJcbiAgICAgICAgICAgIGxlbiArPSAyO1xyXG4gICAgICAgIGVsc2UgaWYgKChjICYgMHhGQzAwKSA9PT0gMHhEODAwICYmIChzdHJpbmcuY2hhckNvZGVBdChpICsgMSkgJiAweEZDMDApID09PSAweERDMDApIHtcclxuICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICBsZW4gKz0gNDtcclxuICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgbGVuICs9IDM7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGVuO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIFVURjggYnl0ZXMgYXMgYSBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmZmVyIFNvdXJjZSBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IFNvdXJjZSBzdGFydFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZW5kIFNvdXJjZSBlbmRcclxuICogQHJldHVybnMge3N0cmluZ30gU3RyaW5nIHJlYWRcclxuICovXHJcbnV0ZjgucmVhZCA9IGZ1bmN0aW9uIHV0ZjhfcmVhZChidWZmZXIsIHN0YXJ0LCBlbmQpIHtcclxuICAgIHZhciBsZW4gPSBlbmQgLSBzdGFydDtcclxuICAgIGlmIChsZW4gPCAxKVxyXG4gICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgdmFyIHBhcnRzID0gbnVsbCxcclxuICAgICAgICBjaHVuayA9IFtdLFxyXG4gICAgICAgIGkgPSAwLCAvLyBjaGFyIG9mZnNldFxyXG4gICAgICAgIHQ7ICAgICAvLyB0ZW1wb3JhcnlcclxuICAgIHdoaWxlIChzdGFydCA8IGVuZCkge1xyXG4gICAgICAgIHQgPSBidWZmZXJbc3RhcnQrK107XHJcbiAgICAgICAgaWYgKHQgPCAxMjgpXHJcbiAgICAgICAgICAgIGNodW5rW2krK10gPSB0O1xyXG4gICAgICAgIGVsc2UgaWYgKHQgPiAxOTEgJiYgdCA8IDIyNClcclxuICAgICAgICAgICAgY2h1bmtbaSsrXSA9ICh0ICYgMzEpIDw8IDYgfCBidWZmZXJbc3RhcnQrK10gJiA2MztcclxuICAgICAgICBlbHNlIGlmICh0ID4gMjM5ICYmIHQgPCAzNjUpIHtcclxuICAgICAgICAgICAgdCA9ICgodCAmIDcpIDw8IDE4IHwgKGJ1ZmZlcltzdGFydCsrXSAmIDYzKSA8PCAxMiB8IChidWZmZXJbc3RhcnQrK10gJiA2MykgPDwgNiB8IGJ1ZmZlcltzdGFydCsrXSAmIDYzKSAtIDB4MTAwMDA7XHJcbiAgICAgICAgICAgIGNodW5rW2krK10gPSAweEQ4MDAgKyAodCA+PiAxMCk7XHJcbiAgICAgICAgICAgIGNodW5rW2krK10gPSAweERDMDAgKyAodCAmIDEwMjMpO1xyXG4gICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICBjaHVua1tpKytdID0gKHQgJiAxNSkgPDwgMTIgfCAoYnVmZmVyW3N0YXJ0KytdICYgNjMpIDw8IDYgfCBidWZmZXJbc3RhcnQrK10gJiA2MztcclxuICAgICAgICBpZiAoaSA+IDgxOTEpIHtcclxuICAgICAgICAgICAgKHBhcnRzIHx8IChwYXJ0cyA9IFtdKSkucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY2h1bmspKTtcclxuICAgICAgICAgICAgaSA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHBhcnRzKSB7XHJcbiAgICAgICAgaWYgKGkpXHJcbiAgICAgICAgICAgIHBhcnRzLnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNodW5rLnNsaWNlKDAsIGkpKSk7XHJcbiAgICAgICAgcmV0dXJuIHBhcnRzLmpvaW4oXCJcIik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNodW5rLnNsaWNlKDAsIGkpKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzdHJpbmcgYXMgVVRGOCBieXRlcy5cclxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBTb3VyY2Ugc3RyaW5nXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmZmVyIERlc3RpbmF0aW9uIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gb2Zmc2V0IERlc3RpbmF0aW9uIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBCeXRlcyB3cml0dGVuXHJcbiAqL1xyXG51dGY4LndyaXRlID0gZnVuY3Rpb24gdXRmOF93cml0ZShzdHJpbmcsIGJ1ZmZlciwgb2Zmc2V0KSB7XHJcbiAgICB2YXIgc3RhcnQgPSBvZmZzZXQsXHJcbiAgICAgICAgYzEsIC8vIGNoYXJhY3RlciAxXHJcbiAgICAgICAgYzI7IC8vIGNoYXJhY3RlciAyXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGMxID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XHJcbiAgICAgICAgaWYgKGMxIDwgMTI4KSB7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMTtcclxuICAgICAgICB9IGVsc2UgaWYgKGMxIDwgMjA0OCkge1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgPj4gNiAgICAgICB8IDE5MjtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxICAgICAgICYgNjMgfCAxMjg7XHJcbiAgICAgICAgfSBlbHNlIGlmICgoYzEgJiAweEZDMDApID09PSAweEQ4MDAgJiYgKChjMiA9IHN0cmluZy5jaGFyQ29kZUF0KGkgKyAxKSkgJiAweEZDMDApID09PSAweERDMDApIHtcclxuICAgICAgICAgICAgYzEgPSAweDEwMDAwICsgKChjMSAmIDB4MDNGRikgPDwgMTApICsgKGMyICYgMHgwM0ZGKTtcclxuICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgPj4gMTggICAgICB8IDI0MDtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxID4+IDEyICYgNjMgfCAxMjg7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSA+PiA2ICAmIDYzIHwgMTI4O1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgICAgICAgJiA2MyB8IDEyODtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgPj4gMTIgICAgICB8IDIyNDtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxID4+IDYgICYgNjMgfCAxMjg7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSAgICAgICAmIDYzIHwgMTI4O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvZmZzZXQgLSBzdGFydDtcclxufTtcclxuIiwiLy8gbWluaW1hbCBsaWJyYXJ5IGVudHJ5IHBvaW50LlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2luZGV4LW1pbmltYWxcIik7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgcHJvdG9idWYgPSBleHBvcnRzO1xyXG5cclxuLyoqXHJcbiAqIEJ1aWxkIHR5cGUsIG9uZSBvZiBgXCJmdWxsXCJgLCBgXCJsaWdodFwiYCBvciBgXCJtaW5pbWFsXCJgLlxyXG4gKiBAbmFtZSBidWlsZFxyXG4gKiBAdHlwZSB7c3RyaW5nfVxyXG4gKiBAY29uc3RcclxuICovXHJcbnByb3RvYnVmLmJ1aWxkID0gXCJtaW5pbWFsXCI7XHJcblxyXG4vKipcclxuICogTmFtZWQgcm9vdHMuXHJcbiAqIFRoaXMgaXMgd2hlcmUgcGJqcyBzdG9yZXMgZ2VuZXJhdGVkIHN0cnVjdHVyZXMgKHRoZSBvcHRpb24gYC1yLCAtLXJvb3RgIHNwZWNpZmllcyBhIG5hbWUpLlxyXG4gKiBDYW4gYWxzbyBiZSB1c2VkIG1hbnVhbGx5IHRvIG1ha2Ugcm9vdHMgYXZhaWxhYmxlIGFjY3Jvc3MgbW9kdWxlcy5cclxuICogQG5hbWUgcm9vdHNcclxuICogQHR5cGUge09iamVjdC48c3RyaW5nLFJvb3Q+fVxyXG4gKiBAZXhhbXBsZVxyXG4gKiAvLyBwYmpzIC1yIG15cm9vdCAtbyBjb21waWxlZC5qcyAuLi5cclxuICpcclxuICogLy8gaW4gYW5vdGhlciBtb2R1bGU6XHJcbiAqIHJlcXVpcmUoXCIuL2NvbXBpbGVkLmpzXCIpO1xyXG4gKlxyXG4gKiAvLyBpbiBhbnkgc3Vic2VxdWVudCBtb2R1bGU6XHJcbiAqIHZhciByb290ID0gcHJvdG9idWYucm9vdHNbXCJteXJvb3RcIl07XHJcbiAqL1xyXG5wcm90b2J1Zi5yb290cyA9IHt9O1xyXG5cclxuLy8gU2VyaWFsaXphdGlvblxyXG5wcm90b2J1Zi5Xcml0ZXIgICAgICAgPSByZXF1aXJlKFwiLi93cml0ZXJcIik7XHJcbnByb3RvYnVmLkJ1ZmZlcldyaXRlciA9IHJlcXVpcmUoXCIuL3dyaXRlcl9idWZmZXJcIik7XHJcbnByb3RvYnVmLlJlYWRlciAgICAgICA9IHJlcXVpcmUoXCIuL3JlYWRlclwiKTtcclxucHJvdG9idWYuQnVmZmVyUmVhZGVyID0gcmVxdWlyZShcIi4vcmVhZGVyX2J1ZmZlclwiKTtcclxuXHJcbi8vIFV0aWxpdHlcclxucHJvdG9idWYudXRpbCAgICAgICAgID0gcmVxdWlyZShcIi4vdXRpbC9taW5pbWFsXCIpO1xyXG5wcm90b2J1Zi5ycGMgICAgICAgICAgPSByZXF1aXJlKFwiLi9ycGNcIik7XHJcbnByb3RvYnVmLmNvbmZpZ3VyZSAgICA9IGNvbmZpZ3VyZTtcclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbi8qKlxyXG4gKiBSZWNvbmZpZ3VyZXMgdGhlIGxpYnJhcnkgYWNjb3JkaW5nIHRvIHRoZSBlbnZpcm9ubWVudC5cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcbmZ1bmN0aW9uIGNvbmZpZ3VyZSgpIHtcclxuICAgIHByb3RvYnVmLlJlYWRlci5fY29uZmlndXJlKHByb3RvYnVmLkJ1ZmZlclJlYWRlcik7XHJcbiAgICBwcm90b2J1Zi51dGlsLl9jb25maWd1cmUoKTtcclxufVxyXG5cclxuLy8gQ29uZmlndXJlIHNlcmlhbGl6YXRpb25cclxucHJvdG9idWYuV3JpdGVyLl9jb25maWd1cmUocHJvdG9idWYuQnVmZmVyV3JpdGVyKTtcclxuY29uZmlndXJlKCk7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRlcjtcclxuXHJcbnZhciB1dGlsICAgICAgPSByZXF1aXJlKFwiLi91dGlsL21pbmltYWxcIik7XHJcblxyXG52YXIgQnVmZmVyUmVhZGVyOyAvLyBjeWNsaWNcclxuXHJcbnZhciBMb25nQml0cyAgPSB1dGlsLkxvbmdCaXRzLFxyXG4gICAgdXRmOCAgICAgID0gdXRpbC51dGY4O1xyXG5cclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZnVuY3Rpb24gaW5kZXhPdXRPZlJhbmdlKHJlYWRlciwgd3JpdGVMZW5ndGgpIHtcclxuICAgIHJldHVybiBSYW5nZUVycm9yKFwiaW5kZXggb3V0IG9mIHJhbmdlOiBcIiArIHJlYWRlci5wb3MgKyBcIiArIFwiICsgKHdyaXRlTGVuZ3RoIHx8IDEpICsgXCIgPiBcIiArIHJlYWRlci5sZW4pO1xyXG59XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyByZWFkZXIgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBidWZmZXIuXHJcbiAqIEBjbGFzc2Rlc2MgV2lyZSBmb3JtYXQgcmVhZGVyIHVzaW5nIGBVaW50OEFycmF5YCBpZiBhdmFpbGFibGUsIG90aGVyd2lzZSBgQXJyYXlgLlxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWZmZXIgQnVmZmVyIHRvIHJlYWQgZnJvbVxyXG4gKi9cclxuZnVuY3Rpb24gUmVhZGVyKGJ1ZmZlcikge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCBidWZmZXIuXHJcbiAgICAgKiBAdHlwZSB7VWludDhBcnJheX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5idWYgPSBidWZmZXI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIGJ1ZmZlciBwb3NpdGlvbi5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucG9zID0gMDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgYnVmZmVyIGxlbmd0aC5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubGVuID0gYnVmZmVyLmxlbmd0aDtcclxufVxyXG5cclxudmFyIGNyZWF0ZV9hcnJheSA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSBcInVuZGVmaW5lZFwiXHJcbiAgICA/IGZ1bmN0aW9uIGNyZWF0ZV90eXBlZF9hcnJheShidWZmZXIpIHtcclxuICAgICAgICBpZiAoYnVmZmVyIGluc3RhbmNlb2YgVWludDhBcnJheSB8fCBBcnJheS5pc0FycmF5KGJ1ZmZlcikpXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmVhZGVyKGJ1ZmZlcik7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJpbGxlZ2FsIGJ1ZmZlclwiKTtcclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICA6IGZ1bmN0aW9uIGNyZWF0ZV9hcnJheShidWZmZXIpIHtcclxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShidWZmZXIpKVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlYWRlcihidWZmZXIpO1xyXG4gICAgICAgIHRocm93IEVycm9yKFwiaWxsZWdhbCBidWZmZXJcIik7XHJcbiAgICB9O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgcmVhZGVyIHVzaW5nIHRoZSBzcGVjaWZpZWQgYnVmZmVyLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtVaW50OEFycmF5fEJ1ZmZlcn0gYnVmZmVyIEJ1ZmZlciB0byByZWFkIGZyb21cclxuICogQHJldHVybnMge1JlYWRlcnxCdWZmZXJSZWFkZXJ9IEEge0BsaW5rIEJ1ZmZlclJlYWRlcn0gaWYgYGJ1ZmZlcmAgaXMgYSBCdWZmZXIsIG90aGVyd2lzZSBhIHtAbGluayBSZWFkZXJ9XHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiBgYnVmZmVyYCBpcyBub3QgYSB2YWxpZCBidWZmZXJcclxuICovXHJcblJlYWRlci5jcmVhdGUgPSB1dGlsLkJ1ZmZlclxyXG4gICAgPyBmdW5jdGlvbiBjcmVhdGVfYnVmZmVyX3NldHVwKGJ1ZmZlcikge1xyXG4gICAgICAgIHJldHVybiAoUmVhZGVyLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZV9idWZmZXIoYnVmZmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB1dGlsLkJ1ZmZlci5pc0J1ZmZlcihidWZmZXIpXHJcbiAgICAgICAgICAgICAgICA/IG5ldyBCdWZmZXJSZWFkZXIoYnVmZmVyKVxyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgICAgIDogY3JlYXRlX2FycmF5KGJ1ZmZlcik7XHJcbiAgICAgICAgfSkoYnVmZmVyKTtcclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICA6IGNyZWF0ZV9hcnJheTtcclxuXHJcblJlYWRlci5wcm90b3R5cGUuX3NsaWNlID0gdXRpbC5BcnJheS5wcm90b3R5cGUuc3ViYXJyYXkgfHwgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gdXRpbC5BcnJheS5wcm90b3R5cGUuc2xpY2U7XHJcblxyXG4vKipcclxuICogUmVhZHMgYSB2YXJpbnQgYXMgYW4gdW5zaWduZWQgMzIgYml0IHZhbHVlLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS51aW50MzIgPSAoZnVuY3Rpb24gcmVhZF91aW50MzJfc2V0dXAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSA0Mjk0OTY3Mjk1OyAvLyBvcHRpbWl6ZXIgdHlwZS1oaW50LCB0ZW5kcyB0byBkZW9wdCBvdGhlcndpc2UgKD8hKVxyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHJlYWRfdWludDMyKCkge1xyXG4gICAgICAgIHZhbHVlID0gKCAgICAgICAgIHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNyAgICAgICApID4+PiAwOyBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB2YWx1ZSA9ICh2YWx1ZSB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpIDw8ICA3KSA+Pj4gMDsgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KSByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgdmFsdWUgPSAodmFsdWUgfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA8PCAxNCkgPj4+IDA7IGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOCkgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIHZhbHVlID0gKHZhbHVlIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgMjEpID4+PiAwOyBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB2YWx1ZSA9ICh2YWx1ZSB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAgMTUpIDw8IDI4KSA+Pj4gMDsgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KSByZXR1cm4gdmFsdWU7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICgodGhpcy5wb3MgKz0gNSkgPiB0aGlzLmxlbikge1xyXG4gICAgICAgICAgICB0aGlzLnBvcyA9IHRoaXMubGVuO1xyXG4gICAgICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgMTApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9O1xyXG59KSgpO1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgdmFyaW50IGFzIGEgc2lnbmVkIDMyIGJpdCB2YWx1ZS5cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5pbnQzMiA9IGZ1bmN0aW9uIHJlYWRfaW50MzIoKSB7XHJcbiAgICByZXR1cm4gdGhpcy51aW50MzIoKSB8IDA7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVhZHMgYSB6aWctemFnIGVuY29kZWQgdmFyaW50IGFzIGEgc2lnbmVkIDMyIGJpdCB2YWx1ZS5cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5zaW50MzIgPSBmdW5jdGlvbiByZWFkX3NpbnQzMigpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMudWludDMyKCk7XHJcbiAgICByZXR1cm4gdmFsdWUgPj4+IDEgXiAtKHZhbHVlICYgMSkgfCAwO1xyXG59O1xyXG5cclxuLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzICovXHJcblxyXG5mdW5jdGlvbiByZWFkTG9uZ1ZhcmludCgpIHtcclxuICAgIC8vIHRlbmRzIHRvIGRlb3B0IHdpdGggbG9jYWwgdmFycyBmb3Igb2N0ZXQgZXRjLlxyXG4gICAgdmFyIGJpdHMgPSBuZXcgTG9uZ0JpdHMoMCwgMCk7XHJcbiAgICB2YXIgaSA9IDA7XHJcbiAgICBpZiAodGhpcy5sZW4gLSB0aGlzLnBvcyA+IDQpIHsgLy8gZmFzdCByb3V0ZSAobG8pXHJcbiAgICAgICAgZm9yICg7IGkgPCA0OyArK2kpIHtcclxuICAgICAgICAgICAgLy8gMXN0Li40dGhcclxuICAgICAgICAgICAgYml0cy5sbyA9IChiaXRzLmxvIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgaSAqIDcpID4+PiAwO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYml0cztcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gNXRoXHJcbiAgICAgICAgYml0cy5sbyA9IChiaXRzLmxvIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgMjgpID4+PiAwO1xyXG4gICAgICAgIGJpdHMuaGkgPSAoYml0cy5oaSB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpID4+ICA0KSA+Pj4gMDtcclxuICAgICAgICBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpXHJcbiAgICAgICAgICAgIHJldHVybiBiaXRzO1xyXG4gICAgICAgIGkgPSAwO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBmb3IgKDsgaSA8IDM7ICsraSkge1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMubGVuKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMpO1xyXG4gICAgICAgICAgICAvLyAxc3QuLjN0aFxyXG4gICAgICAgICAgICBiaXRzLmxvID0gKGJpdHMubG8gfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA8PCBpICogNykgPj4+IDA7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOClcclxuICAgICAgICAgICAgICAgIHJldHVybiBiaXRzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyA0dGhcclxuICAgICAgICBiaXRzLmxvID0gKGJpdHMubG8gfCAodGhpcy5idWZbdGhpcy5wb3MrK10gJiAxMjcpIDw8IGkgKiA3KSA+Pj4gMDtcclxuICAgICAgICByZXR1cm4gYml0cztcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmxlbiAtIHRoaXMucG9zID4gNCkgeyAvLyBmYXN0IHJvdXRlIChoaSlcclxuICAgICAgICBmb3IgKDsgaSA8IDU7ICsraSkge1xyXG4gICAgICAgICAgICAvLyA2dGguLjEwdGhcclxuICAgICAgICAgICAgYml0cy5oaSA9IChiaXRzLmhpIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgaSAqIDcgKyAzKSA+Pj4gMDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJpdHM7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBmb3IgKDsgaSA8IDU7ICsraSkge1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMubGVuKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMpO1xyXG4gICAgICAgICAgICAvLyA2dGguLjEwdGhcclxuICAgICAgICAgICAgYml0cy5oaSA9IChiaXRzLmhpIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgaSAqIDcgKyAzKSA+Pj4gMDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJpdHM7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIHRocm93IEVycm9yKFwiaW52YWxpZCB2YXJpbnQgZW5jb2RpbmdcIik7XHJcbn1cclxuXHJcbi8qIGVzbGludC1lbmFibGUgbm8taW52YWxpZC10aGlzICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSB2YXJpbnQgYXMgYSBzaWduZWQgNjQgYml0IHZhbHVlLlxyXG4gKiBAbmFtZSBSZWFkZXIjaW50NjRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtMb25nfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgdmFyaW50IGFzIGFuIHVuc2lnbmVkIDY0IGJpdCB2YWx1ZS5cclxuICogQG5hbWUgUmVhZGVyI3VpbnQ2NFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0xvbmd9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSB6aWctemFnIGVuY29kZWQgdmFyaW50IGFzIGEgc2lnbmVkIDY0IGJpdCB2YWx1ZS5cclxuICogQG5hbWUgUmVhZGVyI3NpbnQ2NFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0xvbmd9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSB2YXJpbnQgYXMgYSBib29sZWFuLlxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5ib29sID0gZnVuY3Rpb24gcmVhZF9ib29sKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudWludDMyKCkgIT09IDA7XHJcbn07XHJcblxyXG5mdW5jdGlvbiByZWFkRml4ZWQzMl9lbmQoYnVmLCBlbmQpIHsgLy8gbm90ZSB0aGF0IHRoaXMgdXNlcyBgZW5kYCwgbm90IGBwb3NgXHJcbiAgICByZXR1cm4gKGJ1ZltlbmQgLSA0XVxyXG4gICAgICAgICAgfCBidWZbZW5kIC0gM10gPDwgOFxyXG4gICAgICAgICAgfCBidWZbZW5kIC0gMl0gPDwgMTZcclxuICAgICAgICAgIHwgYnVmW2VuZCAtIDFdIDw8IDI0KSA+Pj4gMDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGZpeGVkIDMyIGJpdHMgYXMgYW4gdW5zaWduZWQgMzIgYml0IGludGVnZXIuXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuZml4ZWQzMiA9IGZ1bmN0aW9uIHJlYWRfZml4ZWQzMigpIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICh0aGlzLnBvcyArIDQgPiB0aGlzLmxlbilcclxuICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgNCk7XHJcblxyXG4gICAgcmV0dXJuIHJlYWRGaXhlZDMyX2VuZCh0aGlzLmJ1ZiwgdGhpcy5wb3MgKz0gNCk7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVhZHMgZml4ZWQgMzIgYml0cyBhcyBhIHNpZ25lZCAzMiBiaXQgaW50ZWdlci5cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5zZml4ZWQzMiA9IGZ1bmN0aW9uIHJlYWRfc2ZpeGVkMzIoKSB7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAodGhpcy5wb3MgKyA0ID4gdGhpcy5sZW4pXHJcbiAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIDQpO1xyXG5cclxuICAgIHJldHVybiByZWFkRml4ZWQzMl9lbmQodGhpcy5idWYsIHRoaXMucG9zICs9IDQpIHwgMDtcclxufTtcclxuXHJcbi8qIGVzbGludC1kaXNhYmxlIG5vLWludmFsaWQtdGhpcyAqL1xyXG5cclxuZnVuY3Rpb24gcmVhZEZpeGVkNjQoLyogdGhpczogUmVhZGVyICovKSB7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAodGhpcy5wb3MgKyA4ID4gdGhpcy5sZW4pXHJcbiAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIDgpO1xyXG5cclxuICAgIHJldHVybiBuZXcgTG9uZ0JpdHMocmVhZEZpeGVkMzJfZW5kKHRoaXMuYnVmLCB0aGlzLnBvcyArPSA0KSwgcmVhZEZpeGVkMzJfZW5kKHRoaXMuYnVmLCB0aGlzLnBvcyArPSA0KSk7XHJcbn1cclxuXHJcbi8qIGVzbGludC1lbmFibGUgbm8taW52YWxpZC10aGlzICovXHJcblxyXG4vKipcclxuICogUmVhZHMgZml4ZWQgNjQgYml0cy5cclxuICogQG5hbWUgUmVhZGVyI2ZpeGVkNjRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtMb25nfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIHppZy16YWcgZW5jb2RlZCBmaXhlZCA2NCBiaXRzLlxyXG4gKiBAbmFtZSBSZWFkZXIjc2ZpeGVkNjRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtMb25nfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgZmxvYXQgKDMyIGJpdCkgYXMgYSBudW1iZXIuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLmZsb2F0ID0gZnVuY3Rpb24gcmVhZF9mbG9hdCgpIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICh0aGlzLnBvcyArIDQgPiB0aGlzLmxlbilcclxuICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgNCk7XHJcblxyXG4gICAgdmFyIHZhbHVlID0gdXRpbC5mbG9hdC5yZWFkRmxvYXRMRSh0aGlzLmJ1ZiwgdGhpcy5wb3MpO1xyXG4gICAgdGhpcy5wb3MgKz0gNDtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIGRvdWJsZSAoNjQgYml0IGZsb2F0KSBhcyBhIG51bWJlci5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuZG91YmxlID0gZnVuY3Rpb24gcmVhZF9kb3VibGUoKSB7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAodGhpcy5wb3MgKyA4ID4gdGhpcy5sZW4pXHJcbiAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIDQpO1xyXG5cclxuICAgIHZhciB2YWx1ZSA9IHV0aWwuZmxvYXQucmVhZERvdWJsZUxFKHRoaXMuYnVmLCB0aGlzLnBvcyk7XHJcbiAgICB0aGlzLnBvcyArPSA4O1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgc2VxdWVuY2Ugb2YgYnl0ZXMgcHJlY2VlZGVkIGJ5IGl0cyBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLmJ5dGVzID0gZnVuY3Rpb24gcmVhZF9ieXRlcygpIHtcclxuICAgIHZhciBsZW5ndGggPSB0aGlzLnVpbnQzMigpLFxyXG4gICAgICAgIHN0YXJ0ICA9IHRoaXMucG9zLFxyXG4gICAgICAgIGVuZCAgICA9IHRoaXMucG9zICsgbGVuZ3RoO1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKGVuZCA+IHRoaXMubGVuKVxyXG4gICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzLCBsZW5ndGgpO1xyXG5cclxuICAgIHRoaXMucG9zICs9IGxlbmd0aDtcclxuICAgIHJldHVybiBzdGFydCA9PT0gZW5kIC8vIGZpeCBmb3IgSUUgMTAvV2luOCBhbmQgb3RoZXJzJyBzdWJhcnJheSByZXR1cm5pbmcgYXJyYXkgb2Ygc2l6ZSAxXHJcbiAgICAgICAgPyBuZXcgdGhpcy5idWYuY29uc3RydWN0b3IoMClcclxuICAgICAgICA6IHRoaXMuX3NsaWNlLmNhbGwodGhpcy5idWYsIHN0YXJ0LCBlbmQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgc3RyaW5nIHByZWNlZWRlZCBieSBpdHMgYnl0ZSBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuc3RyaW5nID0gZnVuY3Rpb24gcmVhZF9zdHJpbmcoKSB7XHJcbiAgICB2YXIgYnl0ZXMgPSB0aGlzLmJ5dGVzKCk7XHJcbiAgICByZXR1cm4gdXRmOC5yZWFkKGJ5dGVzLCAwLCBieXRlcy5sZW5ndGgpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNraXBzIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGJ5dGVzIGlmIHNwZWNpZmllZCwgb3RoZXJ3aXNlIHNraXBzIGEgdmFyaW50LlxyXG4gKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTGVuZ3RoIGlmIGtub3duLCBvdGhlcndpc2UgYSB2YXJpbnQgaXMgYXNzdW1lZFxyXG4gKiBAcmV0dXJucyB7UmVhZGVyfSBgdGhpc2BcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uIHNraXAobGVuZ3RoKSB7XHJcbiAgICBpZiAodHlwZW9mIGxlbmd0aCA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICh0aGlzLnBvcyArIGxlbmd0aCA+IHRoaXMubGVuKVxyXG4gICAgICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgbGVuZ3RoKTtcclxuICAgICAgICB0aGlzLnBvcyArPSBsZW5ndGg7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGRvIHtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmxlbilcclxuICAgICAgICAgICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzKTtcclxuICAgICAgICB9IHdoaWxlICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSAmIDEyOCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTa2lwcyB0aGUgbmV4dCBlbGVtZW50IG9mIHRoZSBzcGVjaWZpZWQgd2lyZSB0eXBlLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gd2lyZVR5cGUgV2lyZSB0eXBlIHJlY2VpdmVkXHJcbiAqIEByZXR1cm5zIHtSZWFkZXJ9IGB0aGlzYFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5za2lwVHlwZSA9IGZ1bmN0aW9uKHdpcmVUeXBlKSB7XHJcbiAgICBzd2l0Y2ggKHdpcmVUeXBlKSB7XHJcbiAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICB0aGlzLnNraXAoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLnNraXAoOCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgdGhpcy5za2lwKHRoaXMudWludDMyKCkpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgIGRvIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zdGFudC1jb25kaXRpb25cclxuICAgICAgICAgICAgICAgIGlmICgod2lyZVR5cGUgPSB0aGlzLnVpbnQzMigpICYgNykgPT09IDQpXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNraXBUeXBlKHdpcmVUeXBlKTtcclxuICAgICAgICAgICAgfSB3aGlsZSAodHJ1ZSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgNTpcclxuICAgICAgICAgICAgdGhpcy5za2lwKDQpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcImludmFsaWQgd2lyZSB0eXBlIFwiICsgd2lyZVR5cGUgKyBcIiBhdCBvZmZzZXQgXCIgKyB0aGlzLnBvcyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcblJlYWRlci5fY29uZmlndXJlID0gZnVuY3Rpb24oQnVmZmVyUmVhZGVyXykge1xyXG4gICAgQnVmZmVyUmVhZGVyID0gQnVmZmVyUmVhZGVyXztcclxuXHJcbiAgICB2YXIgZm4gPSB1dGlsLkxvbmcgPyBcInRvTG9uZ1wiIDogLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gXCJ0b051bWJlclwiO1xyXG4gICAgdXRpbC5tZXJnZShSZWFkZXIucHJvdG90eXBlLCB7XHJcblxyXG4gICAgICAgIGludDY0OiBmdW5jdGlvbiByZWFkX2ludDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZExvbmdWYXJpbnQuY2FsbCh0aGlzKVtmbl0oZmFsc2UpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHVpbnQ2NDogZnVuY3Rpb24gcmVhZF91aW50NjQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZWFkTG9uZ1ZhcmludC5jYWxsKHRoaXMpW2ZuXSh0cnVlKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzaW50NjQ6IGZ1bmN0aW9uIHJlYWRfc2ludDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZExvbmdWYXJpbnQuY2FsbCh0aGlzKS56ekRlY29kZSgpW2ZuXShmYWxzZSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZml4ZWQ2NDogZnVuY3Rpb24gcmVhZF9maXhlZDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZEZpeGVkNjQuY2FsbCh0aGlzKVtmbl0odHJ1ZSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2ZpeGVkNjQ6IGZ1bmN0aW9uIHJlYWRfc2ZpeGVkNjQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZWFkRml4ZWQ2NC5jYWxsKHRoaXMpW2ZuXShmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXJSZWFkZXI7XHJcblxyXG4vLyBleHRlbmRzIFJlYWRlclxyXG52YXIgUmVhZGVyID0gcmVxdWlyZShcIi4vcmVhZGVyXCIpO1xyXG4oQnVmZmVyUmVhZGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUmVhZGVyLnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gQnVmZmVyUmVhZGVyO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi91dGlsL21pbmltYWxcIik7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBidWZmZXIgcmVhZGVyIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFdpcmUgZm9ybWF0IHJlYWRlciB1c2luZyBub2RlIGJ1ZmZlcnMuXHJcbiAqIEBleHRlbmRzIFJlYWRlclxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtCdWZmZXJ9IGJ1ZmZlciBCdWZmZXIgdG8gcmVhZCBmcm9tXHJcbiAqL1xyXG5mdW5jdGlvbiBCdWZmZXJSZWFkZXIoYnVmZmVyKSB7XHJcbiAgICBSZWFkZXIuY2FsbCh0aGlzLCBidWZmZXIpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCBidWZmZXIuXHJcbiAgICAgKiBAbmFtZSBCdWZmZXJSZWFkZXIjYnVmXHJcbiAgICAgKiBAdHlwZSB7QnVmZmVyfVxyXG4gICAgICovXHJcbn1cclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbmlmICh1dGlsLkJ1ZmZlcilcclxuICAgIEJ1ZmZlclJlYWRlci5wcm90b3R5cGUuX3NsaWNlID0gdXRpbC5CdWZmZXIucHJvdG90eXBlLnNsaWNlO1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuQnVmZmVyUmVhZGVyLnByb3RvdHlwZS5zdHJpbmcgPSBmdW5jdGlvbiByZWFkX3N0cmluZ19idWZmZXIoKSB7XHJcbiAgICB2YXIgbGVuID0gdGhpcy51aW50MzIoKTsgLy8gbW9kaWZpZXMgcG9zXHJcbiAgICByZXR1cm4gdGhpcy5idWYudXRmOFNsaWNlKHRoaXMucG9zLCB0aGlzLnBvcyA9IE1hdGgubWluKHRoaXMucG9zICsgbGVuLCB0aGlzLmxlbikpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgc2VxdWVuY2Ugb2YgYnl0ZXMgcHJlY2VlZGVkIGJ5IGl0cyBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEBuYW1lIEJ1ZmZlclJlYWRlciNieXRlc1xyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0J1ZmZlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vKipcclxuICogU3RyZWFtaW5nIFJQQyBoZWxwZXJzLlxyXG4gKiBAbmFtZXNwYWNlXHJcbiAqL1xyXG52YXIgcnBjID0gZXhwb3J0cztcclxuXHJcbi8qKlxyXG4gKiBSUEMgaW1wbGVtZW50YXRpb24gcGFzc2VkIHRvIHtAbGluayBTZXJ2aWNlI2NyZWF0ZX0gcGVyZm9ybWluZyBhIHNlcnZpY2UgcmVxdWVzdCBvbiBuZXR3b3JrIGxldmVsLCBpLmUuIGJ5IHV0aWxpemluZyBodHRwIHJlcXVlc3RzIG9yIHdlYnNvY2tldHMuXHJcbiAqIEB0eXBlZGVmIFJQQ0ltcGxcclxuICogQHR5cGUge2Z1bmN0aW9ufVxyXG4gKiBAcGFyYW0ge01ldGhvZHxycGMuU2VydmljZU1ldGhvZH0gbWV0aG9kIFJlZmxlY3RlZCBvciBzdGF0aWMgbWV0aG9kIGJlaW5nIGNhbGxlZFxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IHJlcXVlc3REYXRhIFJlcXVlc3QgZGF0YVxyXG4gKiBAcGFyYW0ge1JQQ0ltcGxDYWxsYmFja30gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb25cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQGV4YW1wbGVcclxuICogZnVuY3Rpb24gcnBjSW1wbChtZXRob2QsIHJlcXVlc3REYXRhLCBjYWxsYmFjaykge1xyXG4gKiAgICAgaWYgKHByb3RvYnVmLnV0aWwubGNGaXJzdChtZXRob2QubmFtZSkgIT09IFwibXlNZXRob2RcIikgLy8gY29tcGF0aWJsZSB3aXRoIHN0YXRpYyBjb2RlXHJcbiAqICAgICAgICAgdGhyb3cgRXJyb3IoXCJubyBzdWNoIG1ldGhvZFwiKTtcclxuICogICAgIGFzeW5jaHJvbm91c2x5T2J0YWluQVJlc3BvbnNlKHJlcXVlc3REYXRhLCBmdW5jdGlvbihlcnIsIHJlc3BvbnNlRGF0YSkge1xyXG4gKiAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzcG9uc2VEYXRhKTtcclxuICogICAgIH0pO1xyXG4gKiB9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIE5vZGUtc3R5bGUgY2FsbGJhY2sgYXMgdXNlZCBieSB7QGxpbmsgUlBDSW1wbH0uXHJcbiAqIEB0eXBlZGVmIFJQQ0ltcGxDYWxsYmFja1xyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7P0Vycm9yfSBlcnJvciBFcnJvciwgaWYgYW55LCBvdGhlcndpc2UgYG51bGxgXHJcbiAqIEBwYXJhbSB7P1VpbnQ4QXJyYXl9IFtyZXNwb25zZV0gUmVzcG9uc2UgZGF0YSBvciBgbnVsbGAgdG8gc2lnbmFsIGVuZCBvZiBzdHJlYW0sIGlmIHRoZXJlIGhhc24ndCBiZWVuIGFuIGVycm9yXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxucnBjLlNlcnZpY2UgPSByZXF1aXJlKFwiLi9ycGMvc2VydmljZVwiKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gU2VydmljZTtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4uL3V0aWwvbWluaW1hbFwiKTtcclxuXHJcbi8vIEV4dGVuZHMgRXZlbnRFbWl0dGVyXHJcbihTZXJ2aWNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodXRpbC5FdmVudEVtaXR0ZXIucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBTZXJ2aWNlO1xyXG5cclxuLyoqXHJcbiAqIEEgc2VydmljZSBtZXRob2QgY2FsbGJhY2sgYXMgdXNlZCBieSB7QGxpbmsgcnBjLlNlcnZpY2VNZXRob2R8U2VydmljZU1ldGhvZH0uXHJcbiAqXHJcbiAqIERpZmZlcnMgZnJvbSB7QGxpbmsgUlBDSW1wbENhbGxiYWNrfSBpbiB0aGF0IGl0IGlzIGFuIGFjdHVhbCBjYWxsYmFjayBvZiBhIHNlcnZpY2UgbWV0aG9kIHdoaWNoIG1heSBub3QgcmV0dXJuIGByZXNwb25zZSA9IG51bGxgLlxyXG4gKiBAdHlwZWRlZiBycGMuU2VydmljZU1ldGhvZENhbGxiYWNrXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHs/RXJyb3J9IGVycm9yIEVycm9yLCBpZiBhbnlcclxuICogQHBhcmFtIHs/TWVzc2FnZX0gW3Jlc3BvbnNlXSBSZXNwb25zZSBtZXNzYWdlXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEEgc2VydmljZSBtZXRob2QgcGFydCBvZiBhIHtAbGluayBycGMuU2VydmljZU1ldGhvZE1peGlufFNlcnZpY2VNZXRob2RNaXhpbn0gYW5kIHRodXMge0BsaW5rIHJwYy5TZXJ2aWNlfSBhcyBjcmVhdGVkIGJ5IHtAbGluayBTZXJ2aWNlLmNyZWF0ZX0uXHJcbiAqIEB0eXBlZGVmIHJwYy5TZXJ2aWNlTWV0aG9kXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHtNZXNzYWdlfE9iamVjdC48c3RyaW5nLCo+fSByZXF1ZXN0IFJlcXVlc3QgbWVzc2FnZSBvciBwbGFpbiBvYmplY3RcclxuICogQHBhcmFtIHtycGMuU2VydmljZU1ldGhvZENhbGxiYWNrfSBbY2FsbGJhY2tdIE5vZGUtc3R5bGUgY2FsbGJhY2sgY2FsbGVkIHdpdGggdGhlIGVycm9yLCBpZiBhbnksIGFuZCB0aGUgcmVzcG9uc2UgbWVzc2FnZVxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxNZXNzYWdlPn0gUHJvbWlzZSBpZiBgY2FsbGJhY2tgIGhhcyBiZWVuIG9taXR0ZWQsIG90aGVyd2lzZSBgdW5kZWZpbmVkYFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBBIHNlcnZpY2UgbWV0aG9kIG1peGluLlxyXG4gKlxyXG4gKiBXaGVuIHVzaW5nIFR5cGVTY3JpcHQsIG1peGVkIGluIHNlcnZpY2UgbWV0aG9kcyBhcmUgb25seSBzdXBwb3J0ZWQgZGlyZWN0bHkgd2l0aCBhIHR5cGUgZGVmaW5pdGlvbiBvZiBhIHN0YXRpYyBtb2R1bGUgKHVzZWQgd2l0aCByZWZsZWN0aW9uKS4gT3RoZXJ3aXNlLCBleHBsaWNpdCBjYXN0aW5nIGlzIHJlcXVpcmVkLlxyXG4gKiBAdHlwZWRlZiBycGMuU2VydmljZU1ldGhvZE1peGluXHJcbiAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxycGMuU2VydmljZU1ldGhvZD59XHJcbiAqIEBleGFtcGxlXHJcbiAqIC8vIEV4cGxpY2l0IGNhc3Rpbmcgd2l0aCBUeXBlU2NyaXB0XHJcbiAqIChteVJwY1NlcnZpY2VbXCJteU1ldGhvZFwiXSBhcyBwcm90b2J1Zi5ycGMuU2VydmljZU1ldGhvZCkoLi4uKVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IFJQQyBzZXJ2aWNlIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIEFuIFJQQyBzZXJ2aWNlIGFzIHJldHVybmVkIGJ5IHtAbGluayBTZXJ2aWNlI2NyZWF0ZX0uXHJcbiAqIEBleHBvcnRzIHJwYy5TZXJ2aWNlXHJcbiAqIEBleHRlbmRzIHV0aWwuRXZlbnRFbWl0dGVyXHJcbiAqIEBhdWdtZW50cyBycGMuU2VydmljZU1ldGhvZE1peGluXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge1JQQ0ltcGx9IHJwY0ltcGwgUlBDIGltcGxlbWVudGF0aW9uXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3JlcXVlc3REZWxpbWl0ZWQ9ZmFsc2VdIFdoZXRoZXIgcmVxdWVzdHMgYXJlIGxlbmd0aC1kZWxpbWl0ZWRcclxuICogQHBhcmFtIHtib29sZWFufSBbcmVzcG9uc2VEZWxpbWl0ZWQ9ZmFsc2VdIFdoZXRoZXIgcmVzcG9uc2VzIGFyZSBsZW5ndGgtZGVsaW1pdGVkXHJcbiAqL1xyXG5mdW5jdGlvbiBTZXJ2aWNlKHJwY0ltcGwsIHJlcXVlc3REZWxpbWl0ZWQsIHJlc3BvbnNlRGVsaW1pdGVkKSB7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBycGNJbXBsICE9PSBcImZ1bmN0aW9uXCIpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwicnBjSW1wbCBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XHJcblxyXG4gICAgdXRpbC5FdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJQQyBpbXBsZW1lbnRhdGlvbi4gQmVjb21lcyBgbnVsbGAgb25jZSB0aGUgc2VydmljZSBpcyBlbmRlZC5cclxuICAgICAqIEB0eXBlIHs/UlBDSW1wbH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5ycGNJbXBsID0gcnBjSW1wbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgcmVxdWVzdHMgYXJlIGxlbmd0aC1kZWxpbWl0ZWQuXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXF1ZXN0RGVsaW1pdGVkID0gQm9vbGVhbihyZXF1ZXN0RGVsaW1pdGVkKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgcmVzcG9uc2VzIGFyZSBsZW5ndGgtZGVsaW1pdGVkLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVzcG9uc2VEZWxpbWl0ZWQgPSBCb29sZWFuKHJlc3BvbnNlRGVsaW1pdGVkKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGxzIGEgc2VydmljZSBtZXRob2QgdGhyb3VnaCB7QGxpbmsgcnBjLlNlcnZpY2UjcnBjSW1wbHxycGNJbXBsfS5cclxuICogQHBhcmFtIHtNZXRob2R8cnBjLlNlcnZpY2VNZXRob2R9IG1ldGhvZCBSZWZsZWN0ZWQgb3Igc3RhdGljIG1ldGhvZFxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSByZXF1ZXN0Q3RvciBSZXF1ZXN0IGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHJlc3BvbnNlQ3RvciBSZXNwb25zZSBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge01lc3NhZ2V8T2JqZWN0LjxzdHJpbmcsKj59IHJlcXVlc3QgUmVxdWVzdCBtZXNzYWdlIG9yIHBsYWluIG9iamVjdFxyXG4gKiBAcGFyYW0ge3JwYy5TZXJ2aWNlTWV0aG9kQ2FsbGJhY2t9IGNhbGxiYWNrIFNlcnZpY2UgY2FsbGJhY2tcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLnJwY0NhbGwgPSBmdW5jdGlvbiBycGNDYWxsKG1ldGhvZCwgcmVxdWVzdEN0b3IsIHJlc3BvbnNlQ3RvciwgcmVxdWVzdCwgY2FsbGJhY2spIHtcclxuXHJcbiAgICBpZiAoIXJlcXVlc3QpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwicmVxdWVzdCBtdXN0IGJlIHNwZWNpZmllZFwiKTtcclxuXHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBpZiAoIWNhbGxiYWNrKVxyXG4gICAgICAgIHJldHVybiB1dGlsLmFzUHJvbWlzZShycGNDYWxsLCBzZWxmLCBtZXRob2QsIHJlcXVlc3RDdG9yLCByZXNwb25zZUN0b3IsIHJlcXVlc3QpO1xyXG5cclxuICAgIGlmICghc2VsZi5ycGNJbXBsKSB7XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soRXJyb3IoXCJhbHJlYWR5IGVuZGVkXCIpKTsgfSwgMCk7XHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBzZWxmLnJwY0ltcGwoXHJcbiAgICAgICAgICAgIG1ldGhvZCxcclxuICAgICAgICAgICAgcmVxdWVzdEN0b3Jbc2VsZi5yZXF1ZXN0RGVsaW1pdGVkID8gXCJlbmNvZGVEZWxpbWl0ZWRcIiA6IFwiZW5jb2RlXCJdKHJlcXVlc3QpLmZpbmlzaCgpLFxyXG4gICAgICAgICAgICBmdW5jdGlvbiBycGNDYWxsYmFjayhlcnIsIHJlc3BvbnNlKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImVycm9yXCIsIGVyciwgbWV0aG9kKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmVuZCgvKiBlbmRlZEJ5UlBDICovIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCEocmVzcG9uc2UgaW5zdGFuY2VvZiByZXNwb25zZUN0b3IpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSByZXNwb25zZUN0b3Jbc2VsZi5yZXNwb25zZURlbGltaXRlZCA/IFwiZGVjb2RlRGVsaW1pdGVkXCIgOiBcImRlY29kZVwiXShyZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImVycm9yXCIsIGVyciwgbWV0aG9kKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImRhdGFcIiwgcmVzcG9uc2UsIG1ldGhvZCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgIHNlbGYuZW1pdChcImVycm9yXCIsIGVyciwgbWV0aG9kKTtcclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhlcnIpOyB9LCAwKTtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEVuZHMgdGhpcyBzZXJ2aWNlIGFuZCBlbWl0cyB0aGUgYGVuZGAgZXZlbnQuXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2VuZGVkQnlSUEM9ZmFsc2VdIFdoZXRoZXIgdGhlIHNlcnZpY2UgaGFzIGJlZW4gZW5kZWQgYnkgdGhlIFJQQyBpbXBsZW1lbnRhdGlvbi5cclxuICogQHJldHVybnMge3JwYy5TZXJ2aWNlfSBgdGhpc2BcclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIGVuZChlbmRlZEJ5UlBDKSB7XHJcbiAgICBpZiAodGhpcy5ycGNJbXBsKSB7XHJcbiAgICAgICAgaWYgKCFlbmRlZEJ5UlBDKSAvLyBzaWduYWwgZW5kIHRvIHJwY0ltcGxcclxuICAgICAgICAgICAgdGhpcy5ycGNJbXBsKG51bGwsIG51bGwsIG51bGwpO1xyXG4gICAgICAgIHRoaXMucnBjSW1wbCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5lbWl0KFwiZW5kXCIpLm9mZigpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IExvbmdCaXRzO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgbmV3IGxvbmcgYml0cy5cclxuICogQGNsYXNzZGVzYyBIZWxwZXIgY2xhc3MgZm9yIHdvcmtpbmcgd2l0aCB0aGUgbG93IGFuZCBoaWdoIGJpdHMgb2YgYSA2NCBiaXQgdmFsdWUuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge251bWJlcn0gbG8gTG93IDMyIGJpdHMsIHVuc2lnbmVkXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBoaSBIaWdoIDMyIGJpdHMsIHVuc2lnbmVkXHJcbiAqL1xyXG5mdW5jdGlvbiBMb25nQml0cyhsbywgaGkpIHtcclxuXHJcbiAgICAvLyBub3RlIHRoYXQgdGhlIGNhc3RzIGJlbG93IGFyZSB0aGVvcmV0aWNhbGx5IHVubmVjZXNzYXJ5IGFzIG9mIHRvZGF5LCBidXQgb2xkZXIgc3RhdGljYWxseVxyXG4gICAgLy8gZ2VuZXJhdGVkIGNvbnZlcnRlciBjb2RlIG1pZ2h0IHN0aWxsIGNhbGwgdGhlIGN0b3Igd2l0aCBzaWduZWQgMzJiaXRzLiBrZXB0IGZvciBjb21wYXQuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBMb3cgYml0cy5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubG8gPSBsbyA+Pj4gMDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEhpZ2ggYml0cy5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuaGkgPSBoaSA+Pj4gMDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFplcm8gYml0cy5cclxuICogQG1lbWJlcm9mIHV0aWwuTG9uZ0JpdHNcclxuICogQHR5cGUge3V0aWwuTG9uZ0JpdHN9XHJcbiAqL1xyXG52YXIgemVybyA9IExvbmdCaXRzLnplcm8gPSBuZXcgTG9uZ0JpdHMoMCwgMCk7XHJcblxyXG56ZXJvLnRvTnVtYmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xyXG56ZXJvLnp6RW5jb2RlID0gemVyby56ekRlY29kZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfTtcclxuemVyby5sZW5ndGggPSBmdW5jdGlvbigpIHsgcmV0dXJuIDE7IH07XHJcblxyXG4vKipcclxuICogWmVybyBoYXNoLlxyXG4gKiBAbWVtYmVyb2YgdXRpbC5Mb25nQml0c1xyXG4gKiBAdHlwZSB7c3RyaW5nfVxyXG4gKi9cclxudmFyIHplcm9IYXNoID0gTG9uZ0JpdHMuemVyb0hhc2ggPSBcIlxcMFxcMFxcMFxcMFxcMFxcMFxcMFxcMFwiO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgbmV3IGxvbmcgYml0cyBmcm9tIHRoZSBzcGVjaWZpZWQgbnVtYmVyLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWVcclxuICogQHJldHVybnMge3V0aWwuTG9uZ0JpdHN9IEluc3RhbmNlXHJcbiAqL1xyXG5Mb25nQml0cy5mcm9tTnVtYmVyID0gZnVuY3Rpb24gZnJvbU51bWJlcih2YWx1ZSkge1xyXG4gICAgaWYgKHZhbHVlID09PSAwKVxyXG4gICAgICAgIHJldHVybiB6ZXJvO1xyXG4gICAgdmFyIHNpZ24gPSB2YWx1ZSA8IDA7XHJcbiAgICBpZiAoc2lnbilcclxuICAgICAgICB2YWx1ZSA9IC12YWx1ZTtcclxuICAgIHZhciBsbyA9IHZhbHVlID4+PiAwLFxyXG4gICAgICAgIGhpID0gKHZhbHVlIC0gbG8pIC8gNDI5NDk2NzI5NiA+Pj4gMDtcclxuICAgIGlmIChzaWduKSB7XHJcbiAgICAgICAgaGkgPSB+aGkgPj4+IDA7XHJcbiAgICAgICAgbG8gPSB+bG8gPj4+IDA7XHJcbiAgICAgICAgaWYgKCsrbG8gPiA0Mjk0OTY3Mjk1KSB7XHJcbiAgICAgICAgICAgIGxvID0gMDtcclxuICAgICAgICAgICAgaWYgKCsraGkgPiA0Mjk0OTY3Mjk1KVxyXG4gICAgICAgICAgICAgICAgaGkgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgTG9uZ0JpdHMobG8sIGhpKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIG5ldyBsb25nIGJpdHMgZnJvbSBhIG51bWJlciwgbG9uZyBvciBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZVxyXG4gKiBAcmV0dXJucyB7dXRpbC5Mb25nQml0c30gSW5zdGFuY2VcclxuICovXHJcbkxvbmdCaXRzLmZyb20gPSBmdW5jdGlvbiBmcm9tKHZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKVxyXG4gICAgICAgIHJldHVybiBMb25nQml0cy5mcm9tTnVtYmVyKHZhbHVlKTtcclxuICAgIGlmICh1dGlsLmlzU3RyaW5nKHZhbHVlKSkge1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYgKHV0aWwuTG9uZylcclxuICAgICAgICAgICAgdmFsdWUgPSB1dGlsLkxvbmcuZnJvbVN0cmluZyh2YWx1ZSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gTG9uZ0JpdHMuZnJvbU51bWJlcihwYXJzZUludCh2YWx1ZSwgMTApKTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZS5sb3cgfHwgdmFsdWUuaGlnaCA/IG5ldyBMb25nQml0cyh2YWx1ZS5sb3cgPj4+IDAsIHZhbHVlLmhpZ2ggPj4+IDApIDogemVybztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIGxvbmcgYml0cyB0byBhIHBvc3NpYmx5IHVuc2FmZSBKYXZhU2NyaXB0IG51bWJlci5cclxuICogQHBhcmFtIHtib29sZWFufSBbdW5zaWduZWQ9ZmFsc2VdIFdoZXRoZXIgdW5zaWduZWQgb3Igbm90XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFBvc3NpYmx5IHVuc2FmZSBudW1iZXJcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS50b051bWJlciA9IGZ1bmN0aW9uIHRvTnVtYmVyKHVuc2lnbmVkKSB7XHJcbiAgICBpZiAoIXVuc2lnbmVkICYmIHRoaXMuaGkgPj4+IDMxKSB7XHJcbiAgICAgICAgdmFyIGxvID0gfnRoaXMubG8gKyAxID4+PiAwLFxyXG4gICAgICAgICAgICBoaSA9IH50aGlzLmhpICAgICA+Pj4gMDtcclxuICAgICAgICBpZiAoIWxvKVxyXG4gICAgICAgICAgICBoaSA9IGhpICsgMSA+Pj4gMDtcclxuICAgICAgICByZXR1cm4gLShsbyArIGhpICogNDI5NDk2NzI5Nik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5sbyArIHRoaXMuaGkgKiA0Mjk0OTY3Mjk2O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoaXMgbG9uZyBiaXRzIHRvIGEgbG9uZy5cclxuICogQHBhcmFtIHtib29sZWFufSBbdW5zaWduZWQ9ZmFsc2VdIFdoZXRoZXIgdW5zaWduZWQgb3Igbm90XHJcbiAqIEByZXR1cm5zIHtMb25nfSBMb25nXHJcbiAqL1xyXG5Mb25nQml0cy5wcm90b3R5cGUudG9Mb25nID0gZnVuY3Rpb24gdG9Mb25nKHVuc2lnbmVkKSB7XHJcbiAgICByZXR1cm4gdXRpbC5Mb25nXHJcbiAgICAgICAgPyBuZXcgdXRpbC5Mb25nKHRoaXMubG8gfCAwLCB0aGlzLmhpIHwgMCwgQm9vbGVhbih1bnNpZ25lZCkpXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICA6IHsgbG93OiB0aGlzLmxvIHwgMCwgaGlnaDogdGhpcy5oaSB8IDAsIHVuc2lnbmVkOiBCb29sZWFuKHVuc2lnbmVkKSB9O1xyXG59O1xyXG5cclxudmFyIGNoYXJDb2RlQXQgPSBTdHJpbmcucHJvdG90eXBlLmNoYXJDb2RlQXQ7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBuZXcgbG9uZyBiaXRzIGZyb20gdGhlIHNwZWNpZmllZCA4IGNoYXJhY3RlcnMgbG9uZyBoYXNoLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaGFzaCBIYXNoXHJcbiAqIEByZXR1cm5zIHt1dGlsLkxvbmdCaXRzfSBCaXRzXHJcbiAqL1xyXG5Mb25nQml0cy5mcm9tSGFzaCA9IGZ1bmN0aW9uIGZyb21IYXNoKGhhc2gpIHtcclxuICAgIGlmIChoYXNoID09PSB6ZXJvSGFzaClcclxuICAgICAgICByZXR1cm4gemVybztcclxuICAgIHJldHVybiBuZXcgTG9uZ0JpdHMoXHJcbiAgICAgICAgKCBjaGFyQ29kZUF0LmNhbGwoaGFzaCwgMClcclxuICAgICAgICB8IGNoYXJDb2RlQXQuY2FsbChoYXNoLCAxKSA8PCA4XHJcbiAgICAgICAgfCBjaGFyQ29kZUF0LmNhbGwoaGFzaCwgMikgPDwgMTZcclxuICAgICAgICB8IGNoYXJDb2RlQXQuY2FsbChoYXNoLCAzKSA8PCAyNCkgPj4+IDBcclxuICAgICxcclxuICAgICAgICAoIGNoYXJDb2RlQXQuY2FsbChoYXNoLCA0KVxyXG4gICAgICAgIHwgY2hhckNvZGVBdC5jYWxsKGhhc2gsIDUpIDw8IDhcclxuICAgICAgICB8IGNoYXJDb2RlQXQuY2FsbChoYXNoLCA2KSA8PCAxNlxyXG4gICAgICAgIHwgY2hhckNvZGVBdC5jYWxsKGhhc2gsIDcpIDw8IDI0KSA+Pj4gMFxyXG4gICAgKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIGxvbmcgYml0cyB0byBhIDggY2hhcmFjdGVycyBsb25nIGhhc2guXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEhhc2hcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS50b0hhc2ggPSBmdW5jdGlvbiB0b0hhc2goKSB7XHJcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShcclxuICAgICAgICB0aGlzLmxvICAgICAgICAmIDI1NSxcclxuICAgICAgICB0aGlzLmxvID4+PiA4ICAmIDI1NSxcclxuICAgICAgICB0aGlzLmxvID4+PiAxNiAmIDI1NSxcclxuICAgICAgICB0aGlzLmxvID4+PiAyNCAgICAgICxcclxuICAgICAgICB0aGlzLmhpICAgICAgICAmIDI1NSxcclxuICAgICAgICB0aGlzLmhpID4+PiA4ICAmIDI1NSxcclxuICAgICAgICB0aGlzLmhpID4+PiAxNiAmIDI1NSxcclxuICAgICAgICB0aGlzLmhpID4+PiAyNFxyXG4gICAgKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBaaWctemFnIGVuY29kZXMgdGhpcyBsb25nIGJpdHMuXHJcbiAqIEByZXR1cm5zIHt1dGlsLkxvbmdCaXRzfSBgdGhpc2BcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS56ekVuY29kZSA9IGZ1bmN0aW9uIHp6RW5jb2RlKCkge1xyXG4gICAgdmFyIG1hc2sgPSAgIHRoaXMuaGkgPj4gMzE7XHJcbiAgICB0aGlzLmhpICA9ICgodGhpcy5oaSA8PCAxIHwgdGhpcy5sbyA+Pj4gMzEpIF4gbWFzaykgPj4+IDA7XHJcbiAgICB0aGlzLmxvICA9ICggdGhpcy5sbyA8PCAxICAgICAgICAgICAgICAgICAgIF4gbWFzaykgPj4+IDA7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBaaWctemFnIGRlY29kZXMgdGhpcyBsb25nIGJpdHMuXHJcbiAqIEByZXR1cm5zIHt1dGlsLkxvbmdCaXRzfSBgdGhpc2BcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS56ekRlY29kZSA9IGZ1bmN0aW9uIHp6RGVjb2RlKCkge1xyXG4gICAgdmFyIG1hc2sgPSAtKHRoaXMubG8gJiAxKTtcclxuICAgIHRoaXMubG8gID0gKCh0aGlzLmxvID4+PiAxIHwgdGhpcy5oaSA8PCAzMSkgXiBtYXNrKSA+Pj4gMDtcclxuICAgIHRoaXMuaGkgID0gKCB0aGlzLmhpID4+PiAxICAgICAgICAgICAgICAgICAgXiBtYXNrKSA+Pj4gMDtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGxlbmd0aCBvZiB0aGlzIGxvbmdiaXRzIHdoZW4gZW5jb2RlZCBhcyBhIHZhcmludC5cclxuICogQHJldHVybnMge251bWJlcn0gTGVuZ3RoXHJcbiAqL1xyXG5Mb25nQml0cy5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gbGVuZ3RoKCkge1xyXG4gICAgdmFyIHBhcnQwID0gIHRoaXMubG8sXHJcbiAgICAgICAgcGFydDEgPSAodGhpcy5sbyA+Pj4gMjggfCB0aGlzLmhpIDw8IDQpID4+PiAwLFxyXG4gICAgICAgIHBhcnQyID0gIHRoaXMuaGkgPj4+IDI0O1xyXG4gICAgcmV0dXJuIHBhcnQyID09PSAwXHJcbiAgICAgICAgID8gcGFydDEgPT09IDBcclxuICAgICAgICAgICA/IHBhcnQwIDwgMTYzODRcclxuICAgICAgICAgICAgID8gcGFydDAgPCAxMjggPyAxIDogMlxyXG4gICAgICAgICAgICAgOiBwYXJ0MCA8IDIwOTcxNTIgPyAzIDogNFxyXG4gICAgICAgICAgIDogcGFydDEgPCAxNjM4NFxyXG4gICAgICAgICAgICAgPyBwYXJ0MSA8IDEyOCA/IDUgOiA2XHJcbiAgICAgICAgICAgICA6IHBhcnQxIDwgMjA5NzE1MiA/IDcgOiA4XHJcbiAgICAgICAgIDogcGFydDIgPCAxMjggPyA5IDogMTA7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgdXRpbCA9IGV4cG9ydHM7XHJcblxyXG4vLyB1c2VkIHRvIHJldHVybiBhIFByb21pc2Ugd2hlcmUgY2FsbGJhY2sgaXMgb21pdHRlZFxyXG51dGlsLmFzUHJvbWlzZSA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9hc3Byb21pc2VcIik7XHJcblxyXG4vLyBjb252ZXJ0cyB0byAvIGZyb20gYmFzZTY0IGVuY29kZWQgc3RyaW5nc1xyXG51dGlsLmJhc2U2NCA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9iYXNlNjRcIik7XHJcblxyXG4vLyBiYXNlIGNsYXNzIG9mIHJwYy5TZXJ2aWNlXHJcbnV0aWwuRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIkBwcm90b2J1ZmpzL2V2ZW50ZW1pdHRlclwiKTtcclxuXHJcbi8vIGZsb2F0IGhhbmRsaW5nIGFjY3Jvc3MgYnJvd3NlcnNcclxudXRpbC5mbG9hdCA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9mbG9hdFwiKTtcclxuXHJcbi8vIHJlcXVpcmVzIG1vZHVsZXMgb3B0aW9uYWxseSBhbmQgaGlkZXMgdGhlIGNhbGwgZnJvbSBidW5kbGVyc1xyXG51dGlsLmlucXVpcmUgPSByZXF1aXJlKFwiQHByb3RvYnVmanMvaW5xdWlyZVwiKTtcclxuXHJcbi8vIGNvbnZlcnRzIHRvIC8gZnJvbSB1dGY4IGVuY29kZWQgc3RyaW5nc1xyXG51dGlsLnV0ZjggPSByZXF1aXJlKFwiQHByb3RvYnVmanMvdXRmOFwiKTtcclxuXHJcbi8vIHByb3ZpZGVzIGEgbm9kZS1saWtlIGJ1ZmZlciBwb29sIGluIHRoZSBicm93c2VyXHJcbnV0aWwucG9vbCA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9wb29sXCIpO1xyXG5cclxuLy8gdXRpbGl0eSB0byB3b3JrIHdpdGggdGhlIGxvdyBhbmQgaGlnaCBiaXRzIG9mIGEgNjQgYml0IHZhbHVlXHJcbnV0aWwuTG9uZ0JpdHMgPSByZXF1aXJlKFwiLi9sb25nYml0c1wiKTtcclxuXHJcbi8qKlxyXG4gKiBBbiBpbW11YWJsZSBlbXB0eSBhcnJheS5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHR5cGUge0FycmF5LjwqPn1cclxuICogQGNvbnN0XHJcbiAqL1xyXG51dGlsLmVtcHR5QXJyYXkgPSBPYmplY3QuZnJlZXplID8gT2JqZWN0LmZyZWV6ZShbXSkgOiAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBbXTsgLy8gdXNlZCBvbiBwcm90b3R5cGVzXHJcblxyXG4vKipcclxuICogQW4gaW1tdXRhYmxlIGVtcHR5IG9iamVjdC5cclxuICogQHR5cGUge09iamVjdH1cclxuICogQGNvbnN0XHJcbiAqL1xyXG51dGlsLmVtcHR5T2JqZWN0ID0gT2JqZWN0LmZyZWV6ZSA/IE9iamVjdC5mcmVlemUoe30pIDogLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8ge307IC8vIHVzZWQgb24gcHJvdG90eXBlc1xyXG5cclxuLyoqXHJcbiAqIFdoZXRoZXIgcnVubmluZyB3aXRoaW4gbm9kZSBvciBub3QuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEB0eXBlIHtib29sZWFufVxyXG4gKiBAY29uc3RcclxuICovXHJcbnV0aWwuaXNOb2RlID0gQm9vbGVhbihnbG9iYWwucHJvY2VzcyAmJiBnbG9iYWwucHJvY2Vzcy52ZXJzaW9ucyAmJiBnbG9iYWwucHJvY2Vzcy52ZXJzaW9ucy5ub2RlKTtcclxuXHJcbi8qKlxyXG4gKiBUZXN0cyBpZiB0aGUgc3BlY2lmaWVkIHZhbHVlIGlzIGFuIGludGVnZXIuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0geyp9IHZhbHVlIFZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgdmFsdWUgaXMgYW4gaW50ZWdlclxyXG4gKi9cclxudXRpbC5pc0ludGVnZXIgPSBOdW1iZXIuaXNJbnRlZ2VyIHx8IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIGZ1bmN0aW9uIGlzSW50ZWdlcih2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiBpc0Zpbml0ZSh2YWx1ZSkgJiYgTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRlc3RzIGlmIHRoZSBzcGVjaWZpZWQgdmFsdWUgaXMgYSBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gYHRydWVgIGlmIHRoZSB2YWx1ZSBpcyBhIHN0cmluZ1xyXG4gKi9cclxudXRpbC5pc1N0cmluZyA9IGZ1bmN0aW9uIGlzU3RyaW5nKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiIHx8IHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRlc3RzIGlmIHRoZSBzcGVjaWZpZWQgdmFsdWUgaXMgYSBub24tbnVsbCBvYmplY3QuXHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gYHRydWVgIGlmIHRoZSB2YWx1ZSBpcyBhIG5vbi1udWxsIG9iamVjdFxyXG4gKi9cclxudXRpbC5pc09iamVjdCA9IGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrcyBpZiBhIHByb3BlcnR5IG9uIGEgbWVzc2FnZSBpcyBjb25zaWRlcmVkIHRvIGJlIHByZXNlbnQuXHJcbiAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIHV0aWwuaXNTZXR9LlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBQbGFpbiBvYmplY3Qgb3IgbWVzc2FnZSBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcHJvcCBQcm9wZXJ0eSBuYW1lXHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgY29uc2lkZXJlZCB0byBiZSBwcmVzZW50LCBvdGhlcndpc2UgYGZhbHNlYFxyXG4gKi9cclxudXRpbC5pc3NldCA9XHJcblxyXG4vKipcclxuICogQ2hlY2tzIGlmIGEgcHJvcGVydHkgb24gYSBtZXNzYWdlIGlzIGNvbnNpZGVyZWQgdG8gYmUgcHJlc2VudC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBQbGFpbiBvYmplY3Qgb3IgbWVzc2FnZSBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcHJvcCBQcm9wZXJ0eSBuYW1lXHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgY29uc2lkZXJlZCB0byBiZSBwcmVzZW50LCBvdGhlcndpc2UgYGZhbHNlYFxyXG4gKi9cclxudXRpbC5pc1NldCA9IGZ1bmN0aW9uIGlzU2V0KG9iaiwgcHJvcCkge1xyXG4gICAgdmFyIHZhbHVlID0gb2JqW3Byb3BdO1xyXG4gICAgaWYgKHZhbHVlICE9IG51bGwgJiYgb2JqLmhhc093blByb3BlcnR5KHByb3ApKSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGVxZXFlcSwgbm8tcHJvdG90eXBlLWJ1aWx0aW5zXHJcbiAgICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiB8fCAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZS5sZW5ndGggOiBPYmplY3Qua2V5cyh2YWx1ZSkubGVuZ3RoKSA+IDA7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG4vKlxyXG4gKiBBbnkgY29tcGF0aWJsZSBCdWZmZXIgaW5zdGFuY2UuXHJcbiAqIFRoaXMgaXMgYSBtaW5pbWFsIHN0YW5kLWFsb25lIGRlZmluaXRpb24gb2YgYSBCdWZmZXIgaW5zdGFuY2UuIFRoZSBhY3R1YWwgdHlwZSBpcyB0aGF0IGV4cG9ydGVkIGJ5IG5vZGUncyB0eXBpbmdzLlxyXG4gKiBAdHlwZWRlZiBCdWZmZXJcclxuICogQHR5cGUge1VpbnQ4QXJyYXl9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIE5vZGUncyBCdWZmZXIgY2xhc3MgaWYgYXZhaWxhYmxlLlxyXG4gKiBAdHlwZSB7P2Z1bmN0aW9uKG5ldzogQnVmZmVyKX1cclxuICovXHJcbnV0aWwuQnVmZmVyID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB2YXIgQnVmZmVyID0gdXRpbC5pbnF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcjtcclxuICAgICAgICAvLyByZWZ1c2UgdG8gdXNlIG5vbi1ub2RlIGJ1ZmZlcnMgaWYgbm90IGV4cGxpY2l0bHkgYXNzaWduZWQgKHBlcmYgcmVhc29ucyk6XHJcbiAgICAgICAgcmV0dXJuIEJ1ZmZlci5wcm90b3R5cGUudXRmOFdyaXRlID8gQnVmZmVyIDogLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gbnVsbDtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59KSgpO1xyXG5cclxuLyoqXHJcbiAqIEludGVybmFsIGFsaWFzIG9mIG9yIHBvbHlmdWxsIGZvciBCdWZmZXIuZnJvbS5cclxuICogQHR5cGUgez9mdW5jdGlvbn1cclxuICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyW119IHZhbHVlIFZhbHVlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZW5jb2RpbmddIEVuY29kaW5nIGlmIHZhbHVlIGlzIGEgc3RyaW5nXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fVxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxudXRpbC5fQnVmZmVyX2Zyb20gPSBudWxsO1xyXG5cclxuLyoqXHJcbiAqIEludGVybmFsIGFsaWFzIG9mIG9yIHBvbHlmaWxsIGZvciBCdWZmZXIuYWxsb2NVbnNhZmUuXHJcbiAqIEB0eXBlIHs/ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIEJ1ZmZlciBzaXplXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fVxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxudXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlID0gbnVsbDtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IGJ1ZmZlciBvZiB3aGF0ZXZlciB0eXBlIHN1cHBvcnRlZCBieSB0aGUgZW52aXJvbm1lbnQuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfG51bWJlcltdfSBbc2l6ZU9yQXJyYXk9MF0gQnVmZmVyIHNpemUgb3IgbnVtYmVyIGFycmF5XHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fEJ1ZmZlcn0gQnVmZmVyXHJcbiAqL1xyXG51dGlsLm5ld0J1ZmZlciA9IGZ1bmN0aW9uIG5ld0J1ZmZlcihzaXplT3JBcnJheSkge1xyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIHJldHVybiB0eXBlb2Ygc2l6ZU9yQXJyYXkgPT09IFwibnVtYmVyXCJcclxuICAgICAgICA/IHV0aWwuQnVmZmVyXHJcbiAgICAgICAgICAgID8gdXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlKHNpemVPckFycmF5KVxyXG4gICAgICAgICAgICA6IG5ldyB1dGlsLkFycmF5KHNpemVPckFycmF5KVxyXG4gICAgICAgIDogdXRpbC5CdWZmZXJcclxuICAgICAgICAgICAgPyB1dGlsLl9CdWZmZXJfZnJvbShzaXplT3JBcnJheSlcclxuICAgICAgICAgICAgOiB0eXBlb2YgVWludDhBcnJheSA9PT0gXCJ1bmRlZmluZWRcIlxyXG4gICAgICAgICAgICAgICAgPyBzaXplT3JBcnJheVxyXG4gICAgICAgICAgICAgICAgOiBuZXcgVWludDhBcnJheShzaXplT3JBcnJheSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQXJyYXkgaW1wbGVtZW50YXRpb24gdXNlZCBpbiB0aGUgYnJvd3Nlci4gYFVpbnQ4QXJyYXlgIGlmIHN1cHBvcnRlZCwgb3RoZXJ3aXNlIGBBcnJheWAuXHJcbiAqIEB0eXBlIHs/ZnVuY3Rpb24obmV3OiBVaW50OEFycmF5LCAqKX1cclxuICovXHJcbnV0aWwuQXJyYXkgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gXCJ1bmRlZmluZWRcIiA/IFVpbnQ4QXJyYXkgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gOiBBcnJheTtcclxuXHJcbi8qXHJcbiAqIEFueSBjb21wYXRpYmxlIExvbmcgaW5zdGFuY2UuXHJcbiAqIFRoaXMgaXMgYSBtaW5pbWFsIHN0YW5kLWFsb25lIGRlZmluaXRpb24gb2YgYSBMb25nIGluc3RhbmNlLiBUaGUgYWN0dWFsIHR5cGUgaXMgdGhhdCBleHBvcnRlZCBieSBsb25nLmpzLlxyXG4gKiBAdHlwZWRlZiBMb25nXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBsb3cgTG93IGJpdHNcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGhpZ2ggSGlnaCBiaXRzXHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gdW5zaWduZWQgV2hldGhlciB1bnNpZ25lZCBvciBub3RcclxuICovXHJcblxyXG4vKipcclxuICogTG9uZy5qcydzIExvbmcgY2xhc3MgaWYgYXZhaWxhYmxlLlxyXG4gKiBAdHlwZSB7P2Z1bmN0aW9uKG5ldzogTG9uZyl9XHJcbiAqL1xyXG51dGlsLkxvbmcgPSAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBnbG9iYWwuZGNvZGVJTyAmJiAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBnbG9iYWwuZGNvZGVJTy5Mb25nIHx8IHV0aWwuaW5xdWlyZShcImxvbmdcIik7XHJcblxyXG4vKipcclxuICogUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gdmVyaWZ5IDIgYml0IChgYm9vbGApIG1hcCBrZXlzLlxyXG4gKiBAdHlwZSB7UmVnRXhwfVxyXG4gKiBAY29uc3RcclxuICovXHJcbnV0aWwua2V5MlJlID0gL150cnVlfGZhbHNlfDB8MSQvO1xyXG5cclxuLyoqXHJcbiAqIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHZlcmlmeSAzMiBiaXQgKGBpbnQzMmAgZXRjLikgbWFwIGtleXMuXHJcbiAqIEB0eXBlIHtSZWdFeHB9XHJcbiAqIEBjb25zdFxyXG4gKi9cclxudXRpbC5rZXkzMlJlID0gL14tPyg/OjB8WzEtOV1bMC05XSopJC87XHJcblxyXG4vKipcclxuICogUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gdmVyaWZ5IDY0IGJpdCAoYGludDY0YCBldGMuKSBtYXAga2V5cy5cclxuICogQHR5cGUge1JlZ0V4cH1cclxuICogQGNvbnN0XHJcbiAqL1xyXG51dGlsLmtleTY0UmUgPSAvXig/OltcXFxceDAwLVxcXFx4ZmZdezh9fC0/KD86MHxbMS05XVswLTldKikpJC87XHJcblxyXG4vKipcclxuICogQ29udmVydHMgYSBudW1iZXIgb3IgbG9uZyB0byBhbiA4IGNoYXJhY3RlcnMgbG9uZyBoYXNoIHN0cmluZy5cclxuICogQHBhcmFtIHtMb25nfG51bWJlcn0gdmFsdWUgVmFsdWUgdG8gY29udmVydFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBIYXNoXHJcbiAqL1xyXG51dGlsLmxvbmdUb0hhc2ggPSBmdW5jdGlvbiBsb25nVG9IYXNoKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdmFsdWVcclxuICAgICAgICA/IHV0aWwuTG9uZ0JpdHMuZnJvbSh2YWx1ZSkudG9IYXNoKClcclxuICAgICAgICA6IHV0aWwuTG9uZ0JpdHMuemVyb0hhc2g7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgYW4gOCBjaGFyYWN0ZXJzIGxvbmcgaGFzaCBzdHJpbmcgdG8gYSBsb25nIG9yIG51bWJlci5cclxuICogQHBhcmFtIHtzdHJpbmd9IGhhc2ggSGFzaFxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFt1bnNpZ25lZD1mYWxzZV0gV2hldGhlciB1bnNpZ25lZCBvciBub3RcclxuICogQHJldHVybnMge0xvbmd8bnVtYmVyfSBPcmlnaW5hbCB2YWx1ZVxyXG4gKi9cclxudXRpbC5sb25nRnJvbUhhc2ggPSBmdW5jdGlvbiBsb25nRnJvbUhhc2goaGFzaCwgdW5zaWduZWQpIHtcclxuICAgIHZhciBiaXRzID0gdXRpbC5Mb25nQml0cy5mcm9tSGFzaChoYXNoKTtcclxuICAgIGlmICh1dGlsLkxvbmcpXHJcbiAgICAgICAgcmV0dXJuIHV0aWwuTG9uZy5mcm9tQml0cyhiaXRzLmxvLCBiaXRzLmhpLCB1bnNpZ25lZCk7XHJcbiAgICByZXR1cm4gYml0cy50b051bWJlcihCb29sZWFuKHVuc2lnbmVkKSk7XHJcbn07XHJcblxyXG4vKipcclxuICogTWVyZ2VzIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBzb3VyY2Ugb2JqZWN0IGludG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gZHN0IERlc3RpbmF0aW9uIG9iamVjdFxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBzcmMgU291cmNlIG9iamVjdFxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtpZk5vdFNldD1mYWxzZV0gTWVyZ2VzIG9ubHkgaWYgdGhlIGtleSBpcyBub3QgYWxyZWFkeSBzZXRcclxuICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBEZXN0aW5hdGlvbiBvYmplY3RcclxuICovXHJcbmZ1bmN0aW9uIG1lcmdlKGRzdCwgc3JjLCBpZk5vdFNldCkgeyAvLyB1c2VkIGJ5IGNvbnZlcnRlcnNcclxuICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhzcmMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgaWYgKGRzdFtrZXlzW2ldXSA9PT0gdW5kZWZpbmVkIHx8ICFpZk5vdFNldClcclxuICAgICAgICAgICAgZHN0W2tleXNbaV1dID0gc3JjW2tleXNbaV1dO1xyXG4gICAgcmV0dXJuIGRzdDtcclxufVxyXG5cclxudXRpbC5tZXJnZSA9IG1lcmdlO1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoZSBmaXJzdCBjaGFyYWN0ZXIgb2YgYSBzdHJpbmcgdG8gbG93ZXIgY2FzZS5cclxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciBTdHJpbmcgdG8gY29udmVydFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBDb252ZXJ0ZWQgc3RyaW5nXHJcbiAqL1xyXG51dGlsLmxjRmlyc3QgPSBmdW5jdGlvbiBsY0ZpcnN0KHN0cikge1xyXG4gICAgcmV0dXJuIHN0ci5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHN0ci5zdWJzdHJpbmcoMSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIGN1c3RvbSBlcnJvciBjb25zdHJ1Y3Rvci5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgRXJyb3IgbmFtZVxyXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb259IEN1c3RvbSBlcnJvciBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gbmV3RXJyb3IobmFtZSkge1xyXG5cclxuICAgIGZ1bmN0aW9uIEN1c3RvbUVycm9yKG1lc3NhZ2UsIHByb3BlcnRpZXMpIHtcclxuXHJcbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEN1c3RvbUVycm9yKSlcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBDdXN0b21FcnJvcihtZXNzYWdlLCBwcm9wZXJ0aWVzKTtcclxuXHJcbiAgICAgICAgLy8gRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcclxuICAgICAgICAvLyBeIGp1c3QgcmV0dXJucyBhIG5ldyBlcnJvciBpbnN0YW5jZSBiZWNhdXNlIHRoZSBjdG9yIGNhbiBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvblxyXG5cclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJtZXNzYWdlXCIsIHsgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1lc3NhZ2U7IH0gfSk7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSAvLyBub2RlXHJcbiAgICAgICAgICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEN1c3RvbUVycm9yKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0YWNrXCIsIHsgdmFsdWU6IChuZXcgRXJyb3IoKSkuc3RhY2sgfHwgXCJcIiB9KTtcclxuXHJcbiAgICAgICAgaWYgKHByb3BlcnRpZXMpXHJcbiAgICAgICAgICAgIG1lcmdlKHRoaXMsIHByb3BlcnRpZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIChDdXN0b21FcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gQ3VzdG9tRXJyb3I7XHJcblxyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEN1c3RvbUVycm9yLnByb3RvdHlwZSwgXCJuYW1lXCIsIHsgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5hbWU7IH0gfSk7XHJcblxyXG4gICAgQ3VzdG9tRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubmFtZSArIFwiOiBcIiArIHRoaXMubWVzc2FnZTtcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIEN1c3RvbUVycm9yO1xyXG59XHJcblxyXG51dGlsLm5ld0Vycm9yID0gbmV3RXJyb3I7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBwcm90b2NvbCBlcnJvci5cclxuICogQGNsYXNzZGVzYyBFcnJvciBzdWJjbGFzcyBpbmRpY2F0aW5nIGEgcHJvdG9jb2wgc3BlY2lmYyBlcnJvci5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQGV4dGVuZHMgRXJyb3JcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIEVycm9yIG1lc3NhZ2VcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPj19IHByb3BlcnRpZXMgQWRkaXRpb25hbCBwcm9wZXJ0aWVzXHJcbiAqIEBleGFtcGxlXHJcbiAqIHRyeSB7XHJcbiAqICAgICBNeU1lc3NhZ2UuZGVjb2RlKHNvbWVCdWZmZXIpOyAvLyB0aHJvd3MgaWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXHJcbiAqIH0gY2F0Y2ggKGUpIHtcclxuICogICAgIGlmIChlIGluc3RhbmNlb2YgUHJvdG9jb2xFcnJvciAmJiBlLmluc3RhbmNlKVxyXG4gKiAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVjb2RlZCBzbyBmYXI6IFwiICsgSlNPTi5zdHJpbmdpZnkoZS5pbnN0YW5jZSkpO1xyXG4gKiB9XHJcbiAqL1xyXG51dGlsLlByb3RvY29sRXJyb3IgPSBuZXdFcnJvcihcIlByb3RvY29sRXJyb3JcIik7XHJcblxyXG4vKipcclxuICogU28gZmFyIGRlY29kZWQgbWVzc2FnZSBpbnN0YW5jZS5cclxuICogQG5hbWUgdXRpbC5Qcm90b2NvbEVycm9yI2luc3RhbmNlXHJcbiAqIEB0eXBlIHtNZXNzYWdlfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBCdWlsZHMgYSBnZXR0ZXIgZm9yIGEgb25lb2YncyBwcmVzZW50IGZpZWxkIG5hbWUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nW119IGZpZWxkTmFtZXMgRmllbGQgbmFtZXNcclxuICogQHJldHVybnMge2Z1bmN0aW9uKCk6c3RyaW5nfHVuZGVmaW5lZH0gVW5ib3VuZCBnZXR0ZXJcclxuICovXHJcbnV0aWwub25lT2ZHZXR0ZXIgPSBmdW5jdGlvbiBnZXRPbmVPZihmaWVsZE5hbWVzKSB7XHJcbiAgICB2YXIgZmllbGRNYXAgPSB7fTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGROYW1lcy5sZW5ndGg7ICsraSlcclxuICAgICAgICBmaWVsZE1hcFtmaWVsZE5hbWVzW2ldXSA9IDE7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH0gU2V0IGZpZWxkIG5hbWUsIGlmIGFueVxyXG4gICAgICogQHRoaXMgT2JqZWN0XHJcbiAgICAgKiBAaWdub3JlXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBmdW5jdGlvbigpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb25zaXN0ZW50LXJldHVyblxyXG4gICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzKSwgaSA9IGtleXMubGVuZ3RoIC0gMTsgaSA+IC0xOyAtLWkpXHJcbiAgICAgICAgICAgIGlmIChmaWVsZE1hcFtrZXlzW2ldXSA9PT0gMSAmJiB0aGlzW2tleXNbaV1dICE9PSB1bmRlZmluZWQgJiYgdGhpc1trZXlzW2ldXSAhPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHJldHVybiBrZXlzW2ldO1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBCdWlsZHMgYSBzZXR0ZXIgZm9yIGEgb25lb2YncyBwcmVzZW50IGZpZWxkIG5hbWUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nW119IGZpZWxkTmFtZXMgRmllbGQgbmFtZXNcclxuICogQHJldHVybnMge2Z1bmN0aW9uKD9zdHJpbmcpOnVuZGVmaW5lZH0gVW5ib3VuZCBzZXR0ZXJcclxuICovXHJcbnV0aWwub25lT2ZTZXR0ZXIgPSBmdW5jdGlvbiBzZXRPbmVPZihmaWVsZE5hbWVzKSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBGaWVsZCBuYW1lXHJcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gICAgICogQHRoaXMgT2JqZWN0XHJcbiAgICAgKiBAaWdub3JlXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZE5hbWVzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICBpZiAoZmllbGROYW1lc1tpXSAhPT0gbmFtZSlcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzW2ZpZWxkTmFtZXNbaV1dO1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbi8qKlxyXG4gKiBMYXppbHkgcmVzb2x2ZXMgZnVsbHkgcXVhbGlmaWVkIHR5cGUgbmFtZXMgYWdhaW5zdCB0aGUgc3BlY2lmaWVkIHJvb3QuXHJcbiAqIEBwYXJhbSB7Um9vdH0gcm9vdCBSb290IGluc3RhbmNlb2ZcclxuICogQHBhcmFtIHtPYmplY3QuPG51bWJlcixzdHJpbmd8UmVmbGVjdGlvbk9iamVjdD59IGxhenlUeXBlcyBUeXBlIG5hbWVzXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEBkZXByZWNhdGVkIHNpbmNlIDYuNy4wIHN0YXRpYyBjb2RlIGRvZXMgbm90IGVtaXQgbGF6eSB0eXBlcyBhbnltb3JlXHJcbiAqL1xyXG51dGlsLmxhenlSZXNvbHZlID0gZnVuY3Rpb24gbGF6eVJlc29sdmUocm9vdCwgbGF6eVR5cGVzKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhenlUeXBlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhsYXp5VHlwZXNbaV0pLCBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyArK2opIHtcclxuICAgICAgICAgICAgdmFyIHBhdGggPSBsYXp5VHlwZXNbaV1ba2V5c1tqXV0uc3BsaXQoXCIuXCIpLFxyXG4gICAgICAgICAgICAgICAgcHRyICA9IHJvb3Q7XHJcbiAgICAgICAgICAgIHdoaWxlIChwYXRoLmxlbmd0aClcclxuICAgICAgICAgICAgICAgIHB0ciA9IHB0cltwYXRoLnNoaWZ0KCldO1xyXG4gICAgICAgICAgICBsYXp5VHlwZXNbaV1ba2V5c1tqXV0gPSBwdHI7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlZmF1bHQgY29udmVyc2lvbiBvcHRpb25zIHVzZWQgZm9yIHtAbGluayBNZXNzYWdlI3RvSlNPTn0gaW1wbGVtZW50YXRpb25zLiBMb25ncywgZW51bXMgYW5kIGJ5dGVzIGFyZSBjb252ZXJ0ZWQgdG8gc3RyaW5ncyBieSBkZWZhdWx0LlxyXG4gKiBAdHlwZSB7Q29udmVyc2lvbk9wdGlvbnN9XHJcbiAqL1xyXG51dGlsLnRvSlNPTk9wdGlvbnMgPSB7XHJcbiAgICBsb25nczogU3RyaW5nLFxyXG4gICAgZW51bXM6IFN0cmluZyxcclxuICAgIGJ5dGVzOiBTdHJpbmdcclxufTtcclxuXHJcbnV0aWwuX2NvbmZpZ3VyZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIEJ1ZmZlciA9IHV0aWwuQnVmZmVyO1xyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAoIUJ1ZmZlcikge1xyXG4gICAgICAgIHV0aWwuX0J1ZmZlcl9mcm9tID0gdXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlID0gbnVsbDtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvLyBiZWNhdXNlIG5vZGUgNC54IGJ1ZmZlcnMgYXJlIGluY29tcGF0aWJsZSAmIGltbXV0YWJsZVxyXG4gICAgLy8gc2VlOiBodHRwczovL2dpdGh1Yi5jb20vZGNvZGVJTy9wcm90b2J1Zi5qcy9wdWxsLzY2NVxyXG4gICAgdXRpbC5fQnVmZmVyX2Zyb20gPSBCdWZmZXIuZnJvbSAhPT0gVWludDhBcnJheS5mcm9tICYmIEJ1ZmZlci5mcm9tIHx8XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBmdW5jdGlvbiBCdWZmZXJfZnJvbSh2YWx1ZSwgZW5jb2RpbmcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmZXIodmFsdWUsIGVuY29kaW5nKTtcclxuICAgICAgICB9O1xyXG4gICAgdXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlID0gQnVmZmVyLmFsbG9jVW5zYWZlIHx8XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBmdW5jdGlvbiBCdWZmZXJfYWxsb2NVbnNhZmUoc2l6ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmZlcihzaXplKTtcclxuICAgICAgICB9O1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBXcml0ZXI7XHJcblxyXG52YXIgdXRpbCAgICAgID0gcmVxdWlyZShcIi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxudmFyIEJ1ZmZlcldyaXRlcjsgLy8gY3ljbGljXHJcblxyXG52YXIgTG9uZ0JpdHMgID0gdXRpbC5Mb25nQml0cyxcclxuICAgIGJhc2U2NCAgICA9IHV0aWwuYmFzZTY0LFxyXG4gICAgdXRmOCAgICAgID0gdXRpbC51dGY4O1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgd3JpdGVyIG9wZXJhdGlvbiBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBTY2hlZHVsZWQgd3JpdGVyIG9wZXJhdGlvbi5cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oKiwgVWludDhBcnJheSwgbnVtYmVyKX0gZm4gRnVuY3Rpb24gdG8gY2FsbFxyXG4gKiBAcGFyYW0ge251bWJlcn0gbGVuIFZhbHVlIGJ5dGUgbGVuZ3RoXHJcbiAqIEBwYXJhbSB7Kn0gdmFsIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIE9wKGZuLCBsZW4sIHZhbCkge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRnVuY3Rpb24gdG8gY2FsbC5cclxuICAgICAqIEB0eXBlIHtmdW5jdGlvbihVaW50OEFycmF5LCBudW1iZXIsICopfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmZuID0gZm47XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBWYWx1ZSBieXRlIGxlbmd0aC5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubGVuID0gbGVuO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTmV4dCBvcGVyYXRpb24uXHJcbiAgICAgKiBAdHlwZSB7V3JpdGVyLk9wfHVuZGVmaW5lZH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5uZXh0ID0gdW5kZWZpbmVkO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVmFsdWUgdG8gd3JpdGUuXHJcbiAgICAgKiBAdHlwZSB7Kn1cclxuICAgICAqL1xyXG4gICAgdGhpcy52YWwgPSB2YWw7IC8vIHR5cGUgdmFyaWVzXHJcbn1cclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmZ1bmN0aW9uIG5vb3AoKSB7fSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5LWZ1bmN0aW9uXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyB3cml0ZXIgc3RhdGUgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgQ29waWVkIHdyaXRlciBzdGF0ZS5cclxuICogQG1lbWJlcm9mIFdyaXRlclxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtXcml0ZXJ9IHdyaXRlciBXcml0ZXIgdG8gY29weSBzdGF0ZSBmcm9tXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIFN0YXRlKHdyaXRlcikge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3VycmVudCBoZWFkLlxyXG4gICAgICogQHR5cGUge1dyaXRlci5PcH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5oZWFkID0gd3JpdGVyLmhlYWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDdXJyZW50IHRhaWwuXHJcbiAgICAgKiBAdHlwZSB7V3JpdGVyLk9wfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhaWwgPSB3cml0ZXIudGFpbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEN1cnJlbnQgYnVmZmVyIGxlbmd0aC5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubGVuID0gd3JpdGVyLmxlbjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE5leHQgc3RhdGUuXHJcbiAgICAgKiBAdHlwZSB7P1N0YXRlfVxyXG4gICAgICovXHJcbiAgICB0aGlzLm5leHQgPSB3cml0ZXIuc3RhdGVzO1xyXG59XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyB3cml0ZXIgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgV2lyZSBmb3JtYXQgd3JpdGVyIHVzaW5nIGBVaW50OEFycmF5YCBpZiBhdmFpbGFibGUsIG90aGVyd2lzZSBgQXJyYXlgLlxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIFdyaXRlcigpIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEN1cnJlbnQgbGVuZ3RoLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5sZW4gPSAwO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogT3BlcmF0aW9ucyBoZWFkLlxyXG4gICAgICogQHR5cGUge09iamVjdH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5oZWFkID0gbmV3IE9wKG5vb3AsIDAsIDApO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogT3BlcmF0aW9ucyB0YWlsXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhaWwgPSB0aGlzLmhlYWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBMaW5rZWQgZm9ya2VkIHN0YXRlcy5cclxuICAgICAqIEB0eXBlIHs/T2JqZWN0fVxyXG4gICAgICovXHJcbiAgICB0aGlzLnN0YXRlcyA9IG51bGw7XHJcblxyXG4gICAgLy8gV2hlbiBhIHZhbHVlIGlzIHdyaXR0ZW4sIHRoZSB3cml0ZXIgY2FsY3VsYXRlcyBpdHMgYnl0ZSBsZW5ndGggYW5kIHB1dHMgaXQgaW50byBhIGxpbmtlZFxyXG4gICAgLy8gbGlzdCBvZiBvcGVyYXRpb25zIHRvIHBlcmZvcm0gd2hlbiBmaW5pc2goKSBpcyBjYWxsZWQuIFRoaXMgYm90aCBhbGxvd3MgdXMgdG8gYWxsb2NhdGVcclxuICAgIC8vIGJ1ZmZlcnMgb2YgdGhlIGV4YWN0IHJlcXVpcmVkIHNpemUgYW5kIHJlZHVjZXMgdGhlIGFtb3VudCBvZiB3b3JrIHdlIGhhdmUgdG8gZG8gY29tcGFyZWRcclxuICAgIC8vIHRvIGZpcnN0IGNhbGN1bGF0aW5nIG92ZXIgb2JqZWN0cyBhbmQgdGhlbiBlbmNvZGluZyBvdmVyIG9iamVjdHMuIEluIG91ciBjYXNlLCB0aGUgZW5jb2RpbmdcclxuICAgIC8vIHBhcnQgaXMganVzdCBhIGxpbmtlZCBsaXN0IHdhbGsgY2FsbGluZyBvcGVyYXRpb25zIHdpdGggYWxyZWFkeSBwcmVwYXJlZCB2YWx1ZXMuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IHdyaXRlci5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtCdWZmZXJXcml0ZXJ8V3JpdGVyfSBBIHtAbGluayBCdWZmZXJXcml0ZXJ9IHdoZW4gQnVmZmVycyBhcmUgc3VwcG9ydGVkLCBvdGhlcndpc2UgYSB7QGxpbmsgV3JpdGVyfVxyXG4gKi9cclxuV3JpdGVyLmNyZWF0ZSA9IHV0aWwuQnVmZmVyXHJcbiAgICA/IGZ1bmN0aW9uIGNyZWF0ZV9idWZmZXJfc2V0dXAoKSB7XHJcbiAgICAgICAgcmV0dXJuIChXcml0ZXIuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlX2J1ZmZlcigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmZXJXcml0ZXIoKTtcclxuICAgICAgICB9KSgpO1xyXG4gICAgfVxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIDogZnVuY3Rpb24gY3JlYXRlX2FycmF5KCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgV3JpdGVyKCk7XHJcbiAgICB9O1xyXG5cclxuLyoqXHJcbiAqIEFsbG9jYXRlcyBhIGJ1ZmZlciBvZiB0aGUgc3BlY2lmaWVkIHNpemUuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIEJ1ZmZlciBzaXplXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fSBCdWZmZXJcclxuICovXHJcbldyaXRlci5hbGxvYyA9IGZ1bmN0aW9uIGFsbG9jKHNpemUpIHtcclxuICAgIHJldHVybiBuZXcgdXRpbC5BcnJheShzaXplKTtcclxufTtcclxuXHJcbi8vIFVzZSBVaW50OEFycmF5IGJ1ZmZlciBwb29sIGluIHRoZSBicm93c2VyLCBqdXN0IGxpa2Ugbm9kZSBkb2VzIHdpdGggYnVmZmVyc1xyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG5pZiAodXRpbC5BcnJheSAhPT0gQXJyYXkpXHJcbiAgICBXcml0ZXIuYWxsb2MgPSB1dGlsLnBvb2woV3JpdGVyLmFsbG9jLCB1dGlsLkFycmF5LnByb3RvdHlwZS5zdWJhcnJheSk7XHJcblxyXG4vKipcclxuICogUHVzaGVzIGEgbmV3IG9wZXJhdGlvbiB0byB0aGUgcXVldWUuXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oVWludDhBcnJheSwgbnVtYmVyLCAqKX0gZm4gRnVuY3Rpb24gdG8gY2FsbFxyXG4gKiBAcGFyYW0ge251bWJlcn0gbGVuIFZhbHVlIGJ5dGUgbGVuZ3RoXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiBwdXNoKGZuLCBsZW4sIHZhbCkge1xyXG4gICAgdGhpcy50YWlsID0gdGhpcy50YWlsLm5leHQgPSBuZXcgT3AoZm4sIGxlbiwgdmFsKTtcclxuICAgIHRoaXMubGVuICs9IGxlbjtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gd3JpdGVCeXRlKHZhbCwgYnVmLCBwb3MpIHtcclxuICAgIGJ1Zltwb3NdID0gdmFsICYgMjU1O1xyXG59XHJcblxyXG5mdW5jdGlvbiB3cml0ZVZhcmludDMyKHZhbCwgYnVmLCBwb3MpIHtcclxuICAgIHdoaWxlICh2YWwgPiAxMjcpIHtcclxuICAgICAgICBidWZbcG9zKytdID0gdmFsICYgMTI3IHwgMTI4O1xyXG4gICAgICAgIHZhbCA+Pj49IDc7XHJcbiAgICB9XHJcbiAgICBidWZbcG9zXSA9IHZhbDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgdmFyaW50IHdyaXRlciBvcGVyYXRpb24gaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgU2NoZWR1bGVkIHZhcmludCB3cml0ZXIgb3BlcmF0aW9uLlxyXG4gKiBAZXh0ZW5kcyBPcFxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtudW1iZXJ9IGxlbiBWYWx1ZSBieXRlIGxlbmd0aFxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIFZhcmludE9wKGxlbiwgdmFsKSB7XHJcbiAgICB0aGlzLmxlbiA9IGxlbjtcclxuICAgIHRoaXMubmV4dCA9IHVuZGVmaW5lZDtcclxuICAgIHRoaXMudmFsID0gdmFsO1xyXG59XHJcblxyXG5WYXJpbnRPcC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9wLnByb3RvdHlwZSk7XHJcblZhcmludE9wLnByb3RvdHlwZS5mbiA9IHdyaXRlVmFyaW50MzI7XHJcblxyXG4vKipcclxuICogV3JpdGVzIGFuIHVuc2lnbmVkIDMyIGJpdCB2YWx1ZSBhcyBhIHZhcmludC5cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS51aW50MzIgPSBmdW5jdGlvbiB3cml0ZV91aW50MzIodmFsdWUpIHtcclxuICAgIC8vIGhlcmUsIHRoZSBjYWxsIHRvIHRoaXMucHVzaCBoYXMgYmVlbiBpbmxpbmVkIGFuZCBhIHZhcmludCBzcGVjaWZpYyBPcCBzdWJjbGFzcyBpcyB1c2VkLlxyXG4gICAgLy8gdWludDMyIGlzIGJ5IGZhciB0aGUgbW9zdCBmcmVxdWVudGx5IHVzZWQgb3BlcmF0aW9uIGFuZCBiZW5lZml0cyBzaWduaWZpY2FudGx5IGZyb20gdGhpcy5cclxuICAgIHRoaXMubGVuICs9ICh0aGlzLnRhaWwgPSB0aGlzLnRhaWwubmV4dCA9IG5ldyBWYXJpbnRPcChcclxuICAgICAgICAodmFsdWUgPSB2YWx1ZSA+Pj4gMClcclxuICAgICAgICAgICAgICAgIDwgMTI4ICAgICAgID8gMVxyXG4gICAgICAgIDogdmFsdWUgPCAxNjM4NCAgICAgPyAyXHJcbiAgICAgICAgOiB2YWx1ZSA8IDIwOTcxNTIgICA/IDNcclxuICAgICAgICA6IHZhbHVlIDwgMjY4NDM1NDU2ID8gNFxyXG4gICAgICAgIDogICAgICAgICAgICAgICAgICAgICA1LFxyXG4gICAgdmFsdWUpKS5sZW47XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzaWduZWQgMzIgYml0IHZhbHVlIGFzIGEgdmFyaW50LlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5pbnQzMiA9IGZ1bmN0aW9uIHdyaXRlX2ludDMyKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdmFsdWUgPCAwXHJcbiAgICAgICAgPyB0aGlzLnB1c2god3JpdGVWYXJpbnQ2NCwgMTAsIExvbmdCaXRzLmZyb21OdW1iZXIodmFsdWUpKSAvLyAxMCBieXRlcyBwZXIgc3BlY1xyXG4gICAgICAgIDogdGhpcy51aW50MzIodmFsdWUpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIDMyIGJpdCB2YWx1ZSBhcyBhIHZhcmludCwgemlnLXphZyBlbmNvZGVkLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnNpbnQzMiA9IGZ1bmN0aW9uIHdyaXRlX3NpbnQzMih2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHRoaXMudWludDMyKCh2YWx1ZSA8PCAxIF4gdmFsdWUgPj4gMzEpID4+PiAwKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIHdyaXRlVmFyaW50NjQodmFsLCBidWYsIHBvcykge1xyXG4gICAgd2hpbGUgKHZhbC5oaSkge1xyXG4gICAgICAgIGJ1Zltwb3MrK10gPSB2YWwubG8gJiAxMjcgfCAxMjg7XHJcbiAgICAgICAgdmFsLmxvID0gKHZhbC5sbyA+Pj4gNyB8IHZhbC5oaSA8PCAyNSkgPj4+IDA7XHJcbiAgICAgICAgdmFsLmhpID4+Pj0gNztcclxuICAgIH1cclxuICAgIHdoaWxlICh2YWwubG8gPiAxMjcpIHtcclxuICAgICAgICBidWZbcG9zKytdID0gdmFsLmxvICYgMTI3IHwgMTI4O1xyXG4gICAgICAgIHZhbC5sbyA9IHZhbC5sbyA+Pj4gNztcclxuICAgIH1cclxuICAgIGJ1Zltwb3MrK10gPSB2YWwubG87XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYW4gdW5zaWduZWQgNjQgYml0IHZhbHVlIGFzIGEgdmFyaW50LlxyXG4gKiBAcGFyYW0ge0xvbmd8bnVtYmVyfHN0cmluZ30gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYHZhbHVlYCBpcyBhIHN0cmluZyBhbmQgbm8gbG9uZyBsaWJyYXJ5IGlzIHByZXNlbnQuXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnVpbnQ2NCA9IGZ1bmN0aW9uIHdyaXRlX3VpbnQ2NCh2YWx1ZSkge1xyXG4gICAgdmFyIGJpdHMgPSBMb25nQml0cy5mcm9tKHZhbHVlKTtcclxuICAgIHJldHVybiB0aGlzLnB1c2god3JpdGVWYXJpbnQ2NCwgYml0cy5sZW5ndGgoKSwgYml0cyk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgc2lnbmVkIDY0IGJpdCB2YWx1ZSBhcyBhIHZhcmludC5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBgdmFsdWVgIGlzIGEgc3RyaW5nIGFuZCBubyBsb25nIGxpYnJhcnkgaXMgcHJlc2VudC5cclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuaW50NjQgPSBXcml0ZXIucHJvdG90eXBlLnVpbnQ2NDtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzaWduZWQgNjQgYml0IHZhbHVlIGFzIGEgdmFyaW50LCB6aWctemFnIGVuY29kZWQuXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBgdmFsdWVgIGlzIGEgc3RyaW5nIGFuZCBubyBsb25nIGxpYnJhcnkgaXMgcHJlc2VudC5cclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuc2ludDY0ID0gZnVuY3Rpb24gd3JpdGVfc2ludDY0KHZhbHVlKSB7XHJcbiAgICB2YXIgYml0cyA9IExvbmdCaXRzLmZyb20odmFsdWUpLnp6RW5jb2RlKCk7XHJcbiAgICByZXR1cm4gdGhpcy5wdXNoKHdyaXRlVmFyaW50NjQsIGJpdHMubGVuZ3RoKCksIGJpdHMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIGJvb2xpc2ggdmFsdWUgYXMgYSB2YXJpbnQuXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmJvb2wgPSBmdW5jdGlvbiB3cml0ZV9ib29sKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdGhpcy5wdXNoKHdyaXRlQnl0ZSwgMSwgdmFsdWUgPyAxIDogMCk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiB3cml0ZUZpeGVkMzIodmFsLCBidWYsIHBvcykge1xyXG4gICAgYnVmW3BvcyAgICBdID0gIHZhbCAgICAgICAgICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDFdID0gIHZhbCA+Pj4gOCAgICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDJdID0gIHZhbCA+Pj4gMTYgICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDNdID0gIHZhbCA+Pj4gMjQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYW4gdW5zaWduZWQgMzIgYml0IHZhbHVlIGFzIGZpeGVkIDMyIGJpdHMuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZml4ZWQzMiA9IGZ1bmN0aW9uIHdyaXRlX2ZpeGVkMzIodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLnB1c2god3JpdGVGaXhlZDMyLCA0LCB2YWx1ZSA+Pj4gMCk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgc2lnbmVkIDMyIGJpdCB2YWx1ZSBhcyBmaXhlZCAzMiBiaXRzLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5zZml4ZWQzMiA9IFdyaXRlci5wcm90b3R5cGUuZml4ZWQzMjtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYW4gdW5zaWduZWQgNjQgYml0IHZhbHVlIGFzIGZpeGVkIDY0IGJpdHMuXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBgdmFsdWVgIGlzIGEgc3RyaW5nIGFuZCBubyBsb25nIGxpYnJhcnkgaXMgcHJlc2VudC5cclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZml4ZWQ2NCA9IGZ1bmN0aW9uIHdyaXRlX2ZpeGVkNjQodmFsdWUpIHtcclxuICAgIHZhciBiaXRzID0gTG9uZ0JpdHMuZnJvbSh2YWx1ZSk7XHJcbiAgICByZXR1cm4gdGhpcy5wdXNoKHdyaXRlRml4ZWQzMiwgNCwgYml0cy5sbykucHVzaCh3cml0ZUZpeGVkMzIsIDQsIGJpdHMuaGkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIHNpZ25lZCA2NCBiaXQgdmFsdWUgYXMgZml4ZWQgNjQgYml0cy5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBgdmFsdWVgIGlzIGEgc3RyaW5nIGFuZCBubyBsb25nIGxpYnJhcnkgaXMgcHJlc2VudC5cclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuc2ZpeGVkNjQgPSBXcml0ZXIucHJvdG90eXBlLmZpeGVkNjQ7XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgZmxvYXQgKDMyIGJpdCkuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmZsb2F0ID0gZnVuY3Rpb24gd3JpdGVfZmxvYXQodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLnB1c2godXRpbC5mbG9hdC53cml0ZUZsb2F0TEUsIDQsIHZhbHVlKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBkb3VibGUgKDY0IGJpdCBmbG9hdCkuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmRvdWJsZSA9IGZ1bmN0aW9uIHdyaXRlX2RvdWJsZSh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHRoaXMucHVzaCh1dGlsLmZsb2F0LndyaXRlRG91YmxlTEUsIDgsIHZhbHVlKTtcclxufTtcclxuXHJcbnZhciB3cml0ZUJ5dGVzID0gdXRpbC5BcnJheS5wcm90b3R5cGUuc2V0XHJcbiAgICA/IGZ1bmN0aW9uIHdyaXRlQnl0ZXNfc2V0KHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICBidWYuc2V0KHZhbCwgcG9zKTsgLy8gYWxzbyB3b3JrcyBmb3IgcGxhaW4gYXJyYXkgdmFsdWVzXHJcbiAgICB9XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgOiBmdW5jdGlvbiB3cml0ZUJ5dGVzX2Zvcih2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWwubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyBpXSA9IHZhbFtpXTtcclxuICAgIH07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgc2VxdWVuY2Ugb2YgYnl0ZXMuXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheXxzdHJpbmd9IHZhbHVlIEJ1ZmZlciBvciBiYXNlNjQgZW5jb2RlZCBzdHJpbmcgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmJ5dGVzID0gZnVuY3Rpb24gd3JpdGVfYnl0ZXModmFsdWUpIHtcclxuICAgIHZhciBsZW4gPSB2YWx1ZS5sZW5ndGggPj4+IDA7XHJcbiAgICBpZiAoIWxlbilcclxuICAgICAgICByZXR1cm4gdGhpcy5wdXNoKHdyaXRlQnl0ZSwgMSwgMCk7XHJcbiAgICBpZiAodXRpbC5pc1N0cmluZyh2YWx1ZSkpIHtcclxuICAgICAgICB2YXIgYnVmID0gV3JpdGVyLmFsbG9jKGxlbiA9IGJhc2U2NC5sZW5ndGgodmFsdWUpKTtcclxuICAgICAgICBiYXNlNjQuZGVjb2RlKHZhbHVlLCBidWYsIDApO1xyXG4gICAgICAgIHZhbHVlID0gYnVmO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXMudWludDMyKGxlbikucHVzaCh3cml0ZUJ5dGVzLCBsZW4sIHZhbHVlKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuc3RyaW5nID0gZnVuY3Rpb24gd3JpdGVfc3RyaW5nKHZhbHVlKSB7XHJcbiAgICB2YXIgbGVuID0gdXRmOC5sZW5ndGgodmFsdWUpO1xyXG4gICAgcmV0dXJuIGxlblxyXG4gICAgICAgID8gdGhpcy51aW50MzIobGVuKS5wdXNoKHV0Zjgud3JpdGUsIGxlbiwgdmFsdWUpXHJcbiAgICAgICAgOiB0aGlzLnB1c2god3JpdGVCeXRlLCAxLCAwKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBGb3JrcyB0aGlzIHdyaXRlcidzIHN0YXRlIGJ5IHB1c2hpbmcgaXQgdG8gYSBzdGFjay5cclxuICogQ2FsbGluZyB7QGxpbmsgV3JpdGVyI3Jlc2V0fHJlc2V0fSBvciB7QGxpbmsgV3JpdGVyI2xkZWxpbXxsZGVsaW19IHJlc2V0cyB0aGUgd3JpdGVyIHRvIHRoZSBwcmV2aW91cyBzdGF0ZS5cclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmZvcmsgPSBmdW5jdGlvbiBmb3JrKCkge1xyXG4gICAgdGhpcy5zdGF0ZXMgPSBuZXcgU3RhdGUodGhpcyk7XHJcbiAgICB0aGlzLmhlYWQgPSB0aGlzLnRhaWwgPSBuZXcgT3Aobm9vcCwgMCwgMCk7XHJcbiAgICB0aGlzLmxlbiA9IDA7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNldHMgdGhpcyBpbnN0YW5jZSB0byB0aGUgbGFzdCBzdGF0ZS5cclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gcmVzZXQoKSB7XHJcbiAgICBpZiAodGhpcy5zdGF0ZXMpIHtcclxuICAgICAgICB0aGlzLmhlYWQgICA9IHRoaXMuc3RhdGVzLmhlYWQ7XHJcbiAgICAgICAgdGhpcy50YWlsICAgPSB0aGlzLnN0YXRlcy50YWlsO1xyXG4gICAgICAgIHRoaXMubGVuICAgID0gdGhpcy5zdGF0ZXMubGVuO1xyXG4gICAgICAgIHRoaXMuc3RhdGVzID0gdGhpcy5zdGF0ZXMubmV4dDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5oZWFkID0gdGhpcy50YWlsID0gbmV3IE9wKG5vb3AsIDAsIDApO1xyXG4gICAgICAgIHRoaXMubGVuICA9IDA7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNldHMgdG8gdGhlIGxhc3Qgc3RhdGUgYW5kIGFwcGVuZHMgdGhlIGZvcmsgc3RhdGUncyBjdXJyZW50IHdyaXRlIGxlbmd0aCBhcyBhIHZhcmludCBmb2xsb3dlZCBieSBpdHMgb3BlcmF0aW9ucy5cclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmxkZWxpbSA9IGZ1bmN0aW9uIGxkZWxpbSgpIHtcclxuICAgIHZhciBoZWFkID0gdGhpcy5oZWFkLFxyXG4gICAgICAgIHRhaWwgPSB0aGlzLnRhaWwsXHJcbiAgICAgICAgbGVuICA9IHRoaXMubGVuO1xyXG4gICAgdGhpcy5yZXNldCgpLnVpbnQzMihsZW4pO1xyXG4gICAgaWYgKGxlbikge1xyXG4gICAgICAgIHRoaXMudGFpbC5uZXh0ID0gaGVhZC5uZXh0OyAvLyBza2lwIG5vb3BcclxuICAgICAgICB0aGlzLnRhaWwgPSB0YWlsO1xyXG4gICAgICAgIHRoaXMubGVuICs9IGxlbjtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEZpbmlzaGVzIHRoZSB3cml0ZSBvcGVyYXRpb24uXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fSBGaW5pc2hlZCBidWZmZXJcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZmluaXNoID0gZnVuY3Rpb24gZmluaXNoKCkge1xyXG4gICAgdmFyIGhlYWQgPSB0aGlzLmhlYWQubmV4dCwgLy8gc2tpcCBub29wXHJcbiAgICAgICAgYnVmICA9IHRoaXMuY29uc3RydWN0b3IuYWxsb2ModGhpcy5sZW4pLFxyXG4gICAgICAgIHBvcyAgPSAwO1xyXG4gICAgd2hpbGUgKGhlYWQpIHtcclxuICAgICAgICBoZWFkLmZuKGhlYWQudmFsLCBidWYsIHBvcyk7XHJcbiAgICAgICAgcG9zICs9IGhlYWQubGVuO1xyXG4gICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XHJcbiAgICB9XHJcbiAgICAvLyB0aGlzLmhlYWQgPSB0aGlzLnRhaWwgPSBudWxsO1xyXG4gICAgcmV0dXJuIGJ1ZjtcclxufTtcclxuXHJcbldyaXRlci5fY29uZmlndXJlID0gZnVuY3Rpb24oQnVmZmVyV3JpdGVyXykge1xyXG4gICAgQnVmZmVyV3JpdGVyID0gQnVmZmVyV3JpdGVyXztcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyV3JpdGVyO1xyXG5cclxuLy8gZXh0ZW5kcyBXcml0ZXJcclxudmFyIFdyaXRlciA9IHJlcXVpcmUoXCIuL3dyaXRlclwiKTtcclxuKEJ1ZmZlcldyaXRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFdyaXRlci5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IEJ1ZmZlcldyaXRlcjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxudmFyIEJ1ZmZlciA9IHV0aWwuQnVmZmVyO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgYnVmZmVyIHdyaXRlciBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBXaXJlIGZvcm1hdCB3cml0ZXIgdXNpbmcgbm9kZSBidWZmZXJzLlxyXG4gKiBAZXh0ZW5kcyBXcml0ZXJcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBCdWZmZXJXcml0ZXIoKSB7XHJcbiAgICBXcml0ZXIuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFsbG9jYXRlcyBhIGJ1ZmZlciBvZiB0aGUgc3BlY2lmaWVkIHNpemUuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIEJ1ZmZlciBzaXplXHJcbiAqIEByZXR1cm5zIHtCdWZmZXJ9IEJ1ZmZlclxyXG4gKi9cclxuQnVmZmVyV3JpdGVyLmFsbG9jID0gZnVuY3Rpb24gYWxsb2NfYnVmZmVyKHNpemUpIHtcclxuICAgIHJldHVybiAoQnVmZmVyV3JpdGVyLmFsbG9jID0gdXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlKShzaXplKTtcclxufTtcclxuXHJcbnZhciB3cml0ZUJ5dGVzQnVmZmVyID0gQnVmZmVyICYmIEJ1ZmZlci5wcm90b3R5cGUgaW5zdGFuY2VvZiBVaW50OEFycmF5ICYmIEJ1ZmZlci5wcm90b3R5cGUuc2V0Lm5hbWUgPT09IFwic2V0XCJcclxuICAgID8gZnVuY3Rpb24gd3JpdGVCeXRlc0J1ZmZlcl9zZXQodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgIGJ1Zi5zZXQodmFsLCBwb3MpOyAvLyBmYXN0ZXIgdGhhbiBjb3B5IChyZXF1aXJlcyBub2RlID49IDQgd2hlcmUgQnVmZmVycyBleHRlbmQgVWludDhBcnJheSBhbmQgc2V0IGlzIHByb3Blcmx5IGluaGVyaXRlZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWxzbyB3b3JrcyBmb3IgcGxhaW4gYXJyYXkgdmFsdWVzXHJcbiAgICB9XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgOiBmdW5jdGlvbiB3cml0ZUJ5dGVzQnVmZmVyX2NvcHkodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgIGlmICh2YWwuY29weSkgLy8gQnVmZmVyIHZhbHVlc1xyXG4gICAgICAgICAgICB2YWwuY29weShidWYsIHBvcywgMCwgdmFsLmxlbmd0aCk7XHJcbiAgICAgICAgZWxzZSBmb3IgKHZhciBpID0gMDsgaSA8IHZhbC5sZW5ndGg7KSAvLyBwbGFpbiBhcnJheSB2YWx1ZXNcclxuICAgICAgICAgICAgYnVmW3BvcysrXSA9IHZhbFtpKytdO1xyXG4gICAgfTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcbkJ1ZmZlcldyaXRlci5wcm90b3R5cGUuYnl0ZXMgPSBmdW5jdGlvbiB3cml0ZV9ieXRlc19idWZmZXIodmFsdWUpIHtcclxuICAgIGlmICh1dGlsLmlzU3RyaW5nKHZhbHVlKSlcclxuICAgICAgICB2YWx1ZSA9IHV0aWwuX0J1ZmZlcl9mcm9tKHZhbHVlLCBcImJhc2U2NFwiKTtcclxuICAgIHZhciBsZW4gPSB2YWx1ZS5sZW5ndGggPj4+IDA7XHJcbiAgICB0aGlzLnVpbnQzMihsZW4pO1xyXG4gICAgaWYgKGxlbilcclxuICAgICAgICB0aGlzLnB1c2god3JpdGVCeXRlc0J1ZmZlciwgbGVuLCB2YWx1ZSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbmZ1bmN0aW9uIHdyaXRlU3RyaW5nQnVmZmVyKHZhbCwgYnVmLCBwb3MpIHtcclxuICAgIGlmICh2YWwubGVuZ3RoIDwgNDApIC8vIHBsYWluIGpzIGlzIGZhc3RlciBmb3Igc2hvcnQgc3RyaW5ncyAocHJvYmFibHkgZHVlIHRvIHJlZHVuZGFudCBhc3NlcnRpb25zKVxyXG4gICAgICAgIHV0aWwudXRmOC53cml0ZSh2YWwsIGJ1ZiwgcG9zKTtcclxuICAgIGVsc2VcclxuICAgICAgICBidWYudXRmOFdyaXRlKHZhbCwgcG9zKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuQnVmZmVyV3JpdGVyLnByb3RvdHlwZS5zdHJpbmcgPSBmdW5jdGlvbiB3cml0ZV9zdHJpbmdfYnVmZmVyKHZhbHVlKSB7XHJcbiAgICB2YXIgbGVuID0gQnVmZmVyLmJ5dGVMZW5ndGgodmFsdWUpO1xyXG4gICAgdGhpcy51aW50MzIobGVuKTtcclxuICAgIGlmIChsZW4pXHJcbiAgICAgICAgdGhpcy5wdXNoKHdyaXRlU3RyaW5nQnVmZmVyLCBsZW4sIHZhbHVlKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBGaW5pc2hlcyB0aGUgd3JpdGUgb3BlcmF0aW9uLlxyXG4gKiBAbmFtZSBCdWZmZXJXcml0ZXIjZmluaXNoXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7QnVmZmVyfSBGaW5pc2hlZCBidWZmZXJcclxuICovXHJcbiIsIi8qZXNsaW50LWRpc2FibGUgYmxvY2stc2NvcGVkLXZhciwgbm8tcmVkZWNsYXJlLCBuby1jb250cm9sLXJlZ2V4LCBuby1wcm90b3R5cGUtYnVpbHRpbnMqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciAkcHJvdG9idWYgPSByZXF1aXJlKFwicHJvdG9idWZqcy9taW5pbWFsXCIpO1xuXG4vLyBDb21tb24gYWxpYXNlc1xudmFyICRSZWFkZXIgPSAkcHJvdG9idWYuUmVhZGVyLCAkV3JpdGVyID0gJHByb3RvYnVmLldyaXRlciwgJHV0aWwgPSAkcHJvdG9idWYudXRpbDtcblxuLy8gRXhwb3J0ZWQgcm9vdCBuYW1lc3BhY2VcbnZhciAkcm9vdCA9ICRwcm90b2J1Zi5yb290c1tcImRlZmF1bHRcIl0gfHwgKCRwcm90b2J1Zi5yb290c1tcImRlZmF1bHRcIl0gPSB7fSk7XG5cbiRyb290LndlYnJlYWxtcyA9IChmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIE5hbWVzcGFjZSB3ZWJyZWFsbXMuXG4gICAgICogQGV4cG9ydHMgd2VicmVhbG1zXG4gICAgICogQG5hbWVzcGFjZVxuICAgICAqL1xuICAgIHZhciB3ZWJyZWFsbXMgPSB7fTtcblxuICAgIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBQcm90b2NvbE1lc3NhZ2UuXG4gICAgICAgICAqIEB0eXBlZGVmIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UkUHJvcGVydGllc1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKiBAcHJvcGVydHkge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuTWVzc2FnZVR5cGV9IFtUeXBlXSBQcm90b2NvbE1lc3NhZ2UgVHlwZS5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlJFByb3BlcnRpZXN9IFtQaW5nXSBQcm90b2NvbE1lc3NhZ2UgUGluZy5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXN9IFtQb25nXSBQcm90b2NvbE1lc3NhZ2UgUG9uZy5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSRQcm9wZXJ0aWVzfSBbSGVsbG9dIFByb3RvY29sTWVzc2FnZSBIZWxsby5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkJ5ZU1lc3NhZ2UkUHJvcGVydGllc30gW0J5ZV0gUHJvdG9jb2xNZXNzYWdlIEJ5ZS5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzfSBbUG9zaXRpb25dIFByb3RvY29sTWVzc2FnZSBQb3NpdGlvbi5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzfSBbUm90YXRpb25dIFByb3RvY29sTWVzc2FnZSBSb3RhdGlvbi5cbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgUHJvdG9jb2xNZXNzYWdlLlxuICAgICAgICAgKiBAZXhwb3J0cyB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gUHJvdG9jb2xNZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXlzW2ldXSA9IHByb3BlcnRpZXNba2V5c1tpXV07XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIFR5cGUuXG4gICAgICAgICAqIEB0eXBlIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLk1lc3NhZ2VUeXBlfVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5UeXBlID0gMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIFBpbmcuXG4gICAgICAgICAqIEB0eXBlIHsod2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZSRQcm9wZXJ0aWVzfG51bGwpfVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5QaW5nID0gbnVsbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIFBvbmcuXG4gICAgICAgICAqIEB0eXBlIHsod2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZSRQcm9wZXJ0aWVzfG51bGwpfVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5Qb25nID0gbnVsbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIEhlbGxvLlxuICAgICAgICAgKiBAdHlwZSB7KHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlJFByb3BlcnRpZXN8bnVsbCl9XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UucHJvdG90eXBlLkhlbGxvID0gbnVsbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIEJ5ZS5cbiAgICAgICAgICogQHR5cGUgeyh3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkJ5ZU1lc3NhZ2UkUHJvcGVydGllc3xudWxsKX1cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuQnllID0gbnVsbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIFBvc2l0aW9uLlxuICAgICAgICAgKiBAdHlwZSB7KHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlJFByb3BlcnRpZXN8bnVsbCl9XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UucHJvdG90eXBlLlBvc2l0aW9uID0gbnVsbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIFJvdGF0aW9uLlxuICAgICAgICAgKiBAdHlwZSB7KHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlJFByb3BlcnRpZXN8bnVsbCl9XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UucHJvdG90eXBlLlJvdGF0aW9uID0gbnVsbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBQcm90b2NvbE1lc3NhZ2UgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZX0gUHJvdG9jb2xNZXNzYWdlIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvdG9jb2xNZXNzYWdlKHByb3BlcnRpZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIFByb3RvY29sTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuVHlwZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJUeXBlXCIpKVxuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMSwgd2lyZVR5cGUgMCA9Ki84KS51aW50MzIobWVzc2FnZS5UeXBlKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlBpbmcgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUGluZ1wiKSlcbiAgICAgICAgICAgICAgICAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlLmVuY29kZShtZXNzYWdlLlBpbmcsIHdyaXRlci51aW50MzIoLyogaWQgMTYsIHdpcmVUeXBlIDIgPSovMTMwKS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUG9uZyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQb25nXCIpKVxuICAgICAgICAgICAgICAgICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UuZW5jb2RlKG1lc3NhZ2UuUG9uZywgd3JpdGVyLnVpbnQzMigvKiBpZCAxNywgd2lyZVR5cGUgMiA9Ki8xMzgpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5IZWxsbyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJIZWxsb1wiKSlcbiAgICAgICAgICAgICAgICAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZS5lbmNvZGUobWVzc2FnZS5IZWxsbywgd3JpdGVyLnVpbnQzMigvKiBpZCAxOCwgd2lyZVR5cGUgMiA9Ki8xNDYpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5CeWUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiQnllXCIpKVxuICAgICAgICAgICAgICAgICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZS5lbmNvZGUobWVzc2FnZS5CeWUsIHdyaXRlci51aW50MzIoLyogaWQgMTksIHdpcmVUeXBlIDIgPSovMTU0KS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUG9zaXRpb24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUG9zaXRpb25cIikpXG4gICAgICAgICAgICAgICAgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UuZW5jb2RlKG1lc3NhZ2UuUG9zaXRpb24sIHdyaXRlci51aW50MzIoLyogaWQgMjAsIHdpcmVUeXBlIDIgPSovMTYyKS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUm90YXRpb24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUm90YXRpb25cIikpXG4gICAgICAgICAgICAgICAgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UuZW5jb2RlKG1lc3NhZ2UuUm90YXRpb24sIHdyaXRlci51aW50MzIoLyogaWQgMjEsIHdpcmVUeXBlIDIgPSovMTcwKS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFByb3RvY29sTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikubGRlbGltKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlY29kZXMgYSBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlci5cbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlfSBQcm90b2NvbE1lc3NhZ2VcbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZSgpO1xuICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlR5cGUgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTY6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuUGluZyA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxNzpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5Qb25nID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZS5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE4OlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLkhlbGxvID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxOTpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5CeWUgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkJ5ZU1lc3NhZ2UuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyMDpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5Qb3NpdGlvbiA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuUm90YXRpb24gPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZS5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZX0gUHJvdG9jb2xNZXNzYWdlXG4gICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZlcmlmaWVzIGEgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2UuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuVHlwZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJUeXBlXCIpKVxuICAgICAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS5UeXBlKSB7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiVHlwZTogZW51bSB2YWx1ZSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICBjYXNlIDE2OlxuICAgICAgICAgICAgICAgIGNhc2UgMTc6XG4gICAgICAgICAgICAgICAgY2FzZSAxODpcbiAgICAgICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlBpbmcgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUGluZ1wiKSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UudmVyaWZ5KG1lc3NhZ2UuUGluZyk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJQaW5nLlwiICsgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Qb25nICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlBvbmdcIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLnZlcmlmeShtZXNzYWdlLlBvbmcpO1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiUG9uZy5cIiArIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuSGVsbG8gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiSGVsbG9cIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZS52ZXJpZnkobWVzc2FnZS5IZWxsbyk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJIZWxsby5cIiArIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuQnllICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIkJ5ZVwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZS52ZXJpZnkobWVzc2FnZS5CeWUpO1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiQnllLlwiICsgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Qb3NpdGlvbiAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQb3NpdGlvblwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlLnZlcmlmeShtZXNzYWdlLlBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlBvc2l0aW9uLlwiICsgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Sb3RhdGlvbiAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJSb3RhdGlvblwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlLnZlcmlmeShtZXNzYWdlLlJvdGF0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlJvdGF0aW9uLlwiICsgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIFByb3RvY29sTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2V9IFByb3RvY29sTWVzc2FnZVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UoKTtcbiAgICAgICAgICAgIHN3aXRjaCAob2JqZWN0LlR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJOT05FXCI6XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJQSU5HXCI6XG4gICAgICAgICAgICBjYXNlIDE2OlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDE2O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlBPTkdcIjpcbiAgICAgICAgICAgIGNhc2UgMTc6XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gMTc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiSEVMTE9cIjpcbiAgICAgICAgICAgIGNhc2UgMTg6XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gMTg7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiQllFXCI6XG4gICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDE5O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlBPU0lUSU9OX1JPVEFUSU9OXCI6XG4gICAgICAgICAgICBjYXNlIDIxOlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDIxO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5QaW5nICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5QaW5nICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nOiBvYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5QaW5nID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZS5mcm9tT2JqZWN0KG9iamVjdC5QaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QuUG9uZyAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QuUG9uZyAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZzogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuUG9uZyA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UuZnJvbU9iamVjdChvYmplY3QuUG9uZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LkhlbGxvICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5IZWxsbyAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG86IG9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLkhlbGxvID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UuZnJvbU9iamVjdChvYmplY3QuSGVsbG8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5CeWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LkJ5ZSAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllOiBvYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5CeWUgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkJ5ZU1lc3NhZ2UuZnJvbU9iamVjdChvYmplY3QuQnllKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QuUG9zaXRpb24gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LlBvc2l0aW9uICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbjogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuUG9zaXRpb24gPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZS5mcm9tT2JqZWN0KG9iamVjdC5Qb3NpdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LlJvdGF0aW9uICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5Sb3RhdGlvbiAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb246IG9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLlJvdGF0aW9uID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UuZnJvbU9iamVjdChvYmplY3QuUm90YXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLmZyb21PYmplY3R9LlxuICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZX0gUHJvdG9jb2xNZXNzYWdlXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuZnJvbSA9IFByb3RvY29sTWVzc2FnZS5mcm9tT2JqZWN0O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2V9IG1lc3NhZ2UgUHJvdG9jb2xNZXNzYWdlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QuVHlwZSA9IG9wdGlvbnMuZW51bXMgPT09IFN0cmluZyA/IFwiTk9ORVwiIDogMDtcbiAgICAgICAgICAgICAgICBvYmplY3QuUGluZyA9IG51bGw7XG4gICAgICAgICAgICAgICAgb2JqZWN0LlBvbmcgPSBudWxsO1xuICAgICAgICAgICAgICAgIG9iamVjdC5IZWxsbyA9IG51bGw7XG4gICAgICAgICAgICAgICAgb2JqZWN0LkJ5ZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgb2JqZWN0LlBvc2l0aW9uID0gbnVsbDtcbiAgICAgICAgICAgICAgICBvYmplY3QuUm90YXRpb24gPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuVHlwZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJUeXBlXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5UeXBlID0gb3B0aW9ucy5lbnVtcyA9PT0gU3RyaW5nID8gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5NZXNzYWdlVHlwZVttZXNzYWdlLlR5cGVdIDogbWVzc2FnZS5UeXBlO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUGluZyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQaW5nXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5QaW5nID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZS50b09iamVjdChtZXNzYWdlLlBpbmcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUG9uZyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQb25nXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5Qb25nID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZS50b09iamVjdChtZXNzYWdlLlBvbmcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuSGVsbG8gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiSGVsbG9cIikpXG4gICAgICAgICAgICAgICAgb2JqZWN0LkhlbGxvID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UudG9PYmplY3QobWVzc2FnZS5IZWxsbywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5CeWUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiQnllXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5CeWUgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkJ5ZU1lc3NhZ2UudG9PYmplY3QobWVzc2FnZS5CeWUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUG9zaXRpb24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUG9zaXRpb25cIikpXG4gICAgICAgICAgICAgICAgb2JqZWN0LlBvc2l0aW9uID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UudG9PYmplY3QobWVzc2FnZS5Qb3NpdGlvbiwgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Sb3RhdGlvbiAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJSb3RhdGlvblwiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QuUm90YXRpb24gPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZS50b09iamVjdChtZXNzYWdlLlJvdGF0aW9uLCBvcHRpb25zKTtcbiAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSB0aGlzIFByb3RvY29sTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3Qob3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgb3B0aW9ucyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnZlcnRzIHRoaXMgUHJvdG9jb2xNZXNzYWdlIHRvIEpTT04uXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gSlNPTiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1lc3NhZ2VUeXBlIGVudW0uXG4gICAgICAgICAqIEBuYW1lIE1lc3NhZ2VUeXBlXG4gICAgICAgICAqIEBtZW1iZXJvZiB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlXG4gICAgICAgICAqIEBlbnVtIHtudW1iZXJ9XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBOT05FPTAgTk9ORSB2YWx1ZVxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gUElORz0xNiBQSU5HIHZhbHVlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBQT05HPTE3IFBPTkcgdmFsdWVcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IEhFTExPPTE4IEhFTExPIHZhbHVlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBCWUU9MTkgQllFIHZhbHVlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBQT1NJVElPTl9ST1RBVElPTj0yMSBQT1NJVElPTl9ST1RBVElPTiB2YWx1ZVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLk1lc3NhZ2VUeXBlID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlc0J5SWQgPSB7fSwgdmFsdWVzID0gT2JqZWN0LmNyZWF0ZSh2YWx1ZXNCeUlkKTtcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzBdID0gXCJOT05FXCJdID0gMDtcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzE2XSA9IFwiUElOR1wiXSA9IDE2O1xuICAgICAgICAgICAgdmFsdWVzW3ZhbHVlc0J5SWRbMTddID0gXCJQT05HXCJdID0gMTc7XG4gICAgICAgICAgICB2YWx1ZXNbdmFsdWVzQnlJZFsxOF0gPSBcIkhFTExPXCJdID0gMTg7XG4gICAgICAgICAgICB2YWx1ZXNbdmFsdWVzQnlJZFsxOV0gPSBcIkJZRVwiXSA9IDE5O1xuICAgICAgICAgICAgdmFsdWVzW3ZhbHVlc0J5SWRbMjFdID0gXCJQT1NJVElPTl9ST1RBVElPTlwiXSA9IDIxO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFBpbmdNZXNzYWdlLlxuICAgICAgICAgICAgICogQHR5cGVkZWYgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZSRQcm9wZXJ0aWVzXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBQaW5nTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBleHBvcnRzIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2VcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb24gUGluZ01lc3NhZ2UocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2tleXNbaV1dICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXlzW2ldXSA9IHByb3BlcnRpZXNba2V5c1tpXV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBQaW5nTWVzc2FnZSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2V9IFBpbmdNZXNzYWdlIGluc3RhbmNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQaW5nTWVzc2FnZShwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFBpbmdNZXNzYWdlIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBQaW5nTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQaW5nTWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFBpbmdNZXNzYWdlIG1lc3NhZ2UsIGxlbmd0aCBkZWxpbWl0ZWQuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBQaW5nTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQaW5nTWVzc2FnZS5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikubGRlbGltKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBQaW5nTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2V9IFBpbmdNZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBQaW5nTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLCBsZW5ndGggZGVsaW1pdGVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZX0gUGluZ01lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUGluZ01lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmVyaWZpZXMgYSBQaW5nTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeShtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgUGluZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2V9IFBpbmdNZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgUGluZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZS5mcm9tT2JqZWN0fS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2V9IFBpbmdNZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLmZyb20gPSBQaW5nTWVzc2FnZS5mcm9tT2JqZWN0O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIFBpbmdNZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZX0gbWVzc2FnZSBQaW5nTWVzc2FnZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gdGhpcyBQaW5nTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUGluZ01lc3NhZ2UucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3Qob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIFBpbmdNZXNzYWdlIHRvIEpTT04uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gUGluZ01lc3NhZ2U7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBQb25nTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UkUHJvcGVydGllc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgUG9uZ01lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAZXhwb3J0cyB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlXG4gICAgICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIFBvbmdNZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgUG9uZ01lc3NhZ2UgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlfSBQb25nTWVzc2FnZSBpbnN0YW5jZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUG9uZ01lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBQb25nTWVzc2FnZSBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUG9uZ01lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9uZ01lc3NhZ2UuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBQb25nTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUG9uZ01lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9uZ01lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgUG9uZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIE1lc3NhZ2UgbGVuZ3RoIGlmIGtub3duIGJlZm9yZWhhbmRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlfSBQb25nTWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgICAgICB2YXIgZW5kID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyByZWFkZXIubGVuIDogcmVhZGVyLnBvcyArIGxlbmd0aCwgbWVzc2FnZSA9IG5ldyAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgUG9uZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2V9IFBvbmdNZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvbmdNZXNzYWdlLmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlcihyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFZlcmlmaWVzIGEgUG9uZ01lc3NhZ2UgbWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgICAgICogQHJldHVybnMgez9zdHJpbmd9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFBvbmdNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlfSBQb25nTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFBvbmdNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlfSBQb25nTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5mcm9tID0gUG9uZ01lc3NhZ2UuZnJvbU9iamVjdDtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBQb25nTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2V9IG1lc3NhZ2UgUG9uZ01lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgUG9uZ01lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvbmdNZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgdGhpcyBQb25nTWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIFBvbmdNZXNzYWdlO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIEhlbGxvTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlJFByb3BlcnRpZXNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge1VpbnQ4QXJyYXl9IFtJZF0gSGVsbG9NZXNzYWdlIElkLlxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFtOYW1lXSBIZWxsb01lc3NhZ2UgTmFtZS5cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgSGVsbG9NZXNzYWdlLlxuICAgICAgICAgICAgICogQGV4cG9ydHMgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2VcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIEhlbGxvTWVzc2FnZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBIZWxsb01lc3NhZ2UgSWQuXG4gICAgICAgICAgICAgKiBAdHlwZSB7VWludDhBcnJheX1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgSGVsbG9NZXNzYWdlLnByb3RvdHlwZS5JZCA9ICR1dGlsLm5ld0J1ZmZlcihbXSk7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSGVsbG9NZXNzYWdlIE5hbWUuXG4gICAgICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBIZWxsb01lc3NhZ2UucHJvdG90eXBlLk5hbWUgPSBcIlwiO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgSGVsbG9NZXNzYWdlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlfSBIZWxsb01lc3NhZ2UgaW5zdGFuY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgSGVsbG9NZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBIZWxsb01lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBIZWxsb01lc3NhZ2UgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgSGVsbG9NZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuSWQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiSWRcIikpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMSwgd2lyZVR5cGUgMiA9Ki8xMCkuYnl0ZXMobWVzc2FnZS5JZCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuTmFtZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJOYW1lXCIpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDIsIHdpcmVUeXBlIDIgPSovMTgpLnN0cmluZyhtZXNzYWdlLk5hbWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBIZWxsb01lc3NhZ2UgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgSGVsbG9NZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikubGRlbGltKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBIZWxsb01lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIE1lc3NhZ2UgbGVuZ3RoIGlmIGtub3duIGJlZm9yZWhhbmRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZX0gSGVsbG9NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgICAgICB2YXIgZW5kID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyByZWFkZXIubGVuIDogcmVhZGVyLnBvcyArIGxlbmd0aCwgbWVzc2FnZSA9IG5ldyAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuSWQgPSByZWFkZXIuYnl0ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLk5hbWUgPSByZWFkZXIuc3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgSGVsbG9NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZX0gSGVsbG9NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIEhlbGxvTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5JZCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJJZFwiKSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS5JZCAmJiB0eXBlb2YgbWVzc2FnZS5JZC5sZW5ndGggPT09IFwibnVtYmVyXCIgfHwgJHV0aWwuaXNTdHJpbmcobWVzc2FnZS5JZCkpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiSWQ6IGJ1ZmZlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLk5hbWUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiTmFtZVwiKSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkdXRpbC5pc1N0cmluZyhtZXNzYWdlLk5hbWUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiTmFtZTogc3RyaW5nIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBIZWxsb01lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlfSBIZWxsb01lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgSGVsbG9NZXNzYWdlLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QuSWQgIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QuSWQgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAkdXRpbC5iYXNlNjQuZGVjb2RlKG9iamVjdC5JZCwgbWVzc2FnZS5JZCA9ICR1dGlsLm5ld0J1ZmZlcigkdXRpbC5iYXNlNjQubGVuZ3RoKG9iamVjdC5JZCkpLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAob2JqZWN0LklkLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuSWQgPSBvYmplY3QuSWQ7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdC5OYW1lICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuTmFtZSA9IFN0cmluZyhvYmplY3QuTmFtZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBIZWxsb01lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZX0gSGVsbG9NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5mcm9tID0gSGVsbG9NZXNzYWdlLmZyb21PYmplY3Q7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgSGVsbG9NZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2V9IG1lc3NhZ2UgSGVsbG9NZXNzYWdlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgSGVsbG9NZXNzYWdlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmICghb3B0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5kZWZhdWx0cykge1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QuSWQgPSBvcHRpb25zLmJ5dGVzID09PSBTdHJpbmcgPyBcIlwiIDogW107XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5OYW1lID0gXCJcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuSWQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiSWRcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5JZCA9IG9wdGlvbnMuYnl0ZXMgPT09IFN0cmluZyA/ICR1dGlsLmJhc2U2NC5lbmNvZGUobWVzc2FnZS5JZCwgMCwgbWVzc2FnZS5JZC5sZW5ndGgpIDogb3B0aW9ucy5ieXRlcyA9PT0gQXJyYXkgPyBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChtZXNzYWdlLklkKSA6IG1lc3NhZ2UuSWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuTmFtZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJOYW1lXCIpKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuTmFtZSA9IG1lc3NhZ2UuTmFtZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gdGhpcyBIZWxsb01lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIHRoaXMgSGVsbG9NZXNzYWdlIHRvIEpTT04uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIEhlbGxvTWVzc2FnZTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZSA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQcm9wZXJ0aWVzIG9mIGEgQnllTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZSRQcm9wZXJ0aWVzXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBCeWVNZXNzYWdlLlxuICAgICAgICAgICAgICogQGV4cG9ydHMgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5CeWVNZXNzYWdlXG4gICAgICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5CeWVNZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb24gQnllTWVzc2FnZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IEJ5ZU1lc3NhZ2UgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkJ5ZU1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZX0gQnllTWVzc2FnZSBpbnN0YW5jZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBCeWVNZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCeWVNZXNzYWdlKHByb3BlcnRpZXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgQnllTWVzc2FnZSBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkJ5ZU1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIEJ5ZU1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQnllTWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIEJ5ZU1lc3NhZ2UgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5CeWVNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkJ5ZU1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBCeWVNZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEJ5ZU1lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgQnllTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZX0gQnllTWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBCeWVNZXNzYWdlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIEJ5ZU1lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZX0gQnllTWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBCeWVNZXNzYWdlLmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlcihyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFZlcmlmaWVzIGEgQnllTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEJ5ZU1lc3NhZ2UudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UgIT09IFwib2JqZWN0XCIgfHwgbWVzc2FnZSA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBCeWVNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkJ5ZU1lc3NhZ2V9IEJ5ZU1lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQnllTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5CeWVNZXNzYWdlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5CeWVNZXNzYWdlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBCeWVNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZS5mcm9tT2JqZWN0fS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZX0gQnllTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBCeWVNZXNzYWdlLmZyb20gPSBCeWVNZXNzYWdlLmZyb21PYmplY3Q7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgQnllTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQnllTWVzc2FnZX0gbWVzc2FnZSBCeWVNZXNzYWdlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQnllTWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgQnllTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQnllTWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIHRoaXMgQnllTWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBCeWVNZXNzYWdlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gQnllTWVzc2FnZTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBQb3NpdGlvbk1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAdHlwZWRlZiB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IFtYXSBQb3NpdGlvbk1lc3NhZ2UgWC5cbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBbWV0gUG9zaXRpb25NZXNzYWdlIFkuXG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gW1pdIFBvc2l0aW9uTWVzc2FnZSBaLlxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBQb3NpdGlvbk1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAZXhwb3J0cyB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZVxuICAgICAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb24gUG9zaXRpb25NZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFBvc2l0aW9uTWVzc2FnZSBYLlxuICAgICAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9zaXRpb25NZXNzYWdlLnByb3RvdHlwZS5YID0gMDtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQb3NpdGlvbk1lc3NhZ2UgWS5cbiAgICAgICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5wcm90b3R5cGUuWSA9IDA7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUG9zaXRpb25NZXNzYWdlIFouXG4gICAgICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UucHJvdG90eXBlLlogPSAwO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgUG9zaXRpb25NZXNzYWdlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlfSBQb3NpdGlvbk1lc3NhZ2UgaW5zdGFuY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9zaXRpb25NZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQb3NpdGlvbk1lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBQb3NpdGlvbk1lc3NhZ2UgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUG9zaXRpb25NZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJYXCIpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDEsIHdpcmVUeXBlIDUgPSovMTMpLmZsb2F0KG1lc3NhZ2UuWCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJZXCIpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDIsIHdpcmVUeXBlIDUgPSovMjEpLmZsb2F0KG1lc3NhZ2UuWSk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWiAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJaXCIpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDMsIHdpcmVUeXBlIDUgPSovMjkpLmZsb2F0KG1lc3NhZ2UuWik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBQb3NpdGlvbk1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9zaXRpb25NZXNzYWdlLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlfSBQb3NpdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9zaXRpb25NZXNzYWdlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5YID0gcmVhZGVyLmZsb2F0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5ZID0gcmVhZGVyLmZsb2F0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5aID0gcmVhZGVyLmZsb2F0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgUG9zaXRpb25NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZX0gUG9zaXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5YICE9PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiWDogbnVtYmVyIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJZXCIpKVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UuWSAhPT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlk6IG51bWJlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlogIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiWlwiKSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLlogIT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJaOiBudW1iZXIgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2V9IFBvc2l0aW9uTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UuZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdC5YICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuWCA9IE51bWJlcihvYmplY3QuWCk7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdC5ZICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuWSA9IE51bWJlcihvYmplY3QuWSk7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdC5aICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuWiA9IE51bWJlcihvYmplY3QuWik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBQb3NpdGlvbk1lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZX0gUG9zaXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5mcm9tID0gUG9zaXRpb25NZXNzYWdlLmZyb21PYmplY3Q7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgUG9zaXRpb25NZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2V9IG1lc3NhZ2UgUG9zaXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9zaXRpb25NZXNzYWdlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmICghb3B0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5kZWZhdWx0cykge1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QuWCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5ZID0gMDtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlogPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5YID0gbWVzc2FnZS5YO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlkgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiWVwiKSlcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlkgPSBtZXNzYWdlLlk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWiAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJaXCIpKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuWiA9IG1lc3NhZ2UuWjtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gdGhpcyBQb3NpdGlvbk1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIHRoaXMgUG9zaXRpb25NZXNzYWdlIHRvIEpTT04uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIFBvc2l0aW9uTWVzc2FnZTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBSb3RhdGlvbk1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAdHlwZWRlZiB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IFtYXSBSb3RhdGlvbk1lc3NhZ2UgWC5cbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBbWV0gUm90YXRpb25NZXNzYWdlIFkuXG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gW1pdIFJvdGF0aW9uTWVzc2FnZSBaLlxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IFtXXSBSb3RhdGlvbk1lc3NhZ2UgVy5cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgUm90YXRpb25NZXNzYWdlLlxuICAgICAgICAgICAgICogQGV4cG9ydHMgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIFJvdGF0aW9uTWVzc2FnZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSb3RhdGlvbk1lc3NhZ2UgWC5cbiAgICAgICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS5wcm90b3R5cGUuWCA9IDA7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUm90YXRpb25NZXNzYWdlIFkuXG4gICAgICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UucHJvdG90eXBlLlkgPSAwO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJvdGF0aW9uTWVzc2FnZSBaLlxuICAgICAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLnByb3RvdHlwZS5aID0gMDtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSb3RhdGlvbk1lc3NhZ2UgVy5cbiAgICAgICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS5wcm90b3R5cGUuVyA9IDA7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBSb3RhdGlvbk1lc3NhZ2UgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2V9IFJvdGF0aW9uTWVzc2FnZSBpbnN0YW5jZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFJvdGF0aW9uTWVzc2FnZShwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBSb3RhdGlvbk1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMSwgd2lyZVR5cGUgNSA9Ki8xMykuZmxvYXQobWVzc2FnZS5YKTtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5ZICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIllcIikpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMiwgd2lyZVR5cGUgNSA9Ki8yMSkuZmxvYXQobWVzc2FnZS5ZKTtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5aICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlpcIikpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMywgd2lyZVR5cGUgNSA9Ki8yOSkuZmxvYXQobWVzc2FnZS5aKTtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5XICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIldcIikpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgNCwgd2lyZVR5cGUgNSA9Ki8zNykuZmxvYXQobWVzc2FnZS5XKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgUm90YXRpb25NZXNzYWdlIG1lc3NhZ2UsIGxlbmd0aCBkZWxpbWl0ZWQuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgUm90YXRpb25NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2V9IFJvdGF0aW9uTWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlggPSByZWFkZXIuZmxvYXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlkgPSByZWFkZXIuZmxvYXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlogPSByZWFkZXIuZmxvYXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlcgPSByZWFkZXIuZmxvYXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBSb3RhdGlvbk1lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlfSBSb3RhdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlcihyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFZlcmlmaWVzIGEgUm90YXRpb25NZXNzYWdlIG1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIFBsYWluIG9iamVjdCB0byB2ZXJpZnlcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHs/c3RyaW5nfSBgbnVsbGAgaWYgdmFsaWQsIG90aGVyd2lzZSB0aGUgcmVhc29uIHdoeSBpdCBpcyBub3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeShtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlggIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiWFwiKSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLlggIT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJYOiBudW1iZXIgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5ZICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIllcIikpXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5ZICE9PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiWTogbnVtYmVyIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWiAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJaXCIpKVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UuWiAhPT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlo6IG51bWJlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlcgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiV1wiKSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLlcgIT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJXOiBudW1iZXIgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2V9IFJvdGF0aW9uTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UuZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdC5YICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuWCA9IE51bWJlcihvYmplY3QuWCk7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdC5ZICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuWSA9IE51bWJlcihvYmplY3QuWSk7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdC5aICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuWiA9IE51bWJlcihvYmplY3QuWik7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdC5XICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuVyA9IE51bWJlcihvYmplY3QuVyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBSb3RhdGlvbk1lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZX0gUm90YXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS5mcm9tID0gUm90YXRpb25NZXNzYWdlLmZyb21PYmplY3Q7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgUm90YXRpb25NZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2V9IG1lc3NhZ2UgUm90YXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmICghb3B0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5kZWZhdWx0cykge1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QuWCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5ZID0gMDtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlogPSAwO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QuVyA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlggIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiWFwiKSlcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlggPSBtZXNzYWdlLlg7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJZXCIpKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuWSA9IG1lc3NhZ2UuWTtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5aICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlpcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5aID0gbWVzc2FnZS5aO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlcgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiV1wiKSlcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlcgPSBtZXNzYWdlLlc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgUm90YXRpb25NZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3Qob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIFJvdGF0aW9uTWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBSb3RhdGlvbk1lc3NhZ2U7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgcmV0dXJuIFByb3RvY29sTWVzc2FnZTtcbiAgICB9KSgpO1xuXG4gICAgcmV0dXJuIHdlYnJlYWxtcztcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gJHJvb3Q7XG4iLCJpbXBvcnQgKiBhcyBCeXRlQnVmZmVyIGZyb20gJ2J5dGVidWZmZXInO1xyXG5pbXBvcnQgKiBhcyBQcm90b0J1ZiBmcm9tICdwcm90b2J1ZmpzJztcclxuaW1wb3J0ICogYXMgcm9vdCBmcm9tICcuLi9wcm90by93ZWJyZWFsbXMucHJvdG8uanMnXHJcblxyXG5leHBvcnQgY2xhc3MgV29ya2Vye1xyXG4gICAgcHJpdmF0ZSBzb2NrZXQ7XHJcbiAgICBwcml2YXRlIGJ1aWxkZXI7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgbGV0IG1lc3NhZ2UgPSByb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2U7XHJcbiAgICAgICAgbGV0IHNvY2tldCA9IHRoaXMuc29ja2V0ID0gbmV3IFdlYlNvY2tldCh3aW5kb3cuZG9jdW1lbnQubG9jYXRpb24uaHJlZi5yZXBsYWNlKFwiaHR0cFwiLFwid3NcIikpO1xyXG5cclxuICAgICAgICBzb2NrZXQub25vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk9wZW5pbmcgYSBjb25uZWN0aW9uLi4uXCIpO1xyXG4gICAgICAgICAgICBzb2NrZXQuc2VuZCgnTVNHJyk7XHJcbiAgICAgICAgICAgIHNvY2tldC5iaW5hcnlUeXBlID0gXCJhcnJheWJ1ZmZlclwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc29ja2V0Lm9uY2xvc2UgPSBmdW5jdGlvbihldnQ6IENsb3NlRXZlbnQpIHtcclxuICAgICAgICAgICAgcG9zdE1lc3NhZ2UoXCJkaXNjb25uZWN0XCIsXCIqXCIsW2V2dC50eXBlXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHNvY2tldC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICBwb3N0TWVzc2FnZShcIm1lc3NhZ2VcIixcIipcIixbbWVzc2FnZS5kZWNvZGUoZXZlbnQuZGF0YSldKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9ubWVzc2FnZShhcmdzKSB7XHJcbiAgICAgICAgc2VsZi5wb3N0TWVzc2FnZShcIllvdSBzYWlkOiBcIiArIGFyZ3MuZGF0YSxcIipcIik7XHJcbiAgICB9O1xyXG5cclxufVxyXG4iXX0=
