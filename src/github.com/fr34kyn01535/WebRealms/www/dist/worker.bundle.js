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
module.exports = codegen;

var blockOpenRe  = /[{[]$/,
    blockCloseRe = /^[}\]]/,
    casingRe     = /:$/,
    branchRe     = /^\s*(?:if|}?else if|while|for)\b|\b(?:else)\s*$/,
    breakRe      = /\b(?:break|continue)(?: \w+)?;?$|^\s*return\b/;

/**
 * A closure for generating functions programmatically.
 * @memberof util
 * @namespace
 * @function
 * @param {...string} params Function parameter names
 * @returns {Codegen} Codegen instance
 * @property {boolean} supported Whether code generation is supported by the environment.
 * @property {boolean} verbose=false When set to true, codegen will log generated code to console. Useful for debugging.
 * @property {function(string, ...*):string} sprintf Underlying sprintf implementation
 */
function codegen() {
    var params = [],
        src    = [],
        indent = 1,
        inCase = false;
    for (var i = 0; i < arguments.length;)
        params.push(arguments[i++]);

    /**
     * A codegen instance as returned by {@link codegen}, that also is a sprintf-like appender function.
     * @typedef Codegen
     * @type {function}
     * @param {string} format Format string
     * @param {...*} args Replacements
     * @returns {Codegen} Itself
     * @property {function(string=):string} str Stringifies the so far generated function source.
     * @property {function(string=, Object=):function} eof Ends generation and builds the function whilst applying a scope.
     */
    /**/
    function gen() {
        var args = [],
            i = 0;
        for (; i < arguments.length;)
            args.push(arguments[i++]);
        var line = sprintf.apply(null, args);
        var level = indent;
        if (src.length) {
            var prev = src[src.length - 1];

            // block open or one time branch
            if (blockOpenRe.test(prev))
                level = ++indent; // keep
            else if (branchRe.test(prev))
                ++level; // once

            // casing
            if (casingRe.test(prev) && !casingRe.test(line)) {
                level = ++indent;
                inCase = true;
            } else if (inCase && breakRe.test(prev)) {
                level = --indent;
                inCase = false;
            }

            // block close
            if (blockCloseRe.test(line))
                level = --indent;
        }
        for (i = 0; i < level; ++i)
            line = "\t" + line;
        src.push(line);
        return gen;
    }

    /**
     * Stringifies the so far generated function source.
     * @param {string} [name] Function name, defaults to generate an anonymous function
     * @returns {string} Function source using tabs for indentation
     * @inner
     */
    function str(name) {
        return "function" + (name ? " " + name.replace(/[^\w_$]/g, "_") : "") + "(" + params.join(",") + ") {\n" + src.join("\n") + "\n}";
    }

    gen.str = str;

    /**
     * Ends generation and builds the function whilst applying a scope.
     * @param {string} [name] Function name, defaults to generate an anonymous function
     * @param {Object.<string,*>} [scope] Function scope
     * @returns {function} The generated function, with scope applied if specified
     * @inner
     */
    function eof(name, scope) {
        if (typeof name === "object") {
            scope = name;
            name = undefined;
        }
        var source = gen.str(name);
        if (codegen.verbose)
            console.log("--- codegen ---\n" + source.replace(/^/mg, "> ").replace(/\t/g, "  ")); // eslint-disable-line no-console
        var keys = Object.keys(scope || (scope = {}));
        return Function.apply(null, keys.concat("return " + source)).apply(null, keys.map(function(key) { return scope[key]; })); // eslint-disable-line no-new-func
        //     ^ Creates a wrapper function with the scoped variable names as its parameters,
        //       calls it with the respective scoped variable values ^
        //       and returns our brand-new properly scoped function.
        //
        // This works because "Invoking the Function constructor as a function (without using the
        // new operator) has the same effect as invoking it as a constructor."
        // https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Function
    }

    gen.eof = eof;

    return gen;
}

function sprintf(format) {
    var args = [],
        i = 1;
    for (; i < arguments.length;)
        args.push(arguments[i++]);
    i = 0;
    format = format.replace(/%([dfjs])/g, function($0, $1) {
        switch ($1) {
            case "d":
                return Math.floor(args[i++]);
            case "f":
                return Number(args[i++]);
            case "j":
                return JSON.stringify(args[i++]);
            default:
                return args[i++];
        }
    });
    if (i !== args.length)
        throw Error("argument count mismatch");
    return format;
}

codegen.sprintf   = sprintf;
codegen.supported = false; try { codegen.supported = codegen("a","b")("return a-b").eof()(2,1) === 1; } catch (e) {} // eslint-disable-line no-empty
codegen.verbose   = false;

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
"use strict";
module.exports = fetch;

var asPromise = require("@protobufjs/aspromise"),
    inquire   = require("@protobufjs/inquire");

var fs = inquire("fs");

/**
 * Node-style callback as used by {@link util.fetch}.
 * @typedef FetchCallback
 * @type {function}
 * @param {?Error} error Error, if any, otherwise `null`
 * @param {string} [contents] File contents, if there hasn't been an error
 * @returns {undefined}
 */

/**
 * Options as used by {@link util.fetch}.
 * @typedef FetchOptions
 * @type {Object}
 * @property {boolean} [binary=false] Whether expecting a binary response
 * @property {boolean} [xhr=false] If `true`, forces the use of XMLHttpRequest
 */

/**
 * Fetches the contents of a file.
 * @memberof util
 * @param {string} filename File path or url
 * @param {FetchOptions} options Fetch options
 * @param {FetchCallback} callback Callback function
 * @returns {undefined}
 */
function fetch(filename, options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = {};
    } else if (!options)
        options = {};

    if (!callback)
        return asPromise(fetch, this, filename, options); // eslint-disable-line no-invalid-this

    // if a node-like filesystem is present, try it first but fall back to XHR if nothing is found.
    if (!options.xhr && fs && fs.readFile)
        return fs.readFile(filename, function fetchReadFileCallback(err, contents) {
            return err && typeof XMLHttpRequest !== "undefined"
                ? fetch.xhr(filename, options, callback)
                : err
                ? callback(err)
                : callback(null, options.binary ? contents : contents.toString("utf8"));
        });

    // use the XHR version otherwise.
    return fetch.xhr(filename, options, callback);
}

/**
 * Fetches the contents of a file.
 * @name util.fetch
 * @function
 * @param {string} path File path or url
 * @param {FetchCallback} callback Callback function
 * @returns {undefined}
 * @variation 2
 */

/**
 * Fetches the contents of a file.
 * @name util.fetch
 * @function
 * @param {string} path File path or url
 * @param {FetchOptions} [options] Fetch options
 * @returns {Promise<string|Uint8Array>} Promise
 * @variation 3
 */

/**/
fetch.xhr = function fetch_xhr(filename, options, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange /* works everywhere */ = function fetchOnReadyStateChange() {

        if (xhr.readyState !== 4)
            return undefined;

        // local cors security errors return status 0 / empty string, too. afaik this cannot be
        // reliably distinguished from an actually empty file for security reasons. feel free
        // to send a pull request if you are aware of a solution.
        if (xhr.status !== 0 && xhr.status !== 200)
            return callback(Error("status " + xhr.status));

        // if binary data is expected, make sure that some sort of array is returned, even if
        // ArrayBuffers are not supported. the binary string fallback, however, is unsafe.
        if (options.binary) {
            var buffer = xhr.response;
            if (!buffer) {
                buffer = [];
                for (var i = 0; i < xhr.responseText.length; ++i)
                    buffer.push(xhr.responseText.charCodeAt(i) & 255);
            }
            return callback(null, typeof Uint8Array !== "undefined" ? new Uint8Array(buffer) : buffer);
        }
        return callback(null, xhr.responseText);
    };

    if (options.binary) {
        // ref: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data#Receiving_binary_data_in_older_browsers
        if ("overrideMimeType" in xhr)
            xhr.overrideMimeType("text/plain; charset=x-user-defined");
        xhr.responseType = "arraybuffer";
    }

    xhr.open("GET", filename);
    xhr.send();
};

},{"@protobufjs/aspromise":1,"@protobufjs/inquire":7}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
"use strict";

/**
 * A minimal path module to resolve Unix, Windows and URL paths alike.
 * @memberof util
 * @namespace
 */
var path = exports;

var isAbsolute =
/**
 * Tests if the specified path is absolute.
 * @param {string} path Path to test
 * @returns {boolean} `true` if path is absolute
 */
path.isAbsolute = function isAbsolute(path) {
    return /^(?:\/|\w+:)/.test(path);
};

var normalize =
/**
 * Normalizes the specified path.
 * @param {string} path Path to normalize
 * @returns {string} Normalized path
 */
path.normalize = function normalize(path) {
    path = path.replace(/\\/g, "/")
               .replace(/\/{2,}/g, "/");
    var parts    = path.split("/"),
        absolute = isAbsolute(path),
        prefix   = "";
    if (absolute)
        prefix = parts.shift() + "/";
    for (var i = 0; i < parts.length;) {
        if (parts[i] === "..") {
            if (i > 0 && parts[i - 1] !== "..")
                parts.splice(--i, 2);
            else if (absolute)
                parts.splice(i, 1);
            else
                ++i;
        } else if (parts[i] === ".")
            parts.splice(i, 1);
        else
            ++i;
    }
    return prefix + parts.join("/");
};

/**
 * Resolves the specified include path against the specified origin path.
 * @param {string} originPath Path to the origin file
 * @param {string} includePath Include path relative to origin path
 * @param {boolean} [alreadyNormalized=false] `true` if both paths are already known to be normalized
 * @returns {string} Path to the include file
 */
path.resolve = function resolve(originPath, includePath, alreadyNormalized) {
    if (!alreadyNormalized)
        includePath = normalize(includePath);
    if (isAbsolute(includePath))
        return includePath;
    if (!alreadyNormalized)
        originPath = normalize(originPath);
    return (originPath = originPath.replace(/(?:\/|^)[^/]+$/, "")).length ? normalize(originPath + "/" + includePath) : includePath;
};

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
// full library entry point.

"use strict";
module.exports = require("./src/index");

},{"./src/index":22}],12:[function(require,module,exports){
// minimal library entry point.

"use strict";
module.exports = require("./src/index-minimal");

},{"./src/index-minimal":21}],13:[function(require,module,exports){
"use strict";
module.exports = Class;

var Message = require("./message"),
    util    = require("./util");

var Type; // cyclic

/**
 * Constructs a new message prototype for the specified reflected type and sets up its constructor.
 * @classdesc Runtime class providing the tools to create your own custom classes.
 * @constructor
 * @param {Type} type Reflected message type
 * @param {*} [ctor] Custom constructor to set up, defaults to create a generic one if omitted
 * @returns {Message} Message prototype
 */
function Class(type, ctor) {
    if (!Type)
        Type = require("./type");

    if (!(type instanceof Type))
        throw TypeError("type must be a Type");

    if (ctor) {
        if (typeof ctor !== "function")
            throw TypeError("ctor must be a function");
    } else
        ctor = Class.generate(type).eof(type.name); // named constructor function (codegen is required anyway)

    // Let's pretend...
    ctor.constructor = Class;

    // new Class() -> Message.prototype
    (ctor.prototype = new Message()).constructor = ctor;

    // Static methods on Message are instance methods on Class and vice versa
    util.merge(ctor, Message, true);

    // Classes and messages reference their reflected type
    ctor.$type = type;
    ctor.prototype.$type = type;

    // Messages have non-enumerable default values on their prototype
    var i = 0;
    for (; i < /* initializes */ type.fieldsArray.length; ++i) {
        // objects on the prototype must be immmutable. users must assign a new object instance and
        // cannot use Array#push on empty arrays on the prototype for example, as this would modify
        // the value on the prototype for ALL messages of this type. Hence, these objects are frozen.
        ctor.prototype[type._fieldsArray[i].name] = Array.isArray(type._fieldsArray[i].resolve().defaultValue)
            ? util.emptyArray
            : util.isObject(type._fieldsArray[i].defaultValue) && !type._fieldsArray[i].long
              ? util.emptyObject
              : type._fieldsArray[i].defaultValue; // if a long, it is frozen when initialized
    }

    // Messages have non-enumerable getters and setters for each virtual oneof field
    var ctorProperties = {};
    for (i = 0; i < /* initializes */ type.oneofsArray.length; ++i)
        ctorProperties[type._oneofsArray[i].resolve().name] = {
            get: util.oneOfGetter(type._oneofsArray[i].oneof),
            set: util.oneOfSetter(type._oneofsArray[i].oneof)
        };
    if (i)
        Object.defineProperties(ctor.prototype, ctorProperties);

    // Register
    type.ctor = ctor;

    return ctor.prototype;
}

/**
 * Generates a constructor function for the specified type.
 * @param {Type} type Type to use
 * @returns {Codegen} Codegen instance
 */
Class.generate = function generate(type) { // eslint-disable-line no-unused-vars
    /* eslint-disable no-unexpected-multiline */
    var gen = util.codegen("p");
    // explicitly initialize mutable object/array fields so that these aren't just inherited from the prototype
    for (var i = 0, field; i < type.fieldsArray.length; ++i)
        if ((field = type._fieldsArray[i]).map) gen
            ("this%s={}", util.safeProp(field.name));
        else if (field.repeated) gen
            ("this%s=[]", util.safeProp(field.name));
    return gen
    ("if(p)for(var ks=Object.keys(p),i=0;i<ks.length;++i)if(p[ks[i]]!=null)") // omit undefined or null
        ("this[ks[i]]=p[ks[i]]");
    /* eslint-enable no-unexpected-multiline */
};

/**
 * Constructs a new message prototype for the specified reflected type and sets up its constructor.
 * @function
 * @param {Type} type Reflected message type
 * @param {*} [ctor] Custom constructor to set up, defaults to create a generic one if omitted
 * @returns {Message} Message prototype
 * @deprecated since 6.7.0 it's possible to just assign a new constructor to {@link Type#ctor}
 */
Class.create = Class;

// Static methods on Message are instance methods on Class and vice versa
Class.prototype = Message;

/**
 * Creates a new message of this type from a plain object. Also converts values to their respective internal types.
 * @name Class#fromObject
 * @function
 * @param {Object.<string,*>} object Plain object
 * @returns {Message} Message instance
 */

/**
 * Creates a new message of this type from a plain object. Also converts values to their respective internal types.
 * This is an alias of {@link Class#fromObject}.
 * @name Class#from
 * @function
 * @param {Object.<string,*>} object Plain object
 * @returns {Message} Message instance
 */

/**
 * Creates a plain object from a message of this type. Also converts values to other types if specified.
 * @name Class#toObject
 * @function
 * @param {Message} message Message instance
 * @param {ConversionOptions} [options] Conversion options
 * @returns {Object.<string,*>} Plain object
 */

/**
 * Encodes a message of this type.
 * @name Class#encode
 * @function
 * @param {Message|Object.<string,*>} message Message to encode
 * @param {Writer} [writer] Writer to use
 * @returns {Writer} Writer
 */

/**
 * Encodes a message of this type preceeded by its length as a varint.
 * @name Class#encodeDelimited
 * @function
 * @param {Message|Object.<string,*>} message Message to encode
 * @param {Writer} [writer] Writer to use
 * @returns {Writer} Writer
 */

/**
 * Decodes a message of this type.
 * @name Class#decode
 * @function
 * @param {Reader|Uint8Array} reader Reader or buffer to decode
 * @returns {Message} Decoded message
 */

/**
 * Decodes a message of this type preceeded by its length as a varint.
 * @name Class#decodeDelimited
 * @function
 * @param {Reader|Uint8Array} reader Reader or buffer to decode
 * @returns {Message} Decoded message
 */

/**
 * Verifies a message of this type.
 * @name Class#verify
 * @function
 * @param {Message|Object.<string,*>} message Message or plain object to verify
 * @returns {?string} `null` if valid, otherwise the reason why it is not
 */

},{"./message":24,"./type":37,"./util":39}],14:[function(require,module,exports){
"use strict";
module.exports = common;

/**
 * Provides common type definitions.
 * Can also be used to provide additional google types or your own custom types.
 * @param {string} name Short name as in `google/protobuf/[name].proto` or full file name
 * @param {Object.<string,*>} json JSON definition within `google.protobuf` if a short name, otherwise the file's root definition
 * @returns {undefined}
 * @property {Object.<string,*>} google/protobuf/any.proto Any
 * @property {Object.<string,*>} google/protobuf/duration.proto Duration
 * @property {Object.<string,*>} google/protobuf/empty.proto Empty
 * @property {Object.<string,*>} google/protobuf/struct.proto Struct, Value, NullValue and ListValue
 * @property {Object.<string,*>} google/protobuf/timestamp.proto Timestamp
 * @property {Object.<string,*>} google/protobuf/wrappers.proto Wrappers
 * @example
 * // manually provides descriptor.proto (assumes google/protobuf/ namespace and .proto extension)
 * protobuf.common("descriptor", descriptorJson);
 *
 * // manually provides a custom definition (uses my.foo namespace)
 * protobuf.common("my/foo/bar.proto", myFooBarJson);
 */
function common(name, json) {
    if (!commonRe.test(name)) {
        name = "google/protobuf/" + name + ".proto";
        json = { nested: { google: { nested: { protobuf: { nested: json } } } } };
    }
    common[name] = json;
}

var commonRe = /\/|\./;

// Not provided because of limited use (feel free to discuss or to provide yourself):
//
// google/protobuf/descriptor.proto
// google/protobuf/field_mask.proto
// google/protobuf/source_context.proto
// google/protobuf/type.proto
//
// Stripped and pre-parsed versions of these non-bundled files are instead available as part of
// the repository or package within the google/protobuf directory.

common("any", {
    Any: {
        fields: {
            type_url: {
                type: "string",
                id: 1
            },
            value: {
                type: "bytes",
                id: 2
            }
        }
    }
});

var timeType;

common("duration", {
    Duration: timeType = {
        fields: {
            seconds: {
                type: "int64",
                id: 1
            },
            nanos: {
                type: "int32",
                id: 2
            }
        }
    }
});

common("timestamp", {
    Timestamp: timeType
});

common("empty", {
    Empty: {
        fields: {}
    }
});

common("struct", {
    Struct: {
        fields: {
            fields: {
                keyType: "string",
                type: "Value",
                id: 1
            }
        }
    },
    Value: {
        oneofs: {
            kind: {
                oneof: [
                    "nullValue",
                    "numberValue",
                    "stringValue",
                    "boolValue",
                    "structValue",
                    "listValue"
                ]
            }
        },
        fields: {
            nullValue: {
                type: "NullValue",
                id: 1
            },
            numberValue: {
                type: "double",
                id: 2
            },
            stringValue: {
                type: "string",
                id: 3
            },
            boolValue: {
                type: "bool",
                id: 4
            },
            structValue: {
                type: "Struct",
                id: 5
            },
            listValue: {
                type: "ListValue",
                id: 6
            }
        }
    },
    NullValue: {
        values: {
            NULL_VALUE: 0
        }
    },
    ListValue: {
        fields: {
            values: {
                rule: "repeated",
                type: "Value",
                id: 1
            }
        }
    }
});

common("wrappers", {
    DoubleValue: {
        fields: {
            value: {
                type: "double",
                id: 1
            }
        }
    },
    FloatValue: {
        fields: {
            value: {
                type: "float",
                id: 1
            }
        }
    },
    Int64Value: {
        fields: {
            value: {
                type: "int64",
                id: 1
            }
        }
    },
    UInt64Value: {
        fields: {
            value: {
                type: "uint64",
                id: 1
            }
        }
    },
    Int32Value: {
        fields: {
            value: {
                type: "int32",
                id: 1
            }
        }
    },
    UInt32Value: {
        fields: {
            value: {
                type: "uint32",
                id: 1
            }
        }
    },
    BoolValue: {
        fields: {
            value: {
                type: "bool",
                id: 1
            }
        }
    },
    StringValue: {
        fields: {
            value: {
                type: "string",
                id: 1
            }
        }
    },
    BytesValue: {
        fields: {
            value: {
                type: "bytes",
                id: 1
            }
        }
    }
});

},{}],15:[function(require,module,exports){
"use strict";
/**
 * Runtime message from/to plain object converters.
 * @namespace
 */
var converter = exports;

var Enum = require("./enum"),
    util = require("./util");

/**
 * Generates a partial value fromObject conveter.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {number} fieldIndex Field index
 * @param {string} prop Property reference
 * @returns {Codegen} Codegen instance
 * @ignore
 */
function genValuePartial_fromObject(gen, field, fieldIndex, prop) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    if (field.resolvedType) {
        if (field.resolvedType instanceof Enum) { gen
            ("switch(d%s){", prop);
            for (var values = field.resolvedType.values, keys = Object.keys(values), i = 0; i < keys.length; ++i) {
                if (field.repeated && values[keys[i]] === field.typeDefault) gen
                ("default:");
                gen
                ("case%j:", keys[i])
                ("case %j:", values[keys[i]])
                    ("m%s=%j", prop, values[keys[i]])
                    ("break");
            } gen
            ("}");
        } else gen
            ("if(typeof d%s!==\"object\")", prop)
                ("throw TypeError(%j)", field.fullName + ": object expected")
            ("m%s=types[%d].fromObject(d%s)", prop, fieldIndex, prop);
    } else {
        var isUnsigned = false;
        switch (field.type) {
            case "double":
            case "float":gen
                ("m%s=Number(d%s)", prop, prop);
                break;
            case "uint32":
            case "fixed32": gen
                ("m%s=d%s>>>0", prop, prop);
                break;
            case "int32":
            case "sint32":
            case "sfixed32": gen
                ("m%s=d%s|0", prop, prop);
                break;
            case "uint64":
                isUnsigned = true;
                // eslint-disable-line no-fallthrough
            case "int64":
            case "sint64":
            case "fixed64":
            case "sfixed64": gen
                ("if(util.Long)")
                    ("(m%s=util.Long.fromValue(d%s)).unsigned=%j", prop, prop, isUnsigned)
                ("else if(typeof d%s===\"string\")", prop)
                    ("m%s=parseInt(d%s,10)", prop, prop)
                ("else if(typeof d%s===\"number\")", prop)
                    ("m%s=d%s", prop, prop)
                ("else if(typeof d%s===\"object\")", prop)
                    ("m%s=new util.LongBits(d%s.low>>>0,d%s.high>>>0).toNumber(%s)", prop, prop, prop, isUnsigned ? "true" : "");
                break;
            case "bytes": gen
                ("if(typeof d%s===\"string\")", prop)
                    ("util.base64.decode(d%s,m%s=util.newBuffer(util.base64.length(d%s)),0)", prop, prop, prop)
                ("else if(d%s.length)", prop)
                    ("m%s=d%s", prop, prop);
                break;
            case "string": gen
                ("m%s=String(d%s)", prop, prop);
                break;
            case "bool": gen
                ("m%s=Boolean(d%s)", prop, prop);
                break;
            /* default: gen
                ("m%s=d%s", prop, prop);
                break; */
        }
    }
    return gen;
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
}

/**
 * Generates a plain object to runtime message converter specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
converter.fromObject = function fromObject(mtype) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    var fields = mtype.fieldsArray;
    var gen = util.codegen("d")
    ("if(d instanceof this.ctor)")
        ("return d");
    if (!fields.length) return gen
    ("return new this.ctor");
    gen
    ("var m=new this.ctor");
    for (var i = 0; i < fields.length; ++i) {
        var field  = fields[i].resolve(),
            prop   = util.safeProp(field.name);

        // Map fields
        if (field.map) { gen
    ("if(d%s){", prop)
        ("if(typeof d%s!==\"object\")", prop)
            ("throw TypeError(%j)", field.fullName + ": object expected")
        ("m%s={}", prop)
        ("for(var ks=Object.keys(d%s),i=0;i<ks.length;++i){", prop);
            genValuePartial_fromObject(gen, field, /* not sorted */ i, prop + "[ks[i]]")
        ("}")
    ("}");

        // Repeated fields
        } else if (field.repeated) { gen
    ("if(d%s){", prop)
        ("if(!Array.isArray(d%s))", prop)
            ("throw TypeError(%j)", field.fullName + ": array expected")
        ("m%s=[]", prop)
        ("for(var i=0;i<d%s.length;++i){", prop);
            genValuePartial_fromObject(gen, field, /* not sorted */ i, prop + "[i]")
        ("}")
    ("}");

        // Non-repeated fields
        } else {
            if (!(field.resolvedType instanceof Enum)) gen // no need to test for null/undefined if an enum (uses switch)
    ("if(d%s!=null){", prop); // !== undefined && !== null
        genValuePartial_fromObject(gen, field, /* not sorted */ i, prop);
            if (!(field.resolvedType instanceof Enum)) gen
    ("}");
        }
    } return gen
    ("return m");
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
};

/**
 * Generates a partial value toObject converter.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {number} fieldIndex Field index
 * @param {string} prop Property reference
 * @returns {Codegen} Codegen instance
 * @ignore
 */
function genValuePartial_toObject(gen, field, fieldIndex, prop) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    if (field.resolvedType) {
        if (field.resolvedType instanceof Enum) gen
            ("d%s=o.enums===String?types[%d].values[m%s]:m%s", prop, fieldIndex, prop, prop);
        else gen
            ("d%s=types[%d].toObject(m%s,o)", prop, fieldIndex, prop);
    } else {
        var isUnsigned = false;
        switch (field.type) {
            case "uint64":
                isUnsigned = true;
                // eslint-disable-line no-fallthrough
            case "int64":
            case "sint64":
            case "fixed64":
            case "sfixed64": gen
            ("if(typeof m%s===\"number\")", prop)
                ("d%s=o.longs===String?String(m%s):m%s", prop, prop, prop)
            ("else") // Long-like
                ("d%s=o.longs===String?util.Long.prototype.toString.call(m%s):o.longs===Number?new util.LongBits(m%s.low>>>0,m%s.high>>>0).toNumber(%s):m%s", prop, prop, prop, prop, isUnsigned ? "true": "", prop);
                break;
            case "bytes": gen
            ("d%s=o.bytes===String?util.base64.encode(m%s,0,m%s.length):o.bytes===Array?Array.prototype.slice.call(m%s):m%s", prop, prop, prop, prop, prop);
                break;
            default: gen
            ("d%s=m%s", prop, prop);
                break;
        }
    }
    return gen;
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
}

/**
 * Generates a runtime message to plain object converter specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
converter.toObject = function toObject(mtype) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    var fields = mtype.fieldsArray.slice().sort(util.compareFieldsById);
    if (!fields.length)
        return util.codegen()("return {}");
    var gen = util.codegen("m", "o")
    ("if(!o)")
        ("o={}")
    ("var d={}");

    var repeatedFields = [],
        mapFields = [],
        normalFields = [],
        i = 0;
    for (; i < fields.length; ++i)
        if (!fields[i].partOf)
            ( fields[i].resolve().repeated ? repeatedFields
            : fields[i].map ? mapFields
            : normalFields).push(fields[i]);

    if (repeatedFields.length) { gen
    ("if(o.arrays||o.defaults){");
        for (i = 0; i < repeatedFields.length; ++i) gen
        ("d%s=[]", util.safeProp(repeatedFields[i].name));
        gen
    ("}");
    }

    if (mapFields.length) { gen
    ("if(o.objects||o.defaults){");
        for (i = 0; i < mapFields.length; ++i) gen
        ("d%s={}", util.safeProp(mapFields[i].name));
        gen
    ("}");
    }

    if (normalFields.length) { gen
    ("if(o.defaults){");
        for (i = 0; i < normalFields.length; ++i) {
            var field = normalFields[i],
                prop  = util.safeProp(field.name);
            if (field.resolvedType instanceof Enum) gen
        ("d%s=o.enums===String?%j:%j", prop, field.resolvedType.valuesById[field.typeDefault], field.typeDefault);
            else if (field.long) gen
        ("if(util.Long){")
            ("var n=new util.Long(%d,%d,%j)", field.typeDefault.low, field.typeDefault.high, field.typeDefault.unsigned)
            ("d%s=o.longs===String?n.toString():o.longs===Number?n.toNumber():n", prop)
        ("}else")
            ("d%s=o.longs===String?%j:%d", prop, field.typeDefault.toString(), field.typeDefault.toNumber());
            else if (field.bytes) gen
        ("d%s=o.bytes===String?%j:%s", prop, String.fromCharCode.apply(String, field.typeDefault), "[" + Array.prototype.slice.call(field.typeDefault).join(",") + "]");
            else gen
        ("d%s=%j", prop, field.typeDefault); // also messages (=null)
        } gen
    ("}");
    }
    var hasKs2 = false;
    for (i = 0; i < fields.length; ++i) {
        var field = fields[i],
            index = mtype._fieldsArray.indexOf(field),
            prop  = util.safeProp(field.name);
        if (field.map) {
            if (!hasKs2) { hasKs2 = true; gen
    ("var ks2");
            } gen
    ("if(m%s&&(ks2=Object.keys(m%s)).length){", prop, prop)
        ("d%s={}", prop)
        ("for(var j=0;j<ks2.length;++j){");
            genValuePartial_toObject(gen, field, /* sorted */ index, prop + "[ks2[j]]")
        ("}");
        } else if (field.repeated) { gen
    ("if(m%s&&m%s.length){", prop, prop)
        ("d%s=[]", prop)
        ("for(var j=0;j<m%s.length;++j){", prop);
            genValuePartial_toObject(gen, field, /* sorted */ index, prop + "[j]")
        ("}");
        } else { gen
    ("if(m%s!=null&&m.hasOwnProperty(%j)){", prop, field.name); // !== undefined && !== null
        genValuePartial_toObject(gen, field, /* sorted */ index, prop);
        if (field.partOf) gen
        ("if(o.oneofs)")
            ("d%s=%j", util.safeProp(field.partOf.name), field.name);
        }
        gen
    ("}");
    }
    return gen
    ("return d");
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
};

},{"./enum":18,"./util":39}],16:[function(require,module,exports){
"use strict";
module.exports = decoder;

var Enum    = require("./enum"),
    types   = require("./types"),
    util    = require("./util");

function missing(field) {
    return "missing required '" + field.name + "'";
}

/**
 * Generates a decoder specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
function decoder(mtype) {
    /* eslint-disable no-unexpected-multiline */
    var gen = util.codegen("r", "l")
    ("if(!(r instanceof Reader))")
        ("r=Reader.create(r)")
    ("var c=l===undefined?r.len:r.pos+l,m=new this.ctor" + (mtype.fieldsArray.filter(function(field) { return field.map; }).length ? ",k" : ""))
    ("while(r.pos<c){")
        ("var t=r.uint32()");
    if (mtype.group) gen
        ("if((t&7)===4)")
            ("break");
    gen
        ("switch(t>>>3){");

    var i = 0;
    for (; i < /* initializes */ mtype.fieldsArray.length; ++i) {
        var field = mtype._fieldsArray[i].resolve(),
            type  = field.resolvedType instanceof Enum ? "uint32" : field.type,
            ref   = "m" + util.safeProp(field.name); gen
            ("case %d:", field.id);

        // Map fields
        if (field.map) { gen
                ("r.skip().pos++") // assumes id 1 + key wireType
                ("if(%s===util.emptyObject)", ref)
                    ("%s={}", ref)
                ("k=r.%s()", field.keyType)
                ("r.pos++"); // assumes id 2 + value wireType
            if (types.long[field.keyType] !== undefined) {
                if (types.basic[type] === undefined) gen
                ("%s[typeof k===\"object\"?util.longToHash(k):k]=types[%d].decode(r,r.uint32())", ref, i); // can't be groups
                else gen
                ("%s[typeof k===\"object\"?util.longToHash(k):k]=r.%s()", ref, type);
            } else {
                if (types.basic[type] === undefined) gen
                ("%s[k]=types[%d].decode(r,r.uint32())", ref, i); // can't be groups
                else gen
                ("%s[k]=r.%s()", ref, type);
            }

        // Repeated fields
        } else if (field.repeated) { gen

                ("if(!(%s&&%s.length))", ref, ref)
                    ("%s=[]", ref);

            // Packable (always check for forward and backward compatiblity)
            if (types.packed[type] !== undefined) gen
                ("if((t&7)===2){")
                    ("var c2=r.uint32()+r.pos")
                    ("while(r.pos<c2)")
                        ("%s.push(r.%s())", ref, type)
                ("}else");

            // Non-packed
            if (types.basic[type] === undefined) gen(field.resolvedType.group
                    ? "%s.push(types[%d].decode(r))"
                    : "%s.push(types[%d].decode(r,r.uint32()))", ref, i);
            else gen
                    ("%s.push(r.%s())", ref, type);

        // Non-repeated
        } else if (types.basic[type] === undefined) gen(field.resolvedType.group
                ? "%s=types[%d].decode(r)"
                : "%s=types[%d].decode(r,r.uint32())", ref, i);
        else gen
                ("%s=r.%s()", ref, type);
        gen
                ("break");
    // Unknown fields
    } gen
            ("default:")
                ("r.skipType(t&7)")
                ("break")

        ("}")
    ("}");

    // Field presence
    for (i = 0; i < mtype._fieldsArray.length; ++i) {
        var rfield = mtype._fieldsArray[i];
        if (rfield.required) gen
    ("if(!m.hasOwnProperty(%j))", rfield.name)
        ("throw util.ProtocolError(%j,{instance:m})", missing(rfield));
    }

    return gen
    ("return m");
    /* eslint-enable no-unexpected-multiline */
}

},{"./enum":18,"./types":38,"./util":39}],17:[function(require,module,exports){
"use strict";
module.exports = encoder;

var Enum     = require("./enum"),
    types    = require("./types"),
    util     = require("./util");

/**
 * Generates a partial message type encoder.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {number} fieldIndex Field index
 * @param {string} ref Variable reference
 * @returns {Codegen} Codegen instance
 * @ignore
 */
function genTypePartial(gen, field, fieldIndex, ref) {
    return field.resolvedType.group
        ? gen("types[%d].encode(%s,w.uint32(%d)).uint32(%d)", fieldIndex, ref, (field.id << 3 | 3) >>> 0, (field.id << 3 | 4) >>> 0)
        : gen("types[%d].encode(%s,w.uint32(%d).fork()).ldelim()", fieldIndex, ref, (field.id << 3 | 2) >>> 0);
}

/**
 * Generates an encoder specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
function encoder(mtype) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    var gen = util.codegen("m", "w")
    ("if(!w)")
        ("w=Writer.create()");

    var i, ref;

    // "when a message is serialized its known fields should be written sequentially by field number"
    var fields = /* initializes */ mtype.fieldsArray.slice().sort(util.compareFieldsById);

    for (var i = 0; i < fields.length; ++i) {
        var field    = fields[i].resolve(),
            index    = mtype._fieldsArray.indexOf(field),
            type     = field.resolvedType instanceof Enum ? "uint32" : field.type,
            wireType = types.basic[type];
            ref      = "m" + util.safeProp(field.name);

        // Map fields
        if (field.map) {
            gen
    ("if(%s!=null&&m.hasOwnProperty(%j)){", ref, field.name) // !== undefined && !== null
        ("for(var ks=Object.keys(%s),i=0;i<ks.length;++i){", ref)
            ("w.uint32(%d).fork().uint32(%d).%s(ks[i])", (field.id << 3 | 2) >>> 0, 8 | types.mapKey[field.keyType], field.keyType);
            if (wireType === undefined) gen
            ("types[%d].encode(%s[ks[i]],w.uint32(18).fork()).ldelim().ldelim()", index, ref); // can't be groups
            else gen
            (".uint32(%d).%s(%s[ks[i]]).ldelim()", 16 | wireType, type, ref);
            gen
        ("}")
    ("}");

            // Repeated fields
        } else if (field.repeated) { gen
    ("if(%s!=null&&%s.length){", ref, ref); // !== undefined && !== null

            // Packed repeated
            if (field.packed && types.packed[type] !== undefined) { gen

        ("w.uint32(%d).fork()", (field.id << 3 | 2) >>> 0)
        ("for(var i=0;i<%s.length;++i)", ref)
            ("w.%s(%s[i])", type, ref)
        ("w.ldelim()");

            // Non-packed
            } else { gen

        ("for(var i=0;i<%s.length;++i)", ref);
                if (wireType === undefined)
            genTypePartial(gen, field, index, ref + "[i]");
                else gen
            ("w.uint32(%d).%s(%s[i])", (field.id << 3 | wireType) >>> 0, type, ref);

            } gen
    ("}");

        // Non-repeated
        } else {
            if (field.optional) gen
    ("if(%s!=null&&m.hasOwnProperty(%j))", ref, field.name); // !== undefined && !== null

            if (wireType === undefined)
        genTypePartial(gen, field, index, ref);
            else gen
        ("w.uint32(%d).%s(%s)", (field.id << 3 | wireType) >>> 0, type, ref);

        }
    }

    return gen
    ("return w");
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
}
},{"./enum":18,"./types":38,"./util":39}],18:[function(require,module,exports){
"use strict";
module.exports = Enum;

// extends ReflectionObject
var ReflectionObject = require("./object");
((Enum.prototype = Object.create(ReflectionObject.prototype)).constructor = Enum).className = "Enum";

var util = require("./util");

/**
 * Constructs a new enum instance.
 * @classdesc Reflected enum.
 * @extends ReflectionObject
 * @constructor
 * @param {string} name Unique name within its namespace
 * @param {Object.<string,number>} [values] Enum values as an object, by name
 * @param {Object.<string,*>} [options] Declared options
 */
function Enum(name, values, options) {
    ReflectionObject.call(this, name, options);

    if (values && typeof values !== "object")
        throw TypeError("values must be an object");

    /**
     * Enum values by id.
     * @type {Object.<number,string>}
     */
    this.valuesById = {};

    /**
     * Enum values by name.
     * @type {Object.<string,number>}
     */
    this.values = Object.create(this.valuesById); // toJSON, marker

    /**
     * Value comment texts, if any.
     * @type {Object.<string,string>}
     */
    this.comments = {};

    // Note that values inherit valuesById on their prototype which makes them a TypeScript-
    // compatible enum. This is used by pbts to write actual enum definitions that work for
    // static and reflection code alike instead of emitting generic object definitions.

    if (values)
        for (var keys = Object.keys(values), i = 0; i < keys.length; ++i)
            this.valuesById[ this.values[keys[i]] = values[keys[i]] ] = keys[i];
}

/**
 * Enum descriptor.
 * @typedef EnumDescriptor
 * @type {Object}
 * @property {Object.<string,number>} values Enum values
 * @property {Object.<string,*>} [options] Enum options
 */

/**
 * Constructs an enum from an enum descriptor.
 * @param {string} name Enum name
 * @param {EnumDescriptor} json Enum descriptor
 * @returns {Enum} Created enum
 * @throws {TypeError} If arguments are invalid
 */
Enum.fromJSON = function fromJSON(name, json) {
    return new Enum(name, json.values, json.options);
};

/**
 * Converts this enum to an enum descriptor.
 * @returns {EnumDescriptor} Enum descriptor
 */
Enum.prototype.toJSON = function toJSON() {
    return {
        options : this.options,
        values  : this.values
    };
};

/**
 * Adds a value to this enum.
 * @param {string} name Value name
 * @param {number} id Value id
 * @param {?string} comment Comment, if any
 * @returns {Enum} `this`
 * @throws {TypeError} If arguments are invalid
 * @throws {Error} If there is already a value with this name or id
 */
Enum.prototype.add = function(name, id, comment) {
    // utilized by the parser but not by .fromJSON

    if (!util.isString(name))
        throw TypeError("name must be a string");

    if (!util.isInteger(id))
        throw TypeError("id must be an integer");

    if (this.values[name] !== undefined)
        throw Error("duplicate name");

    if (this.valuesById[id] !== undefined) {
        if (!(this.options && this.options.allow_alias))
            throw Error("duplicate id");
        this.values[name] = id;
    } else
        this.valuesById[this.values[name] = id] = name;

    this.comments[name] = comment || null;
    return this;
};

/**
 * Removes a value from this enum
 * @param {string} name Value name
 * @returns {Enum} `this`
 * @throws {TypeError} If arguments are invalid
 * @throws {Error} If `name` is not a name of this enum
 */
Enum.prototype.remove = function(name) {

    if (!util.isString(name))
        throw TypeError("name must be a string");

    var val = this.values[name];
    if (val === undefined)
        throw Error("name does not exist");

    delete this.valuesById[val];
    delete this.values[name];
    delete this.comments[name];

    return this;
};

},{"./object":27,"./util":39}],19:[function(require,module,exports){
"use strict";
module.exports = Field;

// extends ReflectionObject
var ReflectionObject = require("./object");
((Field.prototype = Object.create(ReflectionObject.prototype)).constructor = Field).className = "Field";

var Enum  = require("./enum"),
    types = require("./types"),
    util  = require("./util");

var Type; // cyclic

var ruleRe = /^required|optional|repeated$/;

/**
 * Constructs a new message field instance. Note that {@link MapField|map fields} have their own class.
 * @classdesc Reflected message field.
 * @extends ReflectionObject
 * @constructor
 * @param {string} name Unique name within its namespace
 * @param {number} id Unique id within its namespace
 * @param {string} type Value type
 * @param {string|Object.<string,*>} [rule="optional"] Field rule
 * @param {string|Object.<string,*>} [extend] Extended type if different from parent
 * @param {Object.<string,*>} [options] Declared options
 */
function Field(name, id, type, rule, extend, options) {

    if (util.isObject(rule)) {
        options = rule;
        rule = extend = undefined;
    } else if (util.isObject(extend)) {
        options = extend;
        extend = undefined;
    }

    ReflectionObject.call(this, name, options);

    if (!util.isInteger(id) || id < 0)
        throw TypeError("id must be a non-negative integer");

    if (!util.isString(type))
        throw TypeError("type must be a string");

    if (rule !== undefined && !ruleRe.test(rule = rule.toString().toLowerCase()))
        throw TypeError("rule must be a string rule");

    if (extend !== undefined && !util.isString(extend))
        throw TypeError("extend must be a string");

    /**
     * Field rule, if any.
     * @type {string|undefined}
     */
    this.rule = rule && rule !== "optional" ? rule : undefined; // toJSON

    /**
     * Field type.
     * @type {string}
     */
    this.type = type; // toJSON

    /**
     * Unique field id.
     * @type {number}
     */
    this.id = id; // toJSON, marker

    /**
     * Extended type if different from parent.
     * @type {string|undefined}
     */
    this.extend = extend || undefined; // toJSON

    /**
     * Whether this field is required.
     * @type {boolean}
     */
    this.required = rule === "required";

    /**
     * Whether this field is optional.
     * @type {boolean}
     */
    this.optional = !this.required;

    /**
     * Whether this field is repeated.
     * @type {boolean}
     */
    this.repeated = rule === "repeated";

    /**
     * Whether this field is a map or not.
     * @type {boolean}
     */
    this.map = false;

    /**
     * Message this field belongs to.
     * @type {?Type}
     */
    this.message = null;

    /**
     * OneOf this field belongs to, if any,
     * @type {?OneOf}
     */
    this.partOf = null;

    /**
     * The field type's default value.
     * @type {*}
     */
    this.typeDefault = null;

    /**
     * The field's default value on prototypes.
     * @type {*}
     */
    this.defaultValue = null;

    /**
     * Whether this field's value should be treated as a long.
     * @type {boolean}
     */
    this.long = util.Long ? types.long[type] !== undefined : /* istanbul ignore next */ false;

    /**
     * Whether this field's value is a buffer.
     * @type {boolean}
     */
    this.bytes = type === "bytes";

    /**
     * Resolved type if not a basic type.
     * @type {?(Type|Enum)}
     */
    this.resolvedType = null;

    /**
     * Sister-field within the extended type if a declaring extension field.
     * @type {?Field}
     */
    this.extensionField = null;

    /**
     * Sister-field within the declaring namespace if an extended field.
     * @type {?Field}
     */
    this.declaringField = null;

    /**
     * Internally remembers whether this field is packed.
     * @type {?boolean}
     * @private
     */
    this._packed = null;
}

/**
 * Determines whether this field is packed. Only relevant when repeated and working with proto2.
 * @name Field#packed
 * @type {boolean}
 * @readonly
 */
Object.defineProperty(Field.prototype, "packed", {
    get: function() {
        // defaults to packed=true if not explicity set to false
        if (this._packed === null)
            this._packed = this.getOption("packed") !== false;
        return this._packed;
    }
});

/**
 * @override
 */
Field.prototype.setOption = function setOption(name, value, ifNotSet) {
    if (name === "packed") // clear cached before setting
        this._packed = null;
    return ReflectionObject.prototype.setOption.call(this, name, value, ifNotSet);
};

/**
 * Field descriptor.
 * @typedef FieldDescriptor
 * @type {Object}
 * @property {string} [rule="optional"] Field rule
 * @property {string} type Field type
 * @property {number} id Field id
 * @property {Object.<string,*>} [options] Field options
 */

/**
 * Extension field descriptor.
 * @typedef ExtensionFieldDescriptor
 * @type {Object}
 * @property {string} [rule="optional"] Field rule
 * @property {string} type Field type
 * @property {number} id Field id
 * @property {string} extend Extended type
 * @property {Object.<string,*>} [options] Field options
 */

/**
 * Constructs a field from a field descriptor.
 * @param {string} name Field name
 * @param {FieldDescriptor} json Field descriptor
 * @returns {Field} Created field
 * @throws {TypeError} If arguments are invalid
 */
Field.fromJSON = function fromJSON(name, json) {
    return new Field(name, json.id, json.type, json.rule, json.extend, json.options);
};

/**
 * Converts this field to a field descriptor.
 * @returns {FieldDescriptor} Field descriptor
 */
Field.prototype.toJSON = function toJSON() {
    return {
        rule    : this.rule !== "optional" && this.rule || undefined,
        type    : this.type,
        id      : this.id,
        extend  : this.extend,
        options : this.options
    };
};

/**
 * Resolves this field's type references.
 * @returns {Field} `this`
 * @throws {Error} If any reference cannot be resolved
 */
Field.prototype.resolve = function resolve() {

    if (this.resolved)
        return this;

    if ((this.typeDefault = types.defaults[this.type]) === undefined) { // if not a basic type, resolve it

        /* istanbul ignore if */
        if (!Type)
            Type = require("./type");

        this.resolvedType = (this.declaringField ? this.declaringField.parent : this.parent).lookupTypeOrEnum(this.type);
        if (this.resolvedType instanceof Type)
            this.typeDefault = null;
        else // instanceof Enum
            this.typeDefault = this.resolvedType.values[Object.keys(this.resolvedType.values)[0]]; // first defined
    }

    // use explicitly set default value if present
    if (this.options && this.options["default"] !== undefined) {
        this.typeDefault = this.options["default"];
        if (this.resolvedType instanceof Enum && typeof this.typeDefault === "string")
            this.typeDefault = this.resolvedType.values[this.typeDefault];
    }

    // remove unnecessary packed option (parser adds this) if not referencing an enum
    if (this.options && this.options.packed !== undefined && this.resolvedType && !(this.resolvedType instanceof Enum))
        delete this.options.packed;

    // convert to internal data type if necesssary
    if (this.long) {
        this.typeDefault = util.Long.fromNumber(this.typeDefault, this.type.charAt(0) === "u");

        /* istanbul ignore else */
        if (Object.freeze)
            Object.freeze(this.typeDefault); // long instances are meant to be immutable anyway (i.e. use small int cache that even requires it)

    } else if (this.bytes && typeof this.typeDefault === "string") {
        var buf;
        if (util.base64.test(this.typeDefault))
            util.base64.decode(this.typeDefault, buf = util.newBuffer(util.base64.length(this.typeDefault)), 0);
        else
            util.utf8.write(this.typeDefault, buf = util.newBuffer(util.utf8.length(this.typeDefault)), 0);
        this.typeDefault = buf;
    }

    // take special care of maps and repeated fields
    if (this.map)
        this.defaultValue = util.emptyObject;
    else if (this.repeated)
        this.defaultValue = util.emptyArray;
    else
        this.defaultValue = this.typeDefault;

    return ReflectionObject.prototype.resolve.call(this);
};

},{"./enum":18,"./object":27,"./type":37,"./types":38,"./util":39}],20:[function(require,module,exports){
"use strict";
var protobuf = module.exports = require("./index-minimal");

protobuf.build = "light";

/**
 * A node-style callback as used by {@link load} and {@link Root#load}.
 * @typedef LoadCallback
 * @type {function}
 * @param {?Error} error Error, if any, otherwise `null`
 * @param {Root} [root] Root, if there hasn't been an error
 * @returns {undefined}
 */

/**
 * Loads one or multiple .proto or preprocessed .json files into a common root namespace and calls the callback.
 * @param {string|string[]} filename One or multiple files to load
 * @param {Root} root Root namespace, defaults to create a new one if omitted.
 * @param {LoadCallback} callback Callback function
 * @returns {undefined}
 * @see {@link Root#load}
 */
function load(filename, root, callback) {
    if (typeof root === "function") {
        callback = root;
        root = new protobuf.Root();
    } else if (!root)
        root = new protobuf.Root();
    return root.load(filename, callback);
}

/**
 * Loads one or multiple .proto or preprocessed .json files into a common root namespace and calls the callback.
 * @name load
 * @function
 * @param {string|string[]} filename One or multiple files to load
 * @param {LoadCallback} callback Callback function
 * @returns {undefined}
 * @see {@link Root#load}
 * @variation 2
 */
// function load(filename:string, callback:LoadCallback):undefined

/**
 * Loads one or multiple .proto or preprocessed .json files into a common root namespace and returns a promise.
 * @name load
 * @function
 * @param {string|string[]} filename One or multiple files to load
 * @param {Root} [root] Root namespace, defaults to create a new one if omitted.
 * @returns {Promise<Root>} Promise
 * @see {@link Root#load}
 * @variation 3
 */
// function load(filename:string, [root:Root]):Promise<Root>

protobuf.load = load;

/**
 * Synchronously loads one or multiple .proto or preprocessed .json files into a common root namespace (node only).
 * @param {string|string[]} filename One or multiple files to load
 * @param {Root} [root] Root namespace, defaults to create a new one if omitted.
 * @returns {Root} Root namespace
 * @throws {Error} If synchronous fetching is not supported (i.e. in browsers) or if a file's syntax is invalid
 * @see {@link Root#loadSync}
 */
function loadSync(filename, root) {
    if (!root)
        root = new protobuf.Root();
    return root.loadSync(filename);
}

protobuf.loadSync = loadSync;

// Serialization
protobuf.encoder          = require("./encoder");
protobuf.decoder          = require("./decoder");
protobuf.verifier         = require("./verifier");
protobuf.converter        = require("./converter");

// Reflection
protobuf.ReflectionObject = require("./object");
protobuf.Namespace        = require("./namespace");
protobuf.Root             = require("./root");
protobuf.Enum             = require("./enum");
protobuf.Type             = require("./type");
protobuf.Field            = require("./field");
protobuf.OneOf            = require("./oneof");
protobuf.MapField         = require("./mapfield");
protobuf.Service          = require("./service");
protobuf.Method           = require("./method");

// Runtime
protobuf.Class            = require("./class");
protobuf.Message          = require("./message");

// Utility
protobuf.types            = require("./types");
protobuf.util             = require("./util");

// Configure reflection
protobuf.ReflectionObject._configure(protobuf.Root);
protobuf.Namespace._configure(protobuf.Type, protobuf.Service);
protobuf.Root._configure(protobuf.Type);

},{"./class":13,"./converter":15,"./decoder":16,"./encoder":17,"./enum":18,"./field":19,"./index-minimal":21,"./mapfield":23,"./message":24,"./method":25,"./namespace":26,"./object":27,"./oneof":28,"./root":32,"./service":35,"./type":37,"./types":38,"./util":39,"./verifier":42}],21:[function(require,module,exports){
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

},{"./reader":30,"./reader_buffer":31,"./rpc":33,"./util/minimal":41,"./writer":43,"./writer_buffer":44}],22:[function(require,module,exports){
"use strict";
var protobuf = module.exports = require("./index-light");

protobuf.build = "full";

// Parser
protobuf.tokenize         = require("./tokenize");
protobuf.parse            = require("./parse");
protobuf.common           = require("./common");

// Configure parser
protobuf.Root._configure(protobuf.Type, protobuf.parse, protobuf.common);

},{"./common":14,"./index-light":20,"./parse":29,"./tokenize":36}],23:[function(require,module,exports){
"use strict";
module.exports = MapField;

// extends Field
var Field = require("./field");
((MapField.prototype = Object.create(Field.prototype)).constructor = MapField).className = "MapField";

var types   = require("./types"),
    util    = require("./util");

/**
 * Constructs a new map field instance.
 * @classdesc Reflected map field.
 * @extends Field
 * @constructor
 * @param {string} name Unique name within its namespace
 * @param {number} id Unique id within its namespace
 * @param {string} keyType Key type
 * @param {string} type Value type
 * @param {Object.<string,*>} [options] Declared options
 */
function MapField(name, id, keyType, type, options) {
    Field.call(this, name, id, type, options);

    /* istanbul ignore if */
    if (!util.isString(keyType))
        throw TypeError("keyType must be a string");

    /**
     * Key type.
     * @type {string}
     */
    this.keyType = keyType; // toJSON, marker

    /**
     * Resolved key type if not a basic type.
     * @type {?ReflectionObject}
     */
    this.resolvedKeyType = null;

    // Overrides Field#map
    this.map = true;
}

/**
 * Map field descriptor.
 * @typedef MapFieldDescriptor
 * @type {Object}
 * @property {string} keyType Key type
 * @property {string} type Value type
 * @property {number} id Field id
 * @property {Object.<string,*>} [options] Field options
 */

/**
 * Extension map field descriptor.
 * @typedef ExtensionMapFieldDescriptor
 * @type {Object}
 * @property {string} keyType Key type
 * @property {string} type Value type
 * @property {number} id Field id
 * @property {string} extend Extended type
 * @property {Object.<string,*>} [options] Field options
 */

/**
 * Constructs a map field from a map field descriptor.
 * @param {string} name Field name
 * @param {MapFieldDescriptor} json Map field descriptor
 * @returns {MapField} Created map field
 * @throws {TypeError} If arguments are invalid
 */
MapField.fromJSON = function fromJSON(name, json) {
    return new MapField(name, json.id, json.keyType, json.type, json.options);
};

/**
 * Converts this map field to a map field descriptor.
 * @returns {MapFieldDescriptor} Map field descriptor
 */
MapField.prototype.toJSON = function toJSON() {
    return {
        keyType : this.keyType,
        type    : this.type,
        id      : this.id,
        extend  : this.extend,
        options : this.options
    };
};

/**
 * @override
 */
MapField.prototype.resolve = function resolve() {
    if (this.resolved)
        return this;

    // Besides a value type, map fields have a key type that may be "any scalar type except for floating point types and bytes"
    if (types.mapKey[this.keyType] === undefined)
        throw Error("invalid key type: " + this.keyType);

    return Field.prototype.resolve.call(this);
};

},{"./field":19,"./types":38,"./util":39}],24:[function(require,module,exports){
"use strict";
module.exports = Message;

var util = require("./util");

/**
 * Constructs a new message instance.
 * @classdesc Abstract runtime message.
 * @constructor
 * @param {Object.<string,*>} [properties] Properties to set
 */
function Message(properties) {
    // not used internally
    if (properties)
        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
            this[keys[i]] = properties[keys[i]];
}

/**
 * Reference to the reflected type.
 * @name Message.$type
 * @type {Type}
 * @readonly
 */

/**
 * Reference to the reflected type.
 * @name Message#$type
 * @type {Type}
 * @readonly
 */

/**
 * Encodes a message of this type.
 * @param {Message|Object.<string,*>} message Message to encode
 * @param {Writer} [writer] Writer to use
 * @returns {Writer} Writer
 */
Message.encode = function encode(message, writer) {
    return this.$type.encode(message, writer);
};

/**
 * Encodes a message of this type preceeded by its length as a varint.
 * @param {Message|Object.<string,*>} message Message to encode
 * @param {Writer} [writer] Writer to use
 * @returns {Writer} Writer
 */
Message.encodeDelimited = function encodeDelimited(message, writer) {
    return this.$type.encodeDelimited(message, writer);
};

/**
 * Decodes a message of this type.
 * @name Message.decode
 * @function
 * @param {Reader|Uint8Array} reader Reader or buffer to decode
 * @returns {Message} Decoded message
 */
Message.decode = function decode(reader) {
    return this.$type.decode(reader);
};

/**
 * Decodes a message of this type preceeded by its length as a varint.
 * @name Message.decodeDelimited
 * @function
 * @param {Reader|Uint8Array} reader Reader or buffer to decode
 * @returns {Message} Decoded message
 */
Message.decodeDelimited = function decodeDelimited(reader) {
    return this.$type.decodeDelimited(reader);
};

/**
 * Verifies a message of this type.
 * @name Message.verify
 * @function
 * @param {Message|Object.<string,*>} message Message or plain object to verify
 * @returns {?string} `null` if valid, otherwise the reason why it is not
 */
Message.verify = function verify(message) {
    return this.$type.verify(message);
};

/**
 * Creates a new message of this type from a plain object. Also converts values to their respective internal types.
 * @param {Object.<string,*>} object Plain object
 * @returns {Message} Message instance
 */
Message.fromObject = function fromObject(object) {
    return this.$type.fromObject(object);
};

/**
 * Creates a new message of this type from a plain object. Also converts values to their respective internal types.
 * This is an alias of {@link Message.fromObject}.
 * @function
 * @param {Object.<string,*>} object Plain object
 * @returns {Message} Message instance
 */
Message.from = Message.fromObject;

/**
 * Creates a plain object from a message of this type. Also converts values to other types if specified.
 * @param {Message} message Message instance
 * @param {ConversionOptions} [options] Conversion options
 * @returns {Object.<string,*>} Plain object
 */
Message.toObject = function toObject(message, options) {
    return this.$type.toObject(message, options);
};

/**
 * Creates a plain object from this message. Also converts values to other types if specified.
 * @param {ConversionOptions} [options] Conversion options
 * @returns {Object.<string,*>} Plain object
 */
Message.prototype.toObject = function toObject(options) {
    return this.$type.toObject(this, options);
};

/**
 * Converts this message to JSON.
 * @returns {Object.<string,*>} JSON object
 */
Message.prototype.toJSON = function toJSON() {
    return this.$type.toObject(this, util.toJSONOptions);
};

},{"./util":39}],25:[function(require,module,exports){
"use strict";
module.exports = Method;

// extends ReflectionObject
var ReflectionObject = require("./object");
((Method.prototype = Object.create(ReflectionObject.prototype)).constructor = Method).className = "Method";

var util = require("./util");

/**
 * Constructs a new service method instance.
 * @classdesc Reflected service method.
 * @extends ReflectionObject
 * @constructor
 * @param {string} name Method name
 * @param {string|undefined} type Method type, usually `"rpc"`
 * @param {string} requestType Request message type
 * @param {string} responseType Response message type
 * @param {boolean|Object.<string,*>} [requestStream] Whether the request is streamed
 * @param {boolean|Object.<string,*>} [responseStream] Whether the response is streamed
 * @param {Object.<string,*>} [options] Declared options
 */
function Method(name, type, requestType, responseType, requestStream, responseStream, options) {

    /* istanbul ignore next */
    if (util.isObject(requestStream)) {
        options = requestStream;
        requestStream = responseStream = undefined;
    } else if (util.isObject(responseStream)) {
        options = responseStream;
        responseStream = undefined;
    }

    /* istanbul ignore if */
    if (!(type === undefined || util.isString(type)))
        throw TypeError("type must be a string");

    /* istanbul ignore if */
    if (!util.isString(requestType))
        throw TypeError("requestType must be a string");

    /* istanbul ignore if */
    if (!util.isString(responseType))
        throw TypeError("responseType must be a string");

    ReflectionObject.call(this, name, options);

    /**
     * Method type.
     * @type {string}
     */
    this.type = type || "rpc"; // toJSON

    /**
     * Request type.
     * @type {string}
     */
    this.requestType = requestType; // toJSON, marker

    /**
     * Whether requests are streamed or not.
     * @type {boolean|undefined}
     */
    this.requestStream = requestStream ? true : undefined; // toJSON

    /**
     * Response type.
     * @type {string}
     */
    this.responseType = responseType; // toJSON

    /**
     * Whether responses are streamed or not.
     * @type {boolean|undefined}
     */
    this.responseStream = responseStream ? true : undefined; // toJSON

    /**
     * Resolved request type.
     * @type {?Type}
     */
    this.resolvedRequestType = null;

    /**
     * Resolved response type.
     * @type {?Type}
     */
    this.resolvedResponseType = null;
}

/**
 * @typedef MethodDescriptor
 * @type {Object}
 * @property {string} [type="rpc"] Method type
 * @property {string} requestType Request type
 * @property {string} responseType Response type
 * @property {boolean} [requestStream=false] Whether requests are streamed
 * @property {boolean} [responseStream=false] Whether responses are streamed
 * @property {Object.<string,*>} [options] Method options
 */

/**
 * Constructs a method from a method descriptor.
 * @param {string} name Method name
 * @param {MethodDescriptor} json Method descriptor
 * @returns {Method} Created method
 * @throws {TypeError} If arguments are invalid
 */
Method.fromJSON = function fromJSON(name, json) {
    return new Method(name, json.type, json.requestType, json.responseType, json.requestStream, json.responseStream, json.options);
};

/**
 * Converts this method to a method descriptor.
 * @returns {MethodDescriptor} Method descriptor
 */
Method.prototype.toJSON = function toJSON() {
    return {
        type           : this.type !== "rpc" && /* istanbul ignore next */ this.type || undefined,
        requestType    : this.requestType,
        requestStream  : this.requestStream,
        responseType   : this.responseType,
        responseStream : this.responseStream,
        options        : this.options
    };
};

/**
 * @override
 */
Method.prototype.resolve = function resolve() {

    /* istanbul ignore if */
    if (this.resolved)
        return this;

    this.resolvedRequestType = this.parent.lookupType(this.requestType);
    this.resolvedResponseType = this.parent.lookupType(this.responseType);

    return ReflectionObject.prototype.resolve.call(this);
};

},{"./object":27,"./util":39}],26:[function(require,module,exports){
"use strict";
module.exports = Namespace;

// extends ReflectionObject
var ReflectionObject = require("./object");
((Namespace.prototype = Object.create(ReflectionObject.prototype)).constructor = Namespace).className = "Namespace";

var Enum     = require("./enum"),
    Field    = require("./field"),
    util     = require("./util");

var Type,    // cyclic
    Service; // "

/**
 * Constructs a new namespace instance.
 * @name Namespace
 * @classdesc Reflected namespace.
 * @extends NamespaceBase
 * @constructor
 * @param {string} name Namespace name
 * @param {Object.<string,*>} [options] Declared options
 */

/**
 * Constructs a namespace from JSON.
 * @memberof Namespace
 * @function
 * @param {string} name Namespace name
 * @param {Object.<string,*>} json JSON object
 * @returns {Namespace} Created namespace
 * @throws {TypeError} If arguments are invalid
 */
Namespace.fromJSON = function fromJSON(name, json) {
    return new Namespace(name, json.options).addJSON(json.nested);
};

/**
 * Converts an array of reflection objects to JSON.
 * @memberof Namespace
 * @param {ReflectionObject[]} array Object array
 * @returns {Object.<string,*>|undefined} JSON object or `undefined` when array is empty
 */
function arrayToJSON(array) {
    if (!(array && array.length))
        return undefined;
    var obj = {};
    for (var i = 0; i < array.length; ++i)
        obj[array[i].name] = array[i].toJSON();
    return obj;
}

Namespace.arrayToJSON = arrayToJSON;

/**
 * Not an actual constructor. Use {@link Namespace} instead.
 * @classdesc Base class of all reflection objects containing nested objects. This is not an actual class but here for the sake of having consistent type definitions.
 * @exports NamespaceBase
 * @extends ReflectionObject
 * @abstract
 * @constructor
 * @param {string} name Namespace name
 * @param {Object.<string,*>} [options] Declared options
 * @see {@link Namespace}
 */
function Namespace(name, options) {
    ReflectionObject.call(this, name, options);

    /**
     * Nested objects by name.
     * @type {Object.<string,ReflectionObject>|undefined}
     */
    this.nested = undefined; // toJSON

    /**
     * Cached nested objects as an array.
     * @type {?ReflectionObject[]}
     * @private
     */
    this._nestedArray = null;
}

function clearCache(namespace) {
    namespace._nestedArray = null;
    return namespace;
}

/**
 * Nested objects of this namespace as an array for iteration.
 * @name NamespaceBase#nestedArray
 * @type {ReflectionObject[]}
 * @readonly
 */
Object.defineProperty(Namespace.prototype, "nestedArray", {
    get: function() {
        return this._nestedArray || (this._nestedArray = util.toArray(this.nested));
    }
});

/**
 * Namespace descriptor.
 * @typedef NamespaceDescriptor
 * @type {Object}
 * @property {Object.<string,*>} [options] Namespace options
 * @property {Object.<string,AnyNestedDescriptor>} nested Nested object descriptors
 */

/**
 * Namespace base descriptor.
 * @typedef NamespaceBaseDescriptor
 * @type {Object}
 * @property {Object.<string,*>} [options] Namespace options
 * @property {Object.<string,AnyNestedDescriptor>} [nested] Nested object descriptors
 */

/**
 * Any extension field descriptor.
 * @typedef AnyExtensionFieldDescriptor
 * @type {ExtensionFieldDescriptor|ExtensionMapFieldDescriptor}
 */

/**
 * Any nested object descriptor.
 * @typedef AnyNestedDescriptor
 * @type {EnumDescriptor|TypeDescriptor|ServiceDescriptor|AnyExtensionFieldDescriptor|NamespaceDescriptor}
 */
// ^ BEWARE: VSCode hangs forever when using more than 5 types (that's why AnyExtensionFieldDescriptor exists in the first place)

/**
 * Converts this namespace to a namespace descriptor.
 * @returns {NamespaceBaseDescriptor} Namespace descriptor
 */
Namespace.prototype.toJSON = function toJSON() {
    return {
        options : this.options,
        nested  : arrayToJSON(this.nestedArray)
    };
};

/**
 * Adds nested objects to this namespace from nested object descriptors.
 * @param {Object.<string,AnyNestedDescriptor>} nestedJson Any nested object descriptors
 * @returns {Namespace} `this`
 */
Namespace.prototype.addJSON = function addJSON(nestedJson) {
    var ns = this;
    /* istanbul ignore else */
    if (nestedJson) {
        for (var names = Object.keys(nestedJson), i = 0, nested; i < names.length; ++i) {
            nested = nestedJson[names[i]];
            ns.add( // most to least likely
                ( nested.fields !== undefined
                ? Type.fromJSON
                : nested.values !== undefined
                ? Enum.fromJSON
                : nested.methods !== undefined
                ? Service.fromJSON
                : nested.id !== undefined
                ? Field.fromJSON
                : Namespace.fromJSON )(names[i], nested)
            );
        }
    }
    return this;
};

/**
 * Gets the nested object of the specified name.
 * @param {string} name Nested object name
 * @returns {?ReflectionObject} The reflection object or `null` if it doesn't exist
 */
Namespace.prototype.get = function get(name) {
    return this.nested && this.nested[name]
        || null;
};

/**
 * Gets the values of the nested {@link Enum|enum} of the specified name.
 * This methods differs from {@link Namespace#get|get} in that it returns an enum's values directly and throws instead of returning `null`.
 * @param {string} name Nested enum name
 * @returns {Object.<string,number>} Enum values
 * @throws {Error} If there is no such enum
 */
Namespace.prototype.getEnum = function getEnum(name) {
    if (this.nested && this.nested[name] instanceof Enum)
        return this.nested[name].values;
    throw Error("no such enum");
};

/**
 * Adds a nested object to this namespace.
 * @param {ReflectionObject} object Nested object to add
 * @returns {Namespace} `this`
 * @throws {TypeError} If arguments are invalid
 * @throws {Error} If there is already a nested object with this name
 */
Namespace.prototype.add = function add(object) {

    if (!(object instanceof Field && object.extend !== undefined || object instanceof Type || object instanceof Enum || object instanceof Service || object instanceof Namespace))
        throw TypeError("object must be a valid nested object");

    if (!this.nested)
        this.nested = {};
    else {
        var prev = this.get(object.name);
        if (prev) {
            if (prev instanceof Namespace && object instanceof Namespace && !(prev instanceof Type || prev instanceof Service)) {
                // replace plain namespace but keep existing nested elements and options
                var nested = prev.nestedArray;
                for (var i = 0; i < nested.length; ++i)
                    object.add(nested[i]);
                this.remove(prev);
                if (!this.nested)
                    this.nested = {};
                object.setOptions(prev.options, true);

            } else
                throw Error("duplicate name '" + object.name + "' in " + this);
        }
    }
    this.nested[object.name] = object;
    object.onAdd(this);
    return clearCache(this);
};

/**
 * Removes a nested object from this namespace.
 * @param {ReflectionObject} object Nested object to remove
 * @returns {Namespace} `this`
 * @throws {TypeError} If arguments are invalid
 * @throws {Error} If `object` is not a member of this namespace
 */
Namespace.prototype.remove = function remove(object) {

    if (!(object instanceof ReflectionObject))
        throw TypeError("object must be a ReflectionObject");
    if (object.parent !== this)
        throw Error(object + " is not a member of " + this);

    delete this.nested[object.name];
    if (!Object.keys(this.nested).length)
        this.nested = undefined;

    object.onRemove(this);
    return clearCache(this);
};

/**
 * Defines additial namespaces within this one if not yet existing.
 * @param {string|string[]} path Path to create
 * @param {*} [json] Nested types to create from JSON
 * @returns {Namespace} Pointer to the last namespace created or `this` if path is empty
 */
Namespace.prototype.define = function define(path, json) {

    if (util.isString(path))
        path = path.split(".");
    else if (!Array.isArray(path))
        throw TypeError("illegal path");
    if (path && path.length && path[0] === "")
        throw Error("path must be relative");

    var ptr = this;
    while (path.length > 0) {
        var part = path.shift();
        if (ptr.nested && ptr.nested[part]) {
            ptr = ptr.nested[part];
            if (!(ptr instanceof Namespace))
                throw Error("path conflicts with non-namespace objects");
        } else
            ptr.add(ptr = new Namespace(part));
    }
    if (json)
        ptr.addJSON(json);
    return ptr;
};

/**
 * Resolves this namespace's and all its nested objects' type references. Useful to validate a reflection tree, but comes at a cost.
 * @returns {Namespace} `this`
 */
Namespace.prototype.resolveAll = function resolveAll() {
    var nested = this.nestedArray, i = 0;
    while (i < nested.length)
        if (nested[i] instanceof Namespace)
            nested[i++].resolveAll();
        else
            nested[i++].resolve();
    return this.resolve();
};

/**
 * Looks up the reflection object at the specified path, relative to this namespace.
 * @param {string|string[]} path Path to look up
 * @param {*|Array.<*>} filterTypes Filter types, any combination of the constructors of `protobuf.Type`, `protobuf.Enum`, `protobuf.Service` etc.
 * @param {boolean} [parentAlreadyChecked=false] If known, whether the parent has already been checked
 * @returns {?ReflectionObject} Looked up object or `null` if none could be found
 */
Namespace.prototype.lookup = function lookup(path, filterTypes, parentAlreadyChecked) {

    /* istanbul ignore next */
    if (typeof filterTypes === "boolean") {
        parentAlreadyChecked = filterTypes;
        filterTypes = undefined;
    } else if (filterTypes && !Array.isArray(filterTypes))
        filterTypes = [ filterTypes ];

    if (util.isString(path) && path.length) {
        if (path === ".")
            return this.root;
        path = path.split(".");
    } else if (!path.length)
        return this;

    // Start at root if path is absolute
    if (path[0] === "")
        return this.root.lookup(path.slice(1), filterTypes);
    // Test if the first part matches any nested object, and if so, traverse if path contains more
    var found = this.get(path[0]);
    if (found) {
        if (path.length === 1) {
            if (!filterTypes || filterTypes.indexOf(found.constructor) > -1)
                return found;
        } else if (found instanceof Namespace && (found = found.lookup(path.slice(1), filterTypes, true)))
            return found;
    }
    // If there hasn't been a match, try again at the parent
    if (this.parent === null || parentAlreadyChecked)
        return null;
    return this.parent.lookup(path, filterTypes);
};

/**
 * Looks up the reflection object at the specified path, relative to this namespace.
 * @name NamespaceBase#lookup
 * @function
 * @param {string|string[]} path Path to look up
 * @param {boolean} [parentAlreadyChecked=false] Whether the parent has already been checked
 * @returns {?ReflectionObject} Looked up object or `null` if none could be found
 * @variation 2
 */
// lookup(path: string, [parentAlreadyChecked: boolean])

/**
 * Looks up the {@link Type|type} at the specified path, relative to this namespace.
 * Besides its signature, this methods differs from {@link Namespace#lookup|lookup} in that it throws instead of returning `null`.
 * @param {string|string[]} path Path to look up
 * @returns {Type} Looked up type
 * @throws {Error} If `path` does not point to a type
 */
Namespace.prototype.lookupType = function lookupType(path) {
    var found = this.lookup(path, [ Type ]);
    if (!found)
        throw Error("no such type");
    return found;
};

/**
 * Looks up the values of the {@link Enum|enum} at the specified path, relative to this namespace.
 * Besides its signature, this methods differs from {@link Namespace#lookup|lookup} in that it throws instead of returning `null`.
 * @param {string|string[]} path Path to look up
 * @returns {Enum} Looked up enum
 * @throws {Error} If `path` does not point to an enum
 */
Namespace.prototype.lookupEnum = function lookupEnum(path) {
    var found = this.lookup(path, [ Enum ]);
    if (!found)
        throw Error("no such Enum '" + path + "' in " + this);
    return found;
};

/**
 * Looks up the {@link Type|type} or {@link Enum|enum} at the specified path, relative to this namespace.
 * Besides its signature, this methods differs from {@link Namespace#lookup|lookup} in that it throws instead of returning `null`.
 * @param {string|string[]} path Path to look up
 * @returns {Type} Looked up type or enum
 * @throws {Error} If `path` does not point to a type or enum
 */
Namespace.prototype.lookupTypeOrEnum = function lookupTypeOrEnum(path) {
    var found = this.lookup(path, [ Type, Enum ]);
    if (!found)
        throw Error("no such Type or Enum '" + path + "' in " + this);
    return found;
};

/**
 * Looks up the {@link Service|service} at the specified path, relative to this namespace.
 * Besides its signature, this methods differs from {@link Namespace#lookup|lookup} in that it throws instead of returning `null`.
 * @param {string|string[]} path Path to look up
 * @returns {Service} Looked up service
 * @throws {Error} If `path` does not point to a service
 */
Namespace.prototype.lookupService = function lookupService(path) {
    var found = this.lookup(path, [ Service ]);
    if (!found)
        throw Error("no such Service '" + path + "' in " + this);
    return found;
};

Namespace._configure = function(Type_, Service_) {
    Type    = Type_;
    Service = Service_;
};

},{"./enum":18,"./field":19,"./object":27,"./util":39}],27:[function(require,module,exports){
"use strict";
module.exports = ReflectionObject;

ReflectionObject.className = "ReflectionObject";

var util = require("./util");

var Root; // cyclic

/**
 * Constructs a new reflection object instance.
 * @classdesc Base class of all reflection objects.
 * @constructor
 * @param {string} name Object name
 * @param {Object.<string,*>} [options] Declared options
 * @abstract
 */
function ReflectionObject(name, options) {

    if (!util.isString(name))
        throw TypeError("name must be a string");

    if (options && !util.isObject(options))
        throw TypeError("options must be an object");

    /**
     * Options.
     * @type {Object.<string,*>|undefined}
     */
    this.options = options; // toJSON

    /**
     * Unique name within its namespace.
     * @type {string}
     */
    this.name = name;

    /**
     * Parent namespace.
     * @type {?Namespace}
     */
    this.parent = null;

    /**
     * Whether already resolved or not.
     * @type {boolean}
     */
    this.resolved = false;

    /**
     * Comment text, if any.
     * @type {?string}
     */
    this.comment = null;

    /**
     * Defining file name.
     * @type {?string}
     */
    this.filename = null;
}

Object.defineProperties(ReflectionObject.prototype, {

    /**
     * Reference to the root namespace.
     * @name ReflectionObject#root
     * @type {Root}
     * @readonly
     */
    root: {
        get: function() {
            var ptr = this;
            while (ptr.parent !== null)
                ptr = ptr.parent;
            return ptr;
        }
    },

    /**
     * Full name including leading dot.
     * @name ReflectionObject#fullName
     * @type {string}
     * @readonly
     */
    fullName: {
        get: function() {
            var path = [ this.name ],
                ptr = this.parent;
            while (ptr) {
                path.unshift(ptr.name);
                ptr = ptr.parent;
            }
            return path.join(".");
        }
    }
});

/**
 * Converts this reflection object to its descriptor representation.
 * @returns {Object.<string,*>} Descriptor
 * @abstract
 */
ReflectionObject.prototype.toJSON = /* istanbul ignore next */ function toJSON() {
    throw Error(); // not implemented, shouldn't happen
};

/**
 * Called when this object is added to a parent.
 * @param {ReflectionObject} parent Parent added to
 * @returns {undefined}
 */
ReflectionObject.prototype.onAdd = function onAdd(parent) {
    if (this.parent && this.parent !== parent)
        this.parent.remove(this);
    this.parent = parent;
    this.resolved = false;
    var root = parent.root;
    if (root instanceof Root)
        root._handleAdd(this);
};

/**
 * Called when this object is removed from a parent.
 * @param {ReflectionObject} parent Parent removed from
 * @returns {undefined}
 */
ReflectionObject.prototype.onRemove = function onRemove(parent) {
    var root = parent.root;
    if (root instanceof Root)
        root._handleRemove(this);
    this.parent = null;
    this.resolved = false;
};

/**
 * Resolves this objects type references.
 * @returns {ReflectionObject} `this`
 */
ReflectionObject.prototype.resolve = function resolve() {
    if (this.resolved)
        return this;
    if (this.root instanceof Root)
        this.resolved = true; // only if part of a root
    return this;
};

/**
 * Gets an option value.
 * @param {string} name Option name
 * @returns {*} Option value or `undefined` if not set
 */
ReflectionObject.prototype.getOption = function getOption(name) {
    if (this.options)
        return this.options[name];
    return undefined;
};

/**
 * Sets an option.
 * @param {string} name Option name
 * @param {*} value Option value
 * @param {boolean} [ifNotSet] Sets the option only if it isn't currently set
 * @returns {ReflectionObject} `this`
 */
ReflectionObject.prototype.setOption = function setOption(name, value, ifNotSet) {
    if (!ifNotSet || !this.options || this.options[name] === undefined)
        (this.options || (this.options = {}))[name] = value;
    return this;
};

/**
 * Sets multiple options.
 * @param {Object.<string,*>} options Options to set
 * @param {boolean} [ifNotSet] Sets an option only if it isn't currently set
 * @returns {ReflectionObject} `this`
 */
ReflectionObject.prototype.setOptions = function setOptions(options, ifNotSet) {
    if (options)
        for (var keys = Object.keys(options), i = 0; i < keys.length; ++i)
            this.setOption(keys[i], options[keys[i]], ifNotSet);
    return this;
};

/**
 * Converts this instance to its string representation.
 * @returns {string} Class name[, space, full name]
 */
ReflectionObject.prototype.toString = function toString() {
    var className = this.constructor.className,
        fullName  = this.fullName;
    if (fullName.length)
        return className + " " + fullName;
    return className;
};

ReflectionObject._configure = function(Root_) {
    Root = Root_;
};

},{"./util":39}],28:[function(require,module,exports){
"use strict";
module.exports = OneOf;

// extends ReflectionObject
var ReflectionObject = require("./object");
((OneOf.prototype = Object.create(ReflectionObject.prototype)).constructor = OneOf).className = "OneOf";

var Field = require("./field");

/**
 * Constructs a new oneof instance.
 * @classdesc Reflected oneof.
 * @extends ReflectionObject
 * @constructor
 * @param {string} name Oneof name
 * @param {string[]|Object.<string,*>} [fieldNames] Field names
 * @param {Object.<string,*>} [options] Declared options
 */
function OneOf(name, fieldNames, options) {
    if (!Array.isArray(fieldNames)) {
        options = fieldNames;
        fieldNames = undefined;
    }
    ReflectionObject.call(this, name, options);

    /* istanbul ignore if */
    if (!(fieldNames === undefined || Array.isArray(fieldNames)))
        throw TypeError("fieldNames must be an Array");

    /**
     * Field names that belong to this oneof.
     * @type {string[]}
     */
    this.oneof = fieldNames || []; // toJSON, marker

    /**
     * Fields that belong to this oneof as an array for iteration.
     * @type {Field[]}
     * @readonly
     */
    this.fieldsArray = []; // declared readonly for conformance, possibly not yet added to parent
}

/**
 * Oneof descriptor.
 * @typedef OneOfDescriptor
 * @type {Object}
 * @property {Array.<string>} oneof Oneof field names
 * @property {Object.<string,*>} [options] Oneof options
 */

/**
 * Constructs a oneof from a oneof descriptor.
 * @param {string} name Oneof name
 * @param {OneOfDescriptor} json Oneof descriptor
 * @returns {OneOf} Created oneof
 * @throws {TypeError} If arguments are invalid
 */
OneOf.fromJSON = function fromJSON(name, json) {
    return new OneOf(name, json.oneof, json.options);
};

/**
 * Converts this oneof to a oneof descriptor.
 * @returns {OneOfDescriptor} Oneof descriptor
 */
OneOf.prototype.toJSON = function toJSON() {
    return {
        oneof   : this.oneof,
        options : this.options
    };
};

/**
 * Adds the fields of the specified oneof to the parent if not already done so.
 * @param {OneOf} oneof The oneof
 * @returns {undefined}
 * @inner
 * @ignore
 */
function addFieldsToParent(oneof) {
    if (oneof.parent)
        for (var i = 0; i < oneof.fieldsArray.length; ++i)
            if (!oneof.fieldsArray[i].parent)
                oneof.parent.add(oneof.fieldsArray[i]);
}

/**
 * Adds a field to this oneof and removes it from its current parent, if any.
 * @param {Field} field Field to add
 * @returns {OneOf} `this`
 */
OneOf.prototype.add = function add(field) {

    /* istanbul ignore if */
    if (!(field instanceof Field))
        throw TypeError("field must be a Field");

    if (field.parent && field.parent !== this.parent)
        field.parent.remove(field);
    this.oneof.push(field.name);
    this.fieldsArray.push(field);
    field.partOf = this; // field.parent remains null
    addFieldsToParent(this);
    return this;
};

/**
 * Removes a field from this oneof and puts it back to the oneof's parent.
 * @param {Field} field Field to remove
 * @returns {OneOf} `this`
 */
OneOf.prototype.remove = function remove(field) {

    /* istanbul ignore if */
    if (!(field instanceof Field))
        throw TypeError("field must be a Field");

    var index = this.fieldsArray.indexOf(field);

    /* istanbul ignore if */
    if (index < 0)
        throw Error(field + " is not a member of " + this);

    this.fieldsArray.splice(index, 1);
    index = this.oneof.indexOf(field.name);

    /* istanbul ignore else */
    if (index > -1) // theoretical
        this.oneof.splice(index, 1);

    field.partOf = null;
    return this;
};

/**
 * @override
 */
OneOf.prototype.onAdd = function onAdd(parent) {
    ReflectionObject.prototype.onAdd.call(this, parent);
    var self = this;
    // Collect present fields
    for (var i = 0; i < this.oneof.length; ++i) {
        var field = parent.get(this.oneof[i]);
        if (field && !field.partOf) {
            field.partOf = self;
            self.fieldsArray.push(field);
        }
    }
    // Add not yet present fields
    addFieldsToParent(this);
};

/**
 * @override
 */
OneOf.prototype.onRemove = function onRemove(parent) {
    for (var i = 0, field; i < this.fieldsArray.length; ++i)
        if ((field = this.fieldsArray[i]).parent)
            field.parent.remove(field);
    ReflectionObject.prototype.onRemove.call(this, parent);
};

},{"./field":19,"./object":27}],29:[function(require,module,exports){
"use strict";
module.exports = parse;

parse.filename = null;
parse.defaults = { keepCase: false };

var tokenize  = require("./tokenize"),
    Root      = require("./root"),
    Type      = require("./type"),
    Field     = require("./field"),
    MapField  = require("./mapfield"),
    OneOf     = require("./oneof"),
    Enum      = require("./enum"),
    Service   = require("./service"),
    Method    = require("./method"),
    types     = require("./types"),
    util      = require("./util");

var base10Re    = /^[1-9][0-9]*$/,
    base10NegRe = /^-?[1-9][0-9]*$/,
    base16Re    = /^0[x][0-9a-fA-F]+$/,
    base16NegRe = /^-?0[x][0-9a-fA-F]+$/,
    base8Re     = /^0[0-7]+$/,
    base8NegRe  = /^-?0[0-7]+$/,
    numberRe    = /^(?![eE])[0-9]*(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?$/,
    nameRe      = /^[a-zA-Z_][a-zA-Z_0-9]*$/,
    typeRefRe   = /^(?:\.?[a-zA-Z_][a-zA-Z_0-9]*)+$/,
    fqTypeRefRe = /^(?:\.[a-zA-Z][a-zA-Z_0-9]*)+$/;

var camelCaseRe = /_([a-z])/g;

function camelCase(str) {
    return str.substring(0,1)
         + str.substring(1)
               .replace(camelCaseRe, function($0, $1) { return $1.toUpperCase(); });
}

/**
 * Result object returned from {@link parse}.
 * @typedef ParserResult
 * @type {Object.<string,*>}
 * @property {string|undefined} package Package name, if declared
 * @property {string[]|undefined} imports Imports, if any
 * @property {string[]|undefined} weakImports Weak imports, if any
 * @property {string|undefined} syntax Syntax, if specified (either `"proto2"` or `"proto3"`)
 * @property {Root} root Populated root instance
 */

/**
 * Options modifying the behavior of {@link parse}.
 * @typedef ParseOptions
 * @type {Object.<string,*>}
 * @property {boolean} [keepCase=false] Keeps field casing instead of converting to camel case
 */

/**
 * Parses the given .proto source and returns an object with the parsed contents.
 * @function
 * @param {string} source Source contents
 * @param {Root} root Root to populate
 * @param {ParseOptions} [options] Parse options. Defaults to {@link parse.defaults} when omitted.
 * @returns {ParserResult} Parser result
 * @property {string} filename=null Currently processing file name for error reporting, if known
 * @property {ParseOptions} defaults Default {@link ParseOptions}
 */
function parse(source, root, options) {
    /* eslint-disable callback-return */
    if (!(root instanceof Root)) {
        options = root;
        root = new Root();
    }
    if (!options)
        options = parse.defaults;

    var tn = tokenize(source),
        next = tn.next,
        push = tn.push,
        peek = tn.peek,
        skip = tn.skip,
        cmnt = tn.cmnt;

    var head = true,
        pkg,
        imports,
        weakImports,
        syntax,
        isProto3 = false;

    var ptr = root;

    var applyCase = options.keepCase ? function(name) { return name; } : camelCase;

    /* istanbul ignore next */
    function illegal(token, name, insideTryCatch) {
        var filename = parse.filename;
        if (!insideTryCatch)
            parse.filename = null;
        return Error("illegal " + (name || "token") + " '" + token + "' (" + (filename ? filename + ", " : "") + "line " + tn.line() + ")");
    }

    function readString() {
        var values = [],
            token;
        do {
            /* istanbul ignore if */
            if ((token = next()) !== "\"" && token !== "'")
                throw illegal(token);

            values.push(next());
            skip(token);
            token = peek();
        } while (token === "\"" || token === "'");
        return values.join("");
    }

    function readValue(acceptTypeRef) {
        var token = next();
        switch (token) {
            case "'":
            case "\"":
                push(token);
                return readString();
            case "true": case "TRUE":
                return true;
            case "false": case "FALSE":
                return false;
        }
        try {
            return parseNumber(token, /* insideTryCatch */ true);
        } catch (e) {

            /* istanbul ignore else */
            if (acceptTypeRef && typeRefRe.test(token))
                return token;

            /* istanbul ignore next */
            throw illegal(token, "value");
        }
    }

    function readRanges(target, acceptStrings) {
        var token, start;
        do {
            if (acceptStrings && ((token = peek()) === "\"" || token === "'"))
                target.push(readString());
            else
                target.push([ start = parseId(next()), skip("to", true) ? parseId(next()) : start ]);
        } while (skip(",", true));
        skip(";");
    }

    function parseNumber(token, insideTryCatch) {
        var sign = 1;
        if (token.charAt(0) === "-") {
            sign = -1;
            token = token.substring(1);
        }
        switch (token) {
            case "inf": case "INF": case "Inf":
                return sign * Infinity;
            case "nan": case "NAN": case "Nan": case "NaN":
                return NaN;
            case "0":
                return 0;
        }
        if (base10Re.test(token))
            return sign * parseInt(token, 10);
        if (base16Re.test(token))
            return sign * parseInt(token, 16);
        if (base8Re.test(token))
            return sign * parseInt(token, 8);

        /* istanbul ignore else */
        if (numberRe.test(token))
            return sign * parseFloat(token);

        /* istanbul ignore next */
        throw illegal(token, "number", insideTryCatch);
    }

    function parseId(token, acceptNegative) {
        switch (token) {
            case "max": case "MAX": case "Max":
                return 536870911;
            case "0":
                return 0;
        }

        /* istanbul ignore if */
        if (!acceptNegative && token.charAt(0) === "-")
            throw illegal(token, "id");

        if (base10NegRe.test(token))
            return parseInt(token, 10);
        if (base16NegRe.test(token))
            return parseInt(token, 16);

        /* istanbul ignore else */
        if (base8NegRe.test(token))
            return parseInt(token, 8);

        /* istanbul ignore next */
        throw illegal(token, "id");
    }

    function parsePackage() {

        /* istanbul ignore if */
        if (pkg !== undefined)
            throw illegal("package");

        pkg = next();

        /* istanbul ignore if */
        if (!typeRefRe.test(pkg))
            throw illegal(pkg, "name");

        ptr = ptr.define(pkg);
        skip(";");
    }

    function parseImport() {
        var token = peek();
        var whichImports;
        switch (token) {
            case "weak":
                whichImports = weakImports || (weakImports = []);
                next();
                break;
            case "public":
                next();
                // eslint-disable-line no-fallthrough
            default:
                whichImports = imports || (imports = []);
                break;
        }
        token = readString();
        skip(";");
        whichImports.push(token);
    }

    function parseSyntax() {
        skip("=");
        syntax = readString();
        isProto3 = syntax === "proto3";

        /* istanbul ignore if */
        if (!isProto3 && syntax !== "proto2")
            throw illegal(syntax, "syntax");

        skip(";");
    }

    function parseCommon(parent, token) {
        switch (token) {

            case "option":
                parseOption(parent, token);
                skip(";");
                return true;

            case "message":
                parseType(parent, token);
                return true;

            case "enum":
                parseEnum(parent, token);
                return true;

            case "service":
                parseService(parent, token);
                return true;

            case "extend":
                parseExtension(parent, token);
                return true;
        }
        return false;
    }

    function ifBlock(obj, fnIf, fnElse) {
        var trailingLine = tn.line();
        if (obj) {
            obj.comment = cmnt(); // try block-type comment
            obj.filename = parse.filename;
        }
        if (skip("{", true)) {
            var token;
            while ((token = next()) !== "}")
                fnIf(token);
            skip(";", true);
        } else {
            if (fnElse)
                fnElse();
            skip(";");
            if (obj && typeof obj.comment !== "string")
                obj.comment = cmnt(trailingLine); // try line-type comment if no block
        }
    }

    function parseType(parent, token) {

        /* istanbul ignore if */
        if (!nameRe.test(token = next()))
            throw illegal(token, "type name");

        var type = new Type(token);
        ifBlock(type, function parseType_block(token) {
            if (parseCommon(type, token))
                return;

            switch (token) {

                case "map":
                    parseMapField(type, token);
                    break;

                case "required":
                case "optional":
                case "repeated":
                    parseField(type, token);
                    break;

                case "oneof":
                    parseOneOf(type, token);
                    break;

                case "extensions":
                    readRanges(type.extensions || (type.extensions = []));
                    break;

                case "reserved":
                    readRanges(type.reserved || (type.reserved = []), true);
                    break;

                default:
                    /* istanbul ignore if */
                    if (!isProto3 || !typeRefRe.test(token))
                        throw illegal(token);

                    push(token);
                    parseField(type, "optional");
                    break;
            }
        });
        parent.add(type);
    }

    function parseField(parent, rule, extend) {
        var type = next();
        if (type === "group") {
            parseGroup(parent, rule);
            return;
        }

        /* istanbul ignore if */
        if (!typeRefRe.test(type))
            throw illegal(type, "type");

        var name = next();

        /* istanbul ignore if */
        if (!nameRe.test(name))
            throw illegal(name, "name");

        name = applyCase(name);
        skip("=");

        var field = new Field(name, parseId(next()), type, rule, extend);
        ifBlock(field, function parseField_block(token) {

            /* istanbul ignore else */
            if (token === "option") {
                parseOption(field, token);
                skip(";");
            } else
                throw illegal(token);

        }, function parseField_line() {
            parseInlineOptions(field);
        });
        parent.add(field);

        // JSON defaults to packed=true if not set so we have to set packed=false explicity when
        // parsing proto2 descriptors without the option, where applicable. This must be done for
        // any type (not just packable types) because enums also use varint encoding and it is not
        // yet known whether a type is an enum or not.
        if (!isProto3 && field.repeated)
            field.setOption("packed", false, /* ifNotSet */ true);
    }

    function parseGroup(parent, rule) {
        var name = next();

        /* istanbul ignore if */
        if (!nameRe.test(name))
            throw illegal(name, "name");

        var fieldName = util.lcFirst(name);
        if (name === fieldName)
            name = util.ucFirst(name);
        skip("=");
        var id = parseId(next());
        var type = new Type(name);
        type.group = true;
        var field = new Field(fieldName, id, name, rule);
        field.filename = parse.filename;
        ifBlock(type, function parseGroup_block(token) {
            switch (token) {

                case "option":
                    parseOption(type, token);
                    skip(";");
                    break;

                case "required":
                case "optional":
                case "repeated":
                    parseField(type, token);
                    break;

                /* istanbul ignore next */
                default:
                    throw illegal(token); // there are no groups with proto3 semantics
            }
        });
        parent.add(type)
              .add(field);
    }

    function parseMapField(parent) {
        skip("<");
        var keyType = next();

        /* istanbul ignore if */
        if (types.mapKey[keyType] === undefined)
            throw illegal(keyType, "type");

        skip(",");
        var valueType = next();

        /* istanbul ignore if */
        if (!typeRefRe.test(valueType))
            throw illegal(valueType, "type");

        skip(">");
        var name = next();

        /* istanbul ignore if */
        if (!nameRe.test(name))
            throw illegal(name, "name");

        skip("=");
        var field = new MapField(applyCase(name), parseId(next()), keyType, valueType);
        ifBlock(field, function parseMapField_block(token) {

            /* istanbul ignore else */
            if (token === "option") {
                parseOption(field, token);
                skip(";");
            } else
                throw illegal(token);

        }, function parseMapField_line() {
            parseInlineOptions(field);
        });
        parent.add(field);
    }

    function parseOneOf(parent, token) {

        /* istanbul ignore if */
        if (!nameRe.test(token = next()))
            throw illegal(token, "name");

        var oneof = new OneOf(applyCase(token));
        ifBlock(oneof, function parseOneOf_block(token) {
            if (token === "option") {
                parseOption(oneof, token);
                skip(";");
            } else {
                push(token);
                parseField(oneof, "optional");
            }
        });
        parent.add(oneof);
    }

    function parseEnum(parent, token) {

        /* istanbul ignore if */
        if (!nameRe.test(token = next()))
            throw illegal(token, "name");

        var enm = new Enum(token);
        ifBlock(enm, function parseEnum_block(token) {
            if (token === "option") {
                parseOption(enm, token);
                skip(";");
            } else
                parseEnumValue(enm, token);
        });
        parent.add(enm);
    }

    function parseEnumValue(parent, token) {

        /* istanbul ignore if */
        if (!nameRe.test(token))
            throw illegal(token, "name");

        skip("=");
        var value = parseId(next(), true),
            dummy = {};
        ifBlock(dummy, function parseEnumValue_block(token) {

            /* istanbul ignore else */
            if (token === "option") {
                parseOption(dummy, token); // skip
                skip(";");
            } else
                throw illegal(token);

        }, function parseEnumValue_line() {
            parseInlineOptions(dummy); // skip
        });
        parent.add(token, value, dummy.comment);
    }

    function parseOption(parent, token) {
        var isCustom = skip("(", true);

        /* istanbul ignore if */
        if (!typeRefRe.test(token = next()))
            throw illegal(token, "name");

        var name = token;
        if (isCustom) {
            skip(")");
            name = "(" + name + ")";
            token = peek();
            if (fqTypeRefRe.test(token)) {
                name += token;
                next();
            }
        }
        skip("=");
        parseOptionValue(parent, name);
    }

    function parseOptionValue(parent, name) {
        if (skip("{", true)) { // { a: "foo" b { c: "bar" } }
            do {
                /* istanbul ignore if */
                if (!nameRe.test(token = next()))
                    throw illegal(token, "name");

                if (peek() === "{")
                    parseOptionValue(parent, name + "." + token);
                else {
                    skip(":");
                    setOption(parent, name + "." + token, readValue(true));
                }
            } while (!skip("}", true));
        } else
            setOption(parent, name, readValue(true));
        // Does not enforce a delimiter to be universal
    }

    function setOption(parent, name, value) {
        if (parent.setOption)
            parent.setOption(name, value);
    }

    function parseInlineOptions(parent) {
        if (skip("[", true)) {
            do {
                parseOption(parent, "option");
            } while (skip(",", true));
            skip("]");
        }
        return parent;
    }

    function parseService(parent, token) {

        /* istanbul ignore if */
        if (!nameRe.test(token = next()))
            throw illegal(token, "service name");

        var service = new Service(token);
        ifBlock(service, function parseService_block(token) {
            if (parseCommon(service, token))
                return;

            /* istanbul ignore else */
            if (token === "rpc")
                parseMethod(service, token);
            else
                throw illegal(token);
        });
        parent.add(service);
    }

    function parseMethod(parent, token) {
        var type = token;

        /* istanbul ignore if */
        if (!nameRe.test(token = next()))
            throw illegal(token, "name");

        var name = token,
            requestType, requestStream,
            responseType, responseStream;

        skip("(");
        if (skip("stream", true))
            requestStream = true;

        /* istanbul ignore if */
        if (!typeRefRe.test(token = next()))
            throw illegal(token);

        requestType = token;
        skip(")"); skip("returns"); skip("(");
        if (skip("stream", true))
            responseStream = true;

        /* istanbul ignore if */
        if (!typeRefRe.test(token = next()))
            throw illegal(token);

        responseType = token;
        skip(")");

        var method = new Method(name, type, requestType, responseType, requestStream, responseStream);
        ifBlock(method, function parseMethod_block(token) {

            /* istanbul ignore else */
            if (token === "option") {
                parseOption(method, token);
                skip(";");
            } else
                throw illegal(token);

        });
        parent.add(method);
    }

    function parseExtension(parent, token) {

        /* istanbul ignore if */
        if (!typeRefRe.test(token = next()))
            throw illegal(token, "reference");

        var reference = token;
        ifBlock(null, function parseExtension_block(token) {
            switch (token) {

                case "required":
                case "repeated":
                case "optional":
                    parseField(parent, token, reference);
                    break;

                default:
                    /* istanbul ignore if */
                    if (!isProto3 || !typeRefRe.test(token))
                        throw illegal(token);
                    push(token);
                    parseField(parent, "optional", reference);
                    break;
            }
        });
    }

    var token;
    while ((token = next()) !== null) {
        switch (token) {

            case "package":

                /* istanbul ignore if */
                if (!head)
                    throw illegal(token);

                parsePackage();
                break;

            case "import":

                /* istanbul ignore if */
                if (!head)
                    throw illegal(token);

                parseImport();
                break;

            case "syntax":

                /* istanbul ignore if */
                if (!head)
                    throw illegal(token);

                parseSyntax();
                break;

            case "option":

                /* istanbul ignore if */
                if (!head)
                    throw illegal(token);

                parseOption(ptr, token);
                skip(";");
                break;

            default:

                /* istanbul ignore else */
                if (parseCommon(ptr, token)) {
                    head = false;
                    continue;
                }

                /* istanbul ignore next */
                throw illegal(token);
        }
    }

    parse.filename = null;
    return {
        "package"     : pkg,
        "imports"     : imports,
         weakImports  : weakImports,
         syntax       : syntax,
         root         : root
    };
}

/**
 * Parses the given .proto source and returns an object with the parsed contents.
 * @name parse
 * @function
 * @param {string} source Source contents
 * @param {ParseOptions} [options] Parse options. Defaults to {@link parse.defaults} when omitted.
 * @returns {ParserResult} Parser result
 * @property {string} filename=null Currently processing file name for error reporting, if known
 * @property {ParseOptions} defaults Default {@link ParseOptions}
 * @variation 2
 */

},{"./enum":18,"./field":19,"./mapfield":23,"./method":25,"./oneof":28,"./root":32,"./service":35,"./tokenize":36,"./type":37,"./types":38,"./util":39}],30:[function(require,module,exports){
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

},{"./util/minimal":41}],31:[function(require,module,exports){
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

},{"./reader":30,"./util/minimal":41}],32:[function(require,module,exports){
"use strict";
module.exports = Root;

// extends Namespace
var Namespace = require("./namespace");
((Root.prototype = Object.create(Namespace.prototype)).constructor = Root).className = "Root";

var Field   = require("./field"),
    Enum    = require("./enum"),
    util    = require("./util");

var Type,   // cyclic
    parse,  // might be excluded
    common; // "

/**
 * Constructs a new root namespace instance.
 * @classdesc Root namespace wrapping all types, enums, services, sub-namespaces etc. that belong together.
 * @extends NamespaceBase
 * @constructor
 * @param {Object.<string,*>} [options] Top level options
 */
function Root(options) {
    Namespace.call(this, "", options);

    /**
     * Deferred extension fields.
     * @type {Field[]}
     */
    this.deferred = [];

    /**
     * Resolved file names of loaded files.
     * @type {string[]}
     */
    this.files = [];
}

/**
 * Loads a namespace descriptor into a root namespace.
 * @param {NamespaceDescriptor} json Nameespace descriptor
 * @param {Root} [root] Root namespace, defaults to create a new one if omitted
 * @returns {Root} Root namespace
 */
Root.fromJSON = function fromJSON(json, root) {
    if (!root)
        root = new Root();
    if (json.options)
        root.setOptions(json.options);
    return root.addJSON(json.nested);
};

/**
 * Resolves the path of an imported file, relative to the importing origin.
 * This method exists so you can override it with your own logic in case your imports are scattered over multiple directories.
 * @function
 * @param {string} origin The file name of the importing file
 * @param {string} target The file name being imported
 * @returns {?string} Resolved path to `target` or `null` to skip the file
 */
Root.prototype.resolvePath = util.path.resolve;

// A symbol-like function to safely signal synchronous loading
/* istanbul ignore next */
function SYNC() {} // eslint-disable-line no-empty-function

/**
 * Loads one or multiple .proto or preprocessed .json files into this root namespace and calls the callback.
 * @param {string|string[]} filename Names of one or multiple files to load
 * @param {ParseOptions} options Parse options
 * @param {LoadCallback} callback Callback function
 * @returns {undefined}
 */
Root.prototype.load = function load(filename, options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }
    var self = this;
    if (!callback)
        return util.asPromise(load, self, filename, options);

    var sync = callback === SYNC; // undocumented

    // Finishes loading by calling the callback (exactly once)
    function finish(err, root) {
        /* istanbul ignore if */
        if (!callback)
            return;
        var cb = callback;
        callback = null;
        if (sync)
            throw err;
        cb(err, root);
    }

    // Processes a single file
    function process(filename, source) {
        try {
            if (util.isString(source) && source.charAt(0) === "{")
                source = JSON.parse(source);
            if (!util.isString(source))
                self.setOptions(source.options).addJSON(source.nested);
            else {
                parse.filename = filename;
                var parsed = parse(source, self, options),
                    resolved,
                    i = 0;
                if (parsed.imports)
                    for (; i < parsed.imports.length; ++i)
                        if (resolved = self.resolvePath(filename, parsed.imports[i]))
                            fetch(resolved);
                if (parsed.weakImports)
                    for (i = 0; i < parsed.weakImports.length; ++i)
                        if (resolved = self.resolvePath(filename, parsed.weakImports[i]))
                            fetch(resolved, true);
            }
        } catch (err) {
            finish(err);
        }
        if (!sync && !queued)
            finish(null, self); // only once anyway
    }

    // Fetches a single file
    function fetch(filename, weak) {

        // Strip path if this file references a bundled definition
        var idx = filename.lastIndexOf("google/protobuf/");
        if (idx > -1) {
            var altname = filename.substring(idx);
            if (altname in common)
                filename = altname;
        }

        // Skip if already loaded / attempted
        if (self.files.indexOf(filename) > -1)
            return;
        self.files.push(filename);

        // Shortcut bundled definitions
        if (filename in common) {
            if (sync)
                process(filename, common[filename]);
            else {
                ++queued;
                setTimeout(function() {
                    --queued;
                    process(filename, common[filename]);
                });
            }
            return;
        }

        // Otherwise fetch from disk or network
        if (sync) {
            var source;
            try {
                source = util.fs.readFileSync(filename).toString("utf8");
            } catch (err) {
                if (!weak)
                    finish(err);
                return;
            }
            process(filename, source);
        } else {
            ++queued;
            util.fetch(filename, function(err, source) {
                --queued;
                /* istanbul ignore if */
                if (!callback)
                    return; // terminated meanwhile
                if (err) {
                    /* istanbul ignore else */
                    if (!weak)
                        finish(err);
                    else if (!queued) // can't be covered reliably
                        finish(null, self);
                    return;
                }
                process(filename, source);
            });
        }
    }
    var queued = 0;

    // Assembling the root namespace doesn't require working type
    // references anymore, so we can load everything in parallel
    if (util.isString(filename))
        filename = [ filename ];
    for (var i = 0, resolved; i < filename.length; ++i)
        if (resolved = self.resolvePath("", filename[i]))
            fetch(resolved);

    if (sync)
        return self;
    if (!queued)
        finish(null, self);
    return undefined;
};
// function load(filename:string, options:ParseOptions, callback:LoadCallback):undefined

/**
 * Loads one or multiple .proto or preprocessed .json files into this root namespace and calls the callback.
 * @param {string|string[]} filename Names of one or multiple files to load
 * @param {LoadCallback} callback Callback function
 * @returns {undefined}
 * @variation 2
 */
// function load(filename:string, callback:LoadCallback):undefined

/**
 * Loads one or multiple .proto or preprocessed .json files into this root namespace and returns a promise.
 * @name Root#load
 * @function
 * @param {string|string[]} filename Names of one or multiple files to load
 * @param {ParseOptions} [options] Parse options. Defaults to {@link parse.defaults} when omitted.
 * @returns {Promise<Root>} Promise
 * @variation 3
 */
// function load(filename:string, [options:ParseOptions]):Promise<Root>

/**
 * Synchronously loads one or multiple .proto or preprocessed .json files into this root namespace (node only).
 * @name Root#loadSync
 * @function
 * @param {string|string[]} filename Names of one or multiple files to load
 * @param {ParseOptions} [options] Parse options. Defaults to {@link parse.defaults} when omitted.
 * @returns {Root} Root namespace
 * @throws {Error} If synchronous fetching is not supported (i.e. in browsers) or if a file's syntax is invalid
 */
Root.prototype.loadSync = function loadSync(filename, options) {
    if (!util.isNode)
        throw Error("not supported");
    return this.load(filename, options, SYNC);
};

/**
 * @override
 */
Root.prototype.resolveAll = function resolveAll() {
    if (this.deferred.length)
        throw Error("unresolvable extensions: " + this.deferred.map(function(field) {
            return "'extend " + field.extend + "' in " + field.parent.fullName;
        }).join(", "));
    return Namespace.prototype.resolveAll.call(this);
};

// only uppercased (and thus conflict-free) children are exposed, see below
var exposeRe = /^[A-Z]/;

/**
 * Handles a deferred declaring extension field by creating a sister field to represent it within its extended type.
 * @param {Root} root Root instance
 * @param {Field} field Declaring extension field witin the declaring type
 * @returns {boolean} `true` if successfully added to the extended type, `false` otherwise
 * @inner
 * @ignore
 */
function tryHandleExtension(root, field) {
    var extendedType = field.parent.lookup(field.extend);
    if (extendedType) {
        var sisterField = new Field(field.fullName, field.id, field.type, field.rule, undefined, field.options);
        sisterField.declaringField = field;
        field.extensionField = sisterField;
        extendedType.add(sisterField);
        return true;
    }
    return false;
}

/**
 * Called when any object is added to this root or its sub-namespaces.
 * @param {ReflectionObject} object Object added
 * @returns {undefined}
 * @private
 */
Root.prototype._handleAdd = function _handleAdd(object) {
    if (object instanceof Field) {

        if (/* an extension field (implies not part of a oneof) */ object.extend !== undefined && /* not already handled */ !object.extensionField)
            if (!tryHandleExtension(this, object))
                this.deferred.push(object);

    } else if (object instanceof Enum) {

        if (exposeRe.test(object.name))
            object.parent[object.name] = object.values; // expose enum values as property of its parent

    } else /* everything else is a namespace */ {

        if (object instanceof Type) // Try to handle any deferred extensions
            for (var i = 0; i < this.deferred.length;)
                if (tryHandleExtension(this, this.deferred[i]))
                    this.deferred.splice(i, 1);
                else
                    ++i;
        for (var j = 0; j < /* initializes */ object.nestedArray.length; ++j) // recurse into the namespace
            this._handleAdd(object._nestedArray[j]);
        if (exposeRe.test(object.name))
            object.parent[object.name] = object; // expose namespace as property of its parent
    }

    // The above also adds uppercased (and thus conflict-free) nested types, services and enums as
    // properties of namespaces just like static code does. This allows using a .d.ts generated for
    // a static module with reflection-based solutions where the condition is met.
};

/**
 * Called when any object is removed from this root or its sub-namespaces.
 * @param {ReflectionObject} object Object removed
 * @returns {undefined}
 * @private
 */
Root.prototype._handleRemove = function _handleRemove(object) {
    if (object instanceof Field) {

        if (/* an extension field */ object.extend !== undefined) {
            if (/* already handled */ object.extensionField) { // remove its sister field
                object.extensionField.parent.remove(object.extensionField);
                object.extensionField = null;
            } else { // cancel the extension
                var index = this.deferred.indexOf(object);
                /* istanbul ignore else */
                if (index > -1)
                    this.deferred.splice(index, 1);
            }
        }

    } else if (object instanceof Enum) {

        if (exposeRe.test(object.name))
            delete object.parent[object.name]; // unexpose enum values

    } else if (object instanceof Namespace) {

        for (var i = 0; i < /* initializes */ object.nestedArray.length; ++i) // recurse into the namespace
            this._handleRemove(object._nestedArray[i]);

        if (exposeRe.test(object.name))
            delete object.parent[object.name]; // unexpose namespaces

    }
};

Root._configure = function(Type_, parse_, common_) {
    Type = Type_;
    parse = parse_;
    common = common_;
};

},{"./enum":18,"./field":19,"./namespace":26,"./util":39}],33:[function(require,module,exports){
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

},{"./rpc/service":34}],34:[function(require,module,exports){
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

},{"../util/minimal":41}],35:[function(require,module,exports){
"use strict";
module.exports = Service;

// extends Namespace
var Namespace = require("./namespace");
((Service.prototype = Object.create(Namespace.prototype)).constructor = Service).className = "Service";

var Method = require("./method"),
    util   = require("./util"),
    rpc    = require("./rpc");

/**
 * Constructs a new service instance.
 * @classdesc Reflected service.
 * @extends NamespaceBase
 * @constructor
 * @param {string} name Service name
 * @param {Object.<string,*>} [options] Service options
 * @throws {TypeError} If arguments are invalid
 */
function Service(name, options) {
    Namespace.call(this, name, options);

    /**
     * Service methods.
     * @type {Object.<string,Method>}
     */
    this.methods = {}; // toJSON, marker

    /**
     * Cached methods as an array.
     * @type {?Method[]}
     * @private
     */
    this._methodsArray = null;
}

/**
 * Service descriptor.
 * @typedef ServiceDescriptor
 * @type {Object}
 * @property {Object.<string,*>} [options] Service options
 * @property {Object.<string,MethodDescriptor>} methods Method descriptors
 * @property {Object.<string,AnyNestedDescriptor>} [nested] Nested object descriptors
 */

/**
 * Constructs a service from a service descriptor.
 * @param {string} name Service name
 * @param {ServiceDescriptor} json Service descriptor
 * @returns {Service} Created service
 * @throws {TypeError} If arguments are invalid
 */
Service.fromJSON = function fromJSON(name, json) {
    var service = new Service(name, json.options);
    /* istanbul ignore else */
    if (json.methods)
        for (var names = Object.keys(json.methods), i = 0; i < names.length; ++i)
            service.add(Method.fromJSON(names[i], json.methods[names[i]]));
    if (json.nested)
        service.addJSON(json.nested);
    return service;
};

/**
 * Converts this service to a service descriptor.
 * @returns {ServiceDescriptor} Service descriptor
 */
Service.prototype.toJSON = function toJSON() {
    var inherited = Namespace.prototype.toJSON.call(this);
    return {
        options : inherited && inherited.options || undefined,
        methods : Namespace.arrayToJSON(this.methodsArray) || /* istanbul ignore next */ {},
        nested  : inherited && inherited.nested || undefined
    };
};

/**
 * Methods of this service as an array for iteration.
 * @name Service#methodsArray
 * @type {Method[]}
 * @readonly
 */
Object.defineProperty(Service.prototype, "methodsArray", {
    get: function() {
        return this._methodsArray || (this._methodsArray = util.toArray(this.methods));
    }
});

function clearCache(service) {
    service._methodsArray = null;
    return service;
}

/**
 * @override
 */
Service.prototype.get = function get(name) {
    return this.methods[name]
        || Namespace.prototype.get.call(this, name);
};

/**
 * @override
 */
Service.prototype.resolveAll = function resolveAll() {
    var methods = this.methodsArray;
    for (var i = 0; i < methods.length; ++i)
        methods[i].resolve();
    return Namespace.prototype.resolve.call(this);
};

/**
 * @override
 */
Service.prototype.add = function add(object) {

    /* istanbul ignore if */
    if (this.get(object.name))
        throw Error("duplicate name '" + object.name + "' in " + this);

    if (object instanceof Method) {
        this.methods[object.name] = object;
        object.parent = this;
        return clearCache(this);
    }
    return Namespace.prototype.add.call(this, object);
};

/**
 * @override
 */
Service.prototype.remove = function remove(object) {
    if (object instanceof Method) {

        /* istanbul ignore if */
        if (this.methods[object.name] !== object)
            throw Error(object + " is not a member of " + this);

        delete this.methods[object.name];
        object.parent = null;
        return clearCache(this);
    }
    return Namespace.prototype.remove.call(this, object);
};

/**
 * Creates a runtime service using the specified rpc implementation.
 * @param {RPCImpl} rpcImpl RPC implementation
 * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
 * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
 * @returns {rpc.Service} RPC service. Useful where requests and/or responses are streamed.
 */
Service.prototype.create = function create(rpcImpl, requestDelimited, responseDelimited) {
    var rpcService = new rpc.Service(rpcImpl, requestDelimited, responseDelimited);
    for (var i = 0; i < /* initializes */ this.methodsArray.length; ++i) {
        rpcService[util.lcFirst(this._methodsArray[i].resolve().name)] = util.codegen("r","c")("return this.rpcCall(m,q,s,r,c)").eof(util.lcFirst(this._methodsArray[i].name), {
            m: this._methodsArray[i],
            q: this._methodsArray[i].resolvedRequestType.ctor,
            s: this._methodsArray[i].resolvedResponseType.ctor
        });
    }
    return rpcService;
};

},{"./method":25,"./namespace":26,"./rpc":33,"./util":39}],36:[function(require,module,exports){
"use strict";
module.exports = tokenize;

var delimRe        = /[\s{}=;:[\],'"()<>]/g,
    stringDoubleRe = /(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g,
    stringSingleRe = /(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g;

var setCommentRe = /^ *[*/]+ */,
    setCommentSplitRe = /\n/g,
    whitespaceRe = /\s/,
    unescapeRe = /\\(.?)/g;

var unescapeMap = {
    "0": "\0",
    "r": "\r",
    "n": "\n",
    "t": "\t"
};

/**
 * Unescapes a string.
 * @param {string} str String to unescape
 * @returns {string} Unescaped string
 * @property {Object.<string,string>} map Special characters map
 * @ignore
 */
function unescape(str) {
    return str.replace(unescapeRe, function($0, $1) {
        switch ($1) {
            case "\\":
            case "":
                return $1;
            default:
                return unescapeMap[$1] || "";
        }
    });
}

tokenize.unescape = unescape;

/**
 * Handle object returned from {@link tokenize}.
 * @typedef {Object.<string,*>} TokenizerHandle
 * @property {function():number} line Gets the current line number
 * @property {function():?string} next Gets the next token and advances (`null` on eof)
 * @property {function():?string} peek Peeks for the next token (`null` on eof)
 * @property {function(string)} push Pushes a token back to the stack
 * @property {function(string, boolean=):boolean} skip Skips a token, returns its presence and advances or, if non-optional and not present, throws
 * @property {function(number=):?string} cmnt Gets the comment on the previous line or the line comment on the specified line, if any
 */

/**
 * Tokenizes the given .proto source and returns an object with useful utility functions.
 * @param {string} source Source contents
 * @returns {TokenizerHandle} Tokenizer handle
 * @property {function(string):string} unescape Unescapes a string
 */
function tokenize(source) {
    /* eslint-disable callback-return */
    source = source.toString();

    var offset = 0,
        length = source.length,
        line = 1,
        commentType = null,
        commentText = null,
        commentLine = 0;

    var stack = [];

    var stringDelim = null;

    /* istanbul ignore next */
    /**
     * Creates an error for illegal syntax.
     * @param {string} subject Subject
     * @returns {Error} Error created
     * @inner
     */
    function illegal(subject) {
        return Error("illegal " + subject + " (line " + line + ")");
    }

    /**
     * Reads a string till its end.
     * @returns {string} String read
     * @inner
     */
    function readString() {
        var re = stringDelim === "'" ? stringSingleRe : stringDoubleRe;
        re.lastIndex = offset - 1;
        var match = re.exec(source);
        if (!match)
            throw illegal("string");
        offset = re.lastIndex;
        push(stringDelim);
        stringDelim = null;
        return unescape(match[1]);
    }

    /**
     * Gets the character at `pos` within the source.
     * @param {number} pos Position
     * @returns {string} Character
     * @inner
     */
    function charAt(pos) {
        return source.charAt(pos);
    }

    /**
     * Sets the current comment text.
     * @param {number} start Start offset
     * @param {number} end End offset
     * @returns {undefined}
     * @inner
     */
    function setComment(start, end) {
        commentType = source.charAt(start++);
        commentLine = line;
        var lines = source
            .substring(start, end)
            .split(setCommentSplitRe);
        for (var i = 0; i < lines.length; ++i)
            lines[i] = lines[i].replace(setCommentRe, "").trim();
        commentText = lines
            .join("\n")
            .trim();
    }

    /**
     * Obtains the next token.
     * @returns {?string} Next token or `null` on eof
     * @inner
     */
    function next() {
        if (stack.length > 0)
            return stack.shift();
        if (stringDelim)
            return readString();
        var repeat,
            prev,
            curr,
            start,
            isComment;
        do {
            if (offset === length)
                return null;
            repeat = false;
            while (whitespaceRe.test(curr = charAt(offset))) {
                if (curr === "\n")
                    ++line;
                if (++offset === length)
                    return null;
            }
            if (charAt(offset) === "/") {
                if (++offset === length)
                    throw illegal("comment");
                if (charAt(offset) === "/") { // Line
                    isComment = charAt(start = offset + 1) === "/";
                    while (charAt(++offset) !== "\n")
                        if (offset === length)
                            return null;
                    ++offset;
                    if (isComment)
                        setComment(start, offset - 1);
                    ++line;
                    repeat = true;
                } else if ((curr = charAt(offset)) === "*") { /* Block */
                    isComment = charAt(start = offset + 1) === "*";
                    do {
                        if (curr === "\n")
                            ++line;
                        if (++offset === length)
                            throw illegal("comment");
                        prev = curr;
                        curr = charAt(offset);
                    } while (prev !== "*" || curr !== "/");
                    ++offset;
                    if (isComment)
                        setComment(start, offset - 2);
                    repeat = true;
                } else
                    return "/";
            }
        } while (repeat);

        // offset !== length if we got here

        var end = offset;
        delimRe.lastIndex = 0;
        var delim = delimRe.test(charAt(end++));
        if (!delim)
            while (end < length && !delimRe.test(charAt(end)))
                ++end;
        var token = source.substring(offset, offset = end);
        if (token === "\"" || token === "'")
            stringDelim = token;
        return token;
    }

    /**
     * Pushes a token back to the stack.
     * @param {string} token Token
     * @returns {undefined}
     * @inner
     */
    function push(token) {
        stack.push(token);
    }

    /**
     * Peeks for the next token.
     * @returns {?string} Token or `null` on eof
     * @inner
     */
    function peek() {
        if (!stack.length) {
            var token = next();
            if (token === null)
                return null;
            push(token);
        }
        return stack[0];
    }

    /**
     * Skips a token.
     * @param {string} expected Expected token
     * @param {boolean} [optional=false] Whether the token is optional
     * @returns {boolean} `true` when skipped, `false` if not
     * @throws {Error} When a required token is not present
     * @inner
     */
    function skip(expected, optional) {
        var actual = peek(),
            equals = actual === expected;
        if (equals) {
            next();
            return true;
        }
        if (!optional)
            throw illegal("token '" + actual + "', '" + expected + "' expected");
        return false;
    }

    /**
     * Gets a comment.
     * @param {number=} trailingLine Trailing line number if applicable
     * @returns {?string} Comment text
     * @inner
     */
    function cmnt(trailingLine) {
        var ret;
        if (trailingLine === undefined)
            ret = commentLine === line - 1 && commentText || null;
        else {
            if (!commentText)
                peek();
            ret = commentLine === trailingLine && commentType === "/" && commentText || null;
        }
        commentType = commentText = null;
        commentLine = 0;
        return ret;
    }

    return {
        next: next,
        peek: peek,
        push: push,
        skip: skip,
        line: function() {
            return line;
        },
        cmnt: cmnt
    };
    /* eslint-enable callback-return */
}

},{}],37:[function(require,module,exports){
"use strict";
module.exports = Type;

// extends Namespace
var Namespace = require("./namespace");
((Type.prototype = Object.create(Namespace.prototype)).constructor = Type).className = "Type";

var Enum      = require("./enum"),
    OneOf     = require("./oneof"),
    Field     = require("./field"),
    MapField  = require("./mapfield"),
    Service   = require("./service"),
    Class     = require("./class"),
    Message   = require("./message"),
    Reader    = require("./reader"),
    Writer    = require("./writer"),
    util      = require("./util"),
    encoder   = require("./encoder"),
    decoder   = require("./decoder"),
    verifier  = require("./verifier"),
    converter = require("./converter");

/**
 * Constructs a new reflected message type instance.
 * @classdesc Reflected message type.
 * @extends NamespaceBase
 * @constructor
 * @param {string} name Message name
 * @param {Object.<string,*>} [options] Declared options
 */
function Type(name, options) {
    Namespace.call(this, name, options);

    /**
     * Message fields.
     * @type {Object.<string,Field>}
     */
    this.fields = {};  // toJSON, marker

    /**
     * Oneofs declared within this namespace, if any.
     * @type {Object.<string,OneOf>}
     */
    this.oneofs = undefined; // toJSON

    /**
     * Extension ranges, if any.
     * @type {number[][]}
     */
    this.extensions = undefined; // toJSON

    /**
     * Reserved ranges, if any.
     * @type {Array.<number[]|string>}
     */
    this.reserved = undefined; // toJSON

    /*?
     * Whether this type is a legacy group.
     * @type {boolean|undefined}
     */
    this.group = undefined; // toJSON

    /**
     * Cached fields by id.
     * @type {?Object.<number,Field>}
     * @private
     */
    this._fieldsById = null;

    /**
     * Cached fields as an array.
     * @type {?Field[]}
     * @private
     */
    this._fieldsArray = null;

    /**
     * Cached oneofs as an array.
     * @type {?OneOf[]}
     * @private
     */
    this._oneofsArray = null;

    /**
     * Cached constructor.
     * @type {*}
     * @private
     */
    this._ctor = null;
}

Object.defineProperties(Type.prototype, {

    /**
     * Message fields by id.
     * @name Type#fieldsById
     * @type {Object.<number,Field>}
     * @readonly
     */
    fieldsById: {
        get: function() {

            /* istanbul ignore if */
            if (this._fieldsById)
                return this._fieldsById;

            this._fieldsById = {};
            for (var names = Object.keys(this.fields), i = 0; i < names.length; ++i) {
                var field = this.fields[names[i]],
                    id = field.id;

                /* istanbul ignore if */
                if (this._fieldsById[id])
                    throw Error("duplicate id " + id + " in " + this);

                this._fieldsById[id] = field;
            }
            return this._fieldsById;
        }
    },

    /**
     * Fields of this message as an array for iteration.
     * @name Type#fieldsArray
     * @type {Field[]}
     * @readonly
     */
    fieldsArray: {
        get: function() {
            return this._fieldsArray || (this._fieldsArray = util.toArray(this.fields));
        }
    },

    /**
     * Oneofs of this message as an array for iteration.
     * @name Type#oneofsArray
     * @type {OneOf[]}
     * @readonly
     */
    oneofsArray: {
        get: function() {
            return this._oneofsArray || (this._oneofsArray = util.toArray(this.oneofs));
        }
    },

    /**
     * The registered constructor, if any registered, otherwise a generic constructor.
     * Assigning a function replaces the internal constructor. If the function does not extend {@link Message} yet, its prototype will be setup accordingly and static methods will be populated. If it already extends {@link Message}, it will just replace the internal constructor.
     * @name Type#ctor
     * @type {Class}
     */
    ctor: {
        get: function() {
            return this._ctor || (this._ctor = Class(this).constructor);
        },
        set: function(ctor) {
            if (ctor && !(ctor.prototype instanceof Message))
                Class(this, ctor);
            else
                this._ctor = ctor;
        }
    }
});

function clearCache(type) {
    type._fieldsById = type._fieldsArray = type._oneofsArray = type._ctor = null;
    delete type.encode;
    delete type.decode;
    delete type.verify;
    return type;
}

/**
 * Message type descriptor.
 * @typedef TypeDescriptor
 * @type {Object}
 * @property {Object.<string,*>} [options] Message type options
 * @property {Object.<string,OneOfDescriptor>} [oneofs] Oneof descriptors
 * @property {Object.<string,FieldDescriptor>} fields Field descriptors
 * @property {number[][]} [extensions] Extension ranges
 * @property {number[][]} [reserved] Reserved ranges
 * @property {boolean} [group=false] Whether a legacy group or not
 * @property {Object.<string,AnyNestedDescriptor>} [nested] Nested object descriptors
 */

/**
 * Creates a message type from a message type descriptor.
 * @param {string} name Message name
 * @param {TypeDescriptor} json Message type descriptor
 * @returns {Type} Created message type
 */
Type.fromJSON = function fromJSON(name, json) {
    var type = new Type(name, json.options);
    type.extensions = json.extensions;
    type.reserved = json.reserved;
    var names = Object.keys(json.fields),
        i = 0;
    for (; i < names.length; ++i)
        type.add(
            ( typeof json.fields[names[i]].keyType !== "undefined"
            ? MapField.fromJSON
            : Field.fromJSON )(names[i], json.fields[names[i]])
        );
    if (json.oneofs)
        for (names = Object.keys(json.oneofs), i = 0; i < names.length; ++i)
            type.add(OneOf.fromJSON(names[i], json.oneofs[names[i]]));
    if (json.nested)
        for (names = Object.keys(json.nested), i = 0; i < names.length; ++i) {
            var nested = json.nested[names[i]];
            type.add( // most to least likely
                ( nested.id !== undefined
                ? Field.fromJSON
                : nested.fields !== undefined
                ? Type.fromJSON
                : nested.values !== undefined
                ? Enum.fromJSON
                : nested.methods !== undefined
                ? Service.fromJSON
                : Namespace.fromJSON )(names[i], nested)
            );
        }
    if (json.extensions && json.extensions.length)
        type.extensions = json.extensions;
    if (json.reserved && json.reserved.length)
        type.reserved = json.reserved;
    if (json.group)
        type.group = true;
    return type;
};

/**
 * Converts this message type to a message type descriptor.
 * @returns {TypeDescriptor} Message type descriptor
 */
Type.prototype.toJSON = function toJSON() {
    var inherited = Namespace.prototype.toJSON.call(this);
    return {
        options    : inherited && inherited.options || undefined,
        oneofs     : Namespace.arrayToJSON(this.oneofsArray),
        fields     : Namespace.arrayToJSON(this.fieldsArray.filter(function(obj) { return !obj.declaringField; })) || {},
        extensions : this.extensions && this.extensions.length ? this.extensions : undefined,
        reserved   : this.reserved && this.reserved.length ? this.reserved : undefined,
        group      : this.group || undefined,
        nested     : inherited && inherited.nested || undefined
    };
};

/**
 * @override
 */
Type.prototype.resolveAll = function resolveAll() {
    var fields = this.fieldsArray, i = 0;
    while (i < fields.length)
        fields[i++].resolve();
    var oneofs = this.oneofsArray; i = 0;
    while (i < oneofs.length)
        oneofs[i++].resolve();
    return Namespace.prototype.resolve.call(this);
};

/**
 * @override
 */
Type.prototype.get = function get(name) {
    return this.fields[name]
        || this.oneofs && this.oneofs[name]
        || this.nested && this.nested[name]
        || null;
};

/**
 * Adds a nested object to this type.
 * @param {ReflectionObject} object Nested object to add
 * @returns {Type} `this`
 * @throws {TypeError} If arguments are invalid
 * @throws {Error} If there is already a nested object with this name or, if a field, when there is already a field with this id
 */
Type.prototype.add = function add(object) {

    if (this.get(object.name))
        throw Error("duplicate name '" + object.name + "' in " + this);

    if (object instanceof Field && object.extend === undefined) {
        // NOTE: Extension fields aren't actual fields on the declaring type, but nested objects.
        // The root object takes care of adding distinct sister-fields to the respective extended
        // type instead.

        // avoids calling the getter if not absolutely necessary because it's called quite frequently
        if (this._fieldsById ? /* istanbul ignore next */ this._fieldsById[object.id] : this.fieldsById[object.id])
            throw Error("duplicate id " + object.id + " in " + this);
        if (this.isReservedId(object.id))
            throw Error("id " + object.id + " is reserved in " + this);
        if (this.isReservedName(object.name))
            throw Error("name '" + object.name + "' is reserved in " + this);

        if (object.parent)
            object.parent.remove(object);
        this.fields[object.name] = object;
        object.message = this;
        object.onAdd(this);
        return clearCache(this);
    }
    if (object instanceof OneOf) {
        if (!this.oneofs)
            this.oneofs = {};
        this.oneofs[object.name] = object;
        object.onAdd(this);
        return clearCache(this);
    }
    return Namespace.prototype.add.call(this, object);
};

/**
 * Removes a nested object from this type.
 * @param {ReflectionObject} object Nested object to remove
 * @returns {Type} `this`
 * @throws {TypeError} If arguments are invalid
 * @throws {Error} If `object` is not a member of this type
 */
Type.prototype.remove = function remove(object) {
    if (object instanceof Field && object.extend === undefined) {
        // See Type#add for the reason why extension fields are excluded here.

        /* istanbul ignore if */
        if (!this.fields || this.fields[object.name] !== object)
            throw Error(object + " is not a member of " + this);

        delete this.fields[object.name];
        object.parent = null;
        object.onRemove(this);
        return clearCache(this);
    }
    if (object instanceof OneOf) {

        /* istanbul ignore if */
        if (!this.oneofs || this.oneofs[object.name] !== object)
            throw Error(object + " is not a member of " + this);

        delete this.oneofs[object.name];
        object.parent = null;
        object.onRemove(this);
        return clearCache(this);
    }
    return Namespace.prototype.remove.call(this, object);
};

/**
 * Tests if the specified id is reserved.
 * @param {number} id Id to test
 * @returns {boolean} `true` if reserved, otherwise `false`
 */
Type.prototype.isReservedId = function isReservedId(id) {
    if (this.reserved)
        for (var i = 0; i < this.reserved.length; ++i)
            if (typeof this.reserved[i] !== "string" && this.reserved[i][0] <= id && this.reserved[i][1] >= id)
                return true;
    return false;
};

/**
 * Tests if the specified name is reserved.
 * @param {string} name Name to test
 * @returns {boolean} `true` if reserved, otherwise `false`
 */
Type.prototype.isReservedName = function isReservedName(name) {
    if (this.reserved)
        for (var i = 0; i < this.reserved.length; ++i)
            if (this.reserved[i] === name)
                return true;
    return false;
};

/**
 * Creates a new message of this type using the specified properties.
 * @param {Object.<string,*>} [properties] Properties to set
 * @returns {Message} Runtime message
 */
Type.prototype.create = function create(properties) {
    return new this.ctor(properties);
};

/**
 * Sets up {@link Type#encode|encode}, {@link Type#decode|decode} and {@link Type#verify|verify}.
 * @returns {Type} `this`
 */
Type.prototype.setup = function setup() {
    // Sets up everything at once so that the prototype chain does not have to be re-evaluated
    // multiple times (V8, soft-deopt prototype-check).
    var fullName = this.fullName,
        types    = [];
    for (var i = 0; i < /* initializes */ this.fieldsArray.length; ++i)
        types.push(this._fieldsArray[i].resolve().resolvedType);
    this.encode = encoder(this).eof(fullName + "$encode", {
        Writer : Writer,
        types  : types,
        util   : util
    });
    this.decode = decoder(this).eof(fullName + "$decode", {
        Reader : Reader,
        types  : types,
        util   : util
    });
    this.verify = verifier(this).eof(fullName + "$verify", {
        types : types,
        util  : util
    });
    this.fromObject = this.from = converter.fromObject(this).eof(fullName + "$fromObject", {
        types : types,
        util  : util
    });
    this.toObject = converter.toObject(this).eof(fullName + "$toObject", {
        types : types,
        util  : util
    });
    return this;
};

/**
 * Encodes a message of this type. Does not implicitly {@link Type#verify|verify} messages.
 * @param {Message|Object.<string,*>} message Message instance or plain object
 * @param {Writer} [writer] Writer to encode to
 * @returns {Writer} writer
 */
Type.prototype.encode = function encode_setup(message, writer) {
    return this.setup().encode(message, writer); // overrides this method
};

/**
 * Encodes a message of this type preceeded by its byte length as a varint. Does not implicitly {@link Type#verify|verify} messages.
 * @param {Message|Object.<string,*>} message Message instance or plain object
 * @param {Writer} [writer] Writer to encode to
 * @returns {Writer} writer
 */
Type.prototype.encodeDelimited = function encodeDelimited(message, writer) {
    return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
};

/**
 * Decodes a message of this type.
 * @param {Reader|Uint8Array} reader Reader or buffer to decode from
 * @param {number} [length] Length of the message, if known beforehand
 * @returns {Message} Decoded message
 * @throws {Error} If the payload is not a reader or valid buffer
 * @throws {util.ProtocolError} If required fields are missing
 */
Type.prototype.decode = function decode_setup(reader, length) {
    return this.setup().decode(reader, length); // overrides this method
};

/**
 * Decodes a message of this type preceeded by its byte length as a varint.
 * @param {Reader|Uint8Array} reader Reader or buffer to decode from
 * @returns {Message} Decoded message
 * @throws {Error} If the payload is not a reader or valid buffer
 * @throws {util.ProtocolError} If required fields are missing
 */
Type.prototype.decodeDelimited = function decodeDelimited(reader) {
    if (!(reader instanceof Reader))
        reader = Reader.create(reader);
    return this.decode(reader, reader.uint32());
};

/**
 * Verifies that field values are valid and that required fields are present.
 * @param {Object.<string,*>} message Plain object to verify
 * @returns {?string} `null` if valid, otherwise the reason why it is not
 */
Type.prototype.verify = function verify_setup(message) {
    return this.setup().verify(message); // overrides this method
};

/**
 * Creates a new message of this type from a plain object. Also converts values to their respective internal types.
 * @param {Object.<string,*>} object Plain object to convert
 * @returns {Message} Message instance
 */
Type.prototype.fromObject = function fromObject(object) {
    return this.setup().fromObject(object);
};

/**
 * Creates a new message of this type from a plain object. Also converts values to their respective internal types.
 * This is an alias of {@link Type#fromObject}.
 * @function
 * @param {Object.<string,*>} object Plain object
 * @returns {Message} Message instance
 */
Type.prototype.from = Type.prototype.fromObject;

/**
 * Conversion options as used by {@link Type#toObject} and {@link Message.toObject}.
 * @typedef ConversionOptions
 * @type {Object}
 * @property {*} [longs] Long conversion type.
 * Valid values are `String` and `Number` (the global types).
 * Defaults to copy the present value, which is a possibly unsafe number without and a {@link Long} with a long library.
 * @property {*} [enums] Enum value conversion type.
 * Only valid value is `String` (the global type).
 * Defaults to copy the present value, which is the numeric id.
 * @property {*} [bytes] Bytes value conversion type.
 * Valid values are `Array` and (a base64 encoded) `String` (the global types).
 * Defaults to copy the present value, which usually is a Buffer under node and an Uint8Array in the browser.
 * @property {boolean} [defaults=false] Also sets default values on the resulting object
 * @property {boolean} [arrays=false] Sets empty arrays for missing repeated fields even if `defaults=false`
 * @property {boolean} [objects=false] Sets empty objects for missing map fields even if `defaults=false`
 * @property {boolean} [oneofs=false] Includes virtual oneof properties set to the present field's name, if any
 */

/**
 * Creates a plain object from a message of this type. Also converts values to other types if specified.
 * @param {Message} message Message instance
 * @param {ConversionOptions} [options] Conversion options
 * @returns {Object.<string,*>} Plain object
 */
Type.prototype.toObject = function toObject(message, options) {
    return this.setup().toObject(message, options);
};

},{"./class":13,"./converter":15,"./decoder":16,"./encoder":17,"./enum":18,"./field":19,"./mapfield":23,"./message":24,"./namespace":26,"./oneof":28,"./reader":30,"./service":35,"./util":39,"./verifier":42,"./writer":43}],38:[function(require,module,exports){
"use strict";

/**
 * Common type constants.
 * @namespace
 */
var types = exports;

var util = require("./util");

var s = [
    "double",   // 0
    "float",    // 1
    "int32",    // 2
    "uint32",   // 3
    "sint32",   // 4
    "fixed32",  // 5
    "sfixed32", // 6
    "int64",    // 7
    "uint64",   // 8
    "sint64",   // 9
    "fixed64",  // 10
    "sfixed64", // 11
    "bool",     // 12
    "string",   // 13
    "bytes"     // 14
];

function bake(values, offset) {
    var i = 0, o = {};
    offset |= 0;
    while (i < values.length) o[s[i + offset]] = values[i++];
    return o;
}

/**
 * Basic type wire types.
 * @type {Object.<string,number>}
 * @const
 * @property {number} double=1 Fixed64 wire type
 * @property {number} float=5 Fixed32 wire type
 * @property {number} int32=0 Varint wire type
 * @property {number} uint32=0 Varint wire type
 * @property {number} sint32=0 Varint wire type
 * @property {number} fixed32=5 Fixed32 wire type
 * @property {number} sfixed32=5 Fixed32 wire type
 * @property {number} int64=0 Varint wire type
 * @property {number} uint64=0 Varint wire type
 * @property {number} sint64=0 Varint wire type
 * @property {number} fixed64=1 Fixed64 wire type
 * @property {number} sfixed64=1 Fixed64 wire type
 * @property {number} bool=0 Varint wire type
 * @property {number} string=2 Ldelim wire type
 * @property {number} bytes=2 Ldelim wire type
 */
types.basic = bake([
    /* double   */ 1,
    /* float    */ 5,
    /* int32    */ 0,
    /* uint32   */ 0,
    /* sint32   */ 0,
    /* fixed32  */ 5,
    /* sfixed32 */ 5,
    /* int64    */ 0,
    /* uint64   */ 0,
    /* sint64   */ 0,
    /* fixed64  */ 1,
    /* sfixed64 */ 1,
    /* bool     */ 0,
    /* string   */ 2,
    /* bytes    */ 2
]);

/**
 * Basic type defaults.
 * @type {Object.<string,*>}
 * @const
 * @property {number} double=0 Double default
 * @property {number} float=0 Float default
 * @property {number} int32=0 Int32 default
 * @property {number} uint32=0 Uint32 default
 * @property {number} sint32=0 Sint32 default
 * @property {number} fixed32=0 Fixed32 default
 * @property {number} sfixed32=0 Sfixed32 default
 * @property {number} int64=0 Int64 default
 * @property {number} uint64=0 Uint64 default
 * @property {number} sint64=0 Sint32 default
 * @property {number} fixed64=0 Fixed64 default
 * @property {number} sfixed64=0 Sfixed64 default
 * @property {boolean} bool=false Bool default
 * @property {string} string="" String default
 * @property {Array.<number>} bytes=Array(0) Bytes default
 * @property {Message} message=null Message default
 */
types.defaults = bake([
    /* double   */ 0,
    /* float    */ 0,
    /* int32    */ 0,
    /* uint32   */ 0,
    /* sint32   */ 0,
    /* fixed32  */ 0,
    /* sfixed32 */ 0,
    /* int64    */ 0,
    /* uint64   */ 0,
    /* sint64   */ 0,
    /* fixed64  */ 0,
    /* sfixed64 */ 0,
    /* bool     */ false,
    /* string   */ "",
    /* bytes    */ util.emptyArray,
    /* message  */ null
]);

/**
 * Basic long type wire types.
 * @type {Object.<string,number>}
 * @const
 * @property {number} int64=0 Varint wire type
 * @property {number} uint64=0 Varint wire type
 * @property {number} sint64=0 Varint wire type
 * @property {number} fixed64=1 Fixed64 wire type
 * @property {number} sfixed64=1 Fixed64 wire type
 */
types.long = bake([
    /* int64    */ 0,
    /* uint64   */ 0,
    /* sint64   */ 0,
    /* fixed64  */ 1,
    /* sfixed64 */ 1
], 7);

/**
 * Allowed types for map keys with their associated wire type.
 * @type {Object.<string,number>}
 * @const
 * @property {number} int32=0 Varint wire type
 * @property {number} uint32=0 Varint wire type
 * @property {number} sint32=0 Varint wire type
 * @property {number} fixed32=5 Fixed32 wire type
 * @property {number} sfixed32=5 Fixed32 wire type
 * @property {number} int64=0 Varint wire type
 * @property {number} uint64=0 Varint wire type
 * @property {number} sint64=0 Varint wire type
 * @property {number} fixed64=1 Fixed64 wire type
 * @property {number} sfixed64=1 Fixed64 wire type
 * @property {number} bool=0 Varint wire type
 * @property {number} string=2 Ldelim wire type
 */
types.mapKey = bake([
    /* int32    */ 0,
    /* uint32   */ 0,
    /* sint32   */ 0,
    /* fixed32  */ 5,
    /* sfixed32 */ 5,
    /* int64    */ 0,
    /* uint64   */ 0,
    /* sint64   */ 0,
    /* fixed64  */ 1,
    /* sfixed64 */ 1,
    /* bool     */ 0,
    /* string   */ 2
], 2);

/**
 * Allowed types for packed repeated fields with their associated wire type.
 * @type {Object.<string,number>}
 * @const
 * @property {number} double=1 Fixed64 wire type
 * @property {number} float=5 Fixed32 wire type
 * @property {number} int32=0 Varint wire type
 * @property {number} uint32=0 Varint wire type
 * @property {number} sint32=0 Varint wire type
 * @property {number} fixed32=5 Fixed32 wire type
 * @property {number} sfixed32=5 Fixed32 wire type
 * @property {number} int64=0 Varint wire type
 * @property {number} uint64=0 Varint wire type
 * @property {number} sint64=0 Varint wire type
 * @property {number} fixed64=1 Fixed64 wire type
 * @property {number} sfixed64=1 Fixed64 wire type
 * @property {number} bool=0 Varint wire type
 */
types.packed = bake([
    /* double   */ 1,
    /* float    */ 5,
    /* int32    */ 0,
    /* uint32   */ 0,
    /* sint32   */ 0,
    /* fixed32  */ 5,
    /* sfixed32 */ 5,
    /* int64    */ 0,
    /* uint64   */ 0,
    /* sint64   */ 0,
    /* fixed64  */ 1,
    /* sfixed64 */ 1,
    /* bool     */ 0
]);

},{"./util":39}],39:[function(require,module,exports){
"use strict";

/**
 * Various utility functions.
 * @namespace
 */
var util = module.exports = require("./util/minimal");

util.codegen = require("@protobufjs/codegen");
util.fetch   = require("@protobufjs/fetch");
util.path    = require("@protobufjs/path");

/**
 * Node's fs module if available.
 * @type {Object.<string,*>}
 */
util.fs = util.inquire("fs");

/**
 * Converts an object's values to an array.
 * @param {Object.<string,*>} object Object to convert
 * @returns {Array.<*>} Converted array
 */
util.toArray = function toArray(object) {
    var array = [];
    if (object)
        for (var keys = Object.keys(object), i = 0; i < keys.length; ++i)
            array.push(object[keys[i]]);
    return array;
};

var safePropBackslashRe = /\\/g,
    safePropQuoteRe     = /"/g;

/**
 * Returns a safe property accessor for the specified properly name.
 * @param {string} prop Property name
 * @returns {string} Safe accessor
 */
util.safeProp = function safeProp(prop) {
    return "[\"" + prop.replace(safePropBackslashRe, "\\\\").replace(safePropQuoteRe, "\\\"") + "\"]";
};

/**
 * Converts the first character of a string to upper case.
 * @param {string} str String to convert
 * @returns {string} Converted string
 */
util.ucFirst = function ucFirst(str) {
    return str.charAt(0).toUpperCase() + str.substring(1);
};

/**
 * Compares reflected fields by id.
 * @param {Field} a First field
 * @param {Field} b Second field
 * @returns {number} Comparison value
 */
util.compareFieldsById = function compareFieldsById(a, b) {
    return a.id - b.id;
};

},{"./util/minimal":41,"@protobufjs/codegen":3,"@protobufjs/fetch":5,"@protobufjs/path":8}],40:[function(require,module,exports){
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

},{"../util/minimal":41}],41:[function(require,module,exports){
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

},{"./longbits":40,"@protobufjs/aspromise":1,"@protobufjs/base64":2,"@protobufjs/eventemitter":4,"@protobufjs/float":6,"@protobufjs/inquire":7,"@protobufjs/pool":9,"@protobufjs/utf8":10}],42:[function(require,module,exports){
"use strict";
module.exports = verifier;

var Enum      = require("./enum"),
    util      = require("./util");

function invalid(field, expected) {
    return field.name + ": " + expected + (field.repeated && expected !== "array" ? "[]" : field.map && expected !== "object" ? "{k:"+field.keyType+"}" : "") + " expected";
}

/**
 * Generates a partial value verifier.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {number} fieldIndex Field index
 * @param {string} ref Variable reference
 * @returns {Codegen} Codegen instance
 * @ignore
 */
function genVerifyValue(gen, field, fieldIndex, ref) {
    /* eslint-disable no-unexpected-multiline */
    if (field.resolvedType) {
        if (field.resolvedType instanceof Enum) { gen
            ("switch(%s){", ref)
                ("default:")
                    ("return%j", invalid(field, "enum value"));
            for (var keys = Object.keys(field.resolvedType.values), j = 0; j < keys.length; ++j) gen
                ("case %d:", field.resolvedType.values[keys[j]]);
            gen
                    ("break")
            ("}");
        } else gen
            ("var e=types[%d].verify(%s);", fieldIndex, ref)
            ("if(e)")
                ("return%j+e", field.name + ".");
    } else {
        switch (field.type) {
            case "int32":
            case "uint32":
            case "sint32":
            case "fixed32":
            case "sfixed32": gen
                ("if(!util.isInteger(%s))", ref)
                    ("return%j", invalid(field, "integer"));
                break;
            case "int64":
            case "uint64":
            case "sint64":
            case "fixed64":
            case "sfixed64": gen
                ("if(!util.isInteger(%s)&&!(%s&&util.isInteger(%s.low)&&util.isInteger(%s.high)))", ref, ref, ref, ref)
                    ("return%j", invalid(field, "integer|Long"));
                break;
            case "float":
            case "double": gen
                ("if(typeof %s!==\"number\")", ref)
                    ("return%j", invalid(field, "number"));
                break;
            case "bool": gen
                ("if(typeof %s!==\"boolean\")", ref)
                    ("return%j", invalid(field, "boolean"));
                break;
            case "string": gen
                ("if(!util.isString(%s))", ref)
                    ("return%j", invalid(field, "string"));
                break;
            case "bytes": gen
                ("if(!(%s&&typeof %s.length===\"number\"||util.isString(%s)))", ref, ref, ref)
                    ("return%j", invalid(field, "buffer"));
                break;
        }
    }
    return gen;
    /* eslint-enable no-unexpected-multiline */
}

/**
 * Generates a partial key verifier.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {string} ref Variable reference
 * @returns {Codegen} Codegen instance
 * @ignore
 */
function genVerifyKey(gen, field, ref) {
    /* eslint-disable no-unexpected-multiline */
    switch (field.keyType) {
        case "int32":
        case "uint32":
        case "sint32":
        case "fixed32":
        case "sfixed32": gen
            ("if(!util.key32Re.test(%s))", ref)
                ("return%j", invalid(field, "integer key"));
            break;
        case "int64":
        case "uint64":
        case "sint64":
        case "fixed64":
        case "sfixed64": gen
            ("if(!util.key64Re.test(%s))", ref) // see comment above: x is ok, d is not
                ("return%j", invalid(field, "integer|Long key"));
            break;
        case "bool": gen
            ("if(!util.key2Re.test(%s))", ref)
                ("return%j", invalid(field, "boolean key"));
            break;
    }
    return gen;
    /* eslint-enable no-unexpected-multiline */
}

/**
 * Generates a verifier specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
function verifier(mtype) {
    /* eslint-disable no-unexpected-multiline */

    var gen = util.codegen("m")
    ("if(typeof m!==\"object\"||m===null)")
        ("return%j", "object expected");
    var oneofs = mtype.oneofsArray,
        seenFirstField = {};
    if (oneofs.length) gen
    ("var p={}");

    for (var i = 0; i < /* initializes */ mtype.fieldsArray.length; ++i) {
        var field = mtype._fieldsArray[i].resolve(),
            ref   = "m" + util.safeProp(field.name);

        if (field.optional) gen
        ("if(%s!=null&&m.hasOwnProperty(%j)){", ref, field.name); // !== undefined && !== null

        // map fields
        if (field.map) { gen
            ("if(!util.isObject(%s))", ref)
                ("return%j", invalid(field, "object"))
            ("var k=Object.keys(%s)", ref)
            ("for(var i=0;i<k.length;++i){");
                genVerifyKey(gen, field, "k[i]");
                genVerifyValue(gen, field, i, ref + "[k[i]]")
            ("}");

        // repeated fields
        } else if (field.repeated) { gen
            ("if(!Array.isArray(%s))", ref)
                ("return%j", invalid(field, "array"))
            ("for(var i=0;i<%s.length;++i){", ref);
                genVerifyValue(gen, field, i, ref + "[i]")
            ("}");

        // required or present fields
        } else {
            if (field.partOf) {
                var oneofProp = util.safeProp(field.partOf.name);
                if (seenFirstField[field.partOf.name] === 1) gen
            ("if(p%s===1)", oneofProp)
                ("return%j", field.partOf.name + ": multiple values");
                seenFirstField[field.partOf.name] = 1;
                gen
            ("p%s=1", oneofProp);
            }
            genVerifyValue(gen, field, i, ref);
        }
        if (field.optional) gen
        ("}");
    }
    return gen
    ("return null");
    /* eslint-enable no-unexpected-multiline */
}
},{"./enum":18,"./util":39}],43:[function(require,module,exports){
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

},{"./util/minimal":41}],44:[function(require,module,exports){
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

},{"./util/minimal":41,"./writer":43}],45:[function(require,module,exports){
/*eslint-disable block-scoped-var, no-redeclare, no-control-regex, no-prototype-builtins*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.main = (function() {

    /**
     * Namespace main.
     * @exports main
     * @namespace
     */
    var main = {};

    main.ProtocolMessage = (function() {

        /**
         * Properties of a ProtocolMessage.
         * @typedef main.ProtocolMessage$Properties
         * @type {Object}
         * @property {main.ProtocolMessage.MessageType} [Type] ProtocolMessage Type.
         * @property {string} [Sender] ProtocolMessage Sender.
         * @property {main.ProtocolMessage.HelloMessage$Properties} [Hello] ProtocolMessage Hello.
         * @property {main.ProtocolMessage.ConnectMessage$Properties} [Connect] ProtocolMessage Connect.
         * @property {main.ProtocolMessage.DisconnectMessage$Properties} [Disconnect] ProtocolMessage Disconnect.
         * @property {main.ProtocolMessage.PingMessage$Properties} [Ping] ProtocolMessage Ping.
         * @property {main.ProtocolMessage.PongMessage$Properties} [Pong] ProtocolMessage Pong.
         * @property {Array.<main.ProtocolMessage.SpawnMessage$Properties>} [Spawn] ProtocolMessage Spawn.
         * @property {Array.<main.ProtocolMessage.UnspawnMessage$Properties>} [Unspawn] ProtocolMessage Unspawn.
         * @property {Array.<main.ProtocolMessage.PositionMessage$Properties>} [Position] ProtocolMessage Position.
         * @property {Array.<main.ProtocolMessage.RotationMessage$Properties>} [Rotation] ProtocolMessage Rotation.
         */

        /**
         * Constructs a new ProtocolMessage.
         * @exports main.ProtocolMessage
         * @constructor
         * @param {main.ProtocolMessage$Properties=} [properties] Properties to set
         */
        function ProtocolMessage(properties) {
            this.Spawn = [];
            this.Unspawn = [];
            this.Position = [];
            this.Rotation = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProtocolMessage Type.
         * @type {main.ProtocolMessage.MessageType}
         */
        ProtocolMessage.prototype.Type = 0;

        /**
         * ProtocolMessage Sender.
         * @type {string}
         */
        ProtocolMessage.prototype.Sender = "";

        /**
         * ProtocolMessage Hello.
         * @type {(main.ProtocolMessage.HelloMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Hello = null;

        /**
         * ProtocolMessage Connect.
         * @type {(main.ProtocolMessage.ConnectMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Connect = null;

        /**
         * ProtocolMessage Disconnect.
         * @type {(main.ProtocolMessage.DisconnectMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Disconnect = null;

        /**
         * ProtocolMessage Ping.
         * @type {(main.ProtocolMessage.PingMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Ping = null;

        /**
         * ProtocolMessage Pong.
         * @type {(main.ProtocolMessage.PongMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Pong = null;

        /**
         * ProtocolMessage Spawn.
         * @type {Array.<main.ProtocolMessage.SpawnMessage$Properties>}
         */
        ProtocolMessage.prototype.Spawn = $util.emptyArray;

        /**
         * ProtocolMessage Unspawn.
         * @type {Array.<main.ProtocolMessage.UnspawnMessage$Properties>}
         */
        ProtocolMessage.prototype.Unspawn = $util.emptyArray;

        /**
         * ProtocolMessage Position.
         * @type {Array.<main.ProtocolMessage.PositionMessage$Properties>}
         */
        ProtocolMessage.prototype.Position = $util.emptyArray;

        /**
         * ProtocolMessage Rotation.
         * @type {Array.<main.ProtocolMessage.RotationMessage$Properties>}
         */
        ProtocolMessage.prototype.Rotation = $util.emptyArray;

        /**
         * Creates a new ProtocolMessage instance using the specified properties.
         * @param {main.ProtocolMessage$Properties=} [properties] Properties to set
         * @returns {main.ProtocolMessage} ProtocolMessage instance
         */
        ProtocolMessage.create = function create(properties) {
            return new ProtocolMessage(properties);
        };

        /**
         * Encodes the specified ProtocolMessage message. Does not implicitly {@link main.ProtocolMessage.verify|verify} messages.
         * @param {main.ProtocolMessage$Properties} message ProtocolMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProtocolMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.Type != null && message.hasOwnProperty("Type"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.Type);
            if (message.Sender != null && message.hasOwnProperty("Sender"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.Sender);
            if (message.Hello != null && message.hasOwnProperty("Hello"))
                $root.main.ProtocolMessage.HelloMessage.encode(message.Hello, writer.uint32(/* id 13, wireType 2 =*/106).fork()).ldelim();
            if (message.Connect != null && message.hasOwnProperty("Connect"))
                $root.main.ProtocolMessage.ConnectMessage.encode(message.Connect, writer.uint32(/* id 14, wireType 2 =*/114).fork()).ldelim();
            if (message.Disconnect != null && message.hasOwnProperty("Disconnect"))
                $root.main.ProtocolMessage.DisconnectMessage.encode(message.Disconnect, writer.uint32(/* id 15, wireType 2 =*/122).fork()).ldelim();
            if (message.Ping != null && message.hasOwnProperty("Ping"))
                $root.main.ProtocolMessage.PingMessage.encode(message.Ping, writer.uint32(/* id 16, wireType 2 =*/130).fork()).ldelim();
            if (message.Pong != null && message.hasOwnProperty("Pong"))
                $root.main.ProtocolMessage.PongMessage.encode(message.Pong, writer.uint32(/* id 17, wireType 2 =*/138).fork()).ldelim();
            if (message.Spawn != null && message.Spawn.length)
                for (var i = 0; i < message.Spawn.length; ++i)
                    $root.main.ProtocolMessage.SpawnMessage.encode(message.Spawn[i], writer.uint32(/* id 18, wireType 2 =*/146).fork()).ldelim();
            if (message.Unspawn != null && message.Unspawn.length)
                for (var i = 0; i < message.Unspawn.length; ++i)
                    $root.main.ProtocolMessage.UnspawnMessage.encode(message.Unspawn[i], writer.uint32(/* id 19, wireType 2 =*/154).fork()).ldelim();
            if (message.Position != null && message.Position.length)
                for (var i = 0; i < message.Position.length; ++i)
                    $root.main.ProtocolMessage.PositionMessage.encode(message.Position[i], writer.uint32(/* id 20, wireType 2 =*/162).fork()).ldelim();
            if (message.Rotation != null && message.Rotation.length)
                for (var i = 0; i < message.Rotation.length; ++i)
                    $root.main.ProtocolMessage.RotationMessage.encode(message.Rotation[i], writer.uint32(/* id 21, wireType 2 =*/170).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ProtocolMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.verify|verify} messages.
         * @param {main.ProtocolMessage$Properties} message ProtocolMessage message or plain object to encode
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
         * @returns {main.ProtocolMessage} ProtocolMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProtocolMessage.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolMessage();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.Type = reader.uint32();
                    break;
                case 2:
                    message.Sender = reader.string();
                    break;
                case 13:
                    message.Hello = $root.main.ProtocolMessage.HelloMessage.decode(reader, reader.uint32());
                    break;
                case 14:
                    message.Connect = $root.main.ProtocolMessage.ConnectMessage.decode(reader, reader.uint32());
                    break;
                case 15:
                    message.Disconnect = $root.main.ProtocolMessage.DisconnectMessage.decode(reader, reader.uint32());
                    break;
                case 16:
                    message.Ping = $root.main.ProtocolMessage.PingMessage.decode(reader, reader.uint32());
                    break;
                case 17:
                    message.Pong = $root.main.ProtocolMessage.PongMessage.decode(reader, reader.uint32());
                    break;
                case 18:
                    if (!(message.Spawn && message.Spawn.length))
                        message.Spawn = [];
                    message.Spawn.push($root.main.ProtocolMessage.SpawnMessage.decode(reader, reader.uint32()));
                    break;
                case 19:
                    if (!(message.Unspawn && message.Unspawn.length))
                        message.Unspawn = [];
                    message.Unspawn.push($root.main.ProtocolMessage.UnspawnMessage.decode(reader, reader.uint32()));
                    break;
                case 20:
                    if (!(message.Position && message.Position.length))
                        message.Position = [];
                    message.Position.push($root.main.ProtocolMessage.PositionMessage.decode(reader, reader.uint32()));
                    break;
                case 21:
                    if (!(message.Rotation && message.Rotation.length))
                        message.Rotation = [];
                    message.Rotation.push($root.main.ProtocolMessage.RotationMessage.decode(reader, reader.uint32()));
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
         * @returns {main.ProtocolMessage} ProtocolMessage
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
                case 13:
                case 14:
                case 15:
                case 16:
                case 17:
                case 18:
                case 19:
                case 20:
                case 21:
                    break;
                }
            if (message.Sender != null && message.hasOwnProperty("Sender"))
                if (!$util.isString(message.Sender))
                    return "Sender: string expected";
            if (message.Hello != null && message.hasOwnProperty("Hello")) {
                var error = $root.main.ProtocolMessage.HelloMessage.verify(message.Hello);
                if (error)
                    return "Hello." + error;
            }
            if (message.Connect != null && message.hasOwnProperty("Connect")) {
                var error = $root.main.ProtocolMessage.ConnectMessage.verify(message.Connect);
                if (error)
                    return "Connect." + error;
            }
            if (message.Disconnect != null && message.hasOwnProperty("Disconnect")) {
                var error = $root.main.ProtocolMessage.DisconnectMessage.verify(message.Disconnect);
                if (error)
                    return "Disconnect." + error;
            }
            if (message.Ping != null && message.hasOwnProperty("Ping")) {
                var error = $root.main.ProtocolMessage.PingMessage.verify(message.Ping);
                if (error)
                    return "Ping." + error;
            }
            if (message.Pong != null && message.hasOwnProperty("Pong")) {
                var error = $root.main.ProtocolMessage.PongMessage.verify(message.Pong);
                if (error)
                    return "Pong." + error;
            }
            if (message.Spawn != null && message.hasOwnProperty("Spawn")) {
                if (!Array.isArray(message.Spawn))
                    return "Spawn: array expected";
                for (var i = 0; i < message.Spawn.length; ++i) {
                    var error = $root.main.ProtocolMessage.SpawnMessage.verify(message.Spawn[i]);
                    if (error)
                        return "Spawn." + error;
                }
            }
            if (message.Unspawn != null && message.hasOwnProperty("Unspawn")) {
                if (!Array.isArray(message.Unspawn))
                    return "Unspawn: array expected";
                for (var i = 0; i < message.Unspawn.length; ++i) {
                    var error = $root.main.ProtocolMessage.UnspawnMessage.verify(message.Unspawn[i]);
                    if (error)
                        return "Unspawn." + error;
                }
            }
            if (message.Position != null && message.hasOwnProperty("Position")) {
                if (!Array.isArray(message.Position))
                    return "Position: array expected";
                for (var i = 0; i < message.Position.length; ++i) {
                    var error = $root.main.ProtocolMessage.PositionMessage.verify(message.Position[i]);
                    if (error)
                        return "Position." + error;
                }
            }
            if (message.Rotation != null && message.hasOwnProperty("Rotation")) {
                if (!Array.isArray(message.Rotation))
                    return "Rotation: array expected";
                for (var i = 0; i < message.Rotation.length; ++i) {
                    var error = $root.main.ProtocolMessage.RotationMessage.verify(message.Rotation[i]);
                    if (error)
                        return "Rotation." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ProtocolMessage message from a plain object. Also converts values to their respective internal types.
         * @param {Object.<string,*>} object Plain object
         * @returns {main.ProtocolMessage} ProtocolMessage
         */
        ProtocolMessage.fromObject = function fromObject(object) {
            if (object instanceof $root.main.ProtocolMessage)
                return object;
            var message = new $root.main.ProtocolMessage();
            switch (object.Type) {
            case "NONE":
            case 0:
                message.Type = 0;
                break;
            case "HELLO":
            case 13:
                message.Type = 13;
                break;
            case "CONNECT":
            case 14:
                message.Type = 14;
                break;
            case "DISCONNECT":
            case 15:
                message.Type = 15;
                break;
            case "PING":
            case 16:
                message.Type = 16;
                break;
            case "PONG":
            case 17:
                message.Type = 17;
                break;
            case "SPAWN":
            case 18:
                message.Type = 18;
                break;
            case "UNSPAWN":
            case 19:
                message.Type = 19;
                break;
            case "POSITION":
            case 20:
                message.Type = 20;
                break;
            case "ROTATION":
            case 21:
                message.Type = 21;
                break;
            }
            if (object.Sender != null)
                message.Sender = String(object.Sender);
            if (object.Hello != null) {
                if (typeof object.Hello !== "object")
                    throw TypeError(".main.ProtocolMessage.Hello: object expected");
                message.Hello = $root.main.ProtocolMessage.HelloMessage.fromObject(object.Hello);
            }
            if (object.Connect != null) {
                if (typeof object.Connect !== "object")
                    throw TypeError(".main.ProtocolMessage.Connect: object expected");
                message.Connect = $root.main.ProtocolMessage.ConnectMessage.fromObject(object.Connect);
            }
            if (object.Disconnect != null) {
                if (typeof object.Disconnect !== "object")
                    throw TypeError(".main.ProtocolMessage.Disconnect: object expected");
                message.Disconnect = $root.main.ProtocolMessage.DisconnectMessage.fromObject(object.Disconnect);
            }
            if (object.Ping != null) {
                if (typeof object.Ping !== "object")
                    throw TypeError(".main.ProtocolMessage.Ping: object expected");
                message.Ping = $root.main.ProtocolMessage.PingMessage.fromObject(object.Ping);
            }
            if (object.Pong != null) {
                if (typeof object.Pong !== "object")
                    throw TypeError(".main.ProtocolMessage.Pong: object expected");
                message.Pong = $root.main.ProtocolMessage.PongMessage.fromObject(object.Pong);
            }
            if (object.Spawn) {
                if (!Array.isArray(object.Spawn))
                    throw TypeError(".main.ProtocolMessage.Spawn: array expected");
                message.Spawn = [];
                for (var i = 0; i < object.Spawn.length; ++i) {
                    if (typeof object.Spawn[i] !== "object")
                        throw TypeError(".main.ProtocolMessage.Spawn: object expected");
                    message.Spawn[i] = $root.main.ProtocolMessage.SpawnMessage.fromObject(object.Spawn[i]);
                }
            }
            if (object.Unspawn) {
                if (!Array.isArray(object.Unspawn))
                    throw TypeError(".main.ProtocolMessage.Unspawn: array expected");
                message.Unspawn = [];
                for (var i = 0; i < object.Unspawn.length; ++i) {
                    if (typeof object.Unspawn[i] !== "object")
                        throw TypeError(".main.ProtocolMessage.Unspawn: object expected");
                    message.Unspawn[i] = $root.main.ProtocolMessage.UnspawnMessage.fromObject(object.Unspawn[i]);
                }
            }
            if (object.Position) {
                if (!Array.isArray(object.Position))
                    throw TypeError(".main.ProtocolMessage.Position: array expected");
                message.Position = [];
                for (var i = 0; i < object.Position.length; ++i) {
                    if (typeof object.Position[i] !== "object")
                        throw TypeError(".main.ProtocolMessage.Position: object expected");
                    message.Position[i] = $root.main.ProtocolMessage.PositionMessage.fromObject(object.Position[i]);
                }
            }
            if (object.Rotation) {
                if (!Array.isArray(object.Rotation))
                    throw TypeError(".main.ProtocolMessage.Rotation: array expected");
                message.Rotation = [];
                for (var i = 0; i < object.Rotation.length; ++i) {
                    if (typeof object.Rotation[i] !== "object")
                        throw TypeError(".main.ProtocolMessage.Rotation: object expected");
                    message.Rotation[i] = $root.main.ProtocolMessage.RotationMessage.fromObject(object.Rotation[i]);
                }
            }
            return message;
        };

        /**
         * Creates a ProtocolMessage message from a plain object. Also converts values to their respective internal types.
         * This is an alias of {@link main.ProtocolMessage.fromObject}.
         * @function
         * @param {Object.<string,*>} object Plain object
         * @returns {main.ProtocolMessage} ProtocolMessage
         */
        ProtocolMessage.from = ProtocolMessage.fromObject;

        /**
         * Creates a plain object from a ProtocolMessage message. Also converts values to other types if specified.
         * @param {main.ProtocolMessage} message ProtocolMessage
         * @param {$protobuf.ConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProtocolMessage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.Spawn = [];
                object.Unspawn = [];
                object.Position = [];
                object.Rotation = [];
            }
            if (options.defaults) {
                object.Type = options.enums === String ? "NONE" : 0;
                object.Sender = "";
                object.Hello = null;
                object.Connect = null;
                object.Disconnect = null;
                object.Ping = null;
                object.Pong = null;
            }
            if (message.Type != null && message.hasOwnProperty("Type"))
                object.Type = options.enums === String ? $root.main.ProtocolMessage.MessageType[message.Type] : message.Type;
            if (message.Sender != null && message.hasOwnProperty("Sender"))
                object.Sender = message.Sender;
            if (message.Hello != null && message.hasOwnProperty("Hello"))
                object.Hello = $root.main.ProtocolMessage.HelloMessage.toObject(message.Hello, options);
            if (message.Connect != null && message.hasOwnProperty("Connect"))
                object.Connect = $root.main.ProtocolMessage.ConnectMessage.toObject(message.Connect, options);
            if (message.Disconnect != null && message.hasOwnProperty("Disconnect"))
                object.Disconnect = $root.main.ProtocolMessage.DisconnectMessage.toObject(message.Disconnect, options);
            if (message.Ping != null && message.hasOwnProperty("Ping"))
                object.Ping = $root.main.ProtocolMessage.PingMessage.toObject(message.Ping, options);
            if (message.Pong != null && message.hasOwnProperty("Pong"))
                object.Pong = $root.main.ProtocolMessage.PongMessage.toObject(message.Pong, options);
            if (message.Spawn && message.Spawn.length) {
                object.Spawn = [];
                for (var j = 0; j < message.Spawn.length; ++j)
                    object.Spawn[j] = $root.main.ProtocolMessage.SpawnMessage.toObject(message.Spawn[j], options);
            }
            if (message.Unspawn && message.Unspawn.length) {
                object.Unspawn = [];
                for (var j = 0; j < message.Unspawn.length; ++j)
                    object.Unspawn[j] = $root.main.ProtocolMessage.UnspawnMessage.toObject(message.Unspawn[j], options);
            }
            if (message.Position && message.Position.length) {
                object.Position = [];
                for (var j = 0; j < message.Position.length; ++j)
                    object.Position[j] = $root.main.ProtocolMessage.PositionMessage.toObject(message.Position[j], options);
            }
            if (message.Rotation && message.Rotation.length) {
                object.Rotation = [];
                for (var j = 0; j < message.Rotation.length; ++j)
                    object.Rotation[j] = $root.main.ProtocolMessage.RotationMessage.toObject(message.Rotation[j], options);
            }
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
         * @memberof main.ProtocolMessage
         * @enum {number}
         * @property {number} NONE=0 NONE value
         * @property {number} HELLO=13 HELLO value
         * @property {number} CONNECT=14 CONNECT value
         * @property {number} DISCONNECT=15 DISCONNECT value
         * @property {number} PING=16 PING value
         * @property {number} PONG=17 PONG value
         * @property {number} SPAWN=18 SPAWN value
         * @property {number} UNSPAWN=19 UNSPAWN value
         * @property {number} POSITION=20 POSITION value
         * @property {number} ROTATION=21 ROTATION value
         */
        ProtocolMessage.MessageType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "NONE"] = 0;
            values[valuesById[13] = "HELLO"] = 13;
            values[valuesById[14] = "CONNECT"] = 14;
            values[valuesById[15] = "DISCONNECT"] = 15;
            values[valuesById[16] = "PING"] = 16;
            values[valuesById[17] = "PONG"] = 17;
            values[valuesById[18] = "SPAWN"] = 18;
            values[valuesById[19] = "UNSPAWN"] = 19;
            values[valuesById[20] = "POSITION"] = 20;
            values[valuesById[21] = "ROTATION"] = 21;
            return values;
        })();

        ProtocolMessage.HelloMessage = (function() {

            /**
             * Properties of a HelloMessage.
             * @typedef main.ProtocolMessage.HelloMessage$Properties
             * @type {Object}
             */

            /**
             * Constructs a new HelloMessage.
             * @exports main.ProtocolMessage.HelloMessage
             * @constructor
             * @param {main.ProtocolMessage.HelloMessage$Properties=} [properties] Properties to set
             */
            function HelloMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new HelloMessage instance using the specified properties.
             * @param {main.ProtocolMessage.HelloMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.HelloMessage} HelloMessage instance
             */
            HelloMessage.create = function create(properties) {
                return new HelloMessage(properties);
            };

            /**
             * Encodes the specified HelloMessage message. Does not implicitly {@link main.ProtocolMessage.HelloMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.HelloMessage$Properties} message HelloMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HelloMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified HelloMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.HelloMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.HelloMessage$Properties} message HelloMessage message or plain object to encode
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
             * @returns {main.ProtocolMessage.HelloMessage} HelloMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HelloMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolMessage.HelloMessage();
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
             * Decodes a HelloMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.HelloMessage} HelloMessage
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
                return null;
            };

            /**
             * Creates a HelloMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.HelloMessage} HelloMessage
             */
            HelloMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.main.ProtocolMessage.HelloMessage)
                    return object;
                return new $root.main.ProtocolMessage.HelloMessage();
            };

            /**
             * Creates a HelloMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.HelloMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.HelloMessage} HelloMessage
             */
            HelloMessage.from = HelloMessage.fromObject;

            /**
             * Creates a plain object from a HelloMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.HelloMessage} message HelloMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            HelloMessage.toObject = function toObject() {
                return {};
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

        ProtocolMessage.ConnectMessage = (function() {

            /**
             * Properties of a ConnectMessage.
             * @typedef main.ProtocolMessage.ConnectMessage$Properties
             * @type {Object}
             * @property {string} [Username] ConnectMessage Username.
             * @property {string} [Password] ConnectMessage Password.
             */

            /**
             * Constructs a new ConnectMessage.
             * @exports main.ProtocolMessage.ConnectMessage
             * @constructor
             * @param {main.ProtocolMessage.ConnectMessage$Properties=} [properties] Properties to set
             */
            function ConnectMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ConnectMessage Username.
             * @type {string}
             */
            ConnectMessage.prototype.Username = "";

            /**
             * ConnectMessage Password.
             * @type {string}
             */
            ConnectMessage.prototype.Password = "";

            /**
             * Creates a new ConnectMessage instance using the specified properties.
             * @param {main.ProtocolMessage.ConnectMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.ConnectMessage} ConnectMessage instance
             */
            ConnectMessage.create = function create(properties) {
                return new ConnectMessage(properties);
            };

            /**
             * Encodes the specified ConnectMessage message. Does not implicitly {@link main.ProtocolMessage.ConnectMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.ConnectMessage$Properties} message ConnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ConnectMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.Username != null && message.hasOwnProperty("Username"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.Username);
                if (message.Password != null && message.hasOwnProperty("Password"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.Password);
                return writer;
            };

            /**
             * Encodes the specified ConnectMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.ConnectMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.ConnectMessage$Properties} message ConnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ConnectMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ConnectMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.ConnectMessage} ConnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ConnectMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolMessage.ConnectMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.Username = reader.string();
                        break;
                    case 2:
                        message.Password = reader.string();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ConnectMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.ConnectMessage} ConnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ConnectMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ConnectMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            ConnectMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.Username != null && message.hasOwnProperty("Username"))
                    if (!$util.isString(message.Username))
                        return "Username: string expected";
                if (message.Password != null && message.hasOwnProperty("Password"))
                    if (!$util.isString(message.Password))
                        return "Password: string expected";
                return null;
            };

            /**
             * Creates a ConnectMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.ConnectMessage} ConnectMessage
             */
            ConnectMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.main.ProtocolMessage.ConnectMessage)
                    return object;
                var message = new $root.main.ProtocolMessage.ConnectMessage();
                if (object.Username != null)
                    message.Username = String(object.Username);
                if (object.Password != null)
                    message.Password = String(object.Password);
                return message;
            };

            /**
             * Creates a ConnectMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.ConnectMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.ConnectMessage} ConnectMessage
             */
            ConnectMessage.from = ConnectMessage.fromObject;

            /**
             * Creates a plain object from a ConnectMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.ConnectMessage} message ConnectMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ConnectMessage.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.Username = "";
                    object.Password = "";
                }
                if (message.Username != null && message.hasOwnProperty("Username"))
                    object.Username = message.Username;
                if (message.Password != null && message.hasOwnProperty("Password"))
                    object.Password = message.Password;
                return object;
            };

            /**
             * Creates a plain object from this ConnectMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ConnectMessage.prototype.toObject = function toObject(options) {
                return this.constructor.toObject(this, options);
            };

            /**
             * Converts this ConnectMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            ConnectMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return ConnectMessage;
        })();

        ProtocolMessage.DisconnectMessage = (function() {

            /**
             * Properties of a DisconnectMessage.
             * @typedef main.ProtocolMessage.DisconnectMessage$Properties
             * @type {Object}
             */

            /**
             * Constructs a new DisconnectMessage.
             * @exports main.ProtocolMessage.DisconnectMessage
             * @constructor
             * @param {main.ProtocolMessage.DisconnectMessage$Properties=} [properties] Properties to set
             */
            function DisconnectMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new DisconnectMessage instance using the specified properties.
             * @param {main.ProtocolMessage.DisconnectMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.DisconnectMessage} DisconnectMessage instance
             */
            DisconnectMessage.create = function create(properties) {
                return new DisconnectMessage(properties);
            };

            /**
             * Encodes the specified DisconnectMessage message. Does not implicitly {@link main.ProtocolMessage.DisconnectMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.DisconnectMessage$Properties} message DisconnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            DisconnectMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified DisconnectMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.DisconnectMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.DisconnectMessage$Properties} message DisconnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            DisconnectMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a DisconnectMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.DisconnectMessage} DisconnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            DisconnectMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolMessage.DisconnectMessage();
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
             * Decodes a DisconnectMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.DisconnectMessage} DisconnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            DisconnectMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a DisconnectMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            DisconnectMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                return null;
            };

            /**
             * Creates a DisconnectMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.DisconnectMessage} DisconnectMessage
             */
            DisconnectMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.main.ProtocolMessage.DisconnectMessage)
                    return object;
                return new $root.main.ProtocolMessage.DisconnectMessage();
            };

            /**
             * Creates a DisconnectMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.DisconnectMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.DisconnectMessage} DisconnectMessage
             */
            DisconnectMessage.from = DisconnectMessage.fromObject;

            /**
             * Creates a plain object from a DisconnectMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.DisconnectMessage} message DisconnectMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            DisconnectMessage.toObject = function toObject() {
                return {};
            };

            /**
             * Creates a plain object from this DisconnectMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            DisconnectMessage.prototype.toObject = function toObject(options) {
                return this.constructor.toObject(this, options);
            };

            /**
             * Converts this DisconnectMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            DisconnectMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return DisconnectMessage;
        })();

        ProtocolMessage.PingMessage = (function() {

            /**
             * Properties of a PingMessage.
             * @typedef main.ProtocolMessage.PingMessage$Properties
             * @type {Object}
             */

            /**
             * Constructs a new PingMessage.
             * @exports main.ProtocolMessage.PingMessage
             * @constructor
             * @param {main.ProtocolMessage.PingMessage$Properties=} [properties] Properties to set
             */
            function PingMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new PingMessage instance using the specified properties.
             * @param {main.ProtocolMessage.PingMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.PingMessage} PingMessage instance
             */
            PingMessage.create = function create(properties) {
                return new PingMessage(properties);
            };

            /**
             * Encodes the specified PingMessage message. Does not implicitly {@link main.ProtocolMessage.PingMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PingMessage$Properties} message PingMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PingMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified PingMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.PingMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PingMessage$Properties} message PingMessage message or plain object to encode
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
             * @returns {main.ProtocolMessage.PingMessage} PingMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PingMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolMessage.PingMessage();
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
             * @returns {main.ProtocolMessage.PingMessage} PingMessage
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
             * @returns {main.ProtocolMessage.PingMessage} PingMessage
             */
            PingMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.main.ProtocolMessage.PingMessage)
                    return object;
                return new $root.main.ProtocolMessage.PingMessage();
            };

            /**
             * Creates a PingMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.PingMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.PingMessage} PingMessage
             */
            PingMessage.from = PingMessage.fromObject;

            /**
             * Creates a plain object from a PingMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.PingMessage} message PingMessage
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
             * @typedef main.ProtocolMessage.PongMessage$Properties
             * @type {Object}
             */

            /**
             * Constructs a new PongMessage.
             * @exports main.ProtocolMessage.PongMessage
             * @constructor
             * @param {main.ProtocolMessage.PongMessage$Properties=} [properties] Properties to set
             */
            function PongMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new PongMessage instance using the specified properties.
             * @param {main.ProtocolMessage.PongMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.PongMessage} PongMessage instance
             */
            PongMessage.create = function create(properties) {
                return new PongMessage(properties);
            };

            /**
             * Encodes the specified PongMessage message. Does not implicitly {@link main.ProtocolMessage.PongMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PongMessage$Properties} message PongMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PongMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified PongMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.PongMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PongMessage$Properties} message PongMessage message or plain object to encode
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
             * @returns {main.ProtocolMessage.PongMessage} PongMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PongMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolMessage.PongMessage();
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
             * @returns {main.ProtocolMessage.PongMessage} PongMessage
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
             * @returns {main.ProtocolMessage.PongMessage} PongMessage
             */
            PongMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.main.ProtocolMessage.PongMessage)
                    return object;
                return new $root.main.ProtocolMessage.PongMessage();
            };

            /**
             * Creates a PongMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.PongMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.PongMessage} PongMessage
             */
            PongMessage.from = PongMessage.fromObject;

            /**
             * Creates a plain object from a PongMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.PongMessage} message PongMessage
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

        ProtocolMessage.SpawnMessage = (function() {

            /**
             * Properties of a SpawnMessage.
             * @typedef main.ProtocolMessage.SpawnMessage$Properties
             * @type {Object}
             * @property {string} [Name] SpawnMessage Name.
             */

            /**
             * Constructs a new SpawnMessage.
             * @exports main.ProtocolMessage.SpawnMessage
             * @constructor
             * @param {main.ProtocolMessage.SpawnMessage$Properties=} [properties] Properties to set
             */
            function SpawnMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * SpawnMessage Name.
             * @type {string}
             */
            SpawnMessage.prototype.Name = "";

            /**
             * Creates a new SpawnMessage instance using the specified properties.
             * @param {main.ProtocolMessage.SpawnMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.SpawnMessage} SpawnMessage instance
             */
            SpawnMessage.create = function create(properties) {
                return new SpawnMessage(properties);
            };

            /**
             * Encodes the specified SpawnMessage message. Does not implicitly {@link main.ProtocolMessage.SpawnMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.SpawnMessage$Properties} message SpawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SpawnMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.Name != null && message.hasOwnProperty("Name"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.Name);
                return writer;
            };

            /**
             * Encodes the specified SpawnMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.SpawnMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.SpawnMessage$Properties} message SpawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SpawnMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SpawnMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.SpawnMessage} SpawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SpawnMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolMessage.SpawnMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
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
             * Decodes a SpawnMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.SpawnMessage} SpawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SpawnMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SpawnMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            SpawnMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.Name != null && message.hasOwnProperty("Name"))
                    if (!$util.isString(message.Name))
                        return "Name: string expected";
                return null;
            };

            /**
             * Creates a SpawnMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.SpawnMessage} SpawnMessage
             */
            SpawnMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.main.ProtocolMessage.SpawnMessage)
                    return object;
                var message = new $root.main.ProtocolMessage.SpawnMessage();
                if (object.Name != null)
                    message.Name = String(object.Name);
                return message;
            };

            /**
             * Creates a SpawnMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.SpawnMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.SpawnMessage} SpawnMessage
             */
            SpawnMessage.from = SpawnMessage.fromObject;

            /**
             * Creates a plain object from a SpawnMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.SpawnMessage} message SpawnMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SpawnMessage.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    object.Name = "";
                if (message.Name != null && message.hasOwnProperty("Name"))
                    object.Name = message.Name;
                return object;
            };

            /**
             * Creates a plain object from this SpawnMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SpawnMessage.prototype.toObject = function toObject(options) {
                return this.constructor.toObject(this, options);
            };

            /**
             * Converts this SpawnMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            SpawnMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return SpawnMessage;
        })();

        ProtocolMessage.UnspawnMessage = (function() {

            /**
             * Properties of an UnspawnMessage.
             * @typedef main.ProtocolMessage.UnspawnMessage$Properties
             * @type {Object}
             */

            /**
             * Constructs a new UnspawnMessage.
             * @exports main.ProtocolMessage.UnspawnMessage
             * @constructor
             * @param {main.ProtocolMessage.UnspawnMessage$Properties=} [properties] Properties to set
             */
            function UnspawnMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new UnspawnMessage instance using the specified properties.
             * @param {main.ProtocolMessage.UnspawnMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.UnspawnMessage} UnspawnMessage instance
             */
            UnspawnMessage.create = function create(properties) {
                return new UnspawnMessage(properties);
            };

            /**
             * Encodes the specified UnspawnMessage message. Does not implicitly {@link main.ProtocolMessage.UnspawnMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.UnspawnMessage$Properties} message UnspawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            UnspawnMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified UnspawnMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.UnspawnMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.UnspawnMessage$Properties} message UnspawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            UnspawnMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an UnspawnMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.UnspawnMessage} UnspawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            UnspawnMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolMessage.UnspawnMessage();
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
             * Decodes an UnspawnMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.UnspawnMessage} UnspawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            UnspawnMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an UnspawnMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            UnspawnMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                return null;
            };

            /**
             * Creates an UnspawnMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.UnspawnMessage} UnspawnMessage
             */
            UnspawnMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.main.ProtocolMessage.UnspawnMessage)
                    return object;
                return new $root.main.ProtocolMessage.UnspawnMessage();
            };

            /**
             * Creates an UnspawnMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.UnspawnMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.UnspawnMessage} UnspawnMessage
             */
            UnspawnMessage.from = UnspawnMessage.fromObject;

            /**
             * Creates a plain object from an UnspawnMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.UnspawnMessage} message UnspawnMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            UnspawnMessage.toObject = function toObject() {
                return {};
            };

            /**
             * Creates a plain object from this UnspawnMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            UnspawnMessage.prototype.toObject = function toObject(options) {
                return this.constructor.toObject(this, options);
            };

            /**
             * Converts this UnspawnMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            UnspawnMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return UnspawnMessage;
        })();

        ProtocolMessage.PositionMessage = (function() {

            /**
             * Properties of a PositionMessage.
             * @typedef main.ProtocolMessage.PositionMessage$Properties
             * @type {Object}
             * @property {number} [X] PositionMessage X.
             * @property {number} [Y] PositionMessage Y.
             */

            /**
             * Constructs a new PositionMessage.
             * @exports main.ProtocolMessage.PositionMessage
             * @constructor
             * @param {main.ProtocolMessage.PositionMessage$Properties=} [properties] Properties to set
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
             * Creates a new PositionMessage instance using the specified properties.
             * @param {main.ProtocolMessage.PositionMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.PositionMessage} PositionMessage instance
             */
            PositionMessage.create = function create(properties) {
                return new PositionMessage(properties);
            };

            /**
             * Encodes the specified PositionMessage message. Does not implicitly {@link main.ProtocolMessage.PositionMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PositionMessage$Properties} message PositionMessage message or plain object to encode
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
                return writer;
            };

            /**
             * Encodes the specified PositionMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.PositionMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PositionMessage$Properties} message PositionMessage message or plain object to encode
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
             * @returns {main.ProtocolMessage.PositionMessage} PositionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PositionMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolMessage.PositionMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.X = reader.float();
                        break;
                    case 2:
                        message.Y = reader.float();
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
             * @returns {main.ProtocolMessage.PositionMessage} PositionMessage
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
                return null;
            };

            /**
             * Creates a PositionMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.PositionMessage} PositionMessage
             */
            PositionMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.main.ProtocolMessage.PositionMessage)
                    return object;
                var message = new $root.main.ProtocolMessage.PositionMessage();
                if (object.X != null)
                    message.X = Number(object.X);
                if (object.Y != null)
                    message.Y = Number(object.Y);
                return message;
            };

            /**
             * Creates a PositionMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.PositionMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.PositionMessage} PositionMessage
             */
            PositionMessage.from = PositionMessage.fromObject;

            /**
             * Creates a plain object from a PositionMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.PositionMessage} message PositionMessage
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
                }
                if (message.X != null && message.hasOwnProperty("X"))
                    object.X = message.X;
                if (message.Y != null && message.hasOwnProperty("Y"))
                    object.Y = message.Y;
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
             * @typedef main.ProtocolMessage.RotationMessage$Properties
             * @type {Object}
             * @property {number} [X] RotationMessage X.
             */

            /**
             * Constructs a new RotationMessage.
             * @exports main.ProtocolMessage.RotationMessage
             * @constructor
             * @param {main.ProtocolMessage.RotationMessage$Properties=} [properties] Properties to set
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
             * Creates a new RotationMessage instance using the specified properties.
             * @param {main.ProtocolMessage.RotationMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.RotationMessage} RotationMessage instance
             */
            RotationMessage.create = function create(properties) {
                return new RotationMessage(properties);
            };

            /**
             * Encodes the specified RotationMessage message. Does not implicitly {@link main.ProtocolMessage.RotationMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.RotationMessage$Properties} message RotationMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RotationMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.X != null && message.hasOwnProperty("X"))
                    writer.uint32(/* id 1, wireType 5 =*/13).float(message.X);
                return writer;
            };

            /**
             * Encodes the specified RotationMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.RotationMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.RotationMessage$Properties} message RotationMessage message or plain object to encode
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
             * @returns {main.ProtocolMessage.RotationMessage} RotationMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RotationMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolMessage.RotationMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.X = reader.float();
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
             * @returns {main.ProtocolMessage.RotationMessage} RotationMessage
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
                return null;
            };

            /**
             * Creates a RotationMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.RotationMessage} RotationMessage
             */
            RotationMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.main.ProtocolMessage.RotationMessage)
                    return object;
                var message = new $root.main.ProtocolMessage.RotationMessage();
                if (object.X != null)
                    message.X = Number(object.X);
                return message;
            };

            /**
             * Creates a RotationMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.RotationMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.RotationMessage} RotationMessage
             */
            RotationMessage.from = RotationMessage.fromObject;

            /**
             * Creates a plain object from a RotationMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.RotationMessage} message RotationMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            RotationMessage.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    object.X = 0;
                if (message.X != null && message.hasOwnProperty("X"))
                    object.X = message.X;
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

    return main;
})();

module.exports = $root;

},{"protobufjs/minimal":12}],46:[function(require,module,exports){
"use strict";

var ProtoBuf = require("protobufjs");
var webrealms_proto_js_1 = require("../proto/webrealms.proto.js");
var Client = function () {
    function Client(window) {
        var that = this;
        var builder = this.builder = webrealms_proto_js_1.main.ProtocolMessage;
        var socket = this.socket = new WebSocket("ws://" + window.location.hostname + "/ws");
        window.onmessage = function (data) {
            that.onmessage(data);
        };
        socket.onopen = function () {
            socket.binaryType = "arraybuffer";
            postMessage(["connected"]);
        };
        socket.onclose = function (evt) {
            postMessage(["disconnected", evt.type]);
        };
        socket.onmessage = function (event) {
            try {
                var m = webrealms_proto_js_1.main.ProtocolMessage.toObject(builder.decode(new Uint8Array(event.data)));
                postMessage(["message", m]);
            } catch (e) {
                if (e instanceof ProtoBuf.util.ProtocolError) {
                    console.log(e);
                } else {
                    console.log("Error", e);
                }
            }
        };
    }
    Client.prototype.onmessage = function (event) {
        switch (event.data[0]) {
            case "message":
                var content = webrealms_proto_js_1.main.ProtocolMessage.fromObject(event.data[1]);
                this.send(content);
                break;
        }
    };
    ;
    Client.prototype.send = function (message) {
        var data = this.builder.encode(message).finish();
        this.socket.send(data);
    };
    return Client;
}();
var worker = new Client(self);
module.exports = worker;

},{"../proto/webrealms.proto.js":45,"protobufjs":11}]},{},[46])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQHByb3RvYnVmanMvYXNwcm9taXNlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL2Jhc2U2NC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9jb2RlZ2VuL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL2V2ZW50ZW1pdHRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9mZXRjaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9mbG9hdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9pbnF1aXJlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL3BhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQHByb3RvYnVmanMvcG9vbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy91dGY4L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9taW5pbWFsLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL2NsYXNzLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL2NvbW1vbi5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9jb252ZXJ0ZXIuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvZGVjb2Rlci5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9lbmNvZGVyLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL2VudW0uanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvZmllbGQuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvaW5kZXgtbGlnaHQuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvaW5kZXgtbWluaW1hbC5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9tYXBmaWVsZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9tZXNzYWdlLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL21ldGhvZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9uYW1lc3BhY2UuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvb2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL29uZW9mLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3BhcnNlLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3JlYWRlci5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9yZWFkZXJfYnVmZmVyLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3Jvb3QuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvcnBjLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3JwYy9zZXJ2aWNlLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3NlcnZpY2UuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvdG9rZW5pemUuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvdHlwZS5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy90eXBlcy5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy91dGlsLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3V0aWwvbG9uZ2JpdHMuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvdXRpbC9taW5pbWFsLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3ZlcmlmaWVyLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3dyaXRlci5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy93cml0ZXJfYnVmZmVyLmpzIiwic3JjL3Byb3RvL3dlYnJlYWxtcy5wcm90by5qcyIsInNyYy93b3JrZXIvY2xpZW50Lndvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25aQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvdUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1aEVBLHVCQUF1QztBQUN2QyxtQ0FBbUQ7QUFHbkQ7QUFLSSxvQkFBbUIsQUFBTTtBQUNyQixZQUFJLEFBQUksT0FBRyxBQUFJLEFBQUM7QUFDaEIsWUFBSSxBQUFPLFVBQUcsQUFBSSxLQUFDLEFBQU8sVUFBRyxxQkFBSSxLQUFDLEFBQWUsQUFBQztBQUNsRCxZQUFJLEFBQU0sU0FBRyxBQUFJLEtBQUMsQUFBTSxTQUFHLElBQUksQUFBUyxVQUFDLEFBQU8sVUFBQyxBQUFNLE9BQUMsQUFBUSxTQUFDLEFBQVEsV0FBQyxBQUFLLEFBQUMsQUFBQztBQUNqRixBQUFNLGVBQUMsQUFBUyxZQUFHLFVBQVMsQUFBSTtBQUMzQixBQUFJLGlCQUFDLEFBQVMsVUFBQyxBQUFJLEFBQUMsQUFDekI7QUFBQyxBQUFDO0FBQ0YsQUFBTSxlQUFDLEFBQU0sU0FBRztBQUNaLEFBQU0sbUJBQUMsQUFBVSxhQUFHLEFBQWEsQUFBQztBQUNsQyxBQUFXLHdCQUFDLENBQUMsQUFBVyxBQUFDLEFBQUMsQUFBQyxBQUMvQjtBQUFDO0FBRUQsQUFBTSxlQUFDLEFBQU8sVUFBRyxVQUFTLEFBQWU7QUFDckMsQUFBVyx3QkFBQyxDQUFDLEFBQWMsZ0JBQUMsQUFBRyxJQUFDLEFBQUksQUFBQyxBQUFDLEFBQUMsQUFDM0M7QUFBQztBQUVELEFBQU0sZUFBQyxBQUFTLFlBQUcsVUFBUyxBQUFLO0FBQzdCLGdCQUFJLEFBQUM7QUFDRCxvQkFBSSxBQUFDLElBQUcscUJBQUksS0FBQyxBQUFlLGdCQUFDLEFBQVEsU0FBQyxBQUFPLFFBQUMsQUFBTSxPQUFDLElBQUksQUFBVSxXQUFDLEFBQUssTUFBQyxBQUFJLEFBQUMsQUFBQyxBQUFDLEFBQUM7QUFDbEYsQUFBVyw0QkFBQyxDQUFDLEFBQVMsV0FBQyxBQUFDLEFBQUMsQUFBQyxBQUFDLEFBQy9CO0FBQUMsY0FBQyxBQUFLLEFBQUMsT0FBQyxBQUFDLEFBQUMsR0FBQyxBQUFDO0FBQ1QsQUFBRSxBQUFDLG9CQUFDLEFBQUMsYUFBWSxBQUFRLFNBQUMsQUFBSSxLQUFDLEFBQWEsQUFBQyxlQUFDLEFBQUM7QUFDM0MsQUFBTyw0QkFBQyxBQUFHLElBQUMsQUFBQyxBQUFDLEFBQUMsQUFDbkI7QUFBQyxBQUFDLEFBQUksdUJBQUMsQUFBQztBQUNKLEFBQU8sNEJBQUMsQUFBRyxJQUFDLEFBQU8sU0FBQyxBQUFDLEFBQUMsQUFBQyxBQUMzQjtBQUFDLEFBQ0w7QUFBQyxBQUVMO0FBQUMsQUFDTDtBQUFDO0FBRU0scUJBQVMsWUFBaEIsVUFBaUIsQUFBSztBQUNsQixBQUFNLGdCQUFDLEFBQUssTUFBQyxBQUFJLEtBQUMsQUFBQyxBQUFDLEFBQUMsQUFBQztBQUNsQixpQkFBSyxBQUFTO0FBQ1Ysb0JBQUksQUFBTyxVQUF5QixxQkFBSSxLQUFDLEFBQWUsZ0JBQUMsQUFBVSxXQUFDLEFBQUssTUFBQyxBQUFJLEtBQUMsQUFBQyxBQUFDLEFBQUMsQUFBQztBQUNuRixBQUFJLHFCQUFDLEFBQUksS0FBQyxBQUFPLEFBQUMsQUFBQztBQUN2QixBQUFLLEFBQUMsQUFDVixBQUFDLEFBQ0w7O0FBQUM7QUFBQSxBQUFDO0FBRU0scUJBQUksT0FBWixVQUFhLEFBQTZCO0FBQ3RDLFlBQUksQUFBSSxPQUFHLEFBQUksS0FBQyxBQUFPLFFBQUMsQUFBTSxPQUFDLEFBQU8sQUFBQyxTQUFDLEFBQU0sQUFBRSxBQUFDO0FBQ2pELEFBQUksYUFBQyxBQUFNLE9BQUMsQUFBSSxLQUFDLEFBQUksQUFBQyxBQUFDLEFBQzNCO0FBQUM7QUFDTCxXQUFBLEFBQUM7QUFqREQsQUFpREM7QUFFRCxJQUFJLEFBQU0sU0FBVyxJQUFJLEFBQU0sT0FBQyxBQUFJLEFBQUMsQUFBQztBQUN0QyxpQkFBUyxBQUFNLEFBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gYXNQcm9taXNlO1xyXG5cclxuLyoqXHJcbiAqIENhbGxiYWNrIGFzIHVzZWQgYnkge0BsaW5rIHV0aWwuYXNQcm9taXNlfS5cclxuICogQHR5cGVkZWYgYXNQcm9taXNlQ2FsbGJhY2tcclxuICogQHR5cGUge2Z1bmN0aW9ufVxyXG4gKiBAcGFyYW0ge0Vycm9yfG51bGx9IGVycm9yIEVycm9yLCBpZiBhbnlcclxuICogQHBhcmFtIHsuLi4qfSBwYXJhbXMgQWRkaXRpb25hbCBhcmd1bWVudHNcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblxyXG4vKipcclxuICogUmV0dXJucyBhIHByb21pc2UgZnJvbSBhIG5vZGUtc3R5bGUgY2FsbGJhY2sgZnVuY3Rpb24uXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBwYXJhbSB7YXNQcm9taXNlQ2FsbGJhY2t9IGZuIEZ1bmN0aW9uIHRvIGNhbGxcclxuICogQHBhcmFtIHsqfSBjdHggRnVuY3Rpb24gY29udGV4dFxyXG4gKiBAcGFyYW0gey4uLip9IHBhcmFtcyBGdW5jdGlvbiBhcmd1bWVudHNcclxuICogQHJldHVybnMge1Byb21pc2U8Kj59IFByb21pc2lmaWVkIGZ1bmN0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBhc1Byb21pc2UoZm4sIGN0eC8qLCB2YXJhcmdzICovKSB7XHJcbiAgICB2YXIgcGFyYW1zICA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSksXHJcbiAgICAgICAgb2Zmc2V0ICA9IDAsXHJcbiAgICAgICAgaW5kZXggICA9IDIsXHJcbiAgICAgICAgcGVuZGluZyA9IHRydWU7XHJcbiAgICB3aGlsZSAoaW5kZXggPCBhcmd1bWVudHMubGVuZ3RoKVxyXG4gICAgICAgIHBhcmFtc1tvZmZzZXQrK10gPSBhcmd1bWVudHNbaW5kZXgrK107XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gZXhlY3V0b3IocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgcGFyYW1zW29mZnNldF0gPSBmdW5jdGlvbiBjYWxsYmFjayhlcnIvKiwgdmFyYXJncyAqLykge1xyXG4gICAgICAgICAgICBpZiAocGVuZGluZykge1xyXG4gICAgICAgICAgICAgICAgcGVuZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycilcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChvZmZzZXQgPCBwYXJhbXMubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXNbb2Zmc2V0KytdID0gYXJndW1lbnRzW29mZnNldF07XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZS5hcHBseShudWxsLCBwYXJhbXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBmbi5hcHBseShjdHggfHwgbnVsbCwgcGFyYW1zKTtcclxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgaWYgKHBlbmRpbmcpIHtcclxuICAgICAgICAgICAgICAgIHBlbmRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vKipcclxuICogQSBtaW5pbWFsIGJhc2U2NCBpbXBsZW1lbnRhdGlvbiBmb3IgbnVtYmVyIGFycmF5cy5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxudmFyIGJhc2U2NCA9IGV4cG9ydHM7XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgYnl0ZSBsZW5ndGggb2YgYSBiYXNlNjQgZW5jb2RlZCBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgQmFzZTY0IGVuY29kZWQgc3RyaW5nXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IEJ5dGUgbGVuZ3RoXHJcbiAqL1xyXG5iYXNlNjQubGVuZ3RoID0gZnVuY3Rpb24gbGVuZ3RoKHN0cmluZykge1xyXG4gICAgdmFyIHAgPSBzdHJpbmcubGVuZ3RoO1xyXG4gICAgaWYgKCFwKVxyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgdmFyIG4gPSAwO1xyXG4gICAgd2hpbGUgKC0tcCAlIDQgPiAxICYmIHN0cmluZy5jaGFyQXQocCkgPT09IFwiPVwiKVxyXG4gICAgICAgICsrbjtcclxuICAgIHJldHVybiBNYXRoLmNlaWwoc3RyaW5nLmxlbmd0aCAqIDMpIC8gNCAtIG47XHJcbn07XHJcblxyXG4vLyBCYXNlNjQgZW5jb2RpbmcgdGFibGVcclxudmFyIGI2NCA9IG5ldyBBcnJheSg2NCk7XHJcblxyXG4vLyBCYXNlNjQgZGVjb2RpbmcgdGFibGVcclxudmFyIHM2NCA9IG5ldyBBcnJheSgxMjMpO1xyXG5cclxuLy8gNjUuLjkwLCA5Ny4uMTIyLCA0OC4uNTcsIDQzLCA0N1xyXG5mb3IgKHZhciBpID0gMDsgaSA8IDY0OylcclxuICAgIHM2NFtiNjRbaV0gPSBpIDwgMjYgPyBpICsgNjUgOiBpIDwgNTIgPyBpICsgNzEgOiBpIDwgNjIgPyBpIC0gNCA6IGkgLSA1OSB8IDQzXSA9IGkrKztcclxuXHJcbi8qKlxyXG4gKiBFbmNvZGVzIGEgYnVmZmVyIHRvIGEgYmFzZTY0IGVuY29kZWQgc3RyaW5nLlxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZmZlciBTb3VyY2UgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCBTb3VyY2Ugc3RhcnRcclxuICogQHBhcmFtIHtudW1iZXJ9IGVuZCBTb3VyY2UgZW5kXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEJhc2U2NCBlbmNvZGVkIHN0cmluZ1xyXG4gKi9cclxuYmFzZTY0LmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShidWZmZXIsIHN0YXJ0LCBlbmQpIHtcclxuICAgIHZhciBzdHJpbmcgPSBbXTsgLy8gYWx0OiBuZXcgQXJyYXkoTWF0aC5jZWlsKChlbmQgLSBzdGFydCkgLyAzKSAqIDQpO1xyXG4gICAgdmFyIGkgPSAwLCAvLyBvdXRwdXQgaW5kZXhcclxuICAgICAgICBqID0gMCwgLy8gZ290byBpbmRleFxyXG4gICAgICAgIHQ7ICAgICAvLyB0ZW1wb3JhcnlcclxuICAgIHdoaWxlIChzdGFydCA8IGVuZCkge1xyXG4gICAgICAgIHZhciBiID0gYnVmZmVyW3N0YXJ0KytdO1xyXG4gICAgICAgIHN3aXRjaCAoaikge1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICBzdHJpbmdbaSsrXSA9IGI2NFtiID4+IDJdO1xyXG4gICAgICAgICAgICAgICAgdCA9IChiICYgMykgPDwgNDtcclxuICAgICAgICAgICAgICAgIGogPSAxO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgIHN0cmluZ1tpKytdID0gYjY0W3QgfCBiID4+IDRdO1xyXG4gICAgICAgICAgICAgICAgdCA9IChiICYgMTUpIDw8IDI7XHJcbiAgICAgICAgICAgICAgICBqID0gMjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICBzdHJpbmdbaSsrXSA9IGI2NFt0IHwgYiA+PiA2XTtcclxuICAgICAgICAgICAgICAgIHN0cmluZ1tpKytdID0gYjY0W2IgJiA2M107XHJcbiAgICAgICAgICAgICAgICBqID0gMDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChqKSB7XHJcbiAgICAgICAgc3RyaW5nW2krK10gPSBiNjRbdF07XHJcbiAgICAgICAgc3RyaW5nW2kgIF0gPSA2MTtcclxuICAgICAgICBpZiAoaiA9PT0gMSlcclxuICAgICAgICAgICAgc3RyaW5nW2kgKyAxXSA9IDYxO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBzdHJpbmcpO1xyXG59O1xyXG5cclxudmFyIGludmFsaWRFbmNvZGluZyA9IFwiaW52YWxpZCBlbmNvZGluZ1wiO1xyXG5cclxuLyoqXHJcbiAqIERlY29kZXMgYSBiYXNlNjQgZW5jb2RlZCBzdHJpbmcgdG8gYSBidWZmZXIuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgU291cmNlIHN0cmluZ1xyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZmZlciBEZXN0aW5hdGlvbiBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCBEZXN0aW5hdGlvbiBvZmZzZXRcclxuICogQHJldHVybnMge251bWJlcn0gTnVtYmVyIG9mIGJ5dGVzIHdyaXR0ZW5cclxuICogQHRocm93cyB7RXJyb3J9IElmIGVuY29kaW5nIGlzIGludmFsaWRcclxuICovXHJcbmJhc2U2NC5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUoc3RyaW5nLCBidWZmZXIsIG9mZnNldCkge1xyXG4gICAgdmFyIHN0YXJ0ID0gb2Zmc2V0O1xyXG4gICAgdmFyIGogPSAwLCAvLyBnb3RvIGluZGV4XHJcbiAgICAgICAgdDsgICAgIC8vIHRlbXBvcmFyeVxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOykge1xyXG4gICAgICAgIHZhciBjID0gc3RyaW5nLmNoYXJDb2RlQXQoaSsrKTtcclxuICAgICAgICBpZiAoYyA9PT0gNjEgJiYgaiA+IDEpXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGlmICgoYyA9IHM2NFtjXSkgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoaW52YWxpZEVuY29kaW5nKTtcclxuICAgICAgICBzd2l0Y2ggKGopIHtcclxuICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgdCA9IGM7XHJcbiAgICAgICAgICAgICAgICBqID0gMTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gdCA8PCAyIHwgKGMgJiA0OCkgPj4gNDtcclxuICAgICAgICAgICAgICAgIHQgPSBjO1xyXG4gICAgICAgICAgICAgICAgaiA9IDI7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9ICh0ICYgMTUpIDw8IDQgfCAoYyAmIDYwKSA+PiAyO1xyXG4gICAgICAgICAgICAgICAgdCA9IGM7XHJcbiAgICAgICAgICAgICAgICBqID0gMztcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gKHQgJiAzKSA8PCA2IHwgYztcclxuICAgICAgICAgICAgICAgIGogPSAwO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGogPT09IDEpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoaW52YWxpZEVuY29kaW5nKTtcclxuICAgIHJldHVybiBvZmZzZXQgLSBzdGFydDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUZXN0cyBpZiB0aGUgc3BlY2lmaWVkIHN0cmluZyBhcHBlYXJzIHRvIGJlIGJhc2U2NCBlbmNvZGVkLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFN0cmluZyB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgcHJvYmFibHkgYmFzZTY0IGVuY29kZWQsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuYmFzZTY0LnRlc3QgPSBmdW5jdGlvbiB0ZXN0KHN0cmluZykge1xyXG4gICAgcmV0dXJuIC9eKD86W0EtWmEtejAtOSsvXXs0fSkqKD86W0EtWmEtejAtOSsvXXsyfT09fFtBLVphLXowLTkrL117M309KT8kLy50ZXN0KHN0cmluZyk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IGNvZGVnZW47XHJcblxyXG52YXIgYmxvY2tPcGVuUmUgID0gL1t7W10kLyxcclxuICAgIGJsb2NrQ2xvc2VSZSA9IC9eW31cXF1dLyxcclxuICAgIGNhc2luZ1JlICAgICA9IC86JC8sXHJcbiAgICBicmFuY2hSZSAgICAgPSAvXlxccyooPzppZnx9P2Vsc2UgaWZ8d2hpbGV8Zm9yKVxcYnxcXGIoPzplbHNlKVxccyokLyxcclxuICAgIGJyZWFrUmUgICAgICA9IC9cXGIoPzpicmVha3xjb250aW51ZSkoPzogXFx3Kyk/Oz8kfF5cXHMqcmV0dXJuXFxiLztcclxuXHJcbi8qKlxyXG4gKiBBIGNsb3N1cmUgZm9yIGdlbmVyYXRpbmcgZnVuY3Rpb25zIHByb2dyYW1tYXRpY2FsbHkuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBuYW1lc3BhY2VcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7Li4uc3RyaW5nfSBwYXJhbXMgRnVuY3Rpb24gcGFyYW1ldGVyIG5hbWVzXHJcbiAqIEByZXR1cm5zIHtDb2RlZ2VufSBDb2RlZ2VuIGluc3RhbmNlXHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gc3VwcG9ydGVkIFdoZXRoZXIgY29kZSBnZW5lcmF0aW9uIGlzIHN1cHBvcnRlZCBieSB0aGUgZW52aXJvbm1lbnQuXHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gdmVyYm9zZT1mYWxzZSBXaGVuIHNldCB0byB0cnVlLCBjb2RlZ2VuIHdpbGwgbG9nIGdlbmVyYXRlZCBjb2RlIHRvIGNvbnNvbGUuIFVzZWZ1bCBmb3IgZGVidWdnaW5nLlxyXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9uKHN0cmluZywgLi4uKik6c3RyaW5nfSBzcHJpbnRmIFVuZGVybHlpbmcgc3ByaW50ZiBpbXBsZW1lbnRhdGlvblxyXG4gKi9cclxuZnVuY3Rpb24gY29kZWdlbigpIHtcclxuICAgIHZhciBwYXJhbXMgPSBbXSxcclxuICAgICAgICBzcmMgICAgPSBbXSxcclxuICAgICAgICBpbmRlbnQgPSAxLFxyXG4gICAgICAgIGluQ2FzZSA9IGZhbHNlO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOylcclxuICAgICAgICBwYXJhbXMucHVzaChhcmd1bWVudHNbaSsrXSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBIGNvZGVnZW4gaW5zdGFuY2UgYXMgcmV0dXJuZWQgYnkge0BsaW5rIGNvZGVnZW59LCB0aGF0IGFsc28gaXMgYSBzcHJpbnRmLWxpa2UgYXBwZW5kZXIgZnVuY3Rpb24uXHJcbiAgICAgKiBAdHlwZWRlZiBDb2RlZ2VuXHJcbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybWF0IEZvcm1hdCBzdHJpbmdcclxuICAgICAqIEBwYXJhbSB7Li4uKn0gYXJncyBSZXBsYWNlbWVudHNcclxuICAgICAqIEByZXR1cm5zIHtDb2RlZ2VufSBJdHNlbGZcclxuICAgICAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb24oc3RyaW5nPSk6c3RyaW5nfSBzdHIgU3RyaW5naWZpZXMgdGhlIHNvIGZhciBnZW5lcmF0ZWQgZnVuY3Rpb24gc291cmNlLlxyXG4gICAgICogQHByb3BlcnR5IHtmdW5jdGlvbihzdHJpbmc9LCBPYmplY3Q9KTpmdW5jdGlvbn0gZW9mIEVuZHMgZ2VuZXJhdGlvbiBhbmQgYnVpbGRzIHRoZSBmdW5jdGlvbiB3aGlsc3QgYXBwbHlpbmcgYSBzY29wZS5cclxuICAgICAqL1xyXG4gICAgLyoqL1xyXG4gICAgZnVuY3Rpb24gZ2VuKCkge1xyXG4gICAgICAgIHZhciBhcmdzID0gW10sXHJcbiAgICAgICAgICAgIGkgPSAwO1xyXG4gICAgICAgIGZvciAoOyBpIDwgYXJndW1lbnRzLmxlbmd0aDspXHJcbiAgICAgICAgICAgIGFyZ3MucHVzaChhcmd1bWVudHNbaSsrXSk7XHJcbiAgICAgICAgdmFyIGxpbmUgPSBzcHJpbnRmLmFwcGx5KG51bGwsIGFyZ3MpO1xyXG4gICAgICAgIHZhciBsZXZlbCA9IGluZGVudDtcclxuICAgICAgICBpZiAoc3JjLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB2YXIgcHJldiA9IHNyY1tzcmMubGVuZ3RoIC0gMV07XHJcblxyXG4gICAgICAgICAgICAvLyBibG9jayBvcGVuIG9yIG9uZSB0aW1lIGJyYW5jaFxyXG4gICAgICAgICAgICBpZiAoYmxvY2tPcGVuUmUudGVzdChwcmV2KSlcclxuICAgICAgICAgICAgICAgIGxldmVsID0gKytpbmRlbnQ7IC8vIGtlZXBcclxuICAgICAgICAgICAgZWxzZSBpZiAoYnJhbmNoUmUudGVzdChwcmV2KSlcclxuICAgICAgICAgICAgICAgICsrbGV2ZWw7IC8vIG9uY2VcclxuXHJcbiAgICAgICAgICAgIC8vIGNhc2luZ1xyXG4gICAgICAgICAgICBpZiAoY2FzaW5nUmUudGVzdChwcmV2KSAmJiAhY2FzaW5nUmUudGVzdChsaW5lKSkge1xyXG4gICAgICAgICAgICAgICAgbGV2ZWwgPSArK2luZGVudDtcclxuICAgICAgICAgICAgICAgIGluQ2FzZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5DYXNlICYmIGJyZWFrUmUudGVzdChwcmV2KSkge1xyXG4gICAgICAgICAgICAgICAgbGV2ZWwgPSAtLWluZGVudDtcclxuICAgICAgICAgICAgICAgIGluQ2FzZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBibG9jayBjbG9zZVxyXG4gICAgICAgICAgICBpZiAoYmxvY2tDbG9zZVJlLnRlc3QobGluZSkpXHJcbiAgICAgICAgICAgICAgICBsZXZlbCA9IC0taW5kZW50O1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGV2ZWw7ICsraSlcclxuICAgICAgICAgICAgbGluZSA9IFwiXFx0XCIgKyBsaW5lO1xyXG4gICAgICAgIHNyYy5wdXNoKGxpbmUpO1xyXG4gICAgICAgIHJldHVybiBnZW47XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTdHJpbmdpZmllcyB0aGUgc28gZmFyIGdlbmVyYXRlZCBmdW5jdGlvbiBzb3VyY2UuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW25hbWVdIEZ1bmN0aW9uIG5hbWUsIGRlZmF1bHRzIHRvIGdlbmVyYXRlIGFuIGFub255bW91cyBmdW5jdGlvblxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRnVuY3Rpb24gc291cmNlIHVzaW5nIHRhYnMgZm9yIGluZGVudGF0aW9uXHJcbiAgICAgKiBAaW5uZXJcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gc3RyKG5hbWUpIHtcclxuICAgICAgICByZXR1cm4gXCJmdW5jdGlvblwiICsgKG5hbWUgPyBcIiBcIiArIG5hbWUucmVwbGFjZSgvW15cXHdfJF0vZywgXCJfXCIpIDogXCJcIikgKyBcIihcIiArIHBhcmFtcy5qb2luKFwiLFwiKSArIFwiKSB7XFxuXCIgKyBzcmMuam9pbihcIlxcblwiKSArIFwiXFxufVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGdlbi5zdHIgPSBzdHI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFbmRzIGdlbmVyYXRpb24gYW5kIGJ1aWxkcyB0aGUgZnVuY3Rpb24gd2hpbHN0IGFwcGx5aW5nIGEgc2NvcGUuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW25hbWVdIEZ1bmN0aW9uIG5hbWUsIGRlZmF1bHRzIHRvIGdlbmVyYXRlIGFuIGFub255bW91cyBmdW5jdGlvblxyXG4gICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW3Njb3BlXSBGdW5jdGlvbiBzY29wZVxyXG4gICAgICogQHJldHVybnMge2Z1bmN0aW9ufSBUaGUgZ2VuZXJhdGVkIGZ1bmN0aW9uLCB3aXRoIHNjb3BlIGFwcGxpZWQgaWYgc3BlY2lmaWVkXHJcbiAgICAgKiBAaW5uZXJcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gZW9mKG5hbWUsIHNjb3BlKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBuYW1lID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgICAgIHNjb3BlID0gbmFtZTtcclxuICAgICAgICAgICAgbmFtZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHNvdXJjZSA9IGdlbi5zdHIobmFtZSk7XHJcbiAgICAgICAgaWYgKGNvZGVnZW4udmVyYm9zZSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCItLS0gY29kZWdlbiAtLS1cXG5cIiArIHNvdXJjZS5yZXBsYWNlKC9eL21nLCBcIj4gXCIpLnJlcGxhY2UoL1xcdC9nLCBcIiAgXCIpKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXHJcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzY29wZSB8fCAoc2NvcGUgPSB7fSkpO1xyXG4gICAgICAgIHJldHVybiBGdW5jdGlvbi5hcHBseShudWxsLCBrZXlzLmNvbmNhdChcInJldHVybiBcIiArIHNvdXJjZSkpLmFwcGx5KG51bGwsIGtleXMubWFwKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gc2NvcGVba2V5XTsgfSkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLW5ldy1mdW5jXHJcbiAgICAgICAgLy8gICAgIF4gQ3JlYXRlcyBhIHdyYXBwZXIgZnVuY3Rpb24gd2l0aCB0aGUgc2NvcGVkIHZhcmlhYmxlIG5hbWVzIGFzIGl0cyBwYXJhbWV0ZXJzLFxyXG4gICAgICAgIC8vICAgICAgIGNhbGxzIGl0IHdpdGggdGhlIHJlc3BlY3RpdmUgc2NvcGVkIHZhcmlhYmxlIHZhbHVlcyBeXHJcbiAgICAgICAgLy8gICAgICAgYW5kIHJldHVybnMgb3VyIGJyYW5kLW5ldyBwcm9wZXJseSBzY29wZWQgZnVuY3Rpb24uXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBUaGlzIHdvcmtzIGJlY2F1c2UgXCJJbnZva2luZyB0aGUgRnVuY3Rpb24gY29uc3RydWN0b3IgYXMgYSBmdW5jdGlvbiAod2l0aG91dCB1c2luZyB0aGVcclxuICAgICAgICAvLyBuZXcgb3BlcmF0b3IpIGhhcyB0aGUgc2FtZSBlZmZlY3QgYXMgaW52b2tpbmcgaXQgYXMgYSBjb25zdHJ1Y3Rvci5cIlxyXG4gICAgICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2RlL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0Z1bmN0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgZ2VuLmVvZiA9IGVvZjtcclxuXHJcbiAgICByZXR1cm4gZ2VuO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzcHJpbnRmKGZvcm1hdCkge1xyXG4gICAgdmFyIGFyZ3MgPSBbXSxcclxuICAgICAgICBpID0gMTtcclxuICAgIGZvciAoOyBpIDwgYXJndW1lbnRzLmxlbmd0aDspXHJcbiAgICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpKytdKTtcclxuICAgIGkgPSAwO1xyXG4gICAgZm9ybWF0ID0gZm9ybWF0LnJlcGxhY2UoLyUoW2RmanNdKS9nLCBmdW5jdGlvbigkMCwgJDEpIHtcclxuICAgICAgICBzd2l0Y2ggKCQxKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJkXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihhcmdzW2krK10pO1xyXG4gICAgICAgICAgICBjYXNlIFwiZlwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xyXG4gICAgICAgICAgICBjYXNlIFwialwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1tpKytdO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgaWYgKGkgIT09IGFyZ3MubGVuZ3RoKVxyXG4gICAgICAgIHRocm93IEVycm9yKFwiYXJndW1lbnQgY291bnQgbWlzbWF0Y2hcIik7XHJcbiAgICByZXR1cm4gZm9ybWF0O1xyXG59XHJcblxyXG5jb2RlZ2VuLnNwcmludGYgICA9IHNwcmludGY7XHJcbmNvZGVnZW4uc3VwcG9ydGVkID0gZmFsc2U7IHRyeSB7IGNvZGVnZW4uc3VwcG9ydGVkID0gY29kZWdlbihcImFcIixcImJcIikoXCJyZXR1cm4gYS1iXCIpLmVvZigpKDIsMSkgPT09IDE7IH0gY2F0Y2ggKGUpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcclxuY29kZWdlbi52ZXJib3NlICAgPSBmYWxzZTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgZXZlbnQgZW1pdHRlciBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBBIG1pbmltYWwgZXZlbnQgZW1pdHRlci5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWdpc3RlcmVkIGxpc3RlbmVycy5cclxuICAgICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZywqPn1cclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2xpc3RlbmVycyA9IHt9O1xyXG59XHJcblxyXG4vKipcclxuICogUmVnaXN0ZXJzIGFuIGV2ZW50IGxpc3RlbmVyLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZXZ0IEV2ZW50IG5hbWVcclxuICogQHBhcmFtIHtmdW5jdGlvbn0gZm4gTGlzdGVuZXJcclxuICogQHBhcmFtIHsqfSBbY3R4XSBMaXN0ZW5lciBjb250ZXh0XHJcbiAqIEByZXR1cm5zIHt1dGlsLkV2ZW50RW1pdHRlcn0gYHRoaXNgXHJcbiAqL1xyXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oZXZ0LCBmbiwgY3R4KSB7XHJcbiAgICAodGhpcy5fbGlzdGVuZXJzW2V2dF0gfHwgKHRoaXMuX2xpc3RlbmVyc1tldnRdID0gW10pKS5wdXNoKHtcclxuICAgICAgICBmbiAgOiBmbixcclxuICAgICAgICBjdHggOiBjdHggfHwgdGhpc1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmVzIGFuIGV2ZW50IGxpc3RlbmVyIG9yIGFueSBtYXRjaGluZyBsaXN0ZW5lcnMgaWYgYXJndW1lbnRzIGFyZSBvbWl0dGVkLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gW2V2dF0gRXZlbnQgbmFtZS4gUmVtb3ZlcyBhbGwgbGlzdGVuZXJzIGlmIG9taXR0ZWQuXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtmbl0gTGlzdGVuZXIgdG8gcmVtb3ZlLiBSZW1vdmVzIGFsbCBsaXN0ZW5lcnMgb2YgYGV2dGAgaWYgb21pdHRlZC5cclxuICogQHJldHVybnMge3V0aWwuRXZlbnRFbWl0dGVyfSBgdGhpc2BcclxuICovXHJcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gb2ZmKGV2dCwgZm4pIHtcclxuICAgIGlmIChldnQgPT09IHVuZGVmaW5lZClcclxuICAgICAgICB0aGlzLl9saXN0ZW5lcnMgPSB7fTtcclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0aGlzLl9saXN0ZW5lcnNbZXZ0XSA9IFtdO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW2V2dF07XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDspXHJcbiAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLmZuID09PSBmbilcclxuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICsraTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbWl0cyBhbiBldmVudCBieSBjYWxsaW5nIGl0cyBsaXN0ZW5lcnMgd2l0aCB0aGUgc3BlY2lmaWVkIGFyZ3VtZW50cy5cclxuICogQHBhcmFtIHtzdHJpbmd9IGV2dCBFdmVudCBuYW1lXHJcbiAqIEBwYXJhbSB7Li4uKn0gYXJncyBBcmd1bWVudHNcclxuICogQHJldHVybnMge3V0aWwuRXZlbnRFbWl0dGVyfSBgdGhpc2BcclxuICovXHJcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZ0KSB7XHJcbiAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW2V2dF07XHJcbiAgICBpZiAobGlzdGVuZXJzKSB7XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBbXSxcclxuICAgICAgICAgICAgaSA9IDE7XHJcbiAgICAgICAgZm9yICg7IGkgPCBhcmd1bWVudHMubGVuZ3RoOylcclxuICAgICAgICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpKytdKTtcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDspXHJcbiAgICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbi5hcHBseShsaXN0ZW5lcnNbaSsrXS5jdHgsIGFyZ3MpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZldGNoO1xyXG5cclxudmFyIGFzUHJvbWlzZSA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9hc3Byb21pc2VcIiksXHJcbiAgICBpbnF1aXJlICAgPSByZXF1aXJlKFwiQHByb3RvYnVmanMvaW5xdWlyZVwiKTtcclxuXHJcbnZhciBmcyA9IGlucXVpcmUoXCJmc1wiKTtcclxuXHJcbi8qKlxyXG4gKiBOb2RlLXN0eWxlIGNhbGxiYWNrIGFzIHVzZWQgYnkge0BsaW5rIHV0aWwuZmV0Y2h9LlxyXG4gKiBAdHlwZWRlZiBGZXRjaENhbGxiYWNrXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHs/RXJyb3J9IGVycm9yIEVycm9yLCBpZiBhbnksIG90aGVyd2lzZSBgbnVsbGBcclxuICogQHBhcmFtIHtzdHJpbmd9IFtjb250ZW50c10gRmlsZSBjb250ZW50cywgaWYgdGhlcmUgaGFzbid0IGJlZW4gYW4gZXJyb3JcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblxyXG4vKipcclxuICogT3B0aW9ucyBhcyB1c2VkIGJ5IHtAbGluayB1dGlsLmZldGNofS5cclxuICogQHR5cGVkZWYgRmV0Y2hPcHRpb25zXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2JpbmFyeT1mYWxzZV0gV2hldGhlciBleHBlY3RpbmcgYSBiaW5hcnkgcmVzcG9uc2VcclxuICogQHByb3BlcnR5IHtib29sZWFufSBbeGhyPWZhbHNlXSBJZiBgdHJ1ZWAsIGZvcmNlcyB0aGUgdXNlIG9mIFhNTEh0dHBSZXF1ZXN0XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEZldGNoZXMgdGhlIGNvbnRlbnRzIG9mIGEgZmlsZS5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIEZpbGUgcGF0aCBvciB1cmxcclxuICogQHBhcmFtIHtGZXRjaE9wdGlvbnN9IG9wdGlvbnMgRmV0Y2ggb3B0aW9uc1xyXG4gKiBAcGFyYW0ge0ZldGNoQ2FsbGJhY2t9IGNhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5mdW5jdGlvbiBmZXRjaChmaWxlbmFtZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcclxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xyXG4gICAgICAgIG9wdGlvbnMgPSB7fTtcclxuICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMpXHJcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xyXG5cclxuICAgIGlmICghY2FsbGJhY2spXHJcbiAgICAgICAgcmV0dXJuIGFzUHJvbWlzZShmZXRjaCwgdGhpcywgZmlsZW5hbWUsIG9wdGlvbnMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWludmFsaWQtdGhpc1xyXG5cclxuICAgIC8vIGlmIGEgbm9kZS1saWtlIGZpbGVzeXN0ZW0gaXMgcHJlc2VudCwgdHJ5IGl0IGZpcnN0IGJ1dCBmYWxsIGJhY2sgdG8gWEhSIGlmIG5vdGhpbmcgaXMgZm91bmQuXHJcbiAgICBpZiAoIW9wdGlvbnMueGhyICYmIGZzICYmIGZzLnJlYWRGaWxlKVxyXG4gICAgICAgIHJldHVybiBmcy5yZWFkRmlsZShmaWxlbmFtZSwgZnVuY3Rpb24gZmV0Y2hSZWFkRmlsZUNhbGxiYWNrKGVyciwgY29udGVudHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVyciAmJiB0eXBlb2YgWE1MSHR0cFJlcXVlc3QgIT09IFwidW5kZWZpbmVkXCJcclxuICAgICAgICAgICAgICAgID8gZmV0Y2gueGhyKGZpbGVuYW1lLCBvcHRpb25zLCBjYWxsYmFjaylcclxuICAgICAgICAgICAgICAgIDogZXJyXHJcbiAgICAgICAgICAgICAgICA/IGNhbGxiYWNrKGVycilcclxuICAgICAgICAgICAgICAgIDogY2FsbGJhY2sobnVsbCwgb3B0aW9ucy5iaW5hcnkgPyBjb250ZW50cyA6IGNvbnRlbnRzLnRvU3RyaW5nKFwidXRmOFwiKSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgLy8gdXNlIHRoZSBYSFIgdmVyc2lvbiBvdGhlcndpc2UuXHJcbiAgICByZXR1cm4gZmV0Y2gueGhyKGZpbGVuYW1lLCBvcHRpb25zLCBjYWxsYmFjayk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGZXRjaGVzIHRoZSBjb250ZW50cyBvZiBhIGZpbGUuXHJcbiAqIEBuYW1lIHV0aWwuZmV0Y2hcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIEZpbGUgcGF0aCBvciB1cmxcclxuICogQHBhcmFtIHtGZXRjaENhbGxiYWNrfSBjYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAdmFyaWF0aW9uIDJcclxuICovXHJcblxyXG4vKipcclxuICogRmV0Y2hlcyB0aGUgY29udGVudHMgb2YgYSBmaWxlLlxyXG4gKiBAbmFtZSB1dGlsLmZldGNoXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBGaWxlIHBhdGggb3IgdXJsXHJcbiAqIEBwYXJhbSB7RmV0Y2hPcHRpb25zfSBbb3B0aW9uc10gRmV0Y2ggb3B0aW9uc1xyXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxzdHJpbmd8VWludDhBcnJheT59IFByb21pc2VcclxuICogQHZhcmlhdGlvbiAzXHJcbiAqL1xyXG5cclxuLyoqL1xyXG5mZXRjaC54aHIgPSBmdW5jdGlvbiBmZXRjaF94aHIoZmlsZW5hbWUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlIC8qIHdvcmtzIGV2ZXJ5d2hlcmUgKi8gPSBmdW5jdGlvbiBmZXRjaE9uUmVhZHlTdGF0ZUNoYW5nZSgpIHtcclxuXHJcbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlICE9PSA0KVxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICAvLyBsb2NhbCBjb3JzIHNlY3VyaXR5IGVycm9ycyByZXR1cm4gc3RhdHVzIDAgLyBlbXB0eSBzdHJpbmcsIHRvby4gYWZhaWsgdGhpcyBjYW5ub3QgYmVcclxuICAgICAgICAvLyByZWxpYWJseSBkaXN0aW5ndWlzaGVkIGZyb20gYW4gYWN0dWFsbHkgZW1wdHkgZmlsZSBmb3Igc2VjdXJpdHkgcmVhc29ucy4gZmVlbCBmcmVlXHJcbiAgICAgICAgLy8gdG8gc2VuZCBhIHB1bGwgcmVxdWVzdCBpZiB5b3UgYXJlIGF3YXJlIG9mIGEgc29sdXRpb24uXHJcbiAgICAgICAgaWYgKHhoci5zdGF0dXMgIT09IDAgJiYgeGhyLnN0YXR1cyAhPT0gMjAwKVxyXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soRXJyb3IoXCJzdGF0dXMgXCIgKyB4aHIuc3RhdHVzKSk7XHJcblxyXG4gICAgICAgIC8vIGlmIGJpbmFyeSBkYXRhIGlzIGV4cGVjdGVkLCBtYWtlIHN1cmUgdGhhdCBzb21lIHNvcnQgb2YgYXJyYXkgaXMgcmV0dXJuZWQsIGV2ZW4gaWZcclxuICAgICAgICAvLyBBcnJheUJ1ZmZlcnMgYXJlIG5vdCBzdXBwb3J0ZWQuIHRoZSBiaW5hcnkgc3RyaW5nIGZhbGxiYWNrLCBob3dldmVyLCBpcyB1bnNhZmUuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuYmluYXJ5KSB7XHJcbiAgICAgICAgICAgIHZhciBidWZmZXIgPSB4aHIucmVzcG9uc2U7XHJcbiAgICAgICAgICAgIGlmICghYnVmZmVyKSB7XHJcbiAgICAgICAgICAgICAgICBidWZmZXIgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeGhyLnJlc3BvbnNlVGV4dC5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICBidWZmZXIucHVzaCh4aHIucmVzcG9uc2VUZXh0LmNoYXJDb2RlQXQoaSkgJiAyNTUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCB0eXBlb2YgVWludDhBcnJheSAhPT0gXCJ1bmRlZmluZWRcIiA/IG5ldyBVaW50OEFycmF5KGJ1ZmZlcikgOiBidWZmZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgeGhyLnJlc3BvbnNlVGV4dCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChvcHRpb25zLmJpbmFyeSkge1xyXG4gICAgICAgIC8vIHJlZjogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1hNTEh0dHBSZXF1ZXN0L1NlbmRpbmdfYW5kX1JlY2VpdmluZ19CaW5hcnlfRGF0YSNSZWNlaXZpbmdfYmluYXJ5X2RhdGFfaW5fb2xkZXJfYnJvd3NlcnNcclxuICAgICAgICBpZiAoXCJvdmVycmlkZU1pbWVUeXBlXCIgaW4geGhyKVxyXG4gICAgICAgICAgICB4aHIub3ZlcnJpZGVNaW1lVHlwZShcInRleHQvcGxhaW47IGNoYXJzZXQ9eC11c2VyLWRlZmluZWRcIik7XHJcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9IFwiYXJyYXlidWZmZXJcIjtcclxuICAgIH1cclxuXHJcbiAgICB4aHIub3BlbihcIkdFVFwiLCBmaWxlbmFtZSk7XHJcbiAgICB4aHIuc2VuZCgpO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShmYWN0b3J5KTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyAvIHdyaXRlcyBmbG9hdHMgLyBkb3VibGVzIGZyb20gLyB0byBidWZmZXJzLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0XHJcbiAqIEBuYW1lc3BhY2VcclxuICovXHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgMzIgYml0IGZsb2F0IHRvIGEgYnVmZmVyIHVzaW5nIGxpdHRsZSBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC53cml0ZUZsb2F0TEVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgVGFyZ2V0IGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFRhcmdldCBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIDMyIGJpdCBmbG9hdCB0byBhIGJ1ZmZlciB1c2luZyBiaWcgZW5kaWFuIGJ5dGUgb3JkZXIuXHJcbiAqIEBuYW1lIHV0aWwuZmxvYXQud3JpdGVGbG9hdEJFXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmIFRhcmdldCBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHBvcyBUYXJnZXQgYnVmZmVyIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIDMyIGJpdCBmbG9hdCBmcm9tIGEgYnVmZmVyIHVzaW5nIGxpdHRsZSBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC5yZWFkRmxvYXRMRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgU291cmNlIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFNvdXJjZSBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSAzMiBiaXQgZmxvYXQgZnJvbSBhIGJ1ZmZlciB1c2luZyBiaWcgZW5kaWFuIGJ5dGUgb3JkZXIuXHJcbiAqIEBuYW1lIHV0aWwuZmxvYXQucmVhZEZsb2F0QkVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmIFNvdXJjZSBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHBvcyBTb3VyY2UgYnVmZmVyIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIDY0IGJpdCBkb3VibGUgdG8gYSBidWZmZXIgdXNpbmcgbGl0dGxlIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LndyaXRlRG91YmxlTEVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgVGFyZ2V0IGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFRhcmdldCBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIDY0IGJpdCBkb3VibGUgdG8gYSBidWZmZXIgdXNpbmcgYmlnIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LndyaXRlRG91YmxlQkVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgVGFyZ2V0IGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFRhcmdldCBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgNjQgYml0IGRvdWJsZSBmcm9tIGEgYnVmZmVyIHVzaW5nIGxpdHRsZSBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC5yZWFkRG91YmxlTEVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmIFNvdXJjZSBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHBvcyBTb3VyY2UgYnVmZmVyIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgNjQgYml0IGRvdWJsZSBmcm9tIGEgYnVmZmVyIHVzaW5nIGJpZyBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC5yZWFkRG91YmxlQkVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmIFNvdXJjZSBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHBvcyBTb3VyY2UgYnVmZmVyIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLy8gRmFjdG9yeSBmdW5jdGlvbiBmb3IgdGhlIHB1cnBvc2Ugb2Ygbm9kZS1iYXNlZCB0ZXN0aW5nIGluIG1vZGlmaWVkIGdsb2JhbCBlbnZpcm9ubWVudHNcclxuZnVuY3Rpb24gZmFjdG9yeShleHBvcnRzKSB7XHJcblxyXG4gICAgLy8gZmxvYXQ6IHR5cGVkIGFycmF5XHJcbiAgICBpZiAodHlwZW9mIEZsb2F0MzJBcnJheSAhPT0gXCJ1bmRlZmluZWRcIikgKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICB2YXIgZjMyID0gbmV3IEZsb2F0MzJBcnJheShbIC0wIF0pLFxyXG4gICAgICAgICAgICBmOGIgPSBuZXcgVWludDhBcnJheShmMzIuYnVmZmVyKSxcclxuICAgICAgICAgICAgbGUgID0gZjhiWzNdID09PSAxMjg7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHdyaXRlRmxvYXRfZjMyX2NweSh2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGYzMlswXSA9IHZhbDtcclxuICAgICAgICAgICAgYnVmW3BvcyAgICBdID0gZjhiWzBdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgMV0gPSBmOGJbMV07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAyXSA9IGY4YlsyXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDNdID0gZjhiWzNdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGVGbG9hdF9mMzJfcmV2KHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgZjMyWzBdID0gdmFsO1xyXG4gICAgICAgICAgICBidWZbcG9zICAgIF0gPSBmOGJbM107XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAxXSA9IGY4YlsyXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDJdID0gZjhiWzFdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgM10gPSBmOGJbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMud3JpdGVGbG9hdExFID0gbGUgPyB3cml0ZUZsb2F0X2YzMl9jcHkgOiB3cml0ZUZsb2F0X2YzMl9yZXY7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBleHBvcnRzLndyaXRlRmxvYXRCRSA9IGxlID8gd3JpdGVGbG9hdF9mMzJfcmV2IDogd3JpdGVGbG9hdF9mMzJfY3B5O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkRmxvYXRfZjMyX2NweShidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmOGJbMF0gPSBidWZbcG9zICAgIF07XHJcbiAgICAgICAgICAgIGY4YlsxXSA9IGJ1Zltwb3MgKyAxXTtcclxuICAgICAgICAgICAgZjhiWzJdID0gYnVmW3BvcyArIDJdO1xyXG4gICAgICAgICAgICBmOGJbM10gPSBidWZbcG9zICsgM107XHJcbiAgICAgICAgICAgIHJldHVybiBmMzJbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkRmxvYXRfZjMyX3JldihidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmOGJbM10gPSBidWZbcG9zICAgIF07XHJcbiAgICAgICAgICAgIGY4YlsyXSA9IGJ1Zltwb3MgKyAxXTtcclxuICAgICAgICAgICAgZjhiWzFdID0gYnVmW3BvcyArIDJdO1xyXG4gICAgICAgICAgICBmOGJbMF0gPSBidWZbcG9zICsgM107XHJcbiAgICAgICAgICAgIHJldHVybiBmMzJbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMucmVhZEZsb2F0TEUgPSBsZSA/IHJlYWRGbG9hdF9mMzJfY3B5IDogcmVhZEZsb2F0X2YzMl9yZXY7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBleHBvcnRzLnJlYWRGbG9hdEJFID0gbGUgPyByZWFkRmxvYXRfZjMyX3JldiA6IHJlYWRGbG9hdF9mMzJfY3B5O1xyXG5cclxuICAgIC8vIGZsb2F0OiBpZWVlNzU0XHJcbiAgICB9KSgpOyBlbHNlIChmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGVGbG9hdF9pZWVlNzU0KHdyaXRlVWludCwgdmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgICAgICB2YXIgc2lnbiA9IHZhbCA8IDAgPyAxIDogMDtcclxuICAgICAgICAgICAgaWYgKHNpZ24pXHJcbiAgICAgICAgICAgICAgICB2YWwgPSAtdmFsO1xyXG4gICAgICAgICAgICBpZiAodmFsID09PSAwKVxyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDEgLyB2YWwgPiAwID8gLyogcG9zaXRpdmUgKi8gMCA6IC8qIG5lZ2F0aXZlIDAgKi8gMjE0NzQ4MzY0OCwgYnVmLCBwb3MpO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChpc05hTih2YWwpKVxyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDIxNDMyODkzNDQsIGJ1ZiwgcG9zKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAodmFsID4gMy40MDI4MjM0NjYzODUyODg2ZSszOCkgLy8gKy1JbmZpbml0eVxyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KChzaWduIDw8IDMxIHwgMjEzOTA5NTA0MCkgPj4+IDAsIGJ1ZiwgcG9zKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAodmFsIDwgMS4xNzU0OTQzNTA4MjIyODc1ZS0zOCkgLy8gZGVub3JtYWxcclxuICAgICAgICAgICAgICAgIHdyaXRlVWludCgoc2lnbiA8PCAzMSB8IE1hdGgucm91bmQodmFsIC8gMS40MDEyOTg0NjQzMjQ4MTdlLTQ1KSkgPj4+IDAsIGJ1ZiwgcG9zKTtcclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXhwb25lbnQgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbCkgLyBNYXRoLkxOMiksXHJcbiAgICAgICAgICAgICAgICAgICAgbWFudGlzc2EgPSBNYXRoLnJvdW5kKHZhbCAqIE1hdGgucG93KDIsIC1leHBvbmVudCkgKiA4Mzg4NjA4KSAmIDgzODg2MDc7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoKHNpZ24gPDwgMzEgfCBleHBvbmVudCArIDEyNyA8PCAyMyB8IG1hbnRpc3NhKSA+Pj4gMCwgYnVmLCBwb3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBleHBvcnRzLndyaXRlRmxvYXRMRSA9IHdyaXRlRmxvYXRfaWVlZTc1NC5iaW5kKG51bGwsIHdyaXRlVWludExFKTtcclxuICAgICAgICBleHBvcnRzLndyaXRlRmxvYXRCRSA9IHdyaXRlRmxvYXRfaWVlZTc1NC5iaW5kKG51bGwsIHdyaXRlVWludEJFKTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVhZEZsb2F0X2llZWU3NTQocmVhZFVpbnQsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIHZhciB1aW50ID0gcmVhZFVpbnQoYnVmLCBwb3MpLFxyXG4gICAgICAgICAgICAgICAgc2lnbiA9ICh1aW50ID4+IDMxKSAqIDIgKyAxLFxyXG4gICAgICAgICAgICAgICAgZXhwb25lbnQgPSB1aW50ID4+PiAyMyAmIDI1NSxcclxuICAgICAgICAgICAgICAgIG1hbnRpc3NhID0gdWludCAmIDgzODg2MDc7XHJcbiAgICAgICAgICAgIHJldHVybiBleHBvbmVudCA9PT0gMjU1XHJcbiAgICAgICAgICAgICAgICA/IG1hbnRpc3NhXHJcbiAgICAgICAgICAgICAgICA/IE5hTlxyXG4gICAgICAgICAgICAgICAgOiBzaWduICogSW5maW5pdHlcclxuICAgICAgICAgICAgICAgIDogZXhwb25lbnQgPT09IDAgLy8gZGVub3JtYWxcclxuICAgICAgICAgICAgICAgID8gc2lnbiAqIDEuNDAxMjk4NDY0MzI0ODE3ZS00NSAqIG1hbnRpc3NhXHJcbiAgICAgICAgICAgICAgICA6IHNpZ24gKiBNYXRoLnBvdygyLCBleHBvbmVudCAtIDE1MCkgKiAobWFudGlzc2EgKyA4Mzg4NjA4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV4cG9ydHMucmVhZEZsb2F0TEUgPSByZWFkRmxvYXRfaWVlZTc1NC5iaW5kKG51bGwsIHJlYWRVaW50TEUpO1xyXG4gICAgICAgIGV4cG9ydHMucmVhZEZsb2F0QkUgPSByZWFkRmxvYXRfaWVlZTc1NC5iaW5kKG51bGwsIHJlYWRVaW50QkUpO1xyXG5cclxuICAgIH0pKCk7XHJcblxyXG4gICAgLy8gZG91YmxlOiB0eXBlZCBhcnJheVxyXG4gICAgaWYgKHR5cGVvZiBGbG9hdDY0QXJyYXkgIT09IFwidW5kZWZpbmVkXCIpIChmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgdmFyIGY2NCA9IG5ldyBGbG9hdDY0QXJyYXkoWy0wXSksXHJcbiAgICAgICAgICAgIGY4YiA9IG5ldyBVaW50OEFycmF5KGY2NC5idWZmZXIpLFxyXG4gICAgICAgICAgICBsZSAgPSBmOGJbN10gPT09IDEyODtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGVEb3VibGVfZjY0X2NweSh2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGY2NFswXSA9IHZhbDtcclxuICAgICAgICAgICAgYnVmW3BvcyAgICBdID0gZjhiWzBdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgMV0gPSBmOGJbMV07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAyXSA9IGY4YlsyXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDNdID0gZjhiWzNdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgNF0gPSBmOGJbNF07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA1XSA9IGY4Yls1XTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDZdID0gZjhiWzZdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgN10gPSBmOGJbN107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZURvdWJsZV9mNjRfcmV2KHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgZjY0WzBdID0gdmFsO1xyXG4gICAgICAgICAgICBidWZbcG9zICAgIF0gPSBmOGJbN107XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAxXSA9IGY4Yls2XTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDJdID0gZjhiWzVdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgM10gPSBmOGJbNF07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA0XSA9IGY4YlszXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDVdID0gZjhiWzJdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgNl0gPSBmOGJbMV07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA3XSA9IGY4YlswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy53cml0ZURvdWJsZUxFID0gbGUgPyB3cml0ZURvdWJsZV9mNjRfY3B5IDogd3JpdGVEb3VibGVfZjY0X3JldjtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMud3JpdGVEb3VibGVCRSA9IGxlID8gd3JpdGVEb3VibGVfZjY0X3JldiA6IHdyaXRlRG91YmxlX2Y2NF9jcHk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWREb3VibGVfZjY0X2NweShidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmOGJbMF0gPSBidWZbcG9zICAgIF07XHJcbiAgICAgICAgICAgIGY4YlsxXSA9IGJ1Zltwb3MgKyAxXTtcclxuICAgICAgICAgICAgZjhiWzJdID0gYnVmW3BvcyArIDJdO1xyXG4gICAgICAgICAgICBmOGJbM10gPSBidWZbcG9zICsgM107XHJcbiAgICAgICAgICAgIGY4Yls0XSA9IGJ1Zltwb3MgKyA0XTtcclxuICAgICAgICAgICAgZjhiWzVdID0gYnVmW3BvcyArIDVdO1xyXG4gICAgICAgICAgICBmOGJbNl0gPSBidWZbcG9zICsgNl07XHJcbiAgICAgICAgICAgIGY4Yls3XSA9IGJ1Zltwb3MgKyA3XTtcclxuICAgICAgICAgICAgcmV0dXJuIGY2NFswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWREb3VibGVfZjY0X3JldihidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmOGJbN10gPSBidWZbcG9zICAgIF07XHJcbiAgICAgICAgICAgIGY4Yls2XSA9IGJ1Zltwb3MgKyAxXTtcclxuICAgICAgICAgICAgZjhiWzVdID0gYnVmW3BvcyArIDJdO1xyXG4gICAgICAgICAgICBmOGJbNF0gPSBidWZbcG9zICsgM107XHJcbiAgICAgICAgICAgIGY4YlszXSA9IGJ1Zltwb3MgKyA0XTtcclxuICAgICAgICAgICAgZjhiWzJdID0gYnVmW3BvcyArIDVdO1xyXG4gICAgICAgICAgICBmOGJbMV0gPSBidWZbcG9zICsgNl07XHJcbiAgICAgICAgICAgIGY4YlswXSA9IGJ1Zltwb3MgKyA3XTtcclxuICAgICAgICAgICAgcmV0dXJuIGY2NFswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRG91YmxlTEUgPSBsZSA/IHJlYWREb3VibGVfZjY0X2NweSA6IHJlYWREb3VibGVfZjY0X3JldjtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMucmVhZERvdWJsZUJFID0gbGUgPyByZWFkRG91YmxlX2Y2NF9yZXYgOiByZWFkRG91YmxlX2Y2NF9jcHk7XHJcblxyXG4gICAgLy8gZG91YmxlOiBpZWVlNzU0XHJcbiAgICB9KSgpOyBlbHNlIChmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGVEb3VibGVfaWVlZTc1NCh3cml0ZVVpbnQsIG9mZjAsIG9mZjEsIHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgdmFyIHNpZ24gPSB2YWwgPCAwID8gMSA6IDA7XHJcbiAgICAgICAgICAgIGlmIChzaWduKVxyXG4gICAgICAgICAgICAgICAgdmFsID0gLXZhbDtcclxuICAgICAgICAgICAgaWYgKHZhbCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDAsIGJ1ZiwgcG9zICsgb2ZmMCk7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMSAvIHZhbCA+IDAgPyAvKiBwb3NpdGl2ZSAqLyAwIDogLyogbmVnYXRpdmUgMCAqLyAyMTQ3NDgzNjQ4LCBidWYsIHBvcyArIG9mZjEpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTmFOKHZhbCkpIHtcclxuICAgICAgICAgICAgICAgIHdyaXRlVWludCgwLCBidWYsIHBvcyArIG9mZjApO1xyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDIxNDY5NTkzNjAsIGJ1ZiwgcG9zICsgb2ZmMSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsID4gMS43OTc2OTMxMzQ4NjIzMTU3ZSszMDgpIHsgLy8gKy1JbmZpbml0eVxyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDAsIGJ1ZiwgcG9zICsgb2ZmMCk7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoKHNpZ24gPDwgMzEgfCAyMTQ2NDM1MDcyKSA+Pj4gMCwgYnVmLCBwb3MgKyBvZmYxKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBtYW50aXNzYTtcclxuICAgICAgICAgICAgICAgIGlmICh2YWwgPCAyLjIyNTA3Mzg1ODUwNzIwMTRlLTMwOCkgeyAvLyBkZW5vcm1hbFxyXG4gICAgICAgICAgICAgICAgICAgIG1hbnRpc3NhID0gdmFsIC8gNWUtMzI0O1xyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlVWludChtYW50aXNzYSA+Pj4gMCwgYnVmLCBwb3MgKyBvZmYwKTtcclxuICAgICAgICAgICAgICAgICAgICB3cml0ZVVpbnQoKHNpZ24gPDwgMzEgfCBtYW50aXNzYSAvIDQyOTQ5NjcyOTYpID4+PiAwLCBidWYsIHBvcyArIG9mZjEpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZXhwb25lbnQgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbCkgLyBNYXRoLkxOMik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4cG9uZW50ID09PSAxMDI0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvbmVudCA9IDEwMjM7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFudGlzc2EgPSB2YWwgKiBNYXRoLnBvdygyLCAtZXhwb25lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlVWludChtYW50aXNzYSAqIDQ1MDM1OTk2MjczNzA0OTYgPj4+IDAsIGJ1ZiwgcG9zICsgb2ZmMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVVaW50KChzaWduIDw8IDMxIHwgZXhwb25lbnQgKyAxMDIzIDw8IDIwIHwgbWFudGlzc2EgKiAxMDQ4NTc2ICYgMTA0ODU3NSkgPj4+IDAsIGJ1ZiwgcG9zICsgb2ZmMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV4cG9ydHMud3JpdGVEb3VibGVMRSA9IHdyaXRlRG91YmxlX2llZWU3NTQuYmluZChudWxsLCB3cml0ZVVpbnRMRSwgMCwgNCk7XHJcbiAgICAgICAgZXhwb3J0cy53cml0ZURvdWJsZUJFID0gd3JpdGVEb3VibGVfaWVlZTc1NC5iaW5kKG51bGwsIHdyaXRlVWludEJFLCA0LCAwKTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVhZERvdWJsZV9pZWVlNzU0KHJlYWRVaW50LCBvZmYwLCBvZmYxLCBidWYsIHBvcykge1xyXG4gICAgICAgICAgICB2YXIgbG8gPSByZWFkVWludChidWYsIHBvcyArIG9mZjApLFxyXG4gICAgICAgICAgICAgICAgaGkgPSByZWFkVWludChidWYsIHBvcyArIG9mZjEpO1xyXG4gICAgICAgICAgICB2YXIgc2lnbiA9IChoaSA+PiAzMSkgKiAyICsgMSxcclxuICAgICAgICAgICAgICAgIGV4cG9uZW50ID0gaGkgPj4+IDIwICYgMjA0NyxcclxuICAgICAgICAgICAgICAgIG1hbnRpc3NhID0gNDI5NDk2NzI5NiAqIChoaSAmIDEwNDg1NzUpICsgbG87XHJcbiAgICAgICAgICAgIHJldHVybiBleHBvbmVudCA9PT0gMjA0N1xyXG4gICAgICAgICAgICAgICAgPyBtYW50aXNzYVxyXG4gICAgICAgICAgICAgICAgPyBOYU5cclxuICAgICAgICAgICAgICAgIDogc2lnbiAqIEluZmluaXR5XHJcbiAgICAgICAgICAgICAgICA6IGV4cG9uZW50ID09PSAwIC8vIGRlbm9ybWFsXHJcbiAgICAgICAgICAgICAgICA/IHNpZ24gKiA1ZS0zMjQgKiBtYW50aXNzYVxyXG4gICAgICAgICAgICAgICAgOiBzaWduICogTWF0aC5wb3coMiwgZXhwb25lbnQgLSAxMDc1KSAqIChtYW50aXNzYSArIDQ1MDM1OTk2MjczNzA0OTYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRG91YmxlTEUgPSByZWFkRG91YmxlX2llZWU3NTQuYmluZChudWxsLCByZWFkVWludExFLCAwLCA0KTtcclxuICAgICAgICBleHBvcnRzLnJlYWREb3VibGVCRSA9IHJlYWREb3VibGVfaWVlZTc1NC5iaW5kKG51bGwsIHJlYWRVaW50QkUsIDQsIDApO1xyXG5cclxuICAgIH0pKCk7XHJcblxyXG4gICAgcmV0dXJuIGV4cG9ydHM7XHJcbn1cclxuXHJcbi8vIHVpbnQgaGVscGVyc1xyXG5cclxuZnVuY3Rpb24gd3JpdGVVaW50TEUodmFsLCBidWYsIHBvcykge1xyXG4gICAgYnVmW3BvcyAgICBdID0gIHZhbCAgICAgICAgJiAyNTU7XHJcbiAgICBidWZbcG9zICsgMV0gPSAgdmFsID4+PiA4ICAmIDI1NTtcclxuICAgIGJ1Zltwb3MgKyAyXSA9ICB2YWwgPj4+IDE2ICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDNdID0gIHZhbCA+Pj4gMjQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdyaXRlVWludEJFKHZhbCwgYnVmLCBwb3MpIHtcclxuICAgIGJ1Zltwb3MgICAgXSA9ICB2YWwgPj4+IDI0O1xyXG4gICAgYnVmW3BvcyArIDFdID0gIHZhbCA+Pj4gMTYgJiAyNTU7XHJcbiAgICBidWZbcG9zICsgMl0gPSAgdmFsID4+PiA4ICAmIDI1NTtcclxuICAgIGJ1Zltwb3MgKyAzXSA9ICB2YWwgICAgICAgICYgMjU1O1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkVWludExFKGJ1ZiwgcG9zKSB7XHJcbiAgICByZXR1cm4gKGJ1Zltwb3MgICAgXVxyXG4gICAgICAgICAgfCBidWZbcG9zICsgMV0gPDwgOFxyXG4gICAgICAgICAgfCBidWZbcG9zICsgMl0gPDwgMTZcclxuICAgICAgICAgIHwgYnVmW3BvcyArIDNdIDw8IDI0KSA+Pj4gMDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVhZFVpbnRCRShidWYsIHBvcykge1xyXG4gICAgcmV0dXJuIChidWZbcG9zICAgIF0gPDwgMjRcclxuICAgICAgICAgIHwgYnVmW3BvcyArIDFdIDw8IDE2XHJcbiAgICAgICAgICB8IGJ1Zltwb3MgKyAyXSA8PCA4XHJcbiAgICAgICAgICB8IGJ1Zltwb3MgKyAzXSkgPj4+IDA7XHJcbn1cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gaW5xdWlyZTtcclxuXHJcbi8qKlxyXG4gKiBSZXF1aXJlcyBhIG1vZHVsZSBvbmx5IGlmIGF2YWlsYWJsZS5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWUgTW9kdWxlIHRvIHJlcXVpcmVcclxuICogQHJldHVybnMgez9PYmplY3R9IFJlcXVpcmVkIG1vZHVsZSBpZiBhdmFpbGFibGUgYW5kIG5vdCBlbXB0eSwgb3RoZXJ3aXNlIGBudWxsYFxyXG4gKi9cclxuZnVuY3Rpb24gaW5xdWlyZShtb2R1bGVOYW1lKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHZhciBtb2QgPSBldmFsKFwicXVpcmVcIi5yZXBsYWNlKC9eLyxcInJlXCIpKShtb2R1bGVOYW1lKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1ldmFsXHJcbiAgICAgICAgaWYgKG1vZCAmJiAobW9kLmxlbmd0aCB8fCBPYmplY3Qua2V5cyhtb2QpLmxlbmd0aCkpXHJcbiAgICAgICAgICAgIHJldHVybiBtb2Q7XHJcbiAgICB9IGNhdGNoIChlKSB7fSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5XHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8qKlxyXG4gKiBBIG1pbmltYWwgcGF0aCBtb2R1bGUgdG8gcmVzb2x2ZSBVbml4LCBXaW5kb3dzIGFuZCBVUkwgcGF0aHMgYWxpa2UuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBuYW1lc3BhY2VcclxuICovXHJcbnZhciBwYXRoID0gZXhwb3J0cztcclxuXHJcbnZhciBpc0Fic29sdXRlID1cclxuLyoqXHJcbiAqIFRlc3RzIGlmIHRoZSBzcGVjaWZpZWQgcGF0aCBpcyBhYnNvbHV0ZS5cclxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggUGF0aCB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgcGF0aCBpcyBhYnNvbHV0ZVxyXG4gKi9cclxucGF0aC5pc0Fic29sdXRlID0gZnVuY3Rpb24gaXNBYnNvbHV0ZShwYXRoKSB7XHJcbiAgICByZXR1cm4gL14oPzpcXC98XFx3KzopLy50ZXN0KHBhdGgpO1xyXG59O1xyXG5cclxudmFyIG5vcm1hbGl6ZSA9XHJcbi8qKlxyXG4gKiBOb3JtYWxpemVzIHRoZSBzcGVjaWZpZWQgcGF0aC5cclxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggUGF0aCB0byBub3JtYWxpemVcclxuICogQHJldHVybnMge3N0cmluZ30gTm9ybWFsaXplZCBwYXRoXHJcbiAqL1xyXG5wYXRoLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uIG5vcm1hbGl6ZShwYXRoKSB7XHJcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKVxyXG4gICAgICAgICAgICAgICAucmVwbGFjZSgvXFwvezIsfS9nLCBcIi9cIik7XHJcbiAgICB2YXIgcGFydHMgICAgPSBwYXRoLnNwbGl0KFwiL1wiKSxcclxuICAgICAgICBhYnNvbHV0ZSA9IGlzQWJzb2x1dGUocGF0aCksXHJcbiAgICAgICAgcHJlZml4ICAgPSBcIlwiO1xyXG4gICAgaWYgKGFic29sdXRlKVxyXG4gICAgICAgIHByZWZpeCA9IHBhcnRzLnNoaWZ0KCkgKyBcIi9cIjtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOykge1xyXG4gICAgICAgIGlmIChwYXJ0c1tpXSA9PT0gXCIuLlwiKSB7XHJcbiAgICAgICAgICAgIGlmIChpID4gMCAmJiBwYXJ0c1tpIC0gMV0gIT09IFwiLi5cIilcclxuICAgICAgICAgICAgICAgIHBhcnRzLnNwbGljZSgtLWksIDIpO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChhYnNvbHV0ZSlcclxuICAgICAgICAgICAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocGFydHNbaV0gPT09IFwiLlwiKVxyXG4gICAgICAgICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICArK2k7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcHJlZml4ICsgcGFydHMuam9pbihcIi9cIik7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVzb2x2ZXMgdGhlIHNwZWNpZmllZCBpbmNsdWRlIHBhdGggYWdhaW5zdCB0aGUgc3BlY2lmaWVkIG9yaWdpbiBwYXRoLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gb3JpZ2luUGF0aCBQYXRoIHRvIHRoZSBvcmlnaW4gZmlsZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaW5jbHVkZVBhdGggSW5jbHVkZSBwYXRoIHJlbGF0aXZlIHRvIG9yaWdpbiBwYXRoXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2FscmVhZHlOb3JtYWxpemVkPWZhbHNlXSBgdHJ1ZWAgaWYgYm90aCBwYXRocyBhcmUgYWxyZWFkeSBrbm93biB0byBiZSBub3JtYWxpemVkXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFBhdGggdG8gdGhlIGluY2x1ZGUgZmlsZVxyXG4gKi9cclxucGF0aC5yZXNvbHZlID0gZnVuY3Rpb24gcmVzb2x2ZShvcmlnaW5QYXRoLCBpbmNsdWRlUGF0aCwgYWxyZWFkeU5vcm1hbGl6ZWQpIHtcclxuICAgIGlmICghYWxyZWFkeU5vcm1hbGl6ZWQpXHJcbiAgICAgICAgaW5jbHVkZVBhdGggPSBub3JtYWxpemUoaW5jbHVkZVBhdGgpO1xyXG4gICAgaWYgKGlzQWJzb2x1dGUoaW5jbHVkZVBhdGgpKVxyXG4gICAgICAgIHJldHVybiBpbmNsdWRlUGF0aDtcclxuICAgIGlmICghYWxyZWFkeU5vcm1hbGl6ZWQpXHJcbiAgICAgICAgb3JpZ2luUGF0aCA9IG5vcm1hbGl6ZShvcmlnaW5QYXRoKTtcclxuICAgIHJldHVybiAob3JpZ2luUGF0aCA9IG9yaWdpblBhdGgucmVwbGFjZSgvKD86XFwvfF4pW14vXSskLywgXCJcIikpLmxlbmd0aCA/IG5vcm1hbGl6ZShvcmlnaW5QYXRoICsgXCIvXCIgKyBpbmNsdWRlUGF0aCkgOiBpbmNsdWRlUGF0aDtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gcG9vbDtcclxuXHJcbi8qKlxyXG4gKiBBbiBhbGxvY2F0b3IgYXMgdXNlZCBieSB7QGxpbmsgdXRpbC5wb29sfS5cclxuICogQHR5cGVkZWYgUG9vbEFsbG9jYXRvclxyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIEJ1ZmZlciBzaXplXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fSBCdWZmZXJcclxuICovXHJcblxyXG4vKipcclxuICogQSBzbGljZXIgYXMgdXNlZCBieSB7QGxpbmsgdXRpbC5wb29sfS5cclxuICogQHR5cGVkZWYgUG9vbFNsaWNlclxyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCBTdGFydCBvZmZzZXRcclxuICogQHBhcmFtIHtudW1iZXJ9IGVuZCBFbmQgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fSBCdWZmZXIgc2xpY2VcclxuICogQHRoaXMge1VpbnQ4QXJyYXl9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEEgZ2VuZXJhbCBwdXJwb3NlIGJ1ZmZlciBwb29sLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtQb29sQWxsb2NhdG9yfSBhbGxvYyBBbGxvY2F0b3JcclxuICogQHBhcmFtIHtQb29sU2xpY2VyfSBzbGljZSBTbGljZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IFtzaXplPTgxOTJdIFNsYWIgc2l6ZVxyXG4gKiBAcmV0dXJucyB7UG9vbEFsbG9jYXRvcn0gUG9vbGVkIGFsbG9jYXRvclxyXG4gKi9cclxuZnVuY3Rpb24gcG9vbChhbGxvYywgc2xpY2UsIHNpemUpIHtcclxuICAgIHZhciBTSVpFICAgPSBzaXplIHx8IDgxOTI7XHJcbiAgICB2YXIgTUFYICAgID0gU0laRSA+Pj4gMTtcclxuICAgIHZhciBzbGFiICAgPSBudWxsO1xyXG4gICAgdmFyIG9mZnNldCA9IFNJWkU7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gcG9vbF9hbGxvYyhzaXplKSB7XHJcbiAgICAgICAgaWYgKHNpemUgPCAxIHx8IHNpemUgPiBNQVgpXHJcbiAgICAgICAgICAgIHJldHVybiBhbGxvYyhzaXplKTtcclxuICAgICAgICBpZiAob2Zmc2V0ICsgc2l6ZSA+IFNJWkUpIHtcclxuICAgICAgICAgICAgc2xhYiA9IGFsbG9jKFNJWkUpO1xyXG4gICAgICAgICAgICBvZmZzZXQgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgYnVmID0gc2xpY2UuY2FsbChzbGFiLCBvZmZzZXQsIG9mZnNldCArPSBzaXplKTtcclxuICAgICAgICBpZiAob2Zmc2V0ICYgNykgLy8gYWxpZ24gdG8gMzIgYml0XHJcbiAgICAgICAgICAgIG9mZnNldCA9IChvZmZzZXQgfCA3KSArIDE7XHJcbiAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgIH07XHJcbn1cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vKipcclxuICogQSBtaW5pbWFsIFVURjggaW1wbGVtZW50YXRpb24gZm9yIG51bWJlciBhcnJheXMuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBuYW1lc3BhY2VcclxuICovXHJcbnZhciB1dGY4ID0gZXhwb3J0cztcclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBVVEY4IGJ5dGUgbGVuZ3RoIG9mIGEgc3RyaW5nLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFN0cmluZ1xyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBCeXRlIGxlbmd0aFxyXG4gKi9cclxudXRmOC5sZW5ndGggPSBmdW5jdGlvbiB1dGY4X2xlbmd0aChzdHJpbmcpIHtcclxuICAgIHZhciBsZW4gPSAwLFxyXG4gICAgICAgIGMgPSAwO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XHJcbiAgICAgICAgaWYgKGMgPCAxMjgpXHJcbiAgICAgICAgICAgIGxlbiArPSAxO1xyXG4gICAgICAgIGVsc2UgaWYgKGMgPCAyMDQ4KVxyXG4gICAgICAgICAgICBsZW4gKz0gMjtcclxuICAgICAgICBlbHNlIGlmICgoYyAmIDB4RkMwMCkgPT09IDB4RDgwMCAmJiAoc3RyaW5nLmNoYXJDb2RlQXQoaSArIDEpICYgMHhGQzAwKSA9PT0gMHhEQzAwKSB7XHJcbiAgICAgICAgICAgICsraTtcclxuICAgICAgICAgICAgbGVuICs9IDQ7XHJcbiAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgIGxlbiArPSAzO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGxlbjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBVVEY4IGJ5dGVzIGFzIGEgc3RyaW5nLlxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZmZlciBTb3VyY2UgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCBTb3VyY2Ugc3RhcnRcclxuICogQHBhcmFtIHtudW1iZXJ9IGVuZCBTb3VyY2UgZW5kXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFN0cmluZyByZWFkXHJcbiAqL1xyXG51dGY4LnJlYWQgPSBmdW5jdGlvbiB1dGY4X3JlYWQoYnVmZmVyLCBzdGFydCwgZW5kKSB7XHJcbiAgICB2YXIgbGVuID0gZW5kIC0gc3RhcnQ7XHJcbiAgICBpZiAobGVuIDwgMSlcclxuICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgIHZhciBwYXJ0cyA9IG51bGwsXHJcbiAgICAgICAgY2h1bmsgPSBbXSxcclxuICAgICAgICBpID0gMCwgLy8gY2hhciBvZmZzZXRcclxuICAgICAgICB0OyAgICAgLy8gdGVtcG9yYXJ5XHJcbiAgICB3aGlsZSAoc3RhcnQgPCBlbmQpIHtcclxuICAgICAgICB0ID0gYnVmZmVyW3N0YXJ0KytdO1xyXG4gICAgICAgIGlmICh0IDwgMTI4KVxyXG4gICAgICAgICAgICBjaHVua1tpKytdID0gdDtcclxuICAgICAgICBlbHNlIGlmICh0ID4gMTkxICYmIHQgPCAyMjQpXHJcbiAgICAgICAgICAgIGNodW5rW2krK10gPSAodCAmIDMxKSA8PCA2IHwgYnVmZmVyW3N0YXJ0KytdICYgNjM7XHJcbiAgICAgICAgZWxzZSBpZiAodCA+IDIzOSAmJiB0IDwgMzY1KSB7XHJcbiAgICAgICAgICAgIHQgPSAoKHQgJiA3KSA8PCAxOCB8IChidWZmZXJbc3RhcnQrK10gJiA2MykgPDwgMTIgfCAoYnVmZmVyW3N0YXJ0KytdICYgNjMpIDw8IDYgfCBidWZmZXJbc3RhcnQrK10gJiA2MykgLSAweDEwMDAwO1xyXG4gICAgICAgICAgICBjaHVua1tpKytdID0gMHhEODAwICsgKHQgPj4gMTApO1xyXG4gICAgICAgICAgICBjaHVua1tpKytdID0gMHhEQzAwICsgKHQgJiAxMDIzKTtcclxuICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgY2h1bmtbaSsrXSA9ICh0ICYgMTUpIDw8IDEyIHwgKGJ1ZmZlcltzdGFydCsrXSAmIDYzKSA8PCA2IHwgYnVmZmVyW3N0YXJ0KytdICYgNjM7XHJcbiAgICAgICAgaWYgKGkgPiA4MTkxKSB7XHJcbiAgICAgICAgICAgIChwYXJ0cyB8fCAocGFydHMgPSBbXSkpLnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNodW5rKSk7XHJcbiAgICAgICAgICAgIGkgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChwYXJ0cykge1xyXG4gICAgICAgIGlmIChpKVxyXG4gICAgICAgICAgICBwYXJ0cy5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjaHVuay5zbGljZSgwLCBpKSkpO1xyXG4gICAgICAgIHJldHVybiBwYXJ0cy5qb2luKFwiXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjaHVuay5zbGljZSgwLCBpKSk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgc3RyaW5nIGFzIFVURjggYnl0ZXMuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgU291cmNlIHN0cmluZ1xyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZmZlciBEZXN0aW5hdGlvbiBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCBEZXN0aW5hdGlvbiBvZmZzZXRcclxuICogQHJldHVybnMge251bWJlcn0gQnl0ZXMgd3JpdHRlblxyXG4gKi9cclxudXRmOC53cml0ZSA9IGZ1bmN0aW9uIHV0Zjhfd3JpdGUoc3RyaW5nLCBidWZmZXIsIG9mZnNldCkge1xyXG4gICAgdmFyIHN0YXJ0ID0gb2Zmc2V0LFxyXG4gICAgICAgIGMxLCAvLyBjaGFyYWN0ZXIgMVxyXG4gICAgICAgIGMyOyAvLyBjaGFyYWN0ZXIgMlxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjMSA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xyXG4gICAgICAgIGlmIChjMSA8IDEyOCkge1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzE7XHJcbiAgICAgICAgfSBlbHNlIGlmIChjMSA8IDIwNDgpIHtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxID4+IDYgICAgICAgfCAxOTI7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSAgICAgICAmIDYzIHwgMTI4O1xyXG4gICAgICAgIH0gZWxzZSBpZiAoKGMxICYgMHhGQzAwKSA9PT0gMHhEODAwICYmICgoYzIgPSBzdHJpbmcuY2hhckNvZGVBdChpICsgMSkpICYgMHhGQzAwKSA9PT0gMHhEQzAwKSB7XHJcbiAgICAgICAgICAgIGMxID0gMHgxMDAwMCArICgoYzEgJiAweDAzRkYpIDw8IDEwKSArIChjMiAmIDB4MDNGRik7XHJcbiAgICAgICAgICAgICsraTtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxID4+IDE4ICAgICAgfCAyNDA7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSA+PiAxMiAmIDYzIHwgMTI4O1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgPj4gNiAgJiA2MyB8IDEyODtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxICAgICAgICYgNjMgfCAxMjg7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxID4+IDEyICAgICAgfCAyMjQ7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSA+PiA2ICAmIDYzIHwgMTI4O1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgICAgICAgJiA2MyB8IDEyODtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb2Zmc2V0IC0gc3RhcnQ7XHJcbn07XHJcbiIsIi8vIGZ1bGwgbGlicmFyeSBlbnRyeSBwb2ludC5cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleFwiKTtcclxuIiwiLy8gbWluaW1hbCBsaWJyYXJ5IGVudHJ5IHBvaW50LlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2luZGV4LW1pbmltYWxcIik7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzO1xyXG5cclxudmFyIE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlXCIpLFxyXG4gICAgdXRpbCAgICA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG52YXIgVHlwZTsgLy8gY3ljbGljXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBtZXNzYWdlIHByb3RvdHlwZSBmb3IgdGhlIHNwZWNpZmllZCByZWZsZWN0ZWQgdHlwZSBhbmQgc2V0cyB1cCBpdHMgY29uc3RydWN0b3IuXHJcbiAqIEBjbGFzc2Rlc2MgUnVudGltZSBjbGFzcyBwcm92aWRpbmcgdGhlIHRvb2xzIHRvIGNyZWF0ZSB5b3VyIG93biBjdXN0b20gY2xhc3Nlcy5cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7VHlwZX0gdHlwZSBSZWZsZWN0ZWQgbWVzc2FnZSB0eXBlXHJcbiAqIEBwYXJhbSB7Kn0gW2N0b3JdIEN1c3RvbSBjb25zdHJ1Y3RvciB0byBzZXQgdXAsIGRlZmF1bHRzIHRvIGNyZWF0ZSBhIGdlbmVyaWMgb25lIGlmIG9taXR0ZWRcclxuICogQHJldHVybnMge01lc3NhZ2V9IE1lc3NhZ2UgcHJvdG90eXBlXHJcbiAqL1xyXG5mdW5jdGlvbiBDbGFzcyh0eXBlLCBjdG9yKSB7XHJcbiAgICBpZiAoIVR5cGUpXHJcbiAgICAgICAgVHlwZSA9IHJlcXVpcmUoXCIuL3R5cGVcIik7XHJcblxyXG4gICAgaWYgKCEodHlwZSBpbnN0YW5jZW9mIFR5cGUpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcInR5cGUgbXVzdCBiZSBhIFR5cGVcIik7XHJcblxyXG4gICAgaWYgKGN0b3IpIHtcclxuICAgICAgICBpZiAodHlwZW9mIGN0b3IgIT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiY3RvciBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XHJcbiAgICB9IGVsc2VcclxuICAgICAgICBjdG9yID0gQ2xhc3MuZ2VuZXJhdGUodHlwZSkuZW9mKHR5cGUubmFtZSk7IC8vIG5hbWVkIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIChjb2RlZ2VuIGlzIHJlcXVpcmVkIGFueXdheSlcclxuXHJcbiAgICAvLyBMZXQncyBwcmV0ZW5kLi4uXHJcbiAgICBjdG9yLmNvbnN0cnVjdG9yID0gQ2xhc3M7XHJcblxyXG4gICAgLy8gbmV3IENsYXNzKCkgLT4gTWVzc2FnZS5wcm90b3R5cGVcclxuICAgIChjdG9yLnByb3RvdHlwZSA9IG5ldyBNZXNzYWdlKCkpLmNvbnN0cnVjdG9yID0gY3RvcjtcclxuXHJcbiAgICAvLyBTdGF0aWMgbWV0aG9kcyBvbiBNZXNzYWdlIGFyZSBpbnN0YW5jZSBtZXRob2RzIG9uIENsYXNzIGFuZCB2aWNlIHZlcnNhXHJcbiAgICB1dGlsLm1lcmdlKGN0b3IsIE1lc3NhZ2UsIHRydWUpO1xyXG5cclxuICAgIC8vIENsYXNzZXMgYW5kIG1lc3NhZ2VzIHJlZmVyZW5jZSB0aGVpciByZWZsZWN0ZWQgdHlwZVxyXG4gICAgY3Rvci4kdHlwZSA9IHR5cGU7XHJcbiAgICBjdG9yLnByb3RvdHlwZS4kdHlwZSA9IHR5cGU7XHJcblxyXG4gICAgLy8gTWVzc2FnZXMgaGF2ZSBub24tZW51bWVyYWJsZSBkZWZhdWx0IHZhbHVlcyBvbiB0aGVpciBwcm90b3R5cGVcclxuICAgIHZhciBpID0gMDtcclxuICAgIGZvciAoOyBpIDwgLyogaW5pdGlhbGl6ZXMgKi8gdHlwZS5maWVsZHNBcnJheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIC8vIG9iamVjdHMgb24gdGhlIHByb3RvdHlwZSBtdXN0IGJlIGltbW11dGFibGUuIHVzZXJzIG11c3QgYXNzaWduIGEgbmV3IG9iamVjdCBpbnN0YW5jZSBhbmRcclxuICAgICAgICAvLyBjYW5ub3QgdXNlIEFycmF5I3B1c2ggb24gZW1wdHkgYXJyYXlzIG9uIHRoZSBwcm90b3R5cGUgZm9yIGV4YW1wbGUsIGFzIHRoaXMgd291bGQgbW9kaWZ5XHJcbiAgICAgICAgLy8gdGhlIHZhbHVlIG9uIHRoZSBwcm90b3R5cGUgZm9yIEFMTCBtZXNzYWdlcyBvZiB0aGlzIHR5cGUuIEhlbmNlLCB0aGVzZSBvYmplY3RzIGFyZSBmcm96ZW4uXHJcbiAgICAgICAgY3Rvci5wcm90b3R5cGVbdHlwZS5fZmllbGRzQXJyYXlbaV0ubmFtZV0gPSBBcnJheS5pc0FycmF5KHR5cGUuX2ZpZWxkc0FycmF5W2ldLnJlc29sdmUoKS5kZWZhdWx0VmFsdWUpXHJcbiAgICAgICAgICAgID8gdXRpbC5lbXB0eUFycmF5XHJcbiAgICAgICAgICAgIDogdXRpbC5pc09iamVjdCh0eXBlLl9maWVsZHNBcnJheVtpXS5kZWZhdWx0VmFsdWUpICYmICF0eXBlLl9maWVsZHNBcnJheVtpXS5sb25nXHJcbiAgICAgICAgICAgICAgPyB1dGlsLmVtcHR5T2JqZWN0XHJcbiAgICAgICAgICAgICAgOiB0eXBlLl9maWVsZHNBcnJheVtpXS5kZWZhdWx0VmFsdWU7IC8vIGlmIGEgbG9uZywgaXQgaXMgZnJvemVuIHdoZW4gaW5pdGlhbGl6ZWRcclxuICAgIH1cclxuXHJcbiAgICAvLyBNZXNzYWdlcyBoYXZlIG5vbi1lbnVtZXJhYmxlIGdldHRlcnMgYW5kIHNldHRlcnMgZm9yIGVhY2ggdmlydHVhbCBvbmVvZiBmaWVsZFxyXG4gICAgdmFyIGN0b3JQcm9wZXJ0aWVzID0ge307XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgLyogaW5pdGlhbGl6ZXMgKi8gdHlwZS5vbmVvZnNBcnJheS5sZW5ndGg7ICsraSlcclxuICAgICAgICBjdG9yUHJvcGVydGllc1t0eXBlLl9vbmVvZnNBcnJheVtpXS5yZXNvbHZlKCkubmFtZV0gPSB7XHJcbiAgICAgICAgICAgIGdldDogdXRpbC5vbmVPZkdldHRlcih0eXBlLl9vbmVvZnNBcnJheVtpXS5vbmVvZiksXHJcbiAgICAgICAgICAgIHNldDogdXRpbC5vbmVPZlNldHRlcih0eXBlLl9vbmVvZnNBcnJheVtpXS5vbmVvZilcclxuICAgICAgICB9O1xyXG4gICAgaWYgKGkpXHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoY3Rvci5wcm90b3R5cGUsIGN0b3JQcm9wZXJ0aWVzKTtcclxuXHJcbiAgICAvLyBSZWdpc3RlclxyXG4gICAgdHlwZS5jdG9yID0gY3RvcjtcclxuXHJcbiAgICByZXR1cm4gY3Rvci5wcm90b3R5cGU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgdGhlIHNwZWNpZmllZCB0eXBlLlxyXG4gKiBAcGFyYW0ge1R5cGV9IHR5cGUgVHlwZSB0byB1c2VcclxuICogQHJldHVybnMge0NvZGVnZW59IENvZGVnZW4gaW5zdGFuY2VcclxuICovXHJcbkNsYXNzLmdlbmVyYXRlID0gZnVuY3Rpb24gZ2VuZXJhdGUodHlwZSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC12YXJzXHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSAqL1xyXG4gICAgdmFyIGdlbiA9IHV0aWwuY29kZWdlbihcInBcIik7XHJcbiAgICAvLyBleHBsaWNpdGx5IGluaXRpYWxpemUgbXV0YWJsZSBvYmplY3QvYXJyYXkgZmllbGRzIHNvIHRoYXQgdGhlc2UgYXJlbid0IGp1c3QgaW5oZXJpdGVkIGZyb20gdGhlIHByb3RvdHlwZVxyXG4gICAgZm9yICh2YXIgaSA9IDAsIGZpZWxkOyBpIDwgdHlwZS5maWVsZHNBcnJheS5sZW5ndGg7ICsraSlcclxuICAgICAgICBpZiAoKGZpZWxkID0gdHlwZS5fZmllbGRzQXJyYXlbaV0pLm1hcCkgZ2VuXHJcbiAgICAgICAgICAgIChcInRoaXMlcz17fVwiLCB1dGlsLnNhZmVQcm9wKGZpZWxkLm5hbWUpKTtcclxuICAgICAgICBlbHNlIGlmIChmaWVsZC5yZXBlYXRlZCkgZ2VuXHJcbiAgICAgICAgICAgIChcInRoaXMlcz1bXVwiLCB1dGlsLnNhZmVQcm9wKGZpZWxkLm5hbWUpKTtcclxuICAgIHJldHVybiBnZW5cclxuICAgIChcImlmKHApZm9yKHZhciBrcz1PYmplY3Qua2V5cyhwKSxpPTA7aTxrcy5sZW5ndGg7KytpKWlmKHBba3NbaV1dIT1udWxsKVwiKSAvLyBvbWl0IHVuZGVmaW5lZCBvciBudWxsXHJcbiAgICAgICAgKFwidGhpc1trc1tpXV09cFtrc1tpXV1cIik7XHJcbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lICovXHJcbn07XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBtZXNzYWdlIHByb3RvdHlwZSBmb3IgdGhlIHNwZWNpZmllZCByZWZsZWN0ZWQgdHlwZSBhbmQgc2V0cyB1cCBpdHMgY29uc3RydWN0b3IuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge1R5cGV9IHR5cGUgUmVmbGVjdGVkIG1lc3NhZ2UgdHlwZVxyXG4gKiBAcGFyYW0geyp9IFtjdG9yXSBDdXN0b20gY29uc3RydWN0b3IgdG8gc2V0IHVwLCBkZWZhdWx0cyB0byBjcmVhdGUgYSBnZW5lcmljIG9uZSBpZiBvbWl0dGVkXHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBNZXNzYWdlIHByb3RvdHlwZVxyXG4gKiBAZGVwcmVjYXRlZCBzaW5jZSA2LjcuMCBpdCdzIHBvc3NpYmxlIHRvIGp1c3QgYXNzaWduIGEgbmV3IGNvbnN0cnVjdG9yIHRvIHtAbGluayBUeXBlI2N0b3J9XHJcbiAqL1xyXG5DbGFzcy5jcmVhdGUgPSBDbGFzcztcclxuXHJcbi8vIFN0YXRpYyBtZXRob2RzIG9uIE1lc3NhZ2UgYXJlIGluc3RhbmNlIG1ldGhvZHMgb24gQ2xhc3MgYW5kIHZpY2UgdmVyc2FcclxuQ2xhc3MucHJvdG90eXBlID0gTWVzc2FnZTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IG1lc3NhZ2Ugb2YgdGhpcyB0eXBlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXHJcbiAqIEBuYW1lIENsYXNzI2Zyb21PYmplY3RcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcclxuICogQHJldHVybnMge01lc3NhZ2V9IE1lc3NhZ2UgaW5zdGFuY2VcclxuICovXHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBtZXNzYWdlIG9mIHRoaXMgdHlwZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxyXG4gKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayBDbGFzcyNmcm9tT2JqZWN0fS5cclxuICogQG5hbWUgQ2xhc3MjZnJvbVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxyXG4gKiBAcmV0dXJucyB7TWVzc2FnZX0gTWVzc2FnZSBpbnN0YW5jZVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBtZXNzYWdlIG9mIHRoaXMgdHlwZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxyXG4gKiBAbmFtZSBDbGFzcyN0b09iamVjdFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtNZXNzYWdlfSBtZXNzYWdlIE1lc3NhZ2UgaW5zdGFuY2VcclxuICogQHBhcmFtIHtDb252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xyXG4gKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBFbmNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUuXHJcbiAqIEBuYW1lIENsYXNzI2VuY29kZVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtNZXNzYWdlfE9iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIE1lc3NhZ2UgdG8gZW5jb2RlXHJcbiAqIEBwYXJhbSB7V3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gdXNlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IFdyaXRlclxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBFbmNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUgcHJlY2VlZGVkIGJ5IGl0cyBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEBuYW1lIENsYXNzI2VuY29kZURlbGltaXRlZFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtNZXNzYWdlfE9iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIE1lc3NhZ2UgdG8gZW5jb2RlXHJcbiAqIEBwYXJhbSB7V3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gdXNlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IFdyaXRlclxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBEZWNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUuXHJcbiAqIEBuYW1lIENsYXNzI2RlY29kZVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtSZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlXHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBEZWNvZGVkIG1lc3NhZ2VcclxuICovXHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIG1lc3NhZ2Ugb2YgdGhpcyB0eXBlIHByZWNlZWRlZCBieSBpdHMgbGVuZ3RoIGFzIGEgdmFyaW50LlxyXG4gKiBAbmFtZSBDbGFzcyNkZWNvZGVEZWxpbWl0ZWRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7UmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZVxyXG4gKiBAcmV0dXJucyB7TWVzc2FnZX0gRGVjb2RlZCBtZXNzYWdlXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFZlcmlmaWVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUuXHJcbiAqIEBuYW1lIENsYXNzI3ZlcmlmeVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtNZXNzYWdlfE9iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIE1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxyXG4gKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XHJcbiAqL1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBjb21tb247XHJcblxyXG4vKipcclxuICogUHJvdmlkZXMgY29tbW9uIHR5cGUgZGVmaW5pdGlvbnMuXHJcbiAqIENhbiBhbHNvIGJlIHVzZWQgdG8gcHJvdmlkZSBhZGRpdGlvbmFsIGdvb2dsZSB0eXBlcyBvciB5b3VyIG93biBjdXN0b20gdHlwZXMuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFNob3J0IG5hbWUgYXMgaW4gYGdvb2dsZS9wcm90b2J1Zi9bbmFtZV0ucHJvdG9gIG9yIGZ1bGwgZmlsZSBuYW1lXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IGpzb24gSlNPTiBkZWZpbml0aW9uIHdpdGhpbiBgZ29vZ2xlLnByb3RvYnVmYCBpZiBhIHNob3J0IG5hbWUsIG90aGVyd2lzZSB0aGUgZmlsZSdzIHJvb3QgZGVmaW5pdGlvblxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBnb29nbGUvcHJvdG9idWYvYW55LnByb3RvIEFueVxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBnb29nbGUvcHJvdG9idWYvZHVyYXRpb24ucHJvdG8gRHVyYXRpb25cclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gZ29vZ2xlL3Byb3RvYnVmL2VtcHR5LnByb3RvIEVtcHR5XHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IGdvb2dsZS9wcm90b2J1Zi9zdHJ1Y3QucHJvdG8gU3RydWN0LCBWYWx1ZSwgTnVsbFZhbHVlIGFuZCBMaXN0VmFsdWVcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gZ29vZ2xlL3Byb3RvYnVmL3RpbWVzdGFtcC5wcm90byBUaW1lc3RhbXBcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gZ29vZ2xlL3Byb3RvYnVmL3dyYXBwZXJzLnByb3RvIFdyYXBwZXJzXHJcbiAqIEBleGFtcGxlXHJcbiAqIC8vIG1hbnVhbGx5IHByb3ZpZGVzIGRlc2NyaXB0b3IucHJvdG8gKGFzc3VtZXMgZ29vZ2xlL3Byb3RvYnVmLyBuYW1lc3BhY2UgYW5kIC5wcm90byBleHRlbnNpb24pXHJcbiAqIHByb3RvYnVmLmNvbW1vbihcImRlc2NyaXB0b3JcIiwgZGVzY3JpcHRvckpzb24pO1xyXG4gKlxyXG4gKiAvLyBtYW51YWxseSBwcm92aWRlcyBhIGN1c3RvbSBkZWZpbml0aW9uICh1c2VzIG15LmZvbyBuYW1lc3BhY2UpXHJcbiAqIHByb3RvYnVmLmNvbW1vbihcIm15L2Zvby9iYXIucHJvdG9cIiwgbXlGb29CYXJKc29uKTtcclxuICovXHJcbmZ1bmN0aW9uIGNvbW1vbihuYW1lLCBqc29uKSB7XHJcbiAgICBpZiAoIWNvbW1vblJlLnRlc3QobmFtZSkpIHtcclxuICAgICAgICBuYW1lID0gXCJnb29nbGUvcHJvdG9idWYvXCIgKyBuYW1lICsgXCIucHJvdG9cIjtcclxuICAgICAgICBqc29uID0geyBuZXN0ZWQ6IHsgZ29vZ2xlOiB7IG5lc3RlZDogeyBwcm90b2J1ZjogeyBuZXN0ZWQ6IGpzb24gfSB9IH0gfSB9O1xyXG4gICAgfVxyXG4gICAgY29tbW9uW25hbWVdID0ganNvbjtcclxufVxyXG5cclxudmFyIGNvbW1vblJlID0gL1xcL3xcXC4vO1xyXG5cclxuLy8gTm90IHByb3ZpZGVkIGJlY2F1c2Ugb2YgbGltaXRlZCB1c2UgKGZlZWwgZnJlZSB0byBkaXNjdXNzIG9yIHRvIHByb3ZpZGUgeW91cnNlbGYpOlxyXG4vL1xyXG4vLyBnb29nbGUvcHJvdG9idWYvZGVzY3JpcHRvci5wcm90b1xyXG4vLyBnb29nbGUvcHJvdG9idWYvZmllbGRfbWFzay5wcm90b1xyXG4vLyBnb29nbGUvcHJvdG9idWYvc291cmNlX2NvbnRleHQucHJvdG9cclxuLy8gZ29vZ2xlL3Byb3RvYnVmL3R5cGUucHJvdG9cclxuLy9cclxuLy8gU3RyaXBwZWQgYW5kIHByZS1wYXJzZWQgdmVyc2lvbnMgb2YgdGhlc2Ugbm9uLWJ1bmRsZWQgZmlsZXMgYXJlIGluc3RlYWQgYXZhaWxhYmxlIGFzIHBhcnQgb2ZcclxuLy8gdGhlIHJlcG9zaXRvcnkgb3IgcGFja2FnZSB3aXRoaW4gdGhlIGdvb2dsZS9wcm90b2J1ZiBkaXJlY3RvcnkuXHJcblxyXG5jb21tb24oXCJhbnlcIiwge1xyXG4gICAgQW55OiB7XHJcbiAgICAgICAgZmllbGRzOiB7XHJcbiAgICAgICAgICAgIHR5cGVfdXJsOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDFcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiYnl0ZXNcIixcclxuICAgICAgICAgICAgICAgIGlkOiAyXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0pO1xyXG5cclxudmFyIHRpbWVUeXBlO1xyXG5cclxuY29tbW9uKFwiZHVyYXRpb25cIiwge1xyXG4gICAgRHVyYXRpb246IHRpbWVUeXBlID0ge1xyXG4gICAgICAgIGZpZWxkczoge1xyXG4gICAgICAgICAgICBzZWNvbmRzOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcImludDY0XCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBuYW5vczoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJpbnQzMlwiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcblxyXG5jb21tb24oXCJ0aW1lc3RhbXBcIiwge1xyXG4gICAgVGltZXN0YW1wOiB0aW1lVHlwZVxyXG59KTtcclxuXHJcbmNvbW1vbihcImVtcHR5XCIsIHtcclxuICAgIEVtcHR5OiB7XHJcbiAgICAgICAgZmllbGRzOiB7fVxyXG4gICAgfVxyXG59KTtcclxuXHJcbmNvbW1vbihcInN0cnVjdFwiLCB7XHJcbiAgICBTdHJ1Y3Q6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgZmllbGRzOiB7XHJcbiAgICAgICAgICAgICAgICBrZXlUeXBlOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJWYWx1ZVwiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBWYWx1ZToge1xyXG4gICAgICAgIG9uZW9mczoge1xyXG4gICAgICAgICAgICBraW5kOiB7XHJcbiAgICAgICAgICAgICAgICBvbmVvZjogW1xyXG4gICAgICAgICAgICAgICAgICAgIFwibnVsbFZhbHVlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJudW1iZXJWYWx1ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIFwic3RyaW5nVmFsdWVcIixcclxuICAgICAgICAgICAgICAgICAgICBcImJvb2xWYWx1ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIFwic3RydWN0VmFsdWVcIixcclxuICAgICAgICAgICAgICAgICAgICBcImxpc3RWYWx1ZVwiXHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZpZWxkczoge1xyXG4gICAgICAgICAgICBudWxsVmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiTnVsbFZhbHVlXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBudW1iZXJWYWx1ZToge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJkb3VibGVcIixcclxuICAgICAgICAgICAgICAgIGlkOiAyXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0cmluZ1ZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDNcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYm9vbFZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2xcIixcclxuICAgICAgICAgICAgICAgIGlkOiA0XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0cnVjdFZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIlN0cnVjdFwiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGlzdFZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkxpc3RWYWx1ZVwiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDZcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBOdWxsVmFsdWU6IHtcclxuICAgICAgICB2YWx1ZXM6IHtcclxuICAgICAgICAgICAgTlVMTF9WQUxVRTogMFxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBMaXN0VmFsdWU6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgdmFsdWVzOiB7XHJcbiAgICAgICAgICAgICAgICBydWxlOiBcInJlcGVhdGVkXCIsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIlZhbHVlXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxuXHJcbmNvbW1vbihcIndyYXBwZXJzXCIsIHtcclxuICAgIERvdWJsZVZhbHVlOiB7XHJcbiAgICAgICAgZmllbGRzOiB7XHJcbiAgICAgICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcImRvdWJsZVwiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBGbG9hdFZhbHVlOiB7XHJcbiAgICAgICAgZmllbGRzOiB7XHJcbiAgICAgICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIEludDY0VmFsdWU6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiaW50NjRcIixcclxuICAgICAgICAgICAgICAgIGlkOiAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgVUludDY0VmFsdWU6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwidWludDY0XCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIEludDMyVmFsdWU6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiaW50MzJcIixcclxuICAgICAgICAgICAgICAgIGlkOiAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgVUludDMyVmFsdWU6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwidWludDMyXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIEJvb2xWYWx1ZToge1xyXG4gICAgICAgIGZpZWxkczoge1xyXG4gICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJib29sXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIFN0cmluZ1ZhbHVlOiB7XHJcbiAgICAgICAgZmllbGRzOiB7XHJcbiAgICAgICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBCeXRlc1ZhbHVlOiB7XHJcbiAgICAgICAgZmllbGRzOiB7XHJcbiAgICAgICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcImJ5dGVzXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8qKlxyXG4gKiBSdW50aW1lIG1lc3NhZ2UgZnJvbS90byBwbGFpbiBvYmplY3QgY29udmVydGVycy5cclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxudmFyIGNvbnZlcnRlciA9IGV4cG9ydHM7XHJcblxyXG52YXIgRW51bSA9IHJlcXVpcmUoXCIuL2VudW1cIiksXHJcbiAgICB1dGlsID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYSBwYXJ0aWFsIHZhbHVlIGZyb21PYmplY3QgY29udmV0ZXIuXHJcbiAqIEBwYXJhbSB7Q29kZWdlbn0gZ2VuIENvZGVnZW4gaW5zdGFuY2VcclxuICogQHBhcmFtIHtGaWVsZH0gZmllbGQgUmVmbGVjdGVkIGZpZWxkXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBmaWVsZEluZGV4IEZpZWxkIGluZGV4XHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wIFByb3BlcnR5IHJlZmVyZW5jZVxyXG4gKiBAcmV0dXJucyB7Q29kZWdlbn0gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKiBAaWdub3JlXHJcbiAqL1xyXG5mdW5jdGlvbiBnZW5WYWx1ZVBhcnRpYWxfZnJvbU9iamVjdChnZW4sIGZpZWxkLCBmaWVsZEluZGV4LCBwcm9wKSB7XHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSwgYmxvY2stc2NvcGVkLXZhciwgbm8tcmVkZWNsYXJlICovXHJcbiAgICBpZiAoZmllbGQucmVzb2x2ZWRUeXBlKSB7XHJcbiAgICAgICAgaWYgKGZpZWxkLnJlc29sdmVkVHlwZSBpbnN0YW5jZW9mIEVudW0pIHsgZ2VuXHJcbiAgICAgICAgICAgIChcInN3aXRjaChkJXMpe1wiLCBwcm9wKTtcclxuICAgICAgICAgICAgZm9yICh2YXIgdmFsdWVzID0gZmllbGQucmVzb2x2ZWRUeXBlLnZhbHVlcywga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkLnJlcGVhdGVkICYmIHZhbHVlc1trZXlzW2ldXSA9PT0gZmllbGQudHlwZURlZmF1bHQpIGdlblxyXG4gICAgICAgICAgICAgICAgKFwiZGVmYXVsdDpcIik7XHJcbiAgICAgICAgICAgICAgICBnZW5cclxuICAgICAgICAgICAgICAgIChcImNhc2UlajpcIiwga2V5c1tpXSlcclxuICAgICAgICAgICAgICAgIChcImNhc2UgJWo6XCIsIHZhbHVlc1trZXlzW2ldXSlcclxuICAgICAgICAgICAgICAgICAgICAoXCJtJXM9JWpcIiwgcHJvcCwgdmFsdWVzW2tleXNbaV1dKVxyXG4gICAgICAgICAgICAgICAgICAgIChcImJyZWFrXCIpO1xyXG4gICAgICAgICAgICB9IGdlblxyXG4gICAgICAgICAgICAoXCJ9XCIpO1xyXG4gICAgICAgIH0gZWxzZSBnZW5cclxuICAgICAgICAgICAgKFwiaWYodHlwZW9mIGQlcyE9PVxcXCJvYmplY3RcXFwiKVwiLCBwcm9wKVxyXG4gICAgICAgICAgICAgICAgKFwidGhyb3cgVHlwZUVycm9yKCVqKVwiLCBmaWVsZC5mdWxsTmFtZSArIFwiOiBvYmplY3QgZXhwZWN0ZWRcIilcclxuICAgICAgICAgICAgKFwibSVzPXR5cGVzWyVkXS5mcm9tT2JqZWN0KGQlcylcIiwgcHJvcCwgZmllbGRJbmRleCwgcHJvcCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhciBpc1Vuc2lnbmVkID0gZmFsc2U7XHJcbiAgICAgICAgc3dpdGNoIChmaWVsZC50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJkb3VibGVcIjpcclxuICAgICAgICAgICAgY2FzZSBcImZsb2F0XCI6Z2VuXHJcbiAgICAgICAgICAgICAgICAoXCJtJXM9TnVtYmVyKGQlcylcIiwgcHJvcCwgcHJvcCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVpbnQzMlwiOlxyXG4gICAgICAgICAgICBjYXNlIFwiZml4ZWQzMlwiOiBnZW5cclxuICAgICAgICAgICAgICAgIChcIm0lcz1kJXM+Pj4wXCIsIHByb3AsIHByb3ApO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJpbnQzMlwiOlxyXG4gICAgICAgICAgICBjYXNlIFwic2ludDMyXCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJzZml4ZWQzMlwiOiBnZW5cclxuICAgICAgICAgICAgICAgIChcIm0lcz1kJXN8MFwiLCBwcm9wLCBwcm9wKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwidWludDY0XCI6XHJcbiAgICAgICAgICAgICAgICBpc1Vuc2lnbmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZmFsbHRocm91Z2hcclxuICAgICAgICAgICAgY2FzZSBcImludDY0XCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJzaW50NjRcIjpcclxuICAgICAgICAgICAgY2FzZSBcImZpeGVkNjRcIjpcclxuICAgICAgICAgICAgY2FzZSBcInNmaXhlZDY0XCI6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwiaWYodXRpbC5Mb25nKVwiKVxyXG4gICAgICAgICAgICAgICAgICAgIChcIihtJXM9dXRpbC5Mb25nLmZyb21WYWx1ZShkJXMpKS51bnNpZ25lZD0lalwiLCBwcm9wLCBwcm9wLCBpc1Vuc2lnbmVkKVxyXG4gICAgICAgICAgICAgICAgKFwiZWxzZSBpZih0eXBlb2YgZCVzPT09XFxcInN0cmluZ1xcXCIpXCIsIHByb3ApXHJcbiAgICAgICAgICAgICAgICAgICAgKFwibSVzPXBhcnNlSW50KGQlcywxMClcIiwgcHJvcCwgcHJvcClcclxuICAgICAgICAgICAgICAgIChcImVsc2UgaWYodHlwZW9mIGQlcz09PVxcXCJudW1iZXJcXFwiKVwiLCBwcm9wKVxyXG4gICAgICAgICAgICAgICAgICAgIChcIm0lcz1kJXNcIiwgcHJvcCwgcHJvcClcclxuICAgICAgICAgICAgICAgIChcImVsc2UgaWYodHlwZW9mIGQlcz09PVxcXCJvYmplY3RcXFwiKVwiLCBwcm9wKVxyXG4gICAgICAgICAgICAgICAgICAgIChcIm0lcz1uZXcgdXRpbC5Mb25nQml0cyhkJXMubG93Pj4+MCxkJXMuaGlnaD4+PjApLnRvTnVtYmVyKCVzKVwiLCBwcm9wLCBwcm9wLCBwcm9wLCBpc1Vuc2lnbmVkID8gXCJ0cnVlXCIgOiBcIlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiYnl0ZXNcIjogZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJpZih0eXBlb2YgZCVzPT09XFxcInN0cmluZ1xcXCIpXCIsIHByb3ApXHJcbiAgICAgICAgICAgICAgICAgICAgKFwidXRpbC5iYXNlNjQuZGVjb2RlKGQlcyxtJXM9dXRpbC5uZXdCdWZmZXIodXRpbC5iYXNlNjQubGVuZ3RoKGQlcykpLDApXCIsIHByb3AsIHByb3AsIHByb3ApXHJcbiAgICAgICAgICAgICAgICAoXCJlbHNlIGlmKGQlcy5sZW5ndGgpXCIsIHByb3ApXHJcbiAgICAgICAgICAgICAgICAgICAgKFwibSVzPWQlc1wiLCBwcm9wLCBwcm9wKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwibSVzPVN0cmluZyhkJXMpXCIsIHByb3AsIHByb3ApO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJib29sXCI6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwibSVzPUJvb2xlYW4oZCVzKVwiLCBwcm9wLCBwcm9wKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAvKiBkZWZhdWx0OiBnZW5cclxuICAgICAgICAgICAgICAgIChcIm0lcz1kJXNcIiwgcHJvcCwgcHJvcCk7XHJcbiAgICAgICAgICAgICAgICBicmVhazsgKi9cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZ2VuO1xyXG4gICAgLyogZXNsaW50LWVuYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSwgYmxvY2stc2NvcGVkLXZhciwgbm8tcmVkZWNsYXJlICovXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYSBwbGFpbiBvYmplY3QgdG8gcnVudGltZSBtZXNzYWdlIGNvbnZlcnRlciBzcGVjaWZpYyB0byB0aGUgc3BlY2lmaWVkIG1lc3NhZ2UgdHlwZS5cclxuICogQHBhcmFtIHtUeXBlfSBtdHlwZSBNZXNzYWdlIHR5cGVcclxuICogQHJldHVybnMge0NvZGVnZW59IENvZGVnZW4gaW5zdGFuY2VcclxuICovXHJcbmNvbnZlcnRlci5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChtdHlwZSkge1xyXG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUsIGJsb2NrLXNjb3BlZC12YXIsIG5vLXJlZGVjbGFyZSAqL1xyXG4gICAgdmFyIGZpZWxkcyA9IG10eXBlLmZpZWxkc0FycmF5O1xyXG4gICAgdmFyIGdlbiA9IHV0aWwuY29kZWdlbihcImRcIilcclxuICAgIChcImlmKGQgaW5zdGFuY2VvZiB0aGlzLmN0b3IpXCIpXHJcbiAgICAgICAgKFwicmV0dXJuIGRcIik7XHJcbiAgICBpZiAoIWZpZWxkcy5sZW5ndGgpIHJldHVybiBnZW5cclxuICAgIChcInJldHVybiBuZXcgdGhpcy5jdG9yXCIpO1xyXG4gICAgZ2VuXHJcbiAgICAoXCJ2YXIgbT1uZXcgdGhpcy5jdG9yXCIpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICB2YXIgZmllbGQgID0gZmllbGRzW2ldLnJlc29sdmUoKSxcclxuICAgICAgICAgICAgcHJvcCAgID0gdXRpbC5zYWZlUHJvcChmaWVsZC5uYW1lKTtcclxuXHJcbiAgICAgICAgLy8gTWFwIGZpZWxkc1xyXG4gICAgICAgIGlmIChmaWVsZC5tYXApIHsgZ2VuXHJcbiAgICAoXCJpZihkJXMpe1wiLCBwcm9wKVxyXG4gICAgICAgIChcImlmKHR5cGVvZiBkJXMhPT1cXFwib2JqZWN0XFxcIilcIiwgcHJvcClcclxuICAgICAgICAgICAgKFwidGhyb3cgVHlwZUVycm9yKCVqKVwiLCBmaWVsZC5mdWxsTmFtZSArIFwiOiBvYmplY3QgZXhwZWN0ZWRcIilcclxuICAgICAgICAoXCJtJXM9e31cIiwgcHJvcClcclxuICAgICAgICAoXCJmb3IodmFyIGtzPU9iamVjdC5rZXlzKGQlcyksaT0wO2k8a3MubGVuZ3RoOysraSl7XCIsIHByb3ApO1xyXG4gICAgICAgICAgICBnZW5WYWx1ZVBhcnRpYWxfZnJvbU9iamVjdChnZW4sIGZpZWxkLCAvKiBub3Qgc29ydGVkICovIGksIHByb3AgKyBcIltrc1tpXV1cIilcclxuICAgICAgICAoXCJ9XCIpXHJcbiAgICAoXCJ9XCIpO1xyXG5cclxuICAgICAgICAvLyBSZXBlYXRlZCBmaWVsZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGZpZWxkLnJlcGVhdGVkKSB7IGdlblxyXG4gICAgKFwiaWYoZCVzKXtcIiwgcHJvcClcclxuICAgICAgICAoXCJpZighQXJyYXkuaXNBcnJheShkJXMpKVwiLCBwcm9wKVxyXG4gICAgICAgICAgICAoXCJ0aHJvdyBUeXBlRXJyb3IoJWopXCIsIGZpZWxkLmZ1bGxOYW1lICsgXCI6IGFycmF5IGV4cGVjdGVkXCIpXHJcbiAgICAgICAgKFwibSVzPVtdXCIsIHByb3ApXHJcbiAgICAgICAgKFwiZm9yKHZhciBpPTA7aTxkJXMubGVuZ3RoOysraSl7XCIsIHByb3ApO1xyXG4gICAgICAgICAgICBnZW5WYWx1ZVBhcnRpYWxfZnJvbU9iamVjdChnZW4sIGZpZWxkLCAvKiBub3Qgc29ydGVkICovIGksIHByb3AgKyBcIltpXVwiKVxyXG4gICAgICAgIChcIn1cIilcclxuICAgIChcIn1cIik7XHJcblxyXG4gICAgICAgIC8vIE5vbi1yZXBlYXRlZCBmaWVsZHNcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoIShmaWVsZC5yZXNvbHZlZFR5cGUgaW5zdGFuY2VvZiBFbnVtKSkgZ2VuIC8vIG5vIG5lZWQgdG8gdGVzdCBmb3IgbnVsbC91bmRlZmluZWQgaWYgYW4gZW51bSAodXNlcyBzd2l0Y2gpXHJcbiAgICAoXCJpZihkJXMhPW51bGwpe1wiLCBwcm9wKTsgLy8gIT09IHVuZGVmaW5lZCAmJiAhPT0gbnVsbFxyXG4gICAgICAgIGdlblZhbHVlUGFydGlhbF9mcm9tT2JqZWN0KGdlbiwgZmllbGQsIC8qIG5vdCBzb3J0ZWQgKi8gaSwgcHJvcCk7XHJcbiAgICAgICAgICAgIGlmICghKGZpZWxkLnJlc29sdmVkVHlwZSBpbnN0YW5jZW9mIEVudW0pKSBnZW5cclxuICAgIChcIn1cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfSByZXR1cm4gZ2VuXHJcbiAgICAoXCJyZXR1cm4gbVwiKTtcclxuICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUsIGJsb2NrLXNjb3BlZC12YXIsIG5vLXJlZGVjbGFyZSAqL1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIHBhcnRpYWwgdmFsdWUgdG9PYmplY3QgY29udmVydGVyLlxyXG4gKiBAcGFyYW0ge0NvZGVnZW59IGdlbiBDb2RlZ2VuIGluc3RhbmNlXHJcbiAqIEBwYXJhbSB7RmllbGR9IGZpZWxkIFJlZmxlY3RlZCBmaWVsZFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZmllbGRJbmRleCBGaWVsZCBpbmRleFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcHJvcCBQcm9wZXJ0eSByZWZlcmVuY2VcclxuICogQHJldHVybnMge0NvZGVnZW59IENvZGVnZW4gaW5zdGFuY2VcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gZ2VuVmFsdWVQYXJ0aWFsX3RvT2JqZWN0KGdlbiwgZmllbGQsIGZpZWxkSW5kZXgsIHByb3ApIHtcclxuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lLCBibG9jay1zY29wZWQtdmFyLCBuby1yZWRlY2xhcmUgKi9cclxuICAgIGlmIChmaWVsZC5yZXNvbHZlZFR5cGUpIHtcclxuICAgICAgICBpZiAoZmllbGQucmVzb2x2ZWRUeXBlIGluc3RhbmNlb2YgRW51bSkgZ2VuXHJcbiAgICAgICAgICAgIChcImQlcz1vLmVudW1zPT09U3RyaW5nP3R5cGVzWyVkXS52YWx1ZXNbbSVzXTptJXNcIiwgcHJvcCwgZmllbGRJbmRleCwgcHJvcCwgcHJvcCk7XHJcbiAgICAgICAgZWxzZSBnZW5cclxuICAgICAgICAgICAgKFwiZCVzPXR5cGVzWyVkXS50b09iamVjdChtJXMsbylcIiwgcHJvcCwgZmllbGRJbmRleCwgcHJvcCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhciBpc1Vuc2lnbmVkID0gZmFsc2U7XHJcbiAgICAgICAgc3dpdGNoIChmaWVsZC50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ1aW50NjRcIjpcclxuICAgICAgICAgICAgICAgIGlzVW5zaWduZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1mYWxsdGhyb3VnaFxyXG4gICAgICAgICAgICBjYXNlIFwiaW50NjRcIjpcclxuICAgICAgICAgICAgY2FzZSBcInNpbnQ2NFwiOlxyXG4gICAgICAgICAgICBjYXNlIFwiZml4ZWQ2NFwiOlxyXG4gICAgICAgICAgICBjYXNlIFwic2ZpeGVkNjRcIjogZ2VuXHJcbiAgICAgICAgICAgIChcImlmKHR5cGVvZiBtJXM9PT1cXFwibnVtYmVyXFxcIilcIiwgcHJvcClcclxuICAgICAgICAgICAgICAgIChcImQlcz1vLmxvbmdzPT09U3RyaW5nP1N0cmluZyhtJXMpOm0lc1wiLCBwcm9wLCBwcm9wLCBwcm9wKVxyXG4gICAgICAgICAgICAoXCJlbHNlXCIpIC8vIExvbmctbGlrZVxyXG4gICAgICAgICAgICAgICAgKFwiZCVzPW8ubG9uZ3M9PT1TdHJpbmc/dXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG0lcyk6by5sb25ncz09PU51bWJlcj9uZXcgdXRpbC5Mb25nQml0cyhtJXMubG93Pj4+MCxtJXMuaGlnaD4+PjApLnRvTnVtYmVyKCVzKTptJXNcIiwgcHJvcCwgcHJvcCwgcHJvcCwgcHJvcCwgaXNVbnNpZ25lZCA/IFwidHJ1ZVwiOiBcIlwiLCBwcm9wKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiYnl0ZXNcIjogZ2VuXHJcbiAgICAgICAgICAgIChcImQlcz1vLmJ5dGVzPT09U3RyaW5nP3V0aWwuYmFzZTY0LmVuY29kZShtJXMsMCxtJXMubGVuZ3RoKTpvLmJ5dGVzPT09QXJyYXk/QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobSVzKTptJXNcIiwgcHJvcCwgcHJvcCwgcHJvcCwgcHJvcCwgcHJvcCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDogZ2VuXHJcbiAgICAgICAgICAgIChcImQlcz1tJXNcIiwgcHJvcCwgcHJvcCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZ2VuO1xyXG4gICAgLyogZXNsaW50LWVuYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSwgYmxvY2stc2NvcGVkLXZhciwgbm8tcmVkZWNsYXJlICovXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYSBydW50aW1lIG1lc3NhZ2UgdG8gcGxhaW4gb2JqZWN0IGNvbnZlcnRlciBzcGVjaWZpYyB0byB0aGUgc3BlY2lmaWVkIG1lc3NhZ2UgdHlwZS5cclxuICogQHBhcmFtIHtUeXBlfSBtdHlwZSBNZXNzYWdlIHR5cGVcclxuICogQHJldHVybnMge0NvZGVnZW59IENvZGVnZW4gaW5zdGFuY2VcclxuICovXHJcbmNvbnZlcnRlci50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG10eXBlKSB7XHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSwgYmxvY2stc2NvcGVkLXZhciwgbm8tcmVkZWNsYXJlICovXHJcbiAgICB2YXIgZmllbGRzID0gbXR5cGUuZmllbGRzQXJyYXkuc2xpY2UoKS5zb3J0KHV0aWwuY29tcGFyZUZpZWxkc0J5SWQpO1xyXG4gICAgaWYgKCFmaWVsZHMubGVuZ3RoKVxyXG4gICAgICAgIHJldHVybiB1dGlsLmNvZGVnZW4oKShcInJldHVybiB7fVwiKTtcclxuICAgIHZhciBnZW4gPSB1dGlsLmNvZGVnZW4oXCJtXCIsIFwib1wiKVxyXG4gICAgKFwiaWYoIW8pXCIpXHJcbiAgICAgICAgKFwibz17fVwiKVxyXG4gICAgKFwidmFyIGQ9e31cIik7XHJcblxyXG4gICAgdmFyIHJlcGVhdGVkRmllbGRzID0gW10sXHJcbiAgICAgICAgbWFwRmllbGRzID0gW10sXHJcbiAgICAgICAgbm9ybWFsRmllbGRzID0gW10sXHJcbiAgICAgICAgaSA9IDA7XHJcbiAgICBmb3IgKDsgaSA8IGZpZWxkcy5sZW5ndGg7ICsraSlcclxuICAgICAgICBpZiAoIWZpZWxkc1tpXS5wYXJ0T2YpXHJcbiAgICAgICAgICAgICggZmllbGRzW2ldLnJlc29sdmUoKS5yZXBlYXRlZCA/IHJlcGVhdGVkRmllbGRzXHJcbiAgICAgICAgICAgIDogZmllbGRzW2ldLm1hcCA/IG1hcEZpZWxkc1xyXG4gICAgICAgICAgICA6IG5vcm1hbEZpZWxkcykucHVzaChmaWVsZHNbaV0pO1xyXG5cclxuICAgIGlmIChyZXBlYXRlZEZpZWxkcy5sZW5ndGgpIHsgZ2VuXHJcbiAgICAoXCJpZihvLmFycmF5c3x8by5kZWZhdWx0cyl7XCIpO1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCByZXBlYXRlZEZpZWxkcy5sZW5ndGg7ICsraSkgZ2VuXHJcbiAgICAgICAgKFwiZCVzPVtdXCIsIHV0aWwuc2FmZVByb3AocmVwZWF0ZWRGaWVsZHNbaV0ubmFtZSkpO1xyXG4gICAgICAgIGdlblxyXG4gICAgKFwifVwiKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobWFwRmllbGRzLmxlbmd0aCkgeyBnZW5cclxuICAgIChcImlmKG8ub2JqZWN0c3x8by5kZWZhdWx0cyl7XCIpO1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtYXBGaWVsZHMubGVuZ3RoOyArK2kpIGdlblxyXG4gICAgICAgIChcImQlcz17fVwiLCB1dGlsLnNhZmVQcm9wKG1hcEZpZWxkc1tpXS5uYW1lKSk7XHJcbiAgICAgICAgZ2VuXHJcbiAgICAoXCJ9XCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChub3JtYWxGaWVsZHMubGVuZ3RoKSB7IGdlblxyXG4gICAgKFwiaWYoby5kZWZhdWx0cyl7XCIpO1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBub3JtYWxGaWVsZHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkID0gbm9ybWFsRmllbGRzW2ldLFxyXG4gICAgICAgICAgICAgICAgcHJvcCAgPSB1dGlsLnNhZmVQcm9wKGZpZWxkLm5hbWUpO1xyXG4gICAgICAgICAgICBpZiAoZmllbGQucmVzb2x2ZWRUeXBlIGluc3RhbmNlb2YgRW51bSkgZ2VuXHJcbiAgICAgICAgKFwiZCVzPW8uZW51bXM9PT1TdHJpbmc/JWo6JWpcIiwgcHJvcCwgZmllbGQucmVzb2x2ZWRUeXBlLnZhbHVlc0J5SWRbZmllbGQudHlwZURlZmF1bHRdLCBmaWVsZC50eXBlRGVmYXVsdCk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGZpZWxkLmxvbmcpIGdlblxyXG4gICAgICAgIChcImlmKHV0aWwuTG9uZyl7XCIpXHJcbiAgICAgICAgICAgIChcInZhciBuPW5ldyB1dGlsLkxvbmcoJWQsJWQsJWopXCIsIGZpZWxkLnR5cGVEZWZhdWx0LmxvdywgZmllbGQudHlwZURlZmF1bHQuaGlnaCwgZmllbGQudHlwZURlZmF1bHQudW5zaWduZWQpXHJcbiAgICAgICAgICAgIChcImQlcz1vLmxvbmdzPT09U3RyaW5nP24udG9TdHJpbmcoKTpvLmxvbmdzPT09TnVtYmVyP24udG9OdW1iZXIoKTpuXCIsIHByb3ApXHJcbiAgICAgICAgKFwifWVsc2VcIilcclxuICAgICAgICAgICAgKFwiZCVzPW8ubG9uZ3M9PT1TdHJpbmc/JWo6JWRcIiwgcHJvcCwgZmllbGQudHlwZURlZmF1bHQudG9TdHJpbmcoKSwgZmllbGQudHlwZURlZmF1bHQudG9OdW1iZXIoKSk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGZpZWxkLmJ5dGVzKSBnZW5cclxuICAgICAgICAoXCJkJXM9by5ieXRlcz09PVN0cmluZz8lajolc1wiLCBwcm9wLCBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgZmllbGQudHlwZURlZmF1bHQpLCBcIltcIiArIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZpZWxkLnR5cGVEZWZhdWx0KS5qb2luKFwiLFwiKSArIFwiXVwiKTtcclxuICAgICAgICAgICAgZWxzZSBnZW5cclxuICAgICAgICAoXCJkJXM9JWpcIiwgcHJvcCwgZmllbGQudHlwZURlZmF1bHQpOyAvLyBhbHNvIG1lc3NhZ2VzICg9bnVsbClcclxuICAgICAgICB9IGdlblxyXG4gICAgKFwifVwiKTtcclxuICAgIH1cclxuICAgIHZhciBoYXNLczIgPSBmYWxzZTtcclxuICAgIGZvciAoaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICB2YXIgZmllbGQgPSBmaWVsZHNbaV0sXHJcbiAgICAgICAgICAgIGluZGV4ID0gbXR5cGUuX2ZpZWxkc0FycmF5LmluZGV4T2YoZmllbGQpLFxyXG4gICAgICAgICAgICBwcm9wICA9IHV0aWwuc2FmZVByb3AoZmllbGQubmFtZSk7XHJcbiAgICAgICAgaWYgKGZpZWxkLm1hcCkge1xyXG4gICAgICAgICAgICBpZiAoIWhhc0tzMikgeyBoYXNLczIgPSB0cnVlOyBnZW5cclxuICAgIChcInZhciBrczJcIik7XHJcbiAgICAgICAgICAgIH0gZ2VuXHJcbiAgICAoXCJpZihtJXMmJihrczI9T2JqZWN0LmtleXMobSVzKSkubGVuZ3RoKXtcIiwgcHJvcCwgcHJvcClcclxuICAgICAgICAoXCJkJXM9e31cIiwgcHJvcClcclxuICAgICAgICAoXCJmb3IodmFyIGo9MDtqPGtzMi5sZW5ndGg7KytqKXtcIik7XHJcbiAgICAgICAgICAgIGdlblZhbHVlUGFydGlhbF90b09iamVjdChnZW4sIGZpZWxkLCAvKiBzb3J0ZWQgKi8gaW5kZXgsIHByb3AgKyBcIltrczJbal1dXCIpXHJcbiAgICAgICAgKFwifVwiKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGZpZWxkLnJlcGVhdGVkKSB7IGdlblxyXG4gICAgKFwiaWYobSVzJiZtJXMubGVuZ3RoKXtcIiwgcHJvcCwgcHJvcClcclxuICAgICAgICAoXCJkJXM9W11cIiwgcHJvcClcclxuICAgICAgICAoXCJmb3IodmFyIGo9MDtqPG0lcy5sZW5ndGg7KytqKXtcIiwgcHJvcCk7XHJcbiAgICAgICAgICAgIGdlblZhbHVlUGFydGlhbF90b09iamVjdChnZW4sIGZpZWxkLCAvKiBzb3J0ZWQgKi8gaW5kZXgsIHByb3AgKyBcIltqXVwiKVxyXG4gICAgICAgIChcIn1cIik7XHJcbiAgICAgICAgfSBlbHNlIHsgZ2VuXHJcbiAgICAoXCJpZihtJXMhPW51bGwmJm0uaGFzT3duUHJvcGVydHkoJWopKXtcIiwgcHJvcCwgZmllbGQubmFtZSk7IC8vICE9PSB1bmRlZmluZWQgJiYgIT09IG51bGxcclxuICAgICAgICBnZW5WYWx1ZVBhcnRpYWxfdG9PYmplY3QoZ2VuLCBmaWVsZCwgLyogc29ydGVkICovIGluZGV4LCBwcm9wKTtcclxuICAgICAgICBpZiAoZmllbGQucGFydE9mKSBnZW5cclxuICAgICAgICAoXCJpZihvLm9uZW9mcylcIilcclxuICAgICAgICAgICAgKFwiZCVzPSVqXCIsIHV0aWwuc2FmZVByb3AoZmllbGQucGFydE9mLm5hbWUpLCBmaWVsZC5uYW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2VuXHJcbiAgICAoXCJ9XCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGdlblxyXG4gICAgKFwicmV0dXJuIGRcIik7XHJcbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lLCBibG9jay1zY29wZWQtdmFyLCBuby1yZWRlY2xhcmUgKi9cclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gZGVjb2RlcjtcclxuXHJcbnZhciBFbnVtICAgID0gcmVxdWlyZShcIi4vZW51bVwiKSxcclxuICAgIHR5cGVzICAgPSByZXF1aXJlKFwiLi90eXBlc1wiKSxcclxuICAgIHV0aWwgICAgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxuZnVuY3Rpb24gbWlzc2luZyhmaWVsZCkge1xyXG4gICAgcmV0dXJuIFwibWlzc2luZyByZXF1aXJlZCAnXCIgKyBmaWVsZC5uYW1lICsgXCInXCI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYSBkZWNvZGVyIHNwZWNpZmljIHRvIHRoZSBzcGVjaWZpZWQgbWVzc2FnZSB0eXBlLlxyXG4gKiBAcGFyYW0ge1R5cGV9IG10eXBlIE1lc3NhZ2UgdHlwZVxyXG4gKiBAcmV0dXJucyB7Q29kZWdlbn0gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKi9cclxuZnVuY3Rpb24gZGVjb2RlcihtdHlwZSkge1xyXG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUgKi9cclxuICAgIHZhciBnZW4gPSB1dGlsLmNvZGVnZW4oXCJyXCIsIFwibFwiKVxyXG4gICAgKFwiaWYoIShyIGluc3RhbmNlb2YgUmVhZGVyKSlcIilcclxuICAgICAgICAoXCJyPVJlYWRlci5jcmVhdGUocilcIilcclxuICAgIChcInZhciBjPWw9PT11bmRlZmluZWQ/ci5sZW46ci5wb3MrbCxtPW5ldyB0aGlzLmN0b3JcIiArIChtdHlwZS5maWVsZHNBcnJheS5maWx0ZXIoZnVuY3Rpb24oZmllbGQpIHsgcmV0dXJuIGZpZWxkLm1hcDsgfSkubGVuZ3RoID8gXCIsa1wiIDogXCJcIikpXHJcbiAgICAoXCJ3aGlsZShyLnBvczxjKXtcIilcclxuICAgICAgICAoXCJ2YXIgdD1yLnVpbnQzMigpXCIpO1xyXG4gICAgaWYgKG10eXBlLmdyb3VwKSBnZW5cclxuICAgICAgICAoXCJpZigodCY3KT09PTQpXCIpXHJcbiAgICAgICAgICAgIChcImJyZWFrXCIpO1xyXG4gICAgZ2VuXHJcbiAgICAgICAgKFwic3dpdGNoKHQ+Pj4zKXtcIik7XHJcblxyXG4gICAgdmFyIGkgPSAwO1xyXG4gICAgZm9yICg7IGkgPCAvKiBpbml0aWFsaXplcyAqLyBtdHlwZS5maWVsZHNBcnJheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHZhciBmaWVsZCA9IG10eXBlLl9maWVsZHNBcnJheVtpXS5yZXNvbHZlKCksXHJcbiAgICAgICAgICAgIHR5cGUgID0gZmllbGQucmVzb2x2ZWRUeXBlIGluc3RhbmNlb2YgRW51bSA/IFwidWludDMyXCIgOiBmaWVsZC50eXBlLFxyXG4gICAgICAgICAgICByZWYgICA9IFwibVwiICsgdXRpbC5zYWZlUHJvcChmaWVsZC5uYW1lKTsgZ2VuXHJcbiAgICAgICAgICAgIChcImNhc2UgJWQ6XCIsIGZpZWxkLmlkKTtcclxuXHJcbiAgICAgICAgLy8gTWFwIGZpZWxkc1xyXG4gICAgICAgIGlmIChmaWVsZC5tYXApIHsgZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJyLnNraXAoKS5wb3MrK1wiKSAvLyBhc3N1bWVzIGlkIDEgKyBrZXkgd2lyZVR5cGVcclxuICAgICAgICAgICAgICAgIChcImlmKCVzPT09dXRpbC5lbXB0eU9iamVjdClcIiwgcmVmKVxyXG4gICAgICAgICAgICAgICAgICAgIChcIiVzPXt9XCIsIHJlZilcclxuICAgICAgICAgICAgICAgIChcIms9ci4lcygpXCIsIGZpZWxkLmtleVR5cGUpXHJcbiAgICAgICAgICAgICAgICAoXCJyLnBvcysrXCIpOyAvLyBhc3N1bWVzIGlkIDIgKyB2YWx1ZSB3aXJlVHlwZVxyXG4gICAgICAgICAgICBpZiAodHlwZXMubG9uZ1tmaWVsZC5rZXlUeXBlXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZXMuYmFzaWNbdHlwZV0gPT09IHVuZGVmaW5lZCkgZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCIlc1t0eXBlb2Ygaz09PVxcXCJvYmplY3RcXFwiP3V0aWwubG9uZ1RvSGFzaChrKTprXT10eXBlc1slZF0uZGVjb2RlKHIsci51aW50MzIoKSlcIiwgcmVmLCBpKTsgLy8gY2FuJ3QgYmUgZ3JvdXBzXHJcbiAgICAgICAgICAgICAgICBlbHNlIGdlblxyXG4gICAgICAgICAgICAgICAgKFwiJXNbdHlwZW9mIGs9PT1cXFwib2JqZWN0XFxcIj91dGlsLmxvbmdUb0hhc2goayk6a109ci4lcygpXCIsIHJlZiwgdHlwZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZXMuYmFzaWNbdHlwZV0gPT09IHVuZGVmaW5lZCkgZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCIlc1trXT10eXBlc1slZF0uZGVjb2RlKHIsci51aW50MzIoKSlcIiwgcmVmLCBpKTsgLy8gY2FuJ3QgYmUgZ3JvdXBzXHJcbiAgICAgICAgICAgICAgICBlbHNlIGdlblxyXG4gICAgICAgICAgICAgICAgKFwiJXNba109ci4lcygpXCIsIHJlZiwgdHlwZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVwZWF0ZWQgZmllbGRzXHJcbiAgICAgICAgfSBlbHNlIGlmIChmaWVsZC5yZXBlYXRlZCkgeyBnZW5cclxuXHJcbiAgICAgICAgICAgICAgICAoXCJpZighKCVzJiYlcy5sZW5ndGgpKVwiLCByZWYsIHJlZilcclxuICAgICAgICAgICAgICAgICAgICAoXCIlcz1bXVwiLCByZWYpO1xyXG5cclxuICAgICAgICAgICAgLy8gUGFja2FibGUgKGFsd2F5cyBjaGVjayBmb3IgZm9yd2FyZCBhbmQgYmFja3dhcmQgY29tcGF0aWJsaXR5KVxyXG4gICAgICAgICAgICBpZiAodHlwZXMucGFja2VkW3R5cGVdICE9PSB1bmRlZmluZWQpIGdlblxyXG4gICAgICAgICAgICAgICAgKFwiaWYoKHQmNyk9PT0yKXtcIilcclxuICAgICAgICAgICAgICAgICAgICAoXCJ2YXIgYzI9ci51aW50MzIoKStyLnBvc1wiKVxyXG4gICAgICAgICAgICAgICAgICAgIChcIndoaWxlKHIucG9zPGMyKVwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoXCIlcy5wdXNoKHIuJXMoKSlcIiwgcmVmLCB0eXBlKVxyXG4gICAgICAgICAgICAgICAgKFwifWVsc2VcIik7XHJcblxyXG4gICAgICAgICAgICAvLyBOb24tcGFja2VkXHJcbiAgICAgICAgICAgIGlmICh0eXBlcy5iYXNpY1t0eXBlXSA9PT0gdW5kZWZpbmVkKSBnZW4oZmllbGQucmVzb2x2ZWRUeXBlLmdyb3VwXHJcbiAgICAgICAgICAgICAgICAgICAgPyBcIiVzLnB1c2godHlwZXNbJWRdLmRlY29kZShyKSlcIlxyXG4gICAgICAgICAgICAgICAgICAgIDogXCIlcy5wdXNoKHR5cGVzWyVkXS5kZWNvZGUocixyLnVpbnQzMigpKSlcIiwgcmVmLCBpKTtcclxuICAgICAgICAgICAgZWxzZSBnZW5cclxuICAgICAgICAgICAgICAgICAgICAoXCIlcy5wdXNoKHIuJXMoKSlcIiwgcmVmLCB0eXBlKTtcclxuXHJcbiAgICAgICAgLy8gTm9uLXJlcGVhdGVkXHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlcy5iYXNpY1t0eXBlXSA9PT0gdW5kZWZpbmVkKSBnZW4oZmllbGQucmVzb2x2ZWRUeXBlLmdyb3VwXHJcbiAgICAgICAgICAgICAgICA/IFwiJXM9dHlwZXNbJWRdLmRlY29kZShyKVwiXHJcbiAgICAgICAgICAgICAgICA6IFwiJXM9dHlwZXNbJWRdLmRlY29kZShyLHIudWludDMyKCkpXCIsIHJlZiwgaSk7XHJcbiAgICAgICAgZWxzZSBnZW5cclxuICAgICAgICAgICAgICAgIChcIiVzPXIuJXMoKVwiLCByZWYsIHR5cGUpO1xyXG4gICAgICAgIGdlblxyXG4gICAgICAgICAgICAgICAgKFwiYnJlYWtcIik7XHJcbiAgICAvLyBVbmtub3duIGZpZWxkc1xyXG4gICAgfSBnZW5cclxuICAgICAgICAgICAgKFwiZGVmYXVsdDpcIilcclxuICAgICAgICAgICAgICAgIChcInIuc2tpcFR5cGUodCY3KVwiKVxyXG4gICAgICAgICAgICAgICAgKFwiYnJlYWtcIilcclxuXHJcbiAgICAgICAgKFwifVwiKVxyXG4gICAgKFwifVwiKTtcclxuXHJcbiAgICAvLyBGaWVsZCBwcmVzZW5jZVxyXG4gICAgZm9yIChpID0gMDsgaSA8IG10eXBlLl9maWVsZHNBcnJheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHZhciByZmllbGQgPSBtdHlwZS5fZmllbGRzQXJyYXlbaV07XHJcbiAgICAgICAgaWYgKHJmaWVsZC5yZXF1aXJlZCkgZ2VuXHJcbiAgICAoXCJpZighbS5oYXNPd25Qcm9wZXJ0eSglaikpXCIsIHJmaWVsZC5uYW1lKVxyXG4gICAgICAgIChcInRocm93IHV0aWwuUHJvdG9jb2xFcnJvciglaix7aW5zdGFuY2U6bX0pXCIsIG1pc3NpbmcocmZpZWxkKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGdlblxyXG4gICAgKFwicmV0dXJuIG1cIik7XHJcbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lICovXHJcbn1cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gZW5jb2RlcjtcclxuXHJcbnZhciBFbnVtICAgICA9IHJlcXVpcmUoXCIuL2VudW1cIiksXHJcbiAgICB0eXBlcyAgICA9IHJlcXVpcmUoXCIuL3R5cGVzXCIpLFxyXG4gICAgdXRpbCAgICAgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIHBhcnRpYWwgbWVzc2FnZSB0eXBlIGVuY29kZXIuXHJcbiAqIEBwYXJhbSB7Q29kZWdlbn0gZ2VuIENvZGVnZW4gaW5zdGFuY2VcclxuICogQHBhcmFtIHtGaWVsZH0gZmllbGQgUmVmbGVjdGVkIGZpZWxkXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBmaWVsZEluZGV4IEZpZWxkIGluZGV4XHJcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWYgVmFyaWFibGUgcmVmZXJlbmNlXHJcbiAqIEByZXR1cm5zIHtDb2RlZ2VufSBDb2RlZ2VuIGluc3RhbmNlXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIGdlblR5cGVQYXJ0aWFsKGdlbiwgZmllbGQsIGZpZWxkSW5kZXgsIHJlZikge1xyXG4gICAgcmV0dXJuIGZpZWxkLnJlc29sdmVkVHlwZS5ncm91cFxyXG4gICAgICAgID8gZ2VuKFwidHlwZXNbJWRdLmVuY29kZSglcyx3LnVpbnQzMiglZCkpLnVpbnQzMiglZClcIiwgZmllbGRJbmRleCwgcmVmLCAoZmllbGQuaWQgPDwgMyB8IDMpID4+PiAwLCAoZmllbGQuaWQgPDwgMyB8IDQpID4+PiAwKVxyXG4gICAgICAgIDogZ2VuKFwidHlwZXNbJWRdLmVuY29kZSglcyx3LnVpbnQzMiglZCkuZm9yaygpKS5sZGVsaW0oKVwiLCBmaWVsZEluZGV4LCByZWYsIChmaWVsZC5pZCA8PCAzIHwgMikgPj4+IDApO1xyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGVzIGFuIGVuY29kZXIgc3BlY2lmaWMgdG8gdGhlIHNwZWNpZmllZCBtZXNzYWdlIHR5cGUuXHJcbiAqIEBwYXJhbSB7VHlwZX0gbXR5cGUgTWVzc2FnZSB0eXBlXHJcbiAqIEByZXR1cm5zIHtDb2RlZ2VufSBDb2RlZ2VuIGluc3RhbmNlXHJcbiAqL1xyXG5mdW5jdGlvbiBlbmNvZGVyKG10eXBlKSB7XHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSwgYmxvY2stc2NvcGVkLXZhciwgbm8tcmVkZWNsYXJlICovXHJcbiAgICB2YXIgZ2VuID0gdXRpbC5jb2RlZ2VuKFwibVwiLCBcIndcIilcclxuICAgIChcImlmKCF3KVwiKVxyXG4gICAgICAgIChcInc9V3JpdGVyLmNyZWF0ZSgpXCIpO1xyXG5cclxuICAgIHZhciBpLCByZWY7XHJcblxyXG4gICAgLy8gXCJ3aGVuIGEgbWVzc2FnZSBpcyBzZXJpYWxpemVkIGl0cyBrbm93biBmaWVsZHMgc2hvdWxkIGJlIHdyaXR0ZW4gc2VxdWVudGlhbGx5IGJ5IGZpZWxkIG51bWJlclwiXHJcbiAgICB2YXIgZmllbGRzID0gLyogaW5pdGlhbGl6ZXMgKi8gbXR5cGUuZmllbGRzQXJyYXkuc2xpY2UoKS5zb3J0KHV0aWwuY29tcGFyZUZpZWxkc0J5SWQpO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgdmFyIGZpZWxkICAgID0gZmllbGRzW2ldLnJlc29sdmUoKSxcclxuICAgICAgICAgICAgaW5kZXggICAgPSBtdHlwZS5fZmllbGRzQXJyYXkuaW5kZXhPZihmaWVsZCksXHJcbiAgICAgICAgICAgIHR5cGUgICAgID0gZmllbGQucmVzb2x2ZWRUeXBlIGluc3RhbmNlb2YgRW51bSA/IFwidWludDMyXCIgOiBmaWVsZC50eXBlLFxyXG4gICAgICAgICAgICB3aXJlVHlwZSA9IHR5cGVzLmJhc2ljW3R5cGVdO1xyXG4gICAgICAgICAgICByZWYgICAgICA9IFwibVwiICsgdXRpbC5zYWZlUHJvcChmaWVsZC5uYW1lKTtcclxuXHJcbiAgICAgICAgLy8gTWFwIGZpZWxkc1xyXG4gICAgICAgIGlmIChmaWVsZC5tYXApIHtcclxuICAgICAgICAgICAgZ2VuXHJcbiAgICAoXCJpZiglcyE9bnVsbCYmbS5oYXNPd25Qcm9wZXJ0eSglaikpe1wiLCByZWYsIGZpZWxkLm5hbWUpIC8vICE9PSB1bmRlZmluZWQgJiYgIT09IG51bGxcclxuICAgICAgICAoXCJmb3IodmFyIGtzPU9iamVjdC5rZXlzKCVzKSxpPTA7aTxrcy5sZW5ndGg7KytpKXtcIiwgcmVmKVxyXG4gICAgICAgICAgICAoXCJ3LnVpbnQzMiglZCkuZm9yaygpLnVpbnQzMiglZCkuJXMoa3NbaV0pXCIsIChmaWVsZC5pZCA8PCAzIHwgMikgPj4+IDAsIDggfCB0eXBlcy5tYXBLZXlbZmllbGQua2V5VHlwZV0sIGZpZWxkLmtleVR5cGUpO1xyXG4gICAgICAgICAgICBpZiAod2lyZVR5cGUgPT09IHVuZGVmaW5lZCkgZ2VuXHJcbiAgICAgICAgICAgIChcInR5cGVzWyVkXS5lbmNvZGUoJXNba3NbaV1dLHcudWludDMyKDE4KS5mb3JrKCkpLmxkZWxpbSgpLmxkZWxpbSgpXCIsIGluZGV4LCByZWYpOyAvLyBjYW4ndCBiZSBncm91cHNcclxuICAgICAgICAgICAgZWxzZSBnZW5cclxuICAgICAgICAgICAgKFwiLnVpbnQzMiglZCkuJXMoJXNba3NbaV1dKS5sZGVsaW0oKVwiLCAxNiB8IHdpcmVUeXBlLCB0eXBlLCByZWYpO1xyXG4gICAgICAgICAgICBnZW5cclxuICAgICAgICAoXCJ9XCIpXHJcbiAgICAoXCJ9XCIpO1xyXG5cclxuICAgICAgICAgICAgLy8gUmVwZWF0ZWQgZmllbGRzXHJcbiAgICAgICAgfSBlbHNlIGlmIChmaWVsZC5yZXBlYXRlZCkgeyBnZW5cclxuICAgIChcImlmKCVzIT1udWxsJiYlcy5sZW5ndGgpe1wiLCByZWYsIHJlZik7IC8vICE9PSB1bmRlZmluZWQgJiYgIT09IG51bGxcclxuXHJcbiAgICAgICAgICAgIC8vIFBhY2tlZCByZXBlYXRlZFxyXG4gICAgICAgICAgICBpZiAoZmllbGQucGFja2VkICYmIHR5cGVzLnBhY2tlZFt0eXBlXSAhPT0gdW5kZWZpbmVkKSB7IGdlblxyXG5cclxuICAgICAgICAoXCJ3LnVpbnQzMiglZCkuZm9yaygpXCIsIChmaWVsZC5pZCA8PCAzIHwgMikgPj4+IDApXHJcbiAgICAgICAgKFwiZm9yKHZhciBpPTA7aTwlcy5sZW5ndGg7KytpKVwiLCByZWYpXHJcbiAgICAgICAgICAgIChcIncuJXMoJXNbaV0pXCIsIHR5cGUsIHJlZilcclxuICAgICAgICAoXCJ3LmxkZWxpbSgpXCIpO1xyXG5cclxuICAgICAgICAgICAgLy8gTm9uLXBhY2tlZFxyXG4gICAgICAgICAgICB9IGVsc2UgeyBnZW5cclxuXHJcbiAgICAgICAgKFwiZm9yKHZhciBpPTA7aTwlcy5sZW5ndGg7KytpKVwiLCByZWYpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHdpcmVUeXBlID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGdlblR5cGVQYXJ0aWFsKGdlbiwgZmllbGQsIGluZGV4LCByZWYgKyBcIltpXVwiKTtcclxuICAgICAgICAgICAgICAgIGVsc2UgZ2VuXHJcbiAgICAgICAgICAgIChcIncudWludDMyKCVkKS4lcyglc1tpXSlcIiwgKGZpZWxkLmlkIDw8IDMgfCB3aXJlVHlwZSkgPj4+IDAsIHR5cGUsIHJlZik7XHJcblxyXG4gICAgICAgICAgICB9IGdlblxyXG4gICAgKFwifVwiKTtcclxuXHJcbiAgICAgICAgLy8gTm9uLXJlcGVhdGVkXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGZpZWxkLm9wdGlvbmFsKSBnZW5cclxuICAgIChcImlmKCVzIT1udWxsJiZtLmhhc093blByb3BlcnR5KCVqKSlcIiwgcmVmLCBmaWVsZC5uYW1lKTsgLy8gIT09IHVuZGVmaW5lZCAmJiAhPT0gbnVsbFxyXG5cclxuICAgICAgICAgICAgaWYgKHdpcmVUeXBlID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgZ2VuVHlwZVBhcnRpYWwoZ2VuLCBmaWVsZCwgaW5kZXgsIHJlZik7XHJcbiAgICAgICAgICAgIGVsc2UgZ2VuXHJcbiAgICAgICAgKFwidy51aW50MzIoJWQpLiVzKCVzKVwiLCAoZmllbGQuaWQgPDwgMyB8IHdpcmVUeXBlKSA+Pj4gMCwgdHlwZSwgcmVmKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBnZW5cclxuICAgIChcInJldHVybiB3XCIpO1xyXG4gICAgLyogZXNsaW50LWVuYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSwgYmxvY2stc2NvcGVkLXZhciwgbm8tcmVkZWNsYXJlICovXHJcbn0iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBFbnVtO1xyXG5cclxuLy8gZXh0ZW5kcyBSZWZsZWN0aW9uT2JqZWN0XHJcbnZhciBSZWZsZWN0aW9uT2JqZWN0ID0gcmVxdWlyZShcIi4vb2JqZWN0XCIpO1xyXG4oKEVudW0ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShSZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gRW51bSkuY2xhc3NOYW1lID0gXCJFbnVtXCI7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBlbnVtIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFJlZmxlY3RlZCBlbnVtLlxyXG4gKiBAZXh0ZW5kcyBSZWZsZWN0aW9uT2JqZWN0XHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBVbmlxdWUgbmFtZSB3aXRoaW4gaXRzIG5hbWVzcGFjZVxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLG51bWJlcj59IFt2YWx1ZXNdIEVudW0gdmFsdWVzIGFzIGFuIG9iamVjdCwgYnkgbmFtZVxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gRGVjbGFyZWQgb3B0aW9uc1xyXG4gKi9cclxuZnVuY3Rpb24gRW51bShuYW1lLCB2YWx1ZXMsIG9wdGlvbnMpIHtcclxuICAgIFJlZmxlY3Rpb25PYmplY3QuY2FsbCh0aGlzLCBuYW1lLCBvcHRpb25zKTtcclxuXHJcbiAgICBpZiAodmFsdWVzICYmIHR5cGVvZiB2YWx1ZXMgIT09IFwib2JqZWN0XCIpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwidmFsdWVzIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRW51bSB2YWx1ZXMgYnkgaWQuXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxudW1iZXIsc3RyaW5nPn1cclxuICAgICAqL1xyXG4gICAgdGhpcy52YWx1ZXNCeUlkID0ge307XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFbnVtIHZhbHVlcyBieSBuYW1lLlxyXG4gICAgICogQHR5cGUge09iamVjdC48c3RyaW5nLG51bWJlcj59XHJcbiAgICAgKi9cclxuICAgIHRoaXMudmFsdWVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnZhbHVlc0J5SWQpOyAvLyB0b0pTT04sIG1hcmtlclxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVmFsdWUgY29tbWVudCB0ZXh0cywgaWYgYW55LlxyXG4gICAgICogQHR5cGUge09iamVjdC48c3RyaW5nLHN0cmluZz59XHJcbiAgICAgKi9cclxuICAgIHRoaXMuY29tbWVudHMgPSB7fTtcclxuXHJcbiAgICAvLyBOb3RlIHRoYXQgdmFsdWVzIGluaGVyaXQgdmFsdWVzQnlJZCBvbiB0aGVpciBwcm90b3R5cGUgd2hpY2ggbWFrZXMgdGhlbSBhIFR5cGVTY3JpcHQtXHJcbiAgICAvLyBjb21wYXRpYmxlIGVudW0uIFRoaXMgaXMgdXNlZCBieSBwYnRzIHRvIHdyaXRlIGFjdHVhbCBlbnVtIGRlZmluaXRpb25zIHRoYXQgd29yayBmb3JcclxuICAgIC8vIHN0YXRpYyBhbmQgcmVmbGVjdGlvbiBjb2RlIGFsaWtlIGluc3RlYWQgb2YgZW1pdHRpbmcgZ2VuZXJpYyBvYmplY3QgZGVmaW5pdGlvbnMuXHJcblxyXG4gICAgaWYgKHZhbHVlcylcclxuICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICB0aGlzLnZhbHVlc0J5SWRbIHRoaXMudmFsdWVzW2tleXNbaV1dID0gdmFsdWVzW2tleXNbaV1dIF0gPSBrZXlzW2ldO1xyXG59XHJcblxyXG4vKipcclxuICogRW51bSBkZXNjcmlwdG9yLlxyXG4gKiBAdHlwZWRlZiBFbnVtRGVzY3JpcHRvclxyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLG51bWJlcj59IHZhbHVlcyBFbnVtIHZhbHVlc1xyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gRW51bSBvcHRpb25zXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYW4gZW51bSBmcm9tIGFuIGVudW0gZGVzY3JpcHRvci5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgRW51bSBuYW1lXHJcbiAqIEBwYXJhbSB7RW51bURlc2NyaXB0b3J9IGpzb24gRW51bSBkZXNjcmlwdG9yXHJcbiAqIEByZXR1cm5zIHtFbnVtfSBDcmVhdGVkIGVudW1cclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICovXHJcbkVudW0uZnJvbUpTT04gPSBmdW5jdGlvbiBmcm9tSlNPTihuYW1lLCBqc29uKSB7XHJcbiAgICByZXR1cm4gbmV3IEVudW0obmFtZSwganNvbi52YWx1ZXMsIGpzb24ub3B0aW9ucyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhpcyBlbnVtIHRvIGFuIGVudW0gZGVzY3JpcHRvci5cclxuICogQHJldHVybnMge0VudW1EZXNjcmlwdG9yfSBFbnVtIGRlc2NyaXB0b3JcclxuICovXHJcbkVudW0ucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgb3B0aW9ucyA6IHRoaXMub3B0aW9ucyxcclxuICAgICAgICB2YWx1ZXMgIDogdGhpcy52YWx1ZXNcclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIHZhbHVlIHRvIHRoaXMgZW51bS5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVmFsdWUgbmFtZVxyXG4gKiBAcGFyYW0ge251bWJlcn0gaWQgVmFsdWUgaWRcclxuICogQHBhcmFtIHs/c3RyaW5nfSBjb21tZW50IENvbW1lbnQsIGlmIGFueVxyXG4gKiBAcmV0dXJucyB7RW51bX0gYHRoaXNgXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYXJndW1lbnRzIGFyZSBpbnZhbGlkXHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGVyZSBpcyBhbHJlYWR5IGEgdmFsdWUgd2l0aCB0aGlzIG5hbWUgb3IgaWRcclxuICovXHJcbkVudW0ucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG5hbWUsIGlkLCBjb21tZW50KSB7XHJcbiAgICAvLyB1dGlsaXplZCBieSB0aGUgcGFyc2VyIGJ1dCBub3QgYnkgLmZyb21KU09OXHJcblxyXG4gICAgaWYgKCF1dGlsLmlzU3RyaW5nKG5hbWUpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcIm5hbWUgbXVzdCBiZSBhIHN0cmluZ1wiKTtcclxuXHJcbiAgICBpZiAoIXV0aWwuaXNJbnRlZ2VyKGlkKSlcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJpZCBtdXN0IGJlIGFuIGludGVnZXJcIik7XHJcblxyXG4gICAgaWYgKHRoaXMudmFsdWVzW25hbWVdICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJkdXBsaWNhdGUgbmFtZVwiKTtcclxuXHJcbiAgICBpZiAodGhpcy52YWx1ZXNCeUlkW2lkXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgaWYgKCEodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy5hbGxvd19hbGlhcykpXHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiZHVwbGljYXRlIGlkXCIpO1xyXG4gICAgICAgIHRoaXMudmFsdWVzW25hbWVdID0gaWQ7XHJcbiAgICB9IGVsc2VcclxuICAgICAgICB0aGlzLnZhbHVlc0J5SWRbdGhpcy52YWx1ZXNbbmFtZV0gPSBpZF0gPSBuYW1lO1xyXG5cclxuICAgIHRoaXMuY29tbWVudHNbbmFtZV0gPSBjb21tZW50IHx8IG51bGw7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmVzIGEgdmFsdWUgZnJvbSB0aGlzIGVudW1cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVmFsdWUgbmFtZVxyXG4gKiBAcmV0dXJucyB7RW51bX0gYHRoaXNgXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYXJndW1lbnRzIGFyZSBpbnZhbGlkXHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiBgbmFtZWAgaXMgbm90IGEgbmFtZSBvZiB0aGlzIGVudW1cclxuICovXHJcbkVudW0ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuXHJcbiAgICBpZiAoIXV0aWwuaXNTdHJpbmcobmFtZSkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwibmFtZSBtdXN0IGJlIGEgc3RyaW5nXCIpO1xyXG5cclxuICAgIHZhciB2YWwgPSB0aGlzLnZhbHVlc1tuYW1lXTtcclxuICAgIGlmICh2YWwgPT09IHVuZGVmaW5lZClcclxuICAgICAgICB0aHJvdyBFcnJvcihcIm5hbWUgZG9lcyBub3QgZXhpc3RcIik7XHJcblxyXG4gICAgZGVsZXRlIHRoaXMudmFsdWVzQnlJZFt2YWxdO1xyXG4gICAgZGVsZXRlIHRoaXMudmFsdWVzW25hbWVdO1xyXG4gICAgZGVsZXRlIHRoaXMuY29tbWVudHNbbmFtZV07XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEZpZWxkO1xyXG5cclxuLy8gZXh0ZW5kcyBSZWZsZWN0aW9uT2JqZWN0XHJcbnZhciBSZWZsZWN0aW9uT2JqZWN0ID0gcmVxdWlyZShcIi4vb2JqZWN0XCIpO1xyXG4oKEZpZWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IEZpZWxkKS5jbGFzc05hbWUgPSBcIkZpZWxkXCI7XHJcblxyXG52YXIgRW51bSAgPSByZXF1aXJlKFwiLi9lbnVtXCIpLFxyXG4gICAgdHlwZXMgPSByZXF1aXJlKFwiLi90eXBlc1wiKSxcclxuICAgIHV0aWwgID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcclxuXHJcbnZhciBUeXBlOyAvLyBjeWNsaWNcclxuXHJcbnZhciBydWxlUmUgPSAvXnJlcXVpcmVkfG9wdGlvbmFsfHJlcGVhdGVkJC87XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBtZXNzYWdlIGZpZWxkIGluc3RhbmNlLiBOb3RlIHRoYXQge0BsaW5rIE1hcEZpZWxkfG1hcCBmaWVsZHN9IGhhdmUgdGhlaXIgb3duIGNsYXNzLlxyXG4gKiBAY2xhc3NkZXNjIFJlZmxlY3RlZCBtZXNzYWdlIGZpZWxkLlxyXG4gKiBAZXh0ZW5kcyBSZWZsZWN0aW9uT2JqZWN0XHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBVbmlxdWUgbmFtZSB3aXRoaW4gaXRzIG5hbWVzcGFjZVxyXG4gKiBAcGFyYW0ge251bWJlcn0gaWQgVW5pcXVlIGlkIHdpdGhpbiBpdHMgbmFtZXNwYWNlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIFZhbHVlIHR5cGVcclxuICogQHBhcmFtIHtzdHJpbmd8T2JqZWN0LjxzdHJpbmcsKj59IFtydWxlPVwib3B0aW9uYWxcIl0gRmllbGQgcnVsZVxyXG4gKiBAcGFyYW0ge3N0cmluZ3xPYmplY3QuPHN0cmluZywqPn0gW2V4dGVuZF0gRXh0ZW5kZWQgdHlwZSBpZiBkaWZmZXJlbnQgZnJvbSBwYXJlbnRcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIERlY2xhcmVkIG9wdGlvbnNcclxuICovXHJcbmZ1bmN0aW9uIEZpZWxkKG5hbWUsIGlkLCB0eXBlLCBydWxlLCBleHRlbmQsIG9wdGlvbnMpIHtcclxuXHJcbiAgICBpZiAodXRpbC5pc09iamVjdChydWxlKSkge1xyXG4gICAgICAgIG9wdGlvbnMgPSBydWxlO1xyXG4gICAgICAgIHJ1bGUgPSBleHRlbmQgPSB1bmRlZmluZWQ7XHJcbiAgICB9IGVsc2UgaWYgKHV0aWwuaXNPYmplY3QoZXh0ZW5kKSkge1xyXG4gICAgICAgIG9wdGlvbnMgPSBleHRlbmQ7XHJcbiAgICAgICAgZXh0ZW5kID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIFJlZmxlY3Rpb25PYmplY3QuY2FsbCh0aGlzLCBuYW1lLCBvcHRpb25zKTtcclxuXHJcbiAgICBpZiAoIXV0aWwuaXNJbnRlZ2VyKGlkKSB8fCBpZCA8IDApXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiaWQgbXVzdCBiZSBhIG5vbi1uZWdhdGl2ZSBpbnRlZ2VyXCIpO1xyXG5cclxuICAgIGlmICghdXRpbC5pc1N0cmluZyh0eXBlKSlcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJ0eXBlIG11c3QgYmUgYSBzdHJpbmdcIik7XHJcblxyXG4gICAgaWYgKHJ1bGUgIT09IHVuZGVmaW5lZCAmJiAhcnVsZVJlLnRlc3QocnVsZSA9IHJ1bGUudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpKSlcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJydWxlIG11c3QgYmUgYSBzdHJpbmcgcnVsZVwiKTtcclxuXHJcbiAgICBpZiAoZXh0ZW5kICE9PSB1bmRlZmluZWQgJiYgIXV0aWwuaXNTdHJpbmcoZXh0ZW5kKSlcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJleHRlbmQgbXVzdCBiZSBhIHN0cmluZ1wiKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpZWxkIHJ1bGUsIGlmIGFueS5cclxuICAgICAqIEB0eXBlIHtzdHJpbmd8dW5kZWZpbmVkfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJ1bGUgPSBydWxlICYmIHJ1bGUgIT09IFwib3B0aW9uYWxcIiA/IHJ1bGUgOiB1bmRlZmluZWQ7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmllbGQgdHlwZS5cclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIHRoaXMudHlwZSA9IHR5cGU7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVW5pcXVlIGZpZWxkIGlkLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5pZCA9IGlkOyAvLyB0b0pTT04sIG1hcmtlclxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRXh0ZW5kZWQgdHlwZSBpZiBkaWZmZXJlbnQgZnJvbSBwYXJlbnQuXHJcbiAgICAgKiBAdHlwZSB7c3RyaW5nfHVuZGVmaW5lZH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5leHRlbmQgPSBleHRlbmQgfHwgdW5kZWZpbmVkOyAvLyB0b0pTT05cclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgdGhpcyBmaWVsZCBpcyByZXF1aXJlZC5cclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJlcXVpcmVkID0gcnVsZSA9PT0gXCJyZXF1aXJlZFwiO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogV2hldGhlciB0aGlzIGZpZWxkIGlzIG9wdGlvbmFsLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMub3B0aW9uYWwgPSAhdGhpcy5yZXF1aXJlZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgdGhpcyBmaWVsZCBpcyByZXBlYXRlZC5cclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJlcGVhdGVkID0gcnVsZSA9PT0gXCJyZXBlYXRlZFwiO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogV2hldGhlciB0aGlzIGZpZWxkIGlzIGEgbWFwIG9yIG5vdC5cclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICovXHJcbiAgICB0aGlzLm1hcCA9IGZhbHNlO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTWVzc2FnZSB0aGlzIGZpZWxkIGJlbG9uZ3MgdG8uXHJcbiAgICAgKiBAdHlwZSB7P1R5cGV9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubWVzc2FnZSA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBPbmVPZiB0aGlzIGZpZWxkIGJlbG9uZ3MgdG8sIGlmIGFueSxcclxuICAgICAqIEB0eXBlIHs/T25lT2Z9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucGFydE9mID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBmaWVsZCB0eXBlJ3MgZGVmYXVsdCB2YWx1ZS5cclxuICAgICAqIEB0eXBlIHsqfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnR5cGVEZWZhdWx0ID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBmaWVsZCdzIGRlZmF1bHQgdmFsdWUgb24gcHJvdG90eXBlcy5cclxuICAgICAqIEB0eXBlIHsqfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXaGV0aGVyIHRoaXMgZmllbGQncyB2YWx1ZSBzaG91bGQgYmUgdHJlYXRlZCBhcyBhIGxvbmcuXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5sb25nID0gdXRpbC5Mb25nID8gdHlwZXMubG9uZ1t0eXBlXSAhPT0gdW5kZWZpbmVkIDogLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gZmFsc2U7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXaGV0aGVyIHRoaXMgZmllbGQncyB2YWx1ZSBpcyBhIGJ1ZmZlci5cclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICovXHJcbiAgICB0aGlzLmJ5dGVzID0gdHlwZSA9PT0gXCJieXRlc1wiO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVzb2x2ZWQgdHlwZSBpZiBub3QgYSBiYXNpYyB0eXBlLlxyXG4gICAgICogQHR5cGUgez8oVHlwZXxFbnVtKX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXNvbHZlZFR5cGUgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2lzdGVyLWZpZWxkIHdpdGhpbiB0aGUgZXh0ZW5kZWQgdHlwZSBpZiBhIGRlY2xhcmluZyBleHRlbnNpb24gZmllbGQuXHJcbiAgICAgKiBAdHlwZSB7P0ZpZWxkfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmV4dGVuc2lvbkZpZWxkID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNpc3Rlci1maWVsZCB3aXRoaW4gdGhlIGRlY2xhcmluZyBuYW1lc3BhY2UgaWYgYW4gZXh0ZW5kZWQgZmllbGQuXHJcbiAgICAgKiBAdHlwZSB7P0ZpZWxkfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmRlY2xhcmluZ0ZpZWxkID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEludGVybmFsbHkgcmVtZW1iZXJzIHdoZXRoZXIgdGhpcyBmaWVsZCBpcyBwYWNrZWQuXHJcbiAgICAgKiBAdHlwZSB7P2Jvb2xlYW59XHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICB0aGlzLl9wYWNrZWQgPSBudWxsO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoaXMgZmllbGQgaXMgcGFja2VkLiBPbmx5IHJlbGV2YW50IHdoZW4gcmVwZWF0ZWQgYW5kIHdvcmtpbmcgd2l0aCBwcm90bzIuXHJcbiAqIEBuYW1lIEZpZWxkI3BhY2tlZFxyXG4gKiBAdHlwZSB7Ym9vbGVhbn1cclxuICogQHJlYWRvbmx5XHJcbiAqL1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmllbGQucHJvdG90eXBlLCBcInBhY2tlZFwiLCB7XHJcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGRlZmF1bHRzIHRvIHBhY2tlZD10cnVlIGlmIG5vdCBleHBsaWNpdHkgc2V0IHRvIGZhbHNlXHJcbiAgICAgICAgaWYgKHRoaXMuX3BhY2tlZCA9PT0gbnVsbClcclxuICAgICAgICAgICAgdGhpcy5fcGFja2VkID0gdGhpcy5nZXRPcHRpb24oXCJwYWNrZWRcIikgIT09IGZhbHNlO1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9wYWNrZWQ7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuRmllbGQucHJvdG90eXBlLnNldE9wdGlvbiA9IGZ1bmN0aW9uIHNldE9wdGlvbihuYW1lLCB2YWx1ZSwgaWZOb3RTZXQpIHtcclxuICAgIGlmIChuYW1lID09PSBcInBhY2tlZFwiKSAvLyBjbGVhciBjYWNoZWQgYmVmb3JlIHNldHRpbmdcclxuICAgICAgICB0aGlzLl9wYWNrZWQgPSBudWxsO1xyXG4gICAgcmV0dXJuIFJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlLnNldE9wdGlvbi5jYWxsKHRoaXMsIG5hbWUsIHZhbHVlLCBpZk5vdFNldCk7XHJcbn07XHJcblxyXG4vKipcclxuICogRmllbGQgZGVzY3JpcHRvci5cclxuICogQHR5cGVkZWYgRmllbGREZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbcnVsZT1cIm9wdGlvbmFsXCJdIEZpZWxkIHJ1bGVcclxuICogQHByb3BlcnR5IHtzdHJpbmd9IHR5cGUgRmllbGQgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gaWQgRmllbGQgaWRcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIEZpZWxkIG9wdGlvbnNcclxuICovXHJcblxyXG4vKipcclxuICogRXh0ZW5zaW9uIGZpZWxkIGRlc2NyaXB0b3IuXHJcbiAqIEB0eXBlZGVmIEV4dGVuc2lvbkZpZWxkRGVzY3JpcHRvclxyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW3J1bGU9XCJvcHRpb25hbFwiXSBGaWVsZCBydWxlXHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0eXBlIEZpZWxkIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGlkIEZpZWxkIGlkXHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBleHRlbmQgRXh0ZW5kZWQgdHlwZVxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gRmllbGQgb3B0aW9uc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgZmllbGQgZnJvbSBhIGZpZWxkIGRlc2NyaXB0b3IuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIEZpZWxkIG5hbWVcclxuICogQHBhcmFtIHtGaWVsZERlc2NyaXB0b3J9IGpzb24gRmllbGQgZGVzY3JpcHRvclxyXG4gKiBAcmV0dXJucyB7RmllbGR9IENyZWF0ZWQgZmllbGRcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICovXHJcbkZpZWxkLmZyb21KU09OID0gZnVuY3Rpb24gZnJvbUpTT04obmFtZSwganNvbikge1xyXG4gICAgcmV0dXJuIG5ldyBGaWVsZChuYW1lLCBqc29uLmlkLCBqc29uLnR5cGUsIGpzb24ucnVsZSwganNvbi5leHRlbmQsIGpzb24ub3B0aW9ucyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhpcyBmaWVsZCB0byBhIGZpZWxkIGRlc2NyaXB0b3IuXHJcbiAqIEByZXR1cm5zIHtGaWVsZERlc2NyaXB0b3J9IEZpZWxkIGRlc2NyaXB0b3JcclxuICovXHJcbkZpZWxkLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHJ1bGUgICAgOiB0aGlzLnJ1bGUgIT09IFwib3B0aW9uYWxcIiAmJiB0aGlzLnJ1bGUgfHwgdW5kZWZpbmVkLFxyXG4gICAgICAgIHR5cGUgICAgOiB0aGlzLnR5cGUsXHJcbiAgICAgICAgaWQgICAgICA6IHRoaXMuaWQsXHJcbiAgICAgICAgZXh0ZW5kICA6IHRoaXMuZXh0ZW5kLFxyXG4gICAgICAgIG9wdGlvbnMgOiB0aGlzLm9wdGlvbnNcclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogUmVzb2x2ZXMgdGhpcyBmaWVsZCdzIHR5cGUgcmVmZXJlbmNlcy5cclxuICogQHJldHVybnMge0ZpZWxkfSBgdGhpc2BcclxuICogQHRocm93cyB7RXJyb3J9IElmIGFueSByZWZlcmVuY2UgY2Fubm90IGJlIHJlc29sdmVkXHJcbiAqL1xyXG5GaWVsZC5wcm90b3R5cGUucmVzb2x2ZSA9IGZ1bmN0aW9uIHJlc29sdmUoKSB7XHJcblxyXG4gICAgaWYgKHRoaXMucmVzb2x2ZWQpXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgaWYgKCh0aGlzLnR5cGVEZWZhdWx0ID0gdHlwZXMuZGVmYXVsdHNbdGhpcy50eXBlXSkgPT09IHVuZGVmaW5lZCkgeyAvLyBpZiBub3QgYSBiYXNpYyB0eXBlLCByZXNvbHZlIGl0XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghVHlwZSlcclxuICAgICAgICAgICAgVHlwZSA9IHJlcXVpcmUoXCIuL3R5cGVcIik7XHJcblxyXG4gICAgICAgIHRoaXMucmVzb2x2ZWRUeXBlID0gKHRoaXMuZGVjbGFyaW5nRmllbGQgPyB0aGlzLmRlY2xhcmluZ0ZpZWxkLnBhcmVudCA6IHRoaXMucGFyZW50KS5sb29rdXBUeXBlT3JFbnVtKHRoaXMudHlwZSk7XHJcbiAgICAgICAgaWYgKHRoaXMucmVzb2x2ZWRUeXBlIGluc3RhbmNlb2YgVHlwZSlcclxuICAgICAgICAgICAgdGhpcy50eXBlRGVmYXVsdCA9IG51bGw7XHJcbiAgICAgICAgZWxzZSAvLyBpbnN0YW5jZW9mIEVudW1cclxuICAgICAgICAgICAgdGhpcy50eXBlRGVmYXVsdCA9IHRoaXMucmVzb2x2ZWRUeXBlLnZhbHVlc1tPYmplY3Qua2V5cyh0aGlzLnJlc29sdmVkVHlwZS52YWx1ZXMpWzBdXTsgLy8gZmlyc3QgZGVmaW5lZFxyXG4gICAgfVxyXG5cclxuICAgIC8vIHVzZSBleHBsaWNpdGx5IHNldCBkZWZhdWx0IHZhbHVlIGlmIHByZXNlbnRcclxuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zW1wiZGVmYXVsdFwiXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhpcy50eXBlRGVmYXVsdCA9IHRoaXMub3B0aW9uc1tcImRlZmF1bHRcIl07XHJcbiAgICAgICAgaWYgKHRoaXMucmVzb2x2ZWRUeXBlIGluc3RhbmNlb2YgRW51bSAmJiB0eXBlb2YgdGhpcy50eXBlRGVmYXVsdCA9PT0gXCJzdHJpbmdcIilcclxuICAgICAgICAgICAgdGhpcy50eXBlRGVmYXVsdCA9IHRoaXMucmVzb2x2ZWRUeXBlLnZhbHVlc1t0aGlzLnR5cGVEZWZhdWx0XTtcclxuICAgIH1cclxuXHJcbiAgICAvLyByZW1vdmUgdW5uZWNlc3NhcnkgcGFja2VkIG9wdGlvbiAocGFyc2VyIGFkZHMgdGhpcykgaWYgbm90IHJlZmVyZW5jaW5nIGFuIGVudW1cclxuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnBhY2tlZCAhPT0gdW5kZWZpbmVkICYmIHRoaXMucmVzb2x2ZWRUeXBlICYmICEodGhpcy5yZXNvbHZlZFR5cGUgaW5zdGFuY2VvZiBFbnVtKSlcclxuICAgICAgICBkZWxldGUgdGhpcy5vcHRpb25zLnBhY2tlZDtcclxuXHJcbiAgICAvLyBjb252ZXJ0IHRvIGludGVybmFsIGRhdGEgdHlwZSBpZiBuZWNlc3NzYXJ5XHJcbiAgICBpZiAodGhpcy5sb25nKSB7XHJcbiAgICAgICAgdGhpcy50eXBlRGVmYXVsdCA9IHV0aWwuTG9uZy5mcm9tTnVtYmVyKHRoaXMudHlwZURlZmF1bHQsIHRoaXMudHlwZS5jaGFyQXQoMCkgPT09IFwidVwiKTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICBpZiAoT2JqZWN0LmZyZWV6ZSlcclxuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZSh0aGlzLnR5cGVEZWZhdWx0KTsgLy8gbG9uZyBpbnN0YW5jZXMgYXJlIG1lYW50IHRvIGJlIGltbXV0YWJsZSBhbnl3YXkgKGkuZS4gdXNlIHNtYWxsIGludCBjYWNoZSB0aGF0IGV2ZW4gcmVxdWlyZXMgaXQpXHJcblxyXG4gICAgfSBlbHNlIGlmICh0aGlzLmJ5dGVzICYmIHR5cGVvZiB0aGlzLnR5cGVEZWZhdWx0ID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgdmFyIGJ1ZjtcclxuICAgICAgICBpZiAodXRpbC5iYXNlNjQudGVzdCh0aGlzLnR5cGVEZWZhdWx0KSlcclxuICAgICAgICAgICAgdXRpbC5iYXNlNjQuZGVjb2RlKHRoaXMudHlwZURlZmF1bHQsIGJ1ZiA9IHV0aWwubmV3QnVmZmVyKHV0aWwuYmFzZTY0Lmxlbmd0aCh0aGlzLnR5cGVEZWZhdWx0KSksIDApO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgdXRpbC51dGY4LndyaXRlKHRoaXMudHlwZURlZmF1bHQsIGJ1ZiA9IHV0aWwubmV3QnVmZmVyKHV0aWwudXRmOC5sZW5ndGgodGhpcy50eXBlRGVmYXVsdCkpLCAwKTtcclxuICAgICAgICB0aGlzLnR5cGVEZWZhdWx0ID0gYnVmO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHRha2Ugc3BlY2lhbCBjYXJlIG9mIG1hcHMgYW5kIHJlcGVhdGVkIGZpZWxkc1xyXG4gICAgaWYgKHRoaXMubWFwKVxyXG4gICAgICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gdXRpbC5lbXB0eU9iamVjdDtcclxuICAgIGVsc2UgaWYgKHRoaXMucmVwZWF0ZWQpXHJcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWUgPSB1dGlsLmVtcHR5QXJyYXk7XHJcbiAgICBlbHNlXHJcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWUgPSB0aGlzLnR5cGVEZWZhdWx0O1xyXG5cclxuICAgIHJldHVybiBSZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZS5yZXNvbHZlLmNhbGwodGhpcyk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgcHJvdG9idWYgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2luZGV4LW1pbmltYWxcIik7XHJcblxyXG5wcm90b2J1Zi5idWlsZCA9IFwibGlnaHRcIjtcclxuXHJcbi8qKlxyXG4gKiBBIG5vZGUtc3R5bGUgY2FsbGJhY2sgYXMgdXNlZCBieSB7QGxpbmsgbG9hZH0gYW5kIHtAbGluayBSb290I2xvYWR9LlxyXG4gKiBAdHlwZWRlZiBMb2FkQ2FsbGJhY2tcclxuICogQHR5cGUge2Z1bmN0aW9ufVxyXG4gKiBAcGFyYW0gez9FcnJvcn0gZXJyb3IgRXJyb3IsIGlmIGFueSwgb3RoZXJ3aXNlIGBudWxsYFxyXG4gKiBAcGFyYW0ge1Jvb3R9IFtyb290XSBSb290LCBpZiB0aGVyZSBoYXNuJ3QgYmVlbiBhbiBlcnJvclxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBMb2FkcyBvbmUgb3IgbXVsdGlwbGUgLnByb3RvIG9yIHByZXByb2Nlc3NlZCAuanNvbiBmaWxlcyBpbnRvIGEgY29tbW9uIHJvb3QgbmFtZXNwYWNlIGFuZCBjYWxscyB0aGUgY2FsbGJhY2suXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBmaWxlbmFtZSBPbmUgb3IgbXVsdGlwbGUgZmlsZXMgdG8gbG9hZFxyXG4gKiBAcGFyYW0ge1Jvb3R9IHJvb3QgUm9vdCBuYW1lc3BhY2UsIGRlZmF1bHRzIHRvIGNyZWF0ZSBhIG5ldyBvbmUgaWYgb21pdHRlZC5cclxuICogQHBhcmFtIHtMb2FkQ2FsbGJhY2t9IGNhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEBzZWUge0BsaW5rIFJvb3QjbG9hZH1cclxuICovXHJcbmZ1bmN0aW9uIGxvYWQoZmlsZW5hbWUsIHJvb3QsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAodHlwZW9mIHJvb3QgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIGNhbGxiYWNrID0gcm9vdDtcclxuICAgICAgICByb290ID0gbmV3IHByb3RvYnVmLlJvb3QoKTtcclxuICAgIH0gZWxzZSBpZiAoIXJvb3QpXHJcbiAgICAgICAgcm9vdCA9IG5ldyBwcm90b2J1Zi5Sb290KCk7XHJcbiAgICByZXR1cm4gcm9vdC5sb2FkKGZpbGVuYW1lLCBjYWxsYmFjayk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMb2FkcyBvbmUgb3IgbXVsdGlwbGUgLnByb3RvIG9yIHByZXByb2Nlc3NlZCAuanNvbiBmaWxlcyBpbnRvIGEgY29tbW9uIHJvb3QgbmFtZXNwYWNlIGFuZCBjYWxscyB0aGUgY2FsbGJhY2suXHJcbiAqIEBuYW1lIGxvYWRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBmaWxlbmFtZSBPbmUgb3IgbXVsdGlwbGUgZmlsZXMgdG8gbG9hZFxyXG4gKiBAcGFyYW0ge0xvYWRDYWxsYmFja30gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb25cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQHNlZSB7QGxpbmsgUm9vdCNsb2FkfVxyXG4gKiBAdmFyaWF0aW9uIDJcclxuICovXHJcbi8vIGZ1bmN0aW9uIGxvYWQoZmlsZW5hbWU6c3RyaW5nLCBjYWxsYmFjazpMb2FkQ2FsbGJhY2spOnVuZGVmaW5lZFxyXG5cclxuLyoqXHJcbiAqIExvYWRzIG9uZSBvciBtdWx0aXBsZSAucHJvdG8gb3IgcHJlcHJvY2Vzc2VkIC5qc29uIGZpbGVzIGludG8gYSBjb21tb24gcm9vdCBuYW1lc3BhY2UgYW5kIHJldHVybnMgYSBwcm9taXNlLlxyXG4gKiBAbmFtZSBsb2FkXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gZmlsZW5hbWUgT25lIG9yIG11bHRpcGxlIGZpbGVzIHRvIGxvYWRcclxuICogQHBhcmFtIHtSb290fSBbcm9vdF0gUm9vdCBuYW1lc3BhY2UsIGRlZmF1bHRzIHRvIGNyZWF0ZSBhIG5ldyBvbmUgaWYgb21pdHRlZC5cclxuICogQHJldHVybnMge1Byb21pc2U8Um9vdD59IFByb21pc2VcclxuICogQHNlZSB7QGxpbmsgUm9vdCNsb2FkfVxyXG4gKiBAdmFyaWF0aW9uIDNcclxuICovXHJcbi8vIGZ1bmN0aW9uIGxvYWQoZmlsZW5hbWU6c3RyaW5nLCBbcm9vdDpSb290XSk6UHJvbWlzZTxSb290PlxyXG5cclxucHJvdG9idWYubG9hZCA9IGxvYWQ7XHJcblxyXG4vKipcclxuICogU3luY2hyb25vdXNseSBsb2FkcyBvbmUgb3IgbXVsdGlwbGUgLnByb3RvIG9yIHByZXByb2Nlc3NlZCAuanNvbiBmaWxlcyBpbnRvIGEgY29tbW9uIHJvb3QgbmFtZXNwYWNlIChub2RlIG9ubHkpLlxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gZmlsZW5hbWUgT25lIG9yIG11bHRpcGxlIGZpbGVzIHRvIGxvYWRcclxuICogQHBhcmFtIHtSb290fSBbcm9vdF0gUm9vdCBuYW1lc3BhY2UsIGRlZmF1bHRzIHRvIGNyZWF0ZSBhIG5ldyBvbmUgaWYgb21pdHRlZC5cclxuICogQHJldHVybnMge1Jvb3R9IFJvb3QgbmFtZXNwYWNlXHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiBzeW5jaHJvbm91cyBmZXRjaGluZyBpcyBub3Qgc3VwcG9ydGVkIChpLmUuIGluIGJyb3dzZXJzKSBvciBpZiBhIGZpbGUncyBzeW50YXggaXMgaW52YWxpZFxyXG4gKiBAc2VlIHtAbGluayBSb290I2xvYWRTeW5jfVxyXG4gKi9cclxuZnVuY3Rpb24gbG9hZFN5bmMoZmlsZW5hbWUsIHJvb3QpIHtcclxuICAgIGlmICghcm9vdClcclxuICAgICAgICByb290ID0gbmV3IHByb3RvYnVmLlJvb3QoKTtcclxuICAgIHJldHVybiByb290LmxvYWRTeW5jKGZpbGVuYW1lKTtcclxufVxyXG5cclxucHJvdG9idWYubG9hZFN5bmMgPSBsb2FkU3luYztcclxuXHJcbi8vIFNlcmlhbGl6YXRpb25cclxucHJvdG9idWYuZW5jb2RlciAgICAgICAgICA9IHJlcXVpcmUoXCIuL2VuY29kZXJcIik7XHJcbnByb3RvYnVmLmRlY29kZXIgICAgICAgICAgPSByZXF1aXJlKFwiLi9kZWNvZGVyXCIpO1xyXG5wcm90b2J1Zi52ZXJpZmllciAgICAgICAgID0gcmVxdWlyZShcIi4vdmVyaWZpZXJcIik7XHJcbnByb3RvYnVmLmNvbnZlcnRlciAgICAgICAgPSByZXF1aXJlKFwiLi9jb252ZXJ0ZXJcIik7XHJcblxyXG4vLyBSZWZsZWN0aW9uXHJcbnByb3RvYnVmLlJlZmxlY3Rpb25PYmplY3QgPSByZXF1aXJlKFwiLi9vYmplY3RcIik7XHJcbnByb3RvYnVmLk5hbWVzcGFjZSAgICAgICAgPSByZXF1aXJlKFwiLi9uYW1lc3BhY2VcIik7XHJcbnByb3RvYnVmLlJvb3QgICAgICAgICAgICAgPSByZXF1aXJlKFwiLi9yb290XCIpO1xyXG5wcm90b2J1Zi5FbnVtICAgICAgICAgICAgID0gcmVxdWlyZShcIi4vZW51bVwiKTtcclxucHJvdG9idWYuVHlwZSAgICAgICAgICAgICA9IHJlcXVpcmUoXCIuL3R5cGVcIik7XHJcbnByb3RvYnVmLkZpZWxkICAgICAgICAgICAgPSByZXF1aXJlKFwiLi9maWVsZFwiKTtcclxucHJvdG9idWYuT25lT2YgICAgICAgICAgICA9IHJlcXVpcmUoXCIuL29uZW9mXCIpO1xyXG5wcm90b2J1Zi5NYXBGaWVsZCAgICAgICAgID0gcmVxdWlyZShcIi4vbWFwZmllbGRcIik7XHJcbnByb3RvYnVmLlNlcnZpY2UgICAgICAgICAgPSByZXF1aXJlKFwiLi9zZXJ2aWNlXCIpO1xyXG5wcm90b2J1Zi5NZXRob2QgICAgICAgICAgID0gcmVxdWlyZShcIi4vbWV0aG9kXCIpO1xyXG5cclxuLy8gUnVudGltZVxyXG5wcm90b2J1Zi5DbGFzcyAgICAgICAgICAgID0gcmVxdWlyZShcIi4vY2xhc3NcIik7XHJcbnByb3RvYnVmLk1lc3NhZ2UgICAgICAgICAgPSByZXF1aXJlKFwiLi9tZXNzYWdlXCIpO1xyXG5cclxuLy8gVXRpbGl0eVxyXG5wcm90b2J1Zi50eXBlcyAgICAgICAgICAgID0gcmVxdWlyZShcIi4vdHlwZXNcIik7XHJcbnByb3RvYnVmLnV0aWwgICAgICAgICAgICAgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxuLy8gQ29uZmlndXJlIHJlZmxlY3Rpb25cclxucHJvdG9idWYuUmVmbGVjdGlvbk9iamVjdC5fY29uZmlndXJlKHByb3RvYnVmLlJvb3QpO1xyXG5wcm90b2J1Zi5OYW1lc3BhY2UuX2NvbmZpZ3VyZShwcm90b2J1Zi5UeXBlLCBwcm90b2J1Zi5TZXJ2aWNlKTtcclxucHJvdG9idWYuUm9vdC5fY29uZmlndXJlKHByb3RvYnVmLlR5cGUpO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIHByb3RvYnVmID0gZXhwb3J0cztcclxuXHJcbi8qKlxyXG4gKiBCdWlsZCB0eXBlLCBvbmUgb2YgYFwiZnVsbFwiYCwgYFwibGlnaHRcImAgb3IgYFwibWluaW1hbFwiYC5cclxuICogQG5hbWUgYnVpbGRcclxuICogQHR5cGUge3N0cmluZ31cclxuICogQGNvbnN0XHJcbiAqL1xyXG5wcm90b2J1Zi5idWlsZCA9IFwibWluaW1hbFwiO1xyXG5cclxuLyoqXHJcbiAqIE5hbWVkIHJvb3RzLlxyXG4gKiBUaGlzIGlzIHdoZXJlIHBianMgc3RvcmVzIGdlbmVyYXRlZCBzdHJ1Y3R1cmVzICh0aGUgb3B0aW9uIGAtciwgLS1yb290YCBzcGVjaWZpZXMgYSBuYW1lKS5cclxuICogQ2FuIGFsc28gYmUgdXNlZCBtYW51YWxseSB0byBtYWtlIHJvb3RzIGF2YWlsYWJsZSBhY2Nyb3NzIG1vZHVsZXMuXHJcbiAqIEBuYW1lIHJvb3RzXHJcbiAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxSb290Pn1cclxuICogQGV4YW1wbGVcclxuICogLy8gcGJqcyAtciBteXJvb3QgLW8gY29tcGlsZWQuanMgLi4uXHJcbiAqXHJcbiAqIC8vIGluIGFub3RoZXIgbW9kdWxlOlxyXG4gKiByZXF1aXJlKFwiLi9jb21waWxlZC5qc1wiKTtcclxuICpcclxuICogLy8gaW4gYW55IHN1YnNlcXVlbnQgbW9kdWxlOlxyXG4gKiB2YXIgcm9vdCA9IHByb3RvYnVmLnJvb3RzW1wibXlyb290XCJdO1xyXG4gKi9cclxucHJvdG9idWYucm9vdHMgPSB7fTtcclxuXHJcbi8vIFNlcmlhbGl6YXRpb25cclxucHJvdG9idWYuV3JpdGVyICAgICAgID0gcmVxdWlyZShcIi4vd3JpdGVyXCIpO1xyXG5wcm90b2J1Zi5CdWZmZXJXcml0ZXIgPSByZXF1aXJlKFwiLi93cml0ZXJfYnVmZmVyXCIpO1xyXG5wcm90b2J1Zi5SZWFkZXIgICAgICAgPSByZXF1aXJlKFwiLi9yZWFkZXJcIik7XHJcbnByb3RvYnVmLkJ1ZmZlclJlYWRlciA9IHJlcXVpcmUoXCIuL3JlYWRlcl9idWZmZXJcIik7XHJcblxyXG4vLyBVdGlsaXR5XHJcbnByb3RvYnVmLnV0aWwgICAgICAgICA9IHJlcXVpcmUoXCIuL3V0aWwvbWluaW1hbFwiKTtcclxucHJvdG9idWYucnBjICAgICAgICAgID0gcmVxdWlyZShcIi4vcnBjXCIpO1xyXG5wcm90b2J1Zi5jb25maWd1cmUgICAgPSBjb25maWd1cmU7XHJcblxyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4vKipcclxuICogUmVjb25maWd1cmVzIHRoZSBsaWJyYXJ5IGFjY29yZGluZyB0byB0aGUgZW52aXJvbm1lbnQuXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5mdW5jdGlvbiBjb25maWd1cmUoKSB7XHJcbiAgICBwcm90b2J1Zi5SZWFkZXIuX2NvbmZpZ3VyZShwcm90b2J1Zi5CdWZmZXJSZWFkZXIpO1xyXG4gICAgcHJvdG9idWYudXRpbC5fY29uZmlndXJlKCk7XHJcbn1cclxuXHJcbi8vIENvbmZpZ3VyZSBzZXJpYWxpemF0aW9uXHJcbnByb3RvYnVmLldyaXRlci5fY29uZmlndXJlKHByb3RvYnVmLkJ1ZmZlcldyaXRlcik7XHJcbmNvbmZpZ3VyZSgpO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIHByb3RvYnVmID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9pbmRleC1saWdodFwiKTtcclxuXHJcbnByb3RvYnVmLmJ1aWxkID0gXCJmdWxsXCI7XHJcblxyXG4vLyBQYXJzZXJcclxucHJvdG9idWYudG9rZW5pemUgICAgICAgICA9IHJlcXVpcmUoXCIuL3Rva2VuaXplXCIpO1xyXG5wcm90b2J1Zi5wYXJzZSAgICAgICAgICAgID0gcmVxdWlyZShcIi4vcGFyc2VcIik7XHJcbnByb3RvYnVmLmNvbW1vbiAgICAgICAgICAgPSByZXF1aXJlKFwiLi9jb21tb25cIik7XHJcblxyXG4vLyBDb25maWd1cmUgcGFyc2VyXHJcbnByb3RvYnVmLlJvb3QuX2NvbmZpZ3VyZShwcm90b2J1Zi5UeXBlLCBwcm90b2J1Zi5wYXJzZSwgcHJvdG9idWYuY29tbW9uKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gTWFwRmllbGQ7XHJcblxyXG4vLyBleHRlbmRzIEZpZWxkXHJcbnZhciBGaWVsZCA9IHJlcXVpcmUoXCIuL2ZpZWxkXCIpO1xyXG4oKE1hcEZpZWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRmllbGQucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBNYXBGaWVsZCkuY2xhc3NOYW1lID0gXCJNYXBGaWVsZFwiO1xyXG5cclxudmFyIHR5cGVzICAgPSByZXF1aXJlKFwiLi90eXBlc1wiKSxcclxuICAgIHV0aWwgICAgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgbWFwIGZpZWxkIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFJlZmxlY3RlZCBtYXAgZmllbGQuXHJcbiAqIEBleHRlbmRzIEZpZWxkXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBVbmlxdWUgbmFtZSB3aXRoaW4gaXRzIG5hbWVzcGFjZVxyXG4gKiBAcGFyYW0ge251bWJlcn0gaWQgVW5pcXVlIGlkIHdpdGhpbiBpdHMgbmFtZXNwYWNlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlUeXBlIEtleSB0eXBlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIFZhbHVlIHR5cGVcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIERlY2xhcmVkIG9wdGlvbnNcclxuICovXHJcbmZ1bmN0aW9uIE1hcEZpZWxkKG5hbWUsIGlkLCBrZXlUeXBlLCB0eXBlLCBvcHRpb25zKSB7XHJcbiAgICBGaWVsZC5jYWxsKHRoaXMsIG5hbWUsIGlkLCB0eXBlLCBvcHRpb25zKTtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICghdXRpbC5pc1N0cmluZyhrZXlUeXBlKSlcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJrZXlUeXBlIG11c3QgYmUgYSBzdHJpbmdcIik7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBLZXkgdHlwZS5cclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIHRoaXMua2V5VHlwZSA9IGtleVR5cGU7IC8vIHRvSlNPTiwgbWFya2VyXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXNvbHZlZCBrZXkgdHlwZSBpZiBub3QgYSBiYXNpYyB0eXBlLlxyXG4gICAgICogQHR5cGUgez9SZWZsZWN0aW9uT2JqZWN0fVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJlc29sdmVkS2V5VHlwZSA9IG51bGw7XHJcblxyXG4gICAgLy8gT3ZlcnJpZGVzIEZpZWxkI21hcFxyXG4gICAgdGhpcy5tYXAgPSB0cnVlO1xyXG59XHJcblxyXG4vKipcclxuICogTWFwIGZpZWxkIGRlc2NyaXB0b3IuXHJcbiAqIEB0eXBlZGVmIE1hcEZpZWxkRGVzY3JpcHRvclxyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKiBAcHJvcGVydHkge3N0cmluZ30ga2V5VHlwZSBLZXkgdHlwZVxyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gdHlwZSBWYWx1ZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBpZCBGaWVsZCBpZFxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gRmllbGQgb3B0aW9uc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBFeHRlbnNpb24gbWFwIGZpZWxkIGRlc2NyaXB0b3IuXHJcbiAqIEB0eXBlZGVmIEV4dGVuc2lvbk1hcEZpZWxkRGVzY3JpcHRvclxyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKiBAcHJvcGVydHkge3N0cmluZ30ga2V5VHlwZSBLZXkgdHlwZVxyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gdHlwZSBWYWx1ZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBpZCBGaWVsZCBpZFxyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gZXh0ZW5kIEV4dGVuZGVkIHR5cGVcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIEZpZWxkIG9wdGlvbnNcclxuICovXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG1hcCBmaWVsZCBmcm9tIGEgbWFwIGZpZWxkIGRlc2NyaXB0b3IuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIEZpZWxkIG5hbWVcclxuICogQHBhcmFtIHtNYXBGaWVsZERlc2NyaXB0b3J9IGpzb24gTWFwIGZpZWxkIGRlc2NyaXB0b3JcclxuICogQHJldHVybnMge01hcEZpZWxkfSBDcmVhdGVkIG1hcCBmaWVsZFxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGFyZ3VtZW50cyBhcmUgaW52YWxpZFxyXG4gKi9cclxuTWFwRmllbGQuZnJvbUpTT04gPSBmdW5jdGlvbiBmcm9tSlNPTihuYW1lLCBqc29uKSB7XHJcbiAgICByZXR1cm4gbmV3IE1hcEZpZWxkKG5hbWUsIGpzb24uaWQsIGpzb24ua2V5VHlwZSwganNvbi50eXBlLCBqc29uLm9wdGlvbnMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoaXMgbWFwIGZpZWxkIHRvIGEgbWFwIGZpZWxkIGRlc2NyaXB0b3IuXHJcbiAqIEByZXR1cm5zIHtNYXBGaWVsZERlc2NyaXB0b3J9IE1hcCBmaWVsZCBkZXNjcmlwdG9yXHJcbiAqL1xyXG5NYXBGaWVsZC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBrZXlUeXBlIDogdGhpcy5rZXlUeXBlLFxyXG4gICAgICAgIHR5cGUgICAgOiB0aGlzLnR5cGUsXHJcbiAgICAgICAgaWQgICAgICA6IHRoaXMuaWQsXHJcbiAgICAgICAgZXh0ZW5kICA6IHRoaXMuZXh0ZW5kLFxyXG4gICAgICAgIG9wdGlvbnMgOiB0aGlzLm9wdGlvbnNcclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogQG92ZXJyaWRlXHJcbiAqL1xyXG5NYXBGaWVsZC5wcm90b3R5cGUucmVzb2x2ZSA9IGZ1bmN0aW9uIHJlc29sdmUoKSB7XHJcbiAgICBpZiAodGhpcy5yZXNvbHZlZClcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuXHJcbiAgICAvLyBCZXNpZGVzIGEgdmFsdWUgdHlwZSwgbWFwIGZpZWxkcyBoYXZlIGEga2V5IHR5cGUgdGhhdCBtYXkgYmUgXCJhbnkgc2NhbGFyIHR5cGUgZXhjZXB0IGZvciBmbG9hdGluZyBwb2ludCB0eXBlcyBhbmQgYnl0ZXNcIlxyXG4gICAgaWYgKHR5cGVzLm1hcEtleVt0aGlzLmtleVR5cGVdID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJpbnZhbGlkIGtleSB0eXBlOiBcIiArIHRoaXMua2V5VHlwZSk7XHJcblxyXG4gICAgcmV0dXJuIEZpZWxkLnByb3RvdHlwZS5yZXNvbHZlLmNhbGwodGhpcyk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2U7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBtZXNzYWdlIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIEFic3RyYWN0IHJ1bnRpbWUgbWVzc2FnZS5cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxyXG4gKi9cclxuZnVuY3Rpb24gTWVzc2FnZShwcm9wZXJ0aWVzKSB7XHJcbiAgICAvLyBub3QgdXNlZCBpbnRlcm5hbGx5XHJcbiAgICBpZiAocHJvcGVydGllcylcclxuICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgdGhpc1trZXlzW2ldXSA9IHByb3BlcnRpZXNba2V5c1tpXV07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZWZlcmVuY2UgdG8gdGhlIHJlZmxlY3RlZCB0eXBlLlxyXG4gKiBAbmFtZSBNZXNzYWdlLiR0eXBlXHJcbiAqIEB0eXBlIHtUeXBlfVxyXG4gKiBAcmVhZG9ubHlcclxuICovXHJcblxyXG4vKipcclxuICogUmVmZXJlbmNlIHRvIHRoZSByZWZsZWN0ZWQgdHlwZS5cclxuICogQG5hbWUgTWVzc2FnZSMkdHlwZVxyXG4gKiBAdHlwZSB7VHlwZX1cclxuICogQHJlYWRvbmx5XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEVuY29kZXMgYSBtZXNzYWdlIG9mIHRoaXMgdHlwZS5cclxuICogQHBhcmFtIHtNZXNzYWdlfE9iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIE1lc3NhZ2UgdG8gZW5jb2RlXHJcbiAqIEBwYXJhbSB7V3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gdXNlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IFdyaXRlclxyXG4gKi9cclxuTWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy4kdHlwZS5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbmNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUgcHJlY2VlZGVkIGJ5IGl0cyBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEBwYXJhbSB7TWVzc2FnZXxPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBNZXNzYWdlIHRvIGVuY29kZVxyXG4gKiBAcGFyYW0ge1dyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIHVzZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBXcml0ZXJcclxuICovXHJcbk1lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xyXG4gICAgcmV0dXJuIHRoaXMuJHR5cGUuZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcik7XHJcbn07XHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIG1lc3NhZ2Ugb2YgdGhpcyB0eXBlLlxyXG4gKiBAbmFtZSBNZXNzYWdlLmRlY29kZVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtSZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlXHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBEZWNvZGVkIG1lc3NhZ2VcclxuICovXHJcbk1lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlcikge1xyXG4gICAgcmV0dXJuIHRoaXMuJHR5cGUuZGVjb2RlKHJlYWRlcik7XHJcbn07XHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIG1lc3NhZ2Ugb2YgdGhpcyB0eXBlIHByZWNlZWRlZCBieSBpdHMgbGVuZ3RoIGFzIGEgdmFyaW50LlxyXG4gKiBAbmFtZSBNZXNzYWdlLmRlY29kZURlbGltaXRlZFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtSZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlXHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBEZWNvZGVkIG1lc3NhZ2VcclxuICovXHJcbk1lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xyXG4gICAgcmV0dXJuIHRoaXMuJHR5cGUuZGVjb2RlRGVsaW1pdGVkKHJlYWRlcik7XHJcbn07XHJcblxyXG4vKipcclxuICogVmVyaWZpZXMgYSBtZXNzYWdlIG9mIHRoaXMgdHlwZS5cclxuICogQG5hbWUgTWVzc2FnZS52ZXJpZnlcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7TWVzc2FnZXxPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBNZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byB2ZXJpZnlcclxuICogQHJldHVybnMgez9zdHJpbmd9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxyXG4gKi9cclxuTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xyXG4gICAgcmV0dXJuIHRoaXMuJHR5cGUudmVyaWZ5KG1lc3NhZ2UpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgbWVzc2FnZSBvZiB0aGlzIHR5cGUgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxyXG4gKiBAcmV0dXJucyB7TWVzc2FnZX0gTWVzc2FnZSBpbnN0YW5jZVxyXG4gKi9cclxuTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcclxuICAgIHJldHVybiB0aGlzLiR0eXBlLmZyb21PYmplY3Qob2JqZWN0KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IG1lc3NhZ2Ugb2YgdGhpcyB0eXBlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXHJcbiAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIE1lc3NhZ2UuZnJvbU9iamVjdH0uXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBNZXNzYWdlIGluc3RhbmNlXHJcbiAqL1xyXG5NZXNzYWdlLmZyb20gPSBNZXNzYWdlLmZyb21PYmplY3Q7XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cclxuICogQHBhcmFtIHtNZXNzYWdlfSBtZXNzYWdlIE1lc3NhZ2UgaW5zdGFuY2VcclxuICogQHBhcmFtIHtDb252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xyXG4gKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxyXG4gKi9cclxuTWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcclxuICAgIHJldHVybiB0aGlzLiR0eXBlLnRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSB0aGlzIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cclxuICogQHBhcmFtIHtDb252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xyXG4gKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxyXG4gKi9cclxuTWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XHJcbiAgICByZXR1cm4gdGhpcy4kdHlwZS50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIG1lc3NhZ2UgdG8gSlNPTi5cclxuICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxyXG4gKi9cclxuTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuJHR5cGUudG9PYmplY3QodGhpcywgdXRpbC50b0pTT05PcHRpb25zKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gTWV0aG9kO1xyXG5cclxuLy8gZXh0ZW5kcyBSZWZsZWN0aW9uT2JqZWN0XHJcbnZhciBSZWZsZWN0aW9uT2JqZWN0ID0gcmVxdWlyZShcIi4vb2JqZWN0XCIpO1xyXG4oKE1ldGhvZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBNZXRob2QpLmNsYXNzTmFtZSA9IFwiTWV0aG9kXCI7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBzZXJ2aWNlIG1ldGhvZCBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBSZWZsZWN0ZWQgc2VydmljZSBtZXRob2QuXHJcbiAqIEBleHRlbmRzIFJlZmxlY3Rpb25PYmplY3RcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE1ldGhvZCBuYW1lXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHVuZGVmaW5lZH0gdHlwZSBNZXRob2QgdHlwZSwgdXN1YWxseSBgXCJycGNcImBcclxuICogQHBhcmFtIHtzdHJpbmd9IHJlcXVlc3RUeXBlIFJlcXVlc3QgbWVzc2FnZSB0eXBlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZVR5cGUgUmVzcG9uc2UgbWVzc2FnZSB0eXBlXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3QuPHN0cmluZywqPn0gW3JlcXVlc3RTdHJlYW1dIFdoZXRoZXIgdGhlIHJlcXVlc3QgaXMgc3RyZWFtZWRcclxuICogQHBhcmFtIHtib29sZWFufE9iamVjdC48c3RyaW5nLCo+fSBbcmVzcG9uc2VTdHJlYW1dIFdoZXRoZXIgdGhlIHJlc3BvbnNlIGlzIHN0cmVhbWVkXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBEZWNsYXJlZCBvcHRpb25zXHJcbiAqL1xyXG5mdW5jdGlvbiBNZXRob2QobmFtZSwgdHlwZSwgcmVxdWVzdFR5cGUsIHJlc3BvbnNlVHlwZSwgcmVxdWVzdFN0cmVhbSwgcmVzcG9uc2VTdHJlYW0sIG9wdGlvbnMpIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgaWYgKHV0aWwuaXNPYmplY3QocmVxdWVzdFN0cmVhbSkpIHtcclxuICAgICAgICBvcHRpb25zID0gcmVxdWVzdFN0cmVhbTtcclxuICAgICAgICByZXF1ZXN0U3RyZWFtID0gcmVzcG9uc2VTdHJlYW0gPSB1bmRlZmluZWQ7XHJcbiAgICB9IGVsc2UgaWYgKHV0aWwuaXNPYmplY3QocmVzcG9uc2VTdHJlYW0pKSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IHJlc3BvbnNlU3RyZWFtO1xyXG4gICAgICAgIHJlc3BvbnNlU3RyZWFtID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKCEodHlwZSA9PT0gdW5kZWZpbmVkIHx8IHV0aWwuaXNTdHJpbmcodHlwZSkpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcInR5cGUgbXVzdCBiZSBhIHN0cmluZ1wiKTtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICghdXRpbC5pc1N0cmluZyhyZXF1ZXN0VHlwZSkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwicmVxdWVzdFR5cGUgbXVzdCBiZSBhIHN0cmluZ1wiKTtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICghdXRpbC5pc1N0cmluZyhyZXNwb25zZVR5cGUpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcInJlc3BvbnNlVHlwZSBtdXN0IGJlIGEgc3RyaW5nXCIpO1xyXG5cclxuICAgIFJlZmxlY3Rpb25PYmplY3QuY2FsbCh0aGlzLCBuYW1lLCBvcHRpb25zKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE1ldGhvZCB0eXBlLlxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgdGhpcy50eXBlID0gdHlwZSB8fCBcInJwY1wiOyAvLyB0b0pTT05cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlcXVlc3QgdHlwZS5cclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVxdWVzdFR5cGUgPSByZXF1ZXN0VHlwZTsgLy8gdG9KU09OLCBtYXJrZXJcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgcmVxdWVzdHMgYXJlIHN0cmVhbWVkIG9yIG5vdC5cclxuICAgICAqIEB0eXBlIHtib29sZWFufHVuZGVmaW5lZH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXF1ZXN0U3RyZWFtID0gcmVxdWVzdFN0cmVhbSA/IHRydWUgOiB1bmRlZmluZWQ7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVzcG9uc2UgdHlwZS5cclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVzcG9uc2VUeXBlID0gcmVzcG9uc2VUeXBlOyAvLyB0b0pTT05cclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgcmVzcG9uc2VzIGFyZSBzdHJlYW1lZCBvciBub3QuXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbnx1bmRlZmluZWR9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVzcG9uc2VTdHJlYW0gPSByZXNwb25zZVN0cmVhbSA/IHRydWUgOiB1bmRlZmluZWQ7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVzb2x2ZWQgcmVxdWVzdCB0eXBlLlxyXG4gICAgICogQHR5cGUgez9UeXBlfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJlc29sdmVkUmVxdWVzdFR5cGUgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVzb2x2ZWQgcmVzcG9uc2UgdHlwZS5cclxuICAgICAqIEB0eXBlIHs/VHlwZX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXNvbHZlZFJlc3BvbnNlVHlwZSA9IG51bGw7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAdHlwZWRlZiBNZXRob2REZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbdHlwZT1cInJwY1wiXSBNZXRob2QgdHlwZVxyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gcmVxdWVzdFR5cGUgUmVxdWVzdCB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSByZXNwb25zZVR5cGUgUmVzcG9uc2UgdHlwZVxyXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtyZXF1ZXN0U3RyZWFtPWZhbHNlXSBXaGV0aGVyIHJlcXVlc3RzIGFyZSBzdHJlYW1lZFxyXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtyZXNwb25zZVN0cmVhbT1mYWxzZV0gV2hldGhlciByZXNwb25zZXMgYXJlIHN0cmVhbWVkXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBNZXRob2Qgb3B0aW9uc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbWV0aG9kIGZyb20gYSBtZXRob2QgZGVzY3JpcHRvci5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTWV0aG9kIG5hbWVcclxuICogQHBhcmFtIHtNZXRob2REZXNjcmlwdG9yfSBqc29uIE1ldGhvZCBkZXNjcmlwdG9yXHJcbiAqIEByZXR1cm5zIHtNZXRob2R9IENyZWF0ZWQgbWV0aG9kXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYXJndW1lbnRzIGFyZSBpbnZhbGlkXHJcbiAqL1xyXG5NZXRob2QuZnJvbUpTT04gPSBmdW5jdGlvbiBmcm9tSlNPTihuYW1lLCBqc29uKSB7XHJcbiAgICByZXR1cm4gbmV3IE1ldGhvZChuYW1lLCBqc29uLnR5cGUsIGpzb24ucmVxdWVzdFR5cGUsIGpzb24ucmVzcG9uc2VUeXBlLCBqc29uLnJlcXVlc3RTdHJlYW0sIGpzb24ucmVzcG9uc2VTdHJlYW0sIGpzb24ub3B0aW9ucyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhpcyBtZXRob2QgdG8gYSBtZXRob2QgZGVzY3JpcHRvci5cclxuICogQHJldHVybnMge01ldGhvZERlc2NyaXB0b3J9IE1ldGhvZCBkZXNjcmlwdG9yXHJcbiAqL1xyXG5NZXRob2QucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgdHlwZSAgICAgICAgICAgOiB0aGlzLnR5cGUgIT09IFwicnBjXCIgJiYgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gdGhpcy50eXBlIHx8IHVuZGVmaW5lZCxcclxuICAgICAgICByZXF1ZXN0VHlwZSAgICA6IHRoaXMucmVxdWVzdFR5cGUsXHJcbiAgICAgICAgcmVxdWVzdFN0cmVhbSAgOiB0aGlzLnJlcXVlc3RTdHJlYW0sXHJcbiAgICAgICAgcmVzcG9uc2VUeXBlICAgOiB0aGlzLnJlc3BvbnNlVHlwZSxcclxuICAgICAgICByZXNwb25zZVN0cmVhbSA6IHRoaXMucmVzcG9uc2VTdHJlYW0sXHJcbiAgICAgICAgb3B0aW9ucyAgICAgICAgOiB0aGlzLm9wdGlvbnNcclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogQG92ZXJyaWRlXHJcbiAqL1xyXG5NZXRob2QucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbiByZXNvbHZlKCkge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKHRoaXMucmVzb2x2ZWQpXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgdGhpcy5yZXNvbHZlZFJlcXVlc3RUeXBlID0gdGhpcy5wYXJlbnQubG9va3VwVHlwZSh0aGlzLnJlcXVlc3RUeXBlKTtcclxuICAgIHRoaXMucmVzb2x2ZWRSZXNwb25zZVR5cGUgPSB0aGlzLnBhcmVudC5sb29rdXBUeXBlKHRoaXMucmVzcG9uc2VUeXBlKTtcclxuXHJcbiAgICByZXR1cm4gUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUucmVzb2x2ZS5jYWxsKHRoaXMpO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBOYW1lc3BhY2U7XHJcblxyXG4vLyBleHRlbmRzIFJlZmxlY3Rpb25PYmplY3RcclxudmFyIFJlZmxlY3Rpb25PYmplY3QgPSByZXF1aXJlKFwiLi9vYmplY3RcIik7XHJcbigoTmFtZXNwYWNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IE5hbWVzcGFjZSkuY2xhc3NOYW1lID0gXCJOYW1lc3BhY2VcIjtcclxuXHJcbnZhciBFbnVtICAgICA9IHJlcXVpcmUoXCIuL2VudW1cIiksXHJcbiAgICBGaWVsZCAgICA9IHJlcXVpcmUoXCIuL2ZpZWxkXCIpLFxyXG4gICAgdXRpbCAgICAgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxudmFyIFR5cGUsICAgIC8vIGN5Y2xpY1xyXG4gICAgU2VydmljZTsgLy8gXCJcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IG5hbWVzcGFjZSBpbnN0YW5jZS5cclxuICogQG5hbWUgTmFtZXNwYWNlXHJcbiAqIEBjbGFzc2Rlc2MgUmVmbGVjdGVkIG5hbWVzcGFjZS5cclxuICogQGV4dGVuZHMgTmFtZXNwYWNlQmFzZVxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZXNwYWNlIG5hbWVcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIERlY2xhcmVkIG9wdGlvbnNcclxuICovXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5hbWVzcGFjZSBmcm9tIEpTT04uXHJcbiAqIEBtZW1iZXJvZiBOYW1lc3BhY2VcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWVzcGFjZSBuYW1lXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IGpzb24gSlNPTiBvYmplY3RcclxuICogQHJldHVybnMge05hbWVzcGFjZX0gQ3JlYXRlZCBuYW1lc3BhY2VcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICovXHJcbk5hbWVzcGFjZS5mcm9tSlNPTiA9IGZ1bmN0aW9uIGZyb21KU09OKG5hbWUsIGpzb24pIHtcclxuICAgIHJldHVybiBuZXcgTmFtZXNwYWNlKG5hbWUsIGpzb24ub3B0aW9ucykuYWRkSlNPTihqc29uLm5lc3RlZCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgYW4gYXJyYXkgb2YgcmVmbGVjdGlvbiBvYmplY3RzIHRvIEpTT04uXHJcbiAqIEBtZW1iZXJvZiBOYW1lc3BhY2VcclxuICogQHBhcmFtIHtSZWZsZWN0aW9uT2JqZWN0W119IGFycmF5IE9iamVjdCBhcnJheVxyXG4gKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj58dW5kZWZpbmVkfSBKU09OIG9iamVjdCBvciBgdW5kZWZpbmVkYCB3aGVuIGFycmF5IGlzIGVtcHR5XHJcbiAqL1xyXG5mdW5jdGlvbiBhcnJheVRvSlNPTihhcnJheSkge1xyXG4gICAgaWYgKCEoYXJyYXkgJiYgYXJyYXkubGVuZ3RoKSlcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgdmFyIG9iaiA9IHt9O1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7ICsraSlcclxuICAgICAgICBvYmpbYXJyYXlbaV0ubmFtZV0gPSBhcnJheVtpXS50b0pTT04oKTtcclxuICAgIHJldHVybiBvYmo7XHJcbn1cclxuXHJcbk5hbWVzcGFjZS5hcnJheVRvSlNPTiA9IGFycmF5VG9KU09OO1xyXG5cclxuLyoqXHJcbiAqIE5vdCBhbiBhY3R1YWwgY29uc3RydWN0b3IuIFVzZSB7QGxpbmsgTmFtZXNwYWNlfSBpbnN0ZWFkLlxyXG4gKiBAY2xhc3NkZXNjIEJhc2UgY2xhc3Mgb2YgYWxsIHJlZmxlY3Rpb24gb2JqZWN0cyBjb250YWluaW5nIG5lc3RlZCBvYmplY3RzLiBUaGlzIGlzIG5vdCBhbiBhY3R1YWwgY2xhc3MgYnV0IGhlcmUgZm9yIHRoZSBzYWtlIG9mIGhhdmluZyBjb25zaXN0ZW50IHR5cGUgZGVmaW5pdGlvbnMuXHJcbiAqIEBleHBvcnRzIE5hbWVzcGFjZUJhc2VcclxuICogQGV4dGVuZHMgUmVmbGVjdGlvbk9iamVjdFxyXG4gKiBAYWJzdHJhY3RcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWVzcGFjZSBuYW1lXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBEZWNsYXJlZCBvcHRpb25zXHJcbiAqIEBzZWUge0BsaW5rIE5hbWVzcGFjZX1cclxuICovXHJcbmZ1bmN0aW9uIE5hbWVzcGFjZShuYW1lLCBvcHRpb25zKSB7XHJcbiAgICBSZWZsZWN0aW9uT2JqZWN0LmNhbGwodGhpcywgbmFtZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBOZXN0ZWQgb2JqZWN0cyBieSBuYW1lLlxyXG4gICAgICogQHR5cGUge09iamVjdC48c3RyaW5nLFJlZmxlY3Rpb25PYmplY3Q+fHVuZGVmaW5lZH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5uZXN0ZWQgPSB1bmRlZmluZWQ7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FjaGVkIG5lc3RlZCBvYmplY3RzIGFzIGFuIGFycmF5LlxyXG4gICAgICogQHR5cGUgez9SZWZsZWN0aW9uT2JqZWN0W119XHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICB0aGlzLl9uZXN0ZWRBcnJheSA9IG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFyQ2FjaGUobmFtZXNwYWNlKSB7XHJcbiAgICBuYW1lc3BhY2UuX25lc3RlZEFycmF5ID0gbnVsbDtcclxuICAgIHJldHVybiBuYW1lc3BhY2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBOZXN0ZWQgb2JqZWN0cyBvZiB0aGlzIG5hbWVzcGFjZSBhcyBhbiBhcnJheSBmb3IgaXRlcmF0aW9uLlxyXG4gKiBAbmFtZSBOYW1lc3BhY2VCYXNlI25lc3RlZEFycmF5XHJcbiAqIEB0eXBlIHtSZWZsZWN0aW9uT2JqZWN0W119XHJcbiAqIEByZWFkb25seVxyXG4gKi9cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE5hbWVzcGFjZS5wcm90b3R5cGUsIFwibmVzdGVkQXJyYXlcIiwge1xyXG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fbmVzdGVkQXJyYXkgfHwgKHRoaXMuX25lc3RlZEFycmF5ID0gdXRpbC50b0FycmF5KHRoaXMubmVzdGVkKSk7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIE5hbWVzcGFjZSBkZXNjcmlwdG9yLlxyXG4gKiBAdHlwZWRlZiBOYW1lc3BhY2VEZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBOYW1lc3BhY2Ugb3B0aW9uc1xyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLEFueU5lc3RlZERlc2NyaXB0b3I+fSBuZXN0ZWQgTmVzdGVkIG9iamVjdCBkZXNjcmlwdG9yc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBOYW1lc3BhY2UgYmFzZSBkZXNjcmlwdG9yLlxyXG4gKiBAdHlwZWRlZiBOYW1lc3BhY2VCYXNlRGVzY3JpcHRvclxyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gTmFtZXNwYWNlIG9wdGlvbnNcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZyxBbnlOZXN0ZWREZXNjcmlwdG9yPn0gW25lc3RlZF0gTmVzdGVkIG9iamVjdCBkZXNjcmlwdG9yc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBBbnkgZXh0ZW5zaW9uIGZpZWxkIGRlc2NyaXB0b3IuXHJcbiAqIEB0eXBlZGVmIEFueUV4dGVuc2lvbkZpZWxkRGVzY3JpcHRvclxyXG4gKiBAdHlwZSB7RXh0ZW5zaW9uRmllbGREZXNjcmlwdG9yfEV4dGVuc2lvbk1hcEZpZWxkRGVzY3JpcHRvcn1cclxuICovXHJcblxyXG4vKipcclxuICogQW55IG5lc3RlZCBvYmplY3QgZGVzY3JpcHRvci5cclxuICogQHR5cGVkZWYgQW55TmVzdGVkRGVzY3JpcHRvclxyXG4gKiBAdHlwZSB7RW51bURlc2NyaXB0b3J8VHlwZURlc2NyaXB0b3J8U2VydmljZURlc2NyaXB0b3J8QW55RXh0ZW5zaW9uRmllbGREZXNjcmlwdG9yfE5hbWVzcGFjZURlc2NyaXB0b3J9XHJcbiAqL1xyXG4vLyBeIEJFV0FSRTogVlNDb2RlIGhhbmdzIGZvcmV2ZXIgd2hlbiB1c2luZyBtb3JlIHRoYW4gNSB0eXBlcyAodGhhdCdzIHdoeSBBbnlFeHRlbnNpb25GaWVsZERlc2NyaXB0b3IgZXhpc3RzIGluIHRoZSBmaXJzdCBwbGFjZSlcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIG5hbWVzcGFjZSB0byBhIG5hbWVzcGFjZSBkZXNjcmlwdG9yLlxyXG4gKiBAcmV0dXJucyB7TmFtZXNwYWNlQmFzZURlc2NyaXB0b3J9IE5hbWVzcGFjZSBkZXNjcmlwdG9yXHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgb3B0aW9ucyA6IHRoaXMub3B0aW9ucyxcclxuICAgICAgICBuZXN0ZWQgIDogYXJyYXlUb0pTT04odGhpcy5uZXN0ZWRBcnJheSlcclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBuZXN0ZWQgb2JqZWN0cyB0byB0aGlzIG5hbWVzcGFjZSBmcm9tIG5lc3RlZCBvYmplY3QgZGVzY3JpcHRvcnMuXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsQW55TmVzdGVkRGVzY3JpcHRvcj59IG5lc3RlZEpzb24gQW55IG5lc3RlZCBvYmplY3QgZGVzY3JpcHRvcnNcclxuICogQHJldHVybnMge05hbWVzcGFjZX0gYHRoaXNgXHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLmFkZEpTT04gPSBmdW5jdGlvbiBhZGRKU09OKG5lc3RlZEpzb24pIHtcclxuICAgIHZhciBucyA9IHRoaXM7XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgaWYgKG5lc3RlZEpzb24pIHtcclxuICAgICAgICBmb3IgKHZhciBuYW1lcyA9IE9iamVjdC5rZXlzKG5lc3RlZEpzb24pLCBpID0gMCwgbmVzdGVkOyBpIDwgbmFtZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgbmVzdGVkID0gbmVzdGVkSnNvbltuYW1lc1tpXV07XHJcbiAgICAgICAgICAgIG5zLmFkZCggLy8gbW9zdCB0byBsZWFzdCBsaWtlbHlcclxuICAgICAgICAgICAgICAgICggbmVzdGVkLmZpZWxkcyAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICA/IFR5cGUuZnJvbUpTT05cclxuICAgICAgICAgICAgICAgIDogbmVzdGVkLnZhbHVlcyAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICA/IEVudW0uZnJvbUpTT05cclxuICAgICAgICAgICAgICAgIDogbmVzdGVkLm1ldGhvZHMgIT09IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgPyBTZXJ2aWNlLmZyb21KU09OXHJcbiAgICAgICAgICAgICAgICA6IG5lc3RlZC5pZCAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICA/IEZpZWxkLmZyb21KU09OXHJcbiAgICAgICAgICAgICAgICA6IE5hbWVzcGFjZS5mcm9tSlNPTiApKG5hbWVzW2ldLCBuZXN0ZWQpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0cyB0aGUgbmVzdGVkIG9iamVjdCBvZiB0aGUgc3BlY2lmaWVkIG5hbWUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5lc3RlZCBvYmplY3QgbmFtZVxyXG4gKiBAcmV0dXJucyB7P1JlZmxlY3Rpb25PYmplY3R9IFRoZSByZWZsZWN0aW9uIG9iamVjdCBvciBgbnVsbGAgaWYgaXQgZG9lc24ndCBleGlzdFxyXG4gKi9cclxuTmFtZXNwYWNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQobmFtZSkge1xyXG4gICAgcmV0dXJuIHRoaXMubmVzdGVkICYmIHRoaXMubmVzdGVkW25hbWVdXHJcbiAgICAgICAgfHwgbnVsbDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXRzIHRoZSB2YWx1ZXMgb2YgdGhlIG5lc3RlZCB7QGxpbmsgRW51bXxlbnVtfSBvZiB0aGUgc3BlY2lmaWVkIG5hbWUuXHJcbiAqIFRoaXMgbWV0aG9kcyBkaWZmZXJzIGZyb20ge0BsaW5rIE5hbWVzcGFjZSNnZXR8Z2V0fSBpbiB0aGF0IGl0IHJldHVybnMgYW4gZW51bSdzIHZhbHVlcyBkaXJlY3RseSBhbmQgdGhyb3dzIGluc3RlYWQgb2YgcmV0dXJuaW5nIGBudWxsYC5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmVzdGVkIGVudW0gbmFtZVxyXG4gKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsbnVtYmVyPn0gRW51bSB2YWx1ZXNcclxuICogQHRocm93cyB7RXJyb3J9IElmIHRoZXJlIGlzIG5vIHN1Y2ggZW51bVxyXG4gKi9cclxuTmFtZXNwYWNlLnByb3RvdHlwZS5nZXRFbnVtID0gZnVuY3Rpb24gZ2V0RW51bShuYW1lKSB7XHJcbiAgICBpZiAodGhpcy5uZXN0ZWQgJiYgdGhpcy5uZXN0ZWRbbmFtZV0gaW5zdGFuY2VvZiBFbnVtKVxyXG4gICAgICAgIHJldHVybiB0aGlzLm5lc3RlZFtuYW1lXS52YWx1ZXM7XHJcbiAgICB0aHJvdyBFcnJvcihcIm5vIHN1Y2ggZW51bVwiKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgbmVzdGVkIG9iamVjdCB0byB0aGlzIG5hbWVzcGFjZS5cclxuICogQHBhcmFtIHtSZWZsZWN0aW9uT2JqZWN0fSBvYmplY3QgTmVzdGVkIG9iamVjdCB0byBhZGRcclxuICogQHJldHVybnMge05hbWVzcGFjZX0gYHRoaXNgXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYXJndW1lbnRzIGFyZSBpbnZhbGlkXHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGVyZSBpcyBhbHJlYWR5IGEgbmVzdGVkIG9iamVjdCB3aXRoIHRoaXMgbmFtZVxyXG4gKi9cclxuTmFtZXNwYWNlLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQob2JqZWN0KSB7XHJcblxyXG4gICAgaWYgKCEob2JqZWN0IGluc3RhbmNlb2YgRmllbGQgJiYgb2JqZWN0LmV4dGVuZCAhPT0gdW5kZWZpbmVkIHx8IG9iamVjdCBpbnN0YW5jZW9mIFR5cGUgfHwgb2JqZWN0IGluc3RhbmNlb2YgRW51bSB8fCBvYmplY3QgaW5zdGFuY2VvZiBTZXJ2aWNlIHx8IG9iamVjdCBpbnN0YW5jZW9mIE5hbWVzcGFjZSkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwib2JqZWN0IG11c3QgYmUgYSB2YWxpZCBuZXN0ZWQgb2JqZWN0XCIpO1xyXG5cclxuICAgIGlmICghdGhpcy5uZXN0ZWQpXHJcbiAgICAgICAgdGhpcy5uZXN0ZWQgPSB7fTtcclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHZhciBwcmV2ID0gdGhpcy5nZXQob2JqZWN0Lm5hbWUpO1xyXG4gICAgICAgIGlmIChwcmV2KSB7XHJcbiAgICAgICAgICAgIGlmIChwcmV2IGluc3RhbmNlb2YgTmFtZXNwYWNlICYmIG9iamVjdCBpbnN0YW5jZW9mIE5hbWVzcGFjZSAmJiAhKHByZXYgaW5zdGFuY2VvZiBUeXBlIHx8IHByZXYgaW5zdGFuY2VvZiBTZXJ2aWNlKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gcmVwbGFjZSBwbGFpbiBuYW1lc3BhY2UgYnV0IGtlZXAgZXhpc3RpbmcgbmVzdGVkIGVsZW1lbnRzIGFuZCBvcHRpb25zXHJcbiAgICAgICAgICAgICAgICB2YXIgbmVzdGVkID0gcHJldi5uZXN0ZWRBcnJheTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmVzdGVkLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5hZGQobmVzdGVkW2ldKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKHByZXYpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5lc3RlZClcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5lc3RlZCA9IHt9O1xyXG4gICAgICAgICAgICAgICAgb2JqZWN0LnNldE9wdGlvbnMocHJldi5vcHRpb25zLCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJkdXBsaWNhdGUgbmFtZSAnXCIgKyBvYmplY3QubmFtZSArIFwiJyBpbiBcIiArIHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMubmVzdGVkW29iamVjdC5uYW1lXSA9IG9iamVjdDtcclxuICAgIG9iamVjdC5vbkFkZCh0aGlzKTtcclxuICAgIHJldHVybiBjbGVhckNhY2hlKHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbW92ZXMgYSBuZXN0ZWQgb2JqZWN0IGZyb20gdGhpcyBuYW1lc3BhY2UuXHJcbiAqIEBwYXJhbSB7UmVmbGVjdGlvbk9iamVjdH0gb2JqZWN0IE5lc3RlZCBvYmplY3QgdG8gcmVtb3ZlXHJcbiAqIEByZXR1cm5zIHtOYW1lc3BhY2V9IGB0aGlzYFxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGFyZ3VtZW50cyBhcmUgaW52YWxpZFxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgYG9iamVjdGAgaXMgbm90IGEgbWVtYmVyIG9mIHRoaXMgbmFtZXNwYWNlXHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZShvYmplY3QpIHtcclxuXHJcbiAgICBpZiAoIShvYmplY3QgaW5zdGFuY2VvZiBSZWZsZWN0aW9uT2JqZWN0KSlcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJvYmplY3QgbXVzdCBiZSBhIFJlZmxlY3Rpb25PYmplY3RcIik7XHJcbiAgICBpZiAob2JqZWN0LnBhcmVudCAhPT0gdGhpcylcclxuICAgICAgICB0aHJvdyBFcnJvcihvYmplY3QgKyBcIiBpcyBub3QgYSBtZW1iZXIgb2YgXCIgKyB0aGlzKTtcclxuXHJcbiAgICBkZWxldGUgdGhpcy5uZXN0ZWRbb2JqZWN0Lm5hbWVdO1xyXG4gICAgaWYgKCFPYmplY3Qua2V5cyh0aGlzLm5lc3RlZCkubGVuZ3RoKVxyXG4gICAgICAgIHRoaXMubmVzdGVkID0gdW5kZWZpbmVkO1xyXG5cclxuICAgIG9iamVjdC5vblJlbW92ZSh0aGlzKTtcclxuICAgIHJldHVybiBjbGVhckNhY2hlKHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlZmluZXMgYWRkaXRpYWwgbmFtZXNwYWNlcyB3aXRoaW4gdGhpcyBvbmUgaWYgbm90IHlldCBleGlzdGluZy5cclxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IHBhdGggUGF0aCB0byBjcmVhdGVcclxuICogQHBhcmFtIHsqfSBbanNvbl0gTmVzdGVkIHR5cGVzIHRvIGNyZWF0ZSBmcm9tIEpTT05cclxuICogQHJldHVybnMge05hbWVzcGFjZX0gUG9pbnRlciB0byB0aGUgbGFzdCBuYW1lc3BhY2UgY3JlYXRlZCBvciBgdGhpc2AgaWYgcGF0aCBpcyBlbXB0eVxyXG4gKi9cclxuTmFtZXNwYWNlLnByb3RvdHlwZS5kZWZpbmUgPSBmdW5jdGlvbiBkZWZpbmUocGF0aCwganNvbikge1xyXG5cclxuICAgIGlmICh1dGlsLmlzU3RyaW5nKHBhdGgpKVxyXG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KFwiLlwiKTtcclxuICAgIGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KHBhdGgpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcImlsbGVnYWwgcGF0aFwiKTtcclxuICAgIGlmIChwYXRoICYmIHBhdGgubGVuZ3RoICYmIHBhdGhbMF0gPT09IFwiXCIpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJwYXRoIG11c3QgYmUgcmVsYXRpdmVcIik7XHJcblxyXG4gICAgdmFyIHB0ciA9IHRoaXM7XHJcbiAgICB3aGlsZSAocGF0aC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgdmFyIHBhcnQgPSBwYXRoLnNoaWZ0KCk7XHJcbiAgICAgICAgaWYgKHB0ci5uZXN0ZWQgJiYgcHRyLm5lc3RlZFtwYXJ0XSkge1xyXG4gICAgICAgICAgICBwdHIgPSBwdHIubmVzdGVkW3BhcnRdO1xyXG4gICAgICAgICAgICBpZiAoIShwdHIgaW5zdGFuY2VvZiBOYW1lc3BhY2UpKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJwYXRoIGNvbmZsaWN0cyB3aXRoIG5vbi1uYW1lc3BhY2Ugb2JqZWN0c1wiKTtcclxuICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgcHRyLmFkZChwdHIgPSBuZXcgTmFtZXNwYWNlKHBhcnQpKTtcclxuICAgIH1cclxuICAgIGlmIChqc29uKVxyXG4gICAgICAgIHB0ci5hZGRKU09OKGpzb24pO1xyXG4gICAgcmV0dXJuIHB0cjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNvbHZlcyB0aGlzIG5hbWVzcGFjZSdzIGFuZCBhbGwgaXRzIG5lc3RlZCBvYmplY3RzJyB0eXBlIHJlZmVyZW5jZXMuIFVzZWZ1bCB0byB2YWxpZGF0ZSBhIHJlZmxlY3Rpb24gdHJlZSwgYnV0IGNvbWVzIGF0IGEgY29zdC5cclxuICogQHJldHVybnMge05hbWVzcGFjZX0gYHRoaXNgXHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLnJlc29sdmVBbGwgPSBmdW5jdGlvbiByZXNvbHZlQWxsKCkge1xyXG4gICAgdmFyIG5lc3RlZCA9IHRoaXMubmVzdGVkQXJyYXksIGkgPSAwO1xyXG4gICAgd2hpbGUgKGkgPCBuZXN0ZWQubGVuZ3RoKVxyXG4gICAgICAgIGlmIChuZXN0ZWRbaV0gaW5zdGFuY2VvZiBOYW1lc3BhY2UpXHJcbiAgICAgICAgICAgIG5lc3RlZFtpKytdLnJlc29sdmVBbGwoKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIG5lc3RlZFtpKytdLnJlc29sdmUoKTtcclxuICAgIHJldHVybiB0aGlzLnJlc29sdmUoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBMb29rcyB1cCB0aGUgcmVmbGVjdGlvbiBvYmplY3QgYXQgdGhlIHNwZWNpZmllZCBwYXRoLCByZWxhdGl2ZSB0byB0aGlzIG5hbWVzcGFjZS5cclxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IHBhdGggUGF0aCB0byBsb29rIHVwXHJcbiAqIEBwYXJhbSB7KnxBcnJheS48Kj59IGZpbHRlclR5cGVzIEZpbHRlciB0eXBlcywgYW55IGNvbWJpbmF0aW9uIG9mIHRoZSBjb25zdHJ1Y3RvcnMgb2YgYHByb3RvYnVmLlR5cGVgLCBgcHJvdG9idWYuRW51bWAsIGBwcm90b2J1Zi5TZXJ2aWNlYCBldGMuXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3BhcmVudEFscmVhZHlDaGVja2VkPWZhbHNlXSBJZiBrbm93biwgd2hldGhlciB0aGUgcGFyZW50IGhhcyBhbHJlYWR5IGJlZW4gY2hlY2tlZFxyXG4gKiBAcmV0dXJucyB7P1JlZmxlY3Rpb25PYmplY3R9IExvb2tlZCB1cCBvYmplY3Qgb3IgYG51bGxgIGlmIG5vbmUgY291bGQgYmUgZm91bmRcclxuICovXHJcbk5hbWVzcGFjZS5wcm90b3R5cGUubG9va3VwID0gZnVuY3Rpb24gbG9va3VwKHBhdGgsIGZpbHRlclR5cGVzLCBwYXJlbnRBbHJlYWR5Q2hlY2tlZCkge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICBpZiAodHlwZW9mIGZpbHRlclR5cGVzID09PSBcImJvb2xlYW5cIikge1xyXG4gICAgICAgIHBhcmVudEFscmVhZHlDaGVja2VkID0gZmlsdGVyVHlwZXM7XHJcbiAgICAgICAgZmlsdGVyVHlwZXMgPSB1bmRlZmluZWQ7XHJcbiAgICB9IGVsc2UgaWYgKGZpbHRlclR5cGVzICYmICFBcnJheS5pc0FycmF5KGZpbHRlclR5cGVzKSlcclxuICAgICAgICBmaWx0ZXJUeXBlcyA9IFsgZmlsdGVyVHlwZXMgXTtcclxuXHJcbiAgICBpZiAodXRpbC5pc1N0cmluZyhwYXRoKSAmJiBwYXRoLmxlbmd0aCkge1xyXG4gICAgICAgIGlmIChwYXRoID09PSBcIi5cIilcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucm9vdDtcclxuICAgICAgICBwYXRoID0gcGF0aC5zcGxpdChcIi5cIik7XHJcbiAgICB9IGVsc2UgaWYgKCFwYXRoLmxlbmd0aClcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuXHJcbiAgICAvLyBTdGFydCBhdCByb290IGlmIHBhdGggaXMgYWJzb2x1dGVcclxuICAgIGlmIChwYXRoWzBdID09PSBcIlwiKVxyXG4gICAgICAgIHJldHVybiB0aGlzLnJvb3QubG9va3VwKHBhdGguc2xpY2UoMSksIGZpbHRlclR5cGVzKTtcclxuICAgIC8vIFRlc3QgaWYgdGhlIGZpcnN0IHBhcnQgbWF0Y2hlcyBhbnkgbmVzdGVkIG9iamVjdCwgYW5kIGlmIHNvLCB0cmF2ZXJzZSBpZiBwYXRoIGNvbnRhaW5zIG1vcmVcclxuICAgIHZhciBmb3VuZCA9IHRoaXMuZ2V0KHBhdGhbMF0pO1xyXG4gICAgaWYgKGZvdW5kKSB7XHJcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgIGlmICghZmlsdGVyVHlwZXMgfHwgZmlsdGVyVHlwZXMuaW5kZXhPZihmb3VuZC5jb25zdHJ1Y3RvcikgPiAtMSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBmb3VuZDtcclxuICAgICAgICB9IGVsc2UgaWYgKGZvdW5kIGluc3RhbmNlb2YgTmFtZXNwYWNlICYmIChmb3VuZCA9IGZvdW5kLmxvb2t1cChwYXRoLnNsaWNlKDEpLCBmaWx0ZXJUeXBlcywgdHJ1ZSkpKVxyXG4gICAgICAgICAgICByZXR1cm4gZm91bmQ7XHJcbiAgICB9XHJcbiAgICAvLyBJZiB0aGVyZSBoYXNuJ3QgYmVlbiBhIG1hdGNoLCB0cnkgYWdhaW4gYXQgdGhlIHBhcmVudFxyXG4gICAgaWYgKHRoaXMucGFyZW50ID09PSBudWxsIHx8IHBhcmVudEFscmVhZHlDaGVja2VkKVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgcmV0dXJuIHRoaXMucGFyZW50Lmxvb2t1cChwYXRoLCBmaWx0ZXJUeXBlcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogTG9va3MgdXAgdGhlIHJlZmxlY3Rpb24gb2JqZWN0IGF0IHRoZSBzcGVjaWZpZWQgcGF0aCwgcmVsYXRpdmUgdG8gdGhpcyBuYW1lc3BhY2UuXHJcbiAqIEBuYW1lIE5hbWVzcGFjZUJhc2UjbG9va3VwXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gcGF0aCBQYXRoIHRvIGxvb2sgdXBcclxuICogQHBhcmFtIHtib29sZWFufSBbcGFyZW50QWxyZWFkeUNoZWNrZWQ9ZmFsc2VdIFdoZXRoZXIgdGhlIHBhcmVudCBoYXMgYWxyZWFkeSBiZWVuIGNoZWNrZWRcclxuICogQHJldHVybnMgez9SZWZsZWN0aW9uT2JqZWN0fSBMb29rZWQgdXAgb2JqZWN0IG9yIGBudWxsYCBpZiBub25lIGNvdWxkIGJlIGZvdW5kXHJcbiAqIEB2YXJpYXRpb24gMlxyXG4gKi9cclxuLy8gbG9va3VwKHBhdGg6IHN0cmluZywgW3BhcmVudEFscmVhZHlDaGVja2VkOiBib29sZWFuXSlcclxuXHJcbi8qKlxyXG4gKiBMb29rcyB1cCB0aGUge0BsaW5rIFR5cGV8dHlwZX0gYXQgdGhlIHNwZWNpZmllZCBwYXRoLCByZWxhdGl2ZSB0byB0aGlzIG5hbWVzcGFjZS5cclxuICogQmVzaWRlcyBpdHMgc2lnbmF0dXJlLCB0aGlzIG1ldGhvZHMgZGlmZmVycyBmcm9tIHtAbGluayBOYW1lc3BhY2UjbG9va3VwfGxvb2t1cH0gaW4gdGhhdCBpdCB0aHJvd3MgaW5zdGVhZCBvZiByZXR1cm5pbmcgYG51bGxgLlxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gcGF0aCBQYXRoIHRvIGxvb2sgdXBcclxuICogQHJldHVybnMge1R5cGV9IExvb2tlZCB1cCB0eXBlXHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiBgcGF0aGAgZG9lcyBub3QgcG9pbnQgdG8gYSB0eXBlXHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLmxvb2t1cFR5cGUgPSBmdW5jdGlvbiBsb29rdXBUeXBlKHBhdGgpIHtcclxuICAgIHZhciBmb3VuZCA9IHRoaXMubG9va3VwKHBhdGgsIFsgVHlwZSBdKTtcclxuICAgIGlmICghZm91bmQpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJubyBzdWNoIHR5cGVcIik7XHJcbiAgICByZXR1cm4gZm91bmQ7XHJcbn07XHJcblxyXG4vKipcclxuICogTG9va3MgdXAgdGhlIHZhbHVlcyBvZiB0aGUge0BsaW5rIEVudW18ZW51bX0gYXQgdGhlIHNwZWNpZmllZCBwYXRoLCByZWxhdGl2ZSB0byB0aGlzIG5hbWVzcGFjZS5cclxuICogQmVzaWRlcyBpdHMgc2lnbmF0dXJlLCB0aGlzIG1ldGhvZHMgZGlmZmVycyBmcm9tIHtAbGluayBOYW1lc3BhY2UjbG9va3VwfGxvb2t1cH0gaW4gdGhhdCBpdCB0aHJvd3MgaW5zdGVhZCBvZiByZXR1cm5pbmcgYG51bGxgLlxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gcGF0aCBQYXRoIHRvIGxvb2sgdXBcclxuICogQHJldHVybnMge0VudW19IExvb2tlZCB1cCBlbnVtXHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiBgcGF0aGAgZG9lcyBub3QgcG9pbnQgdG8gYW4gZW51bVxyXG4gKi9cclxuTmFtZXNwYWNlLnByb3RvdHlwZS5sb29rdXBFbnVtID0gZnVuY3Rpb24gbG9va3VwRW51bShwYXRoKSB7XHJcbiAgICB2YXIgZm91bmQgPSB0aGlzLmxvb2t1cChwYXRoLCBbIEVudW0gXSk7XHJcbiAgICBpZiAoIWZvdW5kKVxyXG4gICAgICAgIHRocm93IEVycm9yKFwibm8gc3VjaCBFbnVtICdcIiArIHBhdGggKyBcIicgaW4gXCIgKyB0aGlzKTtcclxuICAgIHJldHVybiBmb3VuZDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBMb29rcyB1cCB0aGUge0BsaW5rIFR5cGV8dHlwZX0gb3Ige0BsaW5rIEVudW18ZW51bX0gYXQgdGhlIHNwZWNpZmllZCBwYXRoLCByZWxhdGl2ZSB0byB0aGlzIG5hbWVzcGFjZS5cclxuICogQmVzaWRlcyBpdHMgc2lnbmF0dXJlLCB0aGlzIG1ldGhvZHMgZGlmZmVycyBmcm9tIHtAbGluayBOYW1lc3BhY2UjbG9va3VwfGxvb2t1cH0gaW4gdGhhdCBpdCB0aHJvd3MgaW5zdGVhZCBvZiByZXR1cm5pbmcgYG51bGxgLlxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gcGF0aCBQYXRoIHRvIGxvb2sgdXBcclxuICogQHJldHVybnMge1R5cGV9IExvb2tlZCB1cCB0eXBlIG9yIGVudW1cclxuICogQHRocm93cyB7RXJyb3J9IElmIGBwYXRoYCBkb2VzIG5vdCBwb2ludCB0byBhIHR5cGUgb3IgZW51bVxyXG4gKi9cclxuTmFtZXNwYWNlLnByb3RvdHlwZS5sb29rdXBUeXBlT3JFbnVtID0gZnVuY3Rpb24gbG9va3VwVHlwZU9yRW51bShwYXRoKSB7XHJcbiAgICB2YXIgZm91bmQgPSB0aGlzLmxvb2t1cChwYXRoLCBbIFR5cGUsIEVudW0gXSk7XHJcbiAgICBpZiAoIWZvdW5kKVxyXG4gICAgICAgIHRocm93IEVycm9yKFwibm8gc3VjaCBUeXBlIG9yIEVudW0gJ1wiICsgcGF0aCArIFwiJyBpbiBcIiArIHRoaXMpO1xyXG4gICAgcmV0dXJuIGZvdW5kO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIExvb2tzIHVwIHRoZSB7QGxpbmsgU2VydmljZXxzZXJ2aWNlfSBhdCB0aGUgc3BlY2lmaWVkIHBhdGgsIHJlbGF0aXZlIHRvIHRoaXMgbmFtZXNwYWNlLlxyXG4gKiBCZXNpZGVzIGl0cyBzaWduYXR1cmUsIHRoaXMgbWV0aG9kcyBkaWZmZXJzIGZyb20ge0BsaW5rIE5hbWVzcGFjZSNsb29rdXB8bG9va3VwfSBpbiB0aGF0IGl0IHRocm93cyBpbnN0ZWFkIG9mIHJldHVybmluZyBgbnVsbGAuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBwYXRoIFBhdGggdG8gbG9vayB1cFxyXG4gKiBAcmV0dXJucyB7U2VydmljZX0gTG9va2VkIHVwIHNlcnZpY2VcclxuICogQHRocm93cyB7RXJyb3J9IElmIGBwYXRoYCBkb2VzIG5vdCBwb2ludCB0byBhIHNlcnZpY2VcclxuICovXHJcbk5hbWVzcGFjZS5wcm90b3R5cGUubG9va3VwU2VydmljZSA9IGZ1bmN0aW9uIGxvb2t1cFNlcnZpY2UocGF0aCkge1xyXG4gICAgdmFyIGZvdW5kID0gdGhpcy5sb29rdXAocGF0aCwgWyBTZXJ2aWNlIF0pO1xyXG4gICAgaWYgKCFmb3VuZClcclxuICAgICAgICB0aHJvdyBFcnJvcihcIm5vIHN1Y2ggU2VydmljZSAnXCIgKyBwYXRoICsgXCInIGluIFwiICsgdGhpcyk7XHJcbiAgICByZXR1cm4gZm91bmQ7XHJcbn07XHJcblxyXG5OYW1lc3BhY2UuX2NvbmZpZ3VyZSA9IGZ1bmN0aW9uKFR5cGVfLCBTZXJ2aWNlXykge1xyXG4gICAgVHlwZSAgICA9IFR5cGVfO1xyXG4gICAgU2VydmljZSA9IFNlcnZpY2VfO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBSZWZsZWN0aW9uT2JqZWN0O1xyXG5cclxuUmVmbGVjdGlvbk9iamVjdC5jbGFzc05hbWUgPSBcIlJlZmxlY3Rpb25PYmplY3RcIjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcclxuXHJcbnZhciBSb290OyAvLyBjeWNsaWNcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHJlZmxlY3Rpb24gb2JqZWN0IGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIEJhc2UgY2xhc3Mgb2YgYWxsIHJlZmxlY3Rpb24gb2JqZWN0cy5cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE9iamVjdCBuYW1lXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBEZWNsYXJlZCBvcHRpb25zXHJcbiAqIEBhYnN0cmFjdFxyXG4gKi9cclxuZnVuY3Rpb24gUmVmbGVjdGlvbk9iamVjdChuYW1lLCBvcHRpb25zKSB7XHJcblxyXG4gICAgaWYgKCF1dGlsLmlzU3RyaW5nKG5hbWUpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcIm5hbWUgbXVzdCBiZSBhIHN0cmluZ1wiKTtcclxuXHJcbiAgICBpZiAob3B0aW9ucyAmJiAhdXRpbC5pc09iamVjdChvcHRpb25zKSlcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJvcHRpb25zIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogT3B0aW9ucy5cclxuICAgICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZywqPnx1bmRlZmluZWR9XHJcbiAgICAgKi9cclxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVW5pcXVlIG5hbWUgd2l0aGluIGl0cyBuYW1lc3BhY2UuXHJcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxyXG4gICAgICovXHJcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGFyZW50IG5hbWVzcGFjZS5cclxuICAgICAqIEB0eXBlIHs/TmFtZXNwYWNlfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnBhcmVudCA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXaGV0aGVyIGFscmVhZHkgcmVzb2x2ZWQgb3Igbm90LlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVzb2x2ZWQgPSBmYWxzZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbW1lbnQgdGV4dCwgaWYgYW55LlxyXG4gICAgICogQHR5cGUgez9zdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuY29tbWVudCA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmluZyBmaWxlIG5hbWUuXHJcbiAgICAgKiBAdHlwZSB7P3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgdGhpcy5maWxlbmFtZSA9IG51bGw7XHJcbn1cclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlLCB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWZlcmVuY2UgdG8gdGhlIHJvb3QgbmFtZXNwYWNlLlxyXG4gICAgICogQG5hbWUgUmVmbGVjdGlvbk9iamVjdCNyb290XHJcbiAgICAgKiBAdHlwZSB7Um9vdH1cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICByb290OiB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHB0ciA9IHRoaXM7XHJcbiAgICAgICAgICAgIHdoaWxlIChwdHIucGFyZW50ICE9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgcHRyID0gcHRyLnBhcmVudDtcclxuICAgICAgICAgICAgcmV0dXJuIHB0cjtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRnVsbCBuYW1lIGluY2x1ZGluZyBsZWFkaW5nIGRvdC5cclxuICAgICAqIEBuYW1lIFJlZmxlY3Rpb25PYmplY3QjZnVsbE5hbWVcclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZnVsbE5hbWU6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgcGF0aCA9IFsgdGhpcy5uYW1lIF0sXHJcbiAgICAgICAgICAgICAgICBwdHIgPSB0aGlzLnBhcmVudDtcclxuICAgICAgICAgICAgd2hpbGUgKHB0cikge1xyXG4gICAgICAgICAgICAgICAgcGF0aC51bnNoaWZ0KHB0ci5uYW1lKTtcclxuICAgICAgICAgICAgICAgIHB0ciA9IHB0ci5wYXJlbnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHBhdGguam9pbihcIi5cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIHJlZmxlY3Rpb24gb2JqZWN0IHRvIGl0cyBkZXNjcmlwdG9yIHJlcHJlc2VudGF0aW9uLlxyXG4gKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IERlc2NyaXB0b3JcclxuICogQGFic3RyYWN0XHJcbiAqL1xyXG5SZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZS50b0pTT04gPSAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBmdW5jdGlvbiB0b0pTT04oKSB7XHJcbiAgICB0aHJvdyBFcnJvcigpOyAvLyBub3QgaW1wbGVtZW50ZWQsIHNob3VsZG4ndCBoYXBwZW5cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxsZWQgd2hlbiB0aGlzIG9iamVjdCBpcyBhZGRlZCB0byBhIHBhcmVudC5cclxuICogQHBhcmFtIHtSZWZsZWN0aW9uT2JqZWN0fSBwYXJlbnQgUGFyZW50IGFkZGVkIHRvXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5SZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZS5vbkFkZCA9IGZ1bmN0aW9uIG9uQWRkKHBhcmVudCkge1xyXG4gICAgaWYgKHRoaXMucGFyZW50ICYmIHRoaXMucGFyZW50ICE9PSBwYXJlbnQpXHJcbiAgICAgICAgdGhpcy5wYXJlbnQucmVtb3ZlKHRoaXMpO1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLnJlc29sdmVkID0gZmFsc2U7XHJcbiAgICB2YXIgcm9vdCA9IHBhcmVudC5yb290O1xyXG4gICAgaWYgKHJvb3QgaW5zdGFuY2VvZiBSb290KVxyXG4gICAgICAgIHJvb3QuX2hhbmRsZUFkZCh0aGlzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxsZWQgd2hlbiB0aGlzIG9iamVjdCBpcyByZW1vdmVkIGZyb20gYSBwYXJlbnQuXHJcbiAqIEBwYXJhbSB7UmVmbGVjdGlvbk9iamVjdH0gcGFyZW50IFBhcmVudCByZW1vdmVkIGZyb21cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlLm9uUmVtb3ZlID0gZnVuY3Rpb24gb25SZW1vdmUocGFyZW50KSB7XHJcbiAgICB2YXIgcm9vdCA9IHBhcmVudC5yb290O1xyXG4gICAgaWYgKHJvb3QgaW5zdGFuY2VvZiBSb290KVxyXG4gICAgICAgIHJvb3QuX2hhbmRsZVJlbW92ZSh0aGlzKTtcclxuICAgIHRoaXMucGFyZW50ID0gbnVsbDtcclxuICAgIHRoaXMucmVzb2x2ZWQgPSBmYWxzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNvbHZlcyB0aGlzIG9iamVjdHMgdHlwZSByZWZlcmVuY2VzLlxyXG4gKiBAcmV0dXJucyB7UmVmbGVjdGlvbk9iamVjdH0gYHRoaXNgXHJcbiAqL1xyXG5SZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24gcmVzb2x2ZSgpIHtcclxuICAgIGlmICh0aGlzLnJlc29sdmVkKVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgaWYgKHRoaXMucm9vdCBpbnN0YW5jZW9mIFJvb3QpXHJcbiAgICAgICAgdGhpcy5yZXNvbHZlZCA9IHRydWU7IC8vIG9ubHkgaWYgcGFydCBvZiBhIHJvb3RcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldHMgYW4gb3B0aW9uIHZhbHVlLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBPcHRpb24gbmFtZVxyXG4gKiBAcmV0dXJucyB7Kn0gT3B0aW9uIHZhbHVlIG9yIGB1bmRlZmluZWRgIGlmIG5vdCBzZXRcclxuICovXHJcblJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlLmdldE9wdGlvbiA9IGZ1bmN0aW9uIGdldE9wdGlvbihuYW1lKSB7XHJcbiAgICBpZiAodGhpcy5vcHRpb25zKVxyXG4gICAgICAgIHJldHVybiB0aGlzLm9wdGlvbnNbbmFtZV07XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldHMgYW4gb3B0aW9uLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBPcHRpb24gbmFtZVxyXG4gKiBAcGFyYW0geyp9IHZhbHVlIE9wdGlvbiB2YWx1ZVxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtpZk5vdFNldF0gU2V0cyB0aGUgb3B0aW9uIG9ubHkgaWYgaXQgaXNuJ3QgY3VycmVudGx5IHNldFxyXG4gKiBAcmV0dXJucyB7UmVmbGVjdGlvbk9iamVjdH0gYHRoaXNgXHJcbiAqL1xyXG5SZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZS5zZXRPcHRpb24gPSBmdW5jdGlvbiBzZXRPcHRpb24obmFtZSwgdmFsdWUsIGlmTm90U2V0KSB7XHJcbiAgICBpZiAoIWlmTm90U2V0IHx8ICF0aGlzLm9wdGlvbnMgfHwgdGhpcy5vcHRpb25zW25hbWVdID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgKHRoaXMub3B0aW9ucyB8fCAodGhpcy5vcHRpb25zID0ge30pKVtuYW1lXSA9IHZhbHVlO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0cyBtdWx0aXBsZSBvcHRpb25zLlxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvcHRpb25zIE9wdGlvbnMgdG8gc2V0XHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lmTm90U2V0XSBTZXRzIGFuIG9wdGlvbiBvbmx5IGlmIGl0IGlzbid0IGN1cnJlbnRseSBzZXRcclxuICogQHJldHVybnMge1JlZmxlY3Rpb25PYmplY3R9IGB0aGlzYFxyXG4gKi9cclxuUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHNldE9wdGlvbnMob3B0aW9ucywgaWZOb3RTZXQpIHtcclxuICAgIGlmIChvcHRpb25zKVxyXG4gICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhvcHRpb25zKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICB0aGlzLnNldE9wdGlvbihrZXlzW2ldLCBvcHRpb25zW2tleXNbaV1dLCBpZk5vdFNldCk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIGluc3RhbmNlIHRvIGl0cyBzdHJpbmcgcmVwcmVzZW50YXRpb24uXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IENsYXNzIG5hbWVbLCBzcGFjZSwgZnVsbCBuYW1lXVxyXG4gKi9cclxuUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcclxuICAgIHZhciBjbGFzc05hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLmNsYXNzTmFtZSxcclxuICAgICAgICBmdWxsTmFtZSAgPSB0aGlzLmZ1bGxOYW1lO1xyXG4gICAgaWYgKGZ1bGxOYW1lLmxlbmd0aClcclxuICAgICAgICByZXR1cm4gY2xhc3NOYW1lICsgXCIgXCIgKyBmdWxsTmFtZTtcclxuICAgIHJldHVybiBjbGFzc05hbWU7XHJcbn07XHJcblxyXG5SZWZsZWN0aW9uT2JqZWN0Ll9jb25maWd1cmUgPSBmdW5jdGlvbihSb290Xykge1xyXG4gICAgUm9vdCA9IFJvb3RfO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBPbmVPZjtcclxuXHJcbi8vIGV4dGVuZHMgUmVmbGVjdGlvbk9iamVjdFxyXG52YXIgUmVmbGVjdGlvbk9iamVjdCA9IHJlcXVpcmUoXCIuL29iamVjdFwiKTtcclxuKChPbmVPZi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBPbmVPZikuY2xhc3NOYW1lID0gXCJPbmVPZlwiO1xyXG5cclxudmFyIEZpZWxkID0gcmVxdWlyZShcIi4vZmllbGRcIik7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBvbmVvZiBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBSZWZsZWN0ZWQgb25lb2YuXHJcbiAqIEBleHRlbmRzIFJlZmxlY3Rpb25PYmplY3RcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE9uZW9mIG5hbWVcclxuICogQHBhcmFtIHtzdHJpbmdbXXxPYmplY3QuPHN0cmluZywqPn0gW2ZpZWxkTmFtZXNdIEZpZWxkIG5hbWVzXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBEZWNsYXJlZCBvcHRpb25zXHJcbiAqL1xyXG5mdW5jdGlvbiBPbmVPZihuYW1lLCBmaWVsZE5hbWVzLCBvcHRpb25zKSB7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoZmllbGROYW1lcykpIHtcclxuICAgICAgICBvcHRpb25zID0gZmllbGROYW1lcztcclxuICAgICAgICBmaWVsZE5hbWVzID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gICAgUmVmbGVjdGlvbk9iamVjdC5jYWxsKHRoaXMsIG5hbWUsIG9wdGlvbnMpO1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKCEoZmllbGROYW1lcyA9PT0gdW5kZWZpbmVkIHx8IEFycmF5LmlzQXJyYXkoZmllbGROYW1lcykpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcImZpZWxkTmFtZXMgbXVzdCBiZSBhbiBBcnJheVwiKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpZWxkIG5hbWVzIHRoYXQgYmVsb25nIHRvIHRoaXMgb25lb2YuXHJcbiAgICAgKiBAdHlwZSB7c3RyaW5nW119XHJcbiAgICAgKi9cclxuICAgIHRoaXMub25lb2YgPSBmaWVsZE5hbWVzIHx8IFtdOyAvLyB0b0pTT04sIG1hcmtlclxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmllbGRzIHRoYXQgYmVsb25nIHRvIHRoaXMgb25lb2YgYXMgYW4gYXJyYXkgZm9yIGl0ZXJhdGlvbi5cclxuICAgICAqIEB0eXBlIHtGaWVsZFtdfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZmllbGRzQXJyYXkgPSBbXTsgLy8gZGVjbGFyZWQgcmVhZG9ubHkgZm9yIGNvbmZvcm1hbmNlLCBwb3NzaWJseSBub3QgeWV0IGFkZGVkIHRvIHBhcmVudFxyXG59XHJcblxyXG4vKipcclxuICogT25lb2YgZGVzY3JpcHRvci5cclxuICogQHR5cGVkZWYgT25lT2ZEZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7QXJyYXkuPHN0cmluZz59IG9uZW9mIE9uZW9mIGZpZWxkIG5hbWVzXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBPbmVvZiBvcHRpb25zXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBvbmVvZiBmcm9tIGEgb25lb2YgZGVzY3JpcHRvci5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgT25lb2YgbmFtZVxyXG4gKiBAcGFyYW0ge09uZU9mRGVzY3JpcHRvcn0ganNvbiBPbmVvZiBkZXNjcmlwdG9yXHJcbiAqIEByZXR1cm5zIHtPbmVPZn0gQ3JlYXRlZCBvbmVvZlxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGFyZ3VtZW50cyBhcmUgaW52YWxpZFxyXG4gKi9cclxuT25lT2YuZnJvbUpTT04gPSBmdW5jdGlvbiBmcm9tSlNPTihuYW1lLCBqc29uKSB7XHJcbiAgICByZXR1cm4gbmV3IE9uZU9mKG5hbWUsIGpzb24ub25lb2YsIGpzb24ub3B0aW9ucyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhpcyBvbmVvZiB0byBhIG9uZW9mIGRlc2NyaXB0b3IuXHJcbiAqIEByZXR1cm5zIHtPbmVPZkRlc2NyaXB0b3J9IE9uZW9mIGRlc2NyaXB0b3JcclxuICovXHJcbk9uZU9mLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIG9uZW9mICAgOiB0aGlzLm9uZW9mLFxyXG4gICAgICAgIG9wdGlvbnMgOiB0aGlzLm9wdGlvbnNcclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyB0aGUgZmllbGRzIG9mIHRoZSBzcGVjaWZpZWQgb25lb2YgdG8gdGhlIHBhcmVudCBpZiBub3QgYWxyZWFkeSBkb25lIHNvLlxyXG4gKiBAcGFyYW0ge09uZU9mfSBvbmVvZiBUaGUgb25lb2ZcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQGlubmVyXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIGFkZEZpZWxkc1RvUGFyZW50KG9uZW9mKSB7XHJcbiAgICBpZiAob25lb2YucGFyZW50KVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb25lb2YuZmllbGRzQXJyYXkubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgIGlmICghb25lb2YuZmllbGRzQXJyYXlbaV0ucGFyZW50KVxyXG4gICAgICAgICAgICAgICAgb25lb2YucGFyZW50LmFkZChvbmVvZi5maWVsZHNBcnJheVtpXSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgZmllbGQgdG8gdGhpcyBvbmVvZiBhbmQgcmVtb3ZlcyBpdCBmcm9tIGl0cyBjdXJyZW50IHBhcmVudCwgaWYgYW55LlxyXG4gKiBAcGFyYW0ge0ZpZWxkfSBmaWVsZCBGaWVsZCB0byBhZGRcclxuICogQHJldHVybnMge09uZU9mfSBgdGhpc2BcclxuICovXHJcbk9uZU9mLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQoZmllbGQpIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICghKGZpZWxkIGluc3RhbmNlb2YgRmllbGQpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcImZpZWxkIG11c3QgYmUgYSBGaWVsZFwiKTtcclxuXHJcbiAgICBpZiAoZmllbGQucGFyZW50ICYmIGZpZWxkLnBhcmVudCAhPT0gdGhpcy5wYXJlbnQpXHJcbiAgICAgICAgZmllbGQucGFyZW50LnJlbW92ZShmaWVsZCk7XHJcbiAgICB0aGlzLm9uZW9mLnB1c2goZmllbGQubmFtZSk7XHJcbiAgICB0aGlzLmZpZWxkc0FycmF5LnB1c2goZmllbGQpO1xyXG4gICAgZmllbGQucGFydE9mID0gdGhpczsgLy8gZmllbGQucGFyZW50IHJlbWFpbnMgbnVsbFxyXG4gICAgYWRkRmllbGRzVG9QYXJlbnQodGhpcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmVzIGEgZmllbGQgZnJvbSB0aGlzIG9uZW9mIGFuZCBwdXRzIGl0IGJhY2sgdG8gdGhlIG9uZW9mJ3MgcGFyZW50LlxyXG4gKiBAcGFyYW0ge0ZpZWxkfSBmaWVsZCBGaWVsZCB0byByZW1vdmVcclxuICogQHJldHVybnMge09uZU9mfSBgdGhpc2BcclxuICovXHJcbk9uZU9mLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUoZmllbGQpIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICghKGZpZWxkIGluc3RhbmNlb2YgRmllbGQpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcImZpZWxkIG11c3QgYmUgYSBGaWVsZFwiKTtcclxuXHJcbiAgICB2YXIgaW5kZXggPSB0aGlzLmZpZWxkc0FycmF5LmluZGV4T2YoZmllbGQpO1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKGluZGV4IDwgMClcclxuICAgICAgICB0aHJvdyBFcnJvcihmaWVsZCArIFwiIGlzIG5vdCBhIG1lbWJlciBvZiBcIiArIHRoaXMpO1xyXG5cclxuICAgIHRoaXMuZmllbGRzQXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgIGluZGV4ID0gdGhpcy5vbmVvZi5pbmRleE9mKGZpZWxkLm5hbWUpO1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZiAoaW5kZXggPiAtMSkgLy8gdGhlb3JldGljYWxcclxuICAgICAgICB0aGlzLm9uZW9mLnNwbGljZShpbmRleCwgMSk7XHJcblxyXG4gICAgZmllbGQucGFydE9mID0gbnVsbDtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuT25lT2YucHJvdG90eXBlLm9uQWRkID0gZnVuY3Rpb24gb25BZGQocGFyZW50KSB7XHJcbiAgICBSZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZS5vbkFkZC5jYWxsKHRoaXMsIHBhcmVudCk7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAvLyBDb2xsZWN0IHByZXNlbnQgZmllbGRzXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMub25lb2YubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICB2YXIgZmllbGQgPSBwYXJlbnQuZ2V0KHRoaXMub25lb2ZbaV0pO1xyXG4gICAgICAgIGlmIChmaWVsZCAmJiAhZmllbGQucGFydE9mKSB7XHJcbiAgICAgICAgICAgIGZpZWxkLnBhcnRPZiA9IHNlbGY7XHJcbiAgICAgICAgICAgIHNlbGYuZmllbGRzQXJyYXkucHVzaChmaWVsZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gQWRkIG5vdCB5ZXQgcHJlc2VudCBmaWVsZHNcclxuICAgIGFkZEZpZWxkc1RvUGFyZW50KHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuT25lT2YucHJvdG90eXBlLm9uUmVtb3ZlID0gZnVuY3Rpb24gb25SZW1vdmUocGFyZW50KSB7XHJcbiAgICBmb3IgKHZhciBpID0gMCwgZmllbGQ7IGkgPCB0aGlzLmZpZWxkc0FycmF5Lmxlbmd0aDsgKytpKVxyXG4gICAgICAgIGlmICgoZmllbGQgPSB0aGlzLmZpZWxkc0FycmF5W2ldKS5wYXJlbnQpXHJcbiAgICAgICAgICAgIGZpZWxkLnBhcmVudC5yZW1vdmUoZmllbGQpO1xyXG4gICAgUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUub25SZW1vdmUuY2FsbCh0aGlzLCBwYXJlbnQpO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZTtcclxuXHJcbnBhcnNlLmZpbGVuYW1lID0gbnVsbDtcclxucGFyc2UuZGVmYXVsdHMgPSB7IGtlZXBDYXNlOiBmYWxzZSB9O1xyXG5cclxudmFyIHRva2VuaXplICA9IHJlcXVpcmUoXCIuL3Rva2VuaXplXCIpLFxyXG4gICAgUm9vdCAgICAgID0gcmVxdWlyZShcIi4vcm9vdFwiKSxcclxuICAgIFR5cGUgICAgICA9IHJlcXVpcmUoXCIuL3R5cGVcIiksXHJcbiAgICBGaWVsZCAgICAgPSByZXF1aXJlKFwiLi9maWVsZFwiKSxcclxuICAgIE1hcEZpZWxkICA9IHJlcXVpcmUoXCIuL21hcGZpZWxkXCIpLFxyXG4gICAgT25lT2YgICAgID0gcmVxdWlyZShcIi4vb25lb2ZcIiksXHJcbiAgICBFbnVtICAgICAgPSByZXF1aXJlKFwiLi9lbnVtXCIpLFxyXG4gICAgU2VydmljZSAgID0gcmVxdWlyZShcIi4vc2VydmljZVwiKSxcclxuICAgIE1ldGhvZCAgICA9IHJlcXVpcmUoXCIuL21ldGhvZFwiKSxcclxuICAgIHR5cGVzICAgICA9IHJlcXVpcmUoXCIuL3R5cGVzXCIpLFxyXG4gICAgdXRpbCAgICAgID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcclxuXHJcbnZhciBiYXNlMTBSZSAgICA9IC9eWzEtOV1bMC05XSokLyxcclxuICAgIGJhc2UxME5lZ1JlID0gL14tP1sxLTldWzAtOV0qJC8sXHJcbiAgICBiYXNlMTZSZSAgICA9IC9eMFt4XVswLTlhLWZBLUZdKyQvLFxyXG4gICAgYmFzZTE2TmVnUmUgPSAvXi0/MFt4XVswLTlhLWZBLUZdKyQvLFxyXG4gICAgYmFzZThSZSAgICAgPSAvXjBbMC03XSskLyxcclxuICAgIGJhc2U4TmVnUmUgID0gL14tPzBbMC03XSskLyxcclxuICAgIG51bWJlclJlICAgID0gL14oPyFbZUVdKVswLTldKig/OlxcLlswLTldKik/KD86W2VFXVsrLV0/WzAtOV0rKT8kLyxcclxuICAgIG5hbWVSZSAgICAgID0gL15bYS16QS1aX11bYS16QS1aXzAtOV0qJC8sXHJcbiAgICB0eXBlUmVmUmUgICA9IC9eKD86XFwuP1thLXpBLVpfXVthLXpBLVpfMC05XSopKyQvLFxyXG4gICAgZnFUeXBlUmVmUmUgPSAvXig/OlxcLlthLXpBLVpdW2EtekEtWl8wLTldKikrJC87XHJcblxyXG52YXIgY2FtZWxDYXNlUmUgPSAvXyhbYS16XSkvZztcclxuXHJcbmZ1bmN0aW9uIGNhbWVsQ2FzZShzdHIpIHtcclxuICAgIHJldHVybiBzdHIuc3Vic3RyaW5nKDAsMSlcclxuICAgICAgICAgKyBzdHIuc3Vic3RyaW5nKDEpXHJcbiAgICAgICAgICAgICAgIC5yZXBsYWNlKGNhbWVsQ2FzZVJlLCBmdW5jdGlvbigkMCwgJDEpIHsgcmV0dXJuICQxLnRvVXBwZXJDYXNlKCk7IH0pO1xyXG59XHJcblxyXG4vKipcclxuICogUmVzdWx0IG9iamVjdCByZXR1cm5lZCBmcm9tIHtAbGluayBwYXJzZX0uXHJcbiAqIEB0eXBlZGVmIFBhcnNlclJlc3VsdFxyXG4gKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsKj59XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfHVuZGVmaW5lZH0gcGFja2FnZSBQYWNrYWdlIG5hbWUsIGlmIGRlY2xhcmVkXHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nW118dW5kZWZpbmVkfSBpbXBvcnRzIEltcG9ydHMsIGlmIGFueVxyXG4gKiBAcHJvcGVydHkge3N0cmluZ1tdfHVuZGVmaW5lZH0gd2Vha0ltcG9ydHMgV2VhayBpbXBvcnRzLCBpZiBhbnlcclxuICogQHByb3BlcnR5IHtzdHJpbmd8dW5kZWZpbmVkfSBzeW50YXggU3ludGF4LCBpZiBzcGVjaWZpZWQgKGVpdGhlciBgXCJwcm90bzJcImAgb3IgYFwicHJvdG8zXCJgKVxyXG4gKiBAcHJvcGVydHkge1Jvb3R9IHJvb3QgUG9wdWxhdGVkIHJvb3QgaW5zdGFuY2VcclxuICovXHJcblxyXG4vKipcclxuICogT3B0aW9ucyBtb2RpZnlpbmcgdGhlIGJlaGF2aW9yIG9mIHtAbGluayBwYXJzZX0uXHJcbiAqIEB0eXBlZGVmIFBhcnNlT3B0aW9uc1xyXG4gKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsKj59XHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2tlZXBDYXNlPWZhbHNlXSBLZWVwcyBmaWVsZCBjYXNpbmcgaW5zdGVhZCBvZiBjb252ZXJ0aW5nIHRvIGNhbWVsIGNhc2VcclxuICovXHJcblxyXG4vKipcclxuICogUGFyc2VzIHRoZSBnaXZlbiAucHJvdG8gc291cmNlIGFuZCByZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBwYXJzZWQgY29udGVudHMuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc291cmNlIFNvdXJjZSBjb250ZW50c1xyXG4gKiBAcGFyYW0ge1Jvb3R9IHJvb3QgUm9vdCB0byBwb3B1bGF0ZVxyXG4gKiBAcGFyYW0ge1BhcnNlT3B0aW9uc30gW29wdGlvbnNdIFBhcnNlIG9wdGlvbnMuIERlZmF1bHRzIHRvIHtAbGluayBwYXJzZS5kZWZhdWx0c30gd2hlbiBvbWl0dGVkLlxyXG4gKiBAcmV0dXJucyB7UGFyc2VyUmVzdWx0fSBQYXJzZXIgcmVzdWx0XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBmaWxlbmFtZT1udWxsIEN1cnJlbnRseSBwcm9jZXNzaW5nIGZpbGUgbmFtZSBmb3IgZXJyb3IgcmVwb3J0aW5nLCBpZiBrbm93blxyXG4gKiBAcHJvcGVydHkge1BhcnNlT3B0aW9uc30gZGVmYXVsdHMgRGVmYXVsdCB7QGxpbmsgUGFyc2VPcHRpb25zfVxyXG4gKi9cclxuZnVuY3Rpb24gcGFyc2Uoc291cmNlLCByb290LCBvcHRpb25zKSB7XHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBjYWxsYmFjay1yZXR1cm4gKi9cclxuICAgIGlmICghKHJvb3QgaW5zdGFuY2VvZiBSb290KSkge1xyXG4gICAgICAgIG9wdGlvbnMgPSByb290O1xyXG4gICAgICAgIHJvb3QgPSBuZXcgUm9vdCgpO1xyXG4gICAgfVxyXG4gICAgaWYgKCFvcHRpb25zKVxyXG4gICAgICAgIG9wdGlvbnMgPSBwYXJzZS5kZWZhdWx0cztcclxuXHJcbiAgICB2YXIgdG4gPSB0b2tlbml6ZShzb3VyY2UpLFxyXG4gICAgICAgIG5leHQgPSB0bi5uZXh0LFxyXG4gICAgICAgIHB1c2ggPSB0bi5wdXNoLFxyXG4gICAgICAgIHBlZWsgPSB0bi5wZWVrLFxyXG4gICAgICAgIHNraXAgPSB0bi5za2lwLFxyXG4gICAgICAgIGNtbnQgPSB0bi5jbW50O1xyXG5cclxuICAgIHZhciBoZWFkID0gdHJ1ZSxcclxuICAgICAgICBwa2csXHJcbiAgICAgICAgaW1wb3J0cyxcclxuICAgICAgICB3ZWFrSW1wb3J0cyxcclxuICAgICAgICBzeW50YXgsXHJcbiAgICAgICAgaXNQcm90bzMgPSBmYWxzZTtcclxuXHJcbiAgICB2YXIgcHRyID0gcm9vdDtcclxuXHJcbiAgICB2YXIgYXBwbHlDYXNlID0gb3B0aW9ucy5rZWVwQ2FzZSA/IGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIG5hbWU7IH0gOiBjYW1lbENhc2U7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIGZ1bmN0aW9uIGlsbGVnYWwodG9rZW4sIG5hbWUsIGluc2lkZVRyeUNhdGNoKSB7XHJcbiAgICAgICAgdmFyIGZpbGVuYW1lID0gcGFyc2UuZmlsZW5hbWU7XHJcbiAgICAgICAgaWYgKCFpbnNpZGVUcnlDYXRjaClcclxuICAgICAgICAgICAgcGFyc2UuZmlsZW5hbWUgPSBudWxsO1xyXG4gICAgICAgIHJldHVybiBFcnJvcihcImlsbGVnYWwgXCIgKyAobmFtZSB8fCBcInRva2VuXCIpICsgXCIgJ1wiICsgdG9rZW4gKyBcIicgKFwiICsgKGZpbGVuYW1lID8gZmlsZW5hbWUgKyBcIiwgXCIgOiBcIlwiKSArIFwibGluZSBcIiArIHRuLmxpbmUoKSArIFwiKVwiKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByZWFkU3RyaW5nKCkge1xyXG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXSxcclxuICAgICAgICAgICAgdG9rZW47XHJcbiAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICAgICAgaWYgKCh0b2tlbiA9IG5leHQoKSkgIT09IFwiXFxcIlwiICYmIHRva2VuICE9PSBcIidcIilcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG5cclxuICAgICAgICAgICAgdmFsdWVzLnB1c2gobmV4dCgpKTtcclxuICAgICAgICAgICAgc2tpcCh0b2tlbik7XHJcbiAgICAgICAgICAgIHRva2VuID0gcGVlaygpO1xyXG4gICAgICAgIH0gd2hpbGUgKHRva2VuID09PSBcIlxcXCJcIiB8fCB0b2tlbiA9PT0gXCInXCIpO1xyXG4gICAgICAgIHJldHVybiB2YWx1ZXMuam9pbihcIlwiKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByZWFkVmFsdWUoYWNjZXB0VHlwZVJlZikge1xyXG4gICAgICAgIHZhciB0b2tlbiA9IG5leHQoKTtcclxuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCInXCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJcXFwiXCI6XHJcbiAgICAgICAgICAgICAgICBwdXNoKHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZWFkU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ0cnVlXCI6IGNhc2UgXCJUUlVFXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgY2FzZSBcImZhbHNlXCI6IGNhc2UgXCJGQUxTRVwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZXR1cm4gcGFyc2VOdW1iZXIodG9rZW4sIC8qIGluc2lkZVRyeUNhdGNoICovIHRydWUpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuXHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgIGlmIChhY2NlcHRUeXBlUmVmICYmIHR5cGVSZWZSZS50ZXN0KHRva2VuKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcclxuXHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4sIFwidmFsdWVcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlYWRSYW5nZXModGFyZ2V0LCBhY2NlcHRTdHJpbmdzKSB7XHJcbiAgICAgICAgdmFyIHRva2VuLCBzdGFydDtcclxuICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgIGlmIChhY2NlcHRTdHJpbmdzICYmICgodG9rZW4gPSBwZWVrKCkpID09PSBcIlxcXCJcIiB8fCB0b2tlbiA9PT0gXCInXCIpKVxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0LnB1c2gocmVhZFN0cmluZygpKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0LnB1c2goWyBzdGFydCA9IHBhcnNlSWQobmV4dCgpKSwgc2tpcChcInRvXCIsIHRydWUpID8gcGFyc2VJZChuZXh0KCkpIDogc3RhcnQgXSk7XHJcbiAgICAgICAgfSB3aGlsZSAoc2tpcChcIixcIiwgdHJ1ZSkpO1xyXG4gICAgICAgIHNraXAoXCI7XCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlTnVtYmVyKHRva2VuLCBpbnNpZGVUcnlDYXRjaCkge1xyXG4gICAgICAgIHZhciBzaWduID0gMTtcclxuICAgICAgICBpZiAodG9rZW4uY2hhckF0KDApID09PSBcIi1cIikge1xyXG4gICAgICAgICAgICBzaWduID0gLTE7XHJcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4uc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJpbmZcIjogY2FzZSBcIklORlwiOiBjYXNlIFwiSW5mXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiAqIEluZmluaXR5O1xyXG4gICAgICAgICAgICBjYXNlIFwibmFuXCI6IGNhc2UgXCJOQU5cIjogY2FzZSBcIk5hblwiOiBjYXNlIFwiTmFOXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTmFOO1xyXG4gICAgICAgICAgICBjYXNlIFwiMFwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChiYXNlMTBSZS50ZXN0KHRva2VuKSlcclxuICAgICAgICAgICAgcmV0dXJuIHNpZ24gKiBwYXJzZUludCh0b2tlbiwgMTApO1xyXG4gICAgICAgIGlmIChiYXNlMTZSZS50ZXN0KHRva2VuKSlcclxuICAgICAgICAgICAgcmV0dXJuIHNpZ24gKiBwYXJzZUludCh0b2tlbiwgMTYpO1xyXG4gICAgICAgIGlmIChiYXNlOFJlLnRlc3QodG9rZW4pKVxyXG4gICAgICAgICAgICByZXR1cm4gc2lnbiAqIHBhcnNlSW50KHRva2VuLCA4KTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICBpZiAobnVtYmVyUmUudGVzdCh0b2tlbikpXHJcbiAgICAgICAgICAgIHJldHVybiBzaWduICogcGFyc2VGbG9hdCh0b2tlbik7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbiwgXCJudW1iZXJcIiwgaW5zaWRlVHJ5Q2F0Y2gpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlSWQodG9rZW4sIGFjY2VwdE5lZ2F0aXZlKSB7XHJcbiAgICAgICAgc3dpdGNoICh0b2tlbikge1xyXG4gICAgICAgICAgICBjYXNlIFwibWF4XCI6IGNhc2UgXCJNQVhcIjogY2FzZSBcIk1heFwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIDUzNjg3MDkxMTtcclxuICAgICAgICAgICAgY2FzZSBcIjBcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCFhY2NlcHROZWdhdGl2ZSAmJiB0b2tlbi5jaGFyQXQoMCkgPT09IFwiLVwiKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuLCBcImlkXCIpO1xyXG5cclxuICAgICAgICBpZiAoYmFzZTEwTmVnUmUudGVzdCh0b2tlbikpXHJcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh0b2tlbiwgMTApO1xyXG4gICAgICAgIGlmIChiYXNlMTZOZWdSZS50ZXN0KHRva2VuKSlcclxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHRva2VuLCAxNik7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYgKGJhc2U4TmVnUmUudGVzdCh0b2tlbikpXHJcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh0b2tlbiwgOCk7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbiwgXCJpZFwiKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZVBhY2thZ2UoKSB7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmIChwa2cgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbChcInBhY2thZ2VcIik7XHJcblxyXG4gICAgICAgIHBrZyA9IG5leHQoKTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCF0eXBlUmVmUmUudGVzdChwa2cpKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHBrZywgXCJuYW1lXCIpO1xyXG5cclxuICAgICAgICBwdHIgPSBwdHIuZGVmaW5lKHBrZyk7XHJcbiAgICAgICAgc2tpcChcIjtcIik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VJbXBvcnQoKSB7XHJcbiAgICAgICAgdmFyIHRva2VuID0gcGVlaygpO1xyXG4gICAgICAgIHZhciB3aGljaEltcG9ydHM7XHJcbiAgICAgICAgc3dpdGNoICh0b2tlbikge1xyXG4gICAgICAgICAgICBjYXNlIFwid2Vha1wiOlxyXG4gICAgICAgICAgICAgICAgd2hpY2hJbXBvcnRzID0gd2Vha0ltcG9ydHMgfHwgKHdlYWtJbXBvcnRzID0gW10pO1xyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJwdWJsaWNcIjpcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZmFsbHRocm91Z2hcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHdoaWNoSW1wb3J0cyA9IGltcG9ydHMgfHwgKGltcG9ydHMgPSBbXSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgdG9rZW4gPSByZWFkU3RyaW5nKCk7XHJcbiAgICAgICAgc2tpcChcIjtcIik7XHJcbiAgICAgICAgd2hpY2hJbXBvcnRzLnB1c2godG9rZW4pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlU3ludGF4KCkge1xyXG4gICAgICAgIHNraXAoXCI9XCIpO1xyXG4gICAgICAgIHN5bnRheCA9IHJlYWRTdHJpbmcoKTtcclxuICAgICAgICBpc1Byb3RvMyA9IHN5bnRheCA9PT0gXCJwcm90bzNcIjtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCFpc1Byb3RvMyAmJiBzeW50YXggIT09IFwicHJvdG8yXCIpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwoc3ludGF4LCBcInN5bnRheFwiKTtcclxuXHJcbiAgICAgICAgc2tpcChcIjtcIik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VDb21tb24ocGFyZW50LCB0b2tlbikge1xyXG4gICAgICAgIHN3aXRjaCAodG9rZW4pIHtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJvcHRpb25cIjpcclxuICAgICAgICAgICAgICAgIHBhcnNlT3B0aW9uKHBhcmVudCwgdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgc2tpcChcIjtcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJtZXNzYWdlXCI6XHJcbiAgICAgICAgICAgICAgICBwYXJzZVR5cGUocGFyZW50LCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJlbnVtXCI6XHJcbiAgICAgICAgICAgICAgICBwYXJzZUVudW0ocGFyZW50LCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJzZXJ2aWNlXCI6XHJcbiAgICAgICAgICAgICAgICBwYXJzZVNlcnZpY2UocGFyZW50LCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJleHRlbmRcIjpcclxuICAgICAgICAgICAgICAgIHBhcnNlRXh0ZW5zaW9uKHBhcmVudCwgdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpZkJsb2NrKG9iaiwgZm5JZiwgZm5FbHNlKSB7XHJcbiAgICAgICAgdmFyIHRyYWlsaW5nTGluZSA9IHRuLmxpbmUoKTtcclxuICAgICAgICBpZiAob2JqKSB7XHJcbiAgICAgICAgICAgIG9iai5jb21tZW50ID0gY21udCgpOyAvLyB0cnkgYmxvY2stdHlwZSBjb21tZW50XHJcbiAgICAgICAgICAgIG9iai5maWxlbmFtZSA9IHBhcnNlLmZpbGVuYW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoc2tpcChcIntcIiwgdHJ1ZSkpIHtcclxuICAgICAgICAgICAgdmFyIHRva2VuO1xyXG4gICAgICAgICAgICB3aGlsZSAoKHRva2VuID0gbmV4dCgpKSAhPT0gXCJ9XCIpXHJcbiAgICAgICAgICAgICAgICBmbklmKHRva2VuKTtcclxuICAgICAgICAgICAgc2tpcChcIjtcIiwgdHJ1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGZuRWxzZSlcclxuICAgICAgICAgICAgICAgIGZuRWxzZSgpO1xyXG4gICAgICAgICAgICBza2lwKFwiO1wiKTtcclxuICAgICAgICAgICAgaWYgKG9iaiAmJiB0eXBlb2Ygb2JqLmNvbW1lbnQgIT09IFwic3RyaW5nXCIpXHJcbiAgICAgICAgICAgICAgICBvYmouY29tbWVudCA9IGNtbnQodHJhaWxpbmdMaW5lKTsgLy8gdHJ5IGxpbmUtdHlwZSBjb21tZW50IGlmIG5vIGJsb2NrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlVHlwZShwYXJlbnQsIHRva2VuKSB7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghbmFtZVJlLnRlc3QodG9rZW4gPSBuZXh0KCkpKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuLCBcInR5cGUgbmFtZVwiKTtcclxuXHJcbiAgICAgICAgdmFyIHR5cGUgPSBuZXcgVHlwZSh0b2tlbik7XHJcbiAgICAgICAgaWZCbG9jayh0eXBlLCBmdW5jdGlvbiBwYXJzZVR5cGVfYmxvY2sodG9rZW4pIHtcclxuICAgICAgICAgICAgaWYgKHBhcnNlQ29tbW9uKHR5cGUsIHRva2VuKSlcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW4pIHtcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIFwibWFwXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VNYXBGaWVsZCh0eXBlLCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJlcXVpcmVkXCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwib3B0aW9uYWxcIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJyZXBlYXRlZFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlRmllbGQodHlwZSwgdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJvbmVvZlwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlT25lT2YodHlwZSwgdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJleHRlbnNpb25zXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZFJhbmdlcyh0eXBlLmV4dGVuc2lvbnMgfHwgKHR5cGUuZXh0ZW5zaW9ucyA9IFtdKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJlc2VydmVkXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZFJhbmdlcyh0eXBlLnJlc2VydmVkIHx8ICh0eXBlLnJlc2VydmVkID0gW10pLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNQcm90bzMgfHwgIXR5cGVSZWZSZS50ZXN0KHRva2VuKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHB1c2godG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlRmllbGQodHlwZSwgXCJvcHRpb25hbFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHBhcmVudC5hZGQodHlwZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VGaWVsZChwYXJlbnQsIHJ1bGUsIGV4dGVuZCkge1xyXG4gICAgICAgIHZhciB0eXBlID0gbmV4dCgpO1xyXG4gICAgICAgIGlmICh0eXBlID09PSBcImdyb3VwXCIpIHtcclxuICAgICAgICAgICAgcGFyc2VHcm91cChwYXJlbnQsIHJ1bGUpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIXR5cGVSZWZSZS50ZXN0KHR5cGUpKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHR5cGUsIFwidHlwZVwiKTtcclxuXHJcbiAgICAgICAgdmFyIG5hbWUgPSBuZXh0KCk7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghbmFtZVJlLnRlc3QobmFtZSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwobmFtZSwgXCJuYW1lXCIpO1xyXG5cclxuICAgICAgICBuYW1lID0gYXBwbHlDYXNlKG5hbWUpO1xyXG4gICAgICAgIHNraXAoXCI9XCIpO1xyXG5cclxuICAgICAgICB2YXIgZmllbGQgPSBuZXcgRmllbGQobmFtZSwgcGFyc2VJZChuZXh0KCkpLCB0eXBlLCBydWxlLCBleHRlbmQpO1xyXG4gICAgICAgIGlmQmxvY2soZmllbGQsIGZ1bmN0aW9uIHBhcnNlRmllbGRfYmxvY2sodG9rZW4pIHtcclxuXHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgIGlmICh0b2tlbiA9PT0gXCJvcHRpb25cIikge1xyXG4gICAgICAgICAgICAgICAgcGFyc2VPcHRpb24oZmllbGQsIHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHNraXAoXCI7XCIpO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG5cclxuICAgICAgICB9LCBmdW5jdGlvbiBwYXJzZUZpZWxkX2xpbmUoKSB7XHJcbiAgICAgICAgICAgIHBhcnNlSW5saW5lT3B0aW9ucyhmaWVsZCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcGFyZW50LmFkZChmaWVsZCk7XHJcblxyXG4gICAgICAgIC8vIEpTT04gZGVmYXVsdHMgdG8gcGFja2VkPXRydWUgaWYgbm90IHNldCBzbyB3ZSBoYXZlIHRvIHNldCBwYWNrZWQ9ZmFsc2UgZXhwbGljaXR5IHdoZW5cclxuICAgICAgICAvLyBwYXJzaW5nIHByb3RvMiBkZXNjcmlwdG9ycyB3aXRob3V0IHRoZSBvcHRpb24sIHdoZXJlIGFwcGxpY2FibGUuIFRoaXMgbXVzdCBiZSBkb25lIGZvclxyXG4gICAgICAgIC8vIGFueSB0eXBlIChub3QganVzdCBwYWNrYWJsZSB0eXBlcykgYmVjYXVzZSBlbnVtcyBhbHNvIHVzZSB2YXJpbnQgZW5jb2RpbmcgYW5kIGl0IGlzIG5vdFxyXG4gICAgICAgIC8vIHlldCBrbm93biB3aGV0aGVyIGEgdHlwZSBpcyBhbiBlbnVtIG9yIG5vdC5cclxuICAgICAgICBpZiAoIWlzUHJvdG8zICYmIGZpZWxkLnJlcGVhdGVkKVxyXG4gICAgICAgICAgICBmaWVsZC5zZXRPcHRpb24oXCJwYWNrZWRcIiwgZmFsc2UsIC8qIGlmTm90U2V0ICovIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlR3JvdXAocGFyZW50LCBydWxlKSB7XHJcbiAgICAgICAgdmFyIG5hbWUgPSBuZXh0KCk7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghbmFtZVJlLnRlc3QobmFtZSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwobmFtZSwgXCJuYW1lXCIpO1xyXG5cclxuICAgICAgICB2YXIgZmllbGROYW1lID0gdXRpbC5sY0ZpcnN0KG5hbWUpO1xyXG4gICAgICAgIGlmIChuYW1lID09PSBmaWVsZE5hbWUpXHJcbiAgICAgICAgICAgIG5hbWUgPSB1dGlsLnVjRmlyc3QobmFtZSk7XHJcbiAgICAgICAgc2tpcChcIj1cIik7XHJcbiAgICAgICAgdmFyIGlkID0gcGFyc2VJZChuZXh0KCkpO1xyXG4gICAgICAgIHZhciB0eXBlID0gbmV3IFR5cGUobmFtZSk7XHJcbiAgICAgICAgdHlwZS5ncm91cCA9IHRydWU7XHJcbiAgICAgICAgdmFyIGZpZWxkID0gbmV3IEZpZWxkKGZpZWxkTmFtZSwgaWQsIG5hbWUsIHJ1bGUpO1xyXG4gICAgICAgIGZpZWxkLmZpbGVuYW1lID0gcGFyc2UuZmlsZW5hbWU7XHJcbiAgICAgICAgaWZCbG9jayh0eXBlLCBmdW5jdGlvbiBwYXJzZUdyb3VwX2Jsb2NrKHRva2VuKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW4pIHtcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIFwib3B0aW9uXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VPcHRpb24odHlwZSwgdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIHNraXAoXCI7XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJyZXF1aXJlZFwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIm9wdGlvbmFsXCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVwZWF0ZWRcIjpcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZUZpZWxkKHR5cGUsIHRva2VuKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTsgLy8gdGhlcmUgYXJlIG5vIGdyb3VwcyB3aXRoIHByb3RvMyBzZW1hbnRpY3NcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHBhcmVudC5hZGQodHlwZSlcclxuICAgICAgICAgICAgICAuYWRkKGZpZWxkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZU1hcEZpZWxkKHBhcmVudCkge1xyXG4gICAgICAgIHNraXAoXCI8XCIpO1xyXG4gICAgICAgIHZhciBrZXlUeXBlID0gbmV4dCgpO1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAodHlwZXMubWFwS2V5W2tleVR5cGVdID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwoa2V5VHlwZSwgXCJ0eXBlXCIpO1xyXG5cclxuICAgICAgICBza2lwKFwiLFwiKTtcclxuICAgICAgICB2YXIgdmFsdWVUeXBlID0gbmV4dCgpO1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIXR5cGVSZWZSZS50ZXN0KHZhbHVlVHlwZSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodmFsdWVUeXBlLCBcInR5cGVcIik7XHJcblxyXG4gICAgICAgIHNraXAoXCI+XCIpO1xyXG4gICAgICAgIHZhciBuYW1lID0gbmV4dCgpO1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIW5hbWVSZS50ZXN0KG5hbWUpKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKG5hbWUsIFwibmFtZVwiKTtcclxuXHJcbiAgICAgICAgc2tpcChcIj1cIik7XHJcbiAgICAgICAgdmFyIGZpZWxkID0gbmV3IE1hcEZpZWxkKGFwcGx5Q2FzZShuYW1lKSwgcGFyc2VJZChuZXh0KCkpLCBrZXlUeXBlLCB2YWx1ZVR5cGUpO1xyXG4gICAgICAgIGlmQmxvY2soZmllbGQsIGZ1bmN0aW9uIHBhcnNlTWFwRmllbGRfYmxvY2sodG9rZW4pIHtcclxuXHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgIGlmICh0b2tlbiA9PT0gXCJvcHRpb25cIikge1xyXG4gICAgICAgICAgICAgICAgcGFyc2VPcHRpb24oZmllbGQsIHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHNraXAoXCI7XCIpO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG5cclxuICAgICAgICB9LCBmdW5jdGlvbiBwYXJzZU1hcEZpZWxkX2xpbmUoKSB7XHJcbiAgICAgICAgICAgIHBhcnNlSW5saW5lT3B0aW9ucyhmaWVsZCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcGFyZW50LmFkZChmaWVsZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VPbmVPZihwYXJlbnQsIHRva2VuKSB7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghbmFtZVJlLnRlc3QodG9rZW4gPSBuZXh0KCkpKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuLCBcIm5hbWVcIik7XHJcblxyXG4gICAgICAgIHZhciBvbmVvZiA9IG5ldyBPbmVPZihhcHBseUNhc2UodG9rZW4pKTtcclxuICAgICAgICBpZkJsb2NrKG9uZW9mLCBmdW5jdGlvbiBwYXJzZU9uZU9mX2Jsb2NrKHRva2VuKSB7XHJcbiAgICAgICAgICAgIGlmICh0b2tlbiA9PT0gXCJvcHRpb25cIikge1xyXG4gICAgICAgICAgICAgICAgcGFyc2VPcHRpb24ob25lb2YsIHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHNraXAoXCI7XCIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcHVzaCh0b2tlbik7XHJcbiAgICAgICAgICAgICAgICBwYXJzZUZpZWxkKG9uZW9mLCBcIm9wdGlvbmFsXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcGFyZW50LmFkZChvbmVvZik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VFbnVtKHBhcmVudCwgdG9rZW4pIHtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCFuYW1lUmUudGVzdCh0b2tlbiA9IG5leHQoKSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4sIFwibmFtZVwiKTtcclxuXHJcbiAgICAgICAgdmFyIGVubSA9IG5ldyBFbnVtKHRva2VuKTtcclxuICAgICAgICBpZkJsb2NrKGVubSwgZnVuY3Rpb24gcGFyc2VFbnVtX2Jsb2NrKHRva2VuKSB7XHJcbiAgICAgICAgICAgIGlmICh0b2tlbiA9PT0gXCJvcHRpb25cIikge1xyXG4gICAgICAgICAgICAgICAgcGFyc2VPcHRpb24oZW5tLCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICBza2lwKFwiO1wiKTtcclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICBwYXJzZUVudW1WYWx1ZShlbm0sIHRva2VuKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBwYXJlbnQuYWRkKGVubSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VFbnVtVmFsdWUocGFyZW50LCB0b2tlbikge1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIW5hbWVSZS50ZXN0KHRva2VuKSlcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbiwgXCJuYW1lXCIpO1xyXG5cclxuICAgICAgICBza2lwKFwiPVwiKTtcclxuICAgICAgICB2YXIgdmFsdWUgPSBwYXJzZUlkKG5leHQoKSwgdHJ1ZSksXHJcbiAgICAgICAgICAgIGR1bW15ID0ge307XHJcbiAgICAgICAgaWZCbG9jayhkdW1teSwgZnVuY3Rpb24gcGFyc2VFbnVtVmFsdWVfYmxvY2sodG9rZW4pIHtcclxuXHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgIGlmICh0b2tlbiA9PT0gXCJvcHRpb25cIikge1xyXG4gICAgICAgICAgICAgICAgcGFyc2VPcHRpb24oZHVtbXksIHRva2VuKTsgLy8gc2tpcFxyXG4gICAgICAgICAgICAgICAgc2tpcChcIjtcIik7XHJcbiAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbik7XHJcblxyXG4gICAgICAgIH0sIGZ1bmN0aW9uIHBhcnNlRW51bVZhbHVlX2xpbmUoKSB7XHJcbiAgICAgICAgICAgIHBhcnNlSW5saW5lT3B0aW9ucyhkdW1teSk7IC8vIHNraXBcclxuICAgICAgICB9KTtcclxuICAgICAgICBwYXJlbnQuYWRkKHRva2VuLCB2YWx1ZSwgZHVtbXkuY29tbWVudCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VPcHRpb24ocGFyZW50LCB0b2tlbikge1xyXG4gICAgICAgIHZhciBpc0N1c3RvbSA9IHNraXAoXCIoXCIsIHRydWUpO1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIXR5cGVSZWZSZS50ZXN0KHRva2VuID0gbmV4dCgpKSlcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbiwgXCJuYW1lXCIpO1xyXG5cclxuICAgICAgICB2YXIgbmFtZSA9IHRva2VuO1xyXG4gICAgICAgIGlmIChpc0N1c3RvbSkge1xyXG4gICAgICAgICAgICBza2lwKFwiKVwiKTtcclxuICAgICAgICAgICAgbmFtZSA9IFwiKFwiICsgbmFtZSArIFwiKVwiO1xyXG4gICAgICAgICAgICB0b2tlbiA9IHBlZWsoKTtcclxuICAgICAgICAgICAgaWYgKGZxVHlwZVJlZlJlLnRlc3QodG9rZW4pKSB7XHJcbiAgICAgICAgICAgICAgICBuYW1lICs9IHRva2VuO1xyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNraXAoXCI9XCIpO1xyXG4gICAgICAgIHBhcnNlT3B0aW9uVmFsdWUocGFyZW50LCBuYW1lKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZU9wdGlvblZhbHVlKHBhcmVudCwgbmFtZSkge1xyXG4gICAgICAgIGlmIChza2lwKFwie1wiLCB0cnVlKSkgeyAvLyB7IGE6IFwiZm9vXCIgYiB7IGM6IFwiYmFyXCIgfSB9XHJcbiAgICAgICAgICAgIGRvIHtcclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICAgICAgaWYgKCFuYW1lUmUudGVzdCh0b2tlbiA9IG5leHQoKSkpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbiwgXCJuYW1lXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChwZWVrKCkgPT09IFwie1wiKVxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlT3B0aW9uVmFsdWUocGFyZW50LCBuYW1lICsgXCIuXCIgKyB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBza2lwKFwiOlwiKTtcclxuICAgICAgICAgICAgICAgICAgICBzZXRPcHRpb24ocGFyZW50LCBuYW1lICsgXCIuXCIgKyB0b2tlbiwgcmVhZFZhbHVlKHRydWUpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSB3aGlsZSAoIXNraXAoXCJ9XCIsIHRydWUpKTtcclxuICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgc2V0T3B0aW9uKHBhcmVudCwgbmFtZSwgcmVhZFZhbHVlKHRydWUpKTtcclxuICAgICAgICAvLyBEb2VzIG5vdCBlbmZvcmNlIGEgZGVsaW1pdGVyIHRvIGJlIHVuaXZlcnNhbFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNldE9wdGlvbihwYXJlbnQsIG5hbWUsIHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKHBhcmVudC5zZXRPcHRpb24pXHJcbiAgICAgICAgICAgIHBhcmVudC5zZXRPcHRpb24obmFtZSwgdmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlSW5saW5lT3B0aW9ucyhwYXJlbnQpIHtcclxuICAgICAgICBpZiAoc2tpcChcIltcIiwgdHJ1ZSkpIHtcclxuICAgICAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICAgICAgcGFyc2VPcHRpb24ocGFyZW50LCBcIm9wdGlvblwiKTtcclxuICAgICAgICAgICAgfSB3aGlsZSAoc2tpcChcIixcIiwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICBza2lwKFwiXVwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHBhcmVudDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZVNlcnZpY2UocGFyZW50LCB0b2tlbikge1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIW5hbWVSZS50ZXN0KHRva2VuID0gbmV4dCgpKSlcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbiwgXCJzZXJ2aWNlIG5hbWVcIik7XHJcblxyXG4gICAgICAgIHZhciBzZXJ2aWNlID0gbmV3IFNlcnZpY2UodG9rZW4pO1xyXG4gICAgICAgIGlmQmxvY2soc2VydmljZSwgZnVuY3Rpb24gcGFyc2VTZXJ2aWNlX2Jsb2NrKHRva2VuKSB7XHJcbiAgICAgICAgICAgIGlmIChwYXJzZUNvbW1vbihzZXJ2aWNlLCB0b2tlbikpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgICAgICBpZiAodG9rZW4gPT09IFwicnBjXCIpXHJcbiAgICAgICAgICAgICAgICBwYXJzZU1ldGhvZChzZXJ2aWNlLCB0b2tlbik7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHBhcmVudC5hZGQoc2VydmljZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VNZXRob2QocGFyZW50LCB0b2tlbikge1xyXG4gICAgICAgIHZhciB0eXBlID0gdG9rZW47XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghbmFtZVJlLnRlc3QodG9rZW4gPSBuZXh0KCkpKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuLCBcIm5hbWVcIik7XHJcblxyXG4gICAgICAgIHZhciBuYW1lID0gdG9rZW4sXHJcbiAgICAgICAgICAgIHJlcXVlc3RUeXBlLCByZXF1ZXN0U3RyZWFtLFxyXG4gICAgICAgICAgICByZXNwb25zZVR5cGUsIHJlc3BvbnNlU3RyZWFtO1xyXG5cclxuICAgICAgICBza2lwKFwiKFwiKTtcclxuICAgICAgICBpZiAoc2tpcChcInN0cmVhbVwiLCB0cnVlKSlcclxuICAgICAgICAgICAgcmVxdWVzdFN0cmVhbSA9IHRydWU7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghdHlwZVJlZlJlLnRlc3QodG9rZW4gPSBuZXh0KCkpKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTtcclxuXHJcbiAgICAgICAgcmVxdWVzdFR5cGUgPSB0b2tlbjtcclxuICAgICAgICBza2lwKFwiKVwiKTsgc2tpcChcInJldHVybnNcIik7IHNraXAoXCIoXCIpO1xyXG4gICAgICAgIGlmIChza2lwKFwic3RyZWFtXCIsIHRydWUpKVxyXG4gICAgICAgICAgICByZXNwb25zZVN0cmVhbSA9IHRydWU7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghdHlwZVJlZlJlLnRlc3QodG9rZW4gPSBuZXh0KCkpKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTtcclxuXHJcbiAgICAgICAgcmVzcG9uc2VUeXBlID0gdG9rZW47XHJcbiAgICAgICAgc2tpcChcIilcIik7XHJcblxyXG4gICAgICAgIHZhciBtZXRob2QgPSBuZXcgTWV0aG9kKG5hbWUsIHR5cGUsIHJlcXVlc3RUeXBlLCByZXNwb25zZVR5cGUsIHJlcXVlc3RTdHJlYW0sIHJlc3BvbnNlU3RyZWFtKTtcclxuICAgICAgICBpZkJsb2NrKG1ldGhvZCwgZnVuY3Rpb24gcGFyc2VNZXRob2RfYmxvY2sodG9rZW4pIHtcclxuXHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgIGlmICh0b2tlbiA9PT0gXCJvcHRpb25cIikge1xyXG4gICAgICAgICAgICAgICAgcGFyc2VPcHRpb24obWV0aG9kLCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICBza2lwKFwiO1wiKTtcclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTtcclxuXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcGFyZW50LmFkZChtZXRob2QpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlRXh0ZW5zaW9uKHBhcmVudCwgdG9rZW4pIHtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCF0eXBlUmVmUmUudGVzdCh0b2tlbiA9IG5leHQoKSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4sIFwicmVmZXJlbmNlXCIpO1xyXG5cclxuICAgICAgICB2YXIgcmVmZXJlbmNlID0gdG9rZW47XHJcbiAgICAgICAgaWZCbG9jayhudWxsLCBmdW5jdGlvbiBwYXJzZUV4dGVuc2lvbl9ibG9jayh0b2tlbikge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJlcXVpcmVkXCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVwZWF0ZWRcIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJvcHRpb25hbFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlRmllbGQocGFyZW50LCB0b2tlbiwgcmVmZXJlbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNQcm90bzMgfHwgIXR5cGVSZWZSZS50ZXN0KHRva2VuKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgcHVzaCh0b2tlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VGaWVsZChwYXJlbnQsIFwib3B0aW9uYWxcIiwgcmVmZXJlbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB0b2tlbjtcclxuICAgIHdoaWxlICgodG9rZW4gPSBuZXh0KCkpICE9PSBudWxsKSB7XHJcbiAgICAgICAgc3dpdGNoICh0b2tlbikge1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcInBhY2thZ2VcIjpcclxuXHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICAgICAgICAgIGlmICghaGVhZClcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTtcclxuXHJcbiAgICAgICAgICAgICAgICBwYXJzZVBhY2thZ2UoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcImltcG9ydFwiOlxyXG5cclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICAgICAgaWYgKCFoZWFkKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG5cclxuICAgICAgICAgICAgICAgIHBhcnNlSW1wb3J0KCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJzeW50YXhcIjpcclxuXHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICAgICAgICAgIGlmICghaGVhZClcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTtcclxuXHJcbiAgICAgICAgICAgICAgICBwYXJzZVN5bnRheCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFwib3B0aW9uXCI6XHJcblxyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgICAgICBpZiAoIWhlYWQpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbik7XHJcblxyXG4gICAgICAgICAgICAgICAgcGFyc2VPcHRpb24ocHRyLCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICBza2lwKFwiO1wiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuXHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlQ29tbW9uKHB0ciwgdG9rZW4pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2UuZmlsZW5hbWUgPSBudWxsO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBcInBhY2thZ2VcIiAgICAgOiBwa2csXHJcbiAgICAgICAgXCJpbXBvcnRzXCIgICAgIDogaW1wb3J0cyxcclxuICAgICAgICAgd2Vha0ltcG9ydHMgIDogd2Vha0ltcG9ydHMsXHJcbiAgICAgICAgIHN5bnRheCAgICAgICA6IHN5bnRheCxcclxuICAgICAgICAgcm9vdCAgICAgICAgIDogcm9vdFxyXG4gICAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBhcnNlcyB0aGUgZ2l2ZW4gLnByb3RvIHNvdXJjZSBhbmQgcmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgcGFyc2VkIGNvbnRlbnRzLlxyXG4gKiBAbmFtZSBwYXJzZVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZSBTb3VyY2UgY29udGVudHNcclxuICogQHBhcmFtIHtQYXJzZU9wdGlvbnN9IFtvcHRpb25zXSBQYXJzZSBvcHRpb25zLiBEZWZhdWx0cyB0byB7QGxpbmsgcGFyc2UuZGVmYXVsdHN9IHdoZW4gb21pdHRlZC5cclxuICogQHJldHVybnMge1BhcnNlclJlc3VsdH0gUGFyc2VyIHJlc3VsdFxyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gZmlsZW5hbWU9bnVsbCBDdXJyZW50bHkgcHJvY2Vzc2luZyBmaWxlIG5hbWUgZm9yIGVycm9yIHJlcG9ydGluZywgaWYga25vd25cclxuICogQHByb3BlcnR5IHtQYXJzZU9wdGlvbnN9IGRlZmF1bHRzIERlZmF1bHQge0BsaW5rIFBhcnNlT3B0aW9uc31cclxuICogQHZhcmlhdGlvbiAyXHJcbiAqL1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBSZWFkZXI7XHJcblxyXG52YXIgdXRpbCAgICAgID0gcmVxdWlyZShcIi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxudmFyIEJ1ZmZlclJlYWRlcjsgLy8gY3ljbGljXHJcblxyXG52YXIgTG9uZ0JpdHMgID0gdXRpbC5Mb25nQml0cyxcclxuICAgIHV0ZjggICAgICA9IHV0aWwudXRmODtcclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmZ1bmN0aW9uIGluZGV4T3V0T2ZSYW5nZShyZWFkZXIsIHdyaXRlTGVuZ3RoKSB7XHJcbiAgICByZXR1cm4gUmFuZ2VFcnJvcihcImluZGV4IG91dCBvZiByYW5nZTogXCIgKyByZWFkZXIucG9zICsgXCIgKyBcIiArICh3cml0ZUxlbmd0aCB8fCAxKSArIFwiID4gXCIgKyByZWFkZXIubGVuKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgcmVhZGVyIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgYnVmZmVyLlxyXG4gKiBAY2xhc3NkZXNjIFdpcmUgZm9ybWF0IHJlYWRlciB1c2luZyBgVWludDhBcnJheWAgaWYgYXZhaWxhYmxlLCBvdGhlcndpc2UgYEFycmF5YC5cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmZmVyIEJ1ZmZlciB0byByZWFkIGZyb21cclxuICovXHJcbmZ1bmN0aW9uIFJlYWRlcihidWZmZXIpIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgYnVmZmVyLlxyXG4gICAgICogQHR5cGUge1VpbnQ4QXJyYXl9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuYnVmID0gYnVmZmVyO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCBidWZmZXIgcG9zaXRpb24uXHJcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnBvcyA9IDA7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIGJ1ZmZlciBsZW5ndGguXHJcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmxlbiA9IGJ1ZmZlci5sZW5ndGg7XHJcbn1cclxuXHJcbnZhciBjcmVhdGVfYXJyYXkgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gXCJ1bmRlZmluZWRcIlxyXG4gICAgPyBmdW5jdGlvbiBjcmVhdGVfdHlwZWRfYXJyYXkoYnVmZmVyKSB7XHJcbiAgICAgICAgaWYgKGJ1ZmZlciBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgfHwgQXJyYXkuaXNBcnJheShidWZmZXIpKVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlYWRlcihidWZmZXIpO1xyXG4gICAgICAgIHRocm93IEVycm9yKFwiaWxsZWdhbCBidWZmZXJcIik7XHJcbiAgICB9XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgOiBmdW5jdGlvbiBjcmVhdGVfYXJyYXkoYnVmZmVyKSB7XHJcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYnVmZmVyKSlcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBSZWFkZXIoYnVmZmVyKTtcclxuICAgICAgICB0aHJvdyBFcnJvcihcImlsbGVnYWwgYnVmZmVyXCIpO1xyXG4gICAgfTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IHJlYWRlciB1c2luZyB0aGUgc3BlY2lmaWVkIGJ1ZmZlci5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheXxCdWZmZXJ9IGJ1ZmZlciBCdWZmZXIgdG8gcmVhZCBmcm9tXHJcbiAqIEByZXR1cm5zIHtSZWFkZXJ8QnVmZmVyUmVhZGVyfSBBIHtAbGluayBCdWZmZXJSZWFkZXJ9IGlmIGBidWZmZXJgIGlzIGEgQnVmZmVyLCBvdGhlcndpc2UgYSB7QGxpbmsgUmVhZGVyfVxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgYGJ1ZmZlcmAgaXMgbm90IGEgdmFsaWQgYnVmZmVyXHJcbiAqL1xyXG5SZWFkZXIuY3JlYXRlID0gdXRpbC5CdWZmZXJcclxuICAgID8gZnVuY3Rpb24gY3JlYXRlX2J1ZmZlcl9zZXR1cChidWZmZXIpIHtcclxuICAgICAgICByZXR1cm4gKFJlYWRlci5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGVfYnVmZmVyKGJ1ZmZlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gdXRpbC5CdWZmZXIuaXNCdWZmZXIoYnVmZmVyKVxyXG4gICAgICAgICAgICAgICAgPyBuZXcgQnVmZmVyUmVhZGVyKGJ1ZmZlcilcclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgICAgICA6IGNyZWF0ZV9hcnJheShidWZmZXIpO1xyXG4gICAgICAgIH0pKGJ1ZmZlcik7XHJcbiAgICB9XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgOiBjcmVhdGVfYXJyYXk7XHJcblxyXG5SZWFkZXIucHJvdG90eXBlLl9zbGljZSA9IHV0aWwuQXJyYXkucHJvdG90eXBlLnN1YmFycmF5IHx8IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIHV0aWwuQXJyYXkucHJvdG90eXBlLnNsaWNlO1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgdmFyaW50IGFzIGFuIHVuc2lnbmVkIDMyIGJpdCB2YWx1ZS5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUudWludDMyID0gKGZ1bmN0aW9uIHJlYWRfdWludDMyX3NldHVwKCkge1xyXG4gICAgdmFyIHZhbHVlID0gNDI5NDk2NzI5NTsgLy8gb3B0aW1pemVyIHR5cGUtaGludCwgdGVuZHMgdG8gZGVvcHQgb3RoZXJ3aXNlICg/ISlcclxuICAgIHJldHVybiBmdW5jdGlvbiByZWFkX3VpbnQzMigpIHtcclxuICAgICAgICB2YWx1ZSA9ICggICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcgICAgICAgKSA+Pj4gMDsgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KSByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgdmFsdWUgPSAodmFsdWUgfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA8PCAgNykgPj4+IDA7IGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOCkgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIHZhbHVlID0gKHZhbHVlIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgMTQpID4+PiAwOyBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB2YWx1ZSA9ICh2YWx1ZSB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpIDw8IDIxKSA+Pj4gMDsgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KSByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgdmFsdWUgPSAodmFsdWUgfCAodGhpcy5idWZbdGhpcy5wb3NdICYgIDE1KSA8PCAyOCkgPj4+IDA7IGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOCkgcmV0dXJuIHZhbHVlO1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoKHRoaXMucG9zICs9IDUpID4gdGhpcy5sZW4pIHtcclxuICAgICAgICAgICAgdGhpcy5wb3MgPSB0aGlzLmxlbjtcclxuICAgICAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIDEwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfTtcclxufSkoKTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIHZhcmludCBhcyBhIHNpZ25lZCAzMiBiaXQgdmFsdWUuXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuaW50MzIgPSBmdW5jdGlvbiByZWFkX2ludDMyKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudWludDMyKCkgfCAwO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgemlnLXphZyBlbmNvZGVkIHZhcmludCBhcyBhIHNpZ25lZCAzMiBiaXQgdmFsdWUuXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuc2ludDMyID0gZnVuY3Rpb24gcmVhZF9zaW50MzIoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLnVpbnQzMigpO1xyXG4gICAgcmV0dXJuIHZhbHVlID4+PiAxIF4gLSh2YWx1ZSAmIDEpIHwgMDtcclxufTtcclxuXHJcbi8qIGVzbGludC1kaXNhYmxlIG5vLWludmFsaWQtdGhpcyAqL1xyXG5cclxuZnVuY3Rpb24gcmVhZExvbmdWYXJpbnQoKSB7XHJcbiAgICAvLyB0ZW5kcyB0byBkZW9wdCB3aXRoIGxvY2FsIHZhcnMgZm9yIG9jdGV0IGV0Yy5cclxuICAgIHZhciBiaXRzID0gbmV3IExvbmdCaXRzKDAsIDApO1xyXG4gICAgdmFyIGkgPSAwO1xyXG4gICAgaWYgKHRoaXMubGVuIC0gdGhpcy5wb3MgPiA0KSB7IC8vIGZhc3Qgcm91dGUgKGxvKVxyXG4gICAgICAgIGZvciAoOyBpIDwgNDsgKytpKSB7XHJcbiAgICAgICAgICAgIC8vIDFzdC4uNHRoXHJcbiAgICAgICAgICAgIGJpdHMubG8gPSAoYml0cy5sbyB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpIDw8IGkgKiA3KSA+Pj4gMDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJpdHM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIDV0aFxyXG4gICAgICAgIGJpdHMubG8gPSAoYml0cy5sbyB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpIDw8IDI4KSA+Pj4gMDtcclxuICAgICAgICBiaXRzLmhpID0gKGJpdHMuaGkgfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA+PiAgNCkgPj4+IDA7XHJcbiAgICAgICAgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KVxyXG4gICAgICAgICAgICByZXR1cm4gYml0cztcclxuICAgICAgICBpID0gMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZm9yICg7IGkgPCAzOyArK2kpIHtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmxlbilcclxuICAgICAgICAgICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzKTtcclxuICAgICAgICAgICAgLy8gMXN0Li4zdGhcclxuICAgICAgICAgICAgYml0cy5sbyA9IChiaXRzLmxvIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgaSAqIDcpID4+PiAwO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYml0cztcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gNHRoXHJcbiAgICAgICAgYml0cy5sbyA9IChiaXRzLmxvIHwgKHRoaXMuYnVmW3RoaXMucG9zKytdICYgMTI3KSA8PCBpICogNykgPj4+IDA7XHJcbiAgICAgICAgcmV0dXJuIGJpdHM7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5sZW4gLSB0aGlzLnBvcyA+IDQpIHsgLy8gZmFzdCByb3V0ZSAoaGkpXHJcbiAgICAgICAgZm9yICg7IGkgPCA1OyArK2kpIHtcclxuICAgICAgICAgICAgLy8gNnRoLi4xMHRoXHJcbiAgICAgICAgICAgIGJpdHMuaGkgPSAoYml0cy5oaSB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpIDw8IGkgKiA3ICsgMykgPj4+IDA7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOClcclxuICAgICAgICAgICAgICAgIHJldHVybiBiaXRzO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZm9yICg7IGkgPCA1OyArK2kpIHtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmxlbilcclxuICAgICAgICAgICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzKTtcclxuICAgICAgICAgICAgLy8gNnRoLi4xMHRoXHJcbiAgICAgICAgICAgIGJpdHMuaGkgPSAoYml0cy5oaSB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpIDw8IGkgKiA3ICsgMykgPj4+IDA7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOClcclxuICAgICAgICAgICAgICAgIHJldHVybiBiaXRzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICB0aHJvdyBFcnJvcihcImludmFsaWQgdmFyaW50IGVuY29kaW5nXCIpO1xyXG59XHJcblxyXG4vKiBlc2xpbnQtZW5hYmxlIG5vLWludmFsaWQtdGhpcyAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgdmFyaW50IGFzIGEgc2lnbmVkIDY0IGJpdCB2YWx1ZS5cclxuICogQG5hbWUgUmVhZGVyI2ludDY0XHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7TG9uZ30gVmFsdWUgcmVhZFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIHZhcmludCBhcyBhbiB1bnNpZ25lZCA2NCBiaXQgdmFsdWUuXHJcbiAqIEBuYW1lIFJlYWRlciN1aW50NjRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtMb25nfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgemlnLXphZyBlbmNvZGVkIHZhcmludCBhcyBhIHNpZ25lZCA2NCBiaXQgdmFsdWUuXHJcbiAqIEBuYW1lIFJlYWRlciNzaW50NjRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtMb25nfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgdmFyaW50IGFzIGEgYm9vbGVhbi5cclxuICogQHJldHVybnMge2Jvb2xlYW59IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuYm9vbCA9IGZ1bmN0aW9uIHJlYWRfYm9vbCgpIHtcclxuICAgIHJldHVybiB0aGlzLnVpbnQzMigpICE9PSAwO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gcmVhZEZpeGVkMzJfZW5kKGJ1ZiwgZW5kKSB7IC8vIG5vdGUgdGhhdCB0aGlzIHVzZXMgYGVuZGAsIG5vdCBgcG9zYFxyXG4gICAgcmV0dXJuIChidWZbZW5kIC0gNF1cclxuICAgICAgICAgIHwgYnVmW2VuZCAtIDNdIDw8IDhcclxuICAgICAgICAgIHwgYnVmW2VuZCAtIDJdIDw8IDE2XHJcbiAgICAgICAgICB8IGJ1ZltlbmQgLSAxXSA8PCAyNCkgPj4+IDA7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBmaXhlZCAzMiBiaXRzIGFzIGFuIHVuc2lnbmVkIDMyIGJpdCBpbnRlZ2VyLlxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLmZpeGVkMzIgPSBmdW5jdGlvbiByZWFkX2ZpeGVkMzIoKSB7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAodGhpcy5wb3MgKyA0ID4gdGhpcy5sZW4pXHJcbiAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIDQpO1xyXG5cclxuICAgIHJldHVybiByZWFkRml4ZWQzMl9lbmQodGhpcy5idWYsIHRoaXMucG9zICs9IDQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGZpeGVkIDMyIGJpdHMgYXMgYSBzaWduZWQgMzIgYml0IGludGVnZXIuXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuc2ZpeGVkMzIgPSBmdW5jdGlvbiByZWFkX3NmaXhlZDMyKCkge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKHRoaXMucG9zICsgNCA+IHRoaXMubGVuKVxyXG4gICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzLCA0KTtcclxuXHJcbiAgICByZXR1cm4gcmVhZEZpeGVkMzJfZW5kKHRoaXMuYnVmLCB0aGlzLnBvcyArPSA0KSB8IDA7XHJcbn07XHJcblxyXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cclxuXHJcbmZ1bmN0aW9uIHJlYWRGaXhlZDY0KC8qIHRoaXM6IFJlYWRlciAqLykge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKHRoaXMucG9zICsgOCA+IHRoaXMubGVuKVxyXG4gICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzLCA4KTtcclxuXHJcbiAgICByZXR1cm4gbmV3IExvbmdCaXRzKHJlYWRGaXhlZDMyX2VuZCh0aGlzLmJ1ZiwgdGhpcy5wb3MgKz0gNCksIHJlYWRGaXhlZDMyX2VuZCh0aGlzLmJ1ZiwgdGhpcy5wb3MgKz0gNCkpO1xyXG59XHJcblxyXG4vKiBlc2xpbnQtZW5hYmxlIG5vLWludmFsaWQtdGhpcyAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGZpeGVkIDY0IGJpdHMuXHJcbiAqIEBuYW1lIFJlYWRlciNmaXhlZDY0XHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7TG9uZ30gVmFsdWUgcmVhZFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyB6aWctemFnIGVuY29kZWQgZml4ZWQgNjQgYml0cy5cclxuICogQG5hbWUgUmVhZGVyI3NmaXhlZDY0XHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7TG9uZ30gVmFsdWUgcmVhZFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIGZsb2F0ICgzMiBiaXQpIGFzIGEgbnVtYmVyLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5mbG9hdCA9IGZ1bmN0aW9uIHJlYWRfZmxvYXQoKSB7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAodGhpcy5wb3MgKyA0ID4gdGhpcy5sZW4pXHJcbiAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIDQpO1xyXG5cclxuICAgIHZhciB2YWx1ZSA9IHV0aWwuZmxvYXQucmVhZEZsb2F0TEUodGhpcy5idWYsIHRoaXMucG9zKTtcclxuICAgIHRoaXMucG9zICs9IDQ7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVhZHMgYSBkb3VibGUgKDY0IGJpdCBmbG9hdCkgYXMgYSBudW1iZXIuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLmRvdWJsZSA9IGZ1bmN0aW9uIHJlYWRfZG91YmxlKCkge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKHRoaXMucG9zICsgOCA+IHRoaXMubGVuKVxyXG4gICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzLCA0KTtcclxuXHJcbiAgICB2YXIgdmFsdWUgPSB1dGlsLmZsb2F0LnJlYWREb3VibGVMRSh0aGlzLmJ1ZiwgdGhpcy5wb3MpO1xyXG4gICAgdGhpcy5wb3MgKz0gODtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIHNlcXVlbmNlIG9mIGJ5dGVzIHByZWNlZWRlZCBieSBpdHMgbGVuZ3RoIGFzIGEgdmFyaW50LlxyXG4gKiBAcmV0dXJucyB7VWludDhBcnJheX0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5ieXRlcyA9IGZ1bmN0aW9uIHJlYWRfYnl0ZXMoKSB7XHJcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy51aW50MzIoKSxcclxuICAgICAgICBzdGFydCAgPSB0aGlzLnBvcyxcclxuICAgICAgICBlbmQgICAgPSB0aGlzLnBvcyArIGxlbmd0aDtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmIChlbmQgPiB0aGlzLmxlbilcclxuICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgbGVuZ3RoKTtcclxuXHJcbiAgICB0aGlzLnBvcyArPSBsZW5ndGg7XHJcbiAgICByZXR1cm4gc3RhcnQgPT09IGVuZCAvLyBmaXggZm9yIElFIDEwL1dpbjggYW5kIG90aGVycycgc3ViYXJyYXkgcmV0dXJuaW5nIGFycmF5IG9mIHNpemUgMVxyXG4gICAgICAgID8gbmV3IHRoaXMuYnVmLmNvbnN0cnVjdG9yKDApXHJcbiAgICAgICAgOiB0aGlzLl9zbGljZS5jYWxsKHRoaXMuYnVmLCBzdGFydCwgZW5kKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIHN0cmluZyBwcmVjZWVkZWQgYnkgaXRzIGJ5dGUgbGVuZ3RoIGFzIGEgdmFyaW50LlxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLnN0cmluZyA9IGZ1bmN0aW9uIHJlYWRfc3RyaW5nKCkge1xyXG4gICAgdmFyIGJ5dGVzID0gdGhpcy5ieXRlcygpO1xyXG4gICAgcmV0dXJuIHV0ZjgucmVhZChieXRlcywgMCwgYnl0ZXMubGVuZ3RoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTa2lwcyB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBieXRlcyBpZiBzcGVjaWZpZWQsIG90aGVyd2lzZSBza2lwcyBhIHZhcmludC5cclxuICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIExlbmd0aCBpZiBrbm93biwgb3RoZXJ3aXNlIGEgdmFyaW50IGlzIGFzc3VtZWRcclxuICogQHJldHVybnMge1JlYWRlcn0gYHRoaXNgXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLnNraXAgPSBmdW5jdGlvbiBza2lwKGxlbmd0aCkge1xyXG4gICAgaWYgKHR5cGVvZiBsZW5ndGggPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAodGhpcy5wb3MgKyBsZW5ndGggPiB0aGlzLmxlbilcclxuICAgICAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIGxlbmd0aCk7XHJcbiAgICAgICAgdGhpcy5wb3MgKz0gbGVuZ3RoO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wb3MgPj0gdGhpcy5sZW4pXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcyk7XHJcbiAgICAgICAgfSB3aGlsZSAodGhpcy5idWZbdGhpcy5wb3MrK10gJiAxMjgpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogU2tpcHMgdGhlIG5leHQgZWxlbWVudCBvZiB0aGUgc3BlY2lmaWVkIHdpcmUgdHlwZS5cclxuICogQHBhcmFtIHtudW1iZXJ9IHdpcmVUeXBlIFdpcmUgdHlwZSByZWNlaXZlZFxyXG4gKiBAcmV0dXJucyB7UmVhZGVyfSBgdGhpc2BcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuc2tpcFR5cGUgPSBmdW5jdGlvbih3aXJlVHlwZSkge1xyXG4gICAgc3dpdGNoICh3aXJlVHlwZSkge1xyXG4gICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgdGhpcy5za2lwKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgdGhpcy5za2lwKDgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgIHRoaXMuc2tpcCh0aGlzLnVpbnQzMigpKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICBkbyB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uc3RhbnQtY29uZGl0aW9uXHJcbiAgICAgICAgICAgICAgICBpZiAoKHdpcmVUeXBlID0gdGhpcy51aW50MzIoKSAmIDcpID09PSA0KVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5za2lwVHlwZSh3aXJlVHlwZSk7XHJcbiAgICAgICAgICAgIH0gd2hpbGUgKHRydWUpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDU6XHJcbiAgICAgICAgICAgIHRoaXMuc2tpcCg0KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJpbnZhbGlkIHdpcmUgdHlwZSBcIiArIHdpcmVUeXBlICsgXCIgYXQgb2Zmc2V0IFwiICsgdGhpcy5wb3MpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5SZWFkZXIuX2NvbmZpZ3VyZSA9IGZ1bmN0aW9uKEJ1ZmZlclJlYWRlcl8pIHtcclxuICAgIEJ1ZmZlclJlYWRlciA9IEJ1ZmZlclJlYWRlcl87XHJcblxyXG4gICAgdmFyIGZuID0gdXRpbC5Mb25nID8gXCJ0b0xvbmdcIiA6IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIFwidG9OdW1iZXJcIjtcclxuICAgIHV0aWwubWVyZ2UoUmVhZGVyLnByb3RvdHlwZSwge1xyXG5cclxuICAgICAgICBpbnQ2NDogZnVuY3Rpb24gcmVhZF9pbnQ2NCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlYWRMb25nVmFyaW50LmNhbGwodGhpcylbZm5dKGZhbHNlKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICB1aW50NjQ6IGZ1bmN0aW9uIHJlYWRfdWludDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZExvbmdWYXJpbnQuY2FsbCh0aGlzKVtmbl0odHJ1ZSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2ludDY0OiBmdW5jdGlvbiByZWFkX3NpbnQ2NCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlYWRMb25nVmFyaW50LmNhbGwodGhpcykuenpEZWNvZGUoKVtmbl0oZmFsc2UpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGZpeGVkNjQ6IGZ1bmN0aW9uIHJlYWRfZml4ZWQ2NCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlYWRGaXhlZDY0LmNhbGwodGhpcylbZm5dKHRydWUpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHNmaXhlZDY0OiBmdW5jdGlvbiByZWFkX3NmaXhlZDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZEZpeGVkNjQuY2FsbCh0aGlzKVtmbl0oZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9KTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyUmVhZGVyO1xyXG5cclxuLy8gZXh0ZW5kcyBSZWFkZXJcclxudmFyIFJlYWRlciA9IHJlcXVpcmUoXCIuL3JlYWRlclwiKTtcclxuKEJ1ZmZlclJlYWRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFJlYWRlci5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IEJ1ZmZlclJlYWRlcjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgYnVmZmVyIHJlYWRlciBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBXaXJlIGZvcm1hdCByZWFkZXIgdXNpbmcgbm9kZSBidWZmZXJzLlxyXG4gKiBAZXh0ZW5kcyBSZWFkZXJcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7QnVmZmVyfSBidWZmZXIgQnVmZmVyIHRvIHJlYWQgZnJvbVxyXG4gKi9cclxuZnVuY3Rpb24gQnVmZmVyUmVhZGVyKGJ1ZmZlcikge1xyXG4gICAgUmVhZGVyLmNhbGwodGhpcywgYnVmZmVyKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgYnVmZmVyLlxyXG4gICAgICogQG5hbWUgQnVmZmVyUmVhZGVyI2J1ZlxyXG4gICAgICogQHR5cGUge0J1ZmZlcn1cclxuICAgICAqL1xyXG59XHJcblxyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG5pZiAodXRpbC5CdWZmZXIpXHJcbiAgICBCdWZmZXJSZWFkZXIucHJvdG90eXBlLl9zbGljZSA9IHV0aWwuQnVmZmVyLnByb3RvdHlwZS5zbGljZTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcbkJ1ZmZlclJlYWRlci5wcm90b3R5cGUuc3RyaW5nID0gZnVuY3Rpb24gcmVhZF9zdHJpbmdfYnVmZmVyKCkge1xyXG4gICAgdmFyIGxlbiA9IHRoaXMudWludDMyKCk7IC8vIG1vZGlmaWVzIHBvc1xyXG4gICAgcmV0dXJuIHRoaXMuYnVmLnV0ZjhTbGljZSh0aGlzLnBvcywgdGhpcy5wb3MgPSBNYXRoLm1pbih0aGlzLnBvcyArIGxlbiwgdGhpcy5sZW4pKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIHNlcXVlbmNlIG9mIGJ5dGVzIHByZWNlZWRlZCBieSBpdHMgbGVuZ3RoIGFzIGEgdmFyaW50LlxyXG4gKiBAbmFtZSBCdWZmZXJSZWFkZXIjYnl0ZXNcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtCdWZmZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFJvb3Q7XHJcblxyXG4vLyBleHRlbmRzIE5hbWVzcGFjZVxyXG52YXIgTmFtZXNwYWNlID0gcmVxdWlyZShcIi4vbmFtZXNwYWNlXCIpO1xyXG4oKFJvb3QucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShOYW1lc3BhY2UucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBSb290KS5jbGFzc05hbWUgPSBcIlJvb3RcIjtcclxuXHJcbnZhciBGaWVsZCAgID0gcmVxdWlyZShcIi4vZmllbGRcIiksXHJcbiAgICBFbnVtICAgID0gcmVxdWlyZShcIi4vZW51bVwiKSxcclxuICAgIHV0aWwgICAgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxudmFyIFR5cGUsICAgLy8gY3ljbGljXHJcbiAgICBwYXJzZSwgIC8vIG1pZ2h0IGJlIGV4Y2x1ZGVkXHJcbiAgICBjb21tb247IC8vIFwiXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyByb290IG5hbWVzcGFjZSBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBSb290IG5hbWVzcGFjZSB3cmFwcGluZyBhbGwgdHlwZXMsIGVudW1zLCBzZXJ2aWNlcywgc3ViLW5hbWVzcGFjZXMgZXRjLiB0aGF0IGJlbG9uZyB0b2dldGhlci5cclxuICogQGV4dGVuZHMgTmFtZXNwYWNlQmFzZVxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIFRvcCBsZXZlbCBvcHRpb25zXHJcbiAqL1xyXG5mdW5jdGlvbiBSb290KG9wdGlvbnMpIHtcclxuICAgIE5hbWVzcGFjZS5jYWxsKHRoaXMsIFwiXCIsIG9wdGlvbnMpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGVmZXJyZWQgZXh0ZW5zaW9uIGZpZWxkcy5cclxuICAgICAqIEB0eXBlIHtGaWVsZFtdfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmRlZmVycmVkID0gW107XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXNvbHZlZCBmaWxlIG5hbWVzIG9mIGxvYWRlZCBmaWxlcy5cclxuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5maWxlcyA9IFtdO1xyXG59XHJcblxyXG4vKipcclxuICogTG9hZHMgYSBuYW1lc3BhY2UgZGVzY3JpcHRvciBpbnRvIGEgcm9vdCBuYW1lc3BhY2UuXHJcbiAqIEBwYXJhbSB7TmFtZXNwYWNlRGVzY3JpcHRvcn0ganNvbiBOYW1lZXNwYWNlIGRlc2NyaXB0b3JcclxuICogQHBhcmFtIHtSb290fSBbcm9vdF0gUm9vdCBuYW1lc3BhY2UsIGRlZmF1bHRzIHRvIGNyZWF0ZSBhIG5ldyBvbmUgaWYgb21pdHRlZFxyXG4gKiBAcmV0dXJucyB7Um9vdH0gUm9vdCBuYW1lc3BhY2VcclxuICovXHJcblJvb3QuZnJvbUpTT04gPSBmdW5jdGlvbiBmcm9tSlNPTihqc29uLCByb290KSB7XHJcbiAgICBpZiAoIXJvb3QpXHJcbiAgICAgICAgcm9vdCA9IG5ldyBSb290KCk7XHJcbiAgICBpZiAoanNvbi5vcHRpb25zKVxyXG4gICAgICAgIHJvb3Quc2V0T3B0aW9ucyhqc29uLm9wdGlvbnMpO1xyXG4gICAgcmV0dXJuIHJvb3QuYWRkSlNPTihqc29uLm5lc3RlZCk7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVzb2x2ZXMgdGhlIHBhdGggb2YgYW4gaW1wb3J0ZWQgZmlsZSwgcmVsYXRpdmUgdG8gdGhlIGltcG9ydGluZyBvcmlnaW4uXHJcbiAqIFRoaXMgbWV0aG9kIGV4aXN0cyBzbyB5b3UgY2FuIG92ZXJyaWRlIGl0IHdpdGggeW91ciBvd24gbG9naWMgaW4gY2FzZSB5b3VyIGltcG9ydHMgYXJlIHNjYXR0ZXJlZCBvdmVyIG11bHRpcGxlIGRpcmVjdG9yaWVzLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtzdHJpbmd9IG9yaWdpbiBUaGUgZmlsZSBuYW1lIG9mIHRoZSBpbXBvcnRpbmcgZmlsZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFyZ2V0IFRoZSBmaWxlIG5hbWUgYmVpbmcgaW1wb3J0ZWRcclxuICogQHJldHVybnMgez9zdHJpbmd9IFJlc29sdmVkIHBhdGggdG8gYHRhcmdldGAgb3IgYG51bGxgIHRvIHNraXAgdGhlIGZpbGVcclxuICovXHJcblJvb3QucHJvdG90eXBlLnJlc29sdmVQYXRoID0gdXRpbC5wYXRoLnJlc29sdmU7XHJcblxyXG4vLyBBIHN5bWJvbC1saWtlIGZ1bmN0aW9uIHRvIHNhZmVseSBzaWduYWwgc3luY2hyb25vdXMgbG9hZGluZ1xyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5mdW5jdGlvbiBTWU5DKCkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eS1mdW5jdGlvblxyXG5cclxuLyoqXHJcbiAqIExvYWRzIG9uZSBvciBtdWx0aXBsZSAucHJvdG8gb3IgcHJlcHJvY2Vzc2VkIC5qc29uIGZpbGVzIGludG8gdGhpcyByb290IG5hbWVzcGFjZSBhbmQgY2FsbHMgdGhlIGNhbGxiYWNrLlxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gZmlsZW5hbWUgTmFtZXMgb2Ygb25lIG9yIG11bHRpcGxlIGZpbGVzIHRvIGxvYWRcclxuICogQHBhcmFtIHtQYXJzZU9wdGlvbnN9IG9wdGlvbnMgUGFyc2Ugb3B0aW9uc1xyXG4gKiBAcGFyYW0ge0xvYWRDYWxsYmFja30gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb25cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblJvb3QucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbiBsb2FkKGZpbGVuYW1lLCBvcHRpb25zLCBjYWxsYmFjaykge1xyXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XHJcbiAgICAgICAgb3B0aW9ucyA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIGlmICghY2FsbGJhY2spXHJcbiAgICAgICAgcmV0dXJuIHV0aWwuYXNQcm9taXNlKGxvYWQsIHNlbGYsIGZpbGVuYW1lLCBvcHRpb25zKTtcclxuXHJcbiAgICB2YXIgc3luYyA9IGNhbGxiYWNrID09PSBTWU5DOyAvLyB1bmRvY3VtZW50ZWRcclxuXHJcbiAgICAvLyBGaW5pc2hlcyBsb2FkaW5nIGJ5IGNhbGxpbmcgdGhlIGNhbGxiYWNrIChleGFjdGx5IG9uY2UpXHJcbiAgICBmdW5jdGlvbiBmaW5pc2goZXJyLCByb290KSB7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCFjYWxsYmFjaylcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHZhciBjYiA9IGNhbGxiYWNrO1xyXG4gICAgICAgIGNhbGxiYWNrID0gbnVsbDtcclxuICAgICAgICBpZiAoc3luYylcclxuICAgICAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICAgIGNiKGVyciwgcm9vdCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUHJvY2Vzc2VzIGEgc2luZ2xlIGZpbGVcclxuICAgIGZ1bmN0aW9uIHByb2Nlc3MoZmlsZW5hbWUsIHNvdXJjZSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmICh1dGlsLmlzU3RyaW5nKHNvdXJjZSkgJiYgc291cmNlLmNoYXJBdCgwKSA9PT0gXCJ7XCIpXHJcbiAgICAgICAgICAgICAgICBzb3VyY2UgPSBKU09OLnBhcnNlKHNvdXJjZSk7XHJcbiAgICAgICAgICAgIGlmICghdXRpbC5pc1N0cmluZyhzb3VyY2UpKVxyXG4gICAgICAgICAgICAgICAgc2VsZi5zZXRPcHRpb25zKHNvdXJjZS5vcHRpb25zKS5hZGRKU09OKHNvdXJjZS5uZXN0ZWQpO1xyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHBhcnNlLmZpbGVuYW1lID0gZmlsZW5hbWU7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGFyc2VkID0gcGFyc2Uoc291cmNlLCBzZWxmLCBvcHRpb25zKSxcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlZCxcclxuICAgICAgICAgICAgICAgICAgICBpID0gMDtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJzZWQuaW1wb3J0cylcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IHBhcnNlZC5pbXBvcnRzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzb2x2ZWQgPSBzZWxmLnJlc29sdmVQYXRoKGZpbGVuYW1lLCBwYXJzZWQuaW1wb3J0c1tpXSkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZXRjaChyZXNvbHZlZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VkLndlYWtJbXBvcnRzKVxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYXJzZWQud2Vha0ltcG9ydHMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNvbHZlZCA9IHNlbGYucmVzb2x2ZVBhdGgoZmlsZW5hbWUsIHBhcnNlZC53ZWFrSW1wb3J0c1tpXSkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZXRjaChyZXNvbHZlZCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgZmluaXNoKGVycik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghc3luYyAmJiAhcXVldWVkKVxyXG4gICAgICAgICAgICBmaW5pc2gobnVsbCwgc2VsZik7IC8vIG9ubHkgb25jZSBhbnl3YXlcclxuICAgIH1cclxuXHJcbiAgICAvLyBGZXRjaGVzIGEgc2luZ2xlIGZpbGVcclxuICAgIGZ1bmN0aW9uIGZldGNoKGZpbGVuYW1lLCB3ZWFrKSB7XHJcblxyXG4gICAgICAgIC8vIFN0cmlwIHBhdGggaWYgdGhpcyBmaWxlIHJlZmVyZW5jZXMgYSBidW5kbGVkIGRlZmluaXRpb25cclxuICAgICAgICB2YXIgaWR4ID0gZmlsZW5hbWUubGFzdEluZGV4T2YoXCJnb29nbGUvcHJvdG9idWYvXCIpO1xyXG4gICAgICAgIGlmIChpZHggPiAtMSkge1xyXG4gICAgICAgICAgICB2YXIgYWx0bmFtZSA9IGZpbGVuYW1lLnN1YnN0cmluZyhpZHgpO1xyXG4gICAgICAgICAgICBpZiAoYWx0bmFtZSBpbiBjb21tb24pXHJcbiAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IGFsdG5hbWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTa2lwIGlmIGFscmVhZHkgbG9hZGVkIC8gYXR0ZW1wdGVkXHJcbiAgICAgICAgaWYgKHNlbGYuZmlsZXMuaW5kZXhPZihmaWxlbmFtZSkgPiAtMSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHNlbGYuZmlsZXMucHVzaChmaWxlbmFtZSk7XHJcblxyXG4gICAgICAgIC8vIFNob3J0Y3V0IGJ1bmRsZWQgZGVmaW5pdGlvbnNcclxuICAgICAgICBpZiAoZmlsZW5hbWUgaW4gY29tbW9uKSB7XHJcbiAgICAgICAgICAgIGlmIChzeW5jKVxyXG4gICAgICAgICAgICAgICAgcHJvY2VzcyhmaWxlbmFtZSwgY29tbW9uW2ZpbGVuYW1lXSk7XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgKytxdWV1ZWQ7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC0tcXVldWVkO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MoZmlsZW5hbWUsIGNvbW1vbltmaWxlbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gT3RoZXJ3aXNlIGZldGNoIGZyb20gZGlzayBvciBuZXR3b3JrXHJcbiAgICAgICAgaWYgKHN5bmMpIHtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IHV0aWwuZnMucmVhZEZpbGVTeW5jKGZpbGVuYW1lKS50b1N0cmluZyhcInV0ZjhcIik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF3ZWFrKVxyXG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaChlcnIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHByb2Nlc3MoZmlsZW5hbWUsIHNvdXJjZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgKytxdWV1ZWQ7XHJcbiAgICAgICAgICAgIHV0aWwuZmV0Y2goZmlsZW5hbWUsIGZ1bmN0aW9uKGVyciwgc291cmNlKSB7XHJcbiAgICAgICAgICAgICAgICAtLXF1ZXVlZDtcclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsYmFjaylcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIHRlcm1pbmF0ZWQgbWVhbndoaWxlXHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXdlYWspXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbmlzaChlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFxdWV1ZWQpIC8vIGNhbid0IGJlIGNvdmVyZWQgcmVsaWFibHlcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoKG51bGwsIHNlbGYpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHByb2Nlc3MoZmlsZW5hbWUsIHNvdXJjZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZhciBxdWV1ZWQgPSAwO1xyXG5cclxuICAgIC8vIEFzc2VtYmxpbmcgdGhlIHJvb3QgbmFtZXNwYWNlIGRvZXNuJ3QgcmVxdWlyZSB3b3JraW5nIHR5cGVcclxuICAgIC8vIHJlZmVyZW5jZXMgYW55bW9yZSwgc28gd2UgY2FuIGxvYWQgZXZlcnl0aGluZyBpbiBwYXJhbGxlbFxyXG4gICAgaWYgKHV0aWwuaXNTdHJpbmcoZmlsZW5hbWUpKVxyXG4gICAgICAgIGZpbGVuYW1lID0gWyBmaWxlbmFtZSBdO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIHJlc29sdmVkOyBpIDwgZmlsZW5hbWUubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgaWYgKHJlc29sdmVkID0gc2VsZi5yZXNvbHZlUGF0aChcIlwiLCBmaWxlbmFtZVtpXSkpXHJcbiAgICAgICAgICAgIGZldGNoKHJlc29sdmVkKTtcclxuXHJcbiAgICBpZiAoc3luYylcclxuICAgICAgICByZXR1cm4gc2VsZjtcclxuICAgIGlmICghcXVldWVkKVxyXG4gICAgICAgIGZpbmlzaChudWxsLCBzZWxmKTtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbn07XHJcbi8vIGZ1bmN0aW9uIGxvYWQoZmlsZW5hbWU6c3RyaW5nLCBvcHRpb25zOlBhcnNlT3B0aW9ucywgY2FsbGJhY2s6TG9hZENhbGxiYWNrKTp1bmRlZmluZWRcclxuXHJcbi8qKlxyXG4gKiBMb2FkcyBvbmUgb3IgbXVsdGlwbGUgLnByb3RvIG9yIHByZXByb2Nlc3NlZCAuanNvbiBmaWxlcyBpbnRvIHRoaXMgcm9vdCBuYW1lc3BhY2UgYW5kIGNhbGxzIHRoZSBjYWxsYmFjay5cclxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IGZpbGVuYW1lIE5hbWVzIG9mIG9uZSBvciBtdWx0aXBsZSBmaWxlcyB0byBsb2FkXHJcbiAqIEBwYXJhbSB7TG9hZENhbGxiYWNrfSBjYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAdmFyaWF0aW9uIDJcclxuICovXHJcbi8vIGZ1bmN0aW9uIGxvYWQoZmlsZW5hbWU6c3RyaW5nLCBjYWxsYmFjazpMb2FkQ2FsbGJhY2spOnVuZGVmaW5lZFxyXG5cclxuLyoqXHJcbiAqIExvYWRzIG9uZSBvciBtdWx0aXBsZSAucHJvdG8gb3IgcHJlcHJvY2Vzc2VkIC5qc29uIGZpbGVzIGludG8gdGhpcyByb290IG5hbWVzcGFjZSBhbmQgcmV0dXJucyBhIHByb21pc2UuXHJcbiAqIEBuYW1lIFJvb3QjbG9hZFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IGZpbGVuYW1lIE5hbWVzIG9mIG9uZSBvciBtdWx0aXBsZSBmaWxlcyB0byBsb2FkXHJcbiAqIEBwYXJhbSB7UGFyc2VPcHRpb25zfSBbb3B0aW9uc10gUGFyc2Ugb3B0aW9ucy4gRGVmYXVsdHMgdG8ge0BsaW5rIHBhcnNlLmRlZmF1bHRzfSB3aGVuIG9taXR0ZWQuXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPFJvb3Q+fSBQcm9taXNlXHJcbiAqIEB2YXJpYXRpb24gM1xyXG4gKi9cclxuLy8gZnVuY3Rpb24gbG9hZChmaWxlbmFtZTpzdHJpbmcsIFtvcHRpb25zOlBhcnNlT3B0aW9uc10pOlByb21pc2U8Um9vdD5cclxuXHJcbi8qKlxyXG4gKiBTeW5jaHJvbm91c2x5IGxvYWRzIG9uZSBvciBtdWx0aXBsZSAucHJvdG8gb3IgcHJlcHJvY2Vzc2VkIC5qc29uIGZpbGVzIGludG8gdGhpcyByb290IG5hbWVzcGFjZSAobm9kZSBvbmx5KS5cclxuICogQG5hbWUgUm9vdCNsb2FkU3luY1xyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IGZpbGVuYW1lIE5hbWVzIG9mIG9uZSBvciBtdWx0aXBsZSBmaWxlcyB0byBsb2FkXHJcbiAqIEBwYXJhbSB7UGFyc2VPcHRpb25zfSBbb3B0aW9uc10gUGFyc2Ugb3B0aW9ucy4gRGVmYXVsdHMgdG8ge0BsaW5rIHBhcnNlLmRlZmF1bHRzfSB3aGVuIG9taXR0ZWQuXHJcbiAqIEByZXR1cm5zIHtSb290fSBSb290IG5hbWVzcGFjZVxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgc3luY2hyb25vdXMgZmV0Y2hpbmcgaXMgbm90IHN1cHBvcnRlZCAoaS5lLiBpbiBicm93c2Vycykgb3IgaWYgYSBmaWxlJ3Mgc3ludGF4IGlzIGludmFsaWRcclxuICovXHJcblJvb3QucHJvdG90eXBlLmxvYWRTeW5jID0gZnVuY3Rpb24gbG9hZFN5bmMoZmlsZW5hbWUsIG9wdGlvbnMpIHtcclxuICAgIGlmICghdXRpbC5pc05vZGUpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJub3Qgc3VwcG9ydGVkXCIpO1xyXG4gICAgcmV0dXJuIHRoaXMubG9hZChmaWxlbmFtZSwgb3B0aW9ucywgU1lOQyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQG92ZXJyaWRlXHJcbiAqL1xyXG5Sb290LnByb3RvdHlwZS5yZXNvbHZlQWxsID0gZnVuY3Rpb24gcmVzb2x2ZUFsbCgpIHtcclxuICAgIGlmICh0aGlzLmRlZmVycmVkLmxlbmd0aClcclxuICAgICAgICB0aHJvdyBFcnJvcihcInVucmVzb2x2YWJsZSBleHRlbnNpb25zOiBcIiArIHRoaXMuZGVmZXJyZWQubWFwKGZ1bmN0aW9uKGZpZWxkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcIidleHRlbmQgXCIgKyBmaWVsZC5leHRlbmQgKyBcIicgaW4gXCIgKyBmaWVsZC5wYXJlbnQuZnVsbE5hbWU7XHJcbiAgICAgICAgfSkuam9pbihcIiwgXCIpKTtcclxuICAgIHJldHVybiBOYW1lc3BhY2UucHJvdG90eXBlLnJlc29sdmVBbGwuY2FsbCh0aGlzKTtcclxufTtcclxuXHJcbi8vIG9ubHkgdXBwZXJjYXNlZCAoYW5kIHRodXMgY29uZmxpY3QtZnJlZSkgY2hpbGRyZW4gYXJlIGV4cG9zZWQsIHNlZSBiZWxvd1xyXG52YXIgZXhwb3NlUmUgPSAvXltBLVpdLztcclxuXHJcbi8qKlxyXG4gKiBIYW5kbGVzIGEgZGVmZXJyZWQgZGVjbGFyaW5nIGV4dGVuc2lvbiBmaWVsZCBieSBjcmVhdGluZyBhIHNpc3RlciBmaWVsZCB0byByZXByZXNlbnQgaXQgd2l0aGluIGl0cyBleHRlbmRlZCB0eXBlLlxyXG4gKiBAcGFyYW0ge1Jvb3R9IHJvb3QgUm9vdCBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge0ZpZWxkfSBmaWVsZCBEZWNsYXJpbmcgZXh0ZW5zaW9uIGZpZWxkIHdpdGluIHRoZSBkZWNsYXJpbmcgdHlwZVxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gYHRydWVgIGlmIHN1Y2Nlc3NmdWxseSBhZGRlZCB0byB0aGUgZXh0ZW5kZWQgdHlwZSwgYGZhbHNlYCBvdGhlcndpc2VcclxuICogQGlubmVyXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIHRyeUhhbmRsZUV4dGVuc2lvbihyb290LCBmaWVsZCkge1xyXG4gICAgdmFyIGV4dGVuZGVkVHlwZSA9IGZpZWxkLnBhcmVudC5sb29rdXAoZmllbGQuZXh0ZW5kKTtcclxuICAgIGlmIChleHRlbmRlZFR5cGUpIHtcclxuICAgICAgICB2YXIgc2lzdGVyRmllbGQgPSBuZXcgRmllbGQoZmllbGQuZnVsbE5hbWUsIGZpZWxkLmlkLCBmaWVsZC50eXBlLCBmaWVsZC5ydWxlLCB1bmRlZmluZWQsIGZpZWxkLm9wdGlvbnMpO1xyXG4gICAgICAgIHNpc3RlckZpZWxkLmRlY2xhcmluZ0ZpZWxkID0gZmllbGQ7XHJcbiAgICAgICAgZmllbGQuZXh0ZW5zaW9uRmllbGQgPSBzaXN0ZXJGaWVsZDtcclxuICAgICAgICBleHRlbmRlZFR5cGUuYWRkKHNpc3RlckZpZWxkKTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGxlZCB3aGVuIGFueSBvYmplY3QgaXMgYWRkZWQgdG8gdGhpcyByb290IG9yIGl0cyBzdWItbmFtZXNwYWNlcy5cclxuICogQHBhcmFtIHtSZWZsZWN0aW9uT2JqZWN0fSBvYmplY3QgT2JqZWN0IGFkZGVkXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5Sb290LnByb3RvdHlwZS5faGFuZGxlQWRkID0gZnVuY3Rpb24gX2hhbmRsZUFkZChvYmplY3QpIHtcclxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBGaWVsZCkge1xyXG5cclxuICAgICAgICBpZiAoLyogYW4gZXh0ZW5zaW9uIGZpZWxkIChpbXBsaWVzIG5vdCBwYXJ0IG9mIGEgb25lb2YpICovIG9iamVjdC5leHRlbmQgIT09IHVuZGVmaW5lZCAmJiAvKiBub3QgYWxyZWFkeSBoYW5kbGVkICovICFvYmplY3QuZXh0ZW5zaW9uRmllbGQpXHJcbiAgICAgICAgICAgIGlmICghdHJ5SGFuZGxlRXh0ZW5zaW9uKHRoaXMsIG9iamVjdCkpXHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlZmVycmVkLnB1c2gob2JqZWN0KTtcclxuXHJcbiAgICB9IGVsc2UgaWYgKG9iamVjdCBpbnN0YW5jZW9mIEVudW0pIHtcclxuXHJcbiAgICAgICAgaWYgKGV4cG9zZVJlLnRlc3Qob2JqZWN0Lm5hbWUpKVxyXG4gICAgICAgICAgICBvYmplY3QucGFyZW50W29iamVjdC5uYW1lXSA9IG9iamVjdC52YWx1ZXM7IC8vIGV4cG9zZSBlbnVtIHZhbHVlcyBhcyBwcm9wZXJ0eSBvZiBpdHMgcGFyZW50XHJcblxyXG4gICAgfSBlbHNlIC8qIGV2ZXJ5dGhpbmcgZWxzZSBpcyBhIG5hbWVzcGFjZSAqLyB7XHJcblxyXG4gICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBUeXBlKSAvLyBUcnkgdG8gaGFuZGxlIGFueSBkZWZlcnJlZCBleHRlbnNpb25zXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kZWZlcnJlZC5sZW5ndGg7KVxyXG4gICAgICAgICAgICAgICAgaWYgKHRyeUhhbmRsZUV4dGVuc2lvbih0aGlzLCB0aGlzLmRlZmVycmVkW2ldKSlcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmVycmVkLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICArK2k7XHJcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCAvKiBpbml0aWFsaXplcyAqLyBvYmplY3QubmVzdGVkQXJyYXkubGVuZ3RoOyArK2opIC8vIHJlY3Vyc2UgaW50byB0aGUgbmFtZXNwYWNlXHJcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZUFkZChvYmplY3QuX25lc3RlZEFycmF5W2pdKTtcclxuICAgICAgICBpZiAoZXhwb3NlUmUudGVzdChvYmplY3QubmFtZSkpXHJcbiAgICAgICAgICAgIG9iamVjdC5wYXJlbnRbb2JqZWN0Lm5hbWVdID0gb2JqZWN0OyAvLyBleHBvc2UgbmFtZXNwYWNlIGFzIHByb3BlcnR5IG9mIGl0cyBwYXJlbnRcclxuICAgIH1cclxuXHJcbiAgICAvLyBUaGUgYWJvdmUgYWxzbyBhZGRzIHVwcGVyY2FzZWQgKGFuZCB0aHVzIGNvbmZsaWN0LWZyZWUpIG5lc3RlZCB0eXBlcywgc2VydmljZXMgYW5kIGVudW1zIGFzXHJcbiAgICAvLyBwcm9wZXJ0aWVzIG9mIG5hbWVzcGFjZXMganVzdCBsaWtlIHN0YXRpYyBjb2RlIGRvZXMuIFRoaXMgYWxsb3dzIHVzaW5nIGEgLmQudHMgZ2VuZXJhdGVkIGZvclxyXG4gICAgLy8gYSBzdGF0aWMgbW9kdWxlIHdpdGggcmVmbGVjdGlvbi1iYXNlZCBzb2x1dGlvbnMgd2hlcmUgdGhlIGNvbmRpdGlvbiBpcyBtZXQuXHJcbn07XHJcblxyXG4vKipcclxuICogQ2FsbGVkIHdoZW4gYW55IG9iamVjdCBpcyByZW1vdmVkIGZyb20gdGhpcyByb290IG9yIGl0cyBzdWItbmFtZXNwYWNlcy5cclxuICogQHBhcmFtIHtSZWZsZWN0aW9uT2JqZWN0fSBvYmplY3QgT2JqZWN0IHJlbW92ZWRcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQHByaXZhdGVcclxuICovXHJcblJvb3QucHJvdG90eXBlLl9oYW5kbGVSZW1vdmUgPSBmdW5jdGlvbiBfaGFuZGxlUmVtb3ZlKG9iamVjdCkge1xyXG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIEZpZWxkKSB7XHJcblxyXG4gICAgICAgIGlmICgvKiBhbiBleHRlbnNpb24gZmllbGQgKi8gb2JqZWN0LmV4dGVuZCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGlmICgvKiBhbHJlYWR5IGhhbmRsZWQgKi8gb2JqZWN0LmV4dGVuc2lvbkZpZWxkKSB7IC8vIHJlbW92ZSBpdHMgc2lzdGVyIGZpZWxkXHJcbiAgICAgICAgICAgICAgICBvYmplY3QuZXh0ZW5zaW9uRmllbGQucGFyZW50LnJlbW92ZShvYmplY3QuZXh0ZW5zaW9uRmllbGQpO1xyXG4gICAgICAgICAgICAgICAgb2JqZWN0LmV4dGVuc2lvbkZpZWxkID0gbnVsbDtcclxuICAgICAgICAgICAgfSBlbHNlIHsgLy8gY2FuY2VsIHRoZSBleHRlbnNpb25cclxuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHRoaXMuZGVmZXJyZWQuaW5kZXhPZihvYmplY3QpO1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IC0xKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWQuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGVsc2UgaWYgKG9iamVjdCBpbnN0YW5jZW9mIEVudW0pIHtcclxuXHJcbiAgICAgICAgaWYgKGV4cG9zZVJlLnRlc3Qob2JqZWN0Lm5hbWUpKVxyXG4gICAgICAgICAgICBkZWxldGUgb2JqZWN0LnBhcmVudFtvYmplY3QubmFtZV07IC8vIHVuZXhwb3NlIGVudW0gdmFsdWVzXHJcblxyXG4gICAgfSBlbHNlIGlmIChvYmplY3QgaW5zdGFuY2VvZiBOYW1lc3BhY2UpIHtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAvKiBpbml0aWFsaXplcyAqLyBvYmplY3QubmVzdGVkQXJyYXkubGVuZ3RoOyArK2kpIC8vIHJlY3Vyc2UgaW50byB0aGUgbmFtZXNwYWNlXHJcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZVJlbW92ZShvYmplY3QuX25lc3RlZEFycmF5W2ldKTtcclxuXHJcbiAgICAgICAgaWYgKGV4cG9zZVJlLnRlc3Qob2JqZWN0Lm5hbWUpKVxyXG4gICAgICAgICAgICBkZWxldGUgb2JqZWN0LnBhcmVudFtvYmplY3QubmFtZV07IC8vIHVuZXhwb3NlIG5hbWVzcGFjZXNcclxuXHJcbiAgICB9XHJcbn07XHJcblxyXG5Sb290Ll9jb25maWd1cmUgPSBmdW5jdGlvbihUeXBlXywgcGFyc2VfLCBjb21tb25fKSB7XHJcbiAgICBUeXBlID0gVHlwZV87XHJcbiAgICBwYXJzZSA9IHBhcnNlXztcclxuICAgIGNvbW1vbiA9IGNvbW1vbl87XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxuLyoqXHJcbiAqIFN0cmVhbWluZyBSUEMgaGVscGVycy5cclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxudmFyIHJwYyA9IGV4cG9ydHM7XHJcblxyXG4vKipcclxuICogUlBDIGltcGxlbWVudGF0aW9uIHBhc3NlZCB0byB7QGxpbmsgU2VydmljZSNjcmVhdGV9IHBlcmZvcm1pbmcgYSBzZXJ2aWNlIHJlcXVlc3Qgb24gbmV0d29yayBsZXZlbCwgaS5lLiBieSB1dGlsaXppbmcgaHR0cCByZXF1ZXN0cyBvciB3ZWJzb2NrZXRzLlxyXG4gKiBAdHlwZWRlZiBSUENJbXBsXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHtNZXRob2R8cnBjLlNlcnZpY2VNZXRob2R9IG1ldGhvZCBSZWZsZWN0ZWQgb3Igc3RhdGljIG1ldGhvZCBiZWluZyBjYWxsZWRcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSByZXF1ZXN0RGF0YSBSZXF1ZXN0IGRhdGFcclxuICogQHBhcmFtIHtSUENJbXBsQ2FsbGJhY2t9IGNhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEBleGFtcGxlXHJcbiAqIGZ1bmN0aW9uIHJwY0ltcGwobWV0aG9kLCByZXF1ZXN0RGF0YSwgY2FsbGJhY2spIHtcclxuICogICAgIGlmIChwcm90b2J1Zi51dGlsLmxjRmlyc3QobWV0aG9kLm5hbWUpICE9PSBcIm15TWV0aG9kXCIpIC8vIGNvbXBhdGlibGUgd2l0aCBzdGF0aWMgY29kZVxyXG4gKiAgICAgICAgIHRocm93IEVycm9yKFwibm8gc3VjaCBtZXRob2RcIik7XHJcbiAqICAgICBhc3luY2hyb25vdXNseU9idGFpbkFSZXNwb25zZShyZXF1ZXN0RGF0YSwgZnVuY3Rpb24oZXJyLCByZXNwb25zZURhdGEpIHtcclxuICogICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3BvbnNlRGF0YSk7XHJcbiAqICAgICB9KTtcclxuICogfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBOb2RlLXN0eWxlIGNhbGxiYWNrIGFzIHVzZWQgYnkge0BsaW5rIFJQQ0ltcGx9LlxyXG4gKiBAdHlwZWRlZiBSUENJbXBsQ2FsbGJhY2tcclxuICogQHR5cGUge2Z1bmN0aW9ufVxyXG4gKiBAcGFyYW0gez9FcnJvcn0gZXJyb3IgRXJyb3IsIGlmIGFueSwgb3RoZXJ3aXNlIGBudWxsYFxyXG4gKiBAcGFyYW0gez9VaW50OEFycmF5fSBbcmVzcG9uc2VdIFJlc3BvbnNlIGRhdGEgb3IgYG51bGxgIHRvIHNpZ25hbCBlbmQgb2Ygc3RyZWFtLCBpZiB0aGVyZSBoYXNuJ3QgYmVlbiBhbiBlcnJvclxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuXHJcbnJwYy5TZXJ2aWNlID0gcmVxdWlyZShcIi4vcnBjL3NlcnZpY2VcIik7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFNlcnZpY2U7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuLi91dGlsL21pbmltYWxcIik7XHJcblxyXG4vLyBFeHRlbmRzIEV2ZW50RW1pdHRlclxyXG4oU2VydmljZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHV0aWwuRXZlbnRFbWl0dGVyLnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gU2VydmljZTtcclxuXHJcbi8qKlxyXG4gKiBBIHNlcnZpY2UgbWV0aG9kIGNhbGxiYWNrIGFzIHVzZWQgYnkge0BsaW5rIHJwYy5TZXJ2aWNlTWV0aG9kfFNlcnZpY2VNZXRob2R9LlxyXG4gKlxyXG4gKiBEaWZmZXJzIGZyb20ge0BsaW5rIFJQQ0ltcGxDYWxsYmFja30gaW4gdGhhdCBpdCBpcyBhbiBhY3R1YWwgY2FsbGJhY2sgb2YgYSBzZXJ2aWNlIG1ldGhvZCB3aGljaCBtYXkgbm90IHJldHVybiBgcmVzcG9uc2UgPSBudWxsYC5cclxuICogQHR5cGVkZWYgcnBjLlNlcnZpY2VNZXRob2RDYWxsYmFja1xyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7P0Vycm9yfSBlcnJvciBFcnJvciwgaWYgYW55XHJcbiAqIEBwYXJhbSB7P01lc3NhZ2V9IFtyZXNwb25zZV0gUmVzcG9uc2UgbWVzc2FnZVxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBBIHNlcnZpY2UgbWV0aG9kIHBhcnQgb2YgYSB7QGxpbmsgcnBjLlNlcnZpY2VNZXRob2RNaXhpbnxTZXJ2aWNlTWV0aG9kTWl4aW59IGFuZCB0aHVzIHtAbGluayBycGMuU2VydmljZX0gYXMgY3JlYXRlZCBieSB7QGxpbmsgU2VydmljZS5jcmVhdGV9LlxyXG4gKiBAdHlwZWRlZiBycGMuU2VydmljZU1ldGhvZFxyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7TWVzc2FnZXxPYmplY3QuPHN0cmluZywqPn0gcmVxdWVzdCBSZXF1ZXN0IG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0XHJcbiAqIEBwYXJhbSB7cnBjLlNlcnZpY2VNZXRob2RDYWxsYmFja30gW2NhbGxiYWNrXSBOb2RlLXN0eWxlIGNhbGxiYWNrIGNhbGxlZCB3aXRoIHRoZSBlcnJvciwgaWYgYW55LCBhbmQgdGhlIHJlc3BvbnNlIG1lc3NhZ2VcclxuICogQHJldHVybnMge1Byb21pc2U8TWVzc2FnZT59IFByb21pc2UgaWYgYGNhbGxiYWNrYCBoYXMgYmVlbiBvbWl0dGVkLCBvdGhlcndpc2UgYHVuZGVmaW5lZGBcclxuICovXHJcblxyXG4vKipcclxuICogQSBzZXJ2aWNlIG1ldGhvZCBtaXhpbi5cclxuICpcclxuICogV2hlbiB1c2luZyBUeXBlU2NyaXB0LCBtaXhlZCBpbiBzZXJ2aWNlIG1ldGhvZHMgYXJlIG9ubHkgc3VwcG9ydGVkIGRpcmVjdGx5IHdpdGggYSB0eXBlIGRlZmluaXRpb24gb2YgYSBzdGF0aWMgbW9kdWxlICh1c2VkIHdpdGggcmVmbGVjdGlvbikuIE90aGVyd2lzZSwgZXhwbGljaXQgY2FzdGluZyBpcyByZXF1aXJlZC5cclxuICogQHR5cGVkZWYgcnBjLlNlcnZpY2VNZXRob2RNaXhpblxyXG4gKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcscnBjLlNlcnZpY2VNZXRob2Q+fVxyXG4gKiBAZXhhbXBsZVxyXG4gKiAvLyBFeHBsaWNpdCBjYXN0aW5nIHdpdGggVHlwZVNjcmlwdFxyXG4gKiAobXlScGNTZXJ2aWNlW1wibXlNZXRob2RcIl0gYXMgcHJvdG9idWYucnBjLlNlcnZpY2VNZXRob2QpKC4uLilcclxuICovXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBSUEMgc2VydmljZSBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBBbiBSUEMgc2VydmljZSBhcyByZXR1cm5lZCBieSB7QGxpbmsgU2VydmljZSNjcmVhdGV9LlxyXG4gKiBAZXhwb3J0cyBycGMuU2VydmljZVxyXG4gKiBAZXh0ZW5kcyB1dGlsLkV2ZW50RW1pdHRlclxyXG4gKiBAYXVnbWVudHMgcnBjLlNlcnZpY2VNZXRob2RNaXhpblxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtSUENJbXBsfSBycGNJbXBsIFJQQyBpbXBsZW1lbnRhdGlvblxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtyZXF1ZXN0RGVsaW1pdGVkPWZhbHNlXSBXaGV0aGVyIHJlcXVlc3RzIGFyZSBsZW5ndGgtZGVsaW1pdGVkXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3Jlc3BvbnNlRGVsaW1pdGVkPWZhbHNlXSBXaGV0aGVyIHJlc3BvbnNlcyBhcmUgbGVuZ3RoLWRlbGltaXRlZFxyXG4gKi9cclxuZnVuY3Rpb24gU2VydmljZShycGNJbXBsLCByZXF1ZXN0RGVsaW1pdGVkLCByZXNwb25zZURlbGltaXRlZCkge1xyXG5cclxuICAgIGlmICh0eXBlb2YgcnBjSW1wbCAhPT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcInJwY0ltcGwgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xyXG5cclxuICAgIHV0aWwuRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSUEMgaW1wbGVtZW50YXRpb24uIEJlY29tZXMgYG51bGxgIG9uY2UgdGhlIHNlcnZpY2UgaXMgZW5kZWQuXHJcbiAgICAgKiBAdHlwZSB7P1JQQ0ltcGx9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucnBjSW1wbCA9IHJwY0ltcGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXaGV0aGVyIHJlcXVlc3RzIGFyZSBsZW5ndGgtZGVsaW1pdGVkLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVxdWVzdERlbGltaXRlZCA9IEJvb2xlYW4ocmVxdWVzdERlbGltaXRlZCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXaGV0aGVyIHJlc3BvbnNlcyBhcmUgbGVuZ3RoLWRlbGltaXRlZC5cclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJlc3BvbnNlRGVsaW1pdGVkID0gQm9vbGVhbihyZXNwb25zZURlbGltaXRlZCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxscyBhIHNlcnZpY2UgbWV0aG9kIHRocm91Z2gge0BsaW5rIHJwYy5TZXJ2aWNlI3JwY0ltcGx8cnBjSW1wbH0uXHJcbiAqIEBwYXJhbSB7TWV0aG9kfHJwYy5TZXJ2aWNlTWV0aG9kfSBtZXRob2QgUmVmbGVjdGVkIG9yIHN0YXRpYyBtZXRob2RcclxuICogQHBhcmFtIHtmdW5jdGlvbn0gcmVxdWVzdEN0b3IgUmVxdWVzdCBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSByZXNwb25zZUN0b3IgUmVzcG9uc2UgY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtNZXNzYWdlfE9iamVjdC48c3RyaW5nLCo+fSByZXF1ZXN0IFJlcXVlc3QgbWVzc2FnZSBvciBwbGFpbiBvYmplY3RcclxuICogQHBhcmFtIHtycGMuU2VydmljZU1ldGhvZENhbGxiYWNrfSBjYWxsYmFjayBTZXJ2aWNlIGNhbGxiYWNrXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5TZXJ2aWNlLnByb3RvdHlwZS5ycGNDYWxsID0gZnVuY3Rpb24gcnBjQ2FsbChtZXRob2QsIHJlcXVlc3RDdG9yLCByZXNwb25zZUN0b3IsIHJlcXVlc3QsIGNhbGxiYWNrKSB7XHJcblxyXG4gICAgaWYgKCFyZXF1ZXN0KVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcInJlcXVlc3QgbXVzdCBiZSBzcGVjaWZpZWRcIik7XHJcblxyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgaWYgKCFjYWxsYmFjaylcclxuICAgICAgICByZXR1cm4gdXRpbC5hc1Byb21pc2UocnBjQ2FsbCwgc2VsZiwgbWV0aG9kLCByZXF1ZXN0Q3RvciwgcmVzcG9uc2VDdG9yLCByZXF1ZXN0KTtcclxuXHJcbiAgICBpZiAoIXNlbGYucnBjSW1wbCkge1xyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKEVycm9yKFwiYWxyZWFkeSBlbmRlZFwiKSk7IH0sIDApO1xyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gc2VsZi5ycGNJbXBsKFxyXG4gICAgICAgICAgICBtZXRob2QsXHJcbiAgICAgICAgICAgIHJlcXVlc3RDdG9yW3NlbGYucmVxdWVzdERlbGltaXRlZCA/IFwiZW5jb2RlRGVsaW1pdGVkXCIgOiBcImVuY29kZVwiXShyZXF1ZXN0KS5maW5pc2goKSxcclxuICAgICAgICAgICAgZnVuY3Rpb24gcnBjQ2FsbGJhY2soZXJyLCByZXNwb25zZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmVtaXQoXCJlcnJvclwiLCBlcnIsIG1ldGhvZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5lbmQoLyogZW5kZWRCeVJQQyAqLyB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICghKHJlc3BvbnNlIGluc3RhbmNlb2YgcmVzcG9uc2VDdG9yKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gcmVzcG9uc2VDdG9yW3NlbGYucmVzcG9uc2VEZWxpbWl0ZWQgPyBcImRlY29kZURlbGltaXRlZFwiIDogXCJkZWNvZGVcIl0ocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmVtaXQoXCJlcnJvclwiLCBlcnIsIG1ldGhvZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzZWxmLmVtaXQoXCJkYXRhXCIsIHJlc3BvbnNlLCBtZXRob2QpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICk7XHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICBzZWxmLmVtaXQoXCJlcnJvclwiLCBlcnIsIG1ldGhvZCk7XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soZXJyKTsgfSwgMCk7XHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbmRzIHRoaXMgc2VydmljZSBhbmQgZW1pdHMgdGhlIGBlbmRgIGV2ZW50LlxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtlbmRlZEJ5UlBDPWZhbHNlXSBXaGV0aGVyIHRoZSBzZXJ2aWNlIGhhcyBiZWVuIGVuZGVkIGJ5IHRoZSBSUEMgaW1wbGVtZW50YXRpb24uXHJcbiAqIEByZXR1cm5zIHtycGMuU2VydmljZX0gYHRoaXNgXHJcbiAqL1xyXG5TZXJ2aWNlLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiBlbmQoZW5kZWRCeVJQQykge1xyXG4gICAgaWYgKHRoaXMucnBjSW1wbCkge1xyXG4gICAgICAgIGlmICghZW5kZWRCeVJQQykgLy8gc2lnbmFsIGVuZCB0byBycGNJbXBsXHJcbiAgICAgICAgICAgIHRoaXMucnBjSW1wbChudWxsLCBudWxsLCBudWxsKTtcclxuICAgICAgICB0aGlzLnJwY0ltcGwgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuZW1pdChcImVuZFwiKS5vZmYoKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBTZXJ2aWNlO1xyXG5cclxuLy8gZXh0ZW5kcyBOYW1lc3BhY2VcclxudmFyIE5hbWVzcGFjZSA9IHJlcXVpcmUoXCIuL25hbWVzcGFjZVwiKTtcclxuKChTZXJ2aWNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTmFtZXNwYWNlLnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gU2VydmljZSkuY2xhc3NOYW1lID0gXCJTZXJ2aWNlXCI7XHJcblxyXG52YXIgTWV0aG9kID0gcmVxdWlyZShcIi4vbWV0aG9kXCIpLFxyXG4gICAgdXRpbCAgID0gcmVxdWlyZShcIi4vdXRpbFwiKSxcclxuICAgIHJwYyAgICA9IHJlcXVpcmUoXCIuL3JwY1wiKTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHNlcnZpY2UgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgUmVmbGVjdGVkIHNlcnZpY2UuXHJcbiAqIEBleHRlbmRzIE5hbWVzcGFjZUJhc2VcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFNlcnZpY2UgbmFtZVxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gU2VydmljZSBvcHRpb25zXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYXJndW1lbnRzIGFyZSBpbnZhbGlkXHJcbiAqL1xyXG5mdW5jdGlvbiBTZXJ2aWNlKG5hbWUsIG9wdGlvbnMpIHtcclxuICAgIE5hbWVzcGFjZS5jYWxsKHRoaXMsIG5hbWUsIG9wdGlvbnMpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2VydmljZSBtZXRob2RzLlxyXG4gICAgICogQHR5cGUge09iamVjdC48c3RyaW5nLE1ldGhvZD59XHJcbiAgICAgKi9cclxuICAgIHRoaXMubWV0aG9kcyA9IHt9OyAvLyB0b0pTT04sIG1hcmtlclxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FjaGVkIG1ldGhvZHMgYXMgYW4gYXJyYXkuXHJcbiAgICAgKiBAdHlwZSB7P01ldGhvZFtdfVxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgdGhpcy5fbWV0aG9kc0FycmF5ID0gbnVsbDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNlcnZpY2UgZGVzY3JpcHRvci5cclxuICogQHR5cGVkZWYgU2VydmljZURlc2NyaXB0b3JcclxuICogQHR5cGUge09iamVjdH1cclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIFNlcnZpY2Ugb3B0aW9uc1xyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLE1ldGhvZERlc2NyaXB0b3I+fSBtZXRob2RzIE1ldGhvZCBkZXNjcmlwdG9yc1xyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLEFueU5lc3RlZERlc2NyaXB0b3I+fSBbbmVzdGVkXSBOZXN0ZWQgb2JqZWN0IGRlc2NyaXB0b3JzXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBzZXJ2aWNlIGZyb20gYSBzZXJ2aWNlIGRlc2NyaXB0b3IuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFNlcnZpY2UgbmFtZVxyXG4gKiBAcGFyYW0ge1NlcnZpY2VEZXNjcmlwdG9yfSBqc29uIFNlcnZpY2UgZGVzY3JpcHRvclxyXG4gKiBAcmV0dXJucyB7U2VydmljZX0gQ3JlYXRlZCBzZXJ2aWNlXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYXJndW1lbnRzIGFyZSBpbnZhbGlkXHJcbiAqL1xyXG5TZXJ2aWNlLmZyb21KU09OID0gZnVuY3Rpb24gZnJvbUpTT04obmFtZSwganNvbikge1xyXG4gICAgdmFyIHNlcnZpY2UgPSBuZXcgU2VydmljZShuYW1lLCBqc29uLm9wdGlvbnMpO1xyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgIGlmIChqc29uLm1ldGhvZHMpXHJcbiAgICAgICAgZm9yICh2YXIgbmFtZXMgPSBPYmplY3Qua2V5cyhqc29uLm1ldGhvZHMpLCBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICBzZXJ2aWNlLmFkZChNZXRob2QuZnJvbUpTT04obmFtZXNbaV0sIGpzb24ubWV0aG9kc1tuYW1lc1tpXV0pKTtcclxuICAgIGlmIChqc29uLm5lc3RlZClcclxuICAgICAgICBzZXJ2aWNlLmFkZEpTT04oanNvbi5uZXN0ZWQpO1xyXG4gICAgcmV0dXJuIHNlcnZpY2U7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhpcyBzZXJ2aWNlIHRvIGEgc2VydmljZSBkZXNjcmlwdG9yLlxyXG4gKiBAcmV0dXJucyB7U2VydmljZURlc2NyaXB0b3J9IFNlcnZpY2UgZGVzY3JpcHRvclxyXG4gKi9cclxuU2VydmljZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xyXG4gICAgdmFyIGluaGVyaXRlZCA9IE5hbWVzcGFjZS5wcm90b3R5cGUudG9KU09OLmNhbGwodGhpcyk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIG9wdGlvbnMgOiBpbmhlcml0ZWQgJiYgaW5oZXJpdGVkLm9wdGlvbnMgfHwgdW5kZWZpbmVkLFxyXG4gICAgICAgIG1ldGhvZHMgOiBOYW1lc3BhY2UuYXJyYXlUb0pTT04odGhpcy5tZXRob2RzQXJyYXkpIHx8IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIHt9LFxyXG4gICAgICAgIG5lc3RlZCAgOiBpbmhlcml0ZWQgJiYgaW5oZXJpdGVkLm5lc3RlZCB8fCB1bmRlZmluZWRcclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogTWV0aG9kcyBvZiB0aGlzIHNlcnZpY2UgYXMgYW4gYXJyYXkgZm9yIGl0ZXJhdGlvbi5cclxuICogQG5hbWUgU2VydmljZSNtZXRob2RzQXJyYXlcclxuICogQHR5cGUge01ldGhvZFtdfVxyXG4gKiBAcmVhZG9ubHlcclxuICovXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTZXJ2aWNlLnByb3RvdHlwZSwgXCJtZXRob2RzQXJyYXlcIiwge1xyXG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fbWV0aG9kc0FycmF5IHx8ICh0aGlzLl9tZXRob2RzQXJyYXkgPSB1dGlsLnRvQXJyYXkodGhpcy5tZXRob2RzKSk7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gY2xlYXJDYWNoZShzZXJ2aWNlKSB7XHJcbiAgICBzZXJ2aWNlLl9tZXRob2RzQXJyYXkgPSBudWxsO1xyXG4gICAgcmV0dXJuIHNlcnZpY2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldChuYW1lKSB7XHJcbiAgICByZXR1cm4gdGhpcy5tZXRob2RzW25hbWVdXHJcbiAgICAgICAgfHwgTmFtZXNwYWNlLnByb3RvdHlwZS5nZXQuY2FsbCh0aGlzLCBuYW1lKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLnJlc29sdmVBbGwgPSBmdW5jdGlvbiByZXNvbHZlQWxsKCkge1xyXG4gICAgdmFyIG1ldGhvZHMgPSB0aGlzLm1ldGhvZHNBcnJheTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWV0aG9kcy5sZW5ndGg7ICsraSlcclxuICAgICAgICBtZXRob2RzW2ldLnJlc29sdmUoKTtcclxuICAgIHJldHVybiBOYW1lc3BhY2UucHJvdG90eXBlLnJlc29sdmUuY2FsbCh0aGlzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZChvYmplY3QpIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICh0aGlzLmdldChvYmplY3QubmFtZSkpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJkdXBsaWNhdGUgbmFtZSAnXCIgKyBvYmplY3QubmFtZSArIFwiJyBpbiBcIiArIHRoaXMpO1xyXG5cclxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBNZXRob2QpIHtcclxuICAgICAgICB0aGlzLm1ldGhvZHNbb2JqZWN0Lm5hbWVdID0gb2JqZWN0O1xyXG4gICAgICAgIG9iamVjdC5wYXJlbnQgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBjbGVhckNhY2hlKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIE5hbWVzcGFjZS5wcm90b3R5cGUuYWRkLmNhbGwodGhpcywgb2JqZWN0KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZShvYmplY3QpIHtcclxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBNZXRob2QpIHtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKHRoaXMubWV0aG9kc1tvYmplY3QubmFtZV0gIT09IG9iamVjdClcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3Iob2JqZWN0ICsgXCIgaXMgbm90IGEgbWVtYmVyIG9mIFwiICsgdGhpcyk7XHJcblxyXG4gICAgICAgIGRlbGV0ZSB0aGlzLm1ldGhvZHNbb2JqZWN0Lm5hbWVdO1xyXG4gICAgICAgIG9iamVjdC5wYXJlbnQgPSBudWxsO1xyXG4gICAgICAgIHJldHVybiBjbGVhckNhY2hlKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIE5hbWVzcGFjZS5wcm90b3R5cGUucmVtb3ZlLmNhbGwodGhpcywgb2JqZWN0KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgcnVudGltZSBzZXJ2aWNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcnBjIGltcGxlbWVudGF0aW9uLlxyXG4gKiBAcGFyYW0ge1JQQ0ltcGx9IHJwY0ltcGwgUlBDIGltcGxlbWVudGF0aW9uXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3JlcXVlc3REZWxpbWl0ZWQ9ZmFsc2VdIFdoZXRoZXIgcmVxdWVzdHMgYXJlIGxlbmd0aC1kZWxpbWl0ZWRcclxuICogQHBhcmFtIHtib29sZWFufSBbcmVzcG9uc2VEZWxpbWl0ZWQ9ZmFsc2VdIFdoZXRoZXIgcmVzcG9uc2VzIGFyZSBsZW5ndGgtZGVsaW1pdGVkXHJcbiAqIEByZXR1cm5zIHtycGMuU2VydmljZX0gUlBDIHNlcnZpY2UuIFVzZWZ1bCB3aGVyZSByZXF1ZXN0cyBhbmQvb3IgcmVzcG9uc2VzIGFyZSBzdHJlYW1lZC5cclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShycGNJbXBsLCByZXF1ZXN0RGVsaW1pdGVkLCByZXNwb25zZURlbGltaXRlZCkge1xyXG4gICAgdmFyIHJwY1NlcnZpY2UgPSBuZXcgcnBjLlNlcnZpY2UocnBjSW1wbCwgcmVxdWVzdERlbGltaXRlZCwgcmVzcG9uc2VEZWxpbWl0ZWQpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAvKiBpbml0aWFsaXplcyAqLyB0aGlzLm1ldGhvZHNBcnJheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHJwY1NlcnZpY2VbdXRpbC5sY0ZpcnN0KHRoaXMuX21ldGhvZHNBcnJheVtpXS5yZXNvbHZlKCkubmFtZSldID0gdXRpbC5jb2RlZ2VuKFwiclwiLFwiY1wiKShcInJldHVybiB0aGlzLnJwY0NhbGwobSxxLHMscixjKVwiKS5lb2YodXRpbC5sY0ZpcnN0KHRoaXMuX21ldGhvZHNBcnJheVtpXS5uYW1lKSwge1xyXG4gICAgICAgICAgICBtOiB0aGlzLl9tZXRob2RzQXJyYXlbaV0sXHJcbiAgICAgICAgICAgIHE6IHRoaXMuX21ldGhvZHNBcnJheVtpXS5yZXNvbHZlZFJlcXVlc3RUeXBlLmN0b3IsXHJcbiAgICAgICAgICAgIHM6IHRoaXMuX21ldGhvZHNBcnJheVtpXS5yZXNvbHZlZFJlc3BvbnNlVHlwZS5jdG9yXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcnBjU2VydmljZTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gdG9rZW5pemU7XHJcblxyXG52YXIgZGVsaW1SZSAgICAgICAgPSAvW1xcc3t9PTs6W1xcXSwnXCIoKTw+XS9nLFxyXG4gICAgc3RyaW5nRG91YmxlUmUgPSAvKD86XCIoW15cIlxcXFxdKig/OlxcXFwuW15cIlxcXFxdKikqKVwiKS9nLFxyXG4gICAgc3RyaW5nU2luZ2xlUmUgPSAvKD86JyhbXidcXFxcXSooPzpcXFxcLlteJ1xcXFxdKikqKScpL2c7XHJcblxyXG52YXIgc2V0Q29tbWVudFJlID0gL14gKlsqL10rICovLFxyXG4gICAgc2V0Q29tbWVudFNwbGl0UmUgPSAvXFxuL2csXHJcbiAgICB3aGl0ZXNwYWNlUmUgPSAvXFxzLyxcclxuICAgIHVuZXNjYXBlUmUgPSAvXFxcXCguPykvZztcclxuXHJcbnZhciB1bmVzY2FwZU1hcCA9IHtcclxuICAgIFwiMFwiOiBcIlxcMFwiLFxyXG4gICAgXCJyXCI6IFwiXFxyXCIsXHJcbiAgICBcIm5cIjogXCJcXG5cIixcclxuICAgIFwidFwiOiBcIlxcdFwiXHJcbn07XHJcblxyXG4vKipcclxuICogVW5lc2NhcGVzIGEgc3RyaW5nLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIFN0cmluZyB0byB1bmVzY2FwZVxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBVbmVzY2FwZWQgc3RyaW5nXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsc3RyaW5nPn0gbWFwIFNwZWNpYWwgY2hhcmFjdGVycyBtYXBcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gdW5lc2NhcGUoc3RyKSB7XHJcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UodW5lc2NhcGVSZSwgZnVuY3Rpb24oJDAsICQxKSB7XHJcbiAgICAgICAgc3dpdGNoICgkMSkge1xyXG4gICAgICAgICAgICBjYXNlIFwiXFxcXFwiOlxyXG4gICAgICAgICAgICBjYXNlIFwiXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJDE7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5lc2NhcGVNYXBbJDFdIHx8IFwiXCI7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbnRva2VuaXplLnVuZXNjYXBlID0gdW5lc2NhcGU7XHJcblxyXG4vKipcclxuICogSGFuZGxlIG9iamVjdCByZXR1cm5lZCBmcm9tIHtAbGluayB0b2tlbml6ZX0uXHJcbiAqIEB0eXBlZGVmIHtPYmplY3QuPHN0cmluZywqPn0gVG9rZW5pemVySGFuZGxlXHJcbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb24oKTpudW1iZXJ9IGxpbmUgR2V0cyB0aGUgY3VycmVudCBsaW5lIG51bWJlclxyXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9uKCk6P3N0cmluZ30gbmV4dCBHZXRzIHRoZSBuZXh0IHRva2VuIGFuZCBhZHZhbmNlcyAoYG51bGxgIG9uIGVvZilcclxuICogQHByb3BlcnR5IHtmdW5jdGlvbigpOj9zdHJpbmd9IHBlZWsgUGVla3MgZm9yIHRoZSBuZXh0IHRva2VuIChgbnVsbGAgb24gZW9mKVxyXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9uKHN0cmluZyl9IHB1c2ggUHVzaGVzIGEgdG9rZW4gYmFjayB0byB0aGUgc3RhY2tcclxuICogQHByb3BlcnR5IHtmdW5jdGlvbihzdHJpbmcsIGJvb2xlYW49KTpib29sZWFufSBza2lwIFNraXBzIGEgdG9rZW4sIHJldHVybnMgaXRzIHByZXNlbmNlIGFuZCBhZHZhbmNlcyBvciwgaWYgbm9uLW9wdGlvbmFsIGFuZCBub3QgcHJlc2VudCwgdGhyb3dzXHJcbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb24obnVtYmVyPSk6P3N0cmluZ30gY21udCBHZXRzIHRoZSBjb21tZW50IG9uIHRoZSBwcmV2aW91cyBsaW5lIG9yIHRoZSBsaW5lIGNvbW1lbnQgb24gdGhlIHNwZWNpZmllZCBsaW5lLCBpZiBhbnlcclxuICovXHJcblxyXG4vKipcclxuICogVG9rZW5pemVzIHRoZSBnaXZlbiAucHJvdG8gc291cmNlIGFuZCByZXR1cm5zIGFuIG9iamVjdCB3aXRoIHVzZWZ1bCB1dGlsaXR5IGZ1bmN0aW9ucy5cclxuICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZSBTb3VyY2UgY29udGVudHNcclxuICogQHJldHVybnMge1Rva2VuaXplckhhbmRsZX0gVG9rZW5pemVyIGhhbmRsZVxyXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9uKHN0cmluZyk6c3RyaW5nfSB1bmVzY2FwZSBVbmVzY2FwZXMgYSBzdHJpbmdcclxuICovXHJcbmZ1bmN0aW9uIHRva2VuaXplKHNvdXJjZSkge1xyXG4gICAgLyogZXNsaW50LWRpc2FibGUgY2FsbGJhY2stcmV0dXJuICovXHJcbiAgICBzb3VyY2UgPSBzb3VyY2UudG9TdHJpbmcoKTtcclxuXHJcbiAgICB2YXIgb2Zmc2V0ID0gMCxcclxuICAgICAgICBsZW5ndGggPSBzb3VyY2UubGVuZ3RoLFxyXG4gICAgICAgIGxpbmUgPSAxLFxyXG4gICAgICAgIGNvbW1lbnRUeXBlID0gbnVsbCxcclxuICAgICAgICBjb21tZW50VGV4dCA9IG51bGwsXHJcbiAgICAgICAgY29tbWVudExpbmUgPSAwO1xyXG5cclxuICAgIHZhciBzdGFjayA9IFtdO1xyXG5cclxuICAgIHZhciBzdHJpbmdEZWxpbSA9IG51bGw7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhbiBlcnJvciBmb3IgaWxsZWdhbCBzeW50YXguXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3ViamVjdCBTdWJqZWN0XHJcbiAgICAgKiBAcmV0dXJucyB7RXJyb3J9IEVycm9yIGNyZWF0ZWRcclxuICAgICAqIEBpbm5lclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBpbGxlZ2FsKHN1YmplY3QpIHtcclxuICAgICAgICByZXR1cm4gRXJyb3IoXCJpbGxlZ2FsIFwiICsgc3ViamVjdCArIFwiIChsaW5lIFwiICsgbGluZSArIFwiKVwiKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWRzIGEgc3RyaW5nIHRpbGwgaXRzIGVuZC5cclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFN0cmluZyByZWFkXHJcbiAgICAgKiBAaW5uZXJcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gcmVhZFN0cmluZygpIHtcclxuICAgICAgICB2YXIgcmUgPSBzdHJpbmdEZWxpbSA9PT0gXCInXCIgPyBzdHJpbmdTaW5nbGVSZSA6IHN0cmluZ0RvdWJsZVJlO1xyXG4gICAgICAgIHJlLmxhc3RJbmRleCA9IG9mZnNldCAtIDE7XHJcbiAgICAgICAgdmFyIG1hdGNoID0gcmUuZXhlYyhzb3VyY2UpO1xyXG4gICAgICAgIGlmICghbWF0Y2gpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwoXCJzdHJpbmdcIik7XHJcbiAgICAgICAgb2Zmc2V0ID0gcmUubGFzdEluZGV4O1xyXG4gICAgICAgIHB1c2goc3RyaW5nRGVsaW0pO1xyXG4gICAgICAgIHN0cmluZ0RlbGltID0gbnVsbDtcclxuICAgICAgICByZXR1cm4gdW5lc2NhcGUobWF0Y2hbMV0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0cyB0aGUgY2hhcmFjdGVyIGF0IGBwb3NgIHdpdGhpbiB0aGUgc291cmNlLlxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBvcyBQb3NpdGlvblxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQ2hhcmFjdGVyXHJcbiAgICAgKiBAaW5uZXJcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gY2hhckF0KHBvcykge1xyXG4gICAgICAgIHJldHVybiBzb3VyY2UuY2hhckF0KHBvcyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZXRzIHRoZSBjdXJyZW50IGNvbW1lbnQgdGV4dC5cclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCBTdGFydCBvZmZzZXRcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgRW5kIG9mZnNldFxyXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICAgICAqIEBpbm5lclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBzZXRDb21tZW50KHN0YXJ0LCBlbmQpIHtcclxuICAgICAgICBjb21tZW50VHlwZSA9IHNvdXJjZS5jaGFyQXQoc3RhcnQrKyk7XHJcbiAgICAgICAgY29tbWVudExpbmUgPSBsaW5lO1xyXG4gICAgICAgIHZhciBsaW5lcyA9IHNvdXJjZVxyXG4gICAgICAgICAgICAuc3Vic3RyaW5nKHN0YXJ0LCBlbmQpXHJcbiAgICAgICAgICAgIC5zcGxpdChzZXRDb21tZW50U3BsaXRSZSk7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgbGluZXNbaV0gPSBsaW5lc1tpXS5yZXBsYWNlKHNldENvbW1lbnRSZSwgXCJcIikudHJpbSgpO1xyXG4gICAgICAgIGNvbW1lbnRUZXh0ID0gbGluZXNcclxuICAgICAgICAgICAgLmpvaW4oXCJcXG5cIilcclxuICAgICAgICAgICAgLnRyaW0oKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIE9idGFpbnMgdGhlIG5leHQgdG9rZW4uXHJcbiAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gTmV4dCB0b2tlbiBvciBgbnVsbGAgb24gZW9mXHJcbiAgICAgKiBAaW5uZXJcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gbmV4dCgpIHtcclxuICAgICAgICBpZiAoc3RhY2subGVuZ3RoID4gMClcclxuICAgICAgICAgICAgcmV0dXJuIHN0YWNrLnNoaWZ0KCk7XHJcbiAgICAgICAgaWYgKHN0cmluZ0RlbGltKVxyXG4gICAgICAgICAgICByZXR1cm4gcmVhZFN0cmluZygpO1xyXG4gICAgICAgIHZhciByZXBlYXQsXHJcbiAgICAgICAgICAgIHByZXYsXHJcbiAgICAgICAgICAgIGN1cnIsXHJcbiAgICAgICAgICAgIHN0YXJ0LFxyXG4gICAgICAgICAgICBpc0NvbW1lbnQ7XHJcbiAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICBpZiAob2Zmc2V0ID09PSBsZW5ndGgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgcmVwZWF0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHdoaWxlICh3aGl0ZXNwYWNlUmUudGVzdChjdXJyID0gY2hhckF0KG9mZnNldCkpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VyciA9PT0gXCJcXG5cIilcclxuICAgICAgICAgICAgICAgICAgICArK2xpbmU7XHJcbiAgICAgICAgICAgICAgICBpZiAoKytvZmZzZXQgPT09IGxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoY2hhckF0KG9mZnNldCkgPT09IFwiL1wiKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoKytvZmZzZXQgPT09IGxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKFwiY29tbWVudFwiKTtcclxuICAgICAgICAgICAgICAgIGlmIChjaGFyQXQob2Zmc2V0KSA9PT0gXCIvXCIpIHsgLy8gTGluZVxyXG4gICAgICAgICAgICAgICAgICAgIGlzQ29tbWVudCA9IGNoYXJBdChzdGFydCA9IG9mZnNldCArIDEpID09PSBcIi9cIjtcclxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoY2hhckF0KCsrb2Zmc2V0KSAhPT0gXCJcXG5cIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9mZnNldCA9PT0gbGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgKytvZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29tbWVudClcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0Q29tbWVudChzdGFydCwgb2Zmc2V0IC0gMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgKytsaW5lO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcGVhdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKChjdXJyID0gY2hhckF0KG9mZnNldCkpID09PSBcIipcIikgeyAvKiBCbG9jayAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlzQ29tbWVudCA9IGNoYXJBdChzdGFydCA9IG9mZnNldCArIDEpID09PSBcIipcIjtcclxuICAgICAgICAgICAgICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyID09PSBcIlxcblwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKytsaW5lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKytvZmZzZXQgPT09IGxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwoXCJjb21tZW50XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2ID0gY3VycjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3VyciA9IGNoYXJBdChvZmZzZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gd2hpbGUgKHByZXYgIT09IFwiKlwiIHx8IGN1cnIgIT09IFwiL1wiKTtcclxuICAgICAgICAgICAgICAgICAgICArK29mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb21tZW50KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDb21tZW50KHN0YXJ0LCBvZmZzZXQgLSAyKTtcclxuICAgICAgICAgICAgICAgICAgICByZXBlYXQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiL1wiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSB3aGlsZSAocmVwZWF0KTtcclxuXHJcbiAgICAgICAgLy8gb2Zmc2V0ICE9PSBsZW5ndGggaWYgd2UgZ290IGhlcmVcclxuXHJcbiAgICAgICAgdmFyIGVuZCA9IG9mZnNldDtcclxuICAgICAgICBkZWxpbVJlLmxhc3RJbmRleCA9IDA7XHJcbiAgICAgICAgdmFyIGRlbGltID0gZGVsaW1SZS50ZXN0KGNoYXJBdChlbmQrKykpO1xyXG4gICAgICAgIGlmICghZGVsaW0pXHJcbiAgICAgICAgICAgIHdoaWxlIChlbmQgPCBsZW5ndGggJiYgIWRlbGltUmUudGVzdChjaGFyQXQoZW5kKSkpXHJcbiAgICAgICAgICAgICAgICArK2VuZDtcclxuICAgICAgICB2YXIgdG9rZW4gPSBzb3VyY2Uuc3Vic3RyaW5nKG9mZnNldCwgb2Zmc2V0ID0gZW5kKTtcclxuICAgICAgICBpZiAodG9rZW4gPT09IFwiXFxcIlwiIHx8IHRva2VuID09PSBcIidcIilcclxuICAgICAgICAgICAgc3RyaW5nRGVsaW0gPSB0b2tlbjtcclxuICAgICAgICByZXR1cm4gdG9rZW47XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQdXNoZXMgYSB0b2tlbiBiYWNrIHRvIHRoZSBzdGFjay5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b2tlbiBUb2tlblxyXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICAgICAqIEBpbm5lclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBwdXNoKHRva2VuKSB7XHJcbiAgICAgICAgc3RhY2sucHVzaCh0b2tlbik7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQZWVrcyBmb3IgdGhlIG5leHQgdG9rZW4uXHJcbiAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gVG9rZW4gb3IgYG51bGxgIG9uIGVvZlxyXG4gICAgICogQGlubmVyXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHBlZWsoKSB7XHJcbiAgICAgICAgaWYgKCFzdGFjay5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdmFyIHRva2VuID0gbmV4dCgpO1xyXG4gICAgICAgICAgICBpZiAodG9rZW4gPT09IG51bGwpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgcHVzaCh0b2tlbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzdGFja1swXTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFNraXBzIGEgdG9rZW4uXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXhwZWN0ZWQgRXhwZWN0ZWQgdG9rZW5cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbmFsPWZhbHNlXSBXaGV0aGVyIHRoZSB0b2tlbiBpcyBvcHRpb25hbFxyXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCB3aGVuIHNraXBwZWQsIGBmYWxzZWAgaWYgbm90XHJcbiAgICAgKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiBhIHJlcXVpcmVkIHRva2VuIGlzIG5vdCBwcmVzZW50XHJcbiAgICAgKiBAaW5uZXJcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gc2tpcChleHBlY3RlZCwgb3B0aW9uYWwpIHtcclxuICAgICAgICB2YXIgYWN0dWFsID0gcGVlaygpLFxyXG4gICAgICAgICAgICBlcXVhbHMgPSBhY3R1YWwgPT09IGV4cGVjdGVkO1xyXG4gICAgICAgIGlmIChlcXVhbHMpIHtcclxuICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFvcHRpb25hbClcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbChcInRva2VuICdcIiArIGFjdHVhbCArIFwiJywgJ1wiICsgZXhwZWN0ZWQgKyBcIicgZXhwZWN0ZWRcIik7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0cyBhIGNvbW1lbnQuXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcj19IHRyYWlsaW5nTGluZSBUcmFpbGluZyBsaW5lIG51bWJlciBpZiBhcHBsaWNhYmxlXHJcbiAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gQ29tbWVudCB0ZXh0XHJcbiAgICAgKiBAaW5uZXJcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gY21udCh0cmFpbGluZ0xpbmUpIHtcclxuICAgICAgICB2YXIgcmV0O1xyXG4gICAgICAgIGlmICh0cmFpbGluZ0xpbmUgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgcmV0ID0gY29tbWVudExpbmUgPT09IGxpbmUgLSAxICYmIGNvbW1lbnRUZXh0IHx8IG51bGw7XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICghY29tbWVudFRleHQpXHJcbiAgICAgICAgICAgICAgICBwZWVrKCk7XHJcbiAgICAgICAgICAgIHJldCA9IGNvbW1lbnRMaW5lID09PSB0cmFpbGluZ0xpbmUgJiYgY29tbWVudFR5cGUgPT09IFwiL1wiICYmIGNvbW1lbnRUZXh0IHx8IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbW1lbnRUeXBlID0gY29tbWVudFRleHQgPSBudWxsO1xyXG4gICAgICAgIGNvbW1lbnRMaW5lID0gMDtcclxuICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogbmV4dCxcclxuICAgICAgICBwZWVrOiBwZWVrLFxyXG4gICAgICAgIHB1c2g6IHB1c2gsXHJcbiAgICAgICAgc2tpcDogc2tpcCxcclxuICAgICAgICBsaW5lOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGxpbmU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjbW50OiBjbW50XHJcbiAgICB9O1xyXG4gICAgLyogZXNsaW50LWVuYWJsZSBjYWxsYmFjay1yZXR1cm4gKi9cclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBUeXBlO1xyXG5cclxuLy8gZXh0ZW5kcyBOYW1lc3BhY2VcclxudmFyIE5hbWVzcGFjZSA9IHJlcXVpcmUoXCIuL25hbWVzcGFjZVwiKTtcclxuKChUeXBlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTmFtZXNwYWNlLnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gVHlwZSkuY2xhc3NOYW1lID0gXCJUeXBlXCI7XHJcblxyXG52YXIgRW51bSAgICAgID0gcmVxdWlyZShcIi4vZW51bVwiKSxcclxuICAgIE9uZU9mICAgICA9IHJlcXVpcmUoXCIuL29uZW9mXCIpLFxyXG4gICAgRmllbGQgICAgID0gcmVxdWlyZShcIi4vZmllbGRcIiksXHJcbiAgICBNYXBGaWVsZCAgPSByZXF1aXJlKFwiLi9tYXBmaWVsZFwiKSxcclxuICAgIFNlcnZpY2UgICA9IHJlcXVpcmUoXCIuL3NlcnZpY2VcIiksXHJcbiAgICBDbGFzcyAgICAgPSByZXF1aXJlKFwiLi9jbGFzc1wiKSxcclxuICAgIE1lc3NhZ2UgICA9IHJlcXVpcmUoXCIuL21lc3NhZ2VcIiksXHJcbiAgICBSZWFkZXIgICAgPSByZXF1aXJlKFwiLi9yZWFkZXJcIiksXHJcbiAgICBXcml0ZXIgICAgPSByZXF1aXJlKFwiLi93cml0ZXJcIiksXHJcbiAgICB1dGlsICAgICAgPSByZXF1aXJlKFwiLi91dGlsXCIpLFxyXG4gICAgZW5jb2RlciAgID0gcmVxdWlyZShcIi4vZW5jb2RlclwiKSxcclxuICAgIGRlY29kZXIgICA9IHJlcXVpcmUoXCIuL2RlY29kZXJcIiksXHJcbiAgICB2ZXJpZmllciAgPSByZXF1aXJlKFwiLi92ZXJpZmllclwiKSxcclxuICAgIGNvbnZlcnRlciA9IHJlcXVpcmUoXCIuL2NvbnZlcnRlclwiKTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHJlZmxlY3RlZCBtZXNzYWdlIHR5cGUgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgUmVmbGVjdGVkIG1lc3NhZ2UgdHlwZS5cclxuICogQGV4dGVuZHMgTmFtZXNwYWNlQmFzZVxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTWVzc2FnZSBuYW1lXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBEZWNsYXJlZCBvcHRpb25zXHJcbiAqL1xyXG5mdW5jdGlvbiBUeXBlKG5hbWUsIG9wdGlvbnMpIHtcclxuICAgIE5hbWVzcGFjZS5jYWxsKHRoaXMsIG5hbWUsIG9wdGlvbnMpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTWVzc2FnZSBmaWVsZHMuXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsRmllbGQ+fVxyXG4gICAgICovXHJcbiAgICB0aGlzLmZpZWxkcyA9IHt9OyAgLy8gdG9KU09OLCBtYXJrZXJcclxuXHJcbiAgICAvKipcclxuICAgICAqIE9uZW9mcyBkZWNsYXJlZCB3aXRoaW4gdGhpcyBuYW1lc3BhY2UsIGlmIGFueS5cclxuICAgICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxPbmVPZj59XHJcbiAgICAgKi9cclxuICAgIHRoaXMub25lb2ZzID0gdW5kZWZpbmVkOyAvLyB0b0pTT05cclxuXHJcbiAgICAvKipcclxuICAgICAqIEV4dGVuc2lvbiByYW5nZXMsIGlmIGFueS5cclxuICAgICAqIEB0eXBlIHtudW1iZXJbXVtdfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmV4dGVuc2lvbnMgPSB1bmRlZmluZWQ7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVzZXJ2ZWQgcmFuZ2VzLCBpZiBhbnkuXHJcbiAgICAgKiBAdHlwZSB7QXJyYXkuPG51bWJlcltdfHN0cmluZz59XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVzZXJ2ZWQgPSB1bmRlZmluZWQ7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qP1xyXG4gICAgICogV2hldGhlciB0aGlzIHR5cGUgaXMgYSBsZWdhY3kgZ3JvdXAuXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbnx1bmRlZmluZWR9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZ3JvdXAgPSB1bmRlZmluZWQ7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FjaGVkIGZpZWxkcyBieSBpZC5cclxuICAgICAqIEB0eXBlIHs/T2JqZWN0LjxudW1iZXIsRmllbGQ+fVxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgdGhpcy5fZmllbGRzQnlJZCA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWNoZWQgZmllbGRzIGFzIGFuIGFycmF5LlxyXG4gICAgICogQHR5cGUgez9GaWVsZFtdfVxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgdGhpcy5fZmllbGRzQXJyYXkgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FjaGVkIG9uZW9mcyBhcyBhbiBhcnJheS5cclxuICAgICAqIEB0eXBlIHs/T25lT2ZbXX1cclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX29uZW9mc0FycmF5ID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENhY2hlZCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEB0eXBlIHsqfVxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgdGhpcy5fY3RvciA9IG51bGw7XHJcbn1cclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFR5cGUucHJvdG90eXBlLCB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBNZXNzYWdlIGZpZWxkcyBieSBpZC5cclxuICAgICAqIEBuYW1lIFR5cGUjZmllbGRzQnlJZFxyXG4gICAgICogQHR5cGUge09iamVjdC48bnVtYmVyLEZpZWxkPn1cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBmaWVsZHNCeUlkOiB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fZmllbGRzQnlJZClcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9maWVsZHNCeUlkO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fZmllbGRzQnlJZCA9IHt9O1xyXG4gICAgICAgICAgICBmb3IgKHZhciBuYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuZmllbGRzKSwgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkID0gdGhpcy5maWVsZHNbbmFtZXNbaV1dLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkID0gZmllbGQuaWQ7XHJcblxyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fZmllbGRzQnlJZFtpZF0pXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJkdXBsaWNhdGUgaWQgXCIgKyBpZCArIFwiIGluIFwiICsgdGhpcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5fZmllbGRzQnlJZFtpZF0gPSBmaWVsZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZmllbGRzQnlJZDtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmllbGRzIG9mIHRoaXMgbWVzc2FnZSBhcyBhbiBhcnJheSBmb3IgaXRlcmF0aW9uLlxyXG4gICAgICogQG5hbWUgVHlwZSNmaWVsZHNBcnJheVxyXG4gICAgICogQHR5cGUge0ZpZWxkW119XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZmllbGRzQXJyYXk6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZmllbGRzQXJyYXkgfHwgKHRoaXMuX2ZpZWxkc0FycmF5ID0gdXRpbC50b0FycmF5KHRoaXMuZmllbGRzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIE9uZW9mcyBvZiB0aGlzIG1lc3NhZ2UgYXMgYW4gYXJyYXkgZm9yIGl0ZXJhdGlvbi5cclxuICAgICAqIEBuYW1lIFR5cGUjb25lb2ZzQXJyYXlcclxuICAgICAqIEB0eXBlIHtPbmVPZltdfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIG9uZW9mc0FycmF5OiB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29uZW9mc0FycmF5IHx8ICh0aGlzLl9vbmVvZnNBcnJheSA9IHV0aWwudG9BcnJheSh0aGlzLm9uZW9mcykpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgcmVnaXN0ZXJlZCBjb25zdHJ1Y3RvciwgaWYgYW55IHJlZ2lzdGVyZWQsIG90aGVyd2lzZSBhIGdlbmVyaWMgY29uc3RydWN0b3IuXHJcbiAgICAgKiBBc3NpZ25pbmcgYSBmdW5jdGlvbiByZXBsYWNlcyB0aGUgaW50ZXJuYWwgY29uc3RydWN0b3IuIElmIHRoZSBmdW5jdGlvbiBkb2VzIG5vdCBleHRlbmQge0BsaW5rIE1lc3NhZ2V9IHlldCwgaXRzIHByb3RvdHlwZSB3aWxsIGJlIHNldHVwIGFjY29yZGluZ2x5IGFuZCBzdGF0aWMgbWV0aG9kcyB3aWxsIGJlIHBvcHVsYXRlZC4gSWYgaXQgYWxyZWFkeSBleHRlbmRzIHtAbGluayBNZXNzYWdlfSwgaXQgd2lsbCBqdXN0IHJlcGxhY2UgdGhlIGludGVybmFsIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQG5hbWUgVHlwZSNjdG9yXHJcbiAgICAgKiBAdHlwZSB7Q2xhc3N9XHJcbiAgICAgKi9cclxuICAgIGN0b3I6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY3RvciB8fCAodGhpcy5fY3RvciA9IENsYXNzKHRoaXMpLmNvbnN0cnVjdG9yKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24oY3Rvcikge1xyXG4gICAgICAgICAgICBpZiAoY3RvciAmJiAhKGN0b3IucHJvdG90eXBlIGluc3RhbmNlb2YgTWVzc2FnZSkpXHJcbiAgICAgICAgICAgICAgICBDbGFzcyh0aGlzLCBjdG9yKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fY3RvciA9IGN0b3I7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxuXHJcbmZ1bmN0aW9uIGNsZWFyQ2FjaGUodHlwZSkge1xyXG4gICAgdHlwZS5fZmllbGRzQnlJZCA9IHR5cGUuX2ZpZWxkc0FycmF5ID0gdHlwZS5fb25lb2ZzQXJyYXkgPSB0eXBlLl9jdG9yID0gbnVsbDtcclxuICAgIGRlbGV0ZSB0eXBlLmVuY29kZTtcclxuICAgIGRlbGV0ZSB0eXBlLmRlY29kZTtcclxuICAgIGRlbGV0ZSB0eXBlLnZlcmlmeTtcclxuICAgIHJldHVybiB0eXBlO1xyXG59XHJcblxyXG4vKipcclxuICogTWVzc2FnZSB0eXBlIGRlc2NyaXB0b3IuXHJcbiAqIEB0eXBlZGVmIFR5cGVEZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBNZXNzYWdlIHR5cGUgb3B0aW9uc1xyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLE9uZU9mRGVzY3JpcHRvcj59IFtvbmVvZnNdIE9uZW9mIGRlc2NyaXB0b3JzXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsRmllbGREZXNjcmlwdG9yPn0gZmllbGRzIEZpZWxkIGRlc2NyaXB0b3JzXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyW11bXX0gW2V4dGVuc2lvbnNdIEV4dGVuc2lvbiByYW5nZXNcclxuICogQHByb3BlcnR5IHtudW1iZXJbXVtdfSBbcmVzZXJ2ZWRdIFJlc2VydmVkIHJhbmdlc1xyXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtncm91cD1mYWxzZV0gV2hldGhlciBhIGxlZ2FjeSBncm91cCBvciBub3RcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZyxBbnlOZXN0ZWREZXNjcmlwdG9yPn0gW25lc3RlZF0gTmVzdGVkIG9iamVjdCBkZXNjcmlwdG9yc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbWVzc2FnZSB0eXBlIGZyb20gYSBtZXNzYWdlIHR5cGUgZGVzY3JpcHRvci5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTWVzc2FnZSBuYW1lXHJcbiAqIEBwYXJhbSB7VHlwZURlc2NyaXB0b3J9IGpzb24gTWVzc2FnZSB0eXBlIGRlc2NyaXB0b3JcclxuICogQHJldHVybnMge1R5cGV9IENyZWF0ZWQgbWVzc2FnZSB0eXBlXHJcbiAqL1xyXG5UeXBlLmZyb21KU09OID0gZnVuY3Rpb24gZnJvbUpTT04obmFtZSwganNvbikge1xyXG4gICAgdmFyIHR5cGUgPSBuZXcgVHlwZShuYW1lLCBqc29uLm9wdGlvbnMpO1xyXG4gICAgdHlwZS5leHRlbnNpb25zID0ganNvbi5leHRlbnNpb25zO1xyXG4gICAgdHlwZS5yZXNlcnZlZCA9IGpzb24ucmVzZXJ2ZWQ7XHJcbiAgICB2YXIgbmFtZXMgPSBPYmplY3Qua2V5cyhqc29uLmZpZWxkcyksXHJcbiAgICAgICAgaSA9IDA7XHJcbiAgICBmb3IgKDsgaSA8IG5hbWVzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgIHR5cGUuYWRkKFxyXG4gICAgICAgICAgICAoIHR5cGVvZiBqc29uLmZpZWxkc1tuYW1lc1tpXV0ua2V5VHlwZSAhPT0gXCJ1bmRlZmluZWRcIlxyXG4gICAgICAgICAgICA/IE1hcEZpZWxkLmZyb21KU09OXHJcbiAgICAgICAgICAgIDogRmllbGQuZnJvbUpTT04gKShuYW1lc1tpXSwganNvbi5maWVsZHNbbmFtZXNbaV1dKVxyXG4gICAgICAgICk7XHJcbiAgICBpZiAoanNvbi5vbmVvZnMpXHJcbiAgICAgICAgZm9yIChuYW1lcyA9IE9iamVjdC5rZXlzKGpzb24ub25lb2ZzKSwgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgdHlwZS5hZGQoT25lT2YuZnJvbUpTT04obmFtZXNbaV0sIGpzb24ub25lb2ZzW25hbWVzW2ldXSkpO1xyXG4gICAgaWYgKGpzb24ubmVzdGVkKVxyXG4gICAgICAgIGZvciAobmFtZXMgPSBPYmplY3Qua2V5cyhqc29uLm5lc3RlZCksIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgdmFyIG5lc3RlZCA9IGpzb24ubmVzdGVkW25hbWVzW2ldXTtcclxuICAgICAgICAgICAgdHlwZS5hZGQoIC8vIG1vc3QgdG8gbGVhc3QgbGlrZWx5XHJcbiAgICAgICAgICAgICAgICAoIG5lc3RlZC5pZCAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICA/IEZpZWxkLmZyb21KU09OXHJcbiAgICAgICAgICAgICAgICA6IG5lc3RlZC5maWVsZHMgIT09IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgPyBUeXBlLmZyb21KU09OXHJcbiAgICAgICAgICAgICAgICA6IG5lc3RlZC52YWx1ZXMgIT09IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgPyBFbnVtLmZyb21KU09OXHJcbiAgICAgICAgICAgICAgICA6IG5lc3RlZC5tZXRob2RzICE9PSB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgID8gU2VydmljZS5mcm9tSlNPTlxyXG4gICAgICAgICAgICAgICAgOiBOYW1lc3BhY2UuZnJvbUpTT04gKShuYW1lc1tpXSwgbmVzdGVkKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgIGlmIChqc29uLmV4dGVuc2lvbnMgJiYganNvbi5leHRlbnNpb25zLmxlbmd0aClcclxuICAgICAgICB0eXBlLmV4dGVuc2lvbnMgPSBqc29uLmV4dGVuc2lvbnM7XHJcbiAgICBpZiAoanNvbi5yZXNlcnZlZCAmJiBqc29uLnJlc2VydmVkLmxlbmd0aClcclxuICAgICAgICB0eXBlLnJlc2VydmVkID0ganNvbi5yZXNlcnZlZDtcclxuICAgIGlmIChqc29uLmdyb3VwKVxyXG4gICAgICAgIHR5cGUuZ3JvdXAgPSB0cnVlO1xyXG4gICAgcmV0dXJuIHR5cGU7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhpcyBtZXNzYWdlIHR5cGUgdG8gYSBtZXNzYWdlIHR5cGUgZGVzY3JpcHRvci5cclxuICogQHJldHVybnMge1R5cGVEZXNjcmlwdG9yfSBNZXNzYWdlIHR5cGUgZGVzY3JpcHRvclxyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xyXG4gICAgdmFyIGluaGVyaXRlZCA9IE5hbWVzcGFjZS5wcm90b3R5cGUudG9KU09OLmNhbGwodGhpcyk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIG9wdGlvbnMgICAgOiBpbmhlcml0ZWQgJiYgaW5oZXJpdGVkLm9wdGlvbnMgfHwgdW5kZWZpbmVkLFxyXG4gICAgICAgIG9uZW9mcyAgICAgOiBOYW1lc3BhY2UuYXJyYXlUb0pTT04odGhpcy5vbmVvZnNBcnJheSksXHJcbiAgICAgICAgZmllbGRzICAgICA6IE5hbWVzcGFjZS5hcnJheVRvSlNPTih0aGlzLmZpZWxkc0FycmF5LmZpbHRlcihmdW5jdGlvbihvYmopIHsgcmV0dXJuICFvYmouZGVjbGFyaW5nRmllbGQ7IH0pKSB8fCB7fSxcclxuICAgICAgICBleHRlbnNpb25zIDogdGhpcy5leHRlbnNpb25zICYmIHRoaXMuZXh0ZW5zaW9ucy5sZW5ndGggPyB0aGlzLmV4dGVuc2lvbnMgOiB1bmRlZmluZWQsXHJcbiAgICAgICAgcmVzZXJ2ZWQgICA6IHRoaXMucmVzZXJ2ZWQgJiYgdGhpcy5yZXNlcnZlZC5sZW5ndGggPyB0aGlzLnJlc2VydmVkIDogdW5kZWZpbmVkLFxyXG4gICAgICAgIGdyb3VwICAgICAgOiB0aGlzLmdyb3VwIHx8IHVuZGVmaW5lZCxcclxuICAgICAgICBuZXN0ZWQgICAgIDogaW5oZXJpdGVkICYmIGluaGVyaXRlZC5uZXN0ZWQgfHwgdW5kZWZpbmVkXHJcbiAgICB9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUucmVzb2x2ZUFsbCA9IGZ1bmN0aW9uIHJlc29sdmVBbGwoKSB7XHJcbiAgICB2YXIgZmllbGRzID0gdGhpcy5maWVsZHNBcnJheSwgaSA9IDA7XHJcbiAgICB3aGlsZSAoaSA8IGZpZWxkcy5sZW5ndGgpXHJcbiAgICAgICAgZmllbGRzW2krK10ucmVzb2x2ZSgpO1xyXG4gICAgdmFyIG9uZW9mcyA9IHRoaXMub25lb2ZzQXJyYXk7IGkgPSAwO1xyXG4gICAgd2hpbGUgKGkgPCBvbmVvZnMubGVuZ3RoKVxyXG4gICAgICAgIG9uZW9mc1tpKytdLnJlc29sdmUoKTtcclxuICAgIHJldHVybiBOYW1lc3BhY2UucHJvdG90eXBlLnJlc29sdmUuY2FsbCh0aGlzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcblR5cGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldChuYW1lKSB7XHJcbiAgICByZXR1cm4gdGhpcy5maWVsZHNbbmFtZV1cclxuICAgICAgICB8fCB0aGlzLm9uZW9mcyAmJiB0aGlzLm9uZW9mc1tuYW1lXVxyXG4gICAgICAgIHx8IHRoaXMubmVzdGVkICYmIHRoaXMubmVzdGVkW25hbWVdXHJcbiAgICAgICAgfHwgbnVsbDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgbmVzdGVkIG9iamVjdCB0byB0aGlzIHR5cGUuXHJcbiAqIEBwYXJhbSB7UmVmbGVjdGlvbk9iamVjdH0gb2JqZWN0IE5lc3RlZCBvYmplY3QgdG8gYWRkXHJcbiAqIEByZXR1cm5zIHtUeXBlfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICogQHRocm93cyB7RXJyb3J9IElmIHRoZXJlIGlzIGFscmVhZHkgYSBuZXN0ZWQgb2JqZWN0IHdpdGggdGhpcyBuYW1lIG9yLCBpZiBhIGZpZWxkLCB3aGVuIHRoZXJlIGlzIGFscmVhZHkgYSBmaWVsZCB3aXRoIHRoaXMgaWRcclxuICovXHJcblR5cGUucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZChvYmplY3QpIHtcclxuXHJcbiAgICBpZiAodGhpcy5nZXQob2JqZWN0Lm5hbWUpKVxyXG4gICAgICAgIHRocm93IEVycm9yKFwiZHVwbGljYXRlIG5hbWUgJ1wiICsgb2JqZWN0Lm5hbWUgKyBcIicgaW4gXCIgKyB0aGlzKTtcclxuXHJcbiAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgRmllbGQgJiYgb2JqZWN0LmV4dGVuZCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgLy8gTk9URTogRXh0ZW5zaW9uIGZpZWxkcyBhcmVuJ3QgYWN0dWFsIGZpZWxkcyBvbiB0aGUgZGVjbGFyaW5nIHR5cGUsIGJ1dCBuZXN0ZWQgb2JqZWN0cy5cclxuICAgICAgICAvLyBUaGUgcm9vdCBvYmplY3QgdGFrZXMgY2FyZSBvZiBhZGRpbmcgZGlzdGluY3Qgc2lzdGVyLWZpZWxkcyB0byB0aGUgcmVzcGVjdGl2ZSBleHRlbmRlZFxyXG4gICAgICAgIC8vIHR5cGUgaW5zdGVhZC5cclxuXHJcbiAgICAgICAgLy8gYXZvaWRzIGNhbGxpbmcgdGhlIGdldHRlciBpZiBub3QgYWJzb2x1dGVseSBuZWNlc3NhcnkgYmVjYXVzZSBpdCdzIGNhbGxlZCBxdWl0ZSBmcmVxdWVudGx5XHJcbiAgICAgICAgaWYgKHRoaXMuX2ZpZWxkc0J5SWQgPyAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyB0aGlzLl9maWVsZHNCeUlkW29iamVjdC5pZF0gOiB0aGlzLmZpZWxkc0J5SWRbb2JqZWN0LmlkXSlcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJkdXBsaWNhdGUgaWQgXCIgKyBvYmplY3QuaWQgKyBcIiBpbiBcIiArIHRoaXMpO1xyXG4gICAgICAgIGlmICh0aGlzLmlzUmVzZXJ2ZWRJZChvYmplY3QuaWQpKVxyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcImlkIFwiICsgb2JqZWN0LmlkICsgXCIgaXMgcmVzZXJ2ZWQgaW4gXCIgKyB0aGlzKTtcclxuICAgICAgICBpZiAodGhpcy5pc1Jlc2VydmVkTmFtZShvYmplY3QubmFtZSkpXHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwibmFtZSAnXCIgKyBvYmplY3QubmFtZSArIFwiJyBpcyByZXNlcnZlZCBpbiBcIiArIHRoaXMpO1xyXG5cclxuICAgICAgICBpZiAob2JqZWN0LnBhcmVudClcclxuICAgICAgICAgICAgb2JqZWN0LnBhcmVudC5yZW1vdmUob2JqZWN0KTtcclxuICAgICAgICB0aGlzLmZpZWxkc1tvYmplY3QubmFtZV0gPSBvYmplY3Q7XHJcbiAgICAgICAgb2JqZWN0Lm1lc3NhZ2UgPSB0aGlzO1xyXG4gICAgICAgIG9iamVjdC5vbkFkZCh0aGlzKTtcclxuICAgICAgICByZXR1cm4gY2xlYXJDYWNoZSh0aGlzKTtcclxuICAgIH1cclxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBPbmVPZikge1xyXG4gICAgICAgIGlmICghdGhpcy5vbmVvZnMpXHJcbiAgICAgICAgICAgIHRoaXMub25lb2ZzID0ge307XHJcbiAgICAgICAgdGhpcy5vbmVvZnNbb2JqZWN0Lm5hbWVdID0gb2JqZWN0O1xyXG4gICAgICAgIG9iamVjdC5vbkFkZCh0aGlzKTtcclxuICAgICAgICByZXR1cm4gY2xlYXJDYWNoZSh0aGlzKTtcclxuICAgIH1cclxuICAgIHJldHVybiBOYW1lc3BhY2UucHJvdG90eXBlLmFkZC5jYWxsKHRoaXMsIG9iamVjdCk7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVtb3ZlcyBhIG5lc3RlZCBvYmplY3QgZnJvbSB0aGlzIHR5cGUuXHJcbiAqIEBwYXJhbSB7UmVmbGVjdGlvbk9iamVjdH0gb2JqZWN0IE5lc3RlZCBvYmplY3QgdG8gcmVtb3ZlXHJcbiAqIEByZXR1cm5zIHtUeXBlfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICogQHRocm93cyB7RXJyb3J9IElmIGBvYmplY3RgIGlzIG5vdCBhIG1lbWJlciBvZiB0aGlzIHR5cGVcclxuICovXHJcblR5cGUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZShvYmplY3QpIHtcclxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBGaWVsZCAmJiBvYmplY3QuZXh0ZW5kID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAvLyBTZWUgVHlwZSNhZGQgZm9yIHRoZSByZWFzb24gd2h5IGV4dGVuc2lvbiBmaWVsZHMgYXJlIGV4Y2x1ZGVkIGhlcmUuXHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghdGhpcy5maWVsZHMgfHwgdGhpcy5maWVsZHNbb2JqZWN0Lm5hbWVdICE9PSBvYmplY3QpXHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKG9iamVjdCArIFwiIGlzIG5vdCBhIG1lbWJlciBvZiBcIiArIHRoaXMpO1xyXG5cclxuICAgICAgICBkZWxldGUgdGhpcy5maWVsZHNbb2JqZWN0Lm5hbWVdO1xyXG4gICAgICAgIG9iamVjdC5wYXJlbnQgPSBudWxsO1xyXG4gICAgICAgIG9iamVjdC5vblJlbW92ZSh0aGlzKTtcclxuICAgICAgICByZXR1cm4gY2xlYXJDYWNoZSh0aGlzKTtcclxuICAgIH1cclxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBPbmVPZikge1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIXRoaXMub25lb2ZzIHx8IHRoaXMub25lb2ZzW29iamVjdC5uYW1lXSAhPT0gb2JqZWN0KVxyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihvYmplY3QgKyBcIiBpcyBub3QgYSBtZW1iZXIgb2YgXCIgKyB0aGlzKTtcclxuXHJcbiAgICAgICAgZGVsZXRlIHRoaXMub25lb2ZzW29iamVjdC5uYW1lXTtcclxuICAgICAgICBvYmplY3QucGFyZW50ID0gbnVsbDtcclxuICAgICAgICBvYmplY3Qub25SZW1vdmUodGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIGNsZWFyQ2FjaGUodGhpcyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gTmFtZXNwYWNlLnByb3RvdHlwZS5yZW1vdmUuY2FsbCh0aGlzLCBvYmplY3QpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRlc3RzIGlmIHRoZSBzcGVjaWZpZWQgaWQgaXMgcmVzZXJ2ZWQuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBpZCBJZCB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgcmVzZXJ2ZWQsIG90aGVyd2lzZSBgZmFsc2VgXHJcbiAqL1xyXG5UeXBlLnByb3RvdHlwZS5pc1Jlc2VydmVkSWQgPSBmdW5jdGlvbiBpc1Jlc2VydmVkSWQoaWQpIHtcclxuICAgIGlmICh0aGlzLnJlc2VydmVkKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5yZXNlcnZlZC5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnJlc2VydmVkW2ldICE9PSBcInN0cmluZ1wiICYmIHRoaXMucmVzZXJ2ZWRbaV1bMF0gPD0gaWQgJiYgdGhpcy5yZXNlcnZlZFtpXVsxXSA+PSBpZClcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRlc3RzIGlmIHRoZSBzcGVjaWZpZWQgbmFtZSBpcyByZXNlcnZlZC5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgcmVzZXJ2ZWQsIG90aGVyd2lzZSBgZmFsc2VgXHJcbiAqL1xyXG5UeXBlLnByb3RvdHlwZS5pc1Jlc2VydmVkTmFtZSA9IGZ1bmN0aW9uIGlzUmVzZXJ2ZWROYW1lKG5hbWUpIHtcclxuICAgIGlmICh0aGlzLnJlc2VydmVkKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5yZXNlcnZlZC5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgaWYgKHRoaXMucmVzZXJ2ZWRbaV0gPT09IG5hbWUpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIHJldHVybiBmYWxzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IG1lc3NhZ2Ugb2YgdGhpcyB0eXBlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBSdW50aW1lIG1lc3NhZ2VcclxuICovXHJcblR5cGUucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XHJcbiAgICByZXR1cm4gbmV3IHRoaXMuY3Rvcihwcm9wZXJ0aWVzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTZXRzIHVwIHtAbGluayBUeXBlI2VuY29kZXxlbmNvZGV9LCB7QGxpbmsgVHlwZSNkZWNvZGV8ZGVjb2RlfSBhbmQge0BsaW5rIFR5cGUjdmVyaWZ5fHZlcmlmeX0uXHJcbiAqIEByZXR1cm5zIHtUeXBlfSBgdGhpc2BcclxuICovXHJcblR5cGUucHJvdG90eXBlLnNldHVwID0gZnVuY3Rpb24gc2V0dXAoKSB7XHJcbiAgICAvLyBTZXRzIHVwIGV2ZXJ5dGhpbmcgYXQgb25jZSBzbyB0aGF0IHRoZSBwcm90b3R5cGUgY2hhaW4gZG9lcyBub3QgaGF2ZSB0byBiZSByZS1ldmFsdWF0ZWRcclxuICAgIC8vIG11bHRpcGxlIHRpbWVzIChWOCwgc29mdC1kZW9wdCBwcm90b3R5cGUtY2hlY2spLlxyXG4gICAgdmFyIGZ1bGxOYW1lID0gdGhpcy5mdWxsTmFtZSxcclxuICAgICAgICB0eXBlcyAgICA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAvKiBpbml0aWFsaXplcyAqLyB0aGlzLmZpZWxkc0FycmF5Lmxlbmd0aDsgKytpKVxyXG4gICAgICAgIHR5cGVzLnB1c2godGhpcy5fZmllbGRzQXJyYXlbaV0ucmVzb2x2ZSgpLnJlc29sdmVkVHlwZSk7XHJcbiAgICB0aGlzLmVuY29kZSA9IGVuY29kZXIodGhpcykuZW9mKGZ1bGxOYW1lICsgXCIkZW5jb2RlXCIsIHtcclxuICAgICAgICBXcml0ZXIgOiBXcml0ZXIsXHJcbiAgICAgICAgdHlwZXMgIDogdHlwZXMsXHJcbiAgICAgICAgdXRpbCAgIDogdXRpbFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmRlY29kZSA9IGRlY29kZXIodGhpcykuZW9mKGZ1bGxOYW1lICsgXCIkZGVjb2RlXCIsIHtcclxuICAgICAgICBSZWFkZXIgOiBSZWFkZXIsXHJcbiAgICAgICAgdHlwZXMgIDogdHlwZXMsXHJcbiAgICAgICAgdXRpbCAgIDogdXRpbFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLnZlcmlmeSA9IHZlcmlmaWVyKHRoaXMpLmVvZihmdWxsTmFtZSArIFwiJHZlcmlmeVwiLCB7XHJcbiAgICAgICAgdHlwZXMgOiB0eXBlcyxcclxuICAgICAgICB1dGlsICA6IHV0aWxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5mcm9tT2JqZWN0ID0gdGhpcy5mcm9tID0gY29udmVydGVyLmZyb21PYmplY3QodGhpcykuZW9mKGZ1bGxOYW1lICsgXCIkZnJvbU9iamVjdFwiLCB7XHJcbiAgICAgICAgdHlwZXMgOiB0eXBlcyxcclxuICAgICAgICB1dGlsICA6IHV0aWxcclxuICAgIH0pO1xyXG4gICAgdGhpcy50b09iamVjdCA9IGNvbnZlcnRlci50b09iamVjdCh0aGlzKS5lb2YoZnVsbE5hbWUgKyBcIiR0b09iamVjdFwiLCB7XHJcbiAgICAgICAgdHlwZXMgOiB0eXBlcyxcclxuICAgICAgICB1dGlsICA6IHV0aWxcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogRW5jb2RlcyBhIG1lc3NhZ2Ugb2YgdGhpcyB0eXBlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBUeXBlI3ZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxyXG4gKiBAcGFyYW0ge01lc3NhZ2V8T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgTWVzc2FnZSBpbnN0YW5jZSBvciBwbGFpbiBvYmplY3RcclxuICogQHBhcmFtIHtXcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cclxuICogQHJldHVybnMge1dyaXRlcn0gd3JpdGVyXHJcbiAqL1xyXG5UeXBlLnByb3RvdHlwZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGVfc2V0dXAobWVzc2FnZSwgd3JpdGVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy5zZXR1cCgpLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpOyAvLyBvdmVycmlkZXMgdGhpcyBtZXRob2RcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbmNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUgcHJlY2VlZGVkIGJ5IGl0cyBieXRlIGxlbmd0aCBhcyBhIHZhcmludC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgVHlwZSN2ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cclxuICogQHBhcmFtIHtNZXNzYWdlfE9iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIE1lc3NhZ2UgaW5zdGFuY2Ugb3IgcGxhaW4gb2JqZWN0XHJcbiAqIEBwYXJhbSB7V3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IHdyaXRlclxyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xyXG4gICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlciAmJiB3cml0ZXIubGVuID8gd3JpdGVyLmZvcmsoKSA6IHdyaXRlcikubGRlbGltKCk7XHJcbn07XHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIG1lc3NhZ2Ugb2YgdGhpcyB0eXBlLlxyXG4gKiBAcGFyYW0ge1JlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxyXG4gKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTGVuZ3RoIG9mIHRoZSBtZXNzYWdlLCBpZiBrbm93biBiZWZvcmVoYW5kXHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBEZWNvZGVkIG1lc3NhZ2VcclxuICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcclxuICogQHRocm93cyB7dXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcclxuICovXHJcblR5cGUucHJvdG90eXBlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZV9zZXR1cChyZWFkZXIsIGxlbmd0aCkge1xyXG4gICAgcmV0dXJuIHRoaXMuc2V0dXAoKS5kZWNvZGUocmVhZGVyLCBsZW5ndGgpOyAvLyBvdmVycmlkZXMgdGhpcyBtZXRob2RcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUgcHJlY2VlZGVkIGJ5IGl0cyBieXRlIGxlbmd0aCBhcyBhIHZhcmludC5cclxuICogQHBhcmFtIHtSZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cclxuICogQHJldHVybnMge01lc3NhZ2V9IERlY29kZWQgbWVzc2FnZVxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxyXG4gKiBAdGhyb3dzIHt1dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xyXG4gICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgUmVhZGVyKSlcclxuICAgICAgICByZWFkZXIgPSBSZWFkZXIuY3JlYXRlKHJlYWRlcik7XHJcbiAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFZlcmlmaWVzIHRoYXQgZmllbGQgdmFsdWVzIGFyZSB2YWxpZCBhbmQgdGhhdCByZXF1aXJlZCBmaWVsZHMgYXJlIHByZXNlbnQuXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxyXG4gKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XHJcbiAqL1xyXG5UeXBlLnByb3RvdHlwZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnlfc2V0dXAobWVzc2FnZSkge1xyXG4gICAgcmV0dXJuIHRoaXMuc2V0dXAoKS52ZXJpZnkobWVzc2FnZSk7IC8vIG92ZXJyaWRlcyB0aGlzIG1ldGhvZFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgbWVzc2FnZSBvZiB0aGlzIHR5cGUgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdCB0byBjb252ZXJ0XHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBNZXNzYWdlIGluc3RhbmNlXHJcbiAqL1xyXG5UeXBlLnByb3RvdHlwZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcclxuICAgIHJldHVybiB0aGlzLnNldHVwKCkuZnJvbU9iamVjdChvYmplY3QpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgbWVzc2FnZSBvZiB0aGlzIHR5cGUgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cclxuICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgVHlwZSNmcm9tT2JqZWN0fS5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcclxuICogQHJldHVybnMge01lc3NhZ2V9IE1lc3NhZ2UgaW5zdGFuY2VcclxuICovXHJcblR5cGUucHJvdG90eXBlLmZyb20gPSBUeXBlLnByb3RvdHlwZS5mcm9tT2JqZWN0O1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnNpb24gb3B0aW9ucyBhcyB1c2VkIGJ5IHtAbGluayBUeXBlI3RvT2JqZWN0fSBhbmQge0BsaW5rIE1lc3NhZ2UudG9PYmplY3R9LlxyXG4gKiBAdHlwZWRlZiBDb252ZXJzaW9uT3B0aW9uc1xyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKiBAcHJvcGVydHkgeyp9IFtsb25nc10gTG9uZyBjb252ZXJzaW9uIHR5cGUuXHJcbiAqIFZhbGlkIHZhbHVlcyBhcmUgYFN0cmluZ2AgYW5kIGBOdW1iZXJgICh0aGUgZ2xvYmFsIHR5cGVzKS5cclxuICogRGVmYXVsdHMgdG8gY29weSB0aGUgcHJlc2VudCB2YWx1ZSwgd2hpY2ggaXMgYSBwb3NzaWJseSB1bnNhZmUgbnVtYmVyIHdpdGhvdXQgYW5kIGEge0BsaW5rIExvbmd9IHdpdGggYSBsb25nIGxpYnJhcnkuXHJcbiAqIEBwcm9wZXJ0eSB7Kn0gW2VudW1zXSBFbnVtIHZhbHVlIGNvbnZlcnNpb24gdHlwZS5cclxuICogT25seSB2YWxpZCB2YWx1ZSBpcyBgU3RyaW5nYCAodGhlIGdsb2JhbCB0eXBlKS5cclxuICogRGVmYXVsdHMgdG8gY29weSB0aGUgcHJlc2VudCB2YWx1ZSwgd2hpY2ggaXMgdGhlIG51bWVyaWMgaWQuXHJcbiAqIEBwcm9wZXJ0eSB7Kn0gW2J5dGVzXSBCeXRlcyB2YWx1ZSBjb252ZXJzaW9uIHR5cGUuXHJcbiAqIFZhbGlkIHZhbHVlcyBhcmUgYEFycmF5YCBhbmQgKGEgYmFzZTY0IGVuY29kZWQpIGBTdHJpbmdgICh0aGUgZ2xvYmFsIHR5cGVzKS5cclxuICogRGVmYXVsdHMgdG8gY29weSB0aGUgcHJlc2VudCB2YWx1ZSwgd2hpY2ggdXN1YWxseSBpcyBhIEJ1ZmZlciB1bmRlciBub2RlIGFuZCBhbiBVaW50OEFycmF5IGluIHRoZSBicm93c2VyLlxyXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtkZWZhdWx0cz1mYWxzZV0gQWxzbyBzZXRzIGRlZmF1bHQgdmFsdWVzIG9uIHRoZSByZXN1bHRpbmcgb2JqZWN0XHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2FycmF5cz1mYWxzZV0gU2V0cyBlbXB0eSBhcnJheXMgZm9yIG1pc3NpbmcgcmVwZWF0ZWQgZmllbGRzIGV2ZW4gaWYgYGRlZmF1bHRzPWZhbHNlYFxyXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtvYmplY3RzPWZhbHNlXSBTZXRzIGVtcHR5IG9iamVjdHMgZm9yIG1pc3NpbmcgbWFwIGZpZWxkcyBldmVuIGlmIGBkZWZhdWx0cz1mYWxzZWBcclxuICogQHByb3BlcnR5IHtib29sZWFufSBbb25lb2ZzPWZhbHNlXSBJbmNsdWRlcyB2aXJ0dWFsIG9uZW9mIHByb3BlcnRpZXMgc2V0IHRvIHRoZSBwcmVzZW50IGZpZWxkJ3MgbmFtZSwgaWYgYW55XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIG1lc3NhZ2Ugb2YgdGhpcyB0eXBlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXHJcbiAqIEBwYXJhbSB7TWVzc2FnZX0gbWVzc2FnZSBNZXNzYWdlIGluc3RhbmNlXHJcbiAqIEBwYXJhbSB7Q29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcclxuICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcclxuICovXHJcblR5cGUucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xyXG4gICAgcmV0dXJuIHRoaXMuc2V0dXAoKS50b09iamVjdChtZXNzYWdlLCBvcHRpb25zKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vKipcclxuICogQ29tbW9uIHR5cGUgY29uc3RhbnRzLlxyXG4gKiBAbmFtZXNwYWNlXHJcbiAqL1xyXG52YXIgdHlwZXMgPSBleHBvcnRzO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxudmFyIHMgPSBbXHJcbiAgICBcImRvdWJsZVwiLCAgIC8vIDBcclxuICAgIFwiZmxvYXRcIiwgICAgLy8gMVxyXG4gICAgXCJpbnQzMlwiLCAgICAvLyAyXHJcbiAgICBcInVpbnQzMlwiLCAgIC8vIDNcclxuICAgIFwic2ludDMyXCIsICAgLy8gNFxyXG4gICAgXCJmaXhlZDMyXCIsICAvLyA1XHJcbiAgICBcInNmaXhlZDMyXCIsIC8vIDZcclxuICAgIFwiaW50NjRcIiwgICAgLy8gN1xyXG4gICAgXCJ1aW50NjRcIiwgICAvLyA4XHJcbiAgICBcInNpbnQ2NFwiLCAgIC8vIDlcclxuICAgIFwiZml4ZWQ2NFwiLCAgLy8gMTBcclxuICAgIFwic2ZpeGVkNjRcIiwgLy8gMTFcclxuICAgIFwiYm9vbFwiLCAgICAgLy8gMTJcclxuICAgIFwic3RyaW5nXCIsICAgLy8gMTNcclxuICAgIFwiYnl0ZXNcIiAgICAgLy8gMTRcclxuXTtcclxuXHJcbmZ1bmN0aW9uIGJha2UodmFsdWVzLCBvZmZzZXQpIHtcclxuICAgIHZhciBpID0gMCwgbyA9IHt9O1xyXG4gICAgb2Zmc2V0IHw9IDA7XHJcbiAgICB3aGlsZSAoaSA8IHZhbHVlcy5sZW5ndGgpIG9bc1tpICsgb2Zmc2V0XV0gPSB2YWx1ZXNbaSsrXTtcclxuICAgIHJldHVybiBvO1xyXG59XHJcblxyXG4vKipcclxuICogQmFzaWMgdHlwZSB3aXJlIHR5cGVzLlxyXG4gKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsbnVtYmVyPn1cclxuICogQGNvbnN0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBkb3VibGU9MSBGaXhlZDY0IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZmxvYXQ9NSBGaXhlZDMyIHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gaW50MzI9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSB1aW50MzI9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzaW50MzI9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBmaXhlZDMyPTUgRml4ZWQzMiB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNmaXhlZDMyPTUgRml4ZWQzMiB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGludDY0PTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gdWludDY0PTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ludDY0PTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZml4ZWQ2ND0xIEZpeGVkNjQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzZml4ZWQ2ND0xIEZpeGVkNjQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBib29sPTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc3RyaW5nPTIgTGRlbGltIHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gYnl0ZXM9MiBMZGVsaW0gd2lyZSB0eXBlXHJcbiAqL1xyXG50eXBlcy5iYXNpYyA9IGJha2UoW1xyXG4gICAgLyogZG91YmxlICAgKi8gMSxcclxuICAgIC8qIGZsb2F0ICAgICovIDUsXHJcbiAgICAvKiBpbnQzMiAgICAqLyAwLFxyXG4gICAgLyogdWludDMyICAgKi8gMCxcclxuICAgIC8qIHNpbnQzMiAgICovIDAsXHJcbiAgICAvKiBmaXhlZDMyICAqLyA1LFxyXG4gICAgLyogc2ZpeGVkMzIgKi8gNSxcclxuICAgIC8qIGludDY0ICAgICovIDAsXHJcbiAgICAvKiB1aW50NjQgICAqLyAwLFxyXG4gICAgLyogc2ludDY0ICAgKi8gMCxcclxuICAgIC8qIGZpeGVkNjQgICovIDEsXHJcbiAgICAvKiBzZml4ZWQ2NCAqLyAxLFxyXG4gICAgLyogYm9vbCAgICAgKi8gMCxcclxuICAgIC8qIHN0cmluZyAgICovIDIsXHJcbiAgICAvKiBieXRlcyAgICAqLyAyXHJcbl0pO1xyXG5cclxuLyoqXHJcbiAqIEJhc2ljIHR5cGUgZGVmYXVsdHMuXHJcbiAqIEB0eXBlIHtPYmplY3QuPHN0cmluZywqPn1cclxuICogQGNvbnN0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBkb3VibGU9MCBEb3VibGUgZGVmYXVsdFxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZmxvYXQ9MCBGbG9hdCBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBpbnQzMj0wIEludDMyIGRlZmF1bHRcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHVpbnQzMj0wIFVpbnQzMiBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzaW50MzI9MCBTaW50MzIgZGVmYXVsdFxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZml4ZWQzMj0wIEZpeGVkMzIgZGVmYXVsdFxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ZpeGVkMzI9MCBTZml4ZWQzMiBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBpbnQ2ND0wIEludDY0IGRlZmF1bHRcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHVpbnQ2ND0wIFVpbnQ2NCBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzaW50NjQ9MCBTaW50MzIgZGVmYXVsdFxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZml4ZWQ2ND0wIEZpeGVkNjQgZGVmYXVsdFxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ZpeGVkNjQ9MCBTZml4ZWQ2NCBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gYm9vbD1mYWxzZSBCb29sIGRlZmF1bHRcclxuICogQHByb3BlcnR5IHtzdHJpbmd9IHN0cmluZz1cIlwiIFN0cmluZyBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcj59IGJ5dGVzPUFycmF5KDApIEJ5dGVzIGRlZmF1bHRcclxuICogQHByb3BlcnR5IHtNZXNzYWdlfSBtZXNzYWdlPW51bGwgTWVzc2FnZSBkZWZhdWx0XHJcbiAqL1xyXG50eXBlcy5kZWZhdWx0cyA9IGJha2UoW1xyXG4gICAgLyogZG91YmxlICAgKi8gMCxcclxuICAgIC8qIGZsb2F0ICAgICovIDAsXHJcbiAgICAvKiBpbnQzMiAgICAqLyAwLFxyXG4gICAgLyogdWludDMyICAgKi8gMCxcclxuICAgIC8qIHNpbnQzMiAgICovIDAsXHJcbiAgICAvKiBmaXhlZDMyICAqLyAwLFxyXG4gICAgLyogc2ZpeGVkMzIgKi8gMCxcclxuICAgIC8qIGludDY0ICAgICovIDAsXHJcbiAgICAvKiB1aW50NjQgICAqLyAwLFxyXG4gICAgLyogc2ludDY0ICAgKi8gMCxcclxuICAgIC8qIGZpeGVkNjQgICovIDAsXHJcbiAgICAvKiBzZml4ZWQ2NCAqLyAwLFxyXG4gICAgLyogYm9vbCAgICAgKi8gZmFsc2UsXHJcbiAgICAvKiBzdHJpbmcgICAqLyBcIlwiLFxyXG4gICAgLyogYnl0ZXMgICAgKi8gdXRpbC5lbXB0eUFycmF5LFxyXG4gICAgLyogbWVzc2FnZSAgKi8gbnVsbFxyXG5dKTtcclxuXHJcbi8qKlxyXG4gKiBCYXNpYyBsb25nIHR5cGUgd2lyZSB0eXBlcy5cclxuICogQHR5cGUge09iamVjdC48c3RyaW5nLG51bWJlcj59XHJcbiAqIEBjb25zdFxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gaW50NjQ9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSB1aW50NjQ9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzaW50NjQ9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBmaXhlZDY0PTEgRml4ZWQ2NCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNmaXhlZDY0PTEgRml4ZWQ2NCB3aXJlIHR5cGVcclxuICovXHJcbnR5cGVzLmxvbmcgPSBiYWtlKFtcclxuICAgIC8qIGludDY0ICAgICovIDAsXHJcbiAgICAvKiB1aW50NjQgICAqLyAwLFxyXG4gICAgLyogc2ludDY0ICAgKi8gMCxcclxuICAgIC8qIGZpeGVkNjQgICovIDEsXHJcbiAgICAvKiBzZml4ZWQ2NCAqLyAxXHJcbl0sIDcpO1xyXG5cclxuLyoqXHJcbiAqIEFsbG93ZWQgdHlwZXMgZm9yIG1hcCBrZXlzIHdpdGggdGhlaXIgYXNzb2NpYXRlZCB3aXJlIHR5cGUuXHJcbiAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxudW1iZXI+fVxyXG4gKiBAY29uc3RcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGludDMyPTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gdWludDMyPTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ludDMyPTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZml4ZWQzMj01IEZpeGVkMzIgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzZml4ZWQzMj01IEZpeGVkMzIgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBpbnQ2ND0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHVpbnQ2ND0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNpbnQ2ND0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGZpeGVkNjQ9MSBGaXhlZDY0IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ZpeGVkNjQ9MSBGaXhlZDY0IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gYm9vbD0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHN0cmluZz0yIExkZWxpbSB3aXJlIHR5cGVcclxuICovXHJcbnR5cGVzLm1hcEtleSA9IGJha2UoW1xyXG4gICAgLyogaW50MzIgICAgKi8gMCxcclxuICAgIC8qIHVpbnQzMiAgICovIDAsXHJcbiAgICAvKiBzaW50MzIgICAqLyAwLFxyXG4gICAgLyogZml4ZWQzMiAgKi8gNSxcclxuICAgIC8qIHNmaXhlZDMyICovIDUsXHJcbiAgICAvKiBpbnQ2NCAgICAqLyAwLFxyXG4gICAgLyogdWludDY0ICAgKi8gMCxcclxuICAgIC8qIHNpbnQ2NCAgICovIDAsXHJcbiAgICAvKiBmaXhlZDY0ICAqLyAxLFxyXG4gICAgLyogc2ZpeGVkNjQgKi8gMSxcclxuICAgIC8qIGJvb2wgICAgICovIDAsXHJcbiAgICAvKiBzdHJpbmcgICAqLyAyXHJcbl0sIDIpO1xyXG5cclxuLyoqXHJcbiAqIEFsbG93ZWQgdHlwZXMgZm9yIHBhY2tlZCByZXBlYXRlZCBmaWVsZHMgd2l0aCB0aGVpciBhc3NvY2lhdGVkIHdpcmUgdHlwZS5cclxuICogQHR5cGUge09iamVjdC48c3RyaW5nLG51bWJlcj59XHJcbiAqIEBjb25zdFxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZG91YmxlPTEgRml4ZWQ2NCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGZsb2F0PTUgRml4ZWQzMiB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGludDMyPTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gdWludDMyPTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ludDMyPTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZml4ZWQzMj01IEZpeGVkMzIgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzZml4ZWQzMj01IEZpeGVkMzIgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBpbnQ2ND0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHVpbnQ2ND0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNpbnQ2ND0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGZpeGVkNjQ9MSBGaXhlZDY0IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ZpeGVkNjQ9MSBGaXhlZDY0IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gYm9vbD0wIFZhcmludCB3aXJlIHR5cGVcclxuICovXHJcbnR5cGVzLnBhY2tlZCA9IGJha2UoW1xyXG4gICAgLyogZG91YmxlICAgKi8gMSxcclxuICAgIC8qIGZsb2F0ICAgICovIDUsXHJcbiAgICAvKiBpbnQzMiAgICAqLyAwLFxyXG4gICAgLyogdWludDMyICAgKi8gMCxcclxuICAgIC8qIHNpbnQzMiAgICovIDAsXHJcbiAgICAvKiBmaXhlZDMyICAqLyA1LFxyXG4gICAgLyogc2ZpeGVkMzIgKi8gNSxcclxuICAgIC8qIGludDY0ICAgICovIDAsXHJcbiAgICAvKiB1aW50NjQgICAqLyAwLFxyXG4gICAgLyogc2ludDY0ICAgKi8gMCxcclxuICAgIC8qIGZpeGVkNjQgICovIDEsXHJcbiAgICAvKiBzZml4ZWQ2NCAqLyAxLFxyXG4gICAgLyogYm9vbCAgICAgKi8gMFxyXG5dKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vKipcclxuICogVmFyaW91cyB1dGlsaXR5IGZ1bmN0aW9ucy5cclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxudmFyIHV0aWwgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3V0aWwvbWluaW1hbFwiKTtcclxuXHJcbnV0aWwuY29kZWdlbiA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9jb2RlZ2VuXCIpO1xyXG51dGlsLmZldGNoICAgPSByZXF1aXJlKFwiQHByb3RvYnVmanMvZmV0Y2hcIik7XHJcbnV0aWwucGF0aCAgICA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9wYXRoXCIpO1xyXG5cclxuLyoqXHJcbiAqIE5vZGUncyBmcyBtb2R1bGUgaWYgYXZhaWxhYmxlLlxyXG4gKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsKj59XHJcbiAqL1xyXG51dGlsLmZzID0gdXRpbC5pbnF1aXJlKFwiZnNcIik7XHJcblxyXG4vKipcclxuICogQ29udmVydHMgYW4gb2JqZWN0J3MgdmFsdWVzIHRvIGFuIGFycmF5LlxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgT2JqZWN0IHRvIGNvbnZlcnRcclxuICogQHJldHVybnMge0FycmF5LjwqPn0gQ29udmVydGVkIGFycmF5XHJcbiAqL1xyXG51dGlsLnRvQXJyYXkgPSBmdW5jdGlvbiB0b0FycmF5KG9iamVjdCkge1xyXG4gICAgdmFyIGFycmF5ID0gW107XHJcbiAgICBpZiAob2JqZWN0KVxyXG4gICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmplY3QpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgIGFycmF5LnB1c2gob2JqZWN0W2tleXNbaV1dKTtcclxuICAgIHJldHVybiBhcnJheTtcclxufTtcclxuXHJcbnZhciBzYWZlUHJvcEJhY2tzbGFzaFJlID0gL1xcXFwvZyxcclxuICAgIHNhZmVQcm9wUXVvdGVSZSAgICAgPSAvXCIvZztcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGEgc2FmZSBwcm9wZXJ0eSBhY2Nlc3NvciBmb3IgdGhlIHNwZWNpZmllZCBwcm9wZXJseSBuYW1lLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcHJvcCBQcm9wZXJ0eSBuYW1lXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFNhZmUgYWNjZXNzb3JcclxuICovXHJcbnV0aWwuc2FmZVByb3AgPSBmdW5jdGlvbiBzYWZlUHJvcChwcm9wKSB7XHJcbiAgICByZXR1cm4gXCJbXFxcIlwiICsgcHJvcC5yZXBsYWNlKHNhZmVQcm9wQmFja3NsYXNoUmUsIFwiXFxcXFxcXFxcIikucmVwbGFjZShzYWZlUHJvcFF1b3RlUmUsIFwiXFxcXFxcXCJcIikgKyBcIlxcXCJdXCI7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhlIGZpcnN0IGNoYXJhY3RlciBvZiBhIHN0cmluZyB0byB1cHBlciBjYXNlLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIFN0cmluZyB0byBjb252ZXJ0XHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IENvbnZlcnRlZCBzdHJpbmdcclxuICovXHJcbnV0aWwudWNGaXJzdCA9IGZ1bmN0aW9uIHVjRmlyc3Qoc3RyKSB7XHJcbiAgICByZXR1cm4gc3RyLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyLnN1YnN0cmluZygxKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb21wYXJlcyByZWZsZWN0ZWQgZmllbGRzIGJ5IGlkLlxyXG4gKiBAcGFyYW0ge0ZpZWxkfSBhIEZpcnN0IGZpZWxkXHJcbiAqIEBwYXJhbSB7RmllbGR9IGIgU2Vjb25kIGZpZWxkXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IENvbXBhcmlzb24gdmFsdWVcclxuICovXHJcbnV0aWwuY29tcGFyZUZpZWxkc0J5SWQgPSBmdW5jdGlvbiBjb21wYXJlRmllbGRzQnlJZChhLCBiKSB7XHJcbiAgICByZXR1cm4gYS5pZCAtIGIuaWQ7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IExvbmdCaXRzO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgbmV3IGxvbmcgYml0cy5cclxuICogQGNsYXNzZGVzYyBIZWxwZXIgY2xhc3MgZm9yIHdvcmtpbmcgd2l0aCB0aGUgbG93IGFuZCBoaWdoIGJpdHMgb2YgYSA2NCBiaXQgdmFsdWUuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge251bWJlcn0gbG8gTG93IDMyIGJpdHMsIHVuc2lnbmVkXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBoaSBIaWdoIDMyIGJpdHMsIHVuc2lnbmVkXHJcbiAqL1xyXG5mdW5jdGlvbiBMb25nQml0cyhsbywgaGkpIHtcclxuXHJcbiAgICAvLyBub3RlIHRoYXQgdGhlIGNhc3RzIGJlbG93IGFyZSB0aGVvcmV0aWNhbGx5IHVubmVjZXNzYXJ5IGFzIG9mIHRvZGF5LCBidXQgb2xkZXIgc3RhdGljYWxseVxyXG4gICAgLy8gZ2VuZXJhdGVkIGNvbnZlcnRlciBjb2RlIG1pZ2h0IHN0aWxsIGNhbGwgdGhlIGN0b3Igd2l0aCBzaWduZWQgMzJiaXRzLiBrZXB0IGZvciBjb21wYXQuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBMb3cgYml0cy5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubG8gPSBsbyA+Pj4gMDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEhpZ2ggYml0cy5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuaGkgPSBoaSA+Pj4gMDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFplcm8gYml0cy5cclxuICogQG1lbWJlcm9mIHV0aWwuTG9uZ0JpdHNcclxuICogQHR5cGUge3V0aWwuTG9uZ0JpdHN9XHJcbiAqL1xyXG52YXIgemVybyA9IExvbmdCaXRzLnplcm8gPSBuZXcgTG9uZ0JpdHMoMCwgMCk7XHJcblxyXG56ZXJvLnRvTnVtYmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xyXG56ZXJvLnp6RW5jb2RlID0gemVyby56ekRlY29kZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfTtcclxuemVyby5sZW5ndGggPSBmdW5jdGlvbigpIHsgcmV0dXJuIDE7IH07XHJcblxyXG4vKipcclxuICogWmVybyBoYXNoLlxyXG4gKiBAbWVtYmVyb2YgdXRpbC5Mb25nQml0c1xyXG4gKiBAdHlwZSB7c3RyaW5nfVxyXG4gKi9cclxudmFyIHplcm9IYXNoID0gTG9uZ0JpdHMuemVyb0hhc2ggPSBcIlxcMFxcMFxcMFxcMFxcMFxcMFxcMFxcMFwiO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgbmV3IGxvbmcgYml0cyBmcm9tIHRoZSBzcGVjaWZpZWQgbnVtYmVyLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWVcclxuICogQHJldHVybnMge3V0aWwuTG9uZ0JpdHN9IEluc3RhbmNlXHJcbiAqL1xyXG5Mb25nQml0cy5mcm9tTnVtYmVyID0gZnVuY3Rpb24gZnJvbU51bWJlcih2YWx1ZSkge1xyXG4gICAgaWYgKHZhbHVlID09PSAwKVxyXG4gICAgICAgIHJldHVybiB6ZXJvO1xyXG4gICAgdmFyIHNpZ24gPSB2YWx1ZSA8IDA7XHJcbiAgICBpZiAoc2lnbilcclxuICAgICAgICB2YWx1ZSA9IC12YWx1ZTtcclxuICAgIHZhciBsbyA9IHZhbHVlID4+PiAwLFxyXG4gICAgICAgIGhpID0gKHZhbHVlIC0gbG8pIC8gNDI5NDk2NzI5NiA+Pj4gMDtcclxuICAgIGlmIChzaWduKSB7XHJcbiAgICAgICAgaGkgPSB+aGkgPj4+IDA7XHJcbiAgICAgICAgbG8gPSB+bG8gPj4+IDA7XHJcbiAgICAgICAgaWYgKCsrbG8gPiA0Mjk0OTY3Mjk1KSB7XHJcbiAgICAgICAgICAgIGxvID0gMDtcclxuICAgICAgICAgICAgaWYgKCsraGkgPiA0Mjk0OTY3Mjk1KVxyXG4gICAgICAgICAgICAgICAgaGkgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgTG9uZ0JpdHMobG8sIGhpKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIG5ldyBsb25nIGJpdHMgZnJvbSBhIG51bWJlciwgbG9uZyBvciBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZVxyXG4gKiBAcmV0dXJucyB7dXRpbC5Mb25nQml0c30gSW5zdGFuY2VcclxuICovXHJcbkxvbmdCaXRzLmZyb20gPSBmdW5jdGlvbiBmcm9tKHZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKVxyXG4gICAgICAgIHJldHVybiBMb25nQml0cy5mcm9tTnVtYmVyKHZhbHVlKTtcclxuICAgIGlmICh1dGlsLmlzU3RyaW5nKHZhbHVlKSkge1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYgKHV0aWwuTG9uZylcclxuICAgICAgICAgICAgdmFsdWUgPSB1dGlsLkxvbmcuZnJvbVN0cmluZyh2YWx1ZSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gTG9uZ0JpdHMuZnJvbU51bWJlcihwYXJzZUludCh2YWx1ZSwgMTApKTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZS5sb3cgfHwgdmFsdWUuaGlnaCA/IG5ldyBMb25nQml0cyh2YWx1ZS5sb3cgPj4+IDAsIHZhbHVlLmhpZ2ggPj4+IDApIDogemVybztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIGxvbmcgYml0cyB0byBhIHBvc3NpYmx5IHVuc2FmZSBKYXZhU2NyaXB0IG51bWJlci5cclxuICogQHBhcmFtIHtib29sZWFufSBbdW5zaWduZWQ9ZmFsc2VdIFdoZXRoZXIgdW5zaWduZWQgb3Igbm90XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFBvc3NpYmx5IHVuc2FmZSBudW1iZXJcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS50b051bWJlciA9IGZ1bmN0aW9uIHRvTnVtYmVyKHVuc2lnbmVkKSB7XHJcbiAgICBpZiAoIXVuc2lnbmVkICYmIHRoaXMuaGkgPj4+IDMxKSB7XHJcbiAgICAgICAgdmFyIGxvID0gfnRoaXMubG8gKyAxID4+PiAwLFxyXG4gICAgICAgICAgICBoaSA9IH50aGlzLmhpICAgICA+Pj4gMDtcclxuICAgICAgICBpZiAoIWxvKVxyXG4gICAgICAgICAgICBoaSA9IGhpICsgMSA+Pj4gMDtcclxuICAgICAgICByZXR1cm4gLShsbyArIGhpICogNDI5NDk2NzI5Nik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5sbyArIHRoaXMuaGkgKiA0Mjk0OTY3Mjk2O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoaXMgbG9uZyBiaXRzIHRvIGEgbG9uZy5cclxuICogQHBhcmFtIHtib29sZWFufSBbdW5zaWduZWQ9ZmFsc2VdIFdoZXRoZXIgdW5zaWduZWQgb3Igbm90XHJcbiAqIEByZXR1cm5zIHtMb25nfSBMb25nXHJcbiAqL1xyXG5Mb25nQml0cy5wcm90b3R5cGUudG9Mb25nID0gZnVuY3Rpb24gdG9Mb25nKHVuc2lnbmVkKSB7XHJcbiAgICByZXR1cm4gdXRpbC5Mb25nXHJcbiAgICAgICAgPyBuZXcgdXRpbC5Mb25nKHRoaXMubG8gfCAwLCB0aGlzLmhpIHwgMCwgQm9vbGVhbih1bnNpZ25lZCkpXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICA6IHsgbG93OiB0aGlzLmxvIHwgMCwgaGlnaDogdGhpcy5oaSB8IDAsIHVuc2lnbmVkOiBCb29sZWFuKHVuc2lnbmVkKSB9O1xyXG59O1xyXG5cclxudmFyIGNoYXJDb2RlQXQgPSBTdHJpbmcucHJvdG90eXBlLmNoYXJDb2RlQXQ7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBuZXcgbG9uZyBiaXRzIGZyb20gdGhlIHNwZWNpZmllZCA4IGNoYXJhY3RlcnMgbG9uZyBoYXNoLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaGFzaCBIYXNoXHJcbiAqIEByZXR1cm5zIHt1dGlsLkxvbmdCaXRzfSBCaXRzXHJcbiAqL1xyXG5Mb25nQml0cy5mcm9tSGFzaCA9IGZ1bmN0aW9uIGZyb21IYXNoKGhhc2gpIHtcclxuICAgIGlmIChoYXNoID09PSB6ZXJvSGFzaClcclxuICAgICAgICByZXR1cm4gemVybztcclxuICAgIHJldHVybiBuZXcgTG9uZ0JpdHMoXHJcbiAgICAgICAgKCBjaGFyQ29kZUF0LmNhbGwoaGFzaCwgMClcclxuICAgICAgICB8IGNoYXJDb2RlQXQuY2FsbChoYXNoLCAxKSA8PCA4XHJcbiAgICAgICAgfCBjaGFyQ29kZUF0LmNhbGwoaGFzaCwgMikgPDwgMTZcclxuICAgICAgICB8IGNoYXJDb2RlQXQuY2FsbChoYXNoLCAzKSA8PCAyNCkgPj4+IDBcclxuICAgICxcclxuICAgICAgICAoIGNoYXJDb2RlQXQuY2FsbChoYXNoLCA0KVxyXG4gICAgICAgIHwgY2hhckNvZGVBdC5jYWxsKGhhc2gsIDUpIDw8IDhcclxuICAgICAgICB8IGNoYXJDb2RlQXQuY2FsbChoYXNoLCA2KSA8PCAxNlxyXG4gICAgICAgIHwgY2hhckNvZGVBdC5jYWxsKGhhc2gsIDcpIDw8IDI0KSA+Pj4gMFxyXG4gICAgKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIGxvbmcgYml0cyB0byBhIDggY2hhcmFjdGVycyBsb25nIGhhc2guXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEhhc2hcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS50b0hhc2ggPSBmdW5jdGlvbiB0b0hhc2goKSB7XHJcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShcclxuICAgICAgICB0aGlzLmxvICAgICAgICAmIDI1NSxcclxuICAgICAgICB0aGlzLmxvID4+PiA4ICAmIDI1NSxcclxuICAgICAgICB0aGlzLmxvID4+PiAxNiAmIDI1NSxcclxuICAgICAgICB0aGlzLmxvID4+PiAyNCAgICAgICxcclxuICAgICAgICB0aGlzLmhpICAgICAgICAmIDI1NSxcclxuICAgICAgICB0aGlzLmhpID4+PiA4ICAmIDI1NSxcclxuICAgICAgICB0aGlzLmhpID4+PiAxNiAmIDI1NSxcclxuICAgICAgICB0aGlzLmhpID4+PiAyNFxyXG4gICAgKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBaaWctemFnIGVuY29kZXMgdGhpcyBsb25nIGJpdHMuXHJcbiAqIEByZXR1cm5zIHt1dGlsLkxvbmdCaXRzfSBgdGhpc2BcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS56ekVuY29kZSA9IGZ1bmN0aW9uIHp6RW5jb2RlKCkge1xyXG4gICAgdmFyIG1hc2sgPSAgIHRoaXMuaGkgPj4gMzE7XHJcbiAgICB0aGlzLmhpICA9ICgodGhpcy5oaSA8PCAxIHwgdGhpcy5sbyA+Pj4gMzEpIF4gbWFzaykgPj4+IDA7XHJcbiAgICB0aGlzLmxvICA9ICggdGhpcy5sbyA8PCAxICAgICAgICAgICAgICAgICAgIF4gbWFzaykgPj4+IDA7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBaaWctemFnIGRlY29kZXMgdGhpcyBsb25nIGJpdHMuXHJcbiAqIEByZXR1cm5zIHt1dGlsLkxvbmdCaXRzfSBgdGhpc2BcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS56ekRlY29kZSA9IGZ1bmN0aW9uIHp6RGVjb2RlKCkge1xyXG4gICAgdmFyIG1hc2sgPSAtKHRoaXMubG8gJiAxKTtcclxuICAgIHRoaXMubG8gID0gKCh0aGlzLmxvID4+PiAxIHwgdGhpcy5oaSA8PCAzMSkgXiBtYXNrKSA+Pj4gMDtcclxuICAgIHRoaXMuaGkgID0gKCB0aGlzLmhpID4+PiAxICAgICAgICAgICAgICAgICAgXiBtYXNrKSA+Pj4gMDtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGxlbmd0aCBvZiB0aGlzIGxvbmdiaXRzIHdoZW4gZW5jb2RlZCBhcyBhIHZhcmludC5cclxuICogQHJldHVybnMge251bWJlcn0gTGVuZ3RoXHJcbiAqL1xyXG5Mb25nQml0cy5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gbGVuZ3RoKCkge1xyXG4gICAgdmFyIHBhcnQwID0gIHRoaXMubG8sXHJcbiAgICAgICAgcGFydDEgPSAodGhpcy5sbyA+Pj4gMjggfCB0aGlzLmhpIDw8IDQpID4+PiAwLFxyXG4gICAgICAgIHBhcnQyID0gIHRoaXMuaGkgPj4+IDI0O1xyXG4gICAgcmV0dXJuIHBhcnQyID09PSAwXHJcbiAgICAgICAgID8gcGFydDEgPT09IDBcclxuICAgICAgICAgICA/IHBhcnQwIDwgMTYzODRcclxuICAgICAgICAgICAgID8gcGFydDAgPCAxMjggPyAxIDogMlxyXG4gICAgICAgICAgICAgOiBwYXJ0MCA8IDIwOTcxNTIgPyAzIDogNFxyXG4gICAgICAgICAgIDogcGFydDEgPCAxNjM4NFxyXG4gICAgICAgICAgICAgPyBwYXJ0MSA8IDEyOCA/IDUgOiA2XHJcbiAgICAgICAgICAgICA6IHBhcnQxIDwgMjA5NzE1MiA/IDcgOiA4XHJcbiAgICAgICAgIDogcGFydDIgPCAxMjggPyA5IDogMTA7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgdXRpbCA9IGV4cG9ydHM7XHJcblxyXG4vLyB1c2VkIHRvIHJldHVybiBhIFByb21pc2Ugd2hlcmUgY2FsbGJhY2sgaXMgb21pdHRlZFxyXG51dGlsLmFzUHJvbWlzZSA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9hc3Byb21pc2VcIik7XHJcblxyXG4vLyBjb252ZXJ0cyB0byAvIGZyb20gYmFzZTY0IGVuY29kZWQgc3RyaW5nc1xyXG51dGlsLmJhc2U2NCA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9iYXNlNjRcIik7XHJcblxyXG4vLyBiYXNlIGNsYXNzIG9mIHJwYy5TZXJ2aWNlXHJcbnV0aWwuRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIkBwcm90b2J1ZmpzL2V2ZW50ZW1pdHRlclwiKTtcclxuXHJcbi8vIGZsb2F0IGhhbmRsaW5nIGFjY3Jvc3MgYnJvd3NlcnNcclxudXRpbC5mbG9hdCA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9mbG9hdFwiKTtcclxuXHJcbi8vIHJlcXVpcmVzIG1vZHVsZXMgb3B0aW9uYWxseSBhbmQgaGlkZXMgdGhlIGNhbGwgZnJvbSBidW5kbGVyc1xyXG51dGlsLmlucXVpcmUgPSByZXF1aXJlKFwiQHByb3RvYnVmanMvaW5xdWlyZVwiKTtcclxuXHJcbi8vIGNvbnZlcnRzIHRvIC8gZnJvbSB1dGY4IGVuY29kZWQgc3RyaW5nc1xyXG51dGlsLnV0ZjggPSByZXF1aXJlKFwiQHByb3RvYnVmanMvdXRmOFwiKTtcclxuXHJcbi8vIHByb3ZpZGVzIGEgbm9kZS1saWtlIGJ1ZmZlciBwb29sIGluIHRoZSBicm93c2VyXHJcbnV0aWwucG9vbCA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9wb29sXCIpO1xyXG5cclxuLy8gdXRpbGl0eSB0byB3b3JrIHdpdGggdGhlIGxvdyBhbmQgaGlnaCBiaXRzIG9mIGEgNjQgYml0IHZhbHVlXHJcbnV0aWwuTG9uZ0JpdHMgPSByZXF1aXJlKFwiLi9sb25nYml0c1wiKTtcclxuXHJcbi8qKlxyXG4gKiBBbiBpbW11YWJsZSBlbXB0eSBhcnJheS5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHR5cGUge0FycmF5LjwqPn1cclxuICogQGNvbnN0XHJcbiAqL1xyXG51dGlsLmVtcHR5QXJyYXkgPSBPYmplY3QuZnJlZXplID8gT2JqZWN0LmZyZWV6ZShbXSkgOiAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBbXTsgLy8gdXNlZCBvbiBwcm90b3R5cGVzXHJcblxyXG4vKipcclxuICogQW4gaW1tdXRhYmxlIGVtcHR5IG9iamVjdC5cclxuICogQHR5cGUge09iamVjdH1cclxuICogQGNvbnN0XHJcbiAqL1xyXG51dGlsLmVtcHR5T2JqZWN0ID0gT2JqZWN0LmZyZWV6ZSA/IE9iamVjdC5mcmVlemUoe30pIDogLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8ge307IC8vIHVzZWQgb24gcHJvdG90eXBlc1xyXG5cclxuLyoqXHJcbiAqIFdoZXRoZXIgcnVubmluZyB3aXRoaW4gbm9kZSBvciBub3QuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEB0eXBlIHtib29sZWFufVxyXG4gKiBAY29uc3RcclxuICovXHJcbnV0aWwuaXNOb2RlID0gQm9vbGVhbihnbG9iYWwucHJvY2VzcyAmJiBnbG9iYWwucHJvY2Vzcy52ZXJzaW9ucyAmJiBnbG9iYWwucHJvY2Vzcy52ZXJzaW9ucy5ub2RlKTtcclxuXHJcbi8qKlxyXG4gKiBUZXN0cyBpZiB0aGUgc3BlY2lmaWVkIHZhbHVlIGlzIGFuIGludGVnZXIuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0geyp9IHZhbHVlIFZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgdmFsdWUgaXMgYW4gaW50ZWdlclxyXG4gKi9cclxudXRpbC5pc0ludGVnZXIgPSBOdW1iZXIuaXNJbnRlZ2VyIHx8IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIGZ1bmN0aW9uIGlzSW50ZWdlcih2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiBpc0Zpbml0ZSh2YWx1ZSkgJiYgTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRlc3RzIGlmIHRoZSBzcGVjaWZpZWQgdmFsdWUgaXMgYSBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gYHRydWVgIGlmIHRoZSB2YWx1ZSBpcyBhIHN0cmluZ1xyXG4gKi9cclxudXRpbC5pc1N0cmluZyA9IGZ1bmN0aW9uIGlzU3RyaW5nKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiIHx8IHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRlc3RzIGlmIHRoZSBzcGVjaWZpZWQgdmFsdWUgaXMgYSBub24tbnVsbCBvYmplY3QuXHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gYHRydWVgIGlmIHRoZSB2YWx1ZSBpcyBhIG5vbi1udWxsIG9iamVjdFxyXG4gKi9cclxudXRpbC5pc09iamVjdCA9IGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrcyBpZiBhIHByb3BlcnR5IG9uIGEgbWVzc2FnZSBpcyBjb25zaWRlcmVkIHRvIGJlIHByZXNlbnQuXHJcbiAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIHV0aWwuaXNTZXR9LlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBQbGFpbiBvYmplY3Qgb3IgbWVzc2FnZSBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcHJvcCBQcm9wZXJ0eSBuYW1lXHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgY29uc2lkZXJlZCB0byBiZSBwcmVzZW50LCBvdGhlcndpc2UgYGZhbHNlYFxyXG4gKi9cclxudXRpbC5pc3NldCA9XHJcblxyXG4vKipcclxuICogQ2hlY2tzIGlmIGEgcHJvcGVydHkgb24gYSBtZXNzYWdlIGlzIGNvbnNpZGVyZWQgdG8gYmUgcHJlc2VudC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBQbGFpbiBvYmplY3Qgb3IgbWVzc2FnZSBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcHJvcCBQcm9wZXJ0eSBuYW1lXHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgY29uc2lkZXJlZCB0byBiZSBwcmVzZW50LCBvdGhlcndpc2UgYGZhbHNlYFxyXG4gKi9cclxudXRpbC5pc1NldCA9IGZ1bmN0aW9uIGlzU2V0KG9iaiwgcHJvcCkge1xyXG4gICAgdmFyIHZhbHVlID0gb2JqW3Byb3BdO1xyXG4gICAgaWYgKHZhbHVlICE9IG51bGwgJiYgb2JqLmhhc093blByb3BlcnR5KHByb3ApKSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGVxZXFlcSwgbm8tcHJvdG90eXBlLWJ1aWx0aW5zXHJcbiAgICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiB8fCAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZS5sZW5ndGggOiBPYmplY3Qua2V5cyh2YWx1ZSkubGVuZ3RoKSA+IDA7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG4vKlxyXG4gKiBBbnkgY29tcGF0aWJsZSBCdWZmZXIgaW5zdGFuY2UuXHJcbiAqIFRoaXMgaXMgYSBtaW5pbWFsIHN0YW5kLWFsb25lIGRlZmluaXRpb24gb2YgYSBCdWZmZXIgaW5zdGFuY2UuIFRoZSBhY3R1YWwgdHlwZSBpcyB0aGF0IGV4cG9ydGVkIGJ5IG5vZGUncyB0eXBpbmdzLlxyXG4gKiBAdHlwZWRlZiBCdWZmZXJcclxuICogQHR5cGUge1VpbnQ4QXJyYXl9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIE5vZGUncyBCdWZmZXIgY2xhc3MgaWYgYXZhaWxhYmxlLlxyXG4gKiBAdHlwZSB7P2Z1bmN0aW9uKG5ldzogQnVmZmVyKX1cclxuICovXHJcbnV0aWwuQnVmZmVyID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB2YXIgQnVmZmVyID0gdXRpbC5pbnF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcjtcclxuICAgICAgICAvLyByZWZ1c2UgdG8gdXNlIG5vbi1ub2RlIGJ1ZmZlcnMgaWYgbm90IGV4cGxpY2l0bHkgYXNzaWduZWQgKHBlcmYgcmVhc29ucyk6XHJcbiAgICAgICAgcmV0dXJuIEJ1ZmZlci5wcm90b3R5cGUudXRmOFdyaXRlID8gQnVmZmVyIDogLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gbnVsbDtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59KSgpO1xyXG5cclxuLyoqXHJcbiAqIEludGVybmFsIGFsaWFzIG9mIG9yIHBvbHlmdWxsIGZvciBCdWZmZXIuZnJvbS5cclxuICogQHR5cGUgez9mdW5jdGlvbn1cclxuICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyW119IHZhbHVlIFZhbHVlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZW5jb2RpbmddIEVuY29kaW5nIGlmIHZhbHVlIGlzIGEgc3RyaW5nXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fVxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxudXRpbC5fQnVmZmVyX2Zyb20gPSBudWxsO1xyXG5cclxuLyoqXHJcbiAqIEludGVybmFsIGFsaWFzIG9mIG9yIHBvbHlmaWxsIGZvciBCdWZmZXIuYWxsb2NVbnNhZmUuXHJcbiAqIEB0eXBlIHs/ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIEJ1ZmZlciBzaXplXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fVxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxudXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlID0gbnVsbDtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IGJ1ZmZlciBvZiB3aGF0ZXZlciB0eXBlIHN1cHBvcnRlZCBieSB0aGUgZW52aXJvbm1lbnQuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfG51bWJlcltdfSBbc2l6ZU9yQXJyYXk9MF0gQnVmZmVyIHNpemUgb3IgbnVtYmVyIGFycmF5XHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fEJ1ZmZlcn0gQnVmZmVyXHJcbiAqL1xyXG51dGlsLm5ld0J1ZmZlciA9IGZ1bmN0aW9uIG5ld0J1ZmZlcihzaXplT3JBcnJheSkge1xyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIHJldHVybiB0eXBlb2Ygc2l6ZU9yQXJyYXkgPT09IFwibnVtYmVyXCJcclxuICAgICAgICA/IHV0aWwuQnVmZmVyXHJcbiAgICAgICAgICAgID8gdXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlKHNpemVPckFycmF5KVxyXG4gICAgICAgICAgICA6IG5ldyB1dGlsLkFycmF5KHNpemVPckFycmF5KVxyXG4gICAgICAgIDogdXRpbC5CdWZmZXJcclxuICAgICAgICAgICAgPyB1dGlsLl9CdWZmZXJfZnJvbShzaXplT3JBcnJheSlcclxuICAgICAgICAgICAgOiB0eXBlb2YgVWludDhBcnJheSA9PT0gXCJ1bmRlZmluZWRcIlxyXG4gICAgICAgICAgICAgICAgPyBzaXplT3JBcnJheVxyXG4gICAgICAgICAgICAgICAgOiBuZXcgVWludDhBcnJheShzaXplT3JBcnJheSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQXJyYXkgaW1wbGVtZW50YXRpb24gdXNlZCBpbiB0aGUgYnJvd3Nlci4gYFVpbnQ4QXJyYXlgIGlmIHN1cHBvcnRlZCwgb3RoZXJ3aXNlIGBBcnJheWAuXHJcbiAqIEB0eXBlIHs/ZnVuY3Rpb24obmV3OiBVaW50OEFycmF5LCAqKX1cclxuICovXHJcbnV0aWwuQXJyYXkgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gXCJ1bmRlZmluZWRcIiA/IFVpbnQ4QXJyYXkgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gOiBBcnJheTtcclxuXHJcbi8qXHJcbiAqIEFueSBjb21wYXRpYmxlIExvbmcgaW5zdGFuY2UuXHJcbiAqIFRoaXMgaXMgYSBtaW5pbWFsIHN0YW5kLWFsb25lIGRlZmluaXRpb24gb2YgYSBMb25nIGluc3RhbmNlLiBUaGUgYWN0dWFsIHR5cGUgaXMgdGhhdCBleHBvcnRlZCBieSBsb25nLmpzLlxyXG4gKiBAdHlwZWRlZiBMb25nXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBsb3cgTG93IGJpdHNcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGhpZ2ggSGlnaCBiaXRzXHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gdW5zaWduZWQgV2hldGhlciB1bnNpZ25lZCBvciBub3RcclxuICovXHJcblxyXG4vKipcclxuICogTG9uZy5qcydzIExvbmcgY2xhc3MgaWYgYXZhaWxhYmxlLlxyXG4gKiBAdHlwZSB7P2Z1bmN0aW9uKG5ldzogTG9uZyl9XHJcbiAqL1xyXG51dGlsLkxvbmcgPSAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBnbG9iYWwuZGNvZGVJTyAmJiAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBnbG9iYWwuZGNvZGVJTy5Mb25nIHx8IHV0aWwuaW5xdWlyZShcImxvbmdcIik7XHJcblxyXG4vKipcclxuICogUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gdmVyaWZ5IDIgYml0IChgYm9vbGApIG1hcCBrZXlzLlxyXG4gKiBAdHlwZSB7UmVnRXhwfVxyXG4gKiBAY29uc3RcclxuICovXHJcbnV0aWwua2V5MlJlID0gL150cnVlfGZhbHNlfDB8MSQvO1xyXG5cclxuLyoqXHJcbiAqIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHZlcmlmeSAzMiBiaXQgKGBpbnQzMmAgZXRjLikgbWFwIGtleXMuXHJcbiAqIEB0eXBlIHtSZWdFeHB9XHJcbiAqIEBjb25zdFxyXG4gKi9cclxudXRpbC5rZXkzMlJlID0gL14tPyg/OjB8WzEtOV1bMC05XSopJC87XHJcblxyXG4vKipcclxuICogUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gdmVyaWZ5IDY0IGJpdCAoYGludDY0YCBldGMuKSBtYXAga2V5cy5cclxuICogQHR5cGUge1JlZ0V4cH1cclxuICogQGNvbnN0XHJcbiAqL1xyXG51dGlsLmtleTY0UmUgPSAvXig/OltcXFxceDAwLVxcXFx4ZmZdezh9fC0/KD86MHxbMS05XVswLTldKikpJC87XHJcblxyXG4vKipcclxuICogQ29udmVydHMgYSBudW1iZXIgb3IgbG9uZyB0byBhbiA4IGNoYXJhY3RlcnMgbG9uZyBoYXNoIHN0cmluZy5cclxuICogQHBhcmFtIHtMb25nfG51bWJlcn0gdmFsdWUgVmFsdWUgdG8gY29udmVydFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBIYXNoXHJcbiAqL1xyXG51dGlsLmxvbmdUb0hhc2ggPSBmdW5jdGlvbiBsb25nVG9IYXNoKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdmFsdWVcclxuICAgICAgICA/IHV0aWwuTG9uZ0JpdHMuZnJvbSh2YWx1ZSkudG9IYXNoKClcclxuICAgICAgICA6IHV0aWwuTG9uZ0JpdHMuemVyb0hhc2g7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgYW4gOCBjaGFyYWN0ZXJzIGxvbmcgaGFzaCBzdHJpbmcgdG8gYSBsb25nIG9yIG51bWJlci5cclxuICogQHBhcmFtIHtzdHJpbmd9IGhhc2ggSGFzaFxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFt1bnNpZ25lZD1mYWxzZV0gV2hldGhlciB1bnNpZ25lZCBvciBub3RcclxuICogQHJldHVybnMge0xvbmd8bnVtYmVyfSBPcmlnaW5hbCB2YWx1ZVxyXG4gKi9cclxudXRpbC5sb25nRnJvbUhhc2ggPSBmdW5jdGlvbiBsb25nRnJvbUhhc2goaGFzaCwgdW5zaWduZWQpIHtcclxuICAgIHZhciBiaXRzID0gdXRpbC5Mb25nQml0cy5mcm9tSGFzaChoYXNoKTtcclxuICAgIGlmICh1dGlsLkxvbmcpXHJcbiAgICAgICAgcmV0dXJuIHV0aWwuTG9uZy5mcm9tQml0cyhiaXRzLmxvLCBiaXRzLmhpLCB1bnNpZ25lZCk7XHJcbiAgICByZXR1cm4gYml0cy50b051bWJlcihCb29sZWFuKHVuc2lnbmVkKSk7XHJcbn07XHJcblxyXG4vKipcclxuICogTWVyZ2VzIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBzb3VyY2Ugb2JqZWN0IGludG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gZHN0IERlc3RpbmF0aW9uIG9iamVjdFxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBzcmMgU291cmNlIG9iamVjdFxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtpZk5vdFNldD1mYWxzZV0gTWVyZ2VzIG9ubHkgaWYgdGhlIGtleSBpcyBub3QgYWxyZWFkeSBzZXRcclxuICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBEZXN0aW5hdGlvbiBvYmplY3RcclxuICovXHJcbmZ1bmN0aW9uIG1lcmdlKGRzdCwgc3JjLCBpZk5vdFNldCkgeyAvLyB1c2VkIGJ5IGNvbnZlcnRlcnNcclxuICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhzcmMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgaWYgKGRzdFtrZXlzW2ldXSA9PT0gdW5kZWZpbmVkIHx8ICFpZk5vdFNldClcclxuICAgICAgICAgICAgZHN0W2tleXNbaV1dID0gc3JjW2tleXNbaV1dO1xyXG4gICAgcmV0dXJuIGRzdDtcclxufVxyXG5cclxudXRpbC5tZXJnZSA9IG1lcmdlO1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoZSBmaXJzdCBjaGFyYWN0ZXIgb2YgYSBzdHJpbmcgdG8gbG93ZXIgY2FzZS5cclxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciBTdHJpbmcgdG8gY29udmVydFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBDb252ZXJ0ZWQgc3RyaW5nXHJcbiAqL1xyXG51dGlsLmxjRmlyc3QgPSBmdW5jdGlvbiBsY0ZpcnN0KHN0cikge1xyXG4gICAgcmV0dXJuIHN0ci5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHN0ci5zdWJzdHJpbmcoMSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIGN1c3RvbSBlcnJvciBjb25zdHJ1Y3Rvci5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgRXJyb3IgbmFtZVxyXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb259IEN1c3RvbSBlcnJvciBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gbmV3RXJyb3IobmFtZSkge1xyXG5cclxuICAgIGZ1bmN0aW9uIEN1c3RvbUVycm9yKG1lc3NhZ2UsIHByb3BlcnRpZXMpIHtcclxuXHJcbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEN1c3RvbUVycm9yKSlcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBDdXN0b21FcnJvcihtZXNzYWdlLCBwcm9wZXJ0aWVzKTtcclxuXHJcbiAgICAgICAgLy8gRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcclxuICAgICAgICAvLyBeIGp1c3QgcmV0dXJucyBhIG5ldyBlcnJvciBpbnN0YW5jZSBiZWNhdXNlIHRoZSBjdG9yIGNhbiBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvblxyXG5cclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJtZXNzYWdlXCIsIHsgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1lc3NhZ2U7IH0gfSk7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSAvLyBub2RlXHJcbiAgICAgICAgICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEN1c3RvbUVycm9yKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0YWNrXCIsIHsgdmFsdWU6IChuZXcgRXJyb3IoKSkuc3RhY2sgfHwgXCJcIiB9KTtcclxuXHJcbiAgICAgICAgaWYgKHByb3BlcnRpZXMpXHJcbiAgICAgICAgICAgIG1lcmdlKHRoaXMsIHByb3BlcnRpZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIChDdXN0b21FcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gQ3VzdG9tRXJyb3I7XHJcblxyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEN1c3RvbUVycm9yLnByb3RvdHlwZSwgXCJuYW1lXCIsIHsgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5hbWU7IH0gfSk7XHJcblxyXG4gICAgQ3VzdG9tRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubmFtZSArIFwiOiBcIiArIHRoaXMubWVzc2FnZTtcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIEN1c3RvbUVycm9yO1xyXG59XHJcblxyXG51dGlsLm5ld0Vycm9yID0gbmV3RXJyb3I7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBwcm90b2NvbCBlcnJvci5cclxuICogQGNsYXNzZGVzYyBFcnJvciBzdWJjbGFzcyBpbmRpY2F0aW5nIGEgcHJvdG9jb2wgc3BlY2lmYyBlcnJvci5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQGV4dGVuZHMgRXJyb3JcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIEVycm9yIG1lc3NhZ2VcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPj19IHByb3BlcnRpZXMgQWRkaXRpb25hbCBwcm9wZXJ0aWVzXHJcbiAqIEBleGFtcGxlXHJcbiAqIHRyeSB7XHJcbiAqICAgICBNeU1lc3NhZ2UuZGVjb2RlKHNvbWVCdWZmZXIpOyAvLyB0aHJvd3MgaWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXHJcbiAqIH0gY2F0Y2ggKGUpIHtcclxuICogICAgIGlmIChlIGluc3RhbmNlb2YgUHJvdG9jb2xFcnJvciAmJiBlLmluc3RhbmNlKVxyXG4gKiAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVjb2RlZCBzbyBmYXI6IFwiICsgSlNPTi5zdHJpbmdpZnkoZS5pbnN0YW5jZSkpO1xyXG4gKiB9XHJcbiAqL1xyXG51dGlsLlByb3RvY29sRXJyb3IgPSBuZXdFcnJvcihcIlByb3RvY29sRXJyb3JcIik7XHJcblxyXG4vKipcclxuICogU28gZmFyIGRlY29kZWQgbWVzc2FnZSBpbnN0YW5jZS5cclxuICogQG5hbWUgdXRpbC5Qcm90b2NvbEVycm9yI2luc3RhbmNlXHJcbiAqIEB0eXBlIHtNZXNzYWdlfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBCdWlsZHMgYSBnZXR0ZXIgZm9yIGEgb25lb2YncyBwcmVzZW50IGZpZWxkIG5hbWUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nW119IGZpZWxkTmFtZXMgRmllbGQgbmFtZXNcclxuICogQHJldHVybnMge2Z1bmN0aW9uKCk6c3RyaW5nfHVuZGVmaW5lZH0gVW5ib3VuZCBnZXR0ZXJcclxuICovXHJcbnV0aWwub25lT2ZHZXR0ZXIgPSBmdW5jdGlvbiBnZXRPbmVPZihmaWVsZE5hbWVzKSB7XHJcbiAgICB2YXIgZmllbGRNYXAgPSB7fTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGROYW1lcy5sZW5ndGg7ICsraSlcclxuICAgICAgICBmaWVsZE1hcFtmaWVsZE5hbWVzW2ldXSA9IDE7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH0gU2V0IGZpZWxkIG5hbWUsIGlmIGFueVxyXG4gICAgICogQHRoaXMgT2JqZWN0XHJcbiAgICAgKiBAaWdub3JlXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBmdW5jdGlvbigpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb25zaXN0ZW50LXJldHVyblxyXG4gICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzKSwgaSA9IGtleXMubGVuZ3RoIC0gMTsgaSA+IC0xOyAtLWkpXHJcbiAgICAgICAgICAgIGlmIChmaWVsZE1hcFtrZXlzW2ldXSA9PT0gMSAmJiB0aGlzW2tleXNbaV1dICE9PSB1bmRlZmluZWQgJiYgdGhpc1trZXlzW2ldXSAhPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHJldHVybiBrZXlzW2ldO1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBCdWlsZHMgYSBzZXR0ZXIgZm9yIGEgb25lb2YncyBwcmVzZW50IGZpZWxkIG5hbWUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nW119IGZpZWxkTmFtZXMgRmllbGQgbmFtZXNcclxuICogQHJldHVybnMge2Z1bmN0aW9uKD9zdHJpbmcpOnVuZGVmaW5lZH0gVW5ib3VuZCBzZXR0ZXJcclxuICovXHJcbnV0aWwub25lT2ZTZXR0ZXIgPSBmdW5jdGlvbiBzZXRPbmVPZihmaWVsZE5hbWVzKSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBGaWVsZCBuYW1lXHJcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gICAgICogQHRoaXMgT2JqZWN0XHJcbiAgICAgKiBAaWdub3JlXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZE5hbWVzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICBpZiAoZmllbGROYW1lc1tpXSAhPT0gbmFtZSlcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzW2ZpZWxkTmFtZXNbaV1dO1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbi8qKlxyXG4gKiBMYXppbHkgcmVzb2x2ZXMgZnVsbHkgcXVhbGlmaWVkIHR5cGUgbmFtZXMgYWdhaW5zdCB0aGUgc3BlY2lmaWVkIHJvb3QuXHJcbiAqIEBwYXJhbSB7Um9vdH0gcm9vdCBSb290IGluc3RhbmNlb2ZcclxuICogQHBhcmFtIHtPYmplY3QuPG51bWJlcixzdHJpbmd8UmVmbGVjdGlvbk9iamVjdD59IGxhenlUeXBlcyBUeXBlIG5hbWVzXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEBkZXByZWNhdGVkIHNpbmNlIDYuNy4wIHN0YXRpYyBjb2RlIGRvZXMgbm90IGVtaXQgbGF6eSB0eXBlcyBhbnltb3JlXHJcbiAqL1xyXG51dGlsLmxhenlSZXNvbHZlID0gZnVuY3Rpb24gbGF6eVJlc29sdmUocm9vdCwgbGF6eVR5cGVzKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhenlUeXBlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhsYXp5VHlwZXNbaV0pLCBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyArK2opIHtcclxuICAgICAgICAgICAgdmFyIHBhdGggPSBsYXp5VHlwZXNbaV1ba2V5c1tqXV0uc3BsaXQoXCIuXCIpLFxyXG4gICAgICAgICAgICAgICAgcHRyICA9IHJvb3Q7XHJcbiAgICAgICAgICAgIHdoaWxlIChwYXRoLmxlbmd0aClcclxuICAgICAgICAgICAgICAgIHB0ciA9IHB0cltwYXRoLnNoaWZ0KCldO1xyXG4gICAgICAgICAgICBsYXp5VHlwZXNbaV1ba2V5c1tqXV0gPSBwdHI7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlZmF1bHQgY29udmVyc2lvbiBvcHRpb25zIHVzZWQgZm9yIHtAbGluayBNZXNzYWdlI3RvSlNPTn0gaW1wbGVtZW50YXRpb25zLiBMb25ncywgZW51bXMgYW5kIGJ5dGVzIGFyZSBjb252ZXJ0ZWQgdG8gc3RyaW5ncyBieSBkZWZhdWx0LlxyXG4gKiBAdHlwZSB7Q29udmVyc2lvbk9wdGlvbnN9XHJcbiAqL1xyXG51dGlsLnRvSlNPTk9wdGlvbnMgPSB7XHJcbiAgICBsb25nczogU3RyaW5nLFxyXG4gICAgZW51bXM6IFN0cmluZyxcclxuICAgIGJ5dGVzOiBTdHJpbmdcclxufTtcclxuXHJcbnV0aWwuX2NvbmZpZ3VyZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIEJ1ZmZlciA9IHV0aWwuQnVmZmVyO1xyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAoIUJ1ZmZlcikge1xyXG4gICAgICAgIHV0aWwuX0J1ZmZlcl9mcm9tID0gdXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlID0gbnVsbDtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvLyBiZWNhdXNlIG5vZGUgNC54IGJ1ZmZlcnMgYXJlIGluY29tcGF0aWJsZSAmIGltbXV0YWJsZVxyXG4gICAgLy8gc2VlOiBodHRwczovL2dpdGh1Yi5jb20vZGNvZGVJTy9wcm90b2J1Zi5qcy9wdWxsLzY2NVxyXG4gICAgdXRpbC5fQnVmZmVyX2Zyb20gPSBCdWZmZXIuZnJvbSAhPT0gVWludDhBcnJheS5mcm9tICYmIEJ1ZmZlci5mcm9tIHx8XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBmdW5jdGlvbiBCdWZmZXJfZnJvbSh2YWx1ZSwgZW5jb2RpbmcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmZXIodmFsdWUsIGVuY29kaW5nKTtcclxuICAgICAgICB9O1xyXG4gICAgdXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlID0gQnVmZmVyLmFsbG9jVW5zYWZlIHx8XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBmdW5jdGlvbiBCdWZmZXJfYWxsb2NVbnNhZmUoc2l6ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmZlcihzaXplKTtcclxuICAgICAgICB9O1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSB2ZXJpZmllcjtcclxuXHJcbnZhciBFbnVtICAgICAgPSByZXF1aXJlKFwiLi9lbnVtXCIpLFxyXG4gICAgdXRpbCAgICAgID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcclxuXHJcbmZ1bmN0aW9uIGludmFsaWQoZmllbGQsIGV4cGVjdGVkKSB7XHJcbiAgICByZXR1cm4gZmllbGQubmFtZSArIFwiOiBcIiArIGV4cGVjdGVkICsgKGZpZWxkLnJlcGVhdGVkICYmIGV4cGVjdGVkICE9PSBcImFycmF5XCIgPyBcIltdXCIgOiBmaWVsZC5tYXAgJiYgZXhwZWN0ZWQgIT09IFwib2JqZWN0XCIgPyBcIntrOlwiK2ZpZWxkLmtleVR5cGUrXCJ9XCIgOiBcIlwiKSArIFwiIGV4cGVjdGVkXCI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYSBwYXJ0aWFsIHZhbHVlIHZlcmlmaWVyLlxyXG4gKiBAcGFyYW0ge0NvZGVnZW59IGdlbiBDb2RlZ2VuIGluc3RhbmNlXHJcbiAqIEBwYXJhbSB7RmllbGR9IGZpZWxkIFJlZmxlY3RlZCBmaWVsZFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZmllbGRJbmRleCBGaWVsZCBpbmRleFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVmIFZhcmlhYmxlIHJlZmVyZW5jZVxyXG4gKiBAcmV0dXJucyB7Q29kZWdlbn0gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKiBAaWdub3JlXHJcbiAqL1xyXG5mdW5jdGlvbiBnZW5WZXJpZnlWYWx1ZShnZW4sIGZpZWxkLCBmaWVsZEluZGV4LCByZWYpIHtcclxuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lICovXHJcbiAgICBpZiAoZmllbGQucmVzb2x2ZWRUeXBlKSB7XHJcbiAgICAgICAgaWYgKGZpZWxkLnJlc29sdmVkVHlwZSBpbnN0YW5jZW9mIEVudW0pIHsgZ2VuXHJcbiAgICAgICAgICAgIChcInN3aXRjaCglcyl7XCIsIHJlZilcclxuICAgICAgICAgICAgICAgIChcImRlZmF1bHQ6XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJlbnVtIHZhbHVlXCIpKTtcclxuICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKGZpZWxkLnJlc29sdmVkVHlwZS52YWx1ZXMpLCBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyArK2opIGdlblxyXG4gICAgICAgICAgICAgICAgKFwiY2FzZSAlZDpcIiwgZmllbGQucmVzb2x2ZWRUeXBlLnZhbHVlc1trZXlzW2pdXSk7XHJcbiAgICAgICAgICAgIGdlblxyXG4gICAgICAgICAgICAgICAgICAgIChcImJyZWFrXCIpXHJcbiAgICAgICAgICAgIChcIn1cIik7XHJcbiAgICAgICAgfSBlbHNlIGdlblxyXG4gICAgICAgICAgICAoXCJ2YXIgZT10eXBlc1slZF0udmVyaWZ5KCVzKTtcIiwgZmllbGRJbmRleCwgcmVmKVxyXG4gICAgICAgICAgICAoXCJpZihlKVwiKVxyXG4gICAgICAgICAgICAgICAgKFwicmV0dXJuJWorZVwiLCBmaWVsZC5uYW1lICsgXCIuXCIpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBzd2l0Y2ggKGZpZWxkLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcImludDMyXCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJ1aW50MzJcIjpcclxuICAgICAgICAgICAgY2FzZSBcInNpbnQzMlwiOlxyXG4gICAgICAgICAgICBjYXNlIFwiZml4ZWQzMlwiOlxyXG4gICAgICAgICAgICBjYXNlIFwic2ZpeGVkMzJcIjogZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJpZighdXRpbC5pc0ludGVnZXIoJXMpKVwiLCByZWYpXHJcbiAgICAgICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJpbnRlZ2VyXCIpKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiaW50NjRcIjpcclxuICAgICAgICAgICAgY2FzZSBcInVpbnQ2NFwiOlxyXG4gICAgICAgICAgICBjYXNlIFwic2ludDY0XCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJmaXhlZDY0XCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJzZml4ZWQ2NFwiOiBnZW5cclxuICAgICAgICAgICAgICAgIChcImlmKCF1dGlsLmlzSW50ZWdlciglcykmJiEoJXMmJnV0aWwuaXNJbnRlZ2VyKCVzLmxvdykmJnV0aWwuaXNJbnRlZ2VyKCVzLmhpZ2gpKSlcIiwgcmVmLCByZWYsIHJlZiwgcmVmKVxyXG4gICAgICAgICAgICAgICAgICAgIChcInJldHVybiVqXCIsIGludmFsaWQoZmllbGQsIFwiaW50ZWdlcnxMb25nXCIpKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZmxvYXRcIjpcclxuICAgICAgICAgICAgY2FzZSBcImRvdWJsZVwiOiBnZW5cclxuICAgICAgICAgICAgICAgIChcImlmKHR5cGVvZiAlcyE9PVxcXCJudW1iZXJcXFwiKVwiLCByZWYpXHJcbiAgICAgICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJudW1iZXJcIikpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJib29sXCI6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwiaWYodHlwZW9mICVzIT09XFxcImJvb2xlYW5cXFwiKVwiLCByZWYpXHJcbiAgICAgICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJib29sZWFuXCIpKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwiaWYoIXV0aWwuaXNTdHJpbmcoJXMpKVwiLCByZWYpXHJcbiAgICAgICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJzdHJpbmdcIikpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJieXRlc1wiOiBnZW5cclxuICAgICAgICAgICAgICAgIChcImlmKCEoJXMmJnR5cGVvZiAlcy5sZW5ndGg9PT1cXFwibnVtYmVyXFxcInx8dXRpbC5pc1N0cmluZyglcykpKVwiLCByZWYsIHJlZiwgcmVmKVxyXG4gICAgICAgICAgICAgICAgICAgIChcInJldHVybiVqXCIsIGludmFsaWQoZmllbGQsIFwiYnVmZmVyXCIpKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBnZW47XHJcbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lICovXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYSBwYXJ0aWFsIGtleSB2ZXJpZmllci5cclxuICogQHBhcmFtIHtDb2RlZ2VufSBnZW4gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge0ZpZWxkfSBmaWVsZCBSZWZsZWN0ZWQgZmllbGRcclxuICogQHBhcmFtIHtzdHJpbmd9IHJlZiBWYXJpYWJsZSByZWZlcmVuY2VcclxuICogQHJldHVybnMge0NvZGVnZW59IENvZGVnZW4gaW5zdGFuY2VcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gZ2VuVmVyaWZ5S2V5KGdlbiwgZmllbGQsIHJlZikge1xyXG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUgKi9cclxuICAgIHN3aXRjaCAoZmllbGQua2V5VHlwZSkge1xyXG4gICAgICAgIGNhc2UgXCJpbnQzMlwiOlxyXG4gICAgICAgIGNhc2UgXCJ1aW50MzJcIjpcclxuICAgICAgICBjYXNlIFwic2ludDMyXCI6XHJcbiAgICAgICAgY2FzZSBcImZpeGVkMzJcIjpcclxuICAgICAgICBjYXNlIFwic2ZpeGVkMzJcIjogZ2VuXHJcbiAgICAgICAgICAgIChcImlmKCF1dGlsLmtleTMyUmUudGVzdCglcykpXCIsIHJlZilcclxuICAgICAgICAgICAgICAgIChcInJldHVybiVqXCIsIGludmFsaWQoZmllbGQsIFwiaW50ZWdlciBrZXlcIikpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiaW50NjRcIjpcclxuICAgICAgICBjYXNlIFwidWludDY0XCI6XHJcbiAgICAgICAgY2FzZSBcInNpbnQ2NFwiOlxyXG4gICAgICAgIGNhc2UgXCJmaXhlZDY0XCI6XHJcbiAgICAgICAgY2FzZSBcInNmaXhlZDY0XCI6IGdlblxyXG4gICAgICAgICAgICAoXCJpZighdXRpbC5rZXk2NFJlLnRlc3QoJXMpKVwiLCByZWYpIC8vIHNlZSBjb21tZW50IGFib3ZlOiB4IGlzIG9rLCBkIGlzIG5vdFxyXG4gICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJpbnRlZ2VyfExvbmcga2V5XCIpKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImJvb2xcIjogZ2VuXHJcbiAgICAgICAgICAgIChcImlmKCF1dGlsLmtleTJSZS50ZXN0KCVzKSlcIiwgcmVmKVxyXG4gICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJib29sZWFuIGtleVwiKSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGdlbjtcclxuICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUgKi9cclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIHZlcmlmaWVyIHNwZWNpZmljIHRvIHRoZSBzcGVjaWZpZWQgbWVzc2FnZSB0eXBlLlxyXG4gKiBAcGFyYW0ge1R5cGV9IG10eXBlIE1lc3NhZ2UgdHlwZVxyXG4gKiBAcmV0dXJucyB7Q29kZWdlbn0gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKi9cclxuZnVuY3Rpb24gdmVyaWZpZXIobXR5cGUpIHtcclxuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lICovXHJcblxyXG4gICAgdmFyIGdlbiA9IHV0aWwuY29kZWdlbihcIm1cIilcclxuICAgIChcImlmKHR5cGVvZiBtIT09XFxcIm9iamVjdFxcXCJ8fG09PT1udWxsKVwiKVxyXG4gICAgICAgIChcInJldHVybiVqXCIsIFwib2JqZWN0IGV4cGVjdGVkXCIpO1xyXG4gICAgdmFyIG9uZW9mcyA9IG10eXBlLm9uZW9mc0FycmF5LFxyXG4gICAgICAgIHNlZW5GaXJzdEZpZWxkID0ge307XHJcbiAgICBpZiAob25lb2ZzLmxlbmd0aCkgZ2VuXHJcbiAgICAoXCJ2YXIgcD17fVwiKTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IC8qIGluaXRpYWxpemVzICovIG10eXBlLmZpZWxkc0FycmF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgdmFyIGZpZWxkID0gbXR5cGUuX2ZpZWxkc0FycmF5W2ldLnJlc29sdmUoKSxcclxuICAgICAgICAgICAgcmVmICAgPSBcIm1cIiArIHV0aWwuc2FmZVByb3AoZmllbGQubmFtZSk7XHJcblxyXG4gICAgICAgIGlmIChmaWVsZC5vcHRpb25hbCkgZ2VuXHJcbiAgICAgICAgKFwiaWYoJXMhPW51bGwmJm0uaGFzT3duUHJvcGVydHkoJWopKXtcIiwgcmVmLCBmaWVsZC5uYW1lKTsgLy8gIT09IHVuZGVmaW5lZCAmJiAhPT0gbnVsbFxyXG5cclxuICAgICAgICAvLyBtYXAgZmllbGRzXHJcbiAgICAgICAgaWYgKGZpZWxkLm1hcCkgeyBnZW5cclxuICAgICAgICAgICAgKFwiaWYoIXV0aWwuaXNPYmplY3QoJXMpKVwiLCByZWYpXHJcbiAgICAgICAgICAgICAgICAoXCJyZXR1cm4lalwiLCBpbnZhbGlkKGZpZWxkLCBcIm9iamVjdFwiKSlcclxuICAgICAgICAgICAgKFwidmFyIGs9T2JqZWN0LmtleXMoJXMpXCIsIHJlZilcclxuICAgICAgICAgICAgKFwiZm9yKHZhciBpPTA7aTxrLmxlbmd0aDsrK2kpe1wiKTtcclxuICAgICAgICAgICAgICAgIGdlblZlcmlmeUtleShnZW4sIGZpZWxkLCBcImtbaV1cIik7XHJcbiAgICAgICAgICAgICAgICBnZW5WZXJpZnlWYWx1ZShnZW4sIGZpZWxkLCBpLCByZWYgKyBcIltrW2ldXVwiKVxyXG4gICAgICAgICAgICAoXCJ9XCIpO1xyXG5cclxuICAgICAgICAvLyByZXBlYXRlZCBmaWVsZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGZpZWxkLnJlcGVhdGVkKSB7IGdlblxyXG4gICAgICAgICAgICAoXCJpZighQXJyYXkuaXNBcnJheSglcykpXCIsIHJlZilcclxuICAgICAgICAgICAgICAgIChcInJldHVybiVqXCIsIGludmFsaWQoZmllbGQsIFwiYXJyYXlcIikpXHJcbiAgICAgICAgICAgIChcImZvcih2YXIgaT0wO2k8JXMubGVuZ3RoOysraSl7XCIsIHJlZik7XHJcbiAgICAgICAgICAgICAgICBnZW5WZXJpZnlWYWx1ZShnZW4sIGZpZWxkLCBpLCByZWYgKyBcIltpXVwiKVxyXG4gICAgICAgICAgICAoXCJ9XCIpO1xyXG5cclxuICAgICAgICAvLyByZXF1aXJlZCBvciBwcmVzZW50IGZpZWxkc1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChmaWVsZC5wYXJ0T2YpIHtcclxuICAgICAgICAgICAgICAgIHZhciBvbmVvZlByb3AgPSB1dGlsLnNhZmVQcm9wKGZpZWxkLnBhcnRPZi5uYW1lKTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWVuRmlyc3RGaWVsZFtmaWVsZC5wYXJ0T2YubmFtZV0gPT09IDEpIGdlblxyXG4gICAgICAgICAgICAoXCJpZihwJXM9PT0xKVwiLCBvbmVvZlByb3ApXHJcbiAgICAgICAgICAgICAgICAoXCJyZXR1cm4lalwiLCBmaWVsZC5wYXJ0T2YubmFtZSArIFwiOiBtdWx0aXBsZSB2YWx1ZXNcIik7XHJcbiAgICAgICAgICAgICAgICBzZWVuRmlyc3RGaWVsZFtmaWVsZC5wYXJ0T2YubmFtZV0gPSAxO1xyXG4gICAgICAgICAgICAgICAgZ2VuXHJcbiAgICAgICAgICAgIChcInAlcz0xXCIsIG9uZW9mUHJvcCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZ2VuVmVyaWZ5VmFsdWUoZ2VuLCBmaWVsZCwgaSwgcmVmKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGZpZWxkLm9wdGlvbmFsKSBnZW5cclxuICAgICAgICAoXCJ9XCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGdlblxyXG4gICAgKFwicmV0dXJuIG51bGxcIik7XHJcbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lICovXHJcbn0iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBXcml0ZXI7XHJcblxyXG52YXIgdXRpbCAgICAgID0gcmVxdWlyZShcIi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxudmFyIEJ1ZmZlcldyaXRlcjsgLy8gY3ljbGljXHJcblxyXG52YXIgTG9uZ0JpdHMgID0gdXRpbC5Mb25nQml0cyxcclxuICAgIGJhc2U2NCAgICA9IHV0aWwuYmFzZTY0LFxyXG4gICAgdXRmOCAgICAgID0gdXRpbC51dGY4O1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgd3JpdGVyIG9wZXJhdGlvbiBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBTY2hlZHVsZWQgd3JpdGVyIG9wZXJhdGlvbi5cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oKiwgVWludDhBcnJheSwgbnVtYmVyKX0gZm4gRnVuY3Rpb24gdG8gY2FsbFxyXG4gKiBAcGFyYW0ge251bWJlcn0gbGVuIFZhbHVlIGJ5dGUgbGVuZ3RoXHJcbiAqIEBwYXJhbSB7Kn0gdmFsIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIE9wKGZuLCBsZW4sIHZhbCkge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRnVuY3Rpb24gdG8gY2FsbC5cclxuICAgICAqIEB0eXBlIHtmdW5jdGlvbihVaW50OEFycmF5LCBudW1iZXIsICopfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmZuID0gZm47XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBWYWx1ZSBieXRlIGxlbmd0aC5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubGVuID0gbGVuO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTmV4dCBvcGVyYXRpb24uXHJcbiAgICAgKiBAdHlwZSB7V3JpdGVyLk9wfHVuZGVmaW5lZH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5uZXh0ID0gdW5kZWZpbmVkO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVmFsdWUgdG8gd3JpdGUuXHJcbiAgICAgKiBAdHlwZSB7Kn1cclxuICAgICAqL1xyXG4gICAgdGhpcy52YWwgPSB2YWw7IC8vIHR5cGUgdmFyaWVzXHJcbn1cclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmZ1bmN0aW9uIG5vb3AoKSB7fSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5LWZ1bmN0aW9uXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyB3cml0ZXIgc3RhdGUgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgQ29waWVkIHdyaXRlciBzdGF0ZS5cclxuICogQG1lbWJlcm9mIFdyaXRlclxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtXcml0ZXJ9IHdyaXRlciBXcml0ZXIgdG8gY29weSBzdGF0ZSBmcm9tXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIFN0YXRlKHdyaXRlcikge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3VycmVudCBoZWFkLlxyXG4gICAgICogQHR5cGUge1dyaXRlci5PcH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5oZWFkID0gd3JpdGVyLmhlYWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDdXJyZW50IHRhaWwuXHJcbiAgICAgKiBAdHlwZSB7V3JpdGVyLk9wfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhaWwgPSB3cml0ZXIudGFpbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEN1cnJlbnQgYnVmZmVyIGxlbmd0aC5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubGVuID0gd3JpdGVyLmxlbjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE5leHQgc3RhdGUuXHJcbiAgICAgKiBAdHlwZSB7P1N0YXRlfVxyXG4gICAgICovXHJcbiAgICB0aGlzLm5leHQgPSB3cml0ZXIuc3RhdGVzO1xyXG59XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyB3cml0ZXIgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgV2lyZSBmb3JtYXQgd3JpdGVyIHVzaW5nIGBVaW50OEFycmF5YCBpZiBhdmFpbGFibGUsIG90aGVyd2lzZSBgQXJyYXlgLlxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIFdyaXRlcigpIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEN1cnJlbnQgbGVuZ3RoLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5sZW4gPSAwO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogT3BlcmF0aW9ucyBoZWFkLlxyXG4gICAgICogQHR5cGUge09iamVjdH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5oZWFkID0gbmV3IE9wKG5vb3AsIDAsIDApO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogT3BlcmF0aW9ucyB0YWlsXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhaWwgPSB0aGlzLmhlYWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBMaW5rZWQgZm9ya2VkIHN0YXRlcy5cclxuICAgICAqIEB0eXBlIHs/T2JqZWN0fVxyXG4gICAgICovXHJcbiAgICB0aGlzLnN0YXRlcyA9IG51bGw7XHJcblxyXG4gICAgLy8gV2hlbiBhIHZhbHVlIGlzIHdyaXR0ZW4sIHRoZSB3cml0ZXIgY2FsY3VsYXRlcyBpdHMgYnl0ZSBsZW5ndGggYW5kIHB1dHMgaXQgaW50byBhIGxpbmtlZFxyXG4gICAgLy8gbGlzdCBvZiBvcGVyYXRpb25zIHRvIHBlcmZvcm0gd2hlbiBmaW5pc2goKSBpcyBjYWxsZWQuIFRoaXMgYm90aCBhbGxvd3MgdXMgdG8gYWxsb2NhdGVcclxuICAgIC8vIGJ1ZmZlcnMgb2YgdGhlIGV4YWN0IHJlcXVpcmVkIHNpemUgYW5kIHJlZHVjZXMgdGhlIGFtb3VudCBvZiB3b3JrIHdlIGhhdmUgdG8gZG8gY29tcGFyZWRcclxuICAgIC8vIHRvIGZpcnN0IGNhbGN1bGF0aW5nIG92ZXIgb2JqZWN0cyBhbmQgdGhlbiBlbmNvZGluZyBvdmVyIG9iamVjdHMuIEluIG91ciBjYXNlLCB0aGUgZW5jb2RpbmdcclxuICAgIC8vIHBhcnQgaXMganVzdCBhIGxpbmtlZCBsaXN0IHdhbGsgY2FsbGluZyBvcGVyYXRpb25zIHdpdGggYWxyZWFkeSBwcmVwYXJlZCB2YWx1ZXMuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IHdyaXRlci5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtCdWZmZXJXcml0ZXJ8V3JpdGVyfSBBIHtAbGluayBCdWZmZXJXcml0ZXJ9IHdoZW4gQnVmZmVycyBhcmUgc3VwcG9ydGVkLCBvdGhlcndpc2UgYSB7QGxpbmsgV3JpdGVyfVxyXG4gKi9cclxuV3JpdGVyLmNyZWF0ZSA9IHV0aWwuQnVmZmVyXHJcbiAgICA/IGZ1bmN0aW9uIGNyZWF0ZV9idWZmZXJfc2V0dXAoKSB7XHJcbiAgICAgICAgcmV0dXJuIChXcml0ZXIuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlX2J1ZmZlcigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmZXJXcml0ZXIoKTtcclxuICAgICAgICB9KSgpO1xyXG4gICAgfVxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIDogZnVuY3Rpb24gY3JlYXRlX2FycmF5KCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgV3JpdGVyKCk7XHJcbiAgICB9O1xyXG5cclxuLyoqXHJcbiAqIEFsbG9jYXRlcyBhIGJ1ZmZlciBvZiB0aGUgc3BlY2lmaWVkIHNpemUuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIEJ1ZmZlciBzaXplXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fSBCdWZmZXJcclxuICovXHJcbldyaXRlci5hbGxvYyA9IGZ1bmN0aW9uIGFsbG9jKHNpemUpIHtcclxuICAgIHJldHVybiBuZXcgdXRpbC5BcnJheShzaXplKTtcclxufTtcclxuXHJcbi8vIFVzZSBVaW50OEFycmF5IGJ1ZmZlciBwb29sIGluIHRoZSBicm93c2VyLCBqdXN0IGxpa2Ugbm9kZSBkb2VzIHdpdGggYnVmZmVyc1xyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG5pZiAodXRpbC5BcnJheSAhPT0gQXJyYXkpXHJcbiAgICBXcml0ZXIuYWxsb2MgPSB1dGlsLnBvb2woV3JpdGVyLmFsbG9jLCB1dGlsLkFycmF5LnByb3RvdHlwZS5zdWJhcnJheSk7XHJcblxyXG4vKipcclxuICogUHVzaGVzIGEgbmV3IG9wZXJhdGlvbiB0byB0aGUgcXVldWUuXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oVWludDhBcnJheSwgbnVtYmVyLCAqKX0gZm4gRnVuY3Rpb24gdG8gY2FsbFxyXG4gKiBAcGFyYW0ge251bWJlcn0gbGVuIFZhbHVlIGJ5dGUgbGVuZ3RoXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiBwdXNoKGZuLCBsZW4sIHZhbCkge1xyXG4gICAgdGhpcy50YWlsID0gdGhpcy50YWlsLm5leHQgPSBuZXcgT3AoZm4sIGxlbiwgdmFsKTtcclxuICAgIHRoaXMubGVuICs9IGxlbjtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gd3JpdGVCeXRlKHZhbCwgYnVmLCBwb3MpIHtcclxuICAgIGJ1Zltwb3NdID0gdmFsICYgMjU1O1xyXG59XHJcblxyXG5mdW5jdGlvbiB3cml0ZVZhcmludDMyKHZhbCwgYnVmLCBwb3MpIHtcclxuICAgIHdoaWxlICh2YWwgPiAxMjcpIHtcclxuICAgICAgICBidWZbcG9zKytdID0gdmFsICYgMTI3IHwgMTI4O1xyXG4gICAgICAgIHZhbCA+Pj49IDc7XHJcbiAgICB9XHJcbiAgICBidWZbcG9zXSA9IHZhbDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgdmFyaW50IHdyaXRlciBvcGVyYXRpb24gaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgU2NoZWR1bGVkIHZhcmludCB3cml0ZXIgb3BlcmF0aW9uLlxyXG4gKiBAZXh0ZW5kcyBPcFxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtudW1iZXJ9IGxlbiBWYWx1ZSBieXRlIGxlbmd0aFxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIFZhcmludE9wKGxlbiwgdmFsKSB7XHJcbiAgICB0aGlzLmxlbiA9IGxlbjtcclxuICAgIHRoaXMubmV4dCA9IHVuZGVmaW5lZDtcclxuICAgIHRoaXMudmFsID0gdmFsO1xyXG59XHJcblxyXG5WYXJpbnRPcC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9wLnByb3RvdHlwZSk7XHJcblZhcmludE9wLnByb3RvdHlwZS5mbiA9IHdyaXRlVmFyaW50MzI7XHJcblxyXG4vKipcclxuICogV3JpdGVzIGFuIHVuc2lnbmVkIDMyIGJpdCB2YWx1ZSBhcyBhIHZhcmludC5cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS51aW50MzIgPSBmdW5jdGlvbiB3cml0ZV91aW50MzIodmFsdWUpIHtcclxuICAgIC8vIGhlcmUsIHRoZSBjYWxsIHRvIHRoaXMucHVzaCBoYXMgYmVlbiBpbmxpbmVkIGFuZCBhIHZhcmludCBzcGVjaWZpYyBPcCBzdWJjbGFzcyBpcyB1c2VkLlxyXG4gICAgLy8gdWludDMyIGlzIGJ5IGZhciB0aGUgbW9zdCBmcmVxdWVudGx5IHVzZWQgb3BlcmF0aW9uIGFuZCBiZW5lZml0cyBzaWduaWZpY2FudGx5IGZyb20gdGhpcy5cclxuICAgIHRoaXMubGVuICs9ICh0aGlzLnRhaWwgPSB0aGlzLnRhaWwubmV4dCA9IG5ldyBWYXJpbnRPcChcclxuICAgICAgICAodmFsdWUgPSB2YWx1ZSA+Pj4gMClcclxuICAgICAgICAgICAgICAgIDwgMTI4ICAgICAgID8gMVxyXG4gICAgICAgIDogdmFsdWUgPCAxNjM4NCAgICAgPyAyXHJcbiAgICAgICAgOiB2YWx1ZSA8IDIwOTcxNTIgICA/IDNcclxuICAgICAgICA6IHZhbHVlIDwgMjY4NDM1NDU2ID8gNFxyXG4gICAgICAgIDogICAgICAgICAgICAgICAgICAgICA1LFxyXG4gICAgdmFsdWUpKS5sZW47XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzaWduZWQgMzIgYml0IHZhbHVlIGFzIGEgdmFyaW50LlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5pbnQzMiA9IGZ1bmN0aW9uIHdyaXRlX2ludDMyKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdmFsdWUgPCAwXHJcbiAgICAgICAgPyB0aGlzLnB1c2god3JpdGVWYXJpbnQ2NCwgMTAsIExvbmdCaXRzLmZyb21OdW1iZXIodmFsdWUpKSAvLyAxMCBieXRlcyBwZXIgc3BlY1xyXG4gICAgICAgIDogdGhpcy51aW50MzIodmFsdWUpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIDMyIGJpdCB2YWx1ZSBhcyBhIHZhcmludCwgemlnLXphZyBlbmNvZGVkLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnNpbnQzMiA9IGZ1bmN0aW9uIHdyaXRlX3NpbnQzMih2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHRoaXMudWludDMyKCh2YWx1ZSA8PCAxIF4gdmFsdWUgPj4gMzEpID4+PiAwKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIHdyaXRlVmFyaW50NjQodmFsLCBidWYsIHBvcykge1xyXG4gICAgd2hpbGUgKHZhbC5oaSkge1xyXG4gICAgICAgIGJ1Zltwb3MrK10gPSB2YWwubG8gJiAxMjcgfCAxMjg7XHJcbiAgICAgICAgdmFsLmxvID0gKHZhbC5sbyA+Pj4gNyB8IHZhbC5oaSA8PCAyNSkgPj4+IDA7XHJcbiAgICAgICAgdmFsLmhpID4+Pj0gNztcclxuICAgIH1cclxuICAgIHdoaWxlICh2YWwubG8gPiAxMjcpIHtcclxuICAgICAgICBidWZbcG9zKytdID0gdmFsLmxvICYgMTI3IHwgMTI4O1xyXG4gICAgICAgIHZhbC5sbyA9IHZhbC5sbyA+Pj4gNztcclxuICAgIH1cclxuICAgIGJ1Zltwb3MrK10gPSB2YWwubG87XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYW4gdW5zaWduZWQgNjQgYml0IHZhbHVlIGFzIGEgdmFyaW50LlxyXG4gKiBAcGFyYW0ge0xvbmd8bnVtYmVyfHN0cmluZ30gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYHZhbHVlYCBpcyBhIHN0cmluZyBhbmQgbm8gbG9uZyBsaWJyYXJ5IGlzIHByZXNlbnQuXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnVpbnQ2NCA9IGZ1bmN0aW9uIHdyaXRlX3VpbnQ2NCh2YWx1ZSkge1xyXG4gICAgdmFyIGJpdHMgPSBMb25nQml0cy5mcm9tKHZhbHVlKTtcclxuICAgIHJldHVybiB0aGlzLnB1c2god3JpdGVWYXJpbnQ2NCwgYml0cy5sZW5ndGgoKSwgYml0cyk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgc2lnbmVkIDY0IGJpdCB2YWx1ZSBhcyBhIHZhcmludC5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBgdmFsdWVgIGlzIGEgc3RyaW5nIGFuZCBubyBsb25nIGxpYnJhcnkgaXMgcHJlc2VudC5cclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuaW50NjQgPSBXcml0ZXIucHJvdG90eXBlLnVpbnQ2NDtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzaWduZWQgNjQgYml0IHZhbHVlIGFzIGEgdmFyaW50LCB6aWctemFnIGVuY29kZWQuXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBgdmFsdWVgIGlzIGEgc3RyaW5nIGFuZCBubyBsb25nIGxpYnJhcnkgaXMgcHJlc2VudC5cclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuc2ludDY0ID0gZnVuY3Rpb24gd3JpdGVfc2ludDY0KHZhbHVlKSB7XHJcbiAgICB2YXIgYml0cyA9IExvbmdCaXRzLmZyb20odmFsdWUpLnp6RW5jb2RlKCk7XHJcbiAgICByZXR1cm4gdGhpcy5wdXNoKHdyaXRlVmFyaW50NjQsIGJpdHMubGVuZ3RoKCksIGJpdHMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIGJvb2xpc2ggdmFsdWUgYXMgYSB2YXJpbnQuXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmJvb2wgPSBmdW5jdGlvbiB3cml0ZV9ib29sKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdGhpcy5wdXNoKHdyaXRlQnl0ZSwgMSwgdmFsdWUgPyAxIDogMCk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiB3cml0ZUZpeGVkMzIodmFsLCBidWYsIHBvcykge1xyXG4gICAgYnVmW3BvcyAgICBdID0gIHZhbCAgICAgICAgICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDFdID0gIHZhbCA+Pj4gOCAgICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDJdID0gIHZhbCA+Pj4gMTYgICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDNdID0gIHZhbCA+Pj4gMjQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYW4gdW5zaWduZWQgMzIgYml0IHZhbHVlIGFzIGZpeGVkIDMyIGJpdHMuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZml4ZWQzMiA9IGZ1bmN0aW9uIHdyaXRlX2ZpeGVkMzIodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLnB1c2god3JpdGVGaXhlZDMyLCA0LCB2YWx1ZSA+Pj4gMCk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgc2lnbmVkIDMyIGJpdCB2YWx1ZSBhcyBmaXhlZCAzMiBiaXRzLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5zZml4ZWQzMiA9IFdyaXRlci5wcm90b3R5cGUuZml4ZWQzMjtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYW4gdW5zaWduZWQgNjQgYml0IHZhbHVlIGFzIGZpeGVkIDY0IGJpdHMuXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBgdmFsdWVgIGlzIGEgc3RyaW5nIGFuZCBubyBsb25nIGxpYnJhcnkgaXMgcHJlc2VudC5cclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZml4ZWQ2NCA9IGZ1bmN0aW9uIHdyaXRlX2ZpeGVkNjQodmFsdWUpIHtcclxuICAgIHZhciBiaXRzID0gTG9uZ0JpdHMuZnJvbSh2YWx1ZSk7XHJcbiAgICByZXR1cm4gdGhpcy5wdXNoKHdyaXRlRml4ZWQzMiwgNCwgYml0cy5sbykucHVzaCh3cml0ZUZpeGVkMzIsIDQsIGJpdHMuaGkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIHNpZ25lZCA2NCBiaXQgdmFsdWUgYXMgZml4ZWQgNjQgYml0cy5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBgdmFsdWVgIGlzIGEgc3RyaW5nIGFuZCBubyBsb25nIGxpYnJhcnkgaXMgcHJlc2VudC5cclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuc2ZpeGVkNjQgPSBXcml0ZXIucHJvdG90eXBlLmZpeGVkNjQ7XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgZmxvYXQgKDMyIGJpdCkuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmZsb2F0ID0gZnVuY3Rpb24gd3JpdGVfZmxvYXQodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLnB1c2godXRpbC5mbG9hdC53cml0ZUZsb2F0TEUsIDQsIHZhbHVlKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBkb3VibGUgKDY0IGJpdCBmbG9hdCkuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmRvdWJsZSA9IGZ1bmN0aW9uIHdyaXRlX2RvdWJsZSh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHRoaXMucHVzaCh1dGlsLmZsb2F0LndyaXRlRG91YmxlTEUsIDgsIHZhbHVlKTtcclxufTtcclxuXHJcbnZhciB3cml0ZUJ5dGVzID0gdXRpbC5BcnJheS5wcm90b3R5cGUuc2V0XHJcbiAgICA/IGZ1bmN0aW9uIHdyaXRlQnl0ZXNfc2V0KHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICBidWYuc2V0KHZhbCwgcG9zKTsgLy8gYWxzbyB3b3JrcyBmb3IgcGxhaW4gYXJyYXkgdmFsdWVzXHJcbiAgICB9XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgOiBmdW5jdGlvbiB3cml0ZUJ5dGVzX2Zvcih2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWwubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyBpXSA9IHZhbFtpXTtcclxuICAgIH07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgc2VxdWVuY2Ugb2YgYnl0ZXMuXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheXxzdHJpbmd9IHZhbHVlIEJ1ZmZlciBvciBiYXNlNjQgZW5jb2RlZCBzdHJpbmcgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmJ5dGVzID0gZnVuY3Rpb24gd3JpdGVfYnl0ZXModmFsdWUpIHtcclxuICAgIHZhciBsZW4gPSB2YWx1ZS5sZW5ndGggPj4+IDA7XHJcbiAgICBpZiAoIWxlbilcclxuICAgICAgICByZXR1cm4gdGhpcy5wdXNoKHdyaXRlQnl0ZSwgMSwgMCk7XHJcbiAgICBpZiAodXRpbC5pc1N0cmluZyh2YWx1ZSkpIHtcclxuICAgICAgICB2YXIgYnVmID0gV3JpdGVyLmFsbG9jKGxlbiA9IGJhc2U2NC5sZW5ndGgodmFsdWUpKTtcclxuICAgICAgICBiYXNlNjQuZGVjb2RlKHZhbHVlLCBidWYsIDApO1xyXG4gICAgICAgIHZhbHVlID0gYnVmO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXMudWludDMyKGxlbikucHVzaCh3cml0ZUJ5dGVzLCBsZW4sIHZhbHVlKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuc3RyaW5nID0gZnVuY3Rpb24gd3JpdGVfc3RyaW5nKHZhbHVlKSB7XHJcbiAgICB2YXIgbGVuID0gdXRmOC5sZW5ndGgodmFsdWUpO1xyXG4gICAgcmV0dXJuIGxlblxyXG4gICAgICAgID8gdGhpcy51aW50MzIobGVuKS5wdXNoKHV0Zjgud3JpdGUsIGxlbiwgdmFsdWUpXHJcbiAgICAgICAgOiB0aGlzLnB1c2god3JpdGVCeXRlLCAxLCAwKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBGb3JrcyB0aGlzIHdyaXRlcidzIHN0YXRlIGJ5IHB1c2hpbmcgaXQgdG8gYSBzdGFjay5cclxuICogQ2FsbGluZyB7QGxpbmsgV3JpdGVyI3Jlc2V0fHJlc2V0fSBvciB7QGxpbmsgV3JpdGVyI2xkZWxpbXxsZGVsaW19IHJlc2V0cyB0aGUgd3JpdGVyIHRvIHRoZSBwcmV2aW91cyBzdGF0ZS5cclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmZvcmsgPSBmdW5jdGlvbiBmb3JrKCkge1xyXG4gICAgdGhpcy5zdGF0ZXMgPSBuZXcgU3RhdGUodGhpcyk7XHJcbiAgICB0aGlzLmhlYWQgPSB0aGlzLnRhaWwgPSBuZXcgT3Aobm9vcCwgMCwgMCk7XHJcbiAgICB0aGlzLmxlbiA9IDA7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNldHMgdGhpcyBpbnN0YW5jZSB0byB0aGUgbGFzdCBzdGF0ZS5cclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gcmVzZXQoKSB7XHJcbiAgICBpZiAodGhpcy5zdGF0ZXMpIHtcclxuICAgICAgICB0aGlzLmhlYWQgICA9IHRoaXMuc3RhdGVzLmhlYWQ7XHJcbiAgICAgICAgdGhpcy50YWlsICAgPSB0aGlzLnN0YXRlcy50YWlsO1xyXG4gICAgICAgIHRoaXMubGVuICAgID0gdGhpcy5zdGF0ZXMubGVuO1xyXG4gICAgICAgIHRoaXMuc3RhdGVzID0gdGhpcy5zdGF0ZXMubmV4dDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5oZWFkID0gdGhpcy50YWlsID0gbmV3IE9wKG5vb3AsIDAsIDApO1xyXG4gICAgICAgIHRoaXMubGVuICA9IDA7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNldHMgdG8gdGhlIGxhc3Qgc3RhdGUgYW5kIGFwcGVuZHMgdGhlIGZvcmsgc3RhdGUncyBjdXJyZW50IHdyaXRlIGxlbmd0aCBhcyBhIHZhcmludCBmb2xsb3dlZCBieSBpdHMgb3BlcmF0aW9ucy5cclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmxkZWxpbSA9IGZ1bmN0aW9uIGxkZWxpbSgpIHtcclxuICAgIHZhciBoZWFkID0gdGhpcy5oZWFkLFxyXG4gICAgICAgIHRhaWwgPSB0aGlzLnRhaWwsXHJcbiAgICAgICAgbGVuICA9IHRoaXMubGVuO1xyXG4gICAgdGhpcy5yZXNldCgpLnVpbnQzMihsZW4pO1xyXG4gICAgaWYgKGxlbikge1xyXG4gICAgICAgIHRoaXMudGFpbC5uZXh0ID0gaGVhZC5uZXh0OyAvLyBza2lwIG5vb3BcclxuICAgICAgICB0aGlzLnRhaWwgPSB0YWlsO1xyXG4gICAgICAgIHRoaXMubGVuICs9IGxlbjtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEZpbmlzaGVzIHRoZSB3cml0ZSBvcGVyYXRpb24uXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fSBGaW5pc2hlZCBidWZmZXJcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZmluaXNoID0gZnVuY3Rpb24gZmluaXNoKCkge1xyXG4gICAgdmFyIGhlYWQgPSB0aGlzLmhlYWQubmV4dCwgLy8gc2tpcCBub29wXHJcbiAgICAgICAgYnVmICA9IHRoaXMuY29uc3RydWN0b3IuYWxsb2ModGhpcy5sZW4pLFxyXG4gICAgICAgIHBvcyAgPSAwO1xyXG4gICAgd2hpbGUgKGhlYWQpIHtcclxuICAgICAgICBoZWFkLmZuKGhlYWQudmFsLCBidWYsIHBvcyk7XHJcbiAgICAgICAgcG9zICs9IGhlYWQubGVuO1xyXG4gICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XHJcbiAgICB9XHJcbiAgICAvLyB0aGlzLmhlYWQgPSB0aGlzLnRhaWwgPSBudWxsO1xyXG4gICAgcmV0dXJuIGJ1ZjtcclxufTtcclxuXHJcbldyaXRlci5fY29uZmlndXJlID0gZnVuY3Rpb24oQnVmZmVyV3JpdGVyXykge1xyXG4gICAgQnVmZmVyV3JpdGVyID0gQnVmZmVyV3JpdGVyXztcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyV3JpdGVyO1xyXG5cclxuLy8gZXh0ZW5kcyBXcml0ZXJcclxudmFyIFdyaXRlciA9IHJlcXVpcmUoXCIuL3dyaXRlclwiKTtcclxuKEJ1ZmZlcldyaXRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFdyaXRlci5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IEJ1ZmZlcldyaXRlcjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxudmFyIEJ1ZmZlciA9IHV0aWwuQnVmZmVyO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgYnVmZmVyIHdyaXRlciBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBXaXJlIGZvcm1hdCB3cml0ZXIgdXNpbmcgbm9kZSBidWZmZXJzLlxyXG4gKiBAZXh0ZW5kcyBXcml0ZXJcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBCdWZmZXJXcml0ZXIoKSB7XHJcbiAgICBXcml0ZXIuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFsbG9jYXRlcyBhIGJ1ZmZlciBvZiB0aGUgc3BlY2lmaWVkIHNpemUuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIEJ1ZmZlciBzaXplXHJcbiAqIEByZXR1cm5zIHtCdWZmZXJ9IEJ1ZmZlclxyXG4gKi9cclxuQnVmZmVyV3JpdGVyLmFsbG9jID0gZnVuY3Rpb24gYWxsb2NfYnVmZmVyKHNpemUpIHtcclxuICAgIHJldHVybiAoQnVmZmVyV3JpdGVyLmFsbG9jID0gdXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlKShzaXplKTtcclxufTtcclxuXHJcbnZhciB3cml0ZUJ5dGVzQnVmZmVyID0gQnVmZmVyICYmIEJ1ZmZlci5wcm90b3R5cGUgaW5zdGFuY2VvZiBVaW50OEFycmF5ICYmIEJ1ZmZlci5wcm90b3R5cGUuc2V0Lm5hbWUgPT09IFwic2V0XCJcclxuICAgID8gZnVuY3Rpb24gd3JpdGVCeXRlc0J1ZmZlcl9zZXQodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgIGJ1Zi5zZXQodmFsLCBwb3MpOyAvLyBmYXN0ZXIgdGhhbiBjb3B5IChyZXF1aXJlcyBub2RlID49IDQgd2hlcmUgQnVmZmVycyBleHRlbmQgVWludDhBcnJheSBhbmQgc2V0IGlzIHByb3Blcmx5IGluaGVyaXRlZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWxzbyB3b3JrcyBmb3IgcGxhaW4gYXJyYXkgdmFsdWVzXHJcbiAgICB9XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgOiBmdW5jdGlvbiB3cml0ZUJ5dGVzQnVmZmVyX2NvcHkodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgIGlmICh2YWwuY29weSkgLy8gQnVmZmVyIHZhbHVlc1xyXG4gICAgICAgICAgICB2YWwuY29weShidWYsIHBvcywgMCwgdmFsLmxlbmd0aCk7XHJcbiAgICAgICAgZWxzZSBmb3IgKHZhciBpID0gMDsgaSA8IHZhbC5sZW5ndGg7KSAvLyBwbGFpbiBhcnJheSB2YWx1ZXNcclxuICAgICAgICAgICAgYnVmW3BvcysrXSA9IHZhbFtpKytdO1xyXG4gICAgfTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcbkJ1ZmZlcldyaXRlci5wcm90b3R5cGUuYnl0ZXMgPSBmdW5jdGlvbiB3cml0ZV9ieXRlc19idWZmZXIodmFsdWUpIHtcclxuICAgIGlmICh1dGlsLmlzU3RyaW5nKHZhbHVlKSlcclxuICAgICAgICB2YWx1ZSA9IHV0aWwuX0J1ZmZlcl9mcm9tKHZhbHVlLCBcImJhc2U2NFwiKTtcclxuICAgIHZhciBsZW4gPSB2YWx1ZS5sZW5ndGggPj4+IDA7XHJcbiAgICB0aGlzLnVpbnQzMihsZW4pO1xyXG4gICAgaWYgKGxlbilcclxuICAgICAgICB0aGlzLnB1c2god3JpdGVCeXRlc0J1ZmZlciwgbGVuLCB2YWx1ZSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbmZ1bmN0aW9uIHdyaXRlU3RyaW5nQnVmZmVyKHZhbCwgYnVmLCBwb3MpIHtcclxuICAgIGlmICh2YWwubGVuZ3RoIDwgNDApIC8vIHBsYWluIGpzIGlzIGZhc3RlciBmb3Igc2hvcnQgc3RyaW5ncyAocHJvYmFibHkgZHVlIHRvIHJlZHVuZGFudCBhc3NlcnRpb25zKVxyXG4gICAgICAgIHV0aWwudXRmOC53cml0ZSh2YWwsIGJ1ZiwgcG9zKTtcclxuICAgIGVsc2VcclxuICAgICAgICBidWYudXRmOFdyaXRlKHZhbCwgcG9zKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuQnVmZmVyV3JpdGVyLnByb3RvdHlwZS5zdHJpbmcgPSBmdW5jdGlvbiB3cml0ZV9zdHJpbmdfYnVmZmVyKHZhbHVlKSB7XHJcbiAgICB2YXIgbGVuID0gQnVmZmVyLmJ5dGVMZW5ndGgodmFsdWUpO1xyXG4gICAgdGhpcy51aW50MzIobGVuKTtcclxuICAgIGlmIChsZW4pXHJcbiAgICAgICAgdGhpcy5wdXNoKHdyaXRlU3RyaW5nQnVmZmVyLCBsZW4sIHZhbHVlKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBGaW5pc2hlcyB0aGUgd3JpdGUgb3BlcmF0aW9uLlxyXG4gKiBAbmFtZSBCdWZmZXJXcml0ZXIjZmluaXNoXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7QnVmZmVyfSBGaW5pc2hlZCBidWZmZXJcclxuICovXHJcbiIsIi8qZXNsaW50LWRpc2FibGUgYmxvY2stc2NvcGVkLXZhciwgbm8tcmVkZWNsYXJlLCBuby1jb250cm9sLXJlZ2V4LCBuby1wcm90b3R5cGUtYnVpbHRpbnMqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciAkcHJvdG9idWYgPSByZXF1aXJlKFwicHJvdG9idWZqcy9taW5pbWFsXCIpO1xuXG4vLyBDb21tb24gYWxpYXNlc1xudmFyICRSZWFkZXIgPSAkcHJvdG9idWYuUmVhZGVyLCAkV3JpdGVyID0gJHByb3RvYnVmLldyaXRlciwgJHV0aWwgPSAkcHJvdG9idWYudXRpbDtcblxuLy8gRXhwb3J0ZWQgcm9vdCBuYW1lc3BhY2VcbnZhciAkcm9vdCA9ICRwcm90b2J1Zi5yb290c1tcImRlZmF1bHRcIl0gfHwgKCRwcm90b2J1Zi5yb290c1tcImRlZmF1bHRcIl0gPSB7fSk7XG5cbiRyb290Lm1haW4gPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBOYW1lc3BhY2UgbWFpbi5cbiAgICAgKiBAZXhwb3J0cyBtYWluXG4gICAgICogQG5hbWVzcGFjZVxuICAgICAqL1xuICAgIHZhciBtYWluID0ge307XG5cbiAgICBtYWluLlByb3RvY29sTWVzc2FnZSA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFByb3RvY29sTWVzc2FnZS5cbiAgICAgICAgICogQHR5cGVkZWYgbWFpbi5Qcm90b2NvbE1lc3NhZ2UkUHJvcGVydGllc1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKiBAcHJvcGVydHkge21haW4uUHJvdG9jb2xNZXNzYWdlLk1lc3NhZ2VUeXBlfSBbVHlwZV0gUHJvdG9jb2xNZXNzYWdlIFR5cGUuXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbU2VuZGVyXSBQcm90b2NvbE1lc3NhZ2UgU2VuZGVyLlxuICAgICAgICAgKiBAcHJvcGVydHkge21haW4uUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSRQcm9wZXJ0aWVzfSBbSGVsbG9dIFByb3RvY29sTWVzc2FnZSBIZWxsby5cbiAgICAgICAgICogQHByb3BlcnR5IHttYWluLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzfSBbQ29ubmVjdF0gUHJvdG9jb2xNZXNzYWdlIENvbm5lY3QuXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2UkUHJvcGVydGllc30gW0Rpc2Nvbm5lY3RdIFByb3RvY29sTWVzc2FnZSBEaXNjb25uZWN0LlxuICAgICAgICAgKiBAcHJvcGVydHkge21haW4uUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlJFByb3BlcnRpZXN9IFtQaW5nXSBQcm90b2NvbE1lc3NhZ2UgUGluZy5cbiAgICAgICAgICogQHByb3BlcnR5IHttYWluLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZSRQcm9wZXJ0aWVzfSBbUG9uZ10gUHJvdG9jb2xNZXNzYWdlIFBvbmcuXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG1haW4uUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzPn0gW1NwYXduXSBQcm90b2NvbE1lc3NhZ2UgU3Bhd24uXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG1haW4uUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlJFByb3BlcnRpZXM+fSBbVW5zcGF3bl0gUHJvdG9jb2xNZXNzYWdlIFVuc3Bhd24uXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG1haW4uUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzPn0gW1Bvc2l0aW9uXSBQcm90b2NvbE1lc3NhZ2UgUG9zaXRpb24uXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG1haW4uUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzPn0gW1JvdGF0aW9uXSBQcm90b2NvbE1lc3NhZ2UgUm90YXRpb24uXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFByb3RvY29sTWVzc2FnZS5cbiAgICAgICAgICogQGV4cG9ydHMgbWFpbi5Qcm90b2NvbE1lc3NhZ2VcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gUHJvdG9jb2xNZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHRoaXMuU3Bhd24gPSBbXTtcbiAgICAgICAgICAgIHRoaXMuVW5zcGF3biA9IFtdO1xuICAgICAgICAgICAgdGhpcy5Qb3NpdGlvbiA9IFtdO1xuICAgICAgICAgICAgdGhpcy5Sb3RhdGlvbiA9IFtdO1xuICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2tleXNbaV1dICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcm90b2NvbE1lc3NhZ2UgVHlwZS5cbiAgICAgICAgICogQHR5cGUge21haW4uUHJvdG9jb2xNZXNzYWdlLk1lc3NhZ2VUeXBlfVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5UeXBlID0gMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIFNlbmRlci5cbiAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuU2VuZGVyID0gXCJcIjtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIEhlbGxvLlxuICAgICAgICAgKiBAdHlwZSB7KG1haW4uUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSRQcm9wZXJ0aWVzfG51bGwpfVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5IZWxsbyA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBDb25uZWN0LlxuICAgICAgICAgKiBAdHlwZSB7KG1haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlJFByb3BlcnRpZXN8bnVsbCl9XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UucHJvdG90eXBlLkNvbm5lY3QgPSBudWxsO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcm90b2NvbE1lc3NhZ2UgRGlzY29ubmVjdC5cbiAgICAgICAgICogQHR5cGUgeyhtYWluLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzfG51bGwpfVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5EaXNjb25uZWN0ID0gbnVsbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIFBpbmcuXG4gICAgICAgICAqIEB0eXBlIHsobWFpbi5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UkUHJvcGVydGllc3xudWxsKX1cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuUGluZyA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBQb25nLlxuICAgICAgICAgKiBAdHlwZSB7KG1haW4uUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXN8bnVsbCl9XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UucHJvdG90eXBlLlBvbmcgPSBudWxsO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcm90b2NvbE1lc3NhZ2UgU3Bhd24uXG4gICAgICAgICAqIEB0eXBlIHtBcnJheS48bWFpbi5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlJFByb3BlcnRpZXM+fVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5TcGF3biA9ICR1dGlsLmVtcHR5QXJyYXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBVbnNwYXduLlxuICAgICAgICAgKiBAdHlwZSB7QXJyYXkuPG1haW4uUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlJFByb3BlcnRpZXM+fVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5VbnNwYXduID0gJHV0aWwuZW1wdHlBcnJheTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIFBvc2l0aW9uLlxuICAgICAgICAgKiBAdHlwZSB7QXJyYXkuPG1haW4uUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzPn1cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuUG9zaXRpb24gPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcm90b2NvbE1lc3NhZ2UgUm90YXRpb24uXG4gICAgICAgICAqIEB0eXBlIHtBcnJheS48bWFpbi5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlJFByb3BlcnRpZXM+fVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5Sb3RhdGlvbiA9ICR1dGlsLmVtcHR5QXJyYXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBuZXcgUHJvdG9jb2xNZXNzYWdlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZX0gUHJvdG9jb2xNZXNzYWdlIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvdG9jb2xNZXNzYWdlKHByb3BlcnRpZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIG1haW4uUHJvdG9jb2xNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5UeXBlICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlR5cGVcIikpXG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAxLCB3aXJlVHlwZSAwID0qLzgpLnVpbnQzMihtZXNzYWdlLlR5cGUpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuU2VuZGVyICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlNlbmRlclwiKSlcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDIsIHdpcmVUeXBlIDIgPSovMTgpLnN0cmluZyhtZXNzYWdlLlNlbmRlcik7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5IZWxsbyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJIZWxsb1wiKSlcbiAgICAgICAgICAgICAgICAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UuZW5jb2RlKG1lc3NhZ2UuSGVsbG8sIHdyaXRlci51aW50MzIoLyogaWQgMTMsIHdpcmVUeXBlIDIgPSovMTA2KS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuQ29ubmVjdCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJDb25uZWN0XCIpKVxuICAgICAgICAgICAgICAgICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlLmVuY29kZShtZXNzYWdlLkNvbm5lY3QsIHdyaXRlci51aW50MzIoLyogaWQgMTQsIHdpcmVUeXBlIDIgPSovMTE0KS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuRGlzY29ubmVjdCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJEaXNjb25uZWN0XCIpKVxuICAgICAgICAgICAgICAgICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlLmVuY29kZShtZXNzYWdlLkRpc2Nvbm5lY3QsIHdyaXRlci51aW50MzIoLyogaWQgMTUsIHdpcmVUeXBlIDIgPSovMTIyKS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUGluZyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQaW5nXCIpKVxuICAgICAgICAgICAgICAgICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlLmVuY29kZShtZXNzYWdlLlBpbmcsIHdyaXRlci51aW50MzIoLyogaWQgMTYsIHdpcmVUeXBlIDIgPSovMTMwKS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUG9uZyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQb25nXCIpKVxuICAgICAgICAgICAgICAgICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLmVuY29kZShtZXNzYWdlLlBvbmcsIHdyaXRlci51aW50MzIoLyogaWQgMTcsIHdpcmVUeXBlIDIgPSovMTM4KS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuU3Bhd24gIT0gbnVsbCAmJiBtZXNzYWdlLlNwYXduLmxlbmd0aClcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UuU3Bhd24ubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZS5lbmNvZGUobWVzc2FnZS5TcGF3bltpXSwgd3JpdGVyLnVpbnQzMigvKiBpZCAxOCwgd2lyZVR5cGUgMiA9Ki8xNDYpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5VbnNwYXduICE9IG51bGwgJiYgbWVzc2FnZS5VbnNwYXduLmxlbmd0aClcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UuVW5zcGF3bi5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UuZW5jb2RlKG1lc3NhZ2UuVW5zcGF3bltpXSwgd3JpdGVyLnVpbnQzMigvKiBpZCAxOSwgd2lyZVR5cGUgMiA9Ki8xNTQpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Qb3NpdGlvbiAhPSBudWxsICYmIG1lc3NhZ2UuUG9zaXRpb24ubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5Qb3NpdGlvbi5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlLmVuY29kZShtZXNzYWdlLlBvc2l0aW9uW2ldLCB3cml0ZXIudWludDMyKC8qIGlkIDIwLCB3aXJlVHlwZSAyID0qLzE2MikuZm9yaygpKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlJvdGF0aW9uICE9IG51bGwgJiYgbWVzc2FnZS5Sb3RhdGlvbi5sZW5ndGgpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLlJvdGF0aW9uLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UuZW5jb2RlKG1lc3NhZ2UuUm90YXRpb25baV0sIHdyaXRlci51aW50MzIoLyogaWQgMjEsIHdpcmVUeXBlIDIgPSovMTcwKS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFByb3RvY29sTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBtYWluLlByb3RvY29sTWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIFByb3RvY29sTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIFByb3RvY29sTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIE1lc3NhZ2UgbGVuZ3RoIGlmIGtub3duIGJlZm9yZWhhbmRcbiAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlfSBQcm90b2NvbE1lc3NhZ2VcbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UoKTtcbiAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuU2VuZGVyID0gcmVhZGVyLnN0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDEzOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLkhlbGxvID0gJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTQ6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuQ29ubmVjdCA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTU6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuRGlzY29ubmVjdCA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTY6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuUGluZyA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTc6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuUG9uZyA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTg6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UuU3Bhd24gJiYgbWVzc2FnZS5TcGF3bi5sZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5TcGF3biA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlNwYXduLnB1c2goJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLlVuc3Bhd24gJiYgbWVzc2FnZS5VbnNwYXduLmxlbmd0aCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlVuc3Bhd24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5VbnNwYXduLnB1c2goJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjA6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UuUG9zaXRpb24gJiYgbWVzc2FnZS5Qb3NpdGlvbi5sZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5Qb3NpdGlvbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlBvc2l0aW9uLnB1c2goJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDIxOlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLlJvdGF0aW9uICYmIG1lc3NhZ2UuUm90YXRpb24ubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuUm90YXRpb24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5Sb3RhdGlvbi5wdXNoKCRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZS5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIFByb3RvY29sTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLCBsZW5ndGggZGVsaW1pdGVkLlxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlfSBQcm90b2NvbE1lc3NhZ2VcbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlcihyZWFkZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVmVyaWZpZXMgYSBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZS5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAqIEByZXR1cm5zIHs/c3RyaW5nfSBgbnVsbGAgaWYgdmFsaWQsIG90aGVyd2lzZSB0aGUgcmVhc29uIHdoeSBpdCBpcyBub3RcbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5UeXBlICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlR5cGVcIikpXG4gICAgICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlLlR5cGUpIHtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJUeXBlOiBlbnVtIHZhbHVlIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIGNhc2UgMTM6XG4gICAgICAgICAgICAgICAgY2FzZSAxNDpcbiAgICAgICAgICAgICAgICBjYXNlIDE1OlxuICAgICAgICAgICAgICAgIGNhc2UgMTY6XG4gICAgICAgICAgICAgICAgY2FzZSAxNzpcbiAgICAgICAgICAgICAgICBjYXNlIDE4OlxuICAgICAgICAgICAgICAgIGNhc2UgMTk6XG4gICAgICAgICAgICAgICAgY2FzZSAyMDpcbiAgICAgICAgICAgICAgICBjYXNlIDIxOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5TZW5kZXIgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiU2VuZGVyXCIpKVxuICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNTdHJpbmcobWVzc2FnZS5TZW5kZXIpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJTZW5kZXI6IHN0cmluZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuSGVsbG8gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiSGVsbG9cIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UudmVyaWZ5KG1lc3NhZ2UuSGVsbG8pO1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiSGVsbG8uXCIgKyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLkNvbm5lY3QgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiQ29ubmVjdFwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlLnZlcmlmeShtZXNzYWdlLkNvbm5lY3QpO1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiQ29ubmVjdC5cIiArIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuRGlzY29ubmVjdCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJEaXNjb25uZWN0XCIpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0gJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2UudmVyaWZ5KG1lc3NhZ2UuRGlzY29ubmVjdCk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJEaXNjb25uZWN0LlwiICsgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5QaW5nICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlBpbmdcIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZS52ZXJpZnkobWVzc2FnZS5QaW5nKTtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlBpbmcuXCIgKyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlBvbmcgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUG9uZ1wiKSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLnZlcmlmeShtZXNzYWdlLlBvbmcpO1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiUG9uZy5cIiArIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuU3Bhd24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiU3Bhd25cIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5TcGF3bikpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlNwYXduOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5TcGF3bi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UudmVyaWZ5KG1lc3NhZ2UuU3Bhd25baV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJTcGF3bi5cIiArIGVycm9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlVuc3Bhd24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiVW5zcGF3blwiKSkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlLlVuc3Bhd24pKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJVbnNwYXduOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5VbnNwYXduLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlLnZlcmlmeShtZXNzYWdlLlVuc3Bhd25baV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJVbnNwYXduLlwiICsgZXJyb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUG9zaXRpb24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUG9zaXRpb25cIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5Qb3NpdGlvbikpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlBvc2l0aW9uOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5Qb3NpdGlvbi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UudmVyaWZ5KG1lc3NhZ2UuUG9zaXRpb25baV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJQb3NpdGlvbi5cIiArIGVycm9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlJvdGF0aW9uICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlJvdGF0aW9uXCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2UuUm90YXRpb24pKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJSb3RhdGlvbjogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UuUm90YXRpb24ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVycm9yID0gJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlLnZlcmlmeShtZXNzYWdlLlJvdGF0aW9uW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiUm90YXRpb24uXCIgKyBlcnJvcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIFByb3RvY29sTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlfSBQcm90b2NvbE1lc3NhZ2VcbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBuZXcgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UoKTtcbiAgICAgICAgICAgIHN3aXRjaCAob2JqZWN0LlR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJOT05FXCI6XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJIRUxMT1wiOlxuICAgICAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICAgICAgICBtZXNzYWdlLlR5cGUgPSAxMztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJDT05ORUNUXCI6XG4gICAgICAgICAgICBjYXNlIDE0OlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDE0O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIkRJU0NPTk5FQ1RcIjpcbiAgICAgICAgICAgIGNhc2UgMTU6XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gMTU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiUElOR1wiOlxuICAgICAgICAgICAgY2FzZSAxNjpcbiAgICAgICAgICAgICAgICBtZXNzYWdlLlR5cGUgPSAxNjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJQT05HXCI6XG4gICAgICAgICAgICBjYXNlIDE3OlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDE3O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlNQQVdOXCI6XG4gICAgICAgICAgICBjYXNlIDE4OlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDE4O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlVOU1BBV05cIjpcbiAgICAgICAgICAgIGNhc2UgMTk6XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gMTk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiUE9TSVRJT05cIjpcbiAgICAgICAgICAgIGNhc2UgMjA6XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gMjA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiUk9UQVRJT05cIjpcbiAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gMjE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LlNlbmRlciAhPSBudWxsKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuU2VuZGVyID0gU3RyaW5nKG9iamVjdC5TZW5kZXIpO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5IZWxsbyAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QuSGVsbG8gIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5tYWluLlByb3RvY29sTWVzc2FnZS5IZWxsbzogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuSGVsbG8gPSAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UuZnJvbU9iamVjdChvYmplY3QuSGVsbG8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5Db25uZWN0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5Db25uZWN0ICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIubWFpbi5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdDogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuQ29ubmVjdCA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlLmZyb21PYmplY3Qob2JqZWN0LkNvbm5lY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5EaXNjb25uZWN0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5EaXNjb25uZWN0ICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIubWFpbi5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdDogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuRGlzY29ubmVjdCA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlLmZyb21PYmplY3Qob2JqZWN0LkRpc2Nvbm5lY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5QaW5nICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5QaW5nICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUGluZzogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuUGluZyA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlLmZyb21PYmplY3Qob2JqZWN0LlBpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5Qb25nICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5Qb25nICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9uZzogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuUG9uZyA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLmZyb21PYmplY3Qob2JqZWN0LlBvbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5TcGF3bikge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QuU3Bhd24pKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIubWFpbi5Qcm90b2NvbE1lc3NhZ2UuU3Bhd246IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuU3Bhd24gPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdC5TcGF3bi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5TcGF3bltpXSAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5tYWluLlByb3RvY29sTWVzc2FnZS5TcGF3bjogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlNwYXduW2ldID0gJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlLmZyb21PYmplY3Qob2JqZWN0LlNwYXduW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LlVuc3Bhd24pIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LlVuc3Bhd24pKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIubWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bjogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5VbnNwYXduID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3QuVW5zcGF3bi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5VbnNwYXduW2ldICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLm1haW4uUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd246IG9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5VbnNwYXduW2ldID0gJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UuZnJvbU9iamVjdChvYmplY3QuVW5zcGF3bltpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5Qb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QuUG9zaXRpb24pKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb246IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuUG9zaXRpb24gPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdC5Qb3NpdGlvbi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5Qb3NpdGlvbltpXSAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5tYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbjogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlBvc2l0aW9uW2ldID0gJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlLmZyb21PYmplY3Qob2JqZWN0LlBvc2l0aW9uW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LlJvdGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG9iamVjdC5Sb3RhdGlvbikpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5tYWluLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbjogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5Sb3RhdGlvbiA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LlJvdGF0aW9uLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LlJvdGF0aW9uW2ldICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLm1haW4uUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uOiBvYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuUm90YXRpb25baV0gPSAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UuZnJvbU9iamVjdChvYmplY3QuUm90YXRpb25baV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZX0gUHJvdG9jb2xNZXNzYWdlXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuZnJvbSA9IFByb3RvY29sTWVzc2FnZS5mcm9tT2JqZWN0O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlfSBtZXNzYWdlIFByb3RvY29sTWVzc2FnZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmFycmF5cyB8fCBvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LlNwYXduID0gW107XG4gICAgICAgICAgICAgICAgb2JqZWN0LlVuc3Bhd24gPSBbXTtcbiAgICAgICAgICAgICAgICBvYmplY3QuUG9zaXRpb24gPSBbXTtcbiAgICAgICAgICAgICAgICBvYmplY3QuUm90YXRpb24gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LlR5cGUgPSBvcHRpb25zLmVudW1zID09PSBTdHJpbmcgPyBcIk5PTkVcIiA6IDA7XG4gICAgICAgICAgICAgICAgb2JqZWN0LlNlbmRlciA9IFwiXCI7XG4gICAgICAgICAgICAgICAgb2JqZWN0LkhlbGxvID0gbnVsbDtcbiAgICAgICAgICAgICAgICBvYmplY3QuQ29ubmVjdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgb2JqZWN0LkRpc2Nvbm5lY3QgPSBudWxsO1xuICAgICAgICAgICAgICAgIG9iamVjdC5QaW5nID0gbnVsbDtcbiAgICAgICAgICAgICAgICBvYmplY3QuUG9uZyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5UeXBlICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlR5cGVcIikpXG4gICAgICAgICAgICAgICAgb2JqZWN0LlR5cGUgPSBvcHRpb25zLmVudW1zID09PSBTdHJpbmcgPyAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5NZXNzYWdlVHlwZVttZXNzYWdlLlR5cGVdIDogbWVzc2FnZS5UeXBlO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuU2VuZGVyICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlNlbmRlclwiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QuU2VuZGVyID0gbWVzc2FnZS5TZW5kZXI7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5IZWxsbyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJIZWxsb1wiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QuSGVsbG8gPSAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UudG9PYmplY3QobWVzc2FnZS5IZWxsbywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Db25uZWN0ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIkNvbm5lY3RcIikpXG4gICAgICAgICAgICAgICAgb2JqZWN0LkNvbm5lY3QgPSAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZS50b09iamVjdChtZXNzYWdlLkNvbm5lY3QsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuRGlzY29ubmVjdCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJEaXNjb25uZWN0XCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5EaXNjb25uZWN0ID0gJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2UudG9PYmplY3QobWVzc2FnZS5EaXNjb25uZWN0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlBpbmcgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUGluZ1wiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QuUGluZyA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlLnRvT2JqZWN0KG1lc3NhZ2UuUGluZywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Qb25nICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlBvbmdcIikpXG4gICAgICAgICAgICAgICAgb2JqZWN0LlBvbmcgPSAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZS50b09iamVjdChtZXNzYWdlLlBvbmcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuU3Bhd24gJiYgbWVzc2FnZS5TcGF3bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QuU3Bhd24gPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2UuU3Bhd24ubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5TcGF3bltqXSA9ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZS50b09iamVjdChtZXNzYWdlLlNwYXduW2pdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlVuc3Bhd24gJiYgbWVzc2FnZS5VbnNwYXduLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5VbnNwYXduID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLlVuc3Bhd24ubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5VbnNwYXduW2pdID0gJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UudG9PYmplY3QobWVzc2FnZS5VbnNwYXduW2pdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlBvc2l0aW9uICYmIG1lc3NhZ2UuUG9zaXRpb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LlBvc2l0aW9uID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLlBvc2l0aW9uLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuUG9zaXRpb25bal0gPSAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UudG9PYmplY3QobWVzc2FnZS5Qb3NpdGlvbltqXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Sb3RhdGlvbiAmJiBtZXNzYWdlLlJvdGF0aW9uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5Sb3RhdGlvbiA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWVzc2FnZS5Sb3RhdGlvbi5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlJvdGF0aW9uW2pdID0gJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlLnRvT2JqZWN0KG1lc3NhZ2UuUm90YXRpb25bal0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydHMgdGhpcyBQcm90b2NvbE1lc3NhZ2UgdG8gSlNPTi5cbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogTWVzc2FnZVR5cGUgZW51bS5cbiAgICAgICAgICogQG5hbWUgTWVzc2FnZVR5cGVcbiAgICAgICAgICogQG1lbWJlcm9mIG1haW4uUHJvdG9jb2xNZXNzYWdlXG4gICAgICAgICAqIEBlbnVtIHtudW1iZXJ9XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBOT05FPTAgTk9ORSB2YWx1ZVxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gSEVMTE89MTMgSEVMTE8gdmFsdWVcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IENPTk5FQ1Q9MTQgQ09OTkVDVCB2YWx1ZVxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gRElTQ09OTkVDVD0xNSBESVNDT05ORUNUIHZhbHVlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBQSU5HPTE2IFBJTkcgdmFsdWVcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IFBPTkc9MTcgUE9ORyB2YWx1ZVxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gU1BBV049MTggU1BBV04gdmFsdWVcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IFVOU1BBV049MTkgVU5TUEFXTiB2YWx1ZVxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gUE9TSVRJT049MjAgUE9TSVRJT04gdmFsdWVcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IFJPVEFUSU9OPTIxIFJPVEFUSU9OIHZhbHVlXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuTWVzc2FnZVR5cGUgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzQnlJZCA9IHt9LCB2YWx1ZXMgPSBPYmplY3QuY3JlYXRlKHZhbHVlc0J5SWQpO1xuICAgICAgICAgICAgdmFsdWVzW3ZhbHVlc0J5SWRbMF0gPSBcIk5PTkVcIl0gPSAwO1xuICAgICAgICAgICAgdmFsdWVzW3ZhbHVlc0J5SWRbMTNdID0gXCJIRUxMT1wiXSA9IDEzO1xuICAgICAgICAgICAgdmFsdWVzW3ZhbHVlc0J5SWRbMTRdID0gXCJDT05ORUNUXCJdID0gMTQ7XG4gICAgICAgICAgICB2YWx1ZXNbdmFsdWVzQnlJZFsxNV0gPSBcIkRJU0NPTk5FQ1RcIl0gPSAxNTtcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzE2XSA9IFwiUElOR1wiXSA9IDE2O1xuICAgICAgICAgICAgdmFsdWVzW3ZhbHVlc0J5SWRbMTddID0gXCJQT05HXCJdID0gMTc7XG4gICAgICAgICAgICB2YWx1ZXNbdmFsdWVzQnlJZFsxOF0gPSBcIlNQQVdOXCJdID0gMTg7XG4gICAgICAgICAgICB2YWx1ZXNbdmFsdWVzQnlJZFsxOV0gPSBcIlVOU1BBV05cIl0gPSAxOTtcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzIwXSA9IFwiUE9TSVRJT05cIl0gPSAyMDtcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzIxXSA9IFwiUk9UQVRJT05cIl0gPSAyMTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQcm9wZXJ0aWVzIG9mIGEgSGVsbG9NZXNzYWdlLlxuICAgICAgICAgICAgICogQHR5cGVkZWYgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlJFByb3BlcnRpZXNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IEhlbGxvTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBleHBvcnRzIG1haW4uUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZVxuICAgICAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIEhlbGxvTWVzc2FnZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IEhlbGxvTWVzc2FnZSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlfSBIZWxsb01lc3NhZ2UgaW5zdGFuY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgSGVsbG9NZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBIZWxsb01lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBIZWxsb01lc3NhZ2UgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBIZWxsb01lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgSGVsbG9NZXNzYWdlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgSGVsbG9NZXNzYWdlIG1lc3NhZ2UsIGxlbmd0aCBkZWxpbWl0ZWQuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIG1haW4uUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgSGVsbG9NZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikubGRlbGltKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBIZWxsb01lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIE1lc3NhZ2UgbGVuZ3RoIGlmIGtub3duIGJlZm9yZWhhbmRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2V9IEhlbGxvTWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBIZWxsb01lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgSGVsbG9NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2V9IEhlbGxvTWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBIZWxsb01lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmVyaWZpZXMgYSBIZWxsb01lc3NhZ2UgbWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgICAgICogQHJldHVybnMgez9zdHJpbmd9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBIZWxsb01lc3NhZ2UudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UgIT09IFwib2JqZWN0XCIgfHwgbWVzc2FnZSA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBIZWxsb01lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZX0gSGVsbG9NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBIZWxsb01lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlLmZyb21PYmplY3R9LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlfSBIZWxsb01lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgSGVsbG9NZXNzYWdlLmZyb20gPSBIZWxsb01lc3NhZ2UuZnJvbU9iamVjdDtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBIZWxsb01lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2V9IG1lc3NhZ2UgSGVsbG9NZXNzYWdlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgSGVsbG9NZXNzYWdlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gdGhpcyBIZWxsb01lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIHRoaXMgSGVsbG9NZXNzYWdlIHRvIEpTT04uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIEhlbGxvTWVzc2FnZTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIENvbm5lY3RNZXNzYWdlLlxuICAgICAgICAgICAgICogQHR5cGVkZWYgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UkUHJvcGVydGllc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbVXNlcm5hbWVdIENvbm5lY3RNZXNzYWdlIFVzZXJuYW1lLlxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFtQYXNzd29yZF0gQ29ubmVjdE1lc3NhZ2UgUGFzc3dvcmQuXG4gICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IENvbm5lY3RNZXNzYWdlLlxuICAgICAgICAgICAgICogQGV4cG9ydHMgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIENvbm5lY3RNZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbm5lY3RNZXNzYWdlIFVzZXJuYW1lLlxuICAgICAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQ29ubmVjdE1lc3NhZ2UucHJvdG90eXBlLlVzZXJuYW1lID0gXCJcIjtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25uZWN0TWVzc2FnZSBQYXNzd29yZC5cbiAgICAgICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLnByb3RvdHlwZS5QYXNzd29yZCA9IFwiXCI7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBDb25uZWN0TWVzc2FnZSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZX0gQ29ubmVjdE1lc3NhZ2UgaW5zdGFuY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQ29ubmVjdE1lc3NhZ2UuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENvbm5lY3RNZXNzYWdlKHByb3BlcnRpZXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgQ29ubmVjdE1lc3NhZ2UgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgQ29ubmVjdE1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQ29ubmVjdE1lc3NhZ2UuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlVzZXJuYW1lICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlVzZXJuYW1lXCIpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDEsIHdpcmVUeXBlIDIgPSovMTApLnN0cmluZyhtZXNzYWdlLlVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5QYXNzd29yZCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQYXNzd29yZFwiKSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAyLCB3aXJlVHlwZSAyID0qLzE4KS5zdHJpbmcobWVzc2FnZS5QYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIENvbm5lY3RNZXNzYWdlIG1lc3NhZ2UsIGxlbmd0aCBkZWxpbWl0ZWQuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIG1haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIENvbm5lY3RNZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIENvbm5lY3RNZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2V9IENvbm5lY3RNZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5Vc2VybmFtZSA9IHJlYWRlci5zdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlBhc3N3b3JkID0gcmVhZGVyLnN0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIENvbm5lY3RNZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZX0gQ29ubmVjdE1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQ29ubmVjdE1lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmVyaWZpZXMgYSBDb25uZWN0TWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeShtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlVzZXJuYW1lICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlVzZXJuYW1lXCIpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzU3RyaW5nKG1lc3NhZ2UuVXNlcm5hbWUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiVXNlcm5hbWU6IHN0cmluZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlBhc3N3b3JkICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlBhc3N3b3JkXCIpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzU3RyaW5nKG1lc3NhZ2UuUGFzc3dvcmQpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiUGFzc3dvcmQ6IHN0cmluZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgQ29ubmVjdE1lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlfSBDb25uZWN0TWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBDb25uZWN0TWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBuZXcgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LlVzZXJuYW1lICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuVXNlcm5hbWUgPSBTdHJpbmcob2JqZWN0LlVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LlBhc3N3b3JkICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuUGFzc3dvcmQgPSBTdHJpbmcob2JqZWN0LlBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIENvbm5lY3RNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIG1haW4uUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlLmZyb21PYmplY3R9LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2V9IENvbm5lY3RNZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLmZyb20gPSBDb25uZWN0TWVzc2FnZS5mcm9tT2JqZWN0O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIENvbm5lY3RNZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2V9IG1lc3NhZ2UgQ29ubmVjdE1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBDb25uZWN0TWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlVzZXJuYW1lID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlBhc3N3b3JkID0gXCJcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuVXNlcm5hbWUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiVXNlcm5hbWVcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5Vc2VybmFtZSA9IG1lc3NhZ2UuVXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUGFzc3dvcmQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUGFzc3dvcmRcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5QYXNzd29yZCA9IG1lc3NhZ2UuUGFzc3dvcmQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgQ29ubmVjdE1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgdGhpcyBDb25uZWN0TWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBDb25uZWN0TWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIENvbm5lY3RNZXNzYWdlO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZSA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQcm9wZXJ0aWVzIG9mIGEgRGlzY29ubmVjdE1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAdHlwZWRlZiBtYWluLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBEaXNjb25uZWN0TWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBleHBvcnRzIG1haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlXG4gICAgICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmdW5jdGlvbiBEaXNjb25uZWN0TWVzc2FnZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IERpc2Nvbm5lY3RNZXNzYWdlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlfSBEaXNjb25uZWN0TWVzc2FnZSBpbnN0YW5jZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBEaXNjb25uZWN0TWVzc2FnZS5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGlzY29ubmVjdE1lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBEaXNjb25uZWN0TWVzc2FnZSBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBtYWluLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBEaXNjb25uZWN0TWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBEaXNjb25uZWN0TWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2UsIGxlbmd0aCBkZWxpbWl0ZWQuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIG1haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIERpc2Nvbm5lY3RNZXNzYWdlLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2V9IERpc2Nvbm5lY3RNZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIERpc2Nvbm5lY3RNZXNzYWdlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgRGlzY29ubmVjdE1lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlfSBEaXNjb25uZWN0TWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBEaXNjb25uZWN0TWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIFBsYWluIG9iamVjdCB0byB2ZXJpZnlcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHs/c3RyaW5nfSBgbnVsbGAgaWYgdmFsaWQsIG90aGVyd2lzZSB0aGUgcmVhc29uIHdoeSBpdCBpcyBub3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgRGlzY29ubmVjdE1lc3NhZ2UudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UgIT09IFwib2JqZWN0XCIgfHwgbWVzc2FnZSA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBEaXNjb25uZWN0TWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2V9IERpc2Nvbm5lY3RNZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIERpc2Nvbm5lY3RNZXNzYWdlLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBEaXNjb25uZWN0TWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayBtYWluLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZS5mcm9tT2JqZWN0fS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlfSBEaXNjb25uZWN0TWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBEaXNjb25uZWN0TWVzc2FnZS5mcm9tID0gRGlzY29ubmVjdE1lc3NhZ2UuZnJvbU9iamVjdDtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBEaXNjb25uZWN0TWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlfSBtZXNzYWdlIERpc2Nvbm5lY3RNZXNzYWdlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgRGlzY29ubmVjdE1lc3NhZ2UudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSB0aGlzIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBEaXNjb25uZWN0TWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIHRoaXMgRGlzY29ubmVjdE1lc3NhZ2UgdG8gSlNPTi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gSlNPTiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgRGlzY29ubmVjdE1lc3NhZ2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBEaXNjb25uZWN0TWVzc2FnZTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFBpbmdNZXNzYWdlLlxuICAgICAgICAgICAgICogQHR5cGVkZWYgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UkUHJvcGVydGllc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgUGluZ01lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAZXhwb3J0cyBtYWluLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZVxuICAgICAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb24gUGluZ01lc3NhZ2UocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2tleXNbaV1dICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXlzW2ldXSA9IHByb3BlcnRpZXNba2V5c1tpXV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBQaW5nTWVzc2FnZSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZX0gUGluZ01lc3NhZ2UgaW5zdGFuY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUGluZ01lc3NhZ2UuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFBpbmdNZXNzYWdlKHByb3BlcnRpZXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgUGluZ01lc3NhZ2UgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUGluZ01lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUGluZ01lc3NhZ2UuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBQaW5nTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBtYWluLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBQaW5nTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQaW5nTWVzc2FnZS5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikubGRlbGltKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBQaW5nTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlfSBQaW5nTWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQaW5nTWVzc2FnZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgICAgICB2YXIgZW5kID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyByZWFkZXIubGVuIDogcmVhZGVyLnBvcyArIGxlbmd0aCwgbWVzc2FnZSA9IG5ldyAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIFBpbmdNZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZX0gUGluZ01lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUGluZ01lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmVyaWZpZXMgYSBQaW5nTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeShtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgUGluZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlfSBQaW5nTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQaW5nTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgUGluZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZX0gUGluZ01lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUGluZ01lc3NhZ2UuZnJvbSA9IFBpbmdNZXNzYWdlLmZyb21PYmplY3Q7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgUGluZ01lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZX0gbWVzc2FnZSBQaW5nTWVzc2FnZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gdGhpcyBQaW5nTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUGluZ01lc3NhZ2UucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3Qob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIFBpbmdNZXNzYWdlIHRvIEpTT04uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gUGluZ01lc3NhZ2U7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBQb25nTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIG1haW4uUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFBvbmdNZXNzYWdlLlxuICAgICAgICAgICAgICogQGV4cG9ydHMgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2VcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIFBvbmdNZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgUG9uZ01lc3NhZ2UgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2V9IFBvbmdNZXNzYWdlIGluc3RhbmNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvbmdNZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQb25nTWVzc2FnZShwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFBvbmdNZXNzYWdlIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIG1haW4uUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIFBvbmdNZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvbmdNZXNzYWdlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgUG9uZ01lc3NhZ2UgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUG9uZ01lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9uZ01lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgUG9uZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIE1lc3NhZ2UgbGVuZ3RoIGlmIGtub3duIGJlZm9yZWhhbmRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZX0gUG9uZ01lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9uZ01lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBQb25nTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLCBsZW5ndGggZGVsaW1pdGVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2V9IFBvbmdNZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvbmdNZXNzYWdlLmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlcihyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFZlcmlmaWVzIGEgUG9uZ01lc3NhZ2UgbWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgICAgICogQHJldHVybnMgez9zdHJpbmd9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFBvbmdNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZX0gUG9uZ01lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9uZ01lc3NhZ2UuZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFBvbmdNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIG1haW4uUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLmZyb21PYmplY3R9LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2V9IFBvbmdNZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvbmdNZXNzYWdlLmZyb20gPSBQb25nTWVzc2FnZS5mcm9tT2JqZWN0O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIFBvbmdNZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2V9IG1lc3NhZ2UgUG9uZ01lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgUG9uZ01lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvbmdNZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgdGhpcyBQb25nTWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIFBvbmdNZXNzYWdlO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFNwYXduTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIG1haW4uUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFtOYW1lXSBTcGF3bk1lc3NhZ2UgTmFtZS5cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgU3Bhd25NZXNzYWdlLlxuICAgICAgICAgICAgICogQGV4cG9ydHMgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb24gU3Bhd25NZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNwYXduTWVzc2FnZSBOYW1lLlxuICAgICAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgU3Bhd25NZXNzYWdlLnByb3RvdHlwZS5OYW1lID0gXCJcIjtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IFNwYXduTWVzc2FnZSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlfSBTcGF3bk1lc3NhZ2UgaW5zdGFuY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgU3Bhd25NZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBTcGF3bk1lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBTcGF3bk1lc3NhZ2UgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBTcGF3bk1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgU3Bhd25NZXNzYWdlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5OYW1lICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIk5hbWVcIikpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMSwgd2lyZVR5cGUgMiA9Ki8xMCkuc3RyaW5nKG1lc3NhZ2UuTmFtZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFNwYXduTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBtYWluLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIFNwYXduTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBTcGF3bk1lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgU3Bhd25NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlfSBTcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgU3Bhd25NZXNzYWdlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuTmFtZSA9IHJlYWRlci5zdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBTcGF3bk1lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZX0gU3Bhd25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNwYXduTWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIFNwYXduTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNwYXduTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5OYW1lICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIk5hbWVcIikpXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNTdHJpbmcobWVzc2FnZS5OYW1lKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIk5hbWU6IHN0cmluZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgU3Bhd25NZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2V9IFNwYXduTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBTcGF3bk1lc3NhZ2UuZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0Lk5hbWUgIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5OYW1lID0gU3RyaW5nKG9iamVjdC5OYW1lKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFNwYXduTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayBtYWluLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2V9IFNwYXduTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBTcGF3bk1lc3NhZ2UuZnJvbSA9IFNwYXduTWVzc2FnZS5mcm9tT2JqZWN0O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIFNwYXduTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZX0gbWVzc2FnZSBTcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBTcGF3bk1lc3NhZ2UudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuTmFtZSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuTmFtZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJOYW1lXCIpKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuTmFtZSA9IG1lc3NhZ2UuTmFtZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gdGhpcyBTcGF3bk1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNwYXduTWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIHRoaXMgU3Bhd25NZXNzYWdlIHRvIEpTT04uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNwYXduTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIFNwYXduTWVzc2FnZTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhbiBVbnNwYXduTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIG1haW4uUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlJFByb3BlcnRpZXNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFVuc3Bhd25NZXNzYWdlLlxuICAgICAgICAgICAgICogQGV4cG9ydHMgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIFVuc3Bhd25NZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgVW5zcGF3bk1lc3NhZ2UgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2V9IFVuc3Bhd25NZXNzYWdlIGluc3RhbmNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFVuc3Bhd25NZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVbnNwYXduTWVzc2FnZShwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFVuc3Bhd25NZXNzYWdlIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIG1haW4uUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIFVuc3Bhd25NZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFVuc3Bhd25NZXNzYWdlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgVW5zcGF3bk1lc3NhZ2UgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgVW5zcGF3bk1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgVW5zcGF3bk1lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGFuIFVuc3Bhd25NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2V9IFVuc3Bhd25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFVuc3Bhd25NZXNzYWdlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGFuIFVuc3Bhd25NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZX0gVW5zcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgVW5zcGF3bk1lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmVyaWZpZXMgYW4gVW5zcGF3bk1lc3NhZ2UgbWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgICAgICogQHJldHVybnMgez9zdHJpbmd9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBVbnNwYXduTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhbiBVbnNwYXduTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2V9IFVuc3Bhd25NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFVuc3Bhd25NZXNzYWdlLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYW4gVW5zcGF3bk1lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZX0gVW5zcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgVW5zcGF3bk1lc3NhZ2UuZnJvbSA9IFVuc3Bhd25NZXNzYWdlLmZyb21PYmplY3Q7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGFuIFVuc3Bhd25NZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2V9IG1lc3NhZ2UgVW5zcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBVbnNwYXduTWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgVW5zcGF3bk1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFVuc3Bhd25NZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgdGhpcyBVbnNwYXduTWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBVbnNwYXduTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIFVuc3Bhd25NZXNzYWdlO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFBvc2l0aW9uTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIG1haW4uUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IFtYXSBQb3NpdGlvbk1lc3NhZ2UgWC5cbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBbWV0gUG9zaXRpb25NZXNzYWdlIFkuXG4gICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFBvc2l0aW9uTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBleHBvcnRzIG1haW4uUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZVxuICAgICAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIFBvc2l0aW9uTWVzc2FnZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQb3NpdGlvbk1lc3NhZ2UgWC5cbiAgICAgICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5wcm90b3R5cGUuWCA9IDA7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUG9zaXRpb25NZXNzYWdlIFkuXG4gICAgICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UucHJvdG90eXBlLlkgPSAwO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgUG9zaXRpb25NZXNzYWdlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2V9IFBvc2l0aW9uTWVzc2FnZSBpbnN0YW5jZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFBvc2l0aW9uTWVzc2FnZShwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBtYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlggIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiWFwiKSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAxLCB3aXJlVHlwZSA1ID0qLzEzKS5mbG9hdChtZXNzYWdlLlgpO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlkgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiWVwiKSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAyLCB3aXJlVHlwZSA1ID0qLzIxKS5mbG9hdChtZXNzYWdlLlkpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBQb3NpdGlvbk1lc3NhZ2UgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBQb3NpdGlvbk1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9zaXRpb25NZXNzYWdlLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZX0gUG9zaXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgICAgICB2YXIgZW5kID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyByZWFkZXIubGVuIDogcmVhZGVyLnBvcyArIGxlbmd0aCwgbWVzc2FnZSA9IG5ldyAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlggPSByZWFkZXIuZmxvYXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlkgPSByZWFkZXIuZmxvYXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBQb3NpdGlvbk1lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZX0gUG9zaXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5YICE9PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiWDogbnVtYmVyIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJZXCIpKVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UuWSAhPT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlk6IG51bWJlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgUG9zaXRpb25NZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2V9IFBvc2l0aW9uTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UuZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LlggIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5YID0gTnVtYmVyKG9iamVjdC5YKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LlkgIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5ZID0gTnVtYmVyKG9iamVjdC5ZKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayBtYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2V9IFBvc2l0aW9uTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UuZnJvbSA9IFBvc2l0aW9uTWVzc2FnZS5mcm9tT2JqZWN0O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZX0gbWVzc2FnZSBQb3NpdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5YID0gMDtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlkgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5YID0gbWVzc2FnZS5YO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlkgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiWVwiKSlcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlkgPSBtZXNzYWdlLlk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgUG9zaXRpb25NZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3Qob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIFBvc2l0aW9uTWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBQb3NpdGlvbk1lc3NhZ2U7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQcm9wZXJ0aWVzIG9mIGEgUm90YXRpb25NZXNzYWdlLlxuICAgICAgICAgICAgICogQHR5cGVkZWYgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlJFByb3BlcnRpZXNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gW1hdIFJvdGF0aW9uTWVzc2FnZSBYLlxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBSb3RhdGlvbk1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAZXhwb3J0cyBtYWluLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmdW5jdGlvbiBSb3RhdGlvbk1lc3NhZ2UocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2tleXNbaV1dICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXlzW2ldXSA9IHByb3BlcnRpZXNba2V5c1tpXV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUm90YXRpb25NZXNzYWdlIFguXG4gICAgICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UucHJvdG90eXBlLlggPSAwO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgUm90YXRpb25NZXNzYWdlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHttYWluLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2V9IFJvdGF0aW9uTWVzc2FnZSBpbnN0YW5jZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFJvdGF0aW9uTWVzc2FnZShwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBtYWluLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge21haW4uUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlggIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiWFwiKSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAxLCB3aXJlVHlwZSA1ID0qLzEzKS5mbG9hdChtZXNzYWdlLlgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBSb3RhdGlvbk1lc3NhZ2UgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgbWFpbi5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHttYWluLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBSb3RhdGlvbk1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZX0gUm90YXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgICAgICB2YXIgZW5kID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyByZWFkZXIubGVuIDogcmVhZGVyLnBvcyArIGxlbmd0aCwgbWVzc2FnZSA9IG5ldyAkcm9vdC5tYWluLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlggPSByZWFkZXIuZmxvYXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBSb3RhdGlvbk1lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZX0gUm90YXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5YICE9PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiWDogbnVtYmVyIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBSb3RhdGlvbk1lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZX0gUm90YXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3QubWFpbi5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290Lm1haW4uUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QuWCAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlggPSBOdW1iZXIob2JqZWN0LlgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgUm90YXRpb25NZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIG1haW4uUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZS5mcm9tT2JqZWN0fS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge21haW4uUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZX0gUm90YXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS5mcm9tID0gUm90YXRpb25NZXNzYWdlLmZyb21PYmplY3Q7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgUm90YXRpb25NZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bWFpbi5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlfSBtZXNzYWdlIFJvdGF0aW9uTWVzc2FnZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdHMpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5YID0gMDtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5YID0gbWVzc2FnZS5YO1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSB0aGlzIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgdGhpcyBSb3RhdGlvbk1lc3NhZ2UgdG8gSlNPTi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gSlNPTiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gUm90YXRpb25NZXNzYWdlO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIHJldHVybiBQcm90b2NvbE1lc3NhZ2U7XG4gICAgfSkoKTtcblxuICAgIHJldHVybiBtYWluO1xufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSAkcm9vdDtcbiIsImltcG9ydCAqIGFzIEJ5dGVCdWZmZXIgZnJvbSAnYnl0ZWJ1ZmZlcic7XHJcbmltcG9ydCAqIGFzIFByb3RvQnVmIGZyb20gJ3Byb3RvYnVmanMnO1xyXG5pbXBvcnQgeyBtYWluIH0gIGZyb20gJy4uL3Byb3RvL3dlYnJlYWxtcy5wcm90by5qcydcclxuZGVjbGFyZSBmdW5jdGlvbiBwb3N0TWVzc2FnZShtZXNzYWdlOiBhbnkpO1xyXG5cclxuY2xhc3MgQ2xpZW50e1xyXG4gICAgcHJpdmF0ZSBzb2NrZXQ7XHJcbiAgICBwcml2YXRlIGJ1aWxkZXI7XHJcbiAgICBwcml2YXRlIHdvcmtlcjtcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3Iod2luZG93KXtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgbGV0IGJ1aWxkZXIgPSB0aGlzLmJ1aWxkZXIgPSBtYWluLlByb3RvY29sTWVzc2FnZTtcclxuICAgICAgICBsZXQgc29ja2V0ID0gdGhpcy5zb2NrZXQgPSBuZXcgV2ViU29ja2V0KFwid3M6Ly9cIit3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUrXCIvd3NcIik7XHJcbiAgICAgICAgd2luZG93Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGRhdGEpe1xyXG4gICAgICAgICAgICAgdGhhdC5vbm1lc3NhZ2UoZGF0YSlcclxuICAgICAgICB9O1xyXG4gICAgICAgIHNvY2tldC5vbm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNvY2tldC5iaW5hcnlUeXBlID0gXCJhcnJheWJ1ZmZlclwiO1xyXG4gICAgICAgICAgICBwb3N0TWVzc2FnZShbXCJjb25uZWN0ZWRcIl0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc29ja2V0Lm9uY2xvc2UgPSBmdW5jdGlvbihldnQ6IENsb3NlRXZlbnQpIHtcclxuICAgICAgICAgICAgcG9zdE1lc3NhZ2UoW1wiZGlzY29ubmVjdGVkXCIsZXZ0LnR5cGVdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbSA9IG1haW4uUHJvdG9jb2xNZXNzYWdlLnRvT2JqZWN0KGJ1aWxkZXIuZGVjb2RlKG5ldyBVaW50OEFycmF5KGV2ZW50LmRhdGEpKSk7XHJcbiAgICAgICAgICAgICAgICBwb3N0TWVzc2FnZShbXCJtZXNzYWdlXCIsbV0pO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIFByb3RvQnVmLnV0aWwuUHJvdG9jb2xFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yXCIsZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbm1lc3NhZ2UoZXZlbnQpIHtcclxuICAgICAgICBzd2l0Y2goZXZlbnQuZGF0YVswXSl7XHJcbiAgICAgICAgICAgIGNhc2UgXCJtZXNzYWdlXCI6XHJcbiAgICAgICAgICAgICAgICBsZXQgY29udGVudDogbWFpbi5Qcm90b2NvbE1lc3NhZ2UgPSBtYWluLlByb3RvY29sTWVzc2FnZS5mcm9tT2JqZWN0KGV2ZW50LmRhdGFbMV0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kKGNvbnRlbnQpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgc2VuZChtZXNzYWdlOiBtYWluLlByb3RvY29sTWVzc2FnZSl7XHJcbiAgICAgICAgbGV0IGRhdGEgPSB0aGlzLmJ1aWxkZXIuZW5jb2RlKG1lc3NhZ2UpLmZpbmlzaCgpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LnNlbmQoZGF0YSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciB3b3JrZXI6IENsaWVudCA9IG5ldyBDbGllbnQoc2VsZik7XHJcbmV4cG9ydCA9IHdvcmtlcjtcclxuXHJcbiJdfQ==
