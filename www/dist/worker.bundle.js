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
         * @property {string} [Sender] ProtocolMessage Sender.
         * @property {webrealms.ProtocolMessage.HelloMessage$Properties} [Hello] ProtocolMessage Hello.
         * @property {webrealms.ProtocolMessage.ConnectMessage$Properties} [Connect] ProtocolMessage Connect.
         * @property {webrealms.ProtocolMessage.DisconnectMessage$Properties} [Disconnect] ProtocolMessage Disconnect.
         * @property {webrealms.ProtocolMessage.PingMessage$Properties} [Ping] ProtocolMessage Ping.
         * @property {webrealms.ProtocolMessage.PongMessage$Properties} [Pong] ProtocolMessage Pong.
         * @property {Array.<webrealms.ProtocolMessage.SpawnMessage$Properties>} [Spawn] ProtocolMessage Spawn.
         * @property {Array.<webrealms.ProtocolMessage.UnspawnMessage$Properties>} [Unspawn] ProtocolMessage Unspawn.
         * @property {Array.<webrealms.ProtocolMessage.PositionMessage$Properties>} [Position] ProtocolMessage Position.
         * @property {Array.<webrealms.ProtocolMessage.RotationMessage$Properties>} [Rotation] ProtocolMessage Rotation.
         */

        /**
         * Constructs a new ProtocolMessage.
         * @exports webrealms.ProtocolMessage
         * @constructor
         * @param {webrealms.ProtocolMessage$Properties=} [properties] Properties to set
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
         * @type {webrealms.ProtocolMessage.MessageType}
         */
        ProtocolMessage.prototype.Type = 0;

        /**
         * ProtocolMessage Sender.
         * @type {string}
         */
        ProtocolMessage.prototype.Sender = "";

        /**
         * ProtocolMessage Hello.
         * @type {(webrealms.ProtocolMessage.HelloMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Hello = null;

        /**
         * ProtocolMessage Connect.
         * @type {(webrealms.ProtocolMessage.ConnectMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Connect = null;

        /**
         * ProtocolMessage Disconnect.
         * @type {(webrealms.ProtocolMessage.DisconnectMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Disconnect = null;

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
         * ProtocolMessage Spawn.
         * @type {Array.<webrealms.ProtocolMessage.SpawnMessage$Properties>}
         */
        ProtocolMessage.prototype.Spawn = $util.emptyArray;

        /**
         * ProtocolMessage Unspawn.
         * @type {Array.<webrealms.ProtocolMessage.UnspawnMessage$Properties>}
         */
        ProtocolMessage.prototype.Unspawn = $util.emptyArray;

        /**
         * ProtocolMessage Position.
         * @type {Array.<webrealms.ProtocolMessage.PositionMessage$Properties>}
         */
        ProtocolMessage.prototype.Position = $util.emptyArray;

        /**
         * ProtocolMessage Rotation.
         * @type {Array.<webrealms.ProtocolMessage.RotationMessage$Properties>}
         */
        ProtocolMessage.prototype.Rotation = $util.emptyArray;

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
            if (message.Sender != null && message.hasOwnProperty("Sender"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.Sender);
            if (message.Hello != null && message.hasOwnProperty("Hello"))
                $root.webrealms.ProtocolMessage.HelloMessage.encode(message.Hello, writer.uint32(/* id 13, wireType 2 =*/106).fork()).ldelim();
            if (message.Connect != null && message.hasOwnProperty("Connect"))
                $root.webrealms.ProtocolMessage.ConnectMessage.encode(message.Connect, writer.uint32(/* id 14, wireType 2 =*/114).fork()).ldelim();
            if (message.Disconnect != null && message.hasOwnProperty("Disconnect"))
                $root.webrealms.ProtocolMessage.DisconnectMessage.encode(message.Disconnect, writer.uint32(/* id 15, wireType 2 =*/122).fork()).ldelim();
            if (message.Ping != null && message.hasOwnProperty("Ping"))
                $root.webrealms.ProtocolMessage.PingMessage.encode(message.Ping, writer.uint32(/* id 16, wireType 2 =*/130).fork()).ldelim();
            if (message.Pong != null && message.hasOwnProperty("Pong"))
                $root.webrealms.ProtocolMessage.PongMessage.encode(message.Pong, writer.uint32(/* id 17, wireType 2 =*/138).fork()).ldelim();
            if (message.Spawn != null && message.Spawn.length)
                for (var i = 0; i < message.Spawn.length; ++i)
                    $root.webrealms.ProtocolMessage.SpawnMessage.encode(message.Spawn[i], writer.uint32(/* id 18, wireType 2 =*/146).fork()).ldelim();
            if (message.Unspawn != null && message.Unspawn.length)
                for (var i = 0; i < message.Unspawn.length; ++i)
                    $root.webrealms.ProtocolMessage.UnspawnMessage.encode(message.Unspawn[i], writer.uint32(/* id 19, wireType 2 =*/154).fork()).ldelim();
            if (message.Position != null && message.Position.length)
                for (var i = 0; i < message.Position.length; ++i)
                    $root.webrealms.ProtocolMessage.PositionMessage.encode(message.Position[i], writer.uint32(/* id 20, wireType 2 =*/162).fork()).ldelim();
            if (message.Rotation != null && message.Rotation.length)
                for (var i = 0; i < message.Rotation.length; ++i)
                    $root.webrealms.ProtocolMessage.RotationMessage.encode(message.Rotation[i], writer.uint32(/* id 21, wireType 2 =*/170).fork()).ldelim();
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
                case 2:
                    message.Sender = reader.string();
                    break;
                case 13:
                    message.Hello = $root.webrealms.ProtocolMessage.HelloMessage.decode(reader, reader.uint32());
                    break;
                case 14:
                    message.Connect = $root.webrealms.ProtocolMessage.ConnectMessage.decode(reader, reader.uint32());
                    break;
                case 15:
                    message.Disconnect = $root.webrealms.ProtocolMessage.DisconnectMessage.decode(reader, reader.uint32());
                    break;
                case 16:
                    message.Ping = $root.webrealms.ProtocolMessage.PingMessage.decode(reader, reader.uint32());
                    break;
                case 17:
                    message.Pong = $root.webrealms.ProtocolMessage.PongMessage.decode(reader, reader.uint32());
                    break;
                case 18:
                    if (!(message.Spawn && message.Spawn.length))
                        message.Spawn = [];
                    message.Spawn.push($root.webrealms.ProtocolMessage.SpawnMessage.decode(reader, reader.uint32()));
                    break;
                case 19:
                    if (!(message.Unspawn && message.Unspawn.length))
                        message.Unspawn = [];
                    message.Unspawn.push($root.webrealms.ProtocolMessage.UnspawnMessage.decode(reader, reader.uint32()));
                    break;
                case 20:
                    if (!(message.Position && message.Position.length))
                        message.Position = [];
                    message.Position.push($root.webrealms.ProtocolMessage.PositionMessage.decode(reader, reader.uint32()));
                    break;
                case 21:
                    if (!(message.Rotation && message.Rotation.length))
                        message.Rotation = [];
                    message.Rotation.push($root.webrealms.ProtocolMessage.RotationMessage.decode(reader, reader.uint32()));
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
                var error = $root.webrealms.ProtocolMessage.HelloMessage.verify(message.Hello);
                if (error)
                    return "Hello." + error;
            }
            if (message.Connect != null && message.hasOwnProperty("Connect")) {
                var error = $root.webrealms.ProtocolMessage.ConnectMessage.verify(message.Connect);
                if (error)
                    return "Connect." + error;
            }
            if (message.Disconnect != null && message.hasOwnProperty("Disconnect")) {
                var error = $root.webrealms.ProtocolMessage.DisconnectMessage.verify(message.Disconnect);
                if (error)
                    return "Disconnect." + error;
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
            if (message.Spawn != null && message.hasOwnProperty("Spawn")) {
                if (!Array.isArray(message.Spawn))
                    return "Spawn: array expected";
                for (var i = 0; i < message.Spawn.length; ++i) {
                    var error = $root.webrealms.ProtocolMessage.SpawnMessage.verify(message.Spawn[i]);
                    if (error)
                        return "Spawn." + error;
                }
            }
            if (message.Unspawn != null && message.hasOwnProperty("Unspawn")) {
                if (!Array.isArray(message.Unspawn))
                    return "Unspawn: array expected";
                for (var i = 0; i < message.Unspawn.length; ++i) {
                    var error = $root.webrealms.ProtocolMessage.UnspawnMessage.verify(message.Unspawn[i]);
                    if (error)
                        return "Unspawn." + error;
                }
            }
            if (message.Position != null && message.hasOwnProperty("Position")) {
                if (!Array.isArray(message.Position))
                    return "Position: array expected";
                for (var i = 0; i < message.Position.length; ++i) {
                    var error = $root.webrealms.ProtocolMessage.PositionMessage.verify(message.Position[i]);
                    if (error)
                        return "Position." + error;
                }
            }
            if (message.Rotation != null && message.hasOwnProperty("Rotation")) {
                if (!Array.isArray(message.Rotation))
                    return "Rotation: array expected";
                for (var i = 0; i < message.Rotation.length; ++i) {
                    var error = $root.webrealms.ProtocolMessage.RotationMessage.verify(message.Rotation[i]);
                    if (error)
                        return "Rotation." + error;
                }
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
                    throw TypeError(".webrealms.ProtocolMessage.Hello: object expected");
                message.Hello = $root.webrealms.ProtocolMessage.HelloMessage.fromObject(object.Hello);
            }
            if (object.Connect != null) {
                if (typeof object.Connect !== "object")
                    throw TypeError(".webrealms.ProtocolMessage.Connect: object expected");
                message.Connect = $root.webrealms.ProtocolMessage.ConnectMessage.fromObject(object.Connect);
            }
            if (object.Disconnect != null) {
                if (typeof object.Disconnect !== "object")
                    throw TypeError(".webrealms.ProtocolMessage.Disconnect: object expected");
                message.Disconnect = $root.webrealms.ProtocolMessage.DisconnectMessage.fromObject(object.Disconnect);
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
            if (object.Spawn) {
                if (!Array.isArray(object.Spawn))
                    throw TypeError(".webrealms.ProtocolMessage.Spawn: array expected");
                message.Spawn = [];
                for (var i = 0; i < object.Spawn.length; ++i) {
                    if (typeof object.Spawn[i] !== "object")
                        throw TypeError(".webrealms.ProtocolMessage.Spawn: object expected");
                    message.Spawn[i] = $root.webrealms.ProtocolMessage.SpawnMessage.fromObject(object.Spawn[i]);
                }
            }
            if (object.Unspawn) {
                if (!Array.isArray(object.Unspawn))
                    throw TypeError(".webrealms.ProtocolMessage.Unspawn: array expected");
                message.Unspawn = [];
                for (var i = 0; i < object.Unspawn.length; ++i) {
                    if (typeof object.Unspawn[i] !== "object")
                        throw TypeError(".webrealms.ProtocolMessage.Unspawn: object expected");
                    message.Unspawn[i] = $root.webrealms.ProtocolMessage.UnspawnMessage.fromObject(object.Unspawn[i]);
                }
            }
            if (object.Position) {
                if (!Array.isArray(object.Position))
                    throw TypeError(".webrealms.ProtocolMessage.Position: array expected");
                message.Position = [];
                for (var i = 0; i < object.Position.length; ++i) {
                    if (typeof object.Position[i] !== "object")
                        throw TypeError(".webrealms.ProtocolMessage.Position: object expected");
                    message.Position[i] = $root.webrealms.ProtocolMessage.PositionMessage.fromObject(object.Position[i]);
                }
            }
            if (object.Rotation) {
                if (!Array.isArray(object.Rotation))
                    throw TypeError(".webrealms.ProtocolMessage.Rotation: array expected");
                message.Rotation = [];
                for (var i = 0; i < object.Rotation.length; ++i) {
                    if (typeof object.Rotation[i] !== "object")
                        throw TypeError(".webrealms.ProtocolMessage.Rotation: object expected");
                    message.Rotation[i] = $root.webrealms.ProtocolMessage.RotationMessage.fromObject(object.Rotation[i]);
                }
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
                object.Type = options.enums === String ? $root.webrealms.ProtocolMessage.MessageType[message.Type] : message.Type;
            if (message.Sender != null && message.hasOwnProperty("Sender"))
                object.Sender = message.Sender;
            if (message.Hello != null && message.hasOwnProperty("Hello"))
                object.Hello = $root.webrealms.ProtocolMessage.HelloMessage.toObject(message.Hello, options);
            if (message.Connect != null && message.hasOwnProperty("Connect"))
                object.Connect = $root.webrealms.ProtocolMessage.ConnectMessage.toObject(message.Connect, options);
            if (message.Disconnect != null && message.hasOwnProperty("Disconnect"))
                object.Disconnect = $root.webrealms.ProtocolMessage.DisconnectMessage.toObject(message.Disconnect, options);
            if (message.Ping != null && message.hasOwnProperty("Ping"))
                object.Ping = $root.webrealms.ProtocolMessage.PingMessage.toObject(message.Ping, options);
            if (message.Pong != null && message.hasOwnProperty("Pong"))
                object.Pong = $root.webrealms.ProtocolMessage.PongMessage.toObject(message.Pong, options);
            if (message.Spawn && message.Spawn.length) {
                object.Spawn = [];
                for (var j = 0; j < message.Spawn.length; ++j)
                    object.Spawn[j] = $root.webrealms.ProtocolMessage.SpawnMessage.toObject(message.Spawn[j], options);
            }
            if (message.Unspawn && message.Unspawn.length) {
                object.Unspawn = [];
                for (var j = 0; j < message.Unspawn.length; ++j)
                    object.Unspawn[j] = $root.webrealms.ProtocolMessage.UnspawnMessage.toObject(message.Unspawn[j], options);
            }
            if (message.Position && message.Position.length) {
                object.Position = [];
                for (var j = 0; j < message.Position.length; ++j)
                    object.Position[j] = $root.webrealms.ProtocolMessage.PositionMessage.toObject(message.Position[j], options);
            }
            if (message.Rotation && message.Rotation.length) {
                object.Rotation = [];
                for (var j = 0; j < message.Rotation.length; ++j)
                    object.Rotation[j] = $root.webrealms.ProtocolMessage.RotationMessage.toObject(message.Rotation[j], options);
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
         * @memberof webrealms.ProtocolMessage
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
             * @typedef webrealms.ProtocolMessage.HelloMessage$Properties
             * @type {Object}
             * @property {string} [Session] HelloMessage Session.
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
             * HelloMessage Session.
             * @type {string}
             */
            HelloMessage.prototype.Session = "";

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
                if (message.Session != null && message.hasOwnProperty("Session"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.Session);
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
                        message.Session = reader.string();
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
                if (message.Session != null && message.hasOwnProperty("Session"))
                    if (!$util.isString(message.Session))
                        return "Session: string expected";
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
                if (object.Session != null)
                    message.Session = String(object.Session);
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
                if (options.defaults)
                    object.Session = "";
                if (message.Session != null && message.hasOwnProperty("Session"))
                    object.Session = message.Session;
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

        ProtocolMessage.ConnectMessage = (function() {

            /**
             * Properties of a ConnectMessage.
             * @typedef webrealms.ProtocolMessage.ConnectMessage$Properties
             * @type {Object}
             * @property {string} [Username] ConnectMessage Username.
             * @property {string} [Password] ConnectMessage Password.
             */

            /**
             * Constructs a new ConnectMessage.
             * @exports webrealms.ProtocolMessage.ConnectMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.ConnectMessage$Properties=} [properties] Properties to set
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
             * @param {webrealms.ProtocolMessage.ConnectMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.ConnectMessage} ConnectMessage instance
             */
            ConnectMessage.create = function create(properties) {
                return new ConnectMessage(properties);
            };

            /**
             * Encodes the specified ConnectMessage message. Does not implicitly {@link webrealms.ProtocolMessage.ConnectMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.ConnectMessage$Properties} message ConnectMessage message or plain object to encode
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
             * Encodes the specified ConnectMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.ConnectMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.ConnectMessage$Properties} message ConnectMessage message or plain object to encode
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
             * @returns {webrealms.ProtocolMessage.ConnectMessage} ConnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ConnectMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage.ConnectMessage();
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
             * @returns {webrealms.ProtocolMessage.ConnectMessage} ConnectMessage
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
             * @returns {webrealms.ProtocolMessage.ConnectMessage} ConnectMessage
             */
            ConnectMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.webrealms.ProtocolMessage.ConnectMessage)
                    return object;
                var message = new $root.webrealms.ProtocolMessage.ConnectMessage();
                if (object.Username != null)
                    message.Username = String(object.Username);
                if (object.Password != null)
                    message.Password = String(object.Password);
                return message;
            };

            /**
             * Creates a ConnectMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.ConnectMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.ConnectMessage} ConnectMessage
             */
            ConnectMessage.from = ConnectMessage.fromObject;

            /**
             * Creates a plain object from a ConnectMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.ConnectMessage} message ConnectMessage
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
             * @typedef webrealms.ProtocolMessage.DisconnectMessage$Properties
             * @type {Object}
             */

            /**
             * Constructs a new DisconnectMessage.
             * @exports webrealms.ProtocolMessage.DisconnectMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.DisconnectMessage$Properties=} [properties] Properties to set
             */
            function DisconnectMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new DisconnectMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.DisconnectMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.DisconnectMessage} DisconnectMessage instance
             */
            DisconnectMessage.create = function create(properties) {
                return new DisconnectMessage(properties);
            };

            /**
             * Encodes the specified DisconnectMessage message. Does not implicitly {@link webrealms.ProtocolMessage.DisconnectMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.DisconnectMessage$Properties} message DisconnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            DisconnectMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified DisconnectMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.DisconnectMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.DisconnectMessage$Properties} message DisconnectMessage message or plain object to encode
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
             * @returns {webrealms.ProtocolMessage.DisconnectMessage} DisconnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            DisconnectMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage.DisconnectMessage();
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
             * @returns {webrealms.ProtocolMessage.DisconnectMessage} DisconnectMessage
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
             * @returns {webrealms.ProtocolMessage.DisconnectMessage} DisconnectMessage
             */
            DisconnectMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.webrealms.ProtocolMessage.DisconnectMessage)
                    return object;
                return new $root.webrealms.ProtocolMessage.DisconnectMessage();
            };

            /**
             * Creates a DisconnectMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.DisconnectMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.DisconnectMessage} DisconnectMessage
             */
            DisconnectMessage.from = DisconnectMessage.fromObject;

            /**
             * Creates a plain object from a DisconnectMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.DisconnectMessage} message DisconnectMessage
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

        ProtocolMessage.SpawnMessage = (function() {

            /**
             * Properties of a SpawnMessage.
             * @typedef webrealms.ProtocolMessage.SpawnMessage$Properties
             * @type {Object}
             * @property {string} [Name] SpawnMessage Name.
             */

            /**
             * Constructs a new SpawnMessage.
             * @exports webrealms.ProtocolMessage.SpawnMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.SpawnMessage$Properties=} [properties] Properties to set
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
             * @param {webrealms.ProtocolMessage.SpawnMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.SpawnMessage} SpawnMessage instance
             */
            SpawnMessage.create = function create(properties) {
                return new SpawnMessage(properties);
            };

            /**
             * Encodes the specified SpawnMessage message. Does not implicitly {@link webrealms.ProtocolMessage.SpawnMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.SpawnMessage$Properties} message SpawnMessage message or plain object to encode
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
             * Encodes the specified SpawnMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.SpawnMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.SpawnMessage$Properties} message SpawnMessage message or plain object to encode
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
             * @returns {webrealms.ProtocolMessage.SpawnMessage} SpawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SpawnMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage.SpawnMessage();
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
             * @returns {webrealms.ProtocolMessage.SpawnMessage} SpawnMessage
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
             * @returns {webrealms.ProtocolMessage.SpawnMessage} SpawnMessage
             */
            SpawnMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.webrealms.ProtocolMessage.SpawnMessage)
                    return object;
                var message = new $root.webrealms.ProtocolMessage.SpawnMessage();
                if (object.Name != null)
                    message.Name = String(object.Name);
                return message;
            };

            /**
             * Creates a SpawnMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.SpawnMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.SpawnMessage} SpawnMessage
             */
            SpawnMessage.from = SpawnMessage.fromObject;

            /**
             * Creates a plain object from a SpawnMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.SpawnMessage} message SpawnMessage
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
             * @typedef webrealms.ProtocolMessage.UnspawnMessage$Properties
             * @type {Object}
             */

            /**
             * Constructs a new UnspawnMessage.
             * @exports webrealms.ProtocolMessage.UnspawnMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.UnspawnMessage$Properties=} [properties] Properties to set
             */
            function UnspawnMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new UnspawnMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.UnspawnMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.UnspawnMessage} UnspawnMessage instance
             */
            UnspawnMessage.create = function create(properties) {
                return new UnspawnMessage(properties);
            };

            /**
             * Encodes the specified UnspawnMessage message. Does not implicitly {@link webrealms.ProtocolMessage.UnspawnMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.UnspawnMessage$Properties} message UnspawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            UnspawnMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified UnspawnMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.UnspawnMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.UnspawnMessage$Properties} message UnspawnMessage message or plain object to encode
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
             * @returns {webrealms.ProtocolMessage.UnspawnMessage} UnspawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            UnspawnMessage.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.webrealms.ProtocolMessage.UnspawnMessage();
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
             * @returns {webrealms.ProtocolMessage.UnspawnMessage} UnspawnMessage
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
             * @returns {webrealms.ProtocolMessage.UnspawnMessage} UnspawnMessage
             */
            UnspawnMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.webrealms.ProtocolMessage.UnspawnMessage)
                    return object;
                return new $root.webrealms.ProtocolMessage.UnspawnMessage();
            };

            /**
             * Creates an UnspawnMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.UnspawnMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.UnspawnMessage} UnspawnMessage
             */
            UnspawnMessage.from = UnspawnMessage.fromObject;

            /**
             * Creates a plain object from an UnspawnMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.UnspawnMessage} message UnspawnMessage
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
             * @typedef webrealms.ProtocolMessage.PositionMessage$Properties
             * @type {Object}
             * @property {number} [X] PositionMessage X.
             * @property {number} [Y] PositionMessage Y.
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
             * @typedef webrealms.ProtocolMessage.RotationMessage$Properties
             * @type {Object}
             * @property {number} [X] RotationMessage X.
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

    return webrealms;
})();

module.exports = $root;

},{"protobufjs/minimal":12}],46:[function(require,module,exports){
"use strict";

var ProtoBuf = require("protobufjs");
var root = require("../proto/webrealms.proto.js");
var Client = function () {
    function Client(window) {
        var that = this;
        var builder = this.builder = root.webrealms.ProtocolMessage;
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
                var m = root.webrealms.ProtocolMessage.toObject(builder.decode(new Uint8Array(event.data)));
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
                var content = root.webrealms.ProtocolMessage.fromObject(event.data[1]);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQHByb3RvYnVmanMvYXNwcm9taXNlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL2Jhc2U2NC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9jb2RlZ2VuL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL2V2ZW50ZW1pdHRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9mZXRjaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9mbG9hdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9pbnF1aXJlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL3BhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQHByb3RvYnVmanMvcG9vbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy91dGY4L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9taW5pbWFsLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL2NsYXNzLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL2NvbW1vbi5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9jb252ZXJ0ZXIuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvZGVjb2Rlci5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9lbmNvZGVyLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL2VudW0uanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvZmllbGQuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvaW5kZXgtbGlnaHQuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvaW5kZXgtbWluaW1hbC5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9tYXBmaWVsZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9tZXNzYWdlLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL21ldGhvZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9uYW1lc3BhY2UuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvb2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL29uZW9mLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3BhcnNlLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3JlYWRlci5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9yZWFkZXJfYnVmZmVyLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3Jvb3QuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvcnBjLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3JwYy9zZXJ2aWNlLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3NlcnZpY2UuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvdG9rZW5pemUuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvdHlwZS5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy90eXBlcy5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy91dGlsLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3V0aWwvbG9uZ2JpdHMuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvdXRpbC9taW5pbWFsLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3ZlcmlmaWVyLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3dyaXRlci5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy93cml0ZXJfYnVmZmVyLmpzIiwic3JjL3Byb3RvL3dlYnJlYWxtcy5wcm90by5qcyIsInNyYy93b3JrZXIvY2xpZW50Lndvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25aQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvdUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JqRUEsdUJBQXVDO0FBQ3ZDLG1CQUFtRDtBQUluRDtBQUtJLG9CQUFtQixBQUFNO0FBQ3JCLFlBQUksQUFBSSxPQUFHLEFBQUksQUFBQztBQUNoQixZQUFJLEFBQU8sVUFBRyxBQUFJLEtBQUMsQUFBTyxVQUFHLEFBQUksS0FBQyxBQUFTLFVBQUMsQUFBZSxBQUFDO0FBQzVELFlBQUksQUFBTSxTQUFHLEFBQUksS0FBQyxBQUFNLFNBQUcsSUFBSSxBQUFTLFVBQUMsQUFBTyxVQUFDLEFBQU0sT0FBQyxBQUFRLFNBQUMsQUFBUSxXQUFDLEFBQUssQUFBQyxBQUFDO0FBQ2pGLEFBQU0sZUFBQyxBQUFTLFlBQUcsVUFBUyxBQUFJO0FBQzNCLEFBQUksaUJBQUMsQUFBUyxVQUFDLEFBQUksQUFBQyxBQUN6QjtBQUFDLEFBQUM7QUFDRixBQUFNLGVBQUMsQUFBTSxTQUFHO0FBQ1osQUFBTSxtQkFBQyxBQUFVLGFBQUcsQUFBYSxBQUFDO0FBQ2xDLEFBQVcsd0JBQUMsQ0FBQyxBQUFXLEFBQUMsQUFBQyxBQUFDLEFBQy9CO0FBQUM7QUFFRCxBQUFNLGVBQUMsQUFBTyxVQUFHLFVBQVMsQUFBZTtBQUNyQyxBQUFXLHdCQUFDLENBQUMsQUFBYyxnQkFBQyxBQUFHLElBQUMsQUFBSSxBQUFDLEFBQUMsQUFBQyxBQUMzQztBQUFDO0FBRUQsQUFBTSxlQUFDLEFBQVMsWUFBRyxVQUFTLEFBQUs7QUFDN0IsZ0JBQUksQUFBQztBQUNELG9CQUFJLEFBQUMsSUFBRyxBQUFJLEtBQUMsQUFBUyxVQUFDLEFBQWUsZ0JBQUMsQUFBUSxTQUFDLEFBQU8sUUFBQyxBQUFNLE9BQUMsSUFBSSxBQUFVLFdBQUMsQUFBSyxNQUFDLEFBQUksQUFBQyxBQUFDLEFBQUMsQUFBQztBQUM1RixBQUFXLDRCQUFDLENBQUMsQUFBUyxXQUFDLEFBQUMsQUFBQyxBQUFDLEFBQUMsQUFDL0I7QUFBQyxjQUFDLEFBQUssQUFBQyxPQUFDLEFBQUMsQUFBQyxHQUFDLEFBQUM7QUFDVCxBQUFFLEFBQUMsb0JBQUMsQUFBQyxhQUFZLEFBQVEsU0FBQyxBQUFJLEtBQUMsQUFBYSxBQUFDLGVBQUMsQUFBQztBQUMzQyxBQUFPLDRCQUFDLEFBQUcsSUFBQyxBQUFDLEFBQUMsQUFBQyxBQUNuQjtBQUFDLEFBQUMsQUFBSSx1QkFBQyxBQUFDO0FBQ0osQUFBTyw0QkFBQyxBQUFHLElBQUMsQUFBTyxTQUFDLEFBQUMsQUFBQyxBQUFDLEFBQzNCO0FBQUMsQUFDTDtBQUFDLEFBRUw7QUFBQyxBQUNMO0FBQUM7QUFFTSxxQkFBUyxZQUFoQixVQUFpQixBQUFLO0FBQ2xCLEFBQU0sZ0JBQUMsQUFBSyxNQUFDLEFBQUksS0FBQyxBQUFDLEFBQUMsQUFBQyxBQUFDO0FBQ2xCLGlCQUFLLEFBQVM7QUFDVixvQkFBSSxBQUFPLFVBQW1DLEFBQUksS0FBQyxBQUFTLFVBQUMsQUFBZSxnQkFBQyxBQUFVLFdBQUMsQUFBSyxNQUFDLEFBQUksS0FBQyxBQUFDLEFBQUMsQUFBQyxBQUFDO0FBQ3ZHLEFBQUkscUJBQUMsQUFBSSxLQUFDLEFBQU8sQUFBQyxBQUFDO0FBQ3ZCLEFBQUssQUFBQyxBQUNWLEFBQUMsQUFDTDs7QUFBQztBQUFBLEFBQUM7QUFFTSxxQkFBSSxPQUFaLFVBQWEsQUFBdUM7QUFDaEQsWUFBSSxBQUFJLE9BQUcsQUFBSSxLQUFDLEFBQU8sUUFBQyxBQUFNLE9BQUMsQUFBTyxBQUFDLFNBQUMsQUFBTSxBQUFFLEFBQUM7QUFDakQsQUFBSSxhQUFDLEFBQU0sT0FBQyxBQUFJLEtBQUMsQUFBSSxBQUFDLEFBQUMsQUFDM0I7QUFBQztBQUNMLFdBQUEsQUFBQztBQWpERCxBQWlEQztBQUVELElBQUksQUFBTSxTQUFXLElBQUksQUFBTSxPQUFDLEFBQUksQUFBQyxBQUFDO0FBQ3RDLGlCQUFTLEFBQU0sQUFBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBhc1Byb21pc2U7XHJcblxyXG4vKipcclxuICogQ2FsbGJhY2sgYXMgdXNlZCBieSB7QGxpbmsgdXRpbC5hc1Byb21pc2V9LlxyXG4gKiBAdHlwZWRlZiBhc1Byb21pc2VDYWxsYmFja1xyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7RXJyb3J8bnVsbH0gZXJyb3IgRXJyb3IsIGlmIGFueVxyXG4gKiBAcGFyYW0gey4uLip9IHBhcmFtcyBBZGRpdGlvbmFsIGFyZ3VtZW50c1xyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSBmcm9tIGEgbm9kZS1zdHlsZSBjYWxsYmFjayBmdW5jdGlvbi5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHBhcmFtIHthc1Byb21pc2VDYWxsYmFja30gZm4gRnVuY3Rpb24gdG8gY2FsbFxyXG4gKiBAcGFyYW0geyp9IGN0eCBGdW5jdGlvbiBjb250ZXh0XHJcbiAqIEBwYXJhbSB7Li4uKn0gcGFyYW1zIEZ1bmN0aW9uIGFyZ3VtZW50c1xyXG4gKiBAcmV0dXJucyB7UHJvbWlzZTwqPn0gUHJvbWlzaWZpZWQgZnVuY3Rpb25cclxuICovXHJcbmZ1bmN0aW9uIGFzUHJvbWlzZShmbiwgY3R4LyosIHZhcmFyZ3MgKi8pIHtcclxuICAgIHZhciBwYXJhbXMgID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKSxcclxuICAgICAgICBvZmZzZXQgID0gMCxcclxuICAgICAgICBpbmRleCAgID0gMixcclxuICAgICAgICBwZW5kaW5nID0gdHJ1ZTtcclxuICAgIHdoaWxlIChpbmRleCA8IGFyZ3VtZW50cy5sZW5ndGgpXHJcbiAgICAgICAgcGFyYW1zW29mZnNldCsrXSA9IGFyZ3VtZW50c1tpbmRleCsrXTtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiBleGVjdXRvcihyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBwYXJhbXNbb2Zmc2V0XSA9IGZ1bmN0aW9uIGNhbGxiYWNrKGVyci8qLCB2YXJhcmdzICovKSB7XHJcbiAgICAgICAgICAgIGlmIChwZW5kaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBwZW5kaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKVxyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG9mZnNldCA8IHBhcmFtcy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtc1tvZmZzZXQrK10gPSBhcmd1bWVudHNbb2Zmc2V0XTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlLmFwcGx5KG51bGwsIHBhcmFtcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGZuLmFwcGx5KGN0eCB8fCBudWxsLCBwYXJhbXMpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBpZiAocGVuZGluZykge1xyXG4gICAgICAgICAgICAgICAgcGVuZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8qKlxyXG4gKiBBIG1pbmltYWwgYmFzZTY0IGltcGxlbWVudGF0aW9uIGZvciBudW1iZXIgYXJyYXlzLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAbmFtZXNwYWNlXHJcbiAqL1xyXG52YXIgYmFzZTY0ID0gZXhwb3J0cztcclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBieXRlIGxlbmd0aCBvZiBhIGJhc2U2NCBlbmNvZGVkIHN0cmluZy5cclxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBCYXNlNjQgZW5jb2RlZCBzdHJpbmdcclxuICogQHJldHVybnMge251bWJlcn0gQnl0ZSBsZW5ndGhcclxuICovXHJcbmJhc2U2NC5sZW5ndGggPSBmdW5jdGlvbiBsZW5ndGgoc3RyaW5nKSB7XHJcbiAgICB2YXIgcCA9IHN0cmluZy5sZW5ndGg7XHJcbiAgICBpZiAoIXApXHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICB2YXIgbiA9IDA7XHJcbiAgICB3aGlsZSAoLS1wICUgNCA+IDEgJiYgc3RyaW5nLmNoYXJBdChwKSA9PT0gXCI9XCIpXHJcbiAgICAgICAgKytuO1xyXG4gICAgcmV0dXJuIE1hdGguY2VpbChzdHJpbmcubGVuZ3RoICogMykgLyA0IC0gbjtcclxufTtcclxuXHJcbi8vIEJhc2U2NCBlbmNvZGluZyB0YWJsZVxyXG52YXIgYjY0ID0gbmV3IEFycmF5KDY0KTtcclxuXHJcbi8vIEJhc2U2NCBkZWNvZGluZyB0YWJsZVxyXG52YXIgczY0ID0gbmV3IEFycmF5KDEyMyk7XHJcblxyXG4vLyA2NS4uOTAsIDk3Li4xMjIsIDQ4Li41NywgNDMsIDQ3XHJcbmZvciAodmFyIGkgPSAwOyBpIDwgNjQ7KVxyXG4gICAgczY0W2I2NFtpXSA9IGkgPCAyNiA/IGkgKyA2NSA6IGkgPCA1MiA/IGkgKyA3MSA6IGkgPCA2MiA/IGkgLSA0IDogaSAtIDU5IHwgNDNdID0gaSsrO1xyXG5cclxuLyoqXHJcbiAqIEVuY29kZXMgYSBidWZmZXIgdG8gYSBiYXNlNjQgZW5jb2RlZCBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmZmVyIFNvdXJjZSBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IFNvdXJjZSBzdGFydFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZW5kIFNvdXJjZSBlbmRcclxuICogQHJldHVybnMge3N0cmluZ30gQmFzZTY0IGVuY29kZWQgc3RyaW5nXHJcbiAqL1xyXG5iYXNlNjQuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKGJ1ZmZlciwgc3RhcnQsIGVuZCkge1xyXG4gICAgdmFyIHN0cmluZyA9IFtdOyAvLyBhbHQ6IG5ldyBBcnJheShNYXRoLmNlaWwoKGVuZCAtIHN0YXJ0KSAvIDMpICogNCk7XHJcbiAgICB2YXIgaSA9IDAsIC8vIG91dHB1dCBpbmRleFxyXG4gICAgICAgIGogPSAwLCAvLyBnb3RvIGluZGV4XHJcbiAgICAgICAgdDsgICAgIC8vIHRlbXBvcmFyeVxyXG4gICAgd2hpbGUgKHN0YXJ0IDwgZW5kKSB7XHJcbiAgICAgICAgdmFyIGIgPSBidWZmZXJbc3RhcnQrK107XHJcbiAgICAgICAgc3dpdGNoIChqKSB7XHJcbiAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgIHN0cmluZ1tpKytdID0gYjY0W2IgPj4gMl07XHJcbiAgICAgICAgICAgICAgICB0ID0gKGIgJiAzKSA8PCA0O1xyXG4gICAgICAgICAgICAgICAgaiA9IDE7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgc3RyaW5nW2krK10gPSBiNjRbdCB8IGIgPj4gNF07XHJcbiAgICAgICAgICAgICAgICB0ID0gKGIgJiAxNSkgPDwgMjtcclxuICAgICAgICAgICAgICAgIGogPSAyO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgIHN0cmluZ1tpKytdID0gYjY0W3QgfCBiID4+IDZdO1xyXG4gICAgICAgICAgICAgICAgc3RyaW5nW2krK10gPSBiNjRbYiAmIDYzXTtcclxuICAgICAgICAgICAgICAgIGogPSAwO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGopIHtcclxuICAgICAgICBzdHJpbmdbaSsrXSA9IGI2NFt0XTtcclxuICAgICAgICBzdHJpbmdbaSAgXSA9IDYxO1xyXG4gICAgICAgIGlmIChqID09PSAxKVxyXG4gICAgICAgICAgICBzdHJpbmdbaSArIDFdID0gNjE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIHN0cmluZyk7XHJcbn07XHJcblxyXG52YXIgaW52YWxpZEVuY29kaW5nID0gXCJpbnZhbGlkIGVuY29kaW5nXCI7XHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIGJhc2U2NCBlbmNvZGVkIHN0cmluZyB0byBhIGJ1ZmZlci5cclxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBTb3VyY2Ugc3RyaW5nXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmZmVyIERlc3RpbmF0aW9uIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gb2Zmc2V0IERlc3RpbmF0aW9uIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBOdW1iZXIgb2YgYnl0ZXMgd3JpdHRlblxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgZW5jb2RpbmcgaXMgaW52YWxpZFxyXG4gKi9cclxuYmFzZTY0LmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShzdHJpbmcsIGJ1ZmZlciwgb2Zmc2V0KSB7XHJcbiAgICB2YXIgc3RhcnQgPSBvZmZzZXQ7XHJcbiAgICB2YXIgaiA9IDAsIC8vIGdvdG8gaW5kZXhcclxuICAgICAgICB0OyAgICAgLy8gdGVtcG9yYXJ5XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7KSB7XHJcbiAgICAgICAgdmFyIGMgPSBzdHJpbmcuY2hhckNvZGVBdChpKyspO1xyXG4gICAgICAgIGlmIChjID09PSA2MSAmJiBqID4gMSlcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgaWYgKChjID0gczY0W2NdKSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihpbnZhbGlkRW5jb2RpbmcpO1xyXG4gICAgICAgIHN3aXRjaCAoaikge1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICB0ID0gYztcclxuICAgICAgICAgICAgICAgIGogPSAxO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSB0IDw8IDIgfCAoYyAmIDQ4KSA+PiA0O1xyXG4gICAgICAgICAgICAgICAgdCA9IGM7XHJcbiAgICAgICAgICAgICAgICBqID0gMjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gKHQgJiAxNSkgPDwgNCB8IChjICYgNjApID4+IDI7XHJcbiAgICAgICAgICAgICAgICB0ID0gYztcclxuICAgICAgICAgICAgICAgIGogPSAzO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSAodCAmIDMpIDw8IDYgfCBjO1xyXG4gICAgICAgICAgICAgICAgaiA9IDA7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoaiA9PT0gMSlcclxuICAgICAgICB0aHJvdyBFcnJvcihpbnZhbGlkRW5jb2RpbmcpO1xyXG4gICAgcmV0dXJuIG9mZnNldCAtIHN0YXJ0O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRlc3RzIGlmIHRoZSBzcGVjaWZpZWQgc3RyaW5nIGFwcGVhcnMgdG8gYmUgYmFzZTY0IGVuY29kZWQuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgU3RyaW5nIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiBwcm9iYWJseSBiYXNlNjQgZW5jb2RlZCwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5iYXNlNjQudGVzdCA9IGZ1bmN0aW9uIHRlc3Qoc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gL14oPzpbQS1aYS16MC05Ky9dezR9KSooPzpbQS1aYS16MC05Ky9dezJ9PT18W0EtWmEtejAtOSsvXXszfT0pPyQvLnRlc3Qoc3RyaW5nKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gY29kZWdlbjtcclxuXHJcbnZhciBibG9ja09wZW5SZSAgPSAvW3tbXSQvLFxyXG4gICAgYmxvY2tDbG9zZVJlID0gL15bfVxcXV0vLFxyXG4gICAgY2FzaW5nUmUgICAgID0gLzokLyxcclxuICAgIGJyYW5jaFJlICAgICA9IC9eXFxzKig/OmlmfH0/ZWxzZSBpZnx3aGlsZXxmb3IpXFxifFxcYig/OmVsc2UpXFxzKiQvLFxyXG4gICAgYnJlYWtSZSAgICAgID0gL1xcYig/OmJyZWFrfGNvbnRpbnVlKSg/OiBcXHcrKT87PyR8XlxccypyZXR1cm5cXGIvO1xyXG5cclxuLyoqXHJcbiAqIEEgY2xvc3VyZSBmb3IgZ2VuZXJhdGluZyBmdW5jdGlvbnMgcHJvZ3JhbW1hdGljYWxseS5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQG5hbWVzcGFjZVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHsuLi5zdHJpbmd9IHBhcmFtcyBGdW5jdGlvbiBwYXJhbWV0ZXIgbmFtZXNcclxuICogQHJldHVybnMge0NvZGVnZW59IENvZGVnZW4gaW5zdGFuY2VcclxuICogQHByb3BlcnR5IHtib29sZWFufSBzdXBwb3J0ZWQgV2hldGhlciBjb2RlIGdlbmVyYXRpb24gaXMgc3VwcG9ydGVkIGJ5IHRoZSBlbnZpcm9ubWVudC5cclxuICogQHByb3BlcnR5IHtib29sZWFufSB2ZXJib3NlPWZhbHNlIFdoZW4gc2V0IHRvIHRydWUsIGNvZGVnZW4gd2lsbCBsb2cgZ2VuZXJhdGVkIGNvZGUgdG8gY29uc29sZS4gVXNlZnVsIGZvciBkZWJ1Z2dpbmcuXHJcbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb24oc3RyaW5nLCAuLi4qKTpzdHJpbmd9IHNwcmludGYgVW5kZXJseWluZyBzcHJpbnRmIGltcGxlbWVudGF0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBjb2RlZ2VuKCkge1xyXG4gICAgdmFyIHBhcmFtcyA9IFtdLFxyXG4gICAgICAgIHNyYyAgICA9IFtdLFxyXG4gICAgICAgIGluZGVudCA9IDEsXHJcbiAgICAgICAgaW5DYXNlID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7KVxyXG4gICAgICAgIHBhcmFtcy5wdXNoKGFyZ3VtZW50c1tpKytdKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEEgY29kZWdlbiBpbnN0YW5jZSBhcyByZXR1cm5lZCBieSB7QGxpbmsgY29kZWdlbn0sIHRoYXQgYWxzbyBpcyBhIHNwcmludGYtbGlrZSBhcHBlbmRlciBmdW5jdGlvbi5cclxuICAgICAqIEB0eXBlZGVmIENvZGVnZW5cclxuICAgICAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtYXQgRm9ybWF0IHN0cmluZ1xyXG4gICAgICogQHBhcmFtIHsuLi4qfSBhcmdzIFJlcGxhY2VtZW50c1xyXG4gICAgICogQHJldHVybnMge0NvZGVnZW59IEl0c2VsZlxyXG4gICAgICogQHByb3BlcnR5IHtmdW5jdGlvbihzdHJpbmc9KTpzdHJpbmd9IHN0ciBTdHJpbmdpZmllcyB0aGUgc28gZmFyIGdlbmVyYXRlZCBmdW5jdGlvbiBzb3VyY2UuXHJcbiAgICAgKiBAcHJvcGVydHkge2Z1bmN0aW9uKHN0cmluZz0sIE9iamVjdD0pOmZ1bmN0aW9ufSBlb2YgRW5kcyBnZW5lcmF0aW9uIGFuZCBidWlsZHMgdGhlIGZ1bmN0aW9uIHdoaWxzdCBhcHBseWluZyBhIHNjb3BlLlxyXG4gICAgICovXHJcbiAgICAvKiovXHJcbiAgICBmdW5jdGlvbiBnZW4oKSB7XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBbXSxcclxuICAgICAgICAgICAgaSA9IDA7XHJcbiAgICAgICAgZm9yICg7IGkgPCBhcmd1bWVudHMubGVuZ3RoOylcclxuICAgICAgICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpKytdKTtcclxuICAgICAgICB2YXIgbGluZSA9IHNwcmludGYuYXBwbHkobnVsbCwgYXJncyk7XHJcbiAgICAgICAgdmFyIGxldmVsID0gaW5kZW50O1xyXG4gICAgICAgIGlmIChzcmMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHZhciBwcmV2ID0gc3JjW3NyYy5sZW5ndGggLSAxXTtcclxuXHJcbiAgICAgICAgICAgIC8vIGJsb2NrIG9wZW4gb3Igb25lIHRpbWUgYnJhbmNoXHJcbiAgICAgICAgICAgIGlmIChibG9ja09wZW5SZS50ZXN0KHByZXYpKVxyXG4gICAgICAgICAgICAgICAgbGV2ZWwgPSArK2luZGVudDsgLy8ga2VlcFxyXG4gICAgICAgICAgICBlbHNlIGlmIChicmFuY2hSZS50ZXN0KHByZXYpKVxyXG4gICAgICAgICAgICAgICAgKytsZXZlbDsgLy8gb25jZVxyXG5cclxuICAgICAgICAgICAgLy8gY2FzaW5nXHJcbiAgICAgICAgICAgIGlmIChjYXNpbmdSZS50ZXN0KHByZXYpICYmICFjYXNpbmdSZS50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXZlbCA9ICsraW5kZW50O1xyXG4gICAgICAgICAgICAgICAgaW5DYXNlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChpbkNhc2UgJiYgYnJlYWtSZS50ZXN0KHByZXYpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXZlbCA9IC0taW5kZW50O1xyXG4gICAgICAgICAgICAgICAgaW5DYXNlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGJsb2NrIGNsb3NlXHJcbiAgICAgICAgICAgIGlmIChibG9ja0Nsb3NlUmUudGVzdChsaW5lKSlcclxuICAgICAgICAgICAgICAgIGxldmVsID0gLS1pbmRlbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZXZlbDsgKytpKVxyXG4gICAgICAgICAgICBsaW5lID0gXCJcXHRcIiArIGxpbmU7XHJcbiAgICAgICAgc3JjLnB1c2gobGluZSk7XHJcbiAgICAgICAgcmV0dXJuIGdlbjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFN0cmluZ2lmaWVzIHRoZSBzbyBmYXIgZ2VuZXJhdGVkIGZ1bmN0aW9uIHNvdXJjZS5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbbmFtZV0gRnVuY3Rpb24gbmFtZSwgZGVmYXVsdHMgdG8gZ2VuZXJhdGUgYW4gYW5vbnltb3VzIGZ1bmN0aW9uXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGdW5jdGlvbiBzb3VyY2UgdXNpbmcgdGFicyBmb3IgaW5kZW50YXRpb25cclxuICAgICAqIEBpbm5lclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBzdHIobmFtZSkge1xyXG4gICAgICAgIHJldHVybiBcImZ1bmN0aW9uXCIgKyAobmFtZSA/IFwiIFwiICsgbmFtZS5yZXBsYWNlKC9bXlxcd18kXS9nLCBcIl9cIikgOiBcIlwiKSArIFwiKFwiICsgcGFyYW1zLmpvaW4oXCIsXCIpICsgXCIpIHtcXG5cIiArIHNyYy5qb2luKFwiXFxuXCIpICsgXCJcXG59XCI7XHJcbiAgICB9XHJcblxyXG4gICAgZ2VuLnN0ciA9IHN0cjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEVuZHMgZ2VuZXJhdGlvbiBhbmQgYnVpbGRzIHRoZSBmdW5jdGlvbiB3aGlsc3QgYXBwbHlpbmcgYSBzY29wZS5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbbmFtZV0gRnVuY3Rpb24gbmFtZSwgZGVmYXVsdHMgdG8gZ2VuZXJhdGUgYW4gYW5vbnltb3VzIGZ1bmN0aW9uXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBbc2NvcGVdIEZ1bmN0aW9uIHNjb3BlXHJcbiAgICAgKiBAcmV0dXJucyB7ZnVuY3Rpb259IFRoZSBnZW5lcmF0ZWQgZnVuY3Rpb24sIHdpdGggc2NvcGUgYXBwbGllZCBpZiBzcGVjaWZpZWRcclxuICAgICAqIEBpbm5lclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBlb2YobmFtZSwgc2NvcGUpIHtcclxuICAgICAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICAgICAgc2NvcGUgPSBuYW1lO1xyXG4gICAgICAgICAgICBuYW1lID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc291cmNlID0gZ2VuLnN0cihuYW1lKTtcclxuICAgICAgICBpZiAoY29kZWdlbi52ZXJib3NlKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLSBjb2RlZ2VuIC0tLVxcblwiICsgc291cmNlLnJlcGxhY2UoL14vbWcsIFwiPiBcIikucmVwbGFjZSgvXFx0L2csIFwiICBcIikpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcclxuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHNjb3BlIHx8IChzY29wZSA9IHt9KSk7XHJcbiAgICAgICAgcmV0dXJuIEZ1bmN0aW9uLmFwcGx5KG51bGwsIGtleXMuY29uY2F0KFwicmV0dXJuIFwiICsgc291cmNlKSkuYXBwbHkobnVsbCwga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBzY29wZVtrZXldOyB9KSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbmV3LWZ1bmNcclxuICAgICAgICAvLyAgICAgXiBDcmVhdGVzIGEgd3JhcHBlciBmdW5jdGlvbiB3aXRoIHRoZSBzY29wZWQgdmFyaWFibGUgbmFtZXMgYXMgaXRzIHBhcmFtZXRlcnMsXHJcbiAgICAgICAgLy8gICAgICAgY2FsbHMgaXQgd2l0aCB0aGUgcmVzcGVjdGl2ZSBzY29wZWQgdmFyaWFibGUgdmFsdWVzIF5cclxuICAgICAgICAvLyAgICAgICBhbmQgcmV0dXJucyBvdXIgYnJhbmQtbmV3IHByb3Blcmx5IHNjb3BlZCBmdW5jdGlvbi5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIFRoaXMgd29ya3MgYmVjYXVzZSBcIkludm9raW5nIHRoZSBGdW5jdGlvbiBjb25zdHJ1Y3RvciBhcyBhIGZ1bmN0aW9uICh3aXRob3V0IHVzaW5nIHRoZVxyXG4gICAgICAgIC8vIG5ldyBvcGVyYXRvcikgaGFzIHRoZSBzYW1lIGVmZmVjdCBhcyBpbnZva2luZyBpdCBhcyBhIGNvbnN0cnVjdG9yLlwiXHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZGUvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRnVuY3Rpb25cclxuICAgIH1cclxuXHJcbiAgICBnZW4uZW9mID0gZW9mO1xyXG5cclxuICAgIHJldHVybiBnZW47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNwcmludGYoZm9ybWF0KSB7XHJcbiAgICB2YXIgYXJncyA9IFtdLFxyXG4gICAgICAgIGkgPSAxO1xyXG4gICAgZm9yICg7IGkgPCBhcmd1bWVudHMubGVuZ3RoOylcclxuICAgICAgICBhcmdzLnB1c2goYXJndW1lbnRzW2krK10pO1xyXG4gICAgaSA9IDA7XHJcbiAgICBmb3JtYXQgPSBmb3JtYXQucmVwbGFjZSgvJShbZGZqc10pL2csIGZ1bmN0aW9uKCQwLCAkMSkge1xyXG4gICAgICAgIHN3aXRjaCAoJDEpIHtcclxuICAgICAgICAgICAgY2FzZSBcImRcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKGFyZ3NbaSsrXSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJmXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJqXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhcmdzW2krK107XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBpZiAoaSAhPT0gYXJncy5sZW5ndGgpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJhcmd1bWVudCBjb3VudCBtaXNtYXRjaFwiKTtcclxuICAgIHJldHVybiBmb3JtYXQ7XHJcbn1cclxuXHJcbmNvZGVnZW4uc3ByaW50ZiAgID0gc3ByaW50ZjtcclxuY29kZWdlbi5zdXBwb3J0ZWQgPSBmYWxzZTsgdHJ5IHsgY29kZWdlbi5zdXBwb3J0ZWQgPSBjb2RlZ2VuKFwiYVwiLFwiYlwiKShcInJldHVybiBhLWJcIikuZW9mKCkoMiwxKSA9PT0gMTsgfSBjYXRjaCAoZSkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eVxyXG5jb2RlZ2VuLnZlcmJvc2UgICA9IGZhbHNlO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBldmVudCBlbWl0dGVyIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIEEgbWluaW1hbCBldmVudCBlbWl0dGVyLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlZ2lzdGVyZWQgbGlzdGVuZXJzLlxyXG4gICAgICogQHR5cGUge09iamVjdC48c3RyaW5nLCo+fVxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgdGhpcy5fbGlzdGVuZXJzID0ge307XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZWdpc3RlcnMgYW4gZXZlbnQgbGlzdGVuZXIuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBldnQgRXZlbnQgbmFtZVxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiBMaXN0ZW5lclxyXG4gKiBAcGFyYW0geyp9IFtjdHhdIExpc3RlbmVyIGNvbnRleHRcclxuICogQHJldHVybnMge3V0aWwuRXZlbnRFbWl0dGVyfSBgdGhpc2BcclxuICovXHJcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbihldnQsIGZuLCBjdHgpIHtcclxuICAgICh0aGlzLl9saXN0ZW5lcnNbZXZ0XSB8fCAodGhpcy5fbGlzdGVuZXJzW2V2dF0gPSBbXSkpLnB1c2goe1xyXG4gICAgICAgIGZuICA6IGZuLFxyXG4gICAgICAgIGN0eCA6IGN0eCB8fCB0aGlzXHJcbiAgICB9KTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbW92ZXMgYW4gZXZlbnQgbGlzdGVuZXIgb3IgYW55IG1hdGNoaW5nIGxpc3RlbmVycyBpZiBhcmd1bWVudHMgYXJlIG9taXR0ZWQuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZXZ0XSBFdmVudCBuYW1lLiBSZW1vdmVzIGFsbCBsaXN0ZW5lcnMgaWYgb21pdHRlZC5cclxuICogQHBhcmFtIHtmdW5jdGlvbn0gW2ZuXSBMaXN0ZW5lciB0byByZW1vdmUuIFJlbW92ZXMgYWxsIGxpc3RlbmVycyBvZiBgZXZ0YCBpZiBvbWl0dGVkLlxyXG4gKiBAcmV0dXJucyB7dXRpbC5FdmVudEVtaXR0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiBvZmYoZXZ0LCBmbikge1xyXG4gICAgaWYgKGV2dCA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgIHRoaXMuX2xpc3RlbmVycyA9IHt9O1xyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldnRdID0gW107XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnNbZXZ0XTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOylcclxuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnNbaV0uZm4gPT09IGZuKVxyXG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEVtaXRzIGFuIGV2ZW50IGJ5IGNhbGxpbmcgaXRzIGxpc3RlbmVycyB3aXRoIHRoZSBzcGVjaWZpZWQgYXJndW1lbnRzLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZXZ0IEV2ZW50IG5hbWVcclxuICogQHBhcmFtIHsuLi4qfSBhcmdzIEFyZ3VtZW50c1xyXG4gKiBAcmV0dXJucyB7dXRpbC5FdmVudEVtaXR0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdChldnQpIHtcclxuICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnNbZXZ0XTtcclxuICAgIGlmIChsaXN0ZW5lcnMpIHtcclxuICAgICAgICB2YXIgYXJncyA9IFtdLFxyXG4gICAgICAgICAgICBpID0gMTtcclxuICAgICAgICBmb3IgKDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7KVxyXG4gICAgICAgICAgICBhcmdzLnB1c2goYXJndW1lbnRzW2krK10pO1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOylcclxuICAgICAgICAgICAgbGlzdGVuZXJzW2ldLmZuLmFwcGx5KGxpc3RlbmVyc1tpKytdLmN0eCwgYXJncyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gZmV0Y2g7XHJcblxyXG52YXIgYXNQcm9taXNlID0gcmVxdWlyZShcIkBwcm90b2J1ZmpzL2FzcHJvbWlzZVwiKSxcclxuICAgIGlucXVpcmUgICA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9pbnF1aXJlXCIpO1xyXG5cclxudmFyIGZzID0gaW5xdWlyZShcImZzXCIpO1xyXG5cclxuLyoqXHJcbiAqIE5vZGUtc3R5bGUgY2FsbGJhY2sgYXMgdXNlZCBieSB7QGxpbmsgdXRpbC5mZXRjaH0uXHJcbiAqIEB0eXBlZGVmIEZldGNoQ2FsbGJhY2tcclxuICogQHR5cGUge2Z1bmN0aW9ufVxyXG4gKiBAcGFyYW0gez9FcnJvcn0gZXJyb3IgRXJyb3IsIGlmIGFueSwgb3RoZXJ3aXNlIGBudWxsYFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvbnRlbnRzXSBGaWxlIGNvbnRlbnRzLCBpZiB0aGVyZSBoYXNuJ3QgYmVlbiBhbiBlcnJvclxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBPcHRpb25zIGFzIHVzZWQgYnkge0BsaW5rIHV0aWwuZmV0Y2h9LlxyXG4gKiBAdHlwZWRlZiBGZXRjaE9wdGlvbnNcclxuICogQHR5cGUge09iamVjdH1cclxuICogQHByb3BlcnR5IHtib29sZWFufSBbYmluYXJ5PWZhbHNlXSBXaGV0aGVyIGV4cGVjdGluZyBhIGJpbmFyeSByZXNwb25zZVxyXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFt4aHI9ZmFsc2VdIElmIGB0cnVlYCwgZm9yY2VzIHRoZSB1c2Ugb2YgWE1MSHR0cFJlcXVlc3RcclxuICovXHJcblxyXG4vKipcclxuICogRmV0Y2hlcyB0aGUgY29udGVudHMgb2YgYSBmaWxlLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgRmlsZSBwYXRoIG9yIHVybFxyXG4gKiBAcGFyYW0ge0ZldGNoT3B0aW9uc30gb3B0aW9ucyBGZXRjaCBvcHRpb25zXHJcbiAqIEBwYXJhbSB7RmV0Y2hDYWxsYmFja30gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb25cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcbmZ1bmN0aW9uIGZldGNoKGZpbGVuYW1lLCBvcHRpb25zLCBjYWxsYmFjaykge1xyXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XHJcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xyXG4gICAgfSBlbHNlIGlmICghb3B0aW9ucylcclxuICAgICAgICBvcHRpb25zID0ge307XHJcblxyXG4gICAgaWYgKCFjYWxsYmFjaylcclxuICAgICAgICByZXR1cm4gYXNQcm9taXNlKGZldGNoLCB0aGlzLCBmaWxlbmFtZSwgb3B0aW9ucyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8taW52YWxpZC10aGlzXHJcblxyXG4gICAgLy8gaWYgYSBub2RlLWxpa2UgZmlsZXN5c3RlbSBpcyBwcmVzZW50LCB0cnkgaXQgZmlyc3QgYnV0IGZhbGwgYmFjayB0byBYSFIgaWYgbm90aGluZyBpcyBmb3VuZC5cclxuICAgIGlmICghb3B0aW9ucy54aHIgJiYgZnMgJiYgZnMucmVhZEZpbGUpXHJcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlKGZpbGVuYW1lLCBmdW5jdGlvbiBmZXRjaFJlYWRGaWxlQ2FsbGJhY2soZXJyLCBjb250ZW50cykge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyICYmIHR5cGVvZiBYTUxIdHRwUmVxdWVzdCAhPT0gXCJ1bmRlZmluZWRcIlxyXG4gICAgICAgICAgICAgICAgPyBmZXRjaC54aHIoZmlsZW5hbWUsIG9wdGlvbnMsIGNhbGxiYWNrKVxyXG4gICAgICAgICAgICAgICAgOiBlcnJcclxuICAgICAgICAgICAgICAgID8gY2FsbGJhY2soZXJyKVxyXG4gICAgICAgICAgICAgICAgOiBjYWxsYmFjayhudWxsLCBvcHRpb25zLmJpbmFyeSA/IGNvbnRlbnRzIDogY29udGVudHMudG9TdHJpbmcoXCJ1dGY4XCIpKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAvLyB1c2UgdGhlIFhIUiB2ZXJzaW9uIG90aGVyd2lzZS5cclxuICAgIHJldHVybiBmZXRjaC54aHIoZmlsZW5hbWUsIG9wdGlvbnMsIGNhbGxiYWNrKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZldGNoZXMgdGhlIGNvbnRlbnRzIG9mIGEgZmlsZS5cclxuICogQG5hbWUgdXRpbC5mZXRjaFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggRmlsZSBwYXRoIG9yIHVybFxyXG4gKiBAcGFyYW0ge0ZldGNoQ2FsbGJhY2t9IGNhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEB2YXJpYXRpb24gMlxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBGZXRjaGVzIHRoZSBjb250ZW50cyBvZiBhIGZpbGUuXHJcbiAqIEBuYW1lIHV0aWwuZmV0Y2hcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIEZpbGUgcGF0aCBvciB1cmxcclxuICogQHBhcmFtIHtGZXRjaE9wdGlvbnN9IFtvcHRpb25zXSBGZXRjaCBvcHRpb25zXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPHN0cmluZ3xVaW50OEFycmF5Pn0gUHJvbWlzZVxyXG4gKiBAdmFyaWF0aW9uIDNcclxuICovXHJcblxyXG4vKiovXHJcbmZldGNoLnhociA9IGZ1bmN0aW9uIGZldGNoX3hocihmaWxlbmFtZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcclxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgLyogd29ya3MgZXZlcnl3aGVyZSAqLyA9IGZ1bmN0aW9uIGZldGNoT25SZWFkeVN0YXRlQ2hhbmdlKCkge1xyXG5cclxuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgIT09IDQpXHJcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgIC8vIGxvY2FsIGNvcnMgc2VjdXJpdHkgZXJyb3JzIHJldHVybiBzdGF0dXMgMCAvIGVtcHR5IHN0cmluZywgdG9vLiBhZmFpayB0aGlzIGNhbm5vdCBiZVxyXG4gICAgICAgIC8vIHJlbGlhYmx5IGRpc3Rpbmd1aXNoZWQgZnJvbSBhbiBhY3R1YWxseSBlbXB0eSBmaWxlIGZvciBzZWN1cml0eSByZWFzb25zLiBmZWVsIGZyZWVcclxuICAgICAgICAvLyB0byBzZW5kIGEgcHVsbCByZXF1ZXN0IGlmIHlvdSBhcmUgYXdhcmUgb2YgYSBzb2x1dGlvbi5cclxuICAgICAgICBpZiAoeGhyLnN0YXR1cyAhPT0gMCAmJiB4aHIuc3RhdHVzICE9PSAyMDApXHJcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhFcnJvcihcInN0YXR1cyBcIiArIHhoci5zdGF0dXMpKTtcclxuXHJcbiAgICAgICAgLy8gaWYgYmluYXJ5IGRhdGEgaXMgZXhwZWN0ZWQsIG1ha2Ugc3VyZSB0aGF0IHNvbWUgc29ydCBvZiBhcnJheSBpcyByZXR1cm5lZCwgZXZlbiBpZlxyXG4gICAgICAgIC8vIEFycmF5QnVmZmVycyBhcmUgbm90IHN1cHBvcnRlZC4gdGhlIGJpbmFyeSBzdHJpbmcgZmFsbGJhY2ssIGhvd2V2ZXIsIGlzIHVuc2FmZS5cclxuICAgICAgICBpZiAob3B0aW9ucy5iaW5hcnkpIHtcclxuICAgICAgICAgICAgdmFyIGJ1ZmZlciA9IHhoci5yZXNwb25zZTtcclxuICAgICAgICAgICAgaWYgKCFidWZmZXIpIHtcclxuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4aHIucmVzcG9uc2VUZXh0Lmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlci5wdXNoKHhoci5yZXNwb25zZVRleHQuY2hhckNvZGVBdChpKSAmIDI1NSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHR5cGVvZiBVaW50OEFycmF5ICE9PSBcInVuZGVmaW5lZFwiID8gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSA6IGJ1ZmZlcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCB4aHIucmVzcG9uc2VUZXh0KTtcclxuICAgIH07XHJcblxyXG4gICAgaWYgKG9wdGlvbnMuYmluYXJ5KSB7XHJcbiAgICAgICAgLy8gcmVmOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvWE1MSHR0cFJlcXVlc3QvU2VuZGluZ19hbmRfUmVjZWl2aW5nX0JpbmFyeV9EYXRhI1JlY2VpdmluZ19iaW5hcnlfZGF0YV9pbl9vbGRlcl9icm93c2Vyc1xyXG4gICAgICAgIGlmIChcIm92ZXJyaWRlTWltZVR5cGVcIiBpbiB4aHIpXHJcbiAgICAgICAgICAgIHhoci5vdmVycmlkZU1pbWVUeXBlKFwidGV4dC9wbGFpbjsgY2hhcnNldD14LXVzZXItZGVmaW5lZFwiKTtcclxuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gXCJhcnJheWJ1ZmZlclwiO1xyXG4gICAgfVxyXG5cclxuICAgIHhoci5vcGVuKFwiR0VUXCIsIGZpbGVuYW1lKTtcclxuICAgIHhoci5zZW5kKCk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KGZhY3RvcnkpO1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIC8gd3JpdGVzIGZsb2F0cyAvIGRvdWJsZXMgZnJvbSAvIHRvIGJ1ZmZlcnMuXHJcbiAqIEBuYW1lIHV0aWwuZmxvYXRcclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSAzMiBiaXQgZmxvYXQgdG8gYSBidWZmZXIgdXNpbmcgbGl0dGxlIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LndyaXRlRmxvYXRMRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbCBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZiBUYXJnZXQgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb3MgVGFyZ2V0IGJ1ZmZlciBvZmZzZXRcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgMzIgYml0IGZsb2F0IHRvIGEgYnVmZmVyIHVzaW5nIGJpZyBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC53cml0ZUZsb2F0QkVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgVGFyZ2V0IGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFRhcmdldCBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgMzIgYml0IGZsb2F0IGZyb20gYSBidWZmZXIgdXNpbmcgbGl0dGxlIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LnJlYWRGbG9hdExFXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZiBTb3VyY2UgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb3MgU291cmNlIGJ1ZmZlciBvZmZzZXRcclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIDMyIGJpdCBmbG9hdCBmcm9tIGEgYnVmZmVyIHVzaW5nIGJpZyBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC5yZWFkRmxvYXRCRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgU291cmNlIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFNvdXJjZSBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgNjQgYml0IGRvdWJsZSB0byBhIGJ1ZmZlciB1c2luZyBsaXR0bGUgZW5kaWFuIGJ5dGUgb3JkZXIuXHJcbiAqIEBuYW1lIHV0aWwuZmxvYXQud3JpdGVEb3VibGVMRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbCBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZiBUYXJnZXQgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb3MgVGFyZ2V0IGJ1ZmZlciBvZmZzZXRcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgNjQgYml0IGRvdWJsZSB0byBhIGJ1ZmZlciB1c2luZyBiaWcgZW5kaWFuIGJ5dGUgb3JkZXIuXHJcbiAqIEBuYW1lIHV0aWwuZmxvYXQud3JpdGVEb3VibGVCRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbCBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZiBUYXJnZXQgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb3MgVGFyZ2V0IGJ1ZmZlciBvZmZzZXRcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSA2NCBiaXQgZG91YmxlIGZyb20gYSBidWZmZXIgdXNpbmcgbGl0dGxlIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LnJlYWREb3VibGVMRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgU291cmNlIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFNvdXJjZSBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSA2NCBiaXQgZG91YmxlIGZyb20gYSBidWZmZXIgdXNpbmcgYmlnIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LnJlYWREb3VibGVCRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgU291cmNlIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFNvdXJjZSBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vLyBGYWN0b3J5IGZ1bmN0aW9uIGZvciB0aGUgcHVycG9zZSBvZiBub2RlLWJhc2VkIHRlc3RpbmcgaW4gbW9kaWZpZWQgZ2xvYmFsIGVudmlyb25tZW50c1xyXG5mdW5jdGlvbiBmYWN0b3J5KGV4cG9ydHMpIHtcclxuXHJcbiAgICAvLyBmbG9hdDogdHlwZWQgYXJyYXlcclxuICAgIGlmICh0eXBlb2YgRmxvYXQzMkFycmF5ICE9PSBcInVuZGVmaW5lZFwiKSAoZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBmMzIgPSBuZXcgRmxvYXQzMkFycmF5KFsgLTAgXSksXHJcbiAgICAgICAgICAgIGY4YiA9IG5ldyBVaW50OEFycmF5KGYzMi5idWZmZXIpLFxyXG4gICAgICAgICAgICBsZSAgPSBmOGJbM10gPT09IDEyODtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGVGbG9hdF9mMzJfY3B5KHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgZjMyWzBdID0gdmFsO1xyXG4gICAgICAgICAgICBidWZbcG9zICAgIF0gPSBmOGJbMF07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAxXSA9IGY4YlsxXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDJdID0gZjhiWzJdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgM10gPSBmOGJbM107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZUZsb2F0X2YzMl9yZXYodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmMzJbMF0gPSB2YWw7XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgICAgXSA9IGY4YlszXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDFdID0gZjhiWzJdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgMl0gPSBmOGJbMV07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAzXSA9IGY4YlswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy53cml0ZUZsb2F0TEUgPSBsZSA/IHdyaXRlRmxvYXRfZjMyX2NweSA6IHdyaXRlRmxvYXRfZjMyX3JldjtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMud3JpdGVGbG9hdEJFID0gbGUgPyB3cml0ZUZsb2F0X2YzMl9yZXYgOiB3cml0ZUZsb2F0X2YzMl9jcHk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRGbG9hdF9mMzJfY3B5KGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGY4YlswXSA9IGJ1Zltwb3MgICAgXTtcclxuICAgICAgICAgICAgZjhiWzFdID0gYnVmW3BvcyArIDFdO1xyXG4gICAgICAgICAgICBmOGJbMl0gPSBidWZbcG9zICsgMl07XHJcbiAgICAgICAgICAgIGY4YlszXSA9IGJ1Zltwb3MgKyAzXTtcclxuICAgICAgICAgICAgcmV0dXJuIGYzMlswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRGbG9hdF9mMzJfcmV2KGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGY4YlszXSA9IGJ1Zltwb3MgICAgXTtcclxuICAgICAgICAgICAgZjhiWzJdID0gYnVmW3BvcyArIDFdO1xyXG4gICAgICAgICAgICBmOGJbMV0gPSBidWZbcG9zICsgMl07XHJcbiAgICAgICAgICAgIGY4YlswXSA9IGJ1Zltwb3MgKyAzXTtcclxuICAgICAgICAgICAgcmV0dXJuIGYzMlswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRmxvYXRMRSA9IGxlID8gcmVhZEZsb2F0X2YzMl9jcHkgOiByZWFkRmxvYXRfZjMyX3JldjtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMucmVhZEZsb2F0QkUgPSBsZSA/IHJlYWRGbG9hdF9mMzJfcmV2IDogcmVhZEZsb2F0X2YzMl9jcHk7XHJcblxyXG4gICAgLy8gZmxvYXQ6IGllZWU3NTRcclxuICAgIH0pKCk7IGVsc2UgKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZUZsb2F0X2llZWU3NTQod3JpdGVVaW50LCB2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIHZhciBzaWduID0gdmFsIDwgMCA/IDEgOiAwO1xyXG4gICAgICAgICAgICBpZiAoc2lnbilcclxuICAgICAgICAgICAgICAgIHZhbCA9IC12YWw7XHJcbiAgICAgICAgICAgIGlmICh2YWwgPT09IDApXHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMSAvIHZhbCA+IDAgPyAvKiBwb3NpdGl2ZSAqLyAwIDogLyogbmVnYXRpdmUgMCAqLyAyMTQ3NDgzNjQ4LCBidWYsIHBvcyk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzTmFOKHZhbCkpXHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMjE0MzI4OTM0NCwgYnVmLCBwb3MpO1xyXG4gICAgICAgICAgICBlbHNlIGlmICh2YWwgPiAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KSAvLyArLUluZmluaXR5XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoKHNpZ24gPDwgMzEgfCAyMTM5MDk1MDQwKSA+Pj4gMCwgYnVmLCBwb3MpO1xyXG4gICAgICAgICAgICBlbHNlIGlmICh2YWwgPCAxLjE3NTQ5NDM1MDgyMjI4NzVlLTM4KSAvLyBkZW5vcm1hbFxyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KChzaWduIDw8IDMxIHwgTWF0aC5yb3VuZCh2YWwgLyAxLjQwMTI5ODQ2NDMyNDgxN2UtNDUpKSA+Pj4gMCwgYnVmLCBwb3MpO1xyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBleHBvbmVudCA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsKSAvIE1hdGguTE4yKSxcclxuICAgICAgICAgICAgICAgICAgICBtYW50aXNzYSA9IE1hdGgucm91bmQodmFsICogTWF0aC5wb3coMiwgLWV4cG9uZW50KSAqIDgzODg2MDgpICYgODM4ODYwNztcclxuICAgICAgICAgICAgICAgIHdyaXRlVWludCgoc2lnbiA8PCAzMSB8IGV4cG9uZW50ICsgMTI3IDw8IDIzIHwgbWFudGlzc2EpID4+PiAwLCBidWYsIHBvcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV4cG9ydHMud3JpdGVGbG9hdExFID0gd3JpdGVGbG9hdF9pZWVlNzU0LmJpbmQobnVsbCwgd3JpdGVVaW50TEUpO1xyXG4gICAgICAgIGV4cG9ydHMud3JpdGVGbG9hdEJFID0gd3JpdGVGbG9hdF9pZWVlNzU0LmJpbmQobnVsbCwgd3JpdGVVaW50QkUpO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkRmxvYXRfaWVlZTc1NChyZWFkVWludCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgdmFyIHVpbnQgPSByZWFkVWludChidWYsIHBvcyksXHJcbiAgICAgICAgICAgICAgICBzaWduID0gKHVpbnQgPj4gMzEpICogMiArIDEsXHJcbiAgICAgICAgICAgICAgICBleHBvbmVudCA9IHVpbnQgPj4+IDIzICYgMjU1LFxyXG4gICAgICAgICAgICAgICAgbWFudGlzc2EgPSB1aW50ICYgODM4ODYwNztcclxuICAgICAgICAgICAgcmV0dXJuIGV4cG9uZW50ID09PSAyNTVcclxuICAgICAgICAgICAgICAgID8gbWFudGlzc2FcclxuICAgICAgICAgICAgICAgID8gTmFOXHJcbiAgICAgICAgICAgICAgICA6IHNpZ24gKiBJbmZpbml0eVxyXG4gICAgICAgICAgICAgICAgOiBleHBvbmVudCA9PT0gMCAvLyBkZW5vcm1hbFxyXG4gICAgICAgICAgICAgICAgPyBzaWduICogMS40MDEyOTg0NjQzMjQ4MTdlLTQ1ICogbWFudGlzc2FcclxuICAgICAgICAgICAgICAgIDogc2lnbiAqIE1hdGgucG93KDIsIGV4cG9uZW50IC0gMTUwKSAqIChtYW50aXNzYSArIDgzODg2MDgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRmxvYXRMRSA9IHJlYWRGbG9hdF9pZWVlNzU0LmJpbmQobnVsbCwgcmVhZFVpbnRMRSk7XHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRmxvYXRCRSA9IHJlYWRGbG9hdF9pZWVlNzU0LmJpbmQobnVsbCwgcmVhZFVpbnRCRSk7XHJcblxyXG4gICAgfSkoKTtcclxuXHJcbiAgICAvLyBkb3VibGU6IHR5cGVkIGFycmF5XHJcbiAgICBpZiAodHlwZW9mIEZsb2F0NjRBcnJheSAhPT0gXCJ1bmRlZmluZWRcIikgKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICB2YXIgZjY0ID0gbmV3IEZsb2F0NjRBcnJheShbLTBdKSxcclxuICAgICAgICAgICAgZjhiID0gbmV3IFVpbnQ4QXJyYXkoZjY0LmJ1ZmZlciksXHJcbiAgICAgICAgICAgIGxlICA9IGY4Yls3XSA9PT0gMTI4O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZURvdWJsZV9mNjRfY3B5KHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgZjY0WzBdID0gdmFsO1xyXG4gICAgICAgICAgICBidWZbcG9zICAgIF0gPSBmOGJbMF07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAxXSA9IGY4YlsxXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDJdID0gZjhiWzJdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgM10gPSBmOGJbM107XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA0XSA9IGY4Yls0XTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDVdID0gZjhiWzVdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgNl0gPSBmOGJbNl07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA3XSA9IGY4Yls3XTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHdyaXRlRG91YmxlX2Y2NF9yZXYodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmNjRbMF0gPSB2YWw7XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgICAgXSA9IGY4Yls3XTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDFdID0gZjhiWzZdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgMl0gPSBmOGJbNV07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAzXSA9IGY4Yls0XTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDRdID0gZjhiWzNdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgNV0gPSBmOGJbMl07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA2XSA9IGY4YlsxXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDddID0gZjhiWzBdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBleHBvcnRzLndyaXRlRG91YmxlTEUgPSBsZSA/IHdyaXRlRG91YmxlX2Y2NF9jcHkgOiB3cml0ZURvdWJsZV9mNjRfcmV2O1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy53cml0ZURvdWJsZUJFID0gbGUgPyB3cml0ZURvdWJsZV9mNjRfcmV2IDogd3JpdGVEb3VibGVfZjY0X2NweTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVhZERvdWJsZV9mNjRfY3B5KGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGY4YlswXSA9IGJ1Zltwb3MgICAgXTtcclxuICAgICAgICAgICAgZjhiWzFdID0gYnVmW3BvcyArIDFdO1xyXG4gICAgICAgICAgICBmOGJbMl0gPSBidWZbcG9zICsgMl07XHJcbiAgICAgICAgICAgIGY4YlszXSA9IGJ1Zltwb3MgKyAzXTtcclxuICAgICAgICAgICAgZjhiWzRdID0gYnVmW3BvcyArIDRdO1xyXG4gICAgICAgICAgICBmOGJbNV0gPSBidWZbcG9zICsgNV07XHJcbiAgICAgICAgICAgIGY4Yls2XSA9IGJ1Zltwb3MgKyA2XTtcclxuICAgICAgICAgICAgZjhiWzddID0gYnVmW3BvcyArIDddO1xyXG4gICAgICAgICAgICByZXR1cm4gZjY0WzBdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVhZERvdWJsZV9mNjRfcmV2KGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGY4Yls3XSA9IGJ1Zltwb3MgICAgXTtcclxuICAgICAgICAgICAgZjhiWzZdID0gYnVmW3BvcyArIDFdO1xyXG4gICAgICAgICAgICBmOGJbNV0gPSBidWZbcG9zICsgMl07XHJcbiAgICAgICAgICAgIGY4Yls0XSA9IGJ1Zltwb3MgKyAzXTtcclxuICAgICAgICAgICAgZjhiWzNdID0gYnVmW3BvcyArIDRdO1xyXG4gICAgICAgICAgICBmOGJbMl0gPSBidWZbcG9zICsgNV07XHJcbiAgICAgICAgICAgIGY4YlsxXSA9IGJ1Zltwb3MgKyA2XTtcclxuICAgICAgICAgICAgZjhiWzBdID0gYnVmW3BvcyArIDddO1xyXG4gICAgICAgICAgICByZXR1cm4gZjY0WzBdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBleHBvcnRzLnJlYWREb3VibGVMRSA9IGxlID8gcmVhZERvdWJsZV9mNjRfY3B5IDogcmVhZERvdWJsZV9mNjRfcmV2O1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRG91YmxlQkUgPSBsZSA/IHJlYWREb3VibGVfZjY0X3JldiA6IHJlYWREb3VibGVfZjY0X2NweTtcclxuXHJcbiAgICAvLyBkb3VibGU6IGllZWU3NTRcclxuICAgIH0pKCk7IGVsc2UgKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZURvdWJsZV9pZWVlNzU0KHdyaXRlVWludCwgb2ZmMCwgb2ZmMSwgdmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgICAgICB2YXIgc2lnbiA9IHZhbCA8IDAgPyAxIDogMDtcclxuICAgICAgICAgICAgaWYgKHNpZ24pXHJcbiAgICAgICAgICAgICAgICB2YWwgPSAtdmFsO1xyXG4gICAgICAgICAgICBpZiAodmFsID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMCwgYnVmLCBwb3MgKyBvZmYwKTtcclxuICAgICAgICAgICAgICAgIHdyaXRlVWludCgxIC8gdmFsID4gMCA/IC8qIHBvc2l0aXZlICovIDAgOiAvKiBuZWdhdGl2ZSAwICovIDIxNDc0ODM2NDgsIGJ1ZiwgcG9zICsgb2ZmMSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNOYU4odmFsKSkge1xyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDAsIGJ1ZiwgcG9zICsgb2ZmMCk7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMjE0Njk1OTM2MCwgYnVmLCBwb3MgKyBvZmYxKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWwgPiAxLjc5NzY5MzEzNDg2MjMxNTdlKzMwOCkgeyAvLyArLUluZmluaXR5XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMCwgYnVmLCBwb3MgKyBvZmYwKTtcclxuICAgICAgICAgICAgICAgIHdyaXRlVWludCgoc2lnbiA8PCAzMSB8IDIxNDY0MzUwNzIpID4+PiAwLCBidWYsIHBvcyArIG9mZjEpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIG1hbnRpc3NhO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbCA8IDIuMjI1MDczODU4NTA3MjAxNGUtMzA4KSB7IC8vIGRlbm9ybWFsXHJcbiAgICAgICAgICAgICAgICAgICAgbWFudGlzc2EgPSB2YWwgLyA1ZS0zMjQ7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVVaW50KG1hbnRpc3NhID4+PiAwLCBidWYsIHBvcyArIG9mZjApO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlVWludCgoc2lnbiA8PCAzMSB8IG1hbnRpc3NhIC8gNDI5NDk2NzI5NikgPj4+IDAsIGJ1ZiwgcG9zICsgb2ZmMSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBleHBvbmVudCA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsKSAvIE1hdGguTE4yKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXhwb25lbnQgPT09IDEwMjQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9uZW50ID0gMTAyMztcclxuICAgICAgICAgICAgICAgICAgICBtYW50aXNzYSA9IHZhbCAqIE1hdGgucG93KDIsIC1leHBvbmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVVaW50KG1hbnRpc3NhICogNDUwMzU5OTYyNzM3MDQ5NiA+Pj4gMCwgYnVmLCBwb3MgKyBvZmYwKTtcclxuICAgICAgICAgICAgICAgICAgICB3cml0ZVVpbnQoKHNpZ24gPDwgMzEgfCBleHBvbmVudCArIDEwMjMgPDwgMjAgfCBtYW50aXNzYSAqIDEwNDg1NzYgJiAxMDQ4NTc1KSA+Pj4gMCwgYnVmLCBwb3MgKyBvZmYxKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXhwb3J0cy53cml0ZURvdWJsZUxFID0gd3JpdGVEb3VibGVfaWVlZTc1NC5iaW5kKG51bGwsIHdyaXRlVWludExFLCAwLCA0KTtcclxuICAgICAgICBleHBvcnRzLndyaXRlRG91YmxlQkUgPSB3cml0ZURvdWJsZV9pZWVlNzU0LmJpbmQobnVsbCwgd3JpdGVVaW50QkUsIDQsIDApO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkRG91YmxlX2llZWU3NTQocmVhZFVpbnQsIG9mZjAsIG9mZjEsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIHZhciBsbyA9IHJlYWRVaW50KGJ1ZiwgcG9zICsgb2ZmMCksXHJcbiAgICAgICAgICAgICAgICBoaSA9IHJlYWRVaW50KGJ1ZiwgcG9zICsgb2ZmMSk7XHJcbiAgICAgICAgICAgIHZhciBzaWduID0gKGhpID4+IDMxKSAqIDIgKyAxLFxyXG4gICAgICAgICAgICAgICAgZXhwb25lbnQgPSBoaSA+Pj4gMjAgJiAyMDQ3LFxyXG4gICAgICAgICAgICAgICAgbWFudGlzc2EgPSA0Mjk0OTY3Mjk2ICogKGhpICYgMTA0ODU3NSkgKyBsbztcclxuICAgICAgICAgICAgcmV0dXJuIGV4cG9uZW50ID09PSAyMDQ3XHJcbiAgICAgICAgICAgICAgICA/IG1hbnRpc3NhXHJcbiAgICAgICAgICAgICAgICA/IE5hTlxyXG4gICAgICAgICAgICAgICAgOiBzaWduICogSW5maW5pdHlcclxuICAgICAgICAgICAgICAgIDogZXhwb25lbnQgPT09IDAgLy8gZGVub3JtYWxcclxuICAgICAgICAgICAgICAgID8gc2lnbiAqIDVlLTMyNCAqIG1hbnRpc3NhXHJcbiAgICAgICAgICAgICAgICA6IHNpZ24gKiBNYXRoLnBvdygyLCBleHBvbmVudCAtIDEwNzUpICogKG1hbnRpc3NhICsgNDUwMzU5OTYyNzM3MDQ5Nik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBleHBvcnRzLnJlYWREb3VibGVMRSA9IHJlYWREb3VibGVfaWVlZTc1NC5iaW5kKG51bGwsIHJlYWRVaW50TEUsIDAsIDQpO1xyXG4gICAgICAgIGV4cG9ydHMucmVhZERvdWJsZUJFID0gcmVhZERvdWJsZV9pZWVlNzU0LmJpbmQobnVsbCwgcmVhZFVpbnRCRSwgNCwgMCk7XHJcblxyXG4gICAgfSkoKTtcclxuXHJcbiAgICByZXR1cm4gZXhwb3J0cztcclxufVxyXG5cclxuLy8gdWludCBoZWxwZXJzXHJcblxyXG5mdW5jdGlvbiB3cml0ZVVpbnRMRSh2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICBidWZbcG9zICAgIF0gPSAgdmFsICAgICAgICAmIDI1NTtcclxuICAgIGJ1Zltwb3MgKyAxXSA9ICB2YWwgPj4+IDggICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDJdID0gIHZhbCA+Pj4gMTYgJiAyNTU7XHJcbiAgICBidWZbcG9zICsgM10gPSAgdmFsID4+PiAyNDtcclxufVxyXG5cclxuZnVuY3Rpb24gd3JpdGVVaW50QkUodmFsLCBidWYsIHBvcykge1xyXG4gICAgYnVmW3BvcyAgICBdID0gIHZhbCA+Pj4gMjQ7XHJcbiAgICBidWZbcG9zICsgMV0gPSAgdmFsID4+PiAxNiAmIDI1NTtcclxuICAgIGJ1Zltwb3MgKyAyXSA9ICB2YWwgPj4+IDggICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDNdID0gIHZhbCAgICAgICAgJiAyNTU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYWRVaW50TEUoYnVmLCBwb3MpIHtcclxuICAgIHJldHVybiAoYnVmW3BvcyAgICBdXHJcbiAgICAgICAgICB8IGJ1Zltwb3MgKyAxXSA8PCA4XHJcbiAgICAgICAgICB8IGJ1Zltwb3MgKyAyXSA8PCAxNlxyXG4gICAgICAgICAgfCBidWZbcG9zICsgM10gPDwgMjQpID4+PiAwO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkVWludEJFKGJ1ZiwgcG9zKSB7XHJcbiAgICByZXR1cm4gKGJ1Zltwb3MgICAgXSA8PCAyNFxyXG4gICAgICAgICAgfCBidWZbcG9zICsgMV0gPDwgMTZcclxuICAgICAgICAgIHwgYnVmW3BvcyArIDJdIDw8IDhcclxuICAgICAgICAgIHwgYnVmW3BvcyArIDNdKSA+Pj4gMDtcclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBpbnF1aXJlO1xyXG5cclxuLyoqXHJcbiAqIFJlcXVpcmVzIGEgbW9kdWxlIG9ubHkgaWYgYXZhaWxhYmxlLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlTmFtZSBNb2R1bGUgdG8gcmVxdWlyZVxyXG4gKiBAcmV0dXJucyB7P09iamVjdH0gUmVxdWlyZWQgbW9kdWxlIGlmIGF2YWlsYWJsZSBhbmQgbm90IGVtcHR5LCBvdGhlcndpc2UgYG51bGxgXHJcbiAqL1xyXG5mdW5jdGlvbiBpbnF1aXJlKG1vZHVsZU5hbWUpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgdmFyIG1vZCA9IGV2YWwoXCJxdWlyZVwiLnJlcGxhY2UoL14vLFwicmVcIikpKG1vZHVsZU5hbWUpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWV2YWxcclxuICAgICAgICBpZiAobW9kICYmIChtb2QubGVuZ3RoIHx8IE9iamVjdC5rZXlzKG1vZCkubGVuZ3RoKSlcclxuICAgICAgICAgICAgcmV0dXJuIG1vZDtcclxuICAgIH0gY2F0Y2ggKGUpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxuLyoqXHJcbiAqIEEgbWluaW1hbCBwYXRoIG1vZHVsZSB0byByZXNvbHZlIFVuaXgsIFdpbmRvd3MgYW5kIFVSTCBwYXRocyBhbGlrZS5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxudmFyIHBhdGggPSBleHBvcnRzO1xyXG5cclxudmFyIGlzQWJzb2x1dGUgPVxyXG4vKipcclxuICogVGVzdHMgaWYgdGhlIHNwZWNpZmllZCBwYXRoIGlzIGFic29sdXRlLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBQYXRoIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiBwYXRoIGlzIGFic29sdXRlXHJcbiAqL1xyXG5wYXRoLmlzQWJzb2x1dGUgPSBmdW5jdGlvbiBpc0Fic29sdXRlKHBhdGgpIHtcclxuICAgIHJldHVybiAvXig/OlxcL3xcXHcrOikvLnRlc3QocGF0aCk7XHJcbn07XHJcblxyXG52YXIgbm9ybWFsaXplID1cclxuLyoqXHJcbiAqIE5vcm1hbGl6ZXMgdGhlIHNwZWNpZmllZCBwYXRoLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBQYXRoIHRvIG5vcm1hbGl6ZVxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBOb3JtYWxpemVkIHBhdGhcclxuICovXHJcbnBhdGgubm9ybWFsaXplID0gZnVuY3Rpb24gbm9ybWFsaXplKHBhdGgpIHtcclxuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpXHJcbiAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXC97Mix9L2csIFwiL1wiKTtcclxuICAgIHZhciBwYXJ0cyAgICA9IHBhdGguc3BsaXQoXCIvXCIpLFxyXG4gICAgICAgIGFic29sdXRlID0gaXNBYnNvbHV0ZShwYXRoKSxcclxuICAgICAgICBwcmVmaXggICA9IFwiXCI7XHJcbiAgICBpZiAoYWJzb2x1dGUpXHJcbiAgICAgICAgcHJlZml4ID0gcGFydHMuc2hpZnQoKSArIFwiL1wiO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7KSB7XHJcbiAgICAgICAgaWYgKHBhcnRzW2ldID09PSBcIi4uXCIpIHtcclxuICAgICAgICAgICAgaWYgKGkgPiAwICYmIHBhcnRzW2kgLSAxXSAhPT0gXCIuLlwiKVxyXG4gICAgICAgICAgICAgICAgcGFydHMuc3BsaWNlKC0taSwgMik7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGFic29sdXRlKVxyXG4gICAgICAgICAgICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICArK2k7XHJcbiAgICAgICAgfSBlbHNlIGlmIChwYXJ0c1tpXSA9PT0gXCIuXCIpXHJcbiAgICAgICAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICsraTtcclxuICAgIH1cclxuICAgIHJldHVybiBwcmVmaXggKyBwYXJ0cy5qb2luKFwiL1wiKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNvbHZlcyB0aGUgc3BlY2lmaWVkIGluY2x1ZGUgcGF0aCBhZ2FpbnN0IHRoZSBzcGVjaWZpZWQgb3JpZ2luIHBhdGguXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcmlnaW5QYXRoIFBhdGggdG8gdGhlIG9yaWdpbiBmaWxlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBpbmNsdWRlUGF0aCBJbmNsdWRlIHBhdGggcmVsYXRpdmUgdG8gb3JpZ2luIHBhdGhcclxuICogQHBhcmFtIHtib29sZWFufSBbYWxyZWFkeU5vcm1hbGl6ZWQ9ZmFsc2VdIGB0cnVlYCBpZiBib3RoIHBhdGhzIGFyZSBhbHJlYWR5IGtub3duIHRvIGJlIG5vcm1hbGl6ZWRcclxuICogQHJldHVybnMge3N0cmluZ30gUGF0aCB0byB0aGUgaW5jbHVkZSBmaWxlXHJcbiAqL1xyXG5wYXRoLnJlc29sdmUgPSBmdW5jdGlvbiByZXNvbHZlKG9yaWdpblBhdGgsIGluY2x1ZGVQYXRoLCBhbHJlYWR5Tm9ybWFsaXplZCkge1xyXG4gICAgaWYgKCFhbHJlYWR5Tm9ybWFsaXplZClcclxuICAgICAgICBpbmNsdWRlUGF0aCA9IG5vcm1hbGl6ZShpbmNsdWRlUGF0aCk7XHJcbiAgICBpZiAoaXNBYnNvbHV0ZShpbmNsdWRlUGF0aCkpXHJcbiAgICAgICAgcmV0dXJuIGluY2x1ZGVQYXRoO1xyXG4gICAgaWYgKCFhbHJlYWR5Tm9ybWFsaXplZClcclxuICAgICAgICBvcmlnaW5QYXRoID0gbm9ybWFsaXplKG9yaWdpblBhdGgpO1xyXG4gICAgcmV0dXJuIChvcmlnaW5QYXRoID0gb3JpZ2luUGF0aC5yZXBsYWNlKC8oPzpcXC98XilbXi9dKyQvLCBcIlwiKSkubGVuZ3RoID8gbm9ybWFsaXplKG9yaWdpblBhdGggKyBcIi9cIiArIGluY2x1ZGVQYXRoKSA6IGluY2x1ZGVQYXRoO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBwb29sO1xyXG5cclxuLyoqXHJcbiAqIEFuIGFsbG9jYXRvciBhcyB1c2VkIGJ5IHtAbGluayB1dGlsLnBvb2x9LlxyXG4gKiBAdHlwZWRlZiBQb29sQWxsb2NhdG9yXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHtudW1iZXJ9IHNpemUgQnVmZmVyIHNpemVcclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl9IEJ1ZmZlclxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBBIHNsaWNlciBhcyB1c2VkIGJ5IHtAbGluayB1dGlsLnBvb2x9LlxyXG4gKiBAdHlwZWRlZiBQb29sU2xpY2VyXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IFN0YXJ0IG9mZnNldFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZW5kIEVuZCBvZmZzZXRcclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl9IEJ1ZmZlciBzbGljZVxyXG4gKiBAdGhpcyB7VWludDhBcnJheX1cclxuICovXHJcblxyXG4vKipcclxuICogQSBnZW5lcmFsIHB1cnBvc2UgYnVmZmVyIHBvb2wuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge1Bvb2xBbGxvY2F0b3J9IGFsbG9jIEFsbG9jYXRvclxyXG4gKiBAcGFyYW0ge1Bvb2xTbGljZXJ9IHNsaWNlIFNsaWNlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gW3NpemU9ODE5Ml0gU2xhYiBzaXplXHJcbiAqIEByZXR1cm5zIHtQb29sQWxsb2NhdG9yfSBQb29sZWQgYWxsb2NhdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBwb29sKGFsbG9jLCBzbGljZSwgc2l6ZSkge1xyXG4gICAgdmFyIFNJWkUgICA9IHNpemUgfHwgODE5MjtcclxuICAgIHZhciBNQVggICAgPSBTSVpFID4+PiAxO1xyXG4gICAgdmFyIHNsYWIgICA9IG51bGw7XHJcbiAgICB2YXIgb2Zmc2V0ID0gU0laRTtcclxuICAgIHJldHVybiBmdW5jdGlvbiBwb29sX2FsbG9jKHNpemUpIHtcclxuICAgICAgICBpZiAoc2l6ZSA8IDEgfHwgc2l6ZSA+IE1BWClcclxuICAgICAgICAgICAgcmV0dXJuIGFsbG9jKHNpemUpO1xyXG4gICAgICAgIGlmIChvZmZzZXQgKyBzaXplID4gU0laRSkge1xyXG4gICAgICAgICAgICBzbGFiID0gYWxsb2MoU0laRSk7XHJcbiAgICAgICAgICAgIG9mZnNldCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBidWYgPSBzbGljZS5jYWxsKHNsYWIsIG9mZnNldCwgb2Zmc2V0ICs9IHNpemUpO1xyXG4gICAgICAgIGlmIChvZmZzZXQgJiA3KSAvLyBhbGlnbiB0byAzMiBiaXRcclxuICAgICAgICAgICAgb2Zmc2V0ID0gKG9mZnNldCB8IDcpICsgMTtcclxuICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgfTtcclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8qKlxyXG4gKiBBIG1pbmltYWwgVVRGOCBpbXBsZW1lbnRhdGlvbiBmb3IgbnVtYmVyIGFycmF5cy5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxudmFyIHV0ZjggPSBleHBvcnRzO1xyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIFVURjggYnl0ZSBsZW5ndGggb2YgYSBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgU3RyaW5nXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IEJ5dGUgbGVuZ3RoXHJcbiAqL1xyXG51dGY4Lmxlbmd0aCA9IGZ1bmN0aW9uIHV0ZjhfbGVuZ3RoKHN0cmluZykge1xyXG4gICAgdmFyIGxlbiA9IDAsXHJcbiAgICAgICAgYyA9IDA7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGMgPSBzdHJpbmcuY2hhckNvZGVBdChpKTtcclxuICAgICAgICBpZiAoYyA8IDEyOClcclxuICAgICAgICAgICAgbGVuICs9IDE7XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8IDIwNDgpXHJcbiAgICAgICAgICAgIGxlbiArPSAyO1xyXG4gICAgICAgIGVsc2UgaWYgKChjICYgMHhGQzAwKSA9PT0gMHhEODAwICYmIChzdHJpbmcuY2hhckNvZGVBdChpICsgMSkgJiAweEZDMDApID09PSAweERDMDApIHtcclxuICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICBsZW4gKz0gNDtcclxuICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgbGVuICs9IDM7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGVuO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIFVURjggYnl0ZXMgYXMgYSBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmZmVyIFNvdXJjZSBidWZmZXJcclxuICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IFNvdXJjZSBzdGFydFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZW5kIFNvdXJjZSBlbmRcclxuICogQHJldHVybnMge3N0cmluZ30gU3RyaW5nIHJlYWRcclxuICovXHJcbnV0ZjgucmVhZCA9IGZ1bmN0aW9uIHV0ZjhfcmVhZChidWZmZXIsIHN0YXJ0LCBlbmQpIHtcclxuICAgIHZhciBsZW4gPSBlbmQgLSBzdGFydDtcclxuICAgIGlmIChsZW4gPCAxKVxyXG4gICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgdmFyIHBhcnRzID0gbnVsbCxcclxuICAgICAgICBjaHVuayA9IFtdLFxyXG4gICAgICAgIGkgPSAwLCAvLyBjaGFyIG9mZnNldFxyXG4gICAgICAgIHQ7ICAgICAvLyB0ZW1wb3JhcnlcclxuICAgIHdoaWxlIChzdGFydCA8IGVuZCkge1xyXG4gICAgICAgIHQgPSBidWZmZXJbc3RhcnQrK107XHJcbiAgICAgICAgaWYgKHQgPCAxMjgpXHJcbiAgICAgICAgICAgIGNodW5rW2krK10gPSB0O1xyXG4gICAgICAgIGVsc2UgaWYgKHQgPiAxOTEgJiYgdCA8IDIyNClcclxuICAgICAgICAgICAgY2h1bmtbaSsrXSA9ICh0ICYgMzEpIDw8IDYgfCBidWZmZXJbc3RhcnQrK10gJiA2MztcclxuICAgICAgICBlbHNlIGlmICh0ID4gMjM5ICYmIHQgPCAzNjUpIHtcclxuICAgICAgICAgICAgdCA9ICgodCAmIDcpIDw8IDE4IHwgKGJ1ZmZlcltzdGFydCsrXSAmIDYzKSA8PCAxMiB8IChidWZmZXJbc3RhcnQrK10gJiA2MykgPDwgNiB8IGJ1ZmZlcltzdGFydCsrXSAmIDYzKSAtIDB4MTAwMDA7XHJcbiAgICAgICAgICAgIGNodW5rW2krK10gPSAweEQ4MDAgKyAodCA+PiAxMCk7XHJcbiAgICAgICAgICAgIGNodW5rW2krK10gPSAweERDMDAgKyAodCAmIDEwMjMpO1xyXG4gICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICBjaHVua1tpKytdID0gKHQgJiAxNSkgPDwgMTIgfCAoYnVmZmVyW3N0YXJ0KytdICYgNjMpIDw8IDYgfCBidWZmZXJbc3RhcnQrK10gJiA2MztcclxuICAgICAgICBpZiAoaSA+IDgxOTEpIHtcclxuICAgICAgICAgICAgKHBhcnRzIHx8IChwYXJ0cyA9IFtdKSkucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY2h1bmspKTtcclxuICAgICAgICAgICAgaSA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHBhcnRzKSB7XHJcbiAgICAgICAgaWYgKGkpXHJcbiAgICAgICAgICAgIHBhcnRzLnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNodW5rLnNsaWNlKDAsIGkpKSk7XHJcbiAgICAgICAgcmV0dXJuIHBhcnRzLmpvaW4oXCJcIik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNodW5rLnNsaWNlKDAsIGkpKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzdHJpbmcgYXMgVVRGOCBieXRlcy5cclxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBTb3VyY2Ugc3RyaW5nXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmZmVyIERlc3RpbmF0aW9uIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gb2Zmc2V0IERlc3RpbmF0aW9uIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBCeXRlcyB3cml0dGVuXHJcbiAqL1xyXG51dGY4LndyaXRlID0gZnVuY3Rpb24gdXRmOF93cml0ZShzdHJpbmcsIGJ1ZmZlciwgb2Zmc2V0KSB7XHJcbiAgICB2YXIgc3RhcnQgPSBvZmZzZXQsXHJcbiAgICAgICAgYzEsIC8vIGNoYXJhY3RlciAxXHJcbiAgICAgICAgYzI7IC8vIGNoYXJhY3RlciAyXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGMxID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XHJcbiAgICAgICAgaWYgKGMxIDwgMTI4KSB7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMTtcclxuICAgICAgICB9IGVsc2UgaWYgKGMxIDwgMjA0OCkge1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgPj4gNiAgICAgICB8IDE5MjtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxICAgICAgICYgNjMgfCAxMjg7XHJcbiAgICAgICAgfSBlbHNlIGlmICgoYzEgJiAweEZDMDApID09PSAweEQ4MDAgJiYgKChjMiA9IHN0cmluZy5jaGFyQ29kZUF0KGkgKyAxKSkgJiAweEZDMDApID09PSAweERDMDApIHtcclxuICAgICAgICAgICAgYzEgPSAweDEwMDAwICsgKChjMSAmIDB4MDNGRikgPDwgMTApICsgKGMyICYgMHgwM0ZGKTtcclxuICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgPj4gMTggICAgICB8IDI0MDtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxID4+IDEyICYgNjMgfCAxMjg7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSA+PiA2ICAmIDYzIHwgMTI4O1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgICAgICAgJiA2MyB8IDEyODtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgPj4gMTIgICAgICB8IDIyNDtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxID4+IDYgICYgNjMgfCAxMjg7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSAgICAgICAmIDYzIHwgMTI4O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvZmZzZXQgLSBzdGFydDtcclxufTtcclxuIiwiLy8gZnVsbCBsaWJyYXJ5IGVudHJ5IHBvaW50LlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2luZGV4XCIpO1xyXG4iLCIvLyBtaW5pbWFsIGxpYnJhcnkgZW50cnkgcG9pbnQuXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXgtbWluaW1hbFwiKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gQ2xhc3M7XHJcblxyXG52YXIgTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VcIiksXHJcbiAgICB1dGlsICAgID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcclxuXHJcbnZhciBUeXBlOyAvLyBjeWNsaWNcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IG1lc3NhZ2UgcHJvdG90eXBlIGZvciB0aGUgc3BlY2lmaWVkIHJlZmxlY3RlZCB0eXBlIGFuZCBzZXRzIHVwIGl0cyBjb25zdHJ1Y3Rvci5cclxuICogQGNsYXNzZGVzYyBSdW50aW1lIGNsYXNzIHByb3ZpZGluZyB0aGUgdG9vbHMgdG8gY3JlYXRlIHlvdXIgb3duIGN1c3RvbSBjbGFzc2VzLlxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtUeXBlfSB0eXBlIFJlZmxlY3RlZCBtZXNzYWdlIHR5cGVcclxuICogQHBhcmFtIHsqfSBbY3Rvcl0gQ3VzdG9tIGNvbnN0cnVjdG9yIHRvIHNldCB1cCwgZGVmYXVsdHMgdG8gY3JlYXRlIGEgZ2VuZXJpYyBvbmUgaWYgb21pdHRlZFxyXG4gKiBAcmV0dXJucyB7TWVzc2FnZX0gTWVzc2FnZSBwcm90b3R5cGVcclxuICovXHJcbmZ1bmN0aW9uIENsYXNzKHR5cGUsIGN0b3IpIHtcclxuICAgIGlmICghVHlwZSlcclxuICAgICAgICBUeXBlID0gcmVxdWlyZShcIi4vdHlwZVwiKTtcclxuXHJcbiAgICBpZiAoISh0eXBlIGluc3RhbmNlb2YgVHlwZSkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwidHlwZSBtdXN0IGJlIGEgVHlwZVwiKTtcclxuXHJcbiAgICBpZiAoY3Rvcikge1xyXG4gICAgICAgIGlmICh0eXBlb2YgY3RvciAhPT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJjdG9yIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcclxuICAgIH0gZWxzZVxyXG4gICAgICAgIGN0b3IgPSBDbGFzcy5nZW5lcmF0ZSh0eXBlKS5lb2YodHlwZS5uYW1lKTsgLy8gbmFtZWQgY29uc3RydWN0b3IgZnVuY3Rpb24gKGNvZGVnZW4gaXMgcmVxdWlyZWQgYW55d2F5KVxyXG5cclxuICAgIC8vIExldCdzIHByZXRlbmQuLi5cclxuICAgIGN0b3IuY29uc3RydWN0b3IgPSBDbGFzcztcclxuXHJcbiAgICAvLyBuZXcgQ2xhc3MoKSAtPiBNZXNzYWdlLnByb3RvdHlwZVxyXG4gICAgKGN0b3IucHJvdG90eXBlID0gbmV3IE1lc3NhZ2UoKSkuY29uc3RydWN0b3IgPSBjdG9yO1xyXG5cclxuICAgIC8vIFN0YXRpYyBtZXRob2RzIG9uIE1lc3NhZ2UgYXJlIGluc3RhbmNlIG1ldGhvZHMgb24gQ2xhc3MgYW5kIHZpY2UgdmVyc2FcclxuICAgIHV0aWwubWVyZ2UoY3RvciwgTWVzc2FnZSwgdHJ1ZSk7XHJcblxyXG4gICAgLy8gQ2xhc3NlcyBhbmQgbWVzc2FnZXMgcmVmZXJlbmNlIHRoZWlyIHJlZmxlY3RlZCB0eXBlXHJcbiAgICBjdG9yLiR0eXBlID0gdHlwZTtcclxuICAgIGN0b3IucHJvdG90eXBlLiR0eXBlID0gdHlwZTtcclxuXHJcbiAgICAvLyBNZXNzYWdlcyBoYXZlIG5vbi1lbnVtZXJhYmxlIGRlZmF1bHQgdmFsdWVzIG9uIHRoZWlyIHByb3RvdHlwZVxyXG4gICAgdmFyIGkgPSAwO1xyXG4gICAgZm9yICg7IGkgPCAvKiBpbml0aWFsaXplcyAqLyB0eXBlLmZpZWxkc0FycmF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgLy8gb2JqZWN0cyBvbiB0aGUgcHJvdG90eXBlIG11c3QgYmUgaW1tbXV0YWJsZS4gdXNlcnMgbXVzdCBhc3NpZ24gYSBuZXcgb2JqZWN0IGluc3RhbmNlIGFuZFxyXG4gICAgICAgIC8vIGNhbm5vdCB1c2UgQXJyYXkjcHVzaCBvbiBlbXB0eSBhcnJheXMgb24gdGhlIHByb3RvdHlwZSBmb3IgZXhhbXBsZSwgYXMgdGhpcyB3b3VsZCBtb2RpZnlcclxuICAgICAgICAvLyB0aGUgdmFsdWUgb24gdGhlIHByb3RvdHlwZSBmb3IgQUxMIG1lc3NhZ2VzIG9mIHRoaXMgdHlwZS4gSGVuY2UsIHRoZXNlIG9iamVjdHMgYXJlIGZyb3plbi5cclxuICAgICAgICBjdG9yLnByb3RvdHlwZVt0eXBlLl9maWVsZHNBcnJheVtpXS5uYW1lXSA9IEFycmF5LmlzQXJyYXkodHlwZS5fZmllbGRzQXJyYXlbaV0ucmVzb2x2ZSgpLmRlZmF1bHRWYWx1ZSlcclxuICAgICAgICAgICAgPyB1dGlsLmVtcHR5QXJyYXlcclxuICAgICAgICAgICAgOiB1dGlsLmlzT2JqZWN0KHR5cGUuX2ZpZWxkc0FycmF5W2ldLmRlZmF1bHRWYWx1ZSkgJiYgIXR5cGUuX2ZpZWxkc0FycmF5W2ldLmxvbmdcclxuICAgICAgICAgICAgICA/IHV0aWwuZW1wdHlPYmplY3RcclxuICAgICAgICAgICAgICA6IHR5cGUuX2ZpZWxkc0FycmF5W2ldLmRlZmF1bHRWYWx1ZTsgLy8gaWYgYSBsb25nLCBpdCBpcyBmcm96ZW4gd2hlbiBpbml0aWFsaXplZFxyXG4gICAgfVxyXG5cclxuICAgIC8vIE1lc3NhZ2VzIGhhdmUgbm9uLWVudW1lcmFibGUgZ2V0dGVycyBhbmQgc2V0dGVycyBmb3IgZWFjaCB2aXJ0dWFsIG9uZW9mIGZpZWxkXHJcbiAgICB2YXIgY3RvclByb3BlcnRpZXMgPSB7fTtcclxuICAgIGZvciAoaSA9IDA7IGkgPCAvKiBpbml0aWFsaXplcyAqLyB0eXBlLm9uZW9mc0FycmF5Lmxlbmd0aDsgKytpKVxyXG4gICAgICAgIGN0b3JQcm9wZXJ0aWVzW3R5cGUuX29uZW9mc0FycmF5W2ldLnJlc29sdmUoKS5uYW1lXSA9IHtcclxuICAgICAgICAgICAgZ2V0OiB1dGlsLm9uZU9mR2V0dGVyKHR5cGUuX29uZW9mc0FycmF5W2ldLm9uZW9mKSxcclxuICAgICAgICAgICAgc2V0OiB1dGlsLm9uZU9mU2V0dGVyKHR5cGUuX29uZW9mc0FycmF5W2ldLm9uZW9mKVxyXG4gICAgICAgIH07XHJcbiAgICBpZiAoaSlcclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhjdG9yLnByb3RvdHlwZSwgY3RvclByb3BlcnRpZXMpO1xyXG5cclxuICAgIC8vIFJlZ2lzdGVyXHJcbiAgICB0eXBlLmN0b3IgPSBjdG9yO1xyXG5cclxuICAgIHJldHVybiBjdG9yLnByb3RvdHlwZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciB0aGUgc3BlY2lmaWVkIHR5cGUuXHJcbiAqIEBwYXJhbSB7VHlwZX0gdHlwZSBUeXBlIHRvIHVzZVxyXG4gKiBAcmV0dXJucyB7Q29kZWdlbn0gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKi9cclxuQ2xhc3MuZ2VuZXJhdGUgPSBmdW5jdGlvbiBnZW5lcmF0ZSh0eXBlKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW51c2VkLXZhcnNcclxuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lICovXHJcbiAgICB2YXIgZ2VuID0gdXRpbC5jb2RlZ2VuKFwicFwiKTtcclxuICAgIC8vIGV4cGxpY2l0bHkgaW5pdGlhbGl6ZSBtdXRhYmxlIG9iamVjdC9hcnJheSBmaWVsZHMgc28gdGhhdCB0aGVzZSBhcmVuJ3QganVzdCBpbmhlcml0ZWQgZnJvbSB0aGUgcHJvdG90eXBlXHJcbiAgICBmb3IgKHZhciBpID0gMCwgZmllbGQ7IGkgPCB0eXBlLmZpZWxkc0FycmF5Lmxlbmd0aDsgKytpKVxyXG4gICAgICAgIGlmICgoZmllbGQgPSB0eXBlLl9maWVsZHNBcnJheVtpXSkubWFwKSBnZW5cclxuICAgICAgICAgICAgKFwidGhpcyVzPXt9XCIsIHV0aWwuc2FmZVByb3AoZmllbGQubmFtZSkpO1xyXG4gICAgICAgIGVsc2UgaWYgKGZpZWxkLnJlcGVhdGVkKSBnZW5cclxuICAgICAgICAgICAgKFwidGhpcyVzPVtdXCIsIHV0aWwuc2FmZVByb3AoZmllbGQubmFtZSkpO1xyXG4gICAgcmV0dXJuIGdlblxyXG4gICAgKFwiaWYocClmb3IodmFyIGtzPU9iamVjdC5rZXlzKHApLGk9MDtpPGtzLmxlbmd0aDsrK2kpaWYocFtrc1tpXV0hPW51bGwpXCIpIC8vIG9taXQgdW5kZWZpbmVkIG9yIG51bGxcclxuICAgICAgICAoXCJ0aGlzW2tzW2ldXT1wW2tzW2ldXVwiKTtcclxuICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUgKi9cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IG1lc3NhZ2UgcHJvdG90eXBlIGZvciB0aGUgc3BlY2lmaWVkIHJlZmxlY3RlZCB0eXBlIGFuZCBzZXRzIHVwIGl0cyBjb25zdHJ1Y3Rvci5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7VHlwZX0gdHlwZSBSZWZsZWN0ZWQgbWVzc2FnZSB0eXBlXHJcbiAqIEBwYXJhbSB7Kn0gW2N0b3JdIEN1c3RvbSBjb25zdHJ1Y3RvciB0byBzZXQgdXAsIGRlZmF1bHRzIHRvIGNyZWF0ZSBhIGdlbmVyaWMgb25lIGlmIG9taXR0ZWRcclxuICogQHJldHVybnMge01lc3NhZ2V9IE1lc3NhZ2UgcHJvdG90eXBlXHJcbiAqIEBkZXByZWNhdGVkIHNpbmNlIDYuNy4wIGl0J3MgcG9zc2libGUgdG8ganVzdCBhc3NpZ24gYSBuZXcgY29uc3RydWN0b3IgdG8ge0BsaW5rIFR5cGUjY3Rvcn1cclxuICovXHJcbkNsYXNzLmNyZWF0ZSA9IENsYXNzO1xyXG5cclxuLy8gU3RhdGljIG1ldGhvZHMgb24gTWVzc2FnZSBhcmUgaW5zdGFuY2UgbWV0aG9kcyBvbiBDbGFzcyBhbmQgdmljZSB2ZXJzYVxyXG5DbGFzcy5wcm90b3R5cGUgPSBNZXNzYWdlO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgbWVzc2FnZSBvZiB0aGlzIHR5cGUgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cclxuICogQG5hbWUgQ2xhc3MjZnJvbU9iamVjdFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxyXG4gKiBAcmV0dXJucyB7TWVzc2FnZX0gTWVzc2FnZSBpbnN0YW5jZVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IG1lc3NhZ2Ugb2YgdGhpcyB0eXBlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXHJcbiAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIENsYXNzI2Zyb21PYmplY3R9LlxyXG4gKiBAbmFtZSBDbGFzcyNmcm9tXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBNZXNzYWdlIGluc3RhbmNlXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIG1lc3NhZ2Ugb2YgdGhpcyB0eXBlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXHJcbiAqIEBuYW1lIENsYXNzI3RvT2JqZWN0XHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge01lc3NhZ2V9IG1lc3NhZ2UgTWVzc2FnZSBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge0NvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXHJcbiAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEVuY29kZXMgYSBtZXNzYWdlIG9mIHRoaXMgdHlwZS5cclxuICogQG5hbWUgQ2xhc3MjZW5jb2RlXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge01lc3NhZ2V8T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgTWVzc2FnZSB0byBlbmNvZGVcclxuICogQHBhcmFtIHtXcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byB1c2VcclxuICogQHJldHVybnMge1dyaXRlcn0gV3JpdGVyXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEVuY29kZXMgYSBtZXNzYWdlIG9mIHRoaXMgdHlwZSBwcmVjZWVkZWQgYnkgaXRzIGxlbmd0aCBhcyBhIHZhcmludC5cclxuICogQG5hbWUgQ2xhc3MjZW5jb2RlRGVsaW1pdGVkXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge01lc3NhZ2V8T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgTWVzc2FnZSB0byBlbmNvZGVcclxuICogQHBhcmFtIHtXcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byB1c2VcclxuICogQHJldHVybnMge1dyaXRlcn0gV3JpdGVyXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIERlY29kZXMgYSBtZXNzYWdlIG9mIHRoaXMgdHlwZS5cclxuICogQG5hbWUgQ2xhc3MjZGVjb2RlXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge1JlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGVcclxuICogQHJldHVybnMge01lc3NhZ2V9IERlY29kZWQgbWVzc2FnZVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBEZWNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUgcHJlY2VlZGVkIGJ5IGl0cyBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEBuYW1lIENsYXNzI2RlY29kZURlbGltaXRlZFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtSZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlXHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBEZWNvZGVkIG1lc3NhZ2VcclxuICovXHJcblxyXG4vKipcclxuICogVmVyaWZpZXMgYSBtZXNzYWdlIG9mIHRoaXMgdHlwZS5cclxuICogQG5hbWUgQ2xhc3MjdmVyaWZ5XHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge01lc3NhZ2V8T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgTWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gdmVyaWZ5XHJcbiAqIEByZXR1cm5zIHs/c3RyaW5nfSBgbnVsbGAgaWYgdmFsaWQsIG90aGVyd2lzZSB0aGUgcmVhc29uIHdoeSBpdCBpcyBub3RcclxuICovXHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1vbjtcclxuXHJcbi8qKlxyXG4gKiBQcm92aWRlcyBjb21tb24gdHlwZSBkZWZpbml0aW9ucy5cclxuICogQ2FuIGFsc28gYmUgdXNlZCB0byBwcm92aWRlIGFkZGl0aW9uYWwgZ29vZ2xlIHR5cGVzIG9yIHlvdXIgb3duIGN1c3RvbSB0eXBlcy5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgU2hvcnQgbmFtZSBhcyBpbiBgZ29vZ2xlL3Byb3RvYnVmL1tuYW1lXS5wcm90b2Agb3IgZnVsbCBmaWxlIG5hbWVcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0ganNvbiBKU09OIGRlZmluaXRpb24gd2l0aGluIGBnb29nbGUucHJvdG9idWZgIGlmIGEgc2hvcnQgbmFtZSwgb3RoZXJ3aXNlIHRoZSBmaWxlJ3Mgcm9vdCBkZWZpbml0aW9uXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IGdvb2dsZS9wcm90b2J1Zi9hbnkucHJvdG8gQW55XHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IGdvb2dsZS9wcm90b2J1Zi9kdXJhdGlvbi5wcm90byBEdXJhdGlvblxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBnb29nbGUvcHJvdG9idWYvZW1wdHkucHJvdG8gRW1wdHlcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gZ29vZ2xlL3Byb3RvYnVmL3N0cnVjdC5wcm90byBTdHJ1Y3QsIFZhbHVlLCBOdWxsVmFsdWUgYW5kIExpc3RWYWx1ZVxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBnb29nbGUvcHJvdG9idWYvdGltZXN0YW1wLnByb3RvIFRpbWVzdGFtcFxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBnb29nbGUvcHJvdG9idWYvd3JhcHBlcnMucHJvdG8gV3JhcHBlcnNcclxuICogQGV4YW1wbGVcclxuICogLy8gbWFudWFsbHkgcHJvdmlkZXMgZGVzY3JpcHRvci5wcm90byAoYXNzdW1lcyBnb29nbGUvcHJvdG9idWYvIG5hbWVzcGFjZSBhbmQgLnByb3RvIGV4dGVuc2lvbilcclxuICogcHJvdG9idWYuY29tbW9uKFwiZGVzY3JpcHRvclwiLCBkZXNjcmlwdG9ySnNvbik7XHJcbiAqXHJcbiAqIC8vIG1hbnVhbGx5IHByb3ZpZGVzIGEgY3VzdG9tIGRlZmluaXRpb24gKHVzZXMgbXkuZm9vIG5hbWVzcGFjZSlcclxuICogcHJvdG9idWYuY29tbW9uKFwibXkvZm9vL2Jhci5wcm90b1wiLCBteUZvb0Jhckpzb24pO1xyXG4gKi9cclxuZnVuY3Rpb24gY29tbW9uKG5hbWUsIGpzb24pIHtcclxuICAgIGlmICghY29tbW9uUmUudGVzdChuYW1lKSkge1xyXG4gICAgICAgIG5hbWUgPSBcImdvb2dsZS9wcm90b2J1Zi9cIiArIG5hbWUgKyBcIi5wcm90b1wiO1xyXG4gICAgICAgIGpzb24gPSB7IG5lc3RlZDogeyBnb29nbGU6IHsgbmVzdGVkOiB7IHByb3RvYnVmOiB7IG5lc3RlZDoganNvbiB9IH0gfSB9IH07XHJcbiAgICB9XHJcbiAgICBjb21tb25bbmFtZV0gPSBqc29uO1xyXG59XHJcblxyXG52YXIgY29tbW9uUmUgPSAvXFwvfFxcLi87XHJcblxyXG4vLyBOb3QgcHJvdmlkZWQgYmVjYXVzZSBvZiBsaW1pdGVkIHVzZSAoZmVlbCBmcmVlIHRvIGRpc2N1c3Mgb3IgdG8gcHJvdmlkZSB5b3Vyc2VsZik6XHJcbi8vXHJcbi8vIGdvb2dsZS9wcm90b2J1Zi9kZXNjcmlwdG9yLnByb3RvXHJcbi8vIGdvb2dsZS9wcm90b2J1Zi9maWVsZF9tYXNrLnByb3RvXHJcbi8vIGdvb2dsZS9wcm90b2J1Zi9zb3VyY2VfY29udGV4dC5wcm90b1xyXG4vLyBnb29nbGUvcHJvdG9idWYvdHlwZS5wcm90b1xyXG4vL1xyXG4vLyBTdHJpcHBlZCBhbmQgcHJlLXBhcnNlZCB2ZXJzaW9ucyBvZiB0aGVzZSBub24tYnVuZGxlZCBmaWxlcyBhcmUgaW5zdGVhZCBhdmFpbGFibGUgYXMgcGFydCBvZlxyXG4vLyB0aGUgcmVwb3NpdG9yeSBvciBwYWNrYWdlIHdpdGhpbiB0aGUgZ29vZ2xlL3Byb3RvYnVmIGRpcmVjdG9yeS5cclxuXHJcbmNvbW1vbihcImFueVwiLCB7XHJcbiAgICBBbnk6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgdHlwZV91cmw6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJieXRlc1wiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcblxyXG52YXIgdGltZVR5cGU7XHJcblxyXG5jb21tb24oXCJkdXJhdGlvblwiLCB7XHJcbiAgICBEdXJhdGlvbjogdGltZVR5cGUgPSB7XHJcbiAgICAgICAgZmllbGRzOiB7XHJcbiAgICAgICAgICAgIHNlY29uZHM6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiaW50NjRcIixcclxuICAgICAgICAgICAgICAgIGlkOiAxXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG5hbm9zOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcImludDMyXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxuXHJcbmNvbW1vbihcInRpbWVzdGFtcFwiLCB7XHJcbiAgICBUaW1lc3RhbXA6IHRpbWVUeXBlXHJcbn0pO1xyXG5cclxuY29tbW9uKFwiZW1wdHlcIiwge1xyXG4gICAgRW1wdHk6IHtcclxuICAgICAgICBmaWVsZHM6IHt9XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuY29tbW9uKFwic3RydWN0XCIsIHtcclxuICAgIFN0cnVjdDoge1xyXG4gICAgICAgIGZpZWxkczoge1xyXG4gICAgICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgICAgIGtleVR5cGU6IFwic3RyaW5nXCIsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIlZhbHVlXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIFZhbHVlOiB7XHJcbiAgICAgICAgb25lb2ZzOiB7XHJcbiAgICAgICAgICAgIGtpbmQ6IHtcclxuICAgICAgICAgICAgICAgIG9uZW9mOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgXCJudWxsVmFsdWVcIixcclxuICAgICAgICAgICAgICAgICAgICBcIm51bWJlclZhbHVlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJzdHJpbmdWYWx1ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIFwiYm9vbFZhbHVlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJzdHJ1Y3RWYWx1ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIFwibGlzdFZhbHVlXCJcclxuICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZmllbGRzOiB7XHJcbiAgICAgICAgICAgIG51bGxWYWx1ZToge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJOdWxsVmFsdWVcIixcclxuICAgICAgICAgICAgICAgIGlkOiAxXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG51bWJlclZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcImRvdWJsZVwiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3RyaW5nVmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogM1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBib29sVmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiYm9vbFwiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDRcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3RydWN0VmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiU3RydWN0XCIsXHJcbiAgICAgICAgICAgICAgICBpZDogNVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsaXN0VmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiTGlzdFZhbHVlXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogNlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIE51bGxWYWx1ZToge1xyXG4gICAgICAgIHZhbHVlczoge1xyXG4gICAgICAgICAgICBOVUxMX1ZBTFVFOiAwXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIExpc3RWYWx1ZToge1xyXG4gICAgICAgIGZpZWxkczoge1xyXG4gICAgICAgICAgICB2YWx1ZXM6IHtcclxuICAgICAgICAgICAgICAgIHJ1bGU6IFwicmVwZWF0ZWRcIixcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiVmFsdWVcIixcclxuICAgICAgICAgICAgICAgIGlkOiAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuY29tbW9uKFwid3JhcHBlcnNcIiwge1xyXG4gICAgRG91YmxlVmFsdWU6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiZG91YmxlXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIEZsb2F0VmFsdWU6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgICAgICAgICAgIGlkOiAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgSW50NjRWYWx1ZToge1xyXG4gICAgICAgIGZpZWxkczoge1xyXG4gICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJpbnQ2NFwiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBVSW50NjRWYWx1ZToge1xyXG4gICAgICAgIGZpZWxkczoge1xyXG4gICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJ1aW50NjRcIixcclxuICAgICAgICAgICAgICAgIGlkOiAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgSW50MzJWYWx1ZToge1xyXG4gICAgICAgIGZpZWxkczoge1xyXG4gICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJpbnQzMlwiLFxyXG4gICAgICAgICAgICAgICAgaWQ6IDFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBVSW50MzJWYWx1ZToge1xyXG4gICAgICAgIGZpZWxkczoge1xyXG4gICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJ1aW50MzJcIixcclxuICAgICAgICAgICAgICAgIGlkOiAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgQm9vbFZhbHVlOiB7XHJcbiAgICAgICAgZmllbGRzOiB7XHJcbiAgICAgICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2xcIixcclxuICAgICAgICAgICAgICAgIGlkOiAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgU3RyaW5nVmFsdWU6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXHJcbiAgICAgICAgICAgICAgICBpZDogMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIEJ5dGVzVmFsdWU6IHtcclxuICAgICAgICBmaWVsZHM6IHtcclxuICAgICAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiYnl0ZXNcIixcclxuICAgICAgICAgICAgICAgIGlkOiAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0pO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuLyoqXHJcbiAqIFJ1bnRpbWUgbWVzc2FnZSBmcm9tL3RvIHBsYWluIG9iamVjdCBjb252ZXJ0ZXJzLlxyXG4gKiBAbmFtZXNwYWNlXHJcbiAqL1xyXG52YXIgY29udmVydGVyID0gZXhwb3J0cztcclxuXHJcbnZhciBFbnVtID0gcmVxdWlyZShcIi4vZW51bVwiKSxcclxuICAgIHV0aWwgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIHBhcnRpYWwgdmFsdWUgZnJvbU9iamVjdCBjb252ZXRlci5cclxuICogQHBhcmFtIHtDb2RlZ2VufSBnZW4gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge0ZpZWxkfSBmaWVsZCBSZWZsZWN0ZWQgZmllbGRcclxuICogQHBhcmFtIHtudW1iZXJ9IGZpZWxkSW5kZXggRmllbGQgaW5kZXhcclxuICogQHBhcmFtIHtzdHJpbmd9IHByb3AgUHJvcGVydHkgcmVmZXJlbmNlXHJcbiAqIEByZXR1cm5zIHtDb2RlZ2VufSBDb2RlZ2VuIGluc3RhbmNlXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIGdlblZhbHVlUGFydGlhbF9mcm9tT2JqZWN0KGdlbiwgZmllbGQsIGZpZWxkSW5kZXgsIHByb3ApIHtcclxuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lLCBibG9jay1zY29wZWQtdmFyLCBuby1yZWRlY2xhcmUgKi9cclxuICAgIGlmIChmaWVsZC5yZXNvbHZlZFR5cGUpIHtcclxuICAgICAgICBpZiAoZmllbGQucmVzb2x2ZWRUeXBlIGluc3RhbmNlb2YgRW51bSkgeyBnZW5cclxuICAgICAgICAgICAgKFwic3dpdGNoKGQlcyl7XCIsIHByb3ApO1xyXG4gICAgICAgICAgICBmb3IgKHZhciB2YWx1ZXMgPSBmaWVsZC5yZXNvbHZlZFR5cGUudmFsdWVzLCBrZXlzID0gT2JqZWN0LmtleXModmFsdWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmllbGQucmVwZWF0ZWQgJiYgdmFsdWVzW2tleXNbaV1dID09PSBmaWVsZC50eXBlRGVmYXVsdCkgZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJkZWZhdWx0OlwiKTtcclxuICAgICAgICAgICAgICAgIGdlblxyXG4gICAgICAgICAgICAgICAgKFwiY2FzZSVqOlwiLCBrZXlzW2ldKVxyXG4gICAgICAgICAgICAgICAgKFwiY2FzZSAlajpcIiwgdmFsdWVzW2tleXNbaV1dKVxyXG4gICAgICAgICAgICAgICAgICAgIChcIm0lcz0lalwiLCBwcm9wLCB2YWx1ZXNba2V5c1tpXV0pXHJcbiAgICAgICAgICAgICAgICAgICAgKFwiYnJlYWtcIik7XHJcbiAgICAgICAgICAgIH0gZ2VuXHJcbiAgICAgICAgICAgIChcIn1cIik7XHJcbiAgICAgICAgfSBlbHNlIGdlblxyXG4gICAgICAgICAgICAoXCJpZih0eXBlb2YgZCVzIT09XFxcIm9iamVjdFxcXCIpXCIsIHByb3ApXHJcbiAgICAgICAgICAgICAgICAoXCJ0aHJvdyBUeXBlRXJyb3IoJWopXCIsIGZpZWxkLmZ1bGxOYW1lICsgXCI6IG9iamVjdCBleHBlY3RlZFwiKVxyXG4gICAgICAgICAgICAoXCJtJXM9dHlwZXNbJWRdLmZyb21PYmplY3QoZCVzKVwiLCBwcm9wLCBmaWVsZEluZGV4LCBwcm9wKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIGlzVW5zaWduZWQgPSBmYWxzZTtcclxuICAgICAgICBzd2l0Y2ggKGZpZWxkLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcImRvdWJsZVwiOlxyXG4gICAgICAgICAgICBjYXNlIFwiZmxvYXRcIjpnZW5cclxuICAgICAgICAgICAgICAgIChcIm0lcz1OdW1iZXIoZCVzKVwiLCBwcm9wLCBwcm9wKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwidWludDMyXCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJmaXhlZDMyXCI6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwibSVzPWQlcz4+PjBcIiwgcHJvcCwgcHJvcCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImludDMyXCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJzaW50MzJcIjpcclxuICAgICAgICAgICAgY2FzZSBcInNmaXhlZDMyXCI6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwibSVzPWQlc3wwXCIsIHByb3AsIHByb3ApO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ1aW50NjRcIjpcclxuICAgICAgICAgICAgICAgIGlzVW5zaWduZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1mYWxsdGhyb3VnaFxyXG4gICAgICAgICAgICBjYXNlIFwiaW50NjRcIjpcclxuICAgICAgICAgICAgY2FzZSBcInNpbnQ2NFwiOlxyXG4gICAgICAgICAgICBjYXNlIFwiZml4ZWQ2NFwiOlxyXG4gICAgICAgICAgICBjYXNlIFwic2ZpeGVkNjRcIjogZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJpZih1dGlsLkxvbmcpXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgKFwiKG0lcz11dGlsLkxvbmcuZnJvbVZhbHVlKGQlcykpLnVuc2lnbmVkPSVqXCIsIHByb3AsIHByb3AsIGlzVW5zaWduZWQpXHJcbiAgICAgICAgICAgICAgICAoXCJlbHNlIGlmKHR5cGVvZiBkJXM9PT1cXFwic3RyaW5nXFxcIilcIiwgcHJvcClcclxuICAgICAgICAgICAgICAgICAgICAoXCJtJXM9cGFyc2VJbnQoZCVzLDEwKVwiLCBwcm9wLCBwcm9wKVxyXG4gICAgICAgICAgICAgICAgKFwiZWxzZSBpZih0eXBlb2YgZCVzPT09XFxcIm51bWJlclxcXCIpXCIsIHByb3ApXHJcbiAgICAgICAgICAgICAgICAgICAgKFwibSVzPWQlc1wiLCBwcm9wLCBwcm9wKVxyXG4gICAgICAgICAgICAgICAgKFwiZWxzZSBpZih0eXBlb2YgZCVzPT09XFxcIm9iamVjdFxcXCIpXCIsIHByb3ApXHJcbiAgICAgICAgICAgICAgICAgICAgKFwibSVzPW5ldyB1dGlsLkxvbmdCaXRzKGQlcy5sb3c+Pj4wLGQlcy5oaWdoPj4+MCkudG9OdW1iZXIoJXMpXCIsIHByb3AsIHByb3AsIHByb3AsIGlzVW5zaWduZWQgPyBcInRydWVcIiA6IFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJieXRlc1wiOiBnZW5cclxuICAgICAgICAgICAgICAgIChcImlmKHR5cGVvZiBkJXM9PT1cXFwic3RyaW5nXFxcIilcIiwgcHJvcClcclxuICAgICAgICAgICAgICAgICAgICAoXCJ1dGlsLmJhc2U2NC5kZWNvZGUoZCVzLG0lcz11dGlsLm5ld0J1ZmZlcih1dGlsLmJhc2U2NC5sZW5ndGgoZCVzKSksMClcIiwgcHJvcCwgcHJvcCwgcHJvcClcclxuICAgICAgICAgICAgICAgIChcImVsc2UgaWYoZCVzLmxlbmd0aClcIiwgcHJvcClcclxuICAgICAgICAgICAgICAgICAgICAoXCJtJXM9ZCVzXCIsIHByb3AsIHByb3ApO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJzdHJpbmdcIjogZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJtJXM9U3RyaW5nKGQlcylcIiwgcHJvcCwgcHJvcCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImJvb2xcIjogZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJtJXM9Qm9vbGVhbihkJXMpXCIsIHByb3AsIHByb3ApO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIC8qIGRlZmF1bHQ6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwibSVzPWQlc1wiLCBwcm9wLCBwcm9wKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrOyAqL1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBnZW47XHJcbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lLCBibG9jay1zY29wZWQtdmFyLCBuby1yZWRlY2xhcmUgKi9cclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIHBsYWluIG9iamVjdCB0byBydW50aW1lIG1lc3NhZ2UgY29udmVydGVyIHNwZWNpZmljIHRvIHRoZSBzcGVjaWZpZWQgbWVzc2FnZSB0eXBlLlxyXG4gKiBAcGFyYW0ge1R5cGV9IG10eXBlIE1lc3NhZ2UgdHlwZVxyXG4gKiBAcmV0dXJucyB7Q29kZWdlbn0gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKi9cclxuY29udmVydGVyLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG10eXBlKSB7XHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSwgYmxvY2stc2NvcGVkLXZhciwgbm8tcmVkZWNsYXJlICovXHJcbiAgICB2YXIgZmllbGRzID0gbXR5cGUuZmllbGRzQXJyYXk7XHJcbiAgICB2YXIgZ2VuID0gdXRpbC5jb2RlZ2VuKFwiZFwiKVxyXG4gICAgKFwiaWYoZCBpbnN0YW5jZW9mIHRoaXMuY3RvcilcIilcclxuICAgICAgICAoXCJyZXR1cm4gZFwiKTtcclxuICAgIGlmICghZmllbGRzLmxlbmd0aCkgcmV0dXJuIGdlblxyXG4gICAgKFwicmV0dXJuIG5ldyB0aGlzLmN0b3JcIik7XHJcbiAgICBnZW5cclxuICAgIChcInZhciBtPW5ldyB0aGlzLmN0b3JcIik7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHZhciBmaWVsZCAgPSBmaWVsZHNbaV0ucmVzb2x2ZSgpLFxyXG4gICAgICAgICAgICBwcm9wICAgPSB1dGlsLnNhZmVQcm9wKGZpZWxkLm5hbWUpO1xyXG5cclxuICAgICAgICAvLyBNYXAgZmllbGRzXHJcbiAgICAgICAgaWYgKGZpZWxkLm1hcCkgeyBnZW5cclxuICAgIChcImlmKGQlcyl7XCIsIHByb3ApXHJcbiAgICAgICAgKFwiaWYodHlwZW9mIGQlcyE9PVxcXCJvYmplY3RcXFwiKVwiLCBwcm9wKVxyXG4gICAgICAgICAgICAoXCJ0aHJvdyBUeXBlRXJyb3IoJWopXCIsIGZpZWxkLmZ1bGxOYW1lICsgXCI6IG9iamVjdCBleHBlY3RlZFwiKVxyXG4gICAgICAgIChcIm0lcz17fVwiLCBwcm9wKVxyXG4gICAgICAgIChcImZvcih2YXIga3M9T2JqZWN0LmtleXMoZCVzKSxpPTA7aTxrcy5sZW5ndGg7KytpKXtcIiwgcHJvcCk7XHJcbiAgICAgICAgICAgIGdlblZhbHVlUGFydGlhbF9mcm9tT2JqZWN0KGdlbiwgZmllbGQsIC8qIG5vdCBzb3J0ZWQgKi8gaSwgcHJvcCArIFwiW2tzW2ldXVwiKVxyXG4gICAgICAgIChcIn1cIilcclxuICAgIChcIn1cIik7XHJcblxyXG4gICAgICAgIC8vIFJlcGVhdGVkIGZpZWxkc1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZmllbGQucmVwZWF0ZWQpIHsgZ2VuXHJcbiAgICAoXCJpZihkJXMpe1wiLCBwcm9wKVxyXG4gICAgICAgIChcImlmKCFBcnJheS5pc0FycmF5KGQlcykpXCIsIHByb3ApXHJcbiAgICAgICAgICAgIChcInRocm93IFR5cGVFcnJvciglailcIiwgZmllbGQuZnVsbE5hbWUgKyBcIjogYXJyYXkgZXhwZWN0ZWRcIilcclxuICAgICAgICAoXCJtJXM9W11cIiwgcHJvcClcclxuICAgICAgICAoXCJmb3IodmFyIGk9MDtpPGQlcy5sZW5ndGg7KytpKXtcIiwgcHJvcCk7XHJcbiAgICAgICAgICAgIGdlblZhbHVlUGFydGlhbF9mcm9tT2JqZWN0KGdlbiwgZmllbGQsIC8qIG5vdCBzb3J0ZWQgKi8gaSwgcHJvcCArIFwiW2ldXCIpXHJcbiAgICAgICAgKFwifVwiKVxyXG4gICAgKFwifVwiKTtcclxuXHJcbiAgICAgICAgLy8gTm9uLXJlcGVhdGVkIGZpZWxkc1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICghKGZpZWxkLnJlc29sdmVkVHlwZSBpbnN0YW5jZW9mIEVudW0pKSBnZW4gLy8gbm8gbmVlZCB0byB0ZXN0IGZvciBudWxsL3VuZGVmaW5lZCBpZiBhbiBlbnVtICh1c2VzIHN3aXRjaClcclxuICAgIChcImlmKGQlcyE9bnVsbCl7XCIsIHByb3ApOyAvLyAhPT0gdW5kZWZpbmVkICYmICE9PSBudWxsXHJcbiAgICAgICAgZ2VuVmFsdWVQYXJ0aWFsX2Zyb21PYmplY3QoZ2VuLCBmaWVsZCwgLyogbm90IHNvcnRlZCAqLyBpLCBwcm9wKTtcclxuICAgICAgICAgICAgaWYgKCEoZmllbGQucmVzb2x2ZWRUeXBlIGluc3RhbmNlb2YgRW51bSkpIGdlblxyXG4gICAgKFwifVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9IHJldHVybiBnZW5cclxuICAgIChcInJldHVybiBtXCIpO1xyXG4gICAgLyogZXNsaW50LWVuYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSwgYmxvY2stc2NvcGVkLXZhciwgbm8tcmVkZWNsYXJlICovXHJcbn07XHJcblxyXG4vKipcclxuICogR2VuZXJhdGVzIGEgcGFydGlhbCB2YWx1ZSB0b09iamVjdCBjb252ZXJ0ZXIuXHJcbiAqIEBwYXJhbSB7Q29kZWdlbn0gZ2VuIENvZGVnZW4gaW5zdGFuY2VcclxuICogQHBhcmFtIHtGaWVsZH0gZmllbGQgUmVmbGVjdGVkIGZpZWxkXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBmaWVsZEluZGV4IEZpZWxkIGluZGV4XHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wIFByb3BlcnR5IHJlZmVyZW5jZVxyXG4gKiBAcmV0dXJucyB7Q29kZWdlbn0gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKiBAaWdub3JlXHJcbiAqL1xyXG5mdW5jdGlvbiBnZW5WYWx1ZVBhcnRpYWxfdG9PYmplY3QoZ2VuLCBmaWVsZCwgZmllbGRJbmRleCwgcHJvcCkge1xyXG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUsIGJsb2NrLXNjb3BlZC12YXIsIG5vLXJlZGVjbGFyZSAqL1xyXG4gICAgaWYgKGZpZWxkLnJlc29sdmVkVHlwZSkge1xyXG4gICAgICAgIGlmIChmaWVsZC5yZXNvbHZlZFR5cGUgaW5zdGFuY2VvZiBFbnVtKSBnZW5cclxuICAgICAgICAgICAgKFwiZCVzPW8uZW51bXM9PT1TdHJpbmc/dHlwZXNbJWRdLnZhbHVlc1ttJXNdOm0lc1wiLCBwcm9wLCBmaWVsZEluZGV4LCBwcm9wLCBwcm9wKTtcclxuICAgICAgICBlbHNlIGdlblxyXG4gICAgICAgICAgICAoXCJkJXM9dHlwZXNbJWRdLnRvT2JqZWN0KG0lcyxvKVwiLCBwcm9wLCBmaWVsZEluZGV4LCBwcm9wKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIGlzVW5zaWduZWQgPSBmYWxzZTtcclxuICAgICAgICBzd2l0Y2ggKGZpZWxkLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcInVpbnQ2NFwiOlxyXG4gICAgICAgICAgICAgICAgaXNVbnNpZ25lZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWZhbGx0aHJvdWdoXHJcbiAgICAgICAgICAgIGNhc2UgXCJpbnQ2NFwiOlxyXG4gICAgICAgICAgICBjYXNlIFwic2ludDY0XCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJmaXhlZDY0XCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJzZml4ZWQ2NFwiOiBnZW5cclxuICAgICAgICAgICAgKFwiaWYodHlwZW9mIG0lcz09PVxcXCJudW1iZXJcXFwiKVwiLCBwcm9wKVxyXG4gICAgICAgICAgICAgICAgKFwiZCVzPW8ubG9uZ3M9PT1TdHJpbmc/U3RyaW5nKG0lcyk6bSVzXCIsIHByb3AsIHByb3AsIHByb3ApXHJcbiAgICAgICAgICAgIChcImVsc2VcIikgLy8gTG9uZy1saWtlXHJcbiAgICAgICAgICAgICAgICAoXCJkJXM9by5sb25ncz09PVN0cmluZz91dGlsLkxvbmcucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobSVzKTpvLmxvbmdzPT09TnVtYmVyP25ldyB1dGlsLkxvbmdCaXRzKG0lcy5sb3c+Pj4wLG0lcy5oaWdoPj4+MCkudG9OdW1iZXIoJXMpOm0lc1wiLCBwcm9wLCBwcm9wLCBwcm9wLCBwcm9wLCBpc1Vuc2lnbmVkID8gXCJ0cnVlXCI6IFwiXCIsIHByb3ApO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJieXRlc1wiOiBnZW5cclxuICAgICAgICAgICAgKFwiZCVzPW8uYnl0ZXM9PT1TdHJpbmc/dXRpbC5iYXNlNjQuZW5jb2RlKG0lcywwLG0lcy5sZW5ndGgpOm8uYnl0ZXM9PT1BcnJheT9BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChtJXMpOm0lc1wiLCBwcm9wLCBwcm9wLCBwcm9wLCBwcm9wLCBwcm9wKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OiBnZW5cclxuICAgICAgICAgICAgKFwiZCVzPW0lc1wiLCBwcm9wLCBwcm9wKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBnZW47XHJcbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lLCBibG9jay1zY29wZWQtdmFyLCBuby1yZWRlY2xhcmUgKi9cclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIHJ1bnRpbWUgbWVzc2FnZSB0byBwbGFpbiBvYmplY3QgY29udmVydGVyIHNwZWNpZmljIHRvIHRoZSBzcGVjaWZpZWQgbWVzc2FnZSB0eXBlLlxyXG4gKiBAcGFyYW0ge1R5cGV9IG10eXBlIE1lc3NhZ2UgdHlwZVxyXG4gKiBAcmV0dXJucyB7Q29kZWdlbn0gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKi9cclxuY29udmVydGVyLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobXR5cGUpIHtcclxuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lLCBibG9jay1zY29wZWQtdmFyLCBuby1yZWRlY2xhcmUgKi9cclxuICAgIHZhciBmaWVsZHMgPSBtdHlwZS5maWVsZHNBcnJheS5zbGljZSgpLnNvcnQodXRpbC5jb21wYXJlRmllbGRzQnlJZCk7XHJcbiAgICBpZiAoIWZpZWxkcy5sZW5ndGgpXHJcbiAgICAgICAgcmV0dXJuIHV0aWwuY29kZWdlbigpKFwicmV0dXJuIHt9XCIpO1xyXG4gICAgdmFyIGdlbiA9IHV0aWwuY29kZWdlbihcIm1cIiwgXCJvXCIpXHJcbiAgICAoXCJpZighbylcIilcclxuICAgICAgICAoXCJvPXt9XCIpXHJcbiAgICAoXCJ2YXIgZD17fVwiKTtcclxuXHJcbiAgICB2YXIgcmVwZWF0ZWRGaWVsZHMgPSBbXSxcclxuICAgICAgICBtYXBGaWVsZHMgPSBbXSxcclxuICAgICAgICBub3JtYWxGaWVsZHMgPSBbXSxcclxuICAgICAgICBpID0gMDtcclxuICAgIGZvciAoOyBpIDwgZmllbGRzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgIGlmICghZmllbGRzW2ldLnBhcnRPZilcclxuICAgICAgICAgICAgKCBmaWVsZHNbaV0ucmVzb2x2ZSgpLnJlcGVhdGVkID8gcmVwZWF0ZWRGaWVsZHNcclxuICAgICAgICAgICAgOiBmaWVsZHNbaV0ubWFwID8gbWFwRmllbGRzXHJcbiAgICAgICAgICAgIDogbm9ybWFsRmllbGRzKS5wdXNoKGZpZWxkc1tpXSk7XHJcblxyXG4gICAgaWYgKHJlcGVhdGVkRmllbGRzLmxlbmd0aCkgeyBnZW5cclxuICAgIChcImlmKG8uYXJyYXlzfHxvLmRlZmF1bHRzKXtcIik7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHJlcGVhdGVkRmllbGRzLmxlbmd0aDsgKytpKSBnZW5cclxuICAgICAgICAoXCJkJXM9W11cIiwgdXRpbC5zYWZlUHJvcChyZXBlYXRlZEZpZWxkc1tpXS5uYW1lKSk7XHJcbiAgICAgICAgZ2VuXHJcbiAgICAoXCJ9XCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChtYXBGaWVsZHMubGVuZ3RoKSB7IGdlblxyXG4gICAgKFwiaWYoby5vYmplY3RzfHxvLmRlZmF1bHRzKXtcIik7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG1hcEZpZWxkcy5sZW5ndGg7ICsraSkgZ2VuXHJcbiAgICAgICAgKFwiZCVzPXt9XCIsIHV0aWwuc2FmZVByb3AobWFwRmllbGRzW2ldLm5hbWUpKTtcclxuICAgICAgICBnZW5cclxuICAgIChcIn1cIik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG5vcm1hbEZpZWxkcy5sZW5ndGgpIHsgZ2VuXHJcbiAgICAoXCJpZihvLmRlZmF1bHRzKXtcIik7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG5vcm1hbEZpZWxkcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGQgPSBub3JtYWxGaWVsZHNbaV0sXHJcbiAgICAgICAgICAgICAgICBwcm9wICA9IHV0aWwuc2FmZVByb3AoZmllbGQubmFtZSk7XHJcbiAgICAgICAgICAgIGlmIChmaWVsZC5yZXNvbHZlZFR5cGUgaW5zdGFuY2VvZiBFbnVtKSBnZW5cclxuICAgICAgICAoXCJkJXM9by5lbnVtcz09PVN0cmluZz8lajolalwiLCBwcm9wLCBmaWVsZC5yZXNvbHZlZFR5cGUudmFsdWVzQnlJZFtmaWVsZC50eXBlRGVmYXVsdF0sIGZpZWxkLnR5cGVEZWZhdWx0KTtcclxuICAgICAgICAgICAgZWxzZSBpZiAoZmllbGQubG9uZykgZ2VuXHJcbiAgICAgICAgKFwiaWYodXRpbC5Mb25nKXtcIilcclxuICAgICAgICAgICAgKFwidmFyIG49bmV3IHV0aWwuTG9uZyglZCwlZCwlailcIiwgZmllbGQudHlwZURlZmF1bHQubG93LCBmaWVsZC50eXBlRGVmYXVsdC5oaWdoLCBmaWVsZC50eXBlRGVmYXVsdC51bnNpZ25lZClcclxuICAgICAgICAgICAgKFwiZCVzPW8ubG9uZ3M9PT1TdHJpbmc/bi50b1N0cmluZygpOm8ubG9uZ3M9PT1OdW1iZXI/bi50b051bWJlcigpOm5cIiwgcHJvcClcclxuICAgICAgICAoXCJ9ZWxzZVwiKVxyXG4gICAgICAgICAgICAoXCJkJXM9by5sb25ncz09PVN0cmluZz8lajolZFwiLCBwcm9wLCBmaWVsZC50eXBlRGVmYXVsdC50b1N0cmluZygpLCBmaWVsZC50eXBlRGVmYXVsdC50b051bWJlcigpKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAoZmllbGQuYnl0ZXMpIGdlblxyXG4gICAgICAgIChcImQlcz1vLmJ5dGVzPT09U3RyaW5nPyVqOiVzXCIsIHByb3AsIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBmaWVsZC50eXBlRGVmYXVsdCksIFwiW1wiICsgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZmllbGQudHlwZURlZmF1bHQpLmpvaW4oXCIsXCIpICsgXCJdXCIpO1xyXG4gICAgICAgICAgICBlbHNlIGdlblxyXG4gICAgICAgIChcImQlcz0lalwiLCBwcm9wLCBmaWVsZC50eXBlRGVmYXVsdCk7IC8vIGFsc28gbWVzc2FnZXMgKD1udWxsKVxyXG4gICAgICAgIH0gZ2VuXHJcbiAgICAoXCJ9XCIpO1xyXG4gICAgfVxyXG4gICAgdmFyIGhhc0tzMiA9IGZhbHNlO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tpXSxcclxuICAgICAgICAgICAgaW5kZXggPSBtdHlwZS5fZmllbGRzQXJyYXkuaW5kZXhPZihmaWVsZCksXHJcbiAgICAgICAgICAgIHByb3AgID0gdXRpbC5zYWZlUHJvcChmaWVsZC5uYW1lKTtcclxuICAgICAgICBpZiAoZmllbGQubWFwKSB7XHJcbiAgICAgICAgICAgIGlmICghaGFzS3MyKSB7IGhhc0tzMiA9IHRydWU7IGdlblxyXG4gICAgKFwidmFyIGtzMlwiKTtcclxuICAgICAgICAgICAgfSBnZW5cclxuICAgIChcImlmKG0lcyYmKGtzMj1PYmplY3Qua2V5cyhtJXMpKS5sZW5ndGgpe1wiLCBwcm9wLCBwcm9wKVxyXG4gICAgICAgIChcImQlcz17fVwiLCBwcm9wKVxyXG4gICAgICAgIChcImZvcih2YXIgaj0wO2o8a3MyLmxlbmd0aDsrK2ope1wiKTtcclxuICAgICAgICAgICAgZ2VuVmFsdWVQYXJ0aWFsX3RvT2JqZWN0KGdlbiwgZmllbGQsIC8qIHNvcnRlZCAqLyBpbmRleCwgcHJvcCArIFwiW2tzMltqXV1cIilcclxuICAgICAgICAoXCJ9XCIpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZmllbGQucmVwZWF0ZWQpIHsgZ2VuXHJcbiAgICAoXCJpZihtJXMmJm0lcy5sZW5ndGgpe1wiLCBwcm9wLCBwcm9wKVxyXG4gICAgICAgIChcImQlcz1bXVwiLCBwcm9wKVxyXG4gICAgICAgIChcImZvcih2YXIgaj0wO2o8bSVzLmxlbmd0aDsrK2ope1wiLCBwcm9wKTtcclxuICAgICAgICAgICAgZ2VuVmFsdWVQYXJ0aWFsX3RvT2JqZWN0KGdlbiwgZmllbGQsIC8qIHNvcnRlZCAqLyBpbmRleCwgcHJvcCArIFwiW2pdXCIpXHJcbiAgICAgICAgKFwifVwiKTtcclxuICAgICAgICB9IGVsc2UgeyBnZW5cclxuICAgIChcImlmKG0lcyE9bnVsbCYmbS5oYXNPd25Qcm9wZXJ0eSglaikpe1wiLCBwcm9wLCBmaWVsZC5uYW1lKTsgLy8gIT09IHVuZGVmaW5lZCAmJiAhPT0gbnVsbFxyXG4gICAgICAgIGdlblZhbHVlUGFydGlhbF90b09iamVjdChnZW4sIGZpZWxkLCAvKiBzb3J0ZWQgKi8gaW5kZXgsIHByb3ApO1xyXG4gICAgICAgIGlmIChmaWVsZC5wYXJ0T2YpIGdlblxyXG4gICAgICAgIChcImlmKG8ub25lb2ZzKVwiKVxyXG4gICAgICAgICAgICAoXCJkJXM9JWpcIiwgdXRpbC5zYWZlUHJvcChmaWVsZC5wYXJ0T2YubmFtZSksIGZpZWxkLm5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZW5cclxuICAgIChcIn1cIik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZ2VuXHJcbiAgICAoXCJyZXR1cm4gZFwiKTtcclxuICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUsIGJsb2NrLXNjb3BlZC12YXIsIG5vLXJlZGVjbGFyZSAqL1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBkZWNvZGVyO1xyXG5cclxudmFyIEVudW0gICAgPSByZXF1aXJlKFwiLi9lbnVtXCIpLFxyXG4gICAgdHlwZXMgICA9IHJlcXVpcmUoXCIuL3R5cGVzXCIpLFxyXG4gICAgdXRpbCAgICA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG5mdW5jdGlvbiBtaXNzaW5nKGZpZWxkKSB7XHJcbiAgICByZXR1cm4gXCJtaXNzaW5nIHJlcXVpcmVkICdcIiArIGZpZWxkLm5hbWUgKyBcIidcIjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIGRlY29kZXIgc3BlY2lmaWMgdG8gdGhlIHNwZWNpZmllZCBtZXNzYWdlIHR5cGUuXHJcbiAqIEBwYXJhbSB7VHlwZX0gbXR5cGUgTWVzc2FnZSB0eXBlXHJcbiAqIEByZXR1cm5zIHtDb2RlZ2VufSBDb2RlZ2VuIGluc3RhbmNlXHJcbiAqL1xyXG5mdW5jdGlvbiBkZWNvZGVyKG10eXBlKSB7XHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSAqL1xyXG4gICAgdmFyIGdlbiA9IHV0aWwuY29kZWdlbihcInJcIiwgXCJsXCIpXHJcbiAgICAoXCJpZighKHIgaW5zdGFuY2VvZiBSZWFkZXIpKVwiKVxyXG4gICAgICAgIChcInI9UmVhZGVyLmNyZWF0ZShyKVwiKVxyXG4gICAgKFwidmFyIGM9bD09PXVuZGVmaW5lZD9yLmxlbjpyLnBvcytsLG09bmV3IHRoaXMuY3RvclwiICsgKG10eXBlLmZpZWxkc0FycmF5LmZpbHRlcihmdW5jdGlvbihmaWVsZCkgeyByZXR1cm4gZmllbGQubWFwOyB9KS5sZW5ndGggPyBcIixrXCIgOiBcIlwiKSlcclxuICAgIChcIndoaWxlKHIucG9zPGMpe1wiKVxyXG4gICAgICAgIChcInZhciB0PXIudWludDMyKClcIik7XHJcbiAgICBpZiAobXR5cGUuZ3JvdXApIGdlblxyXG4gICAgICAgIChcImlmKCh0JjcpPT09NClcIilcclxuICAgICAgICAgICAgKFwiYnJlYWtcIik7XHJcbiAgICBnZW5cclxuICAgICAgICAoXCJzd2l0Y2godD4+PjMpe1wiKTtcclxuXHJcbiAgICB2YXIgaSA9IDA7XHJcbiAgICBmb3IgKDsgaSA8IC8qIGluaXRpYWxpemVzICovIG10eXBlLmZpZWxkc0FycmF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgdmFyIGZpZWxkID0gbXR5cGUuX2ZpZWxkc0FycmF5W2ldLnJlc29sdmUoKSxcclxuICAgICAgICAgICAgdHlwZSAgPSBmaWVsZC5yZXNvbHZlZFR5cGUgaW5zdGFuY2VvZiBFbnVtID8gXCJ1aW50MzJcIiA6IGZpZWxkLnR5cGUsXHJcbiAgICAgICAgICAgIHJlZiAgID0gXCJtXCIgKyB1dGlsLnNhZmVQcm9wKGZpZWxkLm5hbWUpOyBnZW5cclxuICAgICAgICAgICAgKFwiY2FzZSAlZDpcIiwgZmllbGQuaWQpO1xyXG5cclxuICAgICAgICAvLyBNYXAgZmllbGRzXHJcbiAgICAgICAgaWYgKGZpZWxkLm1hcCkgeyBnZW5cclxuICAgICAgICAgICAgICAgIChcInIuc2tpcCgpLnBvcysrXCIpIC8vIGFzc3VtZXMgaWQgMSArIGtleSB3aXJlVHlwZVxyXG4gICAgICAgICAgICAgICAgKFwiaWYoJXM9PT11dGlsLmVtcHR5T2JqZWN0KVwiLCByZWYpXHJcbiAgICAgICAgICAgICAgICAgICAgKFwiJXM9e31cIiwgcmVmKVxyXG4gICAgICAgICAgICAgICAgKFwiaz1yLiVzKClcIiwgZmllbGQua2V5VHlwZSlcclxuICAgICAgICAgICAgICAgIChcInIucG9zKytcIik7IC8vIGFzc3VtZXMgaWQgMiArIHZhbHVlIHdpcmVUeXBlXHJcbiAgICAgICAgICAgIGlmICh0eXBlcy5sb25nW2ZpZWxkLmtleVR5cGVdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlcy5iYXNpY1t0eXBlXSA9PT0gdW5kZWZpbmVkKSBnZW5cclxuICAgICAgICAgICAgICAgIChcIiVzW3R5cGVvZiBrPT09XFxcIm9iamVjdFxcXCI/dXRpbC5sb25nVG9IYXNoKGspOmtdPXR5cGVzWyVkXS5kZWNvZGUocixyLnVpbnQzMigpKVwiLCByZWYsIGkpOyAvLyBjYW4ndCBiZSBncm91cHNcclxuICAgICAgICAgICAgICAgIGVsc2UgZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCIlc1t0eXBlb2Ygaz09PVxcXCJvYmplY3RcXFwiP3V0aWwubG9uZ1RvSGFzaChrKTprXT1yLiVzKClcIiwgcmVmLCB0eXBlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlcy5iYXNpY1t0eXBlXSA9PT0gdW5kZWZpbmVkKSBnZW5cclxuICAgICAgICAgICAgICAgIChcIiVzW2tdPXR5cGVzWyVkXS5kZWNvZGUocixyLnVpbnQzMigpKVwiLCByZWYsIGkpOyAvLyBjYW4ndCBiZSBncm91cHNcclxuICAgICAgICAgICAgICAgIGVsc2UgZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCIlc1trXT1yLiVzKClcIiwgcmVmLCB0eXBlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBSZXBlYXRlZCBmaWVsZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGZpZWxkLnJlcGVhdGVkKSB7IGdlblxyXG5cclxuICAgICAgICAgICAgICAgIChcImlmKCEoJXMmJiVzLmxlbmd0aCkpXCIsIHJlZiwgcmVmKVxyXG4gICAgICAgICAgICAgICAgICAgIChcIiVzPVtdXCIsIHJlZik7XHJcblxyXG4gICAgICAgICAgICAvLyBQYWNrYWJsZSAoYWx3YXlzIGNoZWNrIGZvciBmb3J3YXJkIGFuZCBiYWNrd2FyZCBjb21wYXRpYmxpdHkpXHJcbiAgICAgICAgICAgIGlmICh0eXBlcy5wYWNrZWRbdHlwZV0gIT09IHVuZGVmaW5lZCkgZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJpZigodCY3KT09PTIpe1wiKVxyXG4gICAgICAgICAgICAgICAgICAgIChcInZhciBjMj1yLnVpbnQzMigpK3IucG9zXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgKFwid2hpbGUoci5wb3M8YzIpXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChcIiVzLnB1c2goci4lcygpKVwiLCByZWYsIHR5cGUpXHJcbiAgICAgICAgICAgICAgICAoXCJ9ZWxzZVwiKTtcclxuXHJcbiAgICAgICAgICAgIC8vIE5vbi1wYWNrZWRcclxuICAgICAgICAgICAgaWYgKHR5cGVzLmJhc2ljW3R5cGVdID09PSB1bmRlZmluZWQpIGdlbihmaWVsZC5yZXNvbHZlZFR5cGUuZ3JvdXBcclxuICAgICAgICAgICAgICAgICAgICA/IFwiJXMucHVzaCh0eXBlc1slZF0uZGVjb2RlKHIpKVwiXHJcbiAgICAgICAgICAgICAgICAgICAgOiBcIiVzLnB1c2godHlwZXNbJWRdLmRlY29kZShyLHIudWludDMyKCkpKVwiLCByZWYsIGkpO1xyXG4gICAgICAgICAgICBlbHNlIGdlblxyXG4gICAgICAgICAgICAgICAgICAgIChcIiVzLnB1c2goci4lcygpKVwiLCByZWYsIHR5cGUpO1xyXG5cclxuICAgICAgICAvLyBOb24tcmVwZWF0ZWRcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVzLmJhc2ljW3R5cGVdID09PSB1bmRlZmluZWQpIGdlbihmaWVsZC5yZXNvbHZlZFR5cGUuZ3JvdXBcclxuICAgICAgICAgICAgICAgID8gXCIlcz10eXBlc1slZF0uZGVjb2RlKHIpXCJcclxuICAgICAgICAgICAgICAgIDogXCIlcz10eXBlc1slZF0uZGVjb2RlKHIsci51aW50MzIoKSlcIiwgcmVmLCBpKTtcclxuICAgICAgICBlbHNlIGdlblxyXG4gICAgICAgICAgICAgICAgKFwiJXM9ci4lcygpXCIsIHJlZiwgdHlwZSk7XHJcbiAgICAgICAgZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJicmVha1wiKTtcclxuICAgIC8vIFVua25vd24gZmllbGRzXHJcbiAgICB9IGdlblxyXG4gICAgICAgICAgICAoXCJkZWZhdWx0OlwiKVxyXG4gICAgICAgICAgICAgICAgKFwici5za2lwVHlwZSh0JjcpXCIpXHJcbiAgICAgICAgICAgICAgICAoXCJicmVha1wiKVxyXG5cclxuICAgICAgICAoXCJ9XCIpXHJcbiAgICAoXCJ9XCIpO1xyXG5cclxuICAgIC8vIEZpZWxkIHByZXNlbmNlXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgbXR5cGUuX2ZpZWxkc0FycmF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgdmFyIHJmaWVsZCA9IG10eXBlLl9maWVsZHNBcnJheVtpXTtcclxuICAgICAgICBpZiAocmZpZWxkLnJlcXVpcmVkKSBnZW5cclxuICAgIChcImlmKCFtLmhhc093blByb3BlcnR5KCVqKSlcIiwgcmZpZWxkLm5hbWUpXHJcbiAgICAgICAgKFwidGhyb3cgdXRpbC5Qcm90b2NvbEVycm9yKCVqLHtpbnN0YW5jZTptfSlcIiwgbWlzc2luZyhyZmllbGQpKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZ2VuXHJcbiAgICAoXCJyZXR1cm4gbVwiKTtcclxuICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUgKi9cclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBlbmNvZGVyO1xyXG5cclxudmFyIEVudW0gICAgID0gcmVxdWlyZShcIi4vZW51bVwiKSxcclxuICAgIHR5cGVzICAgID0gcmVxdWlyZShcIi4vdHlwZXNcIiksXHJcbiAgICB1dGlsICAgICA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG4vKipcclxuICogR2VuZXJhdGVzIGEgcGFydGlhbCBtZXNzYWdlIHR5cGUgZW5jb2Rlci5cclxuICogQHBhcmFtIHtDb2RlZ2VufSBnZW4gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge0ZpZWxkfSBmaWVsZCBSZWZsZWN0ZWQgZmllbGRcclxuICogQHBhcmFtIHtudW1iZXJ9IGZpZWxkSW5kZXggRmllbGQgaW5kZXhcclxuICogQHBhcmFtIHtzdHJpbmd9IHJlZiBWYXJpYWJsZSByZWZlcmVuY2VcclxuICogQHJldHVybnMge0NvZGVnZW59IENvZGVnZW4gaW5zdGFuY2VcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gZ2VuVHlwZVBhcnRpYWwoZ2VuLCBmaWVsZCwgZmllbGRJbmRleCwgcmVmKSB7XHJcbiAgICByZXR1cm4gZmllbGQucmVzb2x2ZWRUeXBlLmdyb3VwXHJcbiAgICAgICAgPyBnZW4oXCJ0eXBlc1slZF0uZW5jb2RlKCVzLHcudWludDMyKCVkKSkudWludDMyKCVkKVwiLCBmaWVsZEluZGV4LCByZWYsIChmaWVsZC5pZCA8PCAzIHwgMykgPj4+IDAsIChmaWVsZC5pZCA8PCAzIHwgNCkgPj4+IDApXHJcbiAgICAgICAgOiBnZW4oXCJ0eXBlc1slZF0uZW5jb2RlKCVzLHcudWludDMyKCVkKS5mb3JrKCkpLmxkZWxpbSgpXCIsIGZpZWxkSW5kZXgsIHJlZiwgKGZpZWxkLmlkIDw8IDMgfCAyKSA+Pj4gMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYW4gZW5jb2RlciBzcGVjaWZpYyB0byB0aGUgc3BlY2lmaWVkIG1lc3NhZ2UgdHlwZS5cclxuICogQHBhcmFtIHtUeXBlfSBtdHlwZSBNZXNzYWdlIHR5cGVcclxuICogQHJldHVybnMge0NvZGVnZW59IENvZGVnZW4gaW5zdGFuY2VcclxuICovXHJcbmZ1bmN0aW9uIGVuY29kZXIobXR5cGUpIHtcclxuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lLCBibG9jay1zY29wZWQtdmFyLCBuby1yZWRlY2xhcmUgKi9cclxuICAgIHZhciBnZW4gPSB1dGlsLmNvZGVnZW4oXCJtXCIsIFwid1wiKVxyXG4gICAgKFwiaWYoIXcpXCIpXHJcbiAgICAgICAgKFwidz1Xcml0ZXIuY3JlYXRlKClcIik7XHJcblxyXG4gICAgdmFyIGksIHJlZjtcclxuXHJcbiAgICAvLyBcIndoZW4gYSBtZXNzYWdlIGlzIHNlcmlhbGl6ZWQgaXRzIGtub3duIGZpZWxkcyBzaG91bGQgYmUgd3JpdHRlbiBzZXF1ZW50aWFsbHkgYnkgZmllbGQgbnVtYmVyXCJcclxuICAgIHZhciBmaWVsZHMgPSAvKiBpbml0aWFsaXplcyAqLyBtdHlwZS5maWVsZHNBcnJheS5zbGljZSgpLnNvcnQodXRpbC5jb21wYXJlRmllbGRzQnlJZCk7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICB2YXIgZmllbGQgICAgPSBmaWVsZHNbaV0ucmVzb2x2ZSgpLFxyXG4gICAgICAgICAgICBpbmRleCAgICA9IG10eXBlLl9maWVsZHNBcnJheS5pbmRleE9mKGZpZWxkKSxcclxuICAgICAgICAgICAgdHlwZSAgICAgPSBmaWVsZC5yZXNvbHZlZFR5cGUgaW5zdGFuY2VvZiBFbnVtID8gXCJ1aW50MzJcIiA6IGZpZWxkLnR5cGUsXHJcbiAgICAgICAgICAgIHdpcmVUeXBlID0gdHlwZXMuYmFzaWNbdHlwZV07XHJcbiAgICAgICAgICAgIHJlZiAgICAgID0gXCJtXCIgKyB1dGlsLnNhZmVQcm9wKGZpZWxkLm5hbWUpO1xyXG5cclxuICAgICAgICAvLyBNYXAgZmllbGRzXHJcbiAgICAgICAgaWYgKGZpZWxkLm1hcCkge1xyXG4gICAgICAgICAgICBnZW5cclxuICAgIChcImlmKCVzIT1udWxsJiZtLmhhc093blByb3BlcnR5KCVqKSl7XCIsIHJlZiwgZmllbGQubmFtZSkgLy8gIT09IHVuZGVmaW5lZCAmJiAhPT0gbnVsbFxyXG4gICAgICAgIChcImZvcih2YXIga3M9T2JqZWN0LmtleXMoJXMpLGk9MDtpPGtzLmxlbmd0aDsrK2kpe1wiLCByZWYpXHJcbiAgICAgICAgICAgIChcIncudWludDMyKCVkKS5mb3JrKCkudWludDMyKCVkKS4lcyhrc1tpXSlcIiwgKGZpZWxkLmlkIDw8IDMgfCAyKSA+Pj4gMCwgOCB8IHR5cGVzLm1hcEtleVtmaWVsZC5rZXlUeXBlXSwgZmllbGQua2V5VHlwZSk7XHJcbiAgICAgICAgICAgIGlmICh3aXJlVHlwZSA9PT0gdW5kZWZpbmVkKSBnZW5cclxuICAgICAgICAgICAgKFwidHlwZXNbJWRdLmVuY29kZSglc1trc1tpXV0sdy51aW50MzIoMTgpLmZvcmsoKSkubGRlbGltKCkubGRlbGltKClcIiwgaW5kZXgsIHJlZik7IC8vIGNhbid0IGJlIGdyb3Vwc1xyXG4gICAgICAgICAgICBlbHNlIGdlblxyXG4gICAgICAgICAgICAoXCIudWludDMyKCVkKS4lcyglc1trc1tpXV0pLmxkZWxpbSgpXCIsIDE2IHwgd2lyZVR5cGUsIHR5cGUsIHJlZik7XHJcbiAgICAgICAgICAgIGdlblxyXG4gICAgICAgIChcIn1cIilcclxuICAgIChcIn1cIik7XHJcblxyXG4gICAgICAgICAgICAvLyBSZXBlYXRlZCBmaWVsZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGZpZWxkLnJlcGVhdGVkKSB7IGdlblxyXG4gICAgKFwiaWYoJXMhPW51bGwmJiVzLmxlbmd0aCl7XCIsIHJlZiwgcmVmKTsgLy8gIT09IHVuZGVmaW5lZCAmJiAhPT0gbnVsbFxyXG5cclxuICAgICAgICAgICAgLy8gUGFja2VkIHJlcGVhdGVkXHJcbiAgICAgICAgICAgIGlmIChmaWVsZC5wYWNrZWQgJiYgdHlwZXMucGFja2VkW3R5cGVdICE9PSB1bmRlZmluZWQpIHsgZ2VuXHJcblxyXG4gICAgICAgIChcIncudWludDMyKCVkKS5mb3JrKClcIiwgKGZpZWxkLmlkIDw8IDMgfCAyKSA+Pj4gMClcclxuICAgICAgICAoXCJmb3IodmFyIGk9MDtpPCVzLmxlbmd0aDsrK2kpXCIsIHJlZilcclxuICAgICAgICAgICAgKFwidy4lcyglc1tpXSlcIiwgdHlwZSwgcmVmKVxyXG4gICAgICAgIChcIncubGRlbGltKClcIik7XHJcblxyXG4gICAgICAgICAgICAvLyBOb24tcGFja2VkXHJcbiAgICAgICAgICAgIH0gZWxzZSB7IGdlblxyXG5cclxuICAgICAgICAoXCJmb3IodmFyIGk9MDtpPCVzLmxlbmd0aDsrK2kpXCIsIHJlZik7XHJcbiAgICAgICAgICAgICAgICBpZiAod2lyZVR5cGUgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgZ2VuVHlwZVBhcnRpYWwoZ2VuLCBmaWVsZCwgaW5kZXgsIHJlZiArIFwiW2ldXCIpO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBnZW5cclxuICAgICAgICAgICAgKFwidy51aW50MzIoJWQpLiVzKCVzW2ldKVwiLCAoZmllbGQuaWQgPDwgMyB8IHdpcmVUeXBlKSA+Pj4gMCwgdHlwZSwgcmVmKTtcclxuXHJcbiAgICAgICAgICAgIH0gZ2VuXHJcbiAgICAoXCJ9XCIpO1xyXG5cclxuICAgICAgICAvLyBOb24tcmVwZWF0ZWRcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoZmllbGQub3B0aW9uYWwpIGdlblxyXG4gICAgKFwiaWYoJXMhPW51bGwmJm0uaGFzT3duUHJvcGVydHkoJWopKVwiLCByZWYsIGZpZWxkLm5hbWUpOyAvLyAhPT0gdW5kZWZpbmVkICYmICE9PSBudWxsXHJcblxyXG4gICAgICAgICAgICBpZiAod2lyZVR5cGUgPT09IHVuZGVmaW5lZClcclxuICAgICAgICBnZW5UeXBlUGFydGlhbChnZW4sIGZpZWxkLCBpbmRleCwgcmVmKTtcclxuICAgICAgICAgICAgZWxzZSBnZW5cclxuICAgICAgICAoXCJ3LnVpbnQzMiglZCkuJXMoJXMpXCIsIChmaWVsZC5pZCA8PCAzIHwgd2lyZVR5cGUpID4+PiAwLCB0eXBlLCByZWYpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGdlblxyXG4gICAgKFwicmV0dXJuIHdcIik7XHJcbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lLCBibG9jay1zY29wZWQtdmFyLCBuby1yZWRlY2xhcmUgKi9cclxufSIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEVudW07XHJcblxyXG4vLyBleHRlbmRzIFJlZmxlY3Rpb25PYmplY3RcclxudmFyIFJlZmxlY3Rpb25PYmplY3QgPSByZXF1aXJlKFwiLi9vYmplY3RcIik7XHJcbigoRW51bS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBFbnVtKS5jbGFzc05hbWUgPSBcIkVudW1cIjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IGVudW0gaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgUmVmbGVjdGVkIGVudW0uXHJcbiAqIEBleHRlbmRzIFJlZmxlY3Rpb25PYmplY3RcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFVuaXF1ZSBuYW1lIHdpdGhpbiBpdHMgbmFtZXNwYWNlXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsbnVtYmVyPn0gW3ZhbHVlc10gRW51bSB2YWx1ZXMgYXMgYW4gb2JqZWN0LCBieSBuYW1lXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBEZWNsYXJlZCBvcHRpb25zXHJcbiAqL1xyXG5mdW5jdGlvbiBFbnVtKG5hbWUsIHZhbHVlcywgb3B0aW9ucykge1xyXG4gICAgUmVmbGVjdGlvbk9iamVjdC5jYWxsKHRoaXMsIG5hbWUsIG9wdGlvbnMpO1xyXG5cclxuICAgIGlmICh2YWx1ZXMgJiYgdHlwZW9mIHZhbHVlcyAhPT0gXCJvYmplY3RcIilcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJ2YWx1ZXMgbXVzdCBiZSBhbiBvYmplY3RcIik7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFbnVtIHZhbHVlcyBieSBpZC5cclxuICAgICAqIEB0eXBlIHtPYmplY3QuPG51bWJlcixzdHJpbmc+fVxyXG4gICAgICovXHJcbiAgICB0aGlzLnZhbHVlc0J5SWQgPSB7fTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEVudW0gdmFsdWVzIGJ5IG5hbWUuXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsbnVtYmVyPn1cclxuICAgICAqL1xyXG4gICAgdGhpcy52YWx1ZXMgPSBPYmplY3QuY3JlYXRlKHRoaXMudmFsdWVzQnlJZCk7IC8vIHRvSlNPTiwgbWFya2VyXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBWYWx1ZSBjb21tZW50IHRleHRzLCBpZiBhbnkuXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsc3RyaW5nPn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5jb21tZW50cyA9IHt9O1xyXG5cclxuICAgIC8vIE5vdGUgdGhhdCB2YWx1ZXMgaW5oZXJpdCB2YWx1ZXNCeUlkIG9uIHRoZWlyIHByb3RvdHlwZSB3aGljaCBtYWtlcyB0aGVtIGEgVHlwZVNjcmlwdC1cclxuICAgIC8vIGNvbXBhdGlibGUgZW51bS4gVGhpcyBpcyB1c2VkIGJ5IHBidHMgdG8gd3JpdGUgYWN0dWFsIGVudW0gZGVmaW5pdGlvbnMgdGhhdCB3b3JrIGZvclxyXG4gICAgLy8gc3RhdGljIGFuZCByZWZsZWN0aW9uIGNvZGUgYWxpa2UgaW5zdGVhZCBvZiBlbWl0dGluZyBnZW5lcmljIG9iamVjdCBkZWZpbml0aW9ucy5cclxuXHJcbiAgICBpZiAodmFsdWVzKVxyXG4gICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMudmFsdWVzQnlJZFsgdGhpcy52YWx1ZXNba2V5c1tpXV0gPSB2YWx1ZXNba2V5c1tpXV0gXSA9IGtleXNbaV07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFbnVtIGRlc2NyaXB0b3IuXHJcbiAqIEB0eXBlZGVmIEVudW1EZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsbnVtYmVyPn0gdmFsdWVzIEVudW0gdmFsdWVzXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBFbnVtIG9wdGlvbnNcclxuICovXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhbiBlbnVtIGZyb20gYW4gZW51bSBkZXNjcmlwdG9yLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBFbnVtIG5hbWVcclxuICogQHBhcmFtIHtFbnVtRGVzY3JpcHRvcn0ganNvbiBFbnVtIGRlc2NyaXB0b3JcclxuICogQHJldHVybnMge0VudW19IENyZWF0ZWQgZW51bVxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGFyZ3VtZW50cyBhcmUgaW52YWxpZFxyXG4gKi9cclxuRW51bS5mcm9tSlNPTiA9IGZ1bmN0aW9uIGZyb21KU09OKG5hbWUsIGpzb24pIHtcclxuICAgIHJldHVybiBuZXcgRW51bShuYW1lLCBqc29uLnZhbHVlcywganNvbi5vcHRpb25zKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIGVudW0gdG8gYW4gZW51bSBkZXNjcmlwdG9yLlxyXG4gKiBAcmV0dXJucyB7RW51bURlc2NyaXB0b3J9IEVudW0gZGVzY3JpcHRvclxyXG4gKi9cclxuRW51bS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBvcHRpb25zIDogdGhpcy5vcHRpb25zLFxyXG4gICAgICAgIHZhbHVlcyAgOiB0aGlzLnZhbHVlc1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgdmFsdWUgdG8gdGhpcyBlbnVtLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBWYWx1ZSBuYW1lXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBpZCBWYWx1ZSBpZFxyXG4gKiBAcGFyYW0gez9zdHJpbmd9IGNvbW1lbnQgQ29tbWVudCwgaWYgYW55XHJcbiAqIEByZXR1cm5zIHtFbnVtfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICogQHRocm93cyB7RXJyb3J9IElmIHRoZXJlIGlzIGFscmVhZHkgYSB2YWx1ZSB3aXRoIHRoaXMgbmFtZSBvciBpZFxyXG4gKi9cclxuRW51bS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24obmFtZSwgaWQsIGNvbW1lbnQpIHtcclxuICAgIC8vIHV0aWxpemVkIGJ5IHRoZSBwYXJzZXIgYnV0IG5vdCBieSAuZnJvbUpTT05cclxuXHJcbiAgICBpZiAoIXV0aWwuaXNTdHJpbmcobmFtZSkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwibmFtZSBtdXN0IGJlIGEgc3RyaW5nXCIpO1xyXG5cclxuICAgIGlmICghdXRpbC5pc0ludGVnZXIoaWQpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcImlkIG11c3QgYmUgYW4gaW50ZWdlclwiKTtcclxuXHJcbiAgICBpZiAodGhpcy52YWx1ZXNbbmFtZV0gIT09IHVuZGVmaW5lZClcclxuICAgICAgICB0aHJvdyBFcnJvcihcImR1cGxpY2F0ZSBuYW1lXCIpO1xyXG5cclxuICAgIGlmICh0aGlzLnZhbHVlc0J5SWRbaWRdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBpZiAoISh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLmFsbG93X2FsaWFzKSlcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJkdXBsaWNhdGUgaWRcIik7XHJcbiAgICAgICAgdGhpcy52YWx1ZXNbbmFtZV0gPSBpZDtcclxuICAgIH0gZWxzZVxyXG4gICAgICAgIHRoaXMudmFsdWVzQnlJZFt0aGlzLnZhbHVlc1tuYW1lXSA9IGlkXSA9IG5hbWU7XHJcblxyXG4gICAgdGhpcy5jb21tZW50c1tuYW1lXSA9IGNvbW1lbnQgfHwgbnVsbDtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbW92ZXMgYSB2YWx1ZSBmcm9tIHRoaXMgZW51bVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBWYWx1ZSBuYW1lXHJcbiAqIEByZXR1cm5zIHtFbnVtfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICogQHRocm93cyB7RXJyb3J9IElmIGBuYW1lYCBpcyBub3QgYSBuYW1lIG9mIHRoaXMgZW51bVxyXG4gKi9cclxuRW51bS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24obmFtZSkge1xyXG5cclxuICAgIGlmICghdXRpbC5pc1N0cmluZyhuYW1lKSlcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJuYW1lIG11c3QgYmUgYSBzdHJpbmdcIik7XHJcblxyXG4gICAgdmFyIHZhbCA9IHRoaXMudmFsdWVzW25hbWVdO1xyXG4gICAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgIHRocm93IEVycm9yKFwibmFtZSBkb2VzIG5vdCBleGlzdFwiKTtcclxuXHJcbiAgICBkZWxldGUgdGhpcy52YWx1ZXNCeUlkW3ZhbF07XHJcbiAgICBkZWxldGUgdGhpcy52YWx1ZXNbbmFtZV07XHJcbiAgICBkZWxldGUgdGhpcy5jb21tZW50c1tuYW1lXTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gRmllbGQ7XHJcblxyXG4vLyBleHRlbmRzIFJlZmxlY3Rpb25PYmplY3RcclxudmFyIFJlZmxlY3Rpb25PYmplY3QgPSByZXF1aXJlKFwiLi9vYmplY3RcIik7XHJcbigoRmllbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShSZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gRmllbGQpLmNsYXNzTmFtZSA9IFwiRmllbGRcIjtcclxuXHJcbnZhciBFbnVtICA9IHJlcXVpcmUoXCIuL2VudW1cIiksXHJcbiAgICB0eXBlcyA9IHJlcXVpcmUoXCIuL3R5cGVzXCIpLFxyXG4gICAgdXRpbCAgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxudmFyIFR5cGU7IC8vIGN5Y2xpY1xyXG5cclxudmFyIHJ1bGVSZSA9IC9ecmVxdWlyZWR8b3B0aW9uYWx8cmVwZWF0ZWQkLztcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IG1lc3NhZ2UgZmllbGQgaW5zdGFuY2UuIE5vdGUgdGhhdCB7QGxpbmsgTWFwRmllbGR8bWFwIGZpZWxkc30gaGF2ZSB0aGVpciBvd24gY2xhc3MuXHJcbiAqIEBjbGFzc2Rlc2MgUmVmbGVjdGVkIG1lc3NhZ2UgZmllbGQuXHJcbiAqIEBleHRlbmRzIFJlZmxlY3Rpb25PYmplY3RcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFVuaXF1ZSBuYW1lIHdpdGhpbiBpdHMgbmFtZXNwYWNlXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBpZCBVbmlxdWUgaWQgd2l0aGluIGl0cyBuYW1lc3BhY2VcclxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgVmFsdWUgdHlwZVxyXG4gKiBAcGFyYW0ge3N0cmluZ3xPYmplY3QuPHN0cmluZywqPn0gW3J1bGU9XCJvcHRpb25hbFwiXSBGaWVsZCBydWxlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfE9iamVjdC48c3RyaW5nLCo+fSBbZXh0ZW5kXSBFeHRlbmRlZCB0eXBlIGlmIGRpZmZlcmVudCBmcm9tIHBhcmVudFxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gRGVjbGFyZWQgb3B0aW9uc1xyXG4gKi9cclxuZnVuY3Rpb24gRmllbGQobmFtZSwgaWQsIHR5cGUsIHJ1bGUsIGV4dGVuZCwgb3B0aW9ucykge1xyXG5cclxuICAgIGlmICh1dGlsLmlzT2JqZWN0KHJ1bGUpKSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IHJ1bGU7XHJcbiAgICAgICAgcnVsZSA9IGV4dGVuZCA9IHVuZGVmaW5lZDtcclxuICAgIH0gZWxzZSBpZiAodXRpbC5pc09iamVjdChleHRlbmQpKSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZDtcclxuICAgICAgICBleHRlbmQgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgUmVmbGVjdGlvbk9iamVjdC5jYWxsKHRoaXMsIG5hbWUsIG9wdGlvbnMpO1xyXG5cclxuICAgIGlmICghdXRpbC5pc0ludGVnZXIoaWQpIHx8IGlkIDwgMClcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJpZCBtdXN0IGJlIGEgbm9uLW5lZ2F0aXZlIGludGVnZXJcIik7XHJcblxyXG4gICAgaWYgKCF1dGlsLmlzU3RyaW5nKHR5cGUpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcInR5cGUgbXVzdCBiZSBhIHN0cmluZ1wiKTtcclxuXHJcbiAgICBpZiAocnVsZSAhPT0gdW5kZWZpbmVkICYmICFydWxlUmUudGVzdChydWxlID0gcnVsZS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcInJ1bGUgbXVzdCBiZSBhIHN0cmluZyBydWxlXCIpO1xyXG5cclxuICAgIGlmIChleHRlbmQgIT09IHVuZGVmaW5lZCAmJiAhdXRpbC5pc1N0cmluZyhleHRlbmQpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcImV4dGVuZCBtdXN0IGJlIGEgc3RyaW5nXCIpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmllbGQgcnVsZSwgaWYgYW55LlxyXG4gICAgICogQHR5cGUge3N0cmluZ3x1bmRlZmluZWR9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucnVsZSA9IHJ1bGUgJiYgcnVsZSAhPT0gXCJvcHRpb25hbFwiID8gcnVsZSA6IHVuZGVmaW5lZDsgLy8gdG9KU09OXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaWVsZCB0eXBlLlxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgdGhpcy50eXBlID0gdHlwZTsgLy8gdG9KU09OXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVbmlxdWUgZmllbGQgaWQuXHJcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmlkID0gaWQ7IC8vIHRvSlNPTiwgbWFya2VyXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFeHRlbmRlZCB0eXBlIGlmIGRpZmZlcmVudCBmcm9tIHBhcmVudC5cclxuICAgICAqIEB0eXBlIHtzdHJpbmd8dW5kZWZpbmVkfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmV4dGVuZCA9IGV4dGVuZCB8fCB1bmRlZmluZWQ7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogV2hldGhlciB0aGlzIGZpZWxkIGlzIHJlcXVpcmVkLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVxdWlyZWQgPSBydWxlID09PSBcInJlcXVpcmVkXCI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXaGV0aGVyIHRoaXMgZmllbGQgaXMgb3B0aW9uYWwuXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5vcHRpb25hbCA9ICF0aGlzLnJlcXVpcmVkO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogV2hldGhlciB0aGlzIGZpZWxkIGlzIHJlcGVhdGVkLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVwZWF0ZWQgPSBydWxlID09PSBcInJlcGVhdGVkXCI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXaGV0aGVyIHRoaXMgZmllbGQgaXMgYSBtYXAgb3Igbm90LlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMubWFwID0gZmFsc2U7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBNZXNzYWdlIHRoaXMgZmllbGQgYmVsb25ncyB0by5cclxuICAgICAqIEB0eXBlIHs/VHlwZX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5tZXNzYWdlID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE9uZU9mIHRoaXMgZmllbGQgYmVsb25ncyB0bywgaWYgYW55LFxyXG4gICAgICogQHR5cGUgez9PbmVPZn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5wYXJ0T2YgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGZpZWxkIHR5cGUncyBkZWZhdWx0IHZhbHVlLlxyXG4gICAgICogQHR5cGUgeyp9XHJcbiAgICAgKi9cclxuICAgIHRoaXMudHlwZURlZmF1bHQgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGZpZWxkJ3MgZGVmYXVsdCB2YWx1ZSBvbiBwcm90b3R5cGVzLlxyXG4gICAgICogQHR5cGUgeyp9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgdGhpcyBmaWVsZCdzIHZhbHVlIHNob3VsZCBiZSB0cmVhdGVkIGFzIGEgbG9uZy5cclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICovXHJcbiAgICB0aGlzLmxvbmcgPSB1dGlsLkxvbmcgPyB0eXBlcy5sb25nW3R5cGVdICE9PSB1bmRlZmluZWQgOiAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBmYWxzZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgdGhpcyBmaWVsZCdzIHZhbHVlIGlzIGEgYnVmZmVyLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMuYnl0ZXMgPSB0eXBlID09PSBcImJ5dGVzXCI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXNvbHZlZCB0eXBlIGlmIG5vdCBhIGJhc2ljIHR5cGUuXHJcbiAgICAgKiBAdHlwZSB7PyhUeXBlfEVudW0pfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJlc29sdmVkVHlwZSA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTaXN0ZXItZmllbGQgd2l0aGluIHRoZSBleHRlbmRlZCB0eXBlIGlmIGEgZGVjbGFyaW5nIGV4dGVuc2lvbiBmaWVsZC5cclxuICAgICAqIEB0eXBlIHs/RmllbGR9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZXh0ZW5zaW9uRmllbGQgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2lzdGVyLWZpZWxkIHdpdGhpbiB0aGUgZGVjbGFyaW5nIG5hbWVzcGFjZSBpZiBhbiBleHRlbmRlZCBmaWVsZC5cclxuICAgICAqIEB0eXBlIHs/RmllbGR9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZGVjbGFyaW5nRmllbGQgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW50ZXJuYWxseSByZW1lbWJlcnMgd2hldGhlciB0aGlzIGZpZWxkIGlzIHBhY2tlZC5cclxuICAgICAqIEB0eXBlIHs/Ym9vbGVhbn1cclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX3BhY2tlZCA9IG51bGw7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhpcyBmaWVsZCBpcyBwYWNrZWQuIE9ubHkgcmVsZXZhbnQgd2hlbiByZXBlYXRlZCBhbmQgd29ya2luZyB3aXRoIHByb3RvMi5cclxuICogQG5hbWUgRmllbGQjcGFja2VkXHJcbiAqIEB0eXBlIHtib29sZWFufVxyXG4gKiBAcmVhZG9ubHlcclxuICovXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGaWVsZC5wcm90b3R5cGUsIFwicGFja2VkXCIsIHtcclxuICAgIGdldDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gZGVmYXVsdHMgdG8gcGFja2VkPXRydWUgaWYgbm90IGV4cGxpY2l0eSBzZXQgdG8gZmFsc2VcclxuICAgICAgICBpZiAodGhpcy5fcGFja2VkID09PSBudWxsKVxyXG4gICAgICAgICAgICB0aGlzLl9wYWNrZWQgPSB0aGlzLmdldE9wdGlvbihcInBhY2tlZFwiKSAhPT0gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhY2tlZDtcclxuICAgIH1cclxufSk7XHJcblxyXG4vKipcclxuICogQG92ZXJyaWRlXHJcbiAqL1xyXG5GaWVsZC5wcm90b3R5cGUuc2V0T3B0aW9uID0gZnVuY3Rpb24gc2V0T3B0aW9uKG5hbWUsIHZhbHVlLCBpZk5vdFNldCkge1xyXG4gICAgaWYgKG5hbWUgPT09IFwicGFja2VkXCIpIC8vIGNsZWFyIGNhY2hlZCBiZWZvcmUgc2V0dGluZ1xyXG4gICAgICAgIHRoaXMuX3BhY2tlZCA9IG51bGw7XHJcbiAgICByZXR1cm4gUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUuc2V0T3B0aW9uLmNhbGwodGhpcywgbmFtZSwgdmFsdWUsIGlmTm90U2V0KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBGaWVsZCBkZXNjcmlwdG9yLlxyXG4gKiBAdHlwZWRlZiBGaWVsZERlc2NyaXB0b3JcclxuICogQHR5cGUge09iamVjdH1cclxuICogQHByb3BlcnR5IHtzdHJpbmd9IFtydWxlPVwib3B0aW9uYWxcIl0gRmllbGQgcnVsZVxyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gdHlwZSBGaWVsZCB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBpZCBGaWVsZCBpZFxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gRmllbGQgb3B0aW9uc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBFeHRlbnNpb24gZmllbGQgZGVzY3JpcHRvci5cclxuICogQHR5cGVkZWYgRXh0ZW5zaW9uRmllbGREZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbcnVsZT1cIm9wdGlvbmFsXCJdIEZpZWxkIHJ1bGVcclxuICogQHByb3BlcnR5IHtzdHJpbmd9IHR5cGUgRmllbGQgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gaWQgRmllbGQgaWRcclxuICogQHByb3BlcnR5IHtzdHJpbmd9IGV4dGVuZCBFeHRlbmRlZCB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBGaWVsZCBvcHRpb25zXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBmaWVsZCBmcm9tIGEgZmllbGQgZGVzY3JpcHRvci5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgRmllbGQgbmFtZVxyXG4gKiBAcGFyYW0ge0ZpZWxkRGVzY3JpcHRvcn0ganNvbiBGaWVsZCBkZXNjcmlwdG9yXHJcbiAqIEByZXR1cm5zIHtGaWVsZH0gQ3JlYXRlZCBmaWVsZFxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGFyZ3VtZW50cyBhcmUgaW52YWxpZFxyXG4gKi9cclxuRmllbGQuZnJvbUpTT04gPSBmdW5jdGlvbiBmcm9tSlNPTihuYW1lLCBqc29uKSB7XHJcbiAgICByZXR1cm4gbmV3IEZpZWxkKG5hbWUsIGpzb24uaWQsIGpzb24udHlwZSwganNvbi5ydWxlLCBqc29uLmV4dGVuZCwganNvbi5vcHRpb25zKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIGZpZWxkIHRvIGEgZmllbGQgZGVzY3JpcHRvci5cclxuICogQHJldHVybnMge0ZpZWxkRGVzY3JpcHRvcn0gRmllbGQgZGVzY3JpcHRvclxyXG4gKi9cclxuRmllbGQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcnVsZSAgICA6IHRoaXMucnVsZSAhPT0gXCJvcHRpb25hbFwiICYmIHRoaXMucnVsZSB8fCB1bmRlZmluZWQsXHJcbiAgICAgICAgdHlwZSAgICA6IHRoaXMudHlwZSxcclxuICAgICAgICBpZCAgICAgIDogdGhpcy5pZCxcclxuICAgICAgICBleHRlbmQgIDogdGhpcy5leHRlbmQsXHJcbiAgICAgICAgb3B0aW9ucyA6IHRoaXMub3B0aW9uc1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNvbHZlcyB0aGlzIGZpZWxkJ3MgdHlwZSByZWZlcmVuY2VzLlxyXG4gKiBAcmV0dXJucyB7RmllbGR9IGB0aGlzYFxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgYW55IHJlZmVyZW5jZSBjYW5ub3QgYmUgcmVzb2x2ZWRcclxuICovXHJcbkZpZWxkLnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24gcmVzb2x2ZSgpIHtcclxuXHJcbiAgICBpZiAodGhpcy5yZXNvbHZlZClcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuXHJcbiAgICBpZiAoKHRoaXMudHlwZURlZmF1bHQgPSB0eXBlcy5kZWZhdWx0c1t0aGlzLnR5cGVdKSA9PT0gdW5kZWZpbmVkKSB7IC8vIGlmIG5vdCBhIGJhc2ljIHR5cGUsIHJlc29sdmUgaXRcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCFUeXBlKVxyXG4gICAgICAgICAgICBUeXBlID0gcmVxdWlyZShcIi4vdHlwZVwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5yZXNvbHZlZFR5cGUgPSAodGhpcy5kZWNsYXJpbmdGaWVsZCA/IHRoaXMuZGVjbGFyaW5nRmllbGQucGFyZW50IDogdGhpcy5wYXJlbnQpLmxvb2t1cFR5cGVPckVudW0odGhpcy50eXBlKTtcclxuICAgICAgICBpZiAodGhpcy5yZXNvbHZlZFR5cGUgaW5zdGFuY2VvZiBUeXBlKVxyXG4gICAgICAgICAgICB0aGlzLnR5cGVEZWZhdWx0ID0gbnVsbDtcclxuICAgICAgICBlbHNlIC8vIGluc3RhbmNlb2YgRW51bVxyXG4gICAgICAgICAgICB0aGlzLnR5cGVEZWZhdWx0ID0gdGhpcy5yZXNvbHZlZFR5cGUudmFsdWVzW09iamVjdC5rZXlzKHRoaXMucmVzb2x2ZWRUeXBlLnZhbHVlcylbMF1dOyAvLyBmaXJzdCBkZWZpbmVkXHJcbiAgICB9XHJcblxyXG4gICAgLy8gdXNlIGV4cGxpY2l0bHkgc2V0IGRlZmF1bHQgdmFsdWUgaWYgcHJlc2VudFxyXG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnNbXCJkZWZhdWx0XCJdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aGlzLnR5cGVEZWZhdWx0ID0gdGhpcy5vcHRpb25zW1wiZGVmYXVsdFwiXTtcclxuICAgICAgICBpZiAodGhpcy5yZXNvbHZlZFR5cGUgaW5zdGFuY2VvZiBFbnVtICYmIHR5cGVvZiB0aGlzLnR5cGVEZWZhdWx0ID09PSBcInN0cmluZ1wiKVxyXG4gICAgICAgICAgICB0aGlzLnR5cGVEZWZhdWx0ID0gdGhpcy5yZXNvbHZlZFR5cGUudmFsdWVzW3RoaXMudHlwZURlZmF1bHRdO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHJlbW92ZSB1bm5lY2Vzc2FyeSBwYWNrZWQgb3B0aW9uIChwYXJzZXIgYWRkcyB0aGlzKSBpZiBub3QgcmVmZXJlbmNpbmcgYW4gZW51bVxyXG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMucGFja2VkICE9PSB1bmRlZmluZWQgJiYgdGhpcy5yZXNvbHZlZFR5cGUgJiYgISh0aGlzLnJlc29sdmVkVHlwZSBpbnN0YW5jZW9mIEVudW0pKVxyXG4gICAgICAgIGRlbGV0ZSB0aGlzLm9wdGlvbnMucGFja2VkO1xyXG5cclxuICAgIC8vIGNvbnZlcnQgdG8gaW50ZXJuYWwgZGF0YSB0eXBlIGlmIG5lY2Vzc3NhcnlcclxuICAgIGlmICh0aGlzLmxvbmcpIHtcclxuICAgICAgICB0aGlzLnR5cGVEZWZhdWx0ID0gdXRpbC5Mb25nLmZyb21OdW1iZXIodGhpcy50eXBlRGVmYXVsdCwgdGhpcy50eXBlLmNoYXJBdCgwKSA9PT0gXCJ1XCIpO1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgIGlmIChPYmplY3QuZnJlZXplKVxyXG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHRoaXMudHlwZURlZmF1bHQpOyAvLyBsb25nIGluc3RhbmNlcyBhcmUgbWVhbnQgdG8gYmUgaW1tdXRhYmxlIGFueXdheSAoaS5lLiB1c2Ugc21hbGwgaW50IGNhY2hlIHRoYXQgZXZlbiByZXF1aXJlcyBpdClcclxuXHJcbiAgICB9IGVsc2UgaWYgKHRoaXMuYnl0ZXMgJiYgdHlwZW9mIHRoaXMudHlwZURlZmF1bHQgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICB2YXIgYnVmO1xyXG4gICAgICAgIGlmICh1dGlsLmJhc2U2NC50ZXN0KHRoaXMudHlwZURlZmF1bHQpKVxyXG4gICAgICAgICAgICB1dGlsLmJhc2U2NC5kZWNvZGUodGhpcy50eXBlRGVmYXVsdCwgYnVmID0gdXRpbC5uZXdCdWZmZXIodXRpbC5iYXNlNjQubGVuZ3RoKHRoaXMudHlwZURlZmF1bHQpKSwgMCk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICB1dGlsLnV0Zjgud3JpdGUodGhpcy50eXBlRGVmYXVsdCwgYnVmID0gdXRpbC5uZXdCdWZmZXIodXRpbC51dGY4Lmxlbmd0aCh0aGlzLnR5cGVEZWZhdWx0KSksIDApO1xyXG4gICAgICAgIHRoaXMudHlwZURlZmF1bHQgPSBidWY7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdGFrZSBzcGVjaWFsIGNhcmUgb2YgbWFwcyBhbmQgcmVwZWF0ZWQgZmllbGRzXHJcbiAgICBpZiAodGhpcy5tYXApXHJcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWUgPSB1dGlsLmVtcHR5T2JqZWN0O1xyXG4gICAgZWxzZSBpZiAodGhpcy5yZXBlYXRlZClcclxuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IHV0aWwuZW1wdHlBcnJheTtcclxuICAgIGVsc2VcclxuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IHRoaXMudHlwZURlZmF1bHQ7XHJcblxyXG4gICAgcmV0dXJuIFJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlLnJlc29sdmUuY2FsbCh0aGlzKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBwcm90b2J1ZiA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vaW5kZXgtbWluaW1hbFwiKTtcclxuXHJcbnByb3RvYnVmLmJ1aWxkID0gXCJsaWdodFwiO1xyXG5cclxuLyoqXHJcbiAqIEEgbm9kZS1zdHlsZSBjYWxsYmFjayBhcyB1c2VkIGJ5IHtAbGluayBsb2FkfSBhbmQge0BsaW5rIFJvb3QjbG9hZH0uXHJcbiAqIEB0eXBlZGVmIExvYWRDYWxsYmFja1xyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7P0Vycm9yfSBlcnJvciBFcnJvciwgaWYgYW55LCBvdGhlcndpc2UgYG51bGxgXHJcbiAqIEBwYXJhbSB7Um9vdH0gW3Jvb3RdIFJvb3QsIGlmIHRoZXJlIGhhc24ndCBiZWVuIGFuIGVycm9yXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIExvYWRzIG9uZSBvciBtdWx0aXBsZSAucHJvdG8gb3IgcHJlcHJvY2Vzc2VkIC5qc29uIGZpbGVzIGludG8gYSBjb21tb24gcm9vdCBuYW1lc3BhY2UgYW5kIGNhbGxzIHRoZSBjYWxsYmFjay5cclxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IGZpbGVuYW1lIE9uZSBvciBtdWx0aXBsZSBmaWxlcyB0byBsb2FkXHJcbiAqIEBwYXJhbSB7Um9vdH0gcm9vdCBSb290IG5hbWVzcGFjZSwgZGVmYXVsdHMgdG8gY3JlYXRlIGEgbmV3IG9uZSBpZiBvbWl0dGVkLlxyXG4gKiBAcGFyYW0ge0xvYWRDYWxsYmFja30gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb25cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQHNlZSB7QGxpbmsgUm9vdCNsb2FkfVxyXG4gKi9cclxuZnVuY3Rpb24gbG9hZChmaWxlbmFtZSwgcm9vdCwgY2FsbGJhY2spIHtcclxuICAgIGlmICh0eXBlb2Ygcm9vdCA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgY2FsbGJhY2sgPSByb290O1xyXG4gICAgICAgIHJvb3QgPSBuZXcgcHJvdG9idWYuUm9vdCgpO1xyXG4gICAgfSBlbHNlIGlmICghcm9vdClcclxuICAgICAgICByb290ID0gbmV3IHByb3RvYnVmLlJvb3QoKTtcclxuICAgIHJldHVybiByb290LmxvYWQoZmlsZW5hbWUsIGNhbGxiYWNrKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIExvYWRzIG9uZSBvciBtdWx0aXBsZSAucHJvdG8gb3IgcHJlcHJvY2Vzc2VkIC5qc29uIGZpbGVzIGludG8gYSBjb21tb24gcm9vdCBuYW1lc3BhY2UgYW5kIGNhbGxzIHRoZSBjYWxsYmFjay5cclxuICogQG5hbWUgbG9hZFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IGZpbGVuYW1lIE9uZSBvciBtdWx0aXBsZSBmaWxlcyB0byBsb2FkXHJcbiAqIEBwYXJhbSB7TG9hZENhbGxiYWNrfSBjYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAc2VlIHtAbGluayBSb290I2xvYWR9XHJcbiAqIEB2YXJpYXRpb24gMlxyXG4gKi9cclxuLy8gZnVuY3Rpb24gbG9hZChmaWxlbmFtZTpzdHJpbmcsIGNhbGxiYWNrOkxvYWRDYWxsYmFjayk6dW5kZWZpbmVkXHJcblxyXG4vKipcclxuICogTG9hZHMgb25lIG9yIG11bHRpcGxlIC5wcm90byBvciBwcmVwcm9jZXNzZWQgLmpzb24gZmlsZXMgaW50byBhIGNvbW1vbiByb290IG5hbWVzcGFjZSBhbmQgcmV0dXJucyBhIHByb21pc2UuXHJcbiAqIEBuYW1lIGxvYWRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBmaWxlbmFtZSBPbmUgb3IgbXVsdGlwbGUgZmlsZXMgdG8gbG9hZFxyXG4gKiBAcGFyYW0ge1Jvb3R9IFtyb290XSBSb290IG5hbWVzcGFjZSwgZGVmYXVsdHMgdG8gY3JlYXRlIGEgbmV3IG9uZSBpZiBvbWl0dGVkLlxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxSb290Pn0gUHJvbWlzZVxyXG4gKiBAc2VlIHtAbGluayBSb290I2xvYWR9XHJcbiAqIEB2YXJpYXRpb24gM1xyXG4gKi9cclxuLy8gZnVuY3Rpb24gbG9hZChmaWxlbmFtZTpzdHJpbmcsIFtyb290OlJvb3RdKTpQcm9taXNlPFJvb3Q+XHJcblxyXG5wcm90b2J1Zi5sb2FkID0gbG9hZDtcclxuXHJcbi8qKlxyXG4gKiBTeW5jaHJvbm91c2x5IGxvYWRzIG9uZSBvciBtdWx0aXBsZSAucHJvdG8gb3IgcHJlcHJvY2Vzc2VkIC5qc29uIGZpbGVzIGludG8gYSBjb21tb24gcm9vdCBuYW1lc3BhY2UgKG5vZGUgb25seSkuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBmaWxlbmFtZSBPbmUgb3IgbXVsdGlwbGUgZmlsZXMgdG8gbG9hZFxyXG4gKiBAcGFyYW0ge1Jvb3R9IFtyb290XSBSb290IG5hbWVzcGFjZSwgZGVmYXVsdHMgdG8gY3JlYXRlIGEgbmV3IG9uZSBpZiBvbWl0dGVkLlxyXG4gKiBAcmV0dXJucyB7Um9vdH0gUm9vdCBuYW1lc3BhY2VcclxuICogQHRocm93cyB7RXJyb3J9IElmIHN5bmNocm9ub3VzIGZldGNoaW5nIGlzIG5vdCBzdXBwb3J0ZWQgKGkuZS4gaW4gYnJvd3NlcnMpIG9yIGlmIGEgZmlsZSdzIHN5bnRheCBpcyBpbnZhbGlkXHJcbiAqIEBzZWUge0BsaW5rIFJvb3QjbG9hZFN5bmN9XHJcbiAqL1xyXG5mdW5jdGlvbiBsb2FkU3luYyhmaWxlbmFtZSwgcm9vdCkge1xyXG4gICAgaWYgKCFyb290KVxyXG4gICAgICAgIHJvb3QgPSBuZXcgcHJvdG9idWYuUm9vdCgpO1xyXG4gICAgcmV0dXJuIHJvb3QubG9hZFN5bmMoZmlsZW5hbWUpO1xyXG59XHJcblxyXG5wcm90b2J1Zi5sb2FkU3luYyA9IGxvYWRTeW5jO1xyXG5cclxuLy8gU2VyaWFsaXphdGlvblxyXG5wcm90b2J1Zi5lbmNvZGVyICAgICAgICAgID0gcmVxdWlyZShcIi4vZW5jb2RlclwiKTtcclxucHJvdG9idWYuZGVjb2RlciAgICAgICAgICA9IHJlcXVpcmUoXCIuL2RlY29kZXJcIik7XHJcbnByb3RvYnVmLnZlcmlmaWVyICAgICAgICAgPSByZXF1aXJlKFwiLi92ZXJpZmllclwiKTtcclxucHJvdG9idWYuY29udmVydGVyICAgICAgICA9IHJlcXVpcmUoXCIuL2NvbnZlcnRlclwiKTtcclxuXHJcbi8vIFJlZmxlY3Rpb25cclxucHJvdG9idWYuUmVmbGVjdGlvbk9iamVjdCA9IHJlcXVpcmUoXCIuL29iamVjdFwiKTtcclxucHJvdG9idWYuTmFtZXNwYWNlICAgICAgICA9IHJlcXVpcmUoXCIuL25hbWVzcGFjZVwiKTtcclxucHJvdG9idWYuUm9vdCAgICAgICAgICAgICA9IHJlcXVpcmUoXCIuL3Jvb3RcIik7XHJcbnByb3RvYnVmLkVudW0gICAgICAgICAgICAgPSByZXF1aXJlKFwiLi9lbnVtXCIpO1xyXG5wcm90b2J1Zi5UeXBlICAgICAgICAgICAgID0gcmVxdWlyZShcIi4vdHlwZVwiKTtcclxucHJvdG9idWYuRmllbGQgICAgICAgICAgICA9IHJlcXVpcmUoXCIuL2ZpZWxkXCIpO1xyXG5wcm90b2J1Zi5PbmVPZiAgICAgICAgICAgID0gcmVxdWlyZShcIi4vb25lb2ZcIik7XHJcbnByb3RvYnVmLk1hcEZpZWxkICAgICAgICAgPSByZXF1aXJlKFwiLi9tYXBmaWVsZFwiKTtcclxucHJvdG9idWYuU2VydmljZSAgICAgICAgICA9IHJlcXVpcmUoXCIuL3NlcnZpY2VcIik7XHJcbnByb3RvYnVmLk1ldGhvZCAgICAgICAgICAgPSByZXF1aXJlKFwiLi9tZXRob2RcIik7XHJcblxyXG4vLyBSdW50aW1lXHJcbnByb3RvYnVmLkNsYXNzICAgICAgICAgICAgPSByZXF1aXJlKFwiLi9jbGFzc1wiKTtcclxucHJvdG9idWYuTWVzc2FnZSAgICAgICAgICA9IHJlcXVpcmUoXCIuL21lc3NhZ2VcIik7XHJcblxyXG4vLyBVdGlsaXR5XHJcbnByb3RvYnVmLnR5cGVzICAgICAgICAgICAgPSByZXF1aXJlKFwiLi90eXBlc1wiKTtcclxucHJvdG9idWYudXRpbCAgICAgICAgICAgICA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG4vLyBDb25maWd1cmUgcmVmbGVjdGlvblxyXG5wcm90b2J1Zi5SZWZsZWN0aW9uT2JqZWN0Ll9jb25maWd1cmUocHJvdG9idWYuUm9vdCk7XHJcbnByb3RvYnVmLk5hbWVzcGFjZS5fY29uZmlndXJlKHByb3RvYnVmLlR5cGUsIHByb3RvYnVmLlNlcnZpY2UpO1xyXG5wcm90b2J1Zi5Sb290Ll9jb25maWd1cmUocHJvdG9idWYuVHlwZSk7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgcHJvdG9idWYgPSBleHBvcnRzO1xyXG5cclxuLyoqXHJcbiAqIEJ1aWxkIHR5cGUsIG9uZSBvZiBgXCJmdWxsXCJgLCBgXCJsaWdodFwiYCBvciBgXCJtaW5pbWFsXCJgLlxyXG4gKiBAbmFtZSBidWlsZFxyXG4gKiBAdHlwZSB7c3RyaW5nfVxyXG4gKiBAY29uc3RcclxuICovXHJcbnByb3RvYnVmLmJ1aWxkID0gXCJtaW5pbWFsXCI7XHJcblxyXG4vKipcclxuICogTmFtZWQgcm9vdHMuXHJcbiAqIFRoaXMgaXMgd2hlcmUgcGJqcyBzdG9yZXMgZ2VuZXJhdGVkIHN0cnVjdHVyZXMgKHRoZSBvcHRpb24gYC1yLCAtLXJvb3RgIHNwZWNpZmllcyBhIG5hbWUpLlxyXG4gKiBDYW4gYWxzbyBiZSB1c2VkIG1hbnVhbGx5IHRvIG1ha2Ugcm9vdHMgYXZhaWxhYmxlIGFjY3Jvc3MgbW9kdWxlcy5cclxuICogQG5hbWUgcm9vdHNcclxuICogQHR5cGUge09iamVjdC48c3RyaW5nLFJvb3Q+fVxyXG4gKiBAZXhhbXBsZVxyXG4gKiAvLyBwYmpzIC1yIG15cm9vdCAtbyBjb21waWxlZC5qcyAuLi5cclxuICpcclxuICogLy8gaW4gYW5vdGhlciBtb2R1bGU6XHJcbiAqIHJlcXVpcmUoXCIuL2NvbXBpbGVkLmpzXCIpO1xyXG4gKlxyXG4gKiAvLyBpbiBhbnkgc3Vic2VxdWVudCBtb2R1bGU6XHJcbiAqIHZhciByb290ID0gcHJvdG9idWYucm9vdHNbXCJteXJvb3RcIl07XHJcbiAqL1xyXG5wcm90b2J1Zi5yb290cyA9IHt9O1xyXG5cclxuLy8gU2VyaWFsaXphdGlvblxyXG5wcm90b2J1Zi5Xcml0ZXIgICAgICAgPSByZXF1aXJlKFwiLi93cml0ZXJcIik7XHJcbnByb3RvYnVmLkJ1ZmZlcldyaXRlciA9IHJlcXVpcmUoXCIuL3dyaXRlcl9idWZmZXJcIik7XHJcbnByb3RvYnVmLlJlYWRlciAgICAgICA9IHJlcXVpcmUoXCIuL3JlYWRlclwiKTtcclxucHJvdG9idWYuQnVmZmVyUmVhZGVyID0gcmVxdWlyZShcIi4vcmVhZGVyX2J1ZmZlclwiKTtcclxuXHJcbi8vIFV0aWxpdHlcclxucHJvdG9idWYudXRpbCAgICAgICAgID0gcmVxdWlyZShcIi4vdXRpbC9taW5pbWFsXCIpO1xyXG5wcm90b2J1Zi5ycGMgICAgICAgICAgPSByZXF1aXJlKFwiLi9ycGNcIik7XHJcbnByb3RvYnVmLmNvbmZpZ3VyZSAgICA9IGNvbmZpZ3VyZTtcclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbi8qKlxyXG4gKiBSZWNvbmZpZ3VyZXMgdGhlIGxpYnJhcnkgYWNjb3JkaW5nIHRvIHRoZSBlbnZpcm9ubWVudC5cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcbmZ1bmN0aW9uIGNvbmZpZ3VyZSgpIHtcclxuICAgIHByb3RvYnVmLlJlYWRlci5fY29uZmlndXJlKHByb3RvYnVmLkJ1ZmZlclJlYWRlcik7XHJcbiAgICBwcm90b2J1Zi51dGlsLl9jb25maWd1cmUoKTtcclxufVxyXG5cclxuLy8gQ29uZmlndXJlIHNlcmlhbGl6YXRpb25cclxucHJvdG9idWYuV3JpdGVyLl9jb25maWd1cmUocHJvdG9idWYuQnVmZmVyV3JpdGVyKTtcclxuY29uZmlndXJlKCk7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgcHJvdG9idWYgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2luZGV4LWxpZ2h0XCIpO1xyXG5cclxucHJvdG9idWYuYnVpbGQgPSBcImZ1bGxcIjtcclxuXHJcbi8vIFBhcnNlclxyXG5wcm90b2J1Zi50b2tlbml6ZSAgICAgICAgID0gcmVxdWlyZShcIi4vdG9rZW5pemVcIik7XHJcbnByb3RvYnVmLnBhcnNlICAgICAgICAgICAgPSByZXF1aXJlKFwiLi9wYXJzZVwiKTtcclxucHJvdG9idWYuY29tbW9uICAgICAgICAgICA9IHJlcXVpcmUoXCIuL2NvbW1vblwiKTtcclxuXHJcbi8vIENvbmZpZ3VyZSBwYXJzZXJcclxucHJvdG9idWYuUm9vdC5fY29uZmlndXJlKHByb3RvYnVmLlR5cGUsIHByb3RvYnVmLnBhcnNlLCBwcm90b2J1Zi5jb21tb24pO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBNYXBGaWVsZDtcclxuXHJcbi8vIGV4dGVuZHMgRmllbGRcclxudmFyIEZpZWxkID0gcmVxdWlyZShcIi4vZmllbGRcIik7XHJcbigoTWFwRmllbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGaWVsZC5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IE1hcEZpZWxkKS5jbGFzc05hbWUgPSBcIk1hcEZpZWxkXCI7XHJcblxyXG52YXIgdHlwZXMgICA9IHJlcXVpcmUoXCIuL3R5cGVzXCIpLFxyXG4gICAgdXRpbCAgICA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBtYXAgZmllbGQgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgUmVmbGVjdGVkIG1hcCBmaWVsZC5cclxuICogQGV4dGVuZHMgRmllbGRcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFVuaXF1ZSBuYW1lIHdpdGhpbiBpdHMgbmFtZXNwYWNlXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBpZCBVbmlxdWUgaWQgd2l0aGluIGl0cyBuYW1lc3BhY2VcclxuICogQHBhcmFtIHtzdHJpbmd9IGtleVR5cGUgS2V5IHR5cGVcclxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgVmFsdWUgdHlwZVxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gRGVjbGFyZWQgb3B0aW9uc1xyXG4gKi9cclxuZnVuY3Rpb24gTWFwRmllbGQobmFtZSwgaWQsIGtleVR5cGUsIHR5cGUsIG9wdGlvbnMpIHtcclxuICAgIEZpZWxkLmNhbGwodGhpcywgbmFtZSwgaWQsIHR5cGUsIG9wdGlvbnMpO1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKCF1dGlsLmlzU3RyaW5nKGtleVR5cGUpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcImtleVR5cGUgbXVzdCBiZSBhIHN0cmluZ1wiKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEtleSB0eXBlLlxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgdGhpcy5rZXlUeXBlID0ga2V5VHlwZTsgLy8gdG9KU09OLCBtYXJrZXJcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlc29sdmVkIGtleSB0eXBlIGlmIG5vdCBhIGJhc2ljIHR5cGUuXHJcbiAgICAgKiBAdHlwZSB7P1JlZmxlY3Rpb25PYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVzb2x2ZWRLZXlUeXBlID0gbnVsbDtcclxuXHJcbiAgICAvLyBPdmVycmlkZXMgRmllbGQjbWFwXHJcbiAgICB0aGlzLm1hcCA9IHRydWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNYXAgZmllbGQgZGVzY3JpcHRvci5cclxuICogQHR5cGVkZWYgTWFwRmllbGREZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBrZXlUeXBlIEtleSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0eXBlIFZhbHVlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGlkIEZpZWxkIGlkXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBGaWVsZCBvcHRpb25zXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEV4dGVuc2lvbiBtYXAgZmllbGQgZGVzY3JpcHRvci5cclxuICogQHR5cGVkZWYgRXh0ZW5zaW9uTWFwRmllbGREZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBrZXlUeXBlIEtleSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0eXBlIFZhbHVlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGlkIEZpZWxkIGlkXHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBleHRlbmQgRXh0ZW5kZWQgdHlwZVxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gRmllbGQgb3B0aW9uc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbWFwIGZpZWxkIGZyb20gYSBtYXAgZmllbGQgZGVzY3JpcHRvci5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgRmllbGQgbmFtZVxyXG4gKiBAcGFyYW0ge01hcEZpZWxkRGVzY3JpcHRvcn0ganNvbiBNYXAgZmllbGQgZGVzY3JpcHRvclxyXG4gKiBAcmV0dXJucyB7TWFwRmllbGR9IENyZWF0ZWQgbWFwIGZpZWxkXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYXJndW1lbnRzIGFyZSBpbnZhbGlkXHJcbiAqL1xyXG5NYXBGaWVsZC5mcm9tSlNPTiA9IGZ1bmN0aW9uIGZyb21KU09OKG5hbWUsIGpzb24pIHtcclxuICAgIHJldHVybiBuZXcgTWFwRmllbGQobmFtZSwganNvbi5pZCwganNvbi5rZXlUeXBlLCBqc29uLnR5cGUsIGpzb24ub3B0aW9ucyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhpcyBtYXAgZmllbGQgdG8gYSBtYXAgZmllbGQgZGVzY3JpcHRvci5cclxuICogQHJldHVybnMge01hcEZpZWxkRGVzY3JpcHRvcn0gTWFwIGZpZWxkIGRlc2NyaXB0b3JcclxuICovXHJcbk1hcEZpZWxkLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGtleVR5cGUgOiB0aGlzLmtleVR5cGUsXHJcbiAgICAgICAgdHlwZSAgICA6IHRoaXMudHlwZSxcclxuICAgICAgICBpZCAgICAgIDogdGhpcy5pZCxcclxuICAgICAgICBleHRlbmQgIDogdGhpcy5leHRlbmQsXHJcbiAgICAgICAgb3B0aW9ucyA6IHRoaXMub3B0aW9uc1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcbk1hcEZpZWxkLnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24gcmVzb2x2ZSgpIHtcclxuICAgIGlmICh0aGlzLnJlc29sdmVkKVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG5cclxuICAgIC8vIEJlc2lkZXMgYSB2YWx1ZSB0eXBlLCBtYXAgZmllbGRzIGhhdmUgYSBrZXkgdHlwZSB0aGF0IG1heSBiZSBcImFueSBzY2FsYXIgdHlwZSBleGNlcHQgZm9yIGZsb2F0aW5nIHBvaW50IHR5cGVzIGFuZCBieXRlc1wiXHJcbiAgICBpZiAodHlwZXMubWFwS2V5W3RoaXMua2V5VHlwZV0gPT09IHVuZGVmaW5lZClcclxuICAgICAgICB0aHJvdyBFcnJvcihcImludmFsaWQga2V5IHR5cGU6IFwiICsgdGhpcy5rZXlUeXBlKTtcclxuXHJcbiAgICByZXR1cm4gRmllbGQucHJvdG90eXBlLnJlc29sdmUuY2FsbCh0aGlzKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZTtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IG1lc3NhZ2UgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgQWJzdHJhY3QgcnVudGltZSBtZXNzYWdlLlxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XHJcbiAqL1xyXG5mdW5jdGlvbiBNZXNzYWdlKHByb3BlcnRpZXMpIHtcclxuICAgIC8vIG5vdCB1c2VkIGludGVybmFsbHlcclxuICAgIGlmIChwcm9wZXJ0aWVzKVxyXG4gICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJlZmVyZW5jZSB0byB0aGUgcmVmbGVjdGVkIHR5cGUuXHJcbiAqIEBuYW1lIE1lc3NhZ2UuJHR5cGVcclxuICogQHR5cGUge1R5cGV9XHJcbiAqIEByZWFkb25seVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZWZlcmVuY2UgdG8gdGhlIHJlZmxlY3RlZCB0eXBlLlxyXG4gKiBAbmFtZSBNZXNzYWdlIyR0eXBlXHJcbiAqIEB0eXBlIHtUeXBlfVxyXG4gKiBAcmVhZG9ubHlcclxuICovXHJcblxyXG4vKipcclxuICogRW5jb2RlcyBhIG1lc3NhZ2Ugb2YgdGhpcyB0eXBlLlxyXG4gKiBAcGFyYW0ge01lc3NhZ2V8T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgTWVzc2FnZSB0byBlbmNvZGVcclxuICogQHBhcmFtIHtXcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byB1c2VcclxuICogQHJldHVybnMge1dyaXRlcn0gV3JpdGVyXHJcbiAqL1xyXG5NZXNzYWdlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcclxuICAgIHJldHVybiB0aGlzLiR0eXBlLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEVuY29kZXMgYSBtZXNzYWdlIG9mIHRoaXMgdHlwZSBwcmVjZWVkZWQgYnkgaXRzIGxlbmd0aCBhcyBhIHZhcmludC5cclxuICogQHBhcmFtIHtNZXNzYWdlfE9iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIE1lc3NhZ2UgdG8gZW5jb2RlXHJcbiAqIEBwYXJhbSB7V3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gdXNlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IFdyaXRlclxyXG4gKi9cclxuTWVzc2FnZS5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy4kdHlwZS5lbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUuXHJcbiAqIEBuYW1lIE1lc3NhZ2UuZGVjb2RlXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge1JlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGVcclxuICogQHJldHVybnMge01lc3NhZ2V9IERlY29kZWQgbWVzc2FnZVxyXG4gKi9cclxuTWVzc2FnZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy4kdHlwZS5kZWNvZGUocmVhZGVyKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUgcHJlY2VlZGVkIGJ5IGl0cyBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEBuYW1lIE1lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge1JlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGVcclxuICogQHJldHVybnMge01lc3NhZ2V9IERlY29kZWQgbWVzc2FnZVxyXG4gKi9cclxuTWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy4kdHlwZS5kZWNvZGVEZWxpbWl0ZWQocmVhZGVyKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBWZXJpZmllcyBhIG1lc3NhZ2Ugb2YgdGhpcyB0eXBlLlxyXG4gKiBAbmFtZSBNZXNzYWdlLnZlcmlmeVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtNZXNzYWdlfE9iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIE1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxyXG4gKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XHJcbiAqL1xyXG5NZXNzYWdlLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeShtZXNzYWdlKSB7XHJcbiAgICByZXR1cm4gdGhpcy4kdHlwZS52ZXJpZnkobWVzc2FnZSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBtZXNzYWdlIG9mIHRoaXMgdHlwZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XHJcbiAqIEByZXR1cm5zIHtNZXNzYWdlfSBNZXNzYWdlIGluc3RhbmNlXHJcbiAqL1xyXG5NZXNzYWdlLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xyXG4gICAgcmV0dXJuIHRoaXMuJHR5cGUuZnJvbU9iamVjdChvYmplY3QpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgbWVzc2FnZSBvZiB0aGlzIHR5cGUgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cclxuICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgTWVzc2FnZS5mcm9tT2JqZWN0fS5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcclxuICogQHJldHVybnMge01lc3NhZ2V9IE1lc3NhZ2UgaW5zdGFuY2VcclxuICovXHJcbk1lc3NhZ2UuZnJvbSA9IE1lc3NhZ2UuZnJvbU9iamVjdDtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBtZXNzYWdlIG9mIHRoaXMgdHlwZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxyXG4gKiBAcGFyYW0ge01lc3NhZ2V9IG1lc3NhZ2UgTWVzc2FnZSBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge0NvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXHJcbiAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XHJcbiAqL1xyXG5NZXNzYWdlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xyXG4gICAgcmV0dXJuIHRoaXMuJHR5cGUudG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxyXG4gKiBAcGFyYW0ge0NvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXHJcbiAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XHJcbiAqL1xyXG5NZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcclxuICAgIHJldHVybiB0aGlzLiR0eXBlLnRvT2JqZWN0KHRoaXMsIG9wdGlvbnMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoaXMgbWVzc2FnZSB0byBKU09OLlxyXG4gKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XHJcbiAqL1xyXG5NZXNzYWdlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XHJcbiAgICByZXR1cm4gdGhpcy4kdHlwZS50b09iamVjdCh0aGlzLCB1dGlsLnRvSlNPTk9wdGlvbnMpO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBNZXRob2Q7XHJcblxyXG4vLyBleHRlbmRzIFJlZmxlY3Rpb25PYmplY3RcclxudmFyIFJlZmxlY3Rpb25PYmplY3QgPSByZXF1aXJlKFwiLi9vYmplY3RcIik7XHJcbigoTWV0aG9kLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IE1ldGhvZCkuY2xhc3NOYW1lID0gXCJNZXRob2RcIjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHNlcnZpY2UgbWV0aG9kIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFJlZmxlY3RlZCBzZXJ2aWNlIG1ldGhvZC5cclxuICogQGV4dGVuZHMgUmVmbGVjdGlvbk9iamVjdFxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTWV0aG9kIG5hbWVcclxuICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSB0eXBlIE1ldGhvZCB0eXBlLCB1c3VhbGx5IGBcInJwY1wiYFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVxdWVzdFR5cGUgUmVxdWVzdCBtZXNzYWdlIHR5cGVcclxuICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlVHlwZSBSZXNwb25zZSBtZXNzYWdlIHR5cGVcclxuICogQHBhcmFtIHtib29sZWFufE9iamVjdC48c3RyaW5nLCo+fSBbcmVxdWVzdFN0cmVhbV0gV2hldGhlciB0aGUgcmVxdWVzdCBpcyBzdHJlYW1lZFxyXG4gKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0LjxzdHJpbmcsKj59IFtyZXNwb25zZVN0cmVhbV0gV2hldGhlciB0aGUgcmVzcG9uc2UgaXMgc3RyZWFtZWRcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIERlY2xhcmVkIG9wdGlvbnNcclxuICovXHJcbmZ1bmN0aW9uIE1ldGhvZChuYW1lLCB0eXBlLCByZXF1ZXN0VHlwZSwgcmVzcG9uc2VUeXBlLCByZXF1ZXN0U3RyZWFtLCByZXNwb25zZVN0cmVhbSwgb3B0aW9ucykge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICBpZiAodXRpbC5pc09iamVjdChyZXF1ZXN0U3RyZWFtKSkge1xyXG4gICAgICAgIG9wdGlvbnMgPSByZXF1ZXN0U3RyZWFtO1xyXG4gICAgICAgIHJlcXVlc3RTdHJlYW0gPSByZXNwb25zZVN0cmVhbSA9IHVuZGVmaW5lZDtcclxuICAgIH0gZWxzZSBpZiAodXRpbC5pc09iamVjdChyZXNwb25zZVN0cmVhbSkpIHtcclxuICAgICAgICBvcHRpb25zID0gcmVzcG9uc2VTdHJlYW07XHJcbiAgICAgICAgcmVzcG9uc2VTdHJlYW0gPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAoISh0eXBlID09PSB1bmRlZmluZWQgfHwgdXRpbC5pc1N0cmluZyh0eXBlKSkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwidHlwZSBtdXN0IGJlIGEgc3RyaW5nXCIpO1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKCF1dGlsLmlzU3RyaW5nKHJlcXVlc3RUeXBlKSlcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJyZXF1ZXN0VHlwZSBtdXN0IGJlIGEgc3RyaW5nXCIpO1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKCF1dGlsLmlzU3RyaW5nKHJlc3BvbnNlVHlwZSkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwicmVzcG9uc2VUeXBlIG11c3QgYmUgYSBzdHJpbmdcIik7XHJcblxyXG4gICAgUmVmbGVjdGlvbk9iamVjdC5jYWxsKHRoaXMsIG5hbWUsIG9wdGlvbnMpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTWV0aG9kIHR5cGUuXHJcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnR5cGUgPSB0eXBlIHx8IFwicnBjXCI7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVxdWVzdCB0eXBlLlxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXF1ZXN0VHlwZSA9IHJlcXVlc3RUeXBlOyAvLyB0b0pTT04sIG1hcmtlclxyXG5cclxuICAgIC8qKlxyXG4gICAgICogV2hldGhlciByZXF1ZXN0cyBhcmUgc3RyZWFtZWQgb3Igbm90LlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW58dW5kZWZpbmVkfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJlcXVlc3RTdHJlYW0gPSByZXF1ZXN0U3RyZWFtID8gdHJ1ZSA6IHVuZGVmaW5lZDsgLy8gdG9KU09OXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXNwb25zZSB0eXBlLlxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXNwb25zZVR5cGUgPSByZXNwb25zZVR5cGU7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogV2hldGhlciByZXNwb25zZXMgYXJlIHN0cmVhbWVkIG9yIG5vdC5cclxuICAgICAqIEB0eXBlIHtib29sZWFufHVuZGVmaW5lZH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXNwb25zZVN0cmVhbSA9IHJlc3BvbnNlU3RyZWFtID8gdHJ1ZSA6IHVuZGVmaW5lZDsgLy8gdG9KU09OXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXNvbHZlZCByZXF1ZXN0IHR5cGUuXHJcbiAgICAgKiBAdHlwZSB7P1R5cGV9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVzb2x2ZWRSZXF1ZXN0VHlwZSA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXNvbHZlZCByZXNwb25zZSB0eXBlLlxyXG4gICAgICogQHR5cGUgez9UeXBlfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJlc29sdmVkUmVzcG9uc2VUeXBlID0gbnVsbDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEB0eXBlZGVmIE1ldGhvZERlc2NyaXB0b3JcclxuICogQHR5cGUge09iamVjdH1cclxuICogQHByb3BlcnR5IHtzdHJpbmd9IFt0eXBlPVwicnBjXCJdIE1ldGhvZCB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSByZXF1ZXN0VHlwZSBSZXF1ZXN0IHR5cGVcclxuICogQHByb3BlcnR5IHtzdHJpbmd9IHJlc3BvbnNlVHlwZSBSZXNwb25zZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW3JlcXVlc3RTdHJlYW09ZmFsc2VdIFdoZXRoZXIgcmVxdWVzdHMgYXJlIHN0cmVhbWVkXHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW3Jlc3BvbnNlU3RyZWFtPWZhbHNlXSBXaGV0aGVyIHJlc3BvbnNlcyBhcmUgc3RyZWFtZWRcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIE1ldGhvZCBvcHRpb25zXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBtZXRob2QgZnJvbSBhIG1ldGhvZCBkZXNjcmlwdG9yLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBNZXRob2QgbmFtZVxyXG4gKiBAcGFyYW0ge01ldGhvZERlc2NyaXB0b3J9IGpzb24gTWV0aG9kIGRlc2NyaXB0b3JcclxuICogQHJldHVybnMge01ldGhvZH0gQ3JlYXRlZCBtZXRob2RcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICovXHJcbk1ldGhvZC5mcm9tSlNPTiA9IGZ1bmN0aW9uIGZyb21KU09OKG5hbWUsIGpzb24pIHtcclxuICAgIHJldHVybiBuZXcgTWV0aG9kKG5hbWUsIGpzb24udHlwZSwganNvbi5yZXF1ZXN0VHlwZSwganNvbi5yZXNwb25zZVR5cGUsIGpzb24ucmVxdWVzdFN0cmVhbSwganNvbi5yZXNwb25zZVN0cmVhbSwganNvbi5vcHRpb25zKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIG1ldGhvZCB0byBhIG1ldGhvZCBkZXNjcmlwdG9yLlxyXG4gKiBAcmV0dXJucyB7TWV0aG9kRGVzY3JpcHRvcn0gTWV0aG9kIGRlc2NyaXB0b3JcclxuICovXHJcbk1ldGhvZC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB0eXBlICAgICAgICAgICA6IHRoaXMudHlwZSAhPT0gXCJycGNcIiAmJiAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyB0aGlzLnR5cGUgfHwgdW5kZWZpbmVkLFxyXG4gICAgICAgIHJlcXVlc3RUeXBlICAgIDogdGhpcy5yZXF1ZXN0VHlwZSxcclxuICAgICAgICByZXF1ZXN0U3RyZWFtICA6IHRoaXMucmVxdWVzdFN0cmVhbSxcclxuICAgICAgICByZXNwb25zZVR5cGUgICA6IHRoaXMucmVzcG9uc2VUeXBlLFxyXG4gICAgICAgIHJlc3BvbnNlU3RyZWFtIDogdGhpcy5yZXNwb25zZVN0cmVhbSxcclxuICAgICAgICBvcHRpb25zICAgICAgICA6IHRoaXMub3B0aW9uc1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcbk1ldGhvZC5wcm90b3R5cGUucmVzb2x2ZSA9IGZ1bmN0aW9uIHJlc29sdmUoKSB7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAodGhpcy5yZXNvbHZlZClcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuXHJcbiAgICB0aGlzLnJlc29sdmVkUmVxdWVzdFR5cGUgPSB0aGlzLnBhcmVudC5sb29rdXBUeXBlKHRoaXMucmVxdWVzdFR5cGUpO1xyXG4gICAgdGhpcy5yZXNvbHZlZFJlc3BvbnNlVHlwZSA9IHRoaXMucGFyZW50Lmxvb2t1cFR5cGUodGhpcy5yZXNwb25zZVR5cGUpO1xyXG5cclxuICAgIHJldHVybiBSZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZS5yZXNvbHZlLmNhbGwodGhpcyk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IE5hbWVzcGFjZTtcclxuXHJcbi8vIGV4dGVuZHMgUmVmbGVjdGlvbk9iamVjdFxyXG52YXIgUmVmbGVjdGlvbk9iamVjdCA9IHJlcXVpcmUoXCIuL29iamVjdFwiKTtcclxuKChOYW1lc3BhY2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShSZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gTmFtZXNwYWNlKS5jbGFzc05hbWUgPSBcIk5hbWVzcGFjZVwiO1xyXG5cclxudmFyIEVudW0gICAgID0gcmVxdWlyZShcIi4vZW51bVwiKSxcclxuICAgIEZpZWxkICAgID0gcmVxdWlyZShcIi4vZmllbGRcIiksXHJcbiAgICB1dGlsICAgICA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG52YXIgVHlwZSwgICAgLy8gY3ljbGljXHJcbiAgICBTZXJ2aWNlOyAvLyBcIlxyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgbmFtZXNwYWNlIGluc3RhbmNlLlxyXG4gKiBAbmFtZSBOYW1lc3BhY2VcclxuICogQGNsYXNzZGVzYyBSZWZsZWN0ZWQgbmFtZXNwYWNlLlxyXG4gKiBAZXh0ZW5kcyBOYW1lc3BhY2VCYXNlXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lc3BhY2UgbmFtZVxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gRGVjbGFyZWQgb3B0aW9uc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmFtZXNwYWNlIGZyb20gSlNPTi5cclxuICogQG1lbWJlcm9mIE5hbWVzcGFjZVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZXNwYWNlIG5hbWVcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0ganNvbiBKU09OIG9iamVjdFxyXG4gKiBAcmV0dXJucyB7TmFtZXNwYWNlfSBDcmVhdGVkIG5hbWVzcGFjZVxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGFyZ3VtZW50cyBhcmUgaW52YWxpZFxyXG4gKi9cclxuTmFtZXNwYWNlLmZyb21KU09OID0gZnVuY3Rpb24gZnJvbUpTT04obmFtZSwganNvbikge1xyXG4gICAgcmV0dXJuIG5ldyBOYW1lc3BhY2UobmFtZSwganNvbi5vcHRpb25zKS5hZGRKU09OKGpzb24ubmVzdGVkKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyBhbiBhcnJheSBvZiByZWZsZWN0aW9uIG9iamVjdHMgdG8gSlNPTi5cclxuICogQG1lbWJlcm9mIE5hbWVzcGFjZVxyXG4gKiBAcGFyYW0ge1JlZmxlY3Rpb25PYmplY3RbXX0gYXJyYXkgT2JqZWN0IGFycmF5XHJcbiAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPnx1bmRlZmluZWR9IEpTT04gb2JqZWN0IG9yIGB1bmRlZmluZWRgIHdoZW4gYXJyYXkgaXMgZW1wdHlcclxuICovXHJcbmZ1bmN0aW9uIGFycmF5VG9KU09OKGFycmF5KSB7XHJcbiAgICBpZiAoIShhcnJheSAmJiBhcnJheS5sZW5ndGgpKVxyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB2YXIgb2JqID0ge307XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgKytpKVxyXG4gICAgICAgIG9ialthcnJheVtpXS5uYW1lXSA9IGFycmF5W2ldLnRvSlNPTigpO1xyXG4gICAgcmV0dXJuIG9iajtcclxufVxyXG5cclxuTmFtZXNwYWNlLmFycmF5VG9KU09OID0gYXJyYXlUb0pTT047XHJcblxyXG4vKipcclxuICogTm90IGFuIGFjdHVhbCBjb25zdHJ1Y3Rvci4gVXNlIHtAbGluayBOYW1lc3BhY2V9IGluc3RlYWQuXHJcbiAqIEBjbGFzc2Rlc2MgQmFzZSBjbGFzcyBvZiBhbGwgcmVmbGVjdGlvbiBvYmplY3RzIGNvbnRhaW5pbmcgbmVzdGVkIG9iamVjdHMuIFRoaXMgaXMgbm90IGFuIGFjdHVhbCBjbGFzcyBidXQgaGVyZSBmb3IgdGhlIHNha2Ugb2YgaGF2aW5nIGNvbnNpc3RlbnQgdHlwZSBkZWZpbml0aW9ucy5cclxuICogQGV4cG9ydHMgTmFtZXNwYWNlQmFzZVxyXG4gKiBAZXh0ZW5kcyBSZWZsZWN0aW9uT2JqZWN0XHJcbiAqIEBhYnN0cmFjdFxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZXNwYWNlIG5hbWVcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIERlY2xhcmVkIG9wdGlvbnNcclxuICogQHNlZSB7QGxpbmsgTmFtZXNwYWNlfVxyXG4gKi9cclxuZnVuY3Rpb24gTmFtZXNwYWNlKG5hbWUsIG9wdGlvbnMpIHtcclxuICAgIFJlZmxlY3Rpb25PYmplY3QuY2FsbCh0aGlzLCBuYW1lLCBvcHRpb25zKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE5lc3RlZCBvYmplY3RzIGJ5IG5hbWUuXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsUmVmbGVjdGlvbk9iamVjdD58dW5kZWZpbmVkfVxyXG4gICAgICovXHJcbiAgICB0aGlzLm5lc3RlZCA9IHVuZGVmaW5lZDsgLy8gdG9KU09OXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWNoZWQgbmVzdGVkIG9iamVjdHMgYXMgYW4gYXJyYXkuXHJcbiAgICAgKiBAdHlwZSB7P1JlZmxlY3Rpb25PYmplY3RbXX1cclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX25lc3RlZEFycmF5ID0gbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYXJDYWNoZShuYW1lc3BhY2UpIHtcclxuICAgIG5hbWVzcGFjZS5fbmVzdGVkQXJyYXkgPSBudWxsO1xyXG4gICAgcmV0dXJuIG5hbWVzcGFjZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIE5lc3RlZCBvYmplY3RzIG9mIHRoaXMgbmFtZXNwYWNlIGFzIGFuIGFycmF5IGZvciBpdGVyYXRpb24uXHJcbiAqIEBuYW1lIE5hbWVzcGFjZUJhc2UjbmVzdGVkQXJyYXlcclxuICogQHR5cGUge1JlZmxlY3Rpb25PYmplY3RbXX1cclxuICogQHJlYWRvbmx5XHJcbiAqL1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTmFtZXNwYWNlLnByb3RvdHlwZSwgXCJuZXN0ZWRBcnJheVwiLCB7XHJcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9uZXN0ZWRBcnJheSB8fCAodGhpcy5fbmVzdGVkQXJyYXkgPSB1dGlsLnRvQXJyYXkodGhpcy5uZXN0ZWQpKTtcclxuICAgIH1cclxufSk7XHJcblxyXG4vKipcclxuICogTmFtZXNwYWNlIGRlc2NyaXB0b3IuXHJcbiAqIEB0eXBlZGVmIE5hbWVzcGFjZURlc2NyaXB0b3JcclxuICogQHR5cGUge09iamVjdH1cclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIE5hbWVzcGFjZSBvcHRpb25zXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsQW55TmVzdGVkRGVzY3JpcHRvcj59IG5lc3RlZCBOZXN0ZWQgb2JqZWN0IGRlc2NyaXB0b3JzXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIE5hbWVzcGFjZSBiYXNlIGRlc2NyaXB0b3IuXHJcbiAqIEB0eXBlZGVmIE5hbWVzcGFjZUJhc2VEZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBOYW1lc3BhY2Ugb3B0aW9uc1xyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLEFueU5lc3RlZERlc2NyaXB0b3I+fSBbbmVzdGVkXSBOZXN0ZWQgb2JqZWN0IGRlc2NyaXB0b3JzXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEFueSBleHRlbnNpb24gZmllbGQgZGVzY3JpcHRvci5cclxuICogQHR5cGVkZWYgQW55RXh0ZW5zaW9uRmllbGREZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtFeHRlbnNpb25GaWVsZERlc2NyaXB0b3J8RXh0ZW5zaW9uTWFwRmllbGREZXNjcmlwdG9yfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBBbnkgbmVzdGVkIG9iamVjdCBkZXNjcmlwdG9yLlxyXG4gKiBAdHlwZWRlZiBBbnlOZXN0ZWREZXNjcmlwdG9yXHJcbiAqIEB0eXBlIHtFbnVtRGVzY3JpcHRvcnxUeXBlRGVzY3JpcHRvcnxTZXJ2aWNlRGVzY3JpcHRvcnxBbnlFeHRlbnNpb25GaWVsZERlc2NyaXB0b3J8TmFtZXNwYWNlRGVzY3JpcHRvcn1cclxuICovXHJcbi8vIF4gQkVXQVJFOiBWU0NvZGUgaGFuZ3MgZm9yZXZlciB3aGVuIHVzaW5nIG1vcmUgdGhhbiA1IHR5cGVzICh0aGF0J3Mgd2h5IEFueUV4dGVuc2lvbkZpZWxkRGVzY3JpcHRvciBleGlzdHMgaW4gdGhlIGZpcnN0IHBsYWNlKVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoaXMgbmFtZXNwYWNlIHRvIGEgbmFtZXNwYWNlIGRlc2NyaXB0b3IuXHJcbiAqIEByZXR1cm5zIHtOYW1lc3BhY2VCYXNlRGVzY3JpcHRvcn0gTmFtZXNwYWNlIGRlc2NyaXB0b3JcclxuICovXHJcbk5hbWVzcGFjZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBvcHRpb25zIDogdGhpcy5vcHRpb25zLFxyXG4gICAgICAgIG5lc3RlZCAgOiBhcnJheVRvSlNPTih0aGlzLm5lc3RlZEFycmF5KVxyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIG5lc3RlZCBvYmplY3RzIHRvIHRoaXMgbmFtZXNwYWNlIGZyb20gbmVzdGVkIG9iamVjdCBkZXNjcmlwdG9ycy5cclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZyxBbnlOZXN0ZWREZXNjcmlwdG9yPn0gbmVzdGVkSnNvbiBBbnkgbmVzdGVkIG9iamVjdCBkZXNjcmlwdG9yc1xyXG4gKiBAcmV0dXJucyB7TmFtZXNwYWNlfSBgdGhpc2BcclxuICovXHJcbk5hbWVzcGFjZS5wcm90b3R5cGUuYWRkSlNPTiA9IGZ1bmN0aW9uIGFkZEpTT04obmVzdGVkSnNvbikge1xyXG4gICAgdmFyIG5zID0gdGhpcztcclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZiAobmVzdGVkSnNvbikge1xyXG4gICAgICAgIGZvciAodmFyIG5hbWVzID0gT2JqZWN0LmtleXMobmVzdGVkSnNvbiksIGkgPSAwLCBuZXN0ZWQ7IGkgPCBuYW1lcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBuZXN0ZWQgPSBuZXN0ZWRKc29uW25hbWVzW2ldXTtcclxuICAgICAgICAgICAgbnMuYWRkKCAvLyBtb3N0IHRvIGxlYXN0IGxpa2VseVxyXG4gICAgICAgICAgICAgICAgKCBuZXN0ZWQuZmllbGRzICE9PSB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgID8gVHlwZS5mcm9tSlNPTlxyXG4gICAgICAgICAgICAgICAgOiBuZXN0ZWQudmFsdWVzICE9PSB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgID8gRW51bS5mcm9tSlNPTlxyXG4gICAgICAgICAgICAgICAgOiBuZXN0ZWQubWV0aG9kcyAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICA/IFNlcnZpY2UuZnJvbUpTT05cclxuICAgICAgICAgICAgICAgIDogbmVzdGVkLmlkICE9PSB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgID8gRmllbGQuZnJvbUpTT05cclxuICAgICAgICAgICAgICAgIDogTmFtZXNwYWNlLmZyb21KU09OICkobmFtZXNbaV0sIG5lc3RlZClcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXRzIHRoZSBuZXN0ZWQgb2JqZWN0IG9mIHRoZSBzcGVjaWZpZWQgbmFtZS5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmVzdGVkIG9iamVjdCBuYW1lXHJcbiAqIEByZXR1cm5zIHs/UmVmbGVjdGlvbk9iamVjdH0gVGhlIHJlZmxlY3Rpb24gb2JqZWN0IG9yIGBudWxsYCBpZiBpdCBkb2Vzbid0IGV4aXN0XHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldChuYW1lKSB7XHJcbiAgICByZXR1cm4gdGhpcy5uZXN0ZWQgJiYgdGhpcy5uZXN0ZWRbbmFtZV1cclxuICAgICAgICB8fCBudWxsO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldHMgdGhlIHZhbHVlcyBvZiB0aGUgbmVzdGVkIHtAbGluayBFbnVtfGVudW19IG9mIHRoZSBzcGVjaWZpZWQgbmFtZS5cclxuICogVGhpcyBtZXRob2RzIGRpZmZlcnMgZnJvbSB7QGxpbmsgTmFtZXNwYWNlI2dldHxnZXR9IGluIHRoYXQgaXQgcmV0dXJucyBhbiBlbnVtJ3MgdmFsdWVzIGRpcmVjdGx5IGFuZCB0aHJvd3MgaW5zdGVhZCBvZiByZXR1cm5pbmcgYG51bGxgLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOZXN0ZWQgZW51bSBuYW1lXHJcbiAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZyxudW1iZXI+fSBFbnVtIHZhbHVlc1xyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlcmUgaXMgbm8gc3VjaCBlbnVtXHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLmdldEVudW0gPSBmdW5jdGlvbiBnZXRFbnVtKG5hbWUpIHtcclxuICAgIGlmICh0aGlzLm5lc3RlZCAmJiB0aGlzLm5lc3RlZFtuYW1lXSBpbnN0YW5jZW9mIEVudW0pXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubmVzdGVkW25hbWVdLnZhbHVlcztcclxuICAgIHRocm93IEVycm9yKFwibm8gc3VjaCBlbnVtXCIpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXN0ZWQgb2JqZWN0IHRvIHRoaXMgbmFtZXNwYWNlLlxyXG4gKiBAcGFyYW0ge1JlZmxlY3Rpb25PYmplY3R9IG9iamVjdCBOZXN0ZWQgb2JqZWN0IHRvIGFkZFxyXG4gKiBAcmV0dXJucyB7TmFtZXNwYWNlfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICogQHRocm93cyB7RXJyb3J9IElmIHRoZXJlIGlzIGFscmVhZHkgYSBuZXN0ZWQgb2JqZWN0IHdpdGggdGhpcyBuYW1lXHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZChvYmplY3QpIHtcclxuXHJcbiAgICBpZiAoIShvYmplY3QgaW5zdGFuY2VvZiBGaWVsZCAmJiBvYmplY3QuZXh0ZW5kICE9PSB1bmRlZmluZWQgfHwgb2JqZWN0IGluc3RhbmNlb2YgVHlwZSB8fCBvYmplY3QgaW5zdGFuY2VvZiBFbnVtIHx8IG9iamVjdCBpbnN0YW5jZW9mIFNlcnZpY2UgfHwgb2JqZWN0IGluc3RhbmNlb2YgTmFtZXNwYWNlKSlcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJvYmplY3QgbXVzdCBiZSBhIHZhbGlkIG5lc3RlZCBvYmplY3RcIik7XHJcblxyXG4gICAgaWYgKCF0aGlzLm5lc3RlZClcclxuICAgICAgICB0aGlzLm5lc3RlZCA9IHt9O1xyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgdmFyIHByZXYgPSB0aGlzLmdldChvYmplY3QubmFtZSk7XHJcbiAgICAgICAgaWYgKHByZXYpIHtcclxuICAgICAgICAgICAgaWYgKHByZXYgaW5zdGFuY2VvZiBOYW1lc3BhY2UgJiYgb2JqZWN0IGluc3RhbmNlb2YgTmFtZXNwYWNlICYmICEocHJldiBpbnN0YW5jZW9mIFR5cGUgfHwgcHJldiBpbnN0YW5jZW9mIFNlcnZpY2UpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyByZXBsYWNlIHBsYWluIG5hbWVzcGFjZSBidXQga2VlcCBleGlzdGluZyBuZXN0ZWQgZWxlbWVudHMgYW5kIG9wdGlvbnNcclxuICAgICAgICAgICAgICAgIHZhciBuZXN0ZWQgPSBwcmV2Lm5lc3RlZEFycmF5O1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuZXN0ZWQubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmFkZChuZXN0ZWRbaV0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUocHJldik7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMubmVzdGVkKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmVzdGVkID0ge307XHJcbiAgICAgICAgICAgICAgICBvYmplY3Quc2V0T3B0aW9ucyhwcmV2Lm9wdGlvbnMsIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcImR1cGxpY2F0ZSBuYW1lICdcIiArIG9iamVjdC5uYW1lICsgXCInIGluIFwiICsgdGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5uZXN0ZWRbb2JqZWN0Lm5hbWVdID0gb2JqZWN0O1xyXG4gICAgb2JqZWN0Lm9uQWRkKHRoaXMpO1xyXG4gICAgcmV0dXJuIGNsZWFyQ2FjaGUodGhpcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVtb3ZlcyBhIG5lc3RlZCBvYmplY3QgZnJvbSB0aGlzIG5hbWVzcGFjZS5cclxuICogQHBhcmFtIHtSZWZsZWN0aW9uT2JqZWN0fSBvYmplY3QgTmVzdGVkIG9iamVjdCB0byByZW1vdmVcclxuICogQHJldHVybnMge05hbWVzcGFjZX0gYHRoaXNgXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYXJndW1lbnRzIGFyZSBpbnZhbGlkXHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiBgb2JqZWN0YCBpcyBub3QgYSBtZW1iZXIgb2YgdGhpcyBuYW1lc3BhY2VcclxuICovXHJcbk5hbWVzcGFjZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKG9iamVjdCkge1xyXG5cclxuICAgIGlmICghKG9iamVjdCBpbnN0YW5jZW9mIFJlZmxlY3Rpb25PYmplY3QpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcIm9iamVjdCBtdXN0IGJlIGEgUmVmbGVjdGlvbk9iamVjdFwiKTtcclxuICAgIGlmIChvYmplY3QucGFyZW50ICE9PSB0aGlzKVxyXG4gICAgICAgIHRocm93IEVycm9yKG9iamVjdCArIFwiIGlzIG5vdCBhIG1lbWJlciBvZiBcIiArIHRoaXMpO1xyXG5cclxuICAgIGRlbGV0ZSB0aGlzLm5lc3RlZFtvYmplY3QubmFtZV07XHJcbiAgICBpZiAoIU9iamVjdC5rZXlzKHRoaXMubmVzdGVkKS5sZW5ndGgpXHJcbiAgICAgICAgdGhpcy5uZXN0ZWQgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgb2JqZWN0Lm9uUmVtb3ZlKHRoaXMpO1xyXG4gICAgcmV0dXJuIGNsZWFyQ2FjaGUodGhpcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogRGVmaW5lcyBhZGRpdGlhbCBuYW1lc3BhY2VzIHdpdGhpbiB0aGlzIG9uZSBpZiBub3QgeWV0IGV4aXN0aW5nLlxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gcGF0aCBQYXRoIHRvIGNyZWF0ZVxyXG4gKiBAcGFyYW0geyp9IFtqc29uXSBOZXN0ZWQgdHlwZXMgdG8gY3JlYXRlIGZyb20gSlNPTlxyXG4gKiBAcmV0dXJucyB7TmFtZXNwYWNlfSBQb2ludGVyIHRvIHRoZSBsYXN0IG5hbWVzcGFjZSBjcmVhdGVkIG9yIGB0aGlzYCBpZiBwYXRoIGlzIGVtcHR5XHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLmRlZmluZSA9IGZ1bmN0aW9uIGRlZmluZShwYXRoLCBqc29uKSB7XHJcblxyXG4gICAgaWYgKHV0aWwuaXNTdHJpbmcocGF0aCkpXHJcbiAgICAgICAgcGF0aCA9IHBhdGguc3BsaXQoXCIuXCIpO1xyXG4gICAgZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkocGF0aCkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiaWxsZWdhbCBwYXRoXCIpO1xyXG4gICAgaWYgKHBhdGggJiYgcGF0aC5sZW5ndGggJiYgcGF0aFswXSA9PT0gXCJcIilcclxuICAgICAgICB0aHJvdyBFcnJvcihcInBhdGggbXVzdCBiZSByZWxhdGl2ZVwiKTtcclxuXHJcbiAgICB2YXIgcHRyID0gdGhpcztcclxuICAgIHdoaWxlIChwYXRoLmxlbmd0aCA+IDApIHtcclxuICAgICAgICB2YXIgcGFydCA9IHBhdGguc2hpZnQoKTtcclxuICAgICAgICBpZiAocHRyLm5lc3RlZCAmJiBwdHIubmVzdGVkW3BhcnRdKSB7XHJcbiAgICAgICAgICAgIHB0ciA9IHB0ci5uZXN0ZWRbcGFydF07XHJcbiAgICAgICAgICAgIGlmICghKHB0ciBpbnN0YW5jZW9mIE5hbWVzcGFjZSkpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcInBhdGggY29uZmxpY3RzIHdpdGggbm9uLW5hbWVzcGFjZSBvYmplY3RzXCIpO1xyXG4gICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICBwdHIuYWRkKHB0ciA9IG5ldyBOYW1lc3BhY2UocGFydCkpO1xyXG4gICAgfVxyXG4gICAgaWYgKGpzb24pXHJcbiAgICAgICAgcHRyLmFkZEpTT04oanNvbik7XHJcbiAgICByZXR1cm4gcHRyO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlc29sdmVzIHRoaXMgbmFtZXNwYWNlJ3MgYW5kIGFsbCBpdHMgbmVzdGVkIG9iamVjdHMnIHR5cGUgcmVmZXJlbmNlcy4gVXNlZnVsIHRvIHZhbGlkYXRlIGEgcmVmbGVjdGlvbiB0cmVlLCBidXQgY29tZXMgYXQgYSBjb3N0LlxyXG4gKiBAcmV0dXJucyB7TmFtZXNwYWNlfSBgdGhpc2BcclxuICovXHJcbk5hbWVzcGFjZS5wcm90b3R5cGUucmVzb2x2ZUFsbCA9IGZ1bmN0aW9uIHJlc29sdmVBbGwoKSB7XHJcbiAgICB2YXIgbmVzdGVkID0gdGhpcy5uZXN0ZWRBcnJheSwgaSA9IDA7XHJcbiAgICB3aGlsZSAoaSA8IG5lc3RlZC5sZW5ndGgpXHJcbiAgICAgICAgaWYgKG5lc3RlZFtpXSBpbnN0YW5jZW9mIE5hbWVzcGFjZSlcclxuICAgICAgICAgICAgbmVzdGVkW2krK10ucmVzb2x2ZUFsbCgpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgbmVzdGVkW2krK10ucmVzb2x2ZSgpO1xyXG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZSgpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIExvb2tzIHVwIHRoZSByZWZsZWN0aW9uIG9iamVjdCBhdCB0aGUgc3BlY2lmaWVkIHBhdGgsIHJlbGF0aXZlIHRvIHRoaXMgbmFtZXNwYWNlLlxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gcGF0aCBQYXRoIHRvIGxvb2sgdXBcclxuICogQHBhcmFtIHsqfEFycmF5LjwqPn0gZmlsdGVyVHlwZXMgRmlsdGVyIHR5cGVzLCBhbnkgY29tYmluYXRpb24gb2YgdGhlIGNvbnN0cnVjdG9ycyBvZiBgcHJvdG9idWYuVHlwZWAsIGBwcm90b2J1Zi5FbnVtYCwgYHByb3RvYnVmLlNlcnZpY2VgIGV0Yy5cclxuICogQHBhcmFtIHtib29sZWFufSBbcGFyZW50QWxyZWFkeUNoZWNrZWQ9ZmFsc2VdIElmIGtub3duLCB3aGV0aGVyIHRoZSBwYXJlbnQgaGFzIGFscmVhZHkgYmVlbiBjaGVja2VkXHJcbiAqIEByZXR1cm5zIHs/UmVmbGVjdGlvbk9iamVjdH0gTG9va2VkIHVwIG9iamVjdCBvciBgbnVsbGAgaWYgbm9uZSBjb3VsZCBiZSBmb3VuZFxyXG4gKi9cclxuTmFtZXNwYWNlLnByb3RvdHlwZS5sb29rdXAgPSBmdW5jdGlvbiBsb29rdXAocGF0aCwgZmlsdGVyVHlwZXMsIHBhcmVudEFscmVhZHlDaGVja2VkKSB7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIGlmICh0eXBlb2YgZmlsdGVyVHlwZXMgPT09IFwiYm9vbGVhblwiKSB7XHJcbiAgICAgICAgcGFyZW50QWxyZWFkeUNoZWNrZWQgPSBmaWx0ZXJUeXBlcztcclxuICAgICAgICBmaWx0ZXJUeXBlcyA9IHVuZGVmaW5lZDtcclxuICAgIH0gZWxzZSBpZiAoZmlsdGVyVHlwZXMgJiYgIUFycmF5LmlzQXJyYXkoZmlsdGVyVHlwZXMpKVxyXG4gICAgICAgIGZpbHRlclR5cGVzID0gWyBmaWx0ZXJUeXBlcyBdO1xyXG5cclxuICAgIGlmICh1dGlsLmlzU3RyaW5nKHBhdGgpICYmIHBhdGgubGVuZ3RoKSB7XHJcbiAgICAgICAgaWYgKHBhdGggPT09IFwiLlwiKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yb290O1xyXG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KFwiLlwiKTtcclxuICAgIH0gZWxzZSBpZiAoIXBhdGgubGVuZ3RoKVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG5cclxuICAgIC8vIFN0YXJ0IGF0IHJvb3QgaWYgcGF0aCBpcyBhYnNvbHV0ZVxyXG4gICAgaWYgKHBhdGhbMF0gPT09IFwiXCIpXHJcbiAgICAgICAgcmV0dXJuIHRoaXMucm9vdC5sb29rdXAocGF0aC5zbGljZSgxKSwgZmlsdGVyVHlwZXMpO1xyXG4gICAgLy8gVGVzdCBpZiB0aGUgZmlyc3QgcGFydCBtYXRjaGVzIGFueSBuZXN0ZWQgb2JqZWN0LCBhbmQgaWYgc28sIHRyYXZlcnNlIGlmIHBhdGggY29udGFpbnMgbW9yZVxyXG4gICAgdmFyIGZvdW5kID0gdGhpcy5nZXQocGF0aFswXSk7XHJcbiAgICBpZiAoZm91bmQpIHtcclxuICAgICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgaWYgKCFmaWx0ZXJUeXBlcyB8fCBmaWx0ZXJUeXBlcy5pbmRleE9mKGZvdW5kLmNvbnN0cnVjdG9yKSA+IC0xKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvdW5kO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZm91bmQgaW5zdGFuY2VvZiBOYW1lc3BhY2UgJiYgKGZvdW5kID0gZm91bmQubG9va3VwKHBhdGguc2xpY2UoMSksIGZpbHRlclR5cGVzLCB0cnVlKSkpXHJcbiAgICAgICAgICAgIHJldHVybiBmb3VuZDtcclxuICAgIH1cclxuICAgIC8vIElmIHRoZXJlIGhhc24ndCBiZWVuIGEgbWF0Y2gsIHRyeSBhZ2FpbiBhdCB0aGUgcGFyZW50XHJcbiAgICBpZiAodGhpcy5wYXJlbnQgPT09IG51bGwgfHwgcGFyZW50QWxyZWFkeUNoZWNrZWQpXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQubG9va3VwKHBhdGgsIGZpbHRlclR5cGVzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBMb29rcyB1cCB0aGUgcmVmbGVjdGlvbiBvYmplY3QgYXQgdGhlIHNwZWNpZmllZCBwYXRoLCByZWxhdGl2ZSB0byB0aGlzIG5hbWVzcGFjZS5cclxuICogQG5hbWUgTmFtZXNwYWNlQmFzZSNsb29rdXBcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBwYXRoIFBhdGggdG8gbG9vayB1cFxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtwYXJlbnRBbHJlYWR5Q2hlY2tlZD1mYWxzZV0gV2hldGhlciB0aGUgcGFyZW50IGhhcyBhbHJlYWR5IGJlZW4gY2hlY2tlZFxyXG4gKiBAcmV0dXJucyB7P1JlZmxlY3Rpb25PYmplY3R9IExvb2tlZCB1cCBvYmplY3Qgb3IgYG51bGxgIGlmIG5vbmUgY291bGQgYmUgZm91bmRcclxuICogQHZhcmlhdGlvbiAyXHJcbiAqL1xyXG4vLyBsb29rdXAocGF0aDogc3RyaW5nLCBbcGFyZW50QWxyZWFkeUNoZWNrZWQ6IGJvb2xlYW5dKVxyXG5cclxuLyoqXHJcbiAqIExvb2tzIHVwIHRoZSB7QGxpbmsgVHlwZXx0eXBlfSBhdCB0aGUgc3BlY2lmaWVkIHBhdGgsIHJlbGF0aXZlIHRvIHRoaXMgbmFtZXNwYWNlLlxyXG4gKiBCZXNpZGVzIGl0cyBzaWduYXR1cmUsIHRoaXMgbWV0aG9kcyBkaWZmZXJzIGZyb20ge0BsaW5rIE5hbWVzcGFjZSNsb29rdXB8bG9va3VwfSBpbiB0aGF0IGl0IHRocm93cyBpbnN0ZWFkIG9mIHJldHVybmluZyBgbnVsbGAuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBwYXRoIFBhdGggdG8gbG9vayB1cFxyXG4gKiBAcmV0dXJucyB7VHlwZX0gTG9va2VkIHVwIHR5cGVcclxuICogQHRocm93cyB7RXJyb3J9IElmIGBwYXRoYCBkb2VzIG5vdCBwb2ludCB0byBhIHR5cGVcclxuICovXHJcbk5hbWVzcGFjZS5wcm90b3R5cGUubG9va3VwVHlwZSA9IGZ1bmN0aW9uIGxvb2t1cFR5cGUocGF0aCkge1xyXG4gICAgdmFyIGZvdW5kID0gdGhpcy5sb29rdXAocGF0aCwgWyBUeXBlIF0pO1xyXG4gICAgaWYgKCFmb3VuZClcclxuICAgICAgICB0aHJvdyBFcnJvcihcIm5vIHN1Y2ggdHlwZVwiKTtcclxuICAgIHJldHVybiBmb3VuZDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBMb29rcyB1cCB0aGUgdmFsdWVzIG9mIHRoZSB7QGxpbmsgRW51bXxlbnVtfSBhdCB0aGUgc3BlY2lmaWVkIHBhdGgsIHJlbGF0aXZlIHRvIHRoaXMgbmFtZXNwYWNlLlxyXG4gKiBCZXNpZGVzIGl0cyBzaWduYXR1cmUsIHRoaXMgbWV0aG9kcyBkaWZmZXJzIGZyb20ge0BsaW5rIE5hbWVzcGFjZSNsb29rdXB8bG9va3VwfSBpbiB0aGF0IGl0IHRocm93cyBpbnN0ZWFkIG9mIHJldHVybmluZyBgbnVsbGAuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBwYXRoIFBhdGggdG8gbG9vayB1cFxyXG4gKiBAcmV0dXJucyB7RW51bX0gTG9va2VkIHVwIGVudW1cclxuICogQHRocm93cyB7RXJyb3J9IElmIGBwYXRoYCBkb2VzIG5vdCBwb2ludCB0byBhbiBlbnVtXHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLmxvb2t1cEVudW0gPSBmdW5jdGlvbiBsb29rdXBFbnVtKHBhdGgpIHtcclxuICAgIHZhciBmb3VuZCA9IHRoaXMubG9va3VwKHBhdGgsIFsgRW51bSBdKTtcclxuICAgIGlmICghZm91bmQpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJubyBzdWNoIEVudW0gJ1wiICsgcGF0aCArIFwiJyBpbiBcIiArIHRoaXMpO1xyXG4gICAgcmV0dXJuIGZvdW5kO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIExvb2tzIHVwIHRoZSB7QGxpbmsgVHlwZXx0eXBlfSBvciB7QGxpbmsgRW51bXxlbnVtfSBhdCB0aGUgc3BlY2lmaWVkIHBhdGgsIHJlbGF0aXZlIHRvIHRoaXMgbmFtZXNwYWNlLlxyXG4gKiBCZXNpZGVzIGl0cyBzaWduYXR1cmUsIHRoaXMgbWV0aG9kcyBkaWZmZXJzIGZyb20ge0BsaW5rIE5hbWVzcGFjZSNsb29rdXB8bG9va3VwfSBpbiB0aGF0IGl0IHRocm93cyBpbnN0ZWFkIG9mIHJldHVybmluZyBgbnVsbGAuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBwYXRoIFBhdGggdG8gbG9vayB1cFxyXG4gKiBAcmV0dXJucyB7VHlwZX0gTG9va2VkIHVwIHR5cGUgb3IgZW51bVxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgYHBhdGhgIGRvZXMgbm90IHBvaW50IHRvIGEgdHlwZSBvciBlbnVtXHJcbiAqL1xyXG5OYW1lc3BhY2UucHJvdG90eXBlLmxvb2t1cFR5cGVPckVudW0gPSBmdW5jdGlvbiBsb29rdXBUeXBlT3JFbnVtKHBhdGgpIHtcclxuICAgIHZhciBmb3VuZCA9IHRoaXMubG9va3VwKHBhdGgsIFsgVHlwZSwgRW51bSBdKTtcclxuICAgIGlmICghZm91bmQpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJubyBzdWNoIFR5cGUgb3IgRW51bSAnXCIgKyBwYXRoICsgXCInIGluIFwiICsgdGhpcyk7XHJcbiAgICByZXR1cm4gZm91bmQ7XHJcbn07XHJcblxyXG4vKipcclxuICogTG9va3MgdXAgdGhlIHtAbGluayBTZXJ2aWNlfHNlcnZpY2V9IGF0IHRoZSBzcGVjaWZpZWQgcGF0aCwgcmVsYXRpdmUgdG8gdGhpcyBuYW1lc3BhY2UuXHJcbiAqIEJlc2lkZXMgaXRzIHNpZ25hdHVyZSwgdGhpcyBtZXRob2RzIGRpZmZlcnMgZnJvbSB7QGxpbmsgTmFtZXNwYWNlI2xvb2t1cHxsb29rdXB9IGluIHRoYXQgaXQgdGhyb3dzIGluc3RlYWQgb2YgcmV0dXJuaW5nIGBudWxsYC5cclxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IHBhdGggUGF0aCB0byBsb29rIHVwXHJcbiAqIEByZXR1cm5zIHtTZXJ2aWNlfSBMb29rZWQgdXAgc2VydmljZVxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgYHBhdGhgIGRvZXMgbm90IHBvaW50IHRvIGEgc2VydmljZVxyXG4gKi9cclxuTmFtZXNwYWNlLnByb3RvdHlwZS5sb29rdXBTZXJ2aWNlID0gZnVuY3Rpb24gbG9va3VwU2VydmljZShwYXRoKSB7XHJcbiAgICB2YXIgZm91bmQgPSB0aGlzLmxvb2t1cChwYXRoLCBbIFNlcnZpY2UgXSk7XHJcbiAgICBpZiAoIWZvdW5kKVxyXG4gICAgICAgIHRocm93IEVycm9yKFwibm8gc3VjaCBTZXJ2aWNlICdcIiArIHBhdGggKyBcIicgaW4gXCIgKyB0aGlzKTtcclxuICAgIHJldHVybiBmb3VuZDtcclxufTtcclxuXHJcbk5hbWVzcGFjZS5fY29uZmlndXJlID0gZnVuY3Rpb24oVHlwZV8sIFNlcnZpY2VfKSB7XHJcbiAgICBUeXBlICAgID0gVHlwZV87XHJcbiAgICBTZXJ2aWNlID0gU2VydmljZV87XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFJlZmxlY3Rpb25PYmplY3Q7XHJcblxyXG5SZWZsZWN0aW9uT2JqZWN0LmNsYXNzTmFtZSA9IFwiUmVmbGVjdGlvbk9iamVjdFwiO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxudmFyIFJvb3Q7IC8vIGN5Y2xpY1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgcmVmbGVjdGlvbiBvYmplY3QgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgQmFzZSBjbGFzcyBvZiBhbGwgcmVmbGVjdGlvbiBvYmplY3RzLlxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgT2JqZWN0IG5hbWVcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIERlY2xhcmVkIG9wdGlvbnNcclxuICogQGFic3RyYWN0XHJcbiAqL1xyXG5mdW5jdGlvbiBSZWZsZWN0aW9uT2JqZWN0KG5hbWUsIG9wdGlvbnMpIHtcclxuXHJcbiAgICBpZiAoIXV0aWwuaXNTdHJpbmcobmFtZSkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwibmFtZSBtdXN0IGJlIGEgc3RyaW5nXCIpO1xyXG5cclxuICAgIGlmIChvcHRpb25zICYmICF1dGlsLmlzT2JqZWN0KG9wdGlvbnMpKVxyXG4gICAgICAgIHRocm93IFR5cGVFcnJvcihcIm9wdGlvbnMgbXVzdCBiZSBhbiBvYmplY3RcIik7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBPcHRpb25zLlxyXG4gICAgICogQHR5cGUge09iamVjdC48c3RyaW5nLCo+fHVuZGVmaW5lZH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9uczsgLy8gdG9KU09OXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVbmlxdWUgbmFtZSB3aXRoaW4gaXRzIG5hbWVzcGFjZS5cclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQYXJlbnQgbmFtZXNwYWNlLlxyXG4gICAgICogQHR5cGUgez9OYW1lc3BhY2V9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucGFyZW50ID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgYWxyZWFkeSByZXNvbHZlZCBvciBub3QuXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXNvbHZlZCA9IGZhbHNlO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29tbWVudCB0ZXh0LCBpZiBhbnkuXHJcbiAgICAgKiBAdHlwZSB7P3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgdGhpcy5jb21tZW50ID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIERlZmluaW5nIGZpbGUgbmFtZS5cclxuICAgICAqIEB0eXBlIHs/c3RyaW5nfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmZpbGVuYW1lID0gbnVsbDtcclxufVxyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUsIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlZmVyZW5jZSB0byB0aGUgcm9vdCBuYW1lc3BhY2UuXHJcbiAgICAgKiBAbmFtZSBSZWZsZWN0aW9uT2JqZWN0I3Jvb3RcclxuICAgICAqIEB0eXBlIHtSb290fVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIHJvb3Q6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgcHRyID0gdGhpcztcclxuICAgICAgICAgICAgd2hpbGUgKHB0ci5wYXJlbnQgIT09IG51bGwpXHJcbiAgICAgICAgICAgICAgICBwdHIgPSBwdHIucGFyZW50O1xyXG4gICAgICAgICAgICByZXR1cm4gcHRyO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGdWxsIG5hbWUgaW5jbHVkaW5nIGxlYWRpbmcgZG90LlxyXG4gICAgICogQG5hbWUgUmVmbGVjdGlvbk9iamVjdCNmdWxsTmFtZVxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBmdWxsTmFtZToge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBwYXRoID0gWyB0aGlzLm5hbWUgXSxcclxuICAgICAgICAgICAgICAgIHB0ciA9IHRoaXMucGFyZW50O1xyXG4gICAgICAgICAgICB3aGlsZSAocHRyKSB7XHJcbiAgICAgICAgICAgICAgICBwYXRoLnVuc2hpZnQocHRyLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgcHRyID0gcHRyLnBhcmVudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcGF0aC5qb2luKFwiLlwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoaXMgcmVmbGVjdGlvbiBvYmplY3QgdG8gaXRzIGRlc2NyaXB0b3IgcmVwcmVzZW50YXRpb24uXHJcbiAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gRGVzY3JpcHRvclxyXG4gKiBAYWJzdHJhY3RcclxuICovXHJcblJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlLnRvSlNPTiA9IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIGZ1bmN0aW9uIHRvSlNPTigpIHtcclxuICAgIHRocm93IEVycm9yKCk7IC8vIG5vdCBpbXBsZW1lbnRlZCwgc2hvdWxkbid0IGhhcHBlblxyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbGxlZCB3aGVuIHRoaXMgb2JqZWN0IGlzIGFkZGVkIHRvIGEgcGFyZW50LlxyXG4gKiBAcGFyYW0ge1JlZmxlY3Rpb25PYmplY3R9IHBhcmVudCBQYXJlbnQgYWRkZWQgdG9cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlLm9uQWRkID0gZnVuY3Rpb24gb25BZGQocGFyZW50KSB7XHJcbiAgICBpZiAodGhpcy5wYXJlbnQgJiYgdGhpcy5wYXJlbnQgIT09IHBhcmVudClcclxuICAgICAgICB0aGlzLnBhcmVudC5yZW1vdmUodGhpcyk7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMucmVzb2x2ZWQgPSBmYWxzZTtcclxuICAgIHZhciByb290ID0gcGFyZW50LnJvb3Q7XHJcbiAgICBpZiAocm9vdCBpbnN0YW5jZW9mIFJvb3QpXHJcbiAgICAgICAgcm9vdC5faGFuZGxlQWRkKHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbGxlZCB3aGVuIHRoaXMgb2JqZWN0IGlzIHJlbW92ZWQgZnJvbSBhIHBhcmVudC5cclxuICogQHBhcmFtIHtSZWZsZWN0aW9uT2JqZWN0fSBwYXJlbnQgUGFyZW50IHJlbW92ZWQgZnJvbVxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUub25SZW1vdmUgPSBmdW5jdGlvbiBvblJlbW92ZShwYXJlbnQpIHtcclxuICAgIHZhciByb290ID0gcGFyZW50LnJvb3Q7XHJcbiAgICBpZiAocm9vdCBpbnN0YW5jZW9mIFJvb3QpXHJcbiAgICAgICAgcm9vdC5faGFuZGxlUmVtb3ZlKHRoaXMpO1xyXG4gICAgdGhpcy5wYXJlbnQgPSBudWxsO1xyXG4gICAgdGhpcy5yZXNvbHZlZCA9IGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlc29sdmVzIHRoaXMgb2JqZWN0cyB0eXBlIHJlZmVyZW5jZXMuXHJcbiAqIEByZXR1cm5zIHtSZWZsZWN0aW9uT2JqZWN0fSBgdGhpc2BcclxuICovXHJcblJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbiByZXNvbHZlKCkge1xyXG4gICAgaWYgKHRoaXMucmVzb2x2ZWQpXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICBpZiAodGhpcy5yb290IGluc3RhbmNlb2YgUm9vdClcclxuICAgICAgICB0aGlzLnJlc29sdmVkID0gdHJ1ZTsgLy8gb25seSBpZiBwYXJ0IG9mIGEgcm9vdFxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0cyBhbiBvcHRpb24gdmFsdWUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE9wdGlvbiBuYW1lXHJcbiAqIEByZXR1cm5zIHsqfSBPcHRpb24gdmFsdWUgb3IgYHVuZGVmaW5lZGAgaWYgbm90IHNldFxyXG4gKi9cclxuUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUuZ2V0T3B0aW9uID0gZnVuY3Rpb24gZ2V0T3B0aW9uKG5hbWUpIHtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMpXHJcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9uc1tuYW1lXTtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0cyBhbiBvcHRpb24uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE9wdGlvbiBuYW1lXHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgT3B0aW9uIHZhbHVlXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lmTm90U2V0XSBTZXRzIHRoZSBvcHRpb24gb25seSBpZiBpdCBpc24ndCBjdXJyZW50bHkgc2V0XHJcbiAqIEByZXR1cm5zIHtSZWZsZWN0aW9uT2JqZWN0fSBgdGhpc2BcclxuICovXHJcblJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlLnNldE9wdGlvbiA9IGZ1bmN0aW9uIHNldE9wdGlvbihuYW1lLCB2YWx1ZSwgaWZOb3RTZXQpIHtcclxuICAgIGlmICghaWZOb3RTZXQgfHwgIXRoaXMub3B0aW9ucyB8fCB0aGlzLm9wdGlvbnNbbmFtZV0gPT09IHVuZGVmaW5lZClcclxuICAgICAgICAodGhpcy5vcHRpb25zIHx8ICh0aGlzLm9wdGlvbnMgPSB7fSkpW25hbWVdID0gdmFsdWU7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTZXRzIG11bHRpcGxlIG9wdGlvbnMuXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9wdGlvbnMgT3B0aW9ucyB0byBzZXRcclxuICogQHBhcmFtIHtib29sZWFufSBbaWZOb3RTZXRdIFNldHMgYW4gb3B0aW9uIG9ubHkgaWYgaXQgaXNuJ3QgY3VycmVudGx5IHNldFxyXG4gKiBAcmV0dXJucyB7UmVmbGVjdGlvbk9iamVjdH0gYHRoaXNgXHJcbiAqL1xyXG5SZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZS5zZXRPcHRpb25zID0gZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRpb25zLCBpZk5vdFNldCkge1xyXG4gICAgaWYgKG9wdGlvbnMpXHJcbiAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9wdGlvbnMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMuc2V0T3B0aW9uKGtleXNbaV0sIG9wdGlvbnNba2V5c1tpXV0sIGlmTm90U2V0KTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoaXMgaW5zdGFuY2UgdG8gaXRzIHN0cmluZyByZXByZXNlbnRhdGlvbi5cclxuICogQHJldHVybnMge3N0cmluZ30gQ2xhc3MgbmFtZVssIHNwYWNlLCBmdWxsIG5hbWVdXHJcbiAqL1xyXG5SZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xyXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRoaXMuY29uc3RydWN0b3IuY2xhc3NOYW1lLFxyXG4gICAgICAgIGZ1bGxOYW1lICA9IHRoaXMuZnVsbE5hbWU7XHJcbiAgICBpZiAoZnVsbE5hbWUubGVuZ3RoKVxyXG4gICAgICAgIHJldHVybiBjbGFzc05hbWUgKyBcIiBcIiArIGZ1bGxOYW1lO1xyXG4gICAgcmV0dXJuIGNsYXNzTmFtZTtcclxufTtcclxuXHJcblJlZmxlY3Rpb25PYmplY3QuX2NvbmZpZ3VyZSA9IGZ1bmN0aW9uKFJvb3RfKSB7XHJcbiAgICBSb290ID0gUm9vdF87XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IE9uZU9mO1xyXG5cclxuLy8gZXh0ZW5kcyBSZWZsZWN0aW9uT2JqZWN0XHJcbnZhciBSZWZsZWN0aW9uT2JqZWN0ID0gcmVxdWlyZShcIi4vb2JqZWN0XCIpO1xyXG4oKE9uZU9mLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUmVmbGVjdGlvbk9iamVjdC5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IE9uZU9mKS5jbGFzc05hbWUgPSBcIk9uZU9mXCI7XHJcblxyXG52YXIgRmllbGQgPSByZXF1aXJlKFwiLi9maWVsZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IG9uZW9mIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFJlZmxlY3RlZCBvbmVvZi5cclxuICogQGV4dGVuZHMgUmVmbGVjdGlvbk9iamVjdFxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgT25lb2YgbmFtZVxyXG4gKiBAcGFyYW0ge3N0cmluZ1tdfE9iamVjdC48c3RyaW5nLCo+fSBbZmllbGROYW1lc10gRmllbGQgbmFtZXNcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIERlY2xhcmVkIG9wdGlvbnNcclxuICovXHJcbmZ1bmN0aW9uIE9uZU9mKG5hbWUsIGZpZWxkTmFtZXMsIG9wdGlvbnMpIHtcclxuICAgIGlmICghQXJyYXkuaXNBcnJheShmaWVsZE5hbWVzKSkge1xyXG4gICAgICAgIG9wdGlvbnMgPSBmaWVsZE5hbWVzO1xyXG4gICAgICAgIGZpZWxkTmFtZXMgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICBSZWZsZWN0aW9uT2JqZWN0LmNhbGwodGhpcywgbmFtZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAoIShmaWVsZE5hbWVzID09PSB1bmRlZmluZWQgfHwgQXJyYXkuaXNBcnJheShmaWVsZE5hbWVzKSkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiZmllbGROYW1lcyBtdXN0IGJlIGFuIEFycmF5XCIpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmllbGQgbmFtZXMgdGhhdCBiZWxvbmcgdG8gdGhpcyBvbmVvZi5cclxuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5vbmVvZiA9IGZpZWxkTmFtZXMgfHwgW107IC8vIHRvSlNPTiwgbWFya2VyXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaWVsZHMgdGhhdCBiZWxvbmcgdG8gdGhpcyBvbmVvZiBhcyBhbiBhcnJheSBmb3IgaXRlcmF0aW9uLlxyXG4gICAgICogQHR5cGUge0ZpZWxkW119XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgdGhpcy5maWVsZHNBcnJheSA9IFtdOyAvLyBkZWNsYXJlZCByZWFkb25seSBmb3IgY29uZm9ybWFuY2UsIHBvc3NpYmx5IG5vdCB5ZXQgYWRkZWQgdG8gcGFyZW50XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBPbmVvZiBkZXNjcmlwdG9yLlxyXG4gKiBAdHlwZWRlZiBPbmVPZkRlc2NyaXB0b3JcclxuICogQHR5cGUge09iamVjdH1cclxuICogQHByb3BlcnR5IHtBcnJheS48c3RyaW5nPn0gb25lb2YgT25lb2YgZmllbGQgbmFtZXNcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIE9uZW9mIG9wdGlvbnNcclxuICovXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG9uZW9mIGZyb20gYSBvbmVvZiBkZXNjcmlwdG9yLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBPbmVvZiBuYW1lXHJcbiAqIEBwYXJhbSB7T25lT2ZEZXNjcmlwdG9yfSBqc29uIE9uZW9mIGRlc2NyaXB0b3JcclxuICogQHJldHVybnMge09uZU9mfSBDcmVhdGVkIG9uZW9mXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYXJndW1lbnRzIGFyZSBpbnZhbGlkXHJcbiAqL1xyXG5PbmVPZi5mcm9tSlNPTiA9IGZ1bmN0aW9uIGZyb21KU09OKG5hbWUsIGpzb24pIHtcclxuICAgIHJldHVybiBuZXcgT25lT2YobmFtZSwganNvbi5vbmVvZiwganNvbi5vcHRpb25zKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIG9uZW9mIHRvIGEgb25lb2YgZGVzY3JpcHRvci5cclxuICogQHJldHVybnMge09uZU9mRGVzY3JpcHRvcn0gT25lb2YgZGVzY3JpcHRvclxyXG4gKi9cclxuT25lT2YucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgb25lb2YgICA6IHRoaXMub25lb2YsXHJcbiAgICAgICAgb3B0aW9ucyA6IHRoaXMub3B0aW9uc1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIHRoZSBmaWVsZHMgb2YgdGhlIHNwZWNpZmllZCBvbmVvZiB0byB0aGUgcGFyZW50IGlmIG5vdCBhbHJlYWR5IGRvbmUgc28uXHJcbiAqIEBwYXJhbSB7T25lT2Z9IG9uZW9mIFRoZSBvbmVvZlxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAaW5uZXJcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gYWRkRmllbGRzVG9QYXJlbnQob25lb2YpIHtcclxuICAgIGlmIChvbmVvZi5wYXJlbnQpXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvbmVvZi5maWVsZHNBcnJheS5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgaWYgKCFvbmVvZi5maWVsZHNBcnJheVtpXS5wYXJlbnQpXHJcbiAgICAgICAgICAgICAgICBvbmVvZi5wYXJlbnQuYWRkKG9uZW9mLmZpZWxkc0FycmF5W2ldKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBmaWVsZCB0byB0aGlzIG9uZW9mIGFuZCByZW1vdmVzIGl0IGZyb20gaXRzIGN1cnJlbnQgcGFyZW50LCBpZiBhbnkuXHJcbiAqIEBwYXJhbSB7RmllbGR9IGZpZWxkIEZpZWxkIHRvIGFkZFxyXG4gKiBAcmV0dXJucyB7T25lT2Z9IGB0aGlzYFxyXG4gKi9cclxuT25lT2YucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZChmaWVsZCkge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKCEoZmllbGQgaW5zdGFuY2VvZiBGaWVsZCkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiZmllbGQgbXVzdCBiZSBhIEZpZWxkXCIpO1xyXG5cclxuICAgIGlmIChmaWVsZC5wYXJlbnQgJiYgZmllbGQucGFyZW50ICE9PSB0aGlzLnBhcmVudClcclxuICAgICAgICBmaWVsZC5wYXJlbnQucmVtb3ZlKGZpZWxkKTtcclxuICAgIHRoaXMub25lb2YucHVzaChmaWVsZC5uYW1lKTtcclxuICAgIHRoaXMuZmllbGRzQXJyYXkucHVzaChmaWVsZCk7XHJcbiAgICBmaWVsZC5wYXJ0T2YgPSB0aGlzOyAvLyBmaWVsZC5wYXJlbnQgcmVtYWlucyBudWxsXHJcbiAgICBhZGRGaWVsZHNUb1BhcmVudCh0aGlzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbW92ZXMgYSBmaWVsZCBmcm9tIHRoaXMgb25lb2YgYW5kIHB1dHMgaXQgYmFjayB0byB0aGUgb25lb2YncyBwYXJlbnQuXHJcbiAqIEBwYXJhbSB7RmllbGR9IGZpZWxkIEZpZWxkIHRvIHJlbW92ZVxyXG4gKiBAcmV0dXJucyB7T25lT2Z9IGB0aGlzYFxyXG4gKi9cclxuT25lT2YucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZShmaWVsZCkge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKCEoZmllbGQgaW5zdGFuY2VvZiBGaWVsZCkpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiZmllbGQgbXVzdCBiZSBhIEZpZWxkXCIpO1xyXG5cclxuICAgIHZhciBpbmRleCA9IHRoaXMuZmllbGRzQXJyYXkuaW5kZXhPZihmaWVsZCk7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAoaW5kZXggPCAwKVxyXG4gICAgICAgIHRocm93IEVycm9yKGZpZWxkICsgXCIgaXMgbm90IGEgbWVtYmVyIG9mIFwiICsgdGhpcyk7XHJcblxyXG4gICAgdGhpcy5maWVsZHNBcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgaW5kZXggPSB0aGlzLm9uZW9mLmluZGV4T2YoZmllbGQubmFtZSk7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgIGlmIChpbmRleCA+IC0xKSAvLyB0aGVvcmV0aWNhbFxyXG4gICAgICAgIHRoaXMub25lb2Yuc3BsaWNlKGluZGV4LCAxKTtcclxuXHJcbiAgICBmaWVsZC5wYXJ0T2YgPSBudWxsO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQG92ZXJyaWRlXHJcbiAqL1xyXG5PbmVPZi5wcm90b3R5cGUub25BZGQgPSBmdW5jdGlvbiBvbkFkZChwYXJlbnQpIHtcclxuICAgIFJlZmxlY3Rpb25PYmplY3QucHJvdG90eXBlLm9uQWRkLmNhbGwodGhpcywgcGFyZW50KTtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIC8vIENvbGxlY3QgcHJlc2VudCBmaWVsZHNcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5vbmVvZi5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHZhciBmaWVsZCA9IHBhcmVudC5nZXQodGhpcy5vbmVvZltpXSk7XHJcbiAgICAgICAgaWYgKGZpZWxkICYmICFmaWVsZC5wYXJ0T2YpIHtcclxuICAgICAgICAgICAgZmllbGQucGFydE9mID0gc2VsZjtcclxuICAgICAgICAgICAgc2VsZi5maWVsZHNBcnJheS5wdXNoKGZpZWxkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyBBZGQgbm90IHlldCBwcmVzZW50IGZpZWxkc1xyXG4gICAgYWRkRmllbGRzVG9QYXJlbnQodGhpcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQG92ZXJyaWRlXHJcbiAqL1xyXG5PbmVPZi5wcm90b3R5cGUub25SZW1vdmUgPSBmdW5jdGlvbiBvblJlbW92ZShwYXJlbnQpIHtcclxuICAgIGZvciAodmFyIGkgPSAwLCBmaWVsZDsgaSA8IHRoaXMuZmllbGRzQXJyYXkubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgaWYgKChmaWVsZCA9IHRoaXMuZmllbGRzQXJyYXlbaV0pLnBhcmVudClcclxuICAgICAgICAgICAgZmllbGQucGFyZW50LnJlbW92ZShmaWVsZCk7XHJcbiAgICBSZWZsZWN0aW9uT2JqZWN0LnByb3RvdHlwZS5vblJlbW92ZS5jYWxsKHRoaXMsIHBhcmVudCk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlO1xyXG5cclxucGFyc2UuZmlsZW5hbWUgPSBudWxsO1xyXG5wYXJzZS5kZWZhdWx0cyA9IHsga2VlcENhc2U6IGZhbHNlIH07XHJcblxyXG52YXIgdG9rZW5pemUgID0gcmVxdWlyZShcIi4vdG9rZW5pemVcIiksXHJcbiAgICBSb290ICAgICAgPSByZXF1aXJlKFwiLi9yb290XCIpLFxyXG4gICAgVHlwZSAgICAgID0gcmVxdWlyZShcIi4vdHlwZVwiKSxcclxuICAgIEZpZWxkICAgICA9IHJlcXVpcmUoXCIuL2ZpZWxkXCIpLFxyXG4gICAgTWFwRmllbGQgID0gcmVxdWlyZShcIi4vbWFwZmllbGRcIiksXHJcbiAgICBPbmVPZiAgICAgPSByZXF1aXJlKFwiLi9vbmVvZlwiKSxcclxuICAgIEVudW0gICAgICA9IHJlcXVpcmUoXCIuL2VudW1cIiksXHJcbiAgICBTZXJ2aWNlICAgPSByZXF1aXJlKFwiLi9zZXJ2aWNlXCIpLFxyXG4gICAgTWV0aG9kICAgID0gcmVxdWlyZShcIi4vbWV0aG9kXCIpLFxyXG4gICAgdHlwZXMgICAgID0gcmVxdWlyZShcIi4vdHlwZXNcIiksXHJcbiAgICB1dGlsICAgICAgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxudmFyIGJhc2UxMFJlICAgID0gL15bMS05XVswLTldKiQvLFxyXG4gICAgYmFzZTEwTmVnUmUgPSAvXi0/WzEtOV1bMC05XSokLyxcclxuICAgIGJhc2UxNlJlICAgID0gL14wW3hdWzAtOWEtZkEtRl0rJC8sXHJcbiAgICBiYXNlMTZOZWdSZSA9IC9eLT8wW3hdWzAtOWEtZkEtRl0rJC8sXHJcbiAgICBiYXNlOFJlICAgICA9IC9eMFswLTddKyQvLFxyXG4gICAgYmFzZThOZWdSZSAgPSAvXi0/MFswLTddKyQvLFxyXG4gICAgbnVtYmVyUmUgICAgPSAvXig/IVtlRV0pWzAtOV0qKD86XFwuWzAtOV0qKT8oPzpbZUVdWystXT9bMC05XSspPyQvLFxyXG4gICAgbmFtZVJlICAgICAgPSAvXlthLXpBLVpfXVthLXpBLVpfMC05XSokLyxcclxuICAgIHR5cGVSZWZSZSAgID0gL14oPzpcXC4/W2EtekEtWl9dW2EtekEtWl8wLTldKikrJC8sXHJcbiAgICBmcVR5cGVSZWZSZSA9IC9eKD86XFwuW2EtekEtWl1bYS16QS1aXzAtOV0qKSskLztcclxuXHJcbnZhciBjYW1lbENhc2VSZSA9IC9fKFthLXpdKS9nO1xyXG5cclxuZnVuY3Rpb24gY2FtZWxDYXNlKHN0cikge1xyXG4gICAgcmV0dXJuIHN0ci5zdWJzdHJpbmcoMCwxKVxyXG4gICAgICAgICArIHN0ci5zdWJzdHJpbmcoMSlcclxuICAgICAgICAgICAgICAgLnJlcGxhY2UoY2FtZWxDYXNlUmUsIGZ1bmN0aW9uKCQwLCAkMSkgeyByZXR1cm4gJDEudG9VcHBlckNhc2UoKTsgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXN1bHQgb2JqZWN0IHJldHVybmVkIGZyb20ge0BsaW5rIHBhcnNlfS5cclxuICogQHR5cGVkZWYgUGFyc2VyUmVzdWx0XHJcbiAqIEB0eXBlIHtPYmplY3QuPHN0cmluZywqPn1cclxuICogQHByb3BlcnR5IHtzdHJpbmd8dW5kZWZpbmVkfSBwYWNrYWdlIFBhY2thZ2UgbmFtZSwgaWYgZGVjbGFyZWRcclxuICogQHByb3BlcnR5IHtzdHJpbmdbXXx1bmRlZmluZWR9IGltcG9ydHMgSW1wb3J0cywgaWYgYW55XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nW118dW5kZWZpbmVkfSB3ZWFrSW1wb3J0cyBXZWFrIGltcG9ydHMsIGlmIGFueVxyXG4gKiBAcHJvcGVydHkge3N0cmluZ3x1bmRlZmluZWR9IHN5bnRheCBTeW50YXgsIGlmIHNwZWNpZmllZCAoZWl0aGVyIGBcInByb3RvMlwiYCBvciBgXCJwcm90bzNcImApXHJcbiAqIEBwcm9wZXJ0eSB7Um9vdH0gcm9vdCBQb3B1bGF0ZWQgcm9vdCBpbnN0YW5jZVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBPcHRpb25zIG1vZGlmeWluZyB0aGUgYmVoYXZpb3Igb2Yge0BsaW5rIHBhcnNlfS5cclxuICogQHR5cGVkZWYgUGFyc2VPcHRpb25zXHJcbiAqIEB0eXBlIHtPYmplY3QuPHN0cmluZywqPn1cclxuICogQHByb3BlcnR5IHtib29sZWFufSBba2VlcENhc2U9ZmFsc2VdIEtlZXBzIGZpZWxkIGNhc2luZyBpbnN0ZWFkIG9mIGNvbnZlcnRpbmcgdG8gY2FtZWwgY2FzZVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBQYXJzZXMgdGhlIGdpdmVuIC5wcm90byBzb3VyY2UgYW5kIHJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHBhcnNlZCBjb250ZW50cy5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2UgU291cmNlIGNvbnRlbnRzXHJcbiAqIEBwYXJhbSB7Um9vdH0gcm9vdCBSb290IHRvIHBvcHVsYXRlXHJcbiAqIEBwYXJhbSB7UGFyc2VPcHRpb25zfSBbb3B0aW9uc10gUGFyc2Ugb3B0aW9ucy4gRGVmYXVsdHMgdG8ge0BsaW5rIHBhcnNlLmRlZmF1bHRzfSB3aGVuIG9taXR0ZWQuXHJcbiAqIEByZXR1cm5zIHtQYXJzZXJSZXN1bHR9IFBhcnNlciByZXN1bHRcclxuICogQHByb3BlcnR5IHtzdHJpbmd9IGZpbGVuYW1lPW51bGwgQ3VycmVudGx5IHByb2Nlc3NpbmcgZmlsZSBuYW1lIGZvciBlcnJvciByZXBvcnRpbmcsIGlmIGtub3duXHJcbiAqIEBwcm9wZXJ0eSB7UGFyc2VPcHRpb25zfSBkZWZhdWx0cyBEZWZhdWx0IHtAbGluayBQYXJzZU9wdGlvbnN9XHJcbiAqL1xyXG5mdW5jdGlvbiBwYXJzZShzb3VyY2UsIHJvb3QsIG9wdGlvbnMpIHtcclxuICAgIC8qIGVzbGludC1kaXNhYmxlIGNhbGxiYWNrLXJldHVybiAqL1xyXG4gICAgaWYgKCEocm9vdCBpbnN0YW5jZW9mIFJvb3QpKSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IHJvb3Q7XHJcbiAgICAgICAgcm9vdCA9IG5ldyBSb290KCk7XHJcbiAgICB9XHJcbiAgICBpZiAoIW9wdGlvbnMpXHJcbiAgICAgICAgb3B0aW9ucyA9IHBhcnNlLmRlZmF1bHRzO1xyXG5cclxuICAgIHZhciB0biA9IHRva2VuaXplKHNvdXJjZSksXHJcbiAgICAgICAgbmV4dCA9IHRuLm5leHQsXHJcbiAgICAgICAgcHVzaCA9IHRuLnB1c2gsXHJcbiAgICAgICAgcGVlayA9IHRuLnBlZWssXHJcbiAgICAgICAgc2tpcCA9IHRuLnNraXAsXHJcbiAgICAgICAgY21udCA9IHRuLmNtbnQ7XHJcblxyXG4gICAgdmFyIGhlYWQgPSB0cnVlLFxyXG4gICAgICAgIHBrZyxcclxuICAgICAgICBpbXBvcnRzLFxyXG4gICAgICAgIHdlYWtJbXBvcnRzLFxyXG4gICAgICAgIHN5bnRheCxcclxuICAgICAgICBpc1Byb3RvMyA9IGZhbHNlO1xyXG5cclxuICAgIHZhciBwdHIgPSByb290O1xyXG5cclxuICAgIHZhciBhcHBseUNhc2UgPSBvcHRpb25zLmtlZXBDYXNlID8gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gbmFtZTsgfSA6IGNhbWVsQ2FzZTtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgZnVuY3Rpb24gaWxsZWdhbCh0b2tlbiwgbmFtZSwgaW5zaWRlVHJ5Q2F0Y2gpIHtcclxuICAgICAgICB2YXIgZmlsZW5hbWUgPSBwYXJzZS5maWxlbmFtZTtcclxuICAgICAgICBpZiAoIWluc2lkZVRyeUNhdGNoKVxyXG4gICAgICAgICAgICBwYXJzZS5maWxlbmFtZSA9IG51bGw7XHJcbiAgICAgICAgcmV0dXJuIEVycm9yKFwiaWxsZWdhbCBcIiArIChuYW1lIHx8IFwidG9rZW5cIikgKyBcIiAnXCIgKyB0b2tlbiArIFwiJyAoXCIgKyAoZmlsZW5hbWUgPyBmaWxlbmFtZSArIFwiLCBcIiA6IFwiXCIpICsgXCJsaW5lIFwiICsgdG4ubGluZSgpICsgXCIpXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlYWRTdHJpbmcoKSB7XHJcbiAgICAgICAgdmFyIHZhbHVlcyA9IFtdLFxyXG4gICAgICAgICAgICB0b2tlbjtcclxuICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICBpZiAoKHRva2VuID0gbmV4dCgpKSAhPT0gXCJcXFwiXCIgJiYgdG9rZW4gIT09IFwiJ1wiKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbik7XHJcblxyXG4gICAgICAgICAgICB2YWx1ZXMucHVzaChuZXh0KCkpO1xyXG4gICAgICAgICAgICBza2lwKHRva2VuKTtcclxuICAgICAgICAgICAgdG9rZW4gPSBwZWVrKCk7XHJcbiAgICAgICAgfSB3aGlsZSAodG9rZW4gPT09IFwiXFxcIlwiIHx8IHRva2VuID09PSBcIidcIik7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlcy5qb2luKFwiXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlYWRWYWx1ZShhY2NlcHRUeXBlUmVmKSB7XHJcbiAgICAgICAgdmFyIHRva2VuID0gbmV4dCgpO1xyXG4gICAgICAgIHN3aXRjaCAodG9rZW4pIHtcclxuICAgICAgICAgICAgY2FzZSBcIidcIjpcclxuICAgICAgICAgICAgY2FzZSBcIlxcXCJcIjpcclxuICAgICAgICAgICAgICAgIHB1c2godG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlYWRTdHJpbmcoKTtcclxuICAgICAgICAgICAgY2FzZSBcInRydWVcIjogY2FzZSBcIlRSVUVcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICBjYXNlIFwiZmFsc2VcIjogY2FzZSBcIkZBTFNFXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJzZU51bWJlcih0b2tlbiwgLyogaW5zaWRlVHJ5Q2F0Y2ggKi8gdHJ1ZSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG5cclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgaWYgKGFjY2VwdFR5cGVSZWYgJiYgdHlwZVJlZlJlLnRlc3QodG9rZW4pKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xyXG5cclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbiwgXCJ2YWx1ZVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVhZFJhbmdlcyh0YXJnZXQsIGFjY2VwdFN0cmluZ3MpIHtcclxuICAgICAgICB2YXIgdG9rZW4sIHN0YXJ0O1xyXG4gICAgICAgIGRvIHtcclxuICAgICAgICAgICAgaWYgKGFjY2VwdFN0cmluZ3MgJiYgKCh0b2tlbiA9IHBlZWsoKSkgPT09IFwiXFxcIlwiIHx8IHRva2VuID09PSBcIidcIikpXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQucHVzaChyZWFkU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQucHVzaChbIHN0YXJ0ID0gcGFyc2VJZChuZXh0KCkpLCBza2lwKFwidG9cIiwgdHJ1ZSkgPyBwYXJzZUlkKG5leHQoKSkgOiBzdGFydCBdKTtcclxuICAgICAgICB9IHdoaWxlIChza2lwKFwiLFwiLCB0cnVlKSk7XHJcbiAgICAgICAgc2tpcChcIjtcIik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VOdW1iZXIodG9rZW4sIGluc2lkZVRyeUNhdGNoKSB7XHJcbiAgICAgICAgdmFyIHNpZ24gPSAxO1xyXG4gICAgICAgIGlmICh0b2tlbi5jaGFyQXQoMCkgPT09IFwiLVwiKSB7XHJcbiAgICAgICAgICAgIHNpZ24gPSAtMTtcclxuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbi5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN3aXRjaCAodG9rZW4pIHtcclxuICAgICAgICAgICAgY2FzZSBcImluZlwiOiBjYXNlIFwiSU5GXCI6IGNhc2UgXCJJbmZcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBzaWduICogSW5maW5pdHk7XHJcbiAgICAgICAgICAgIGNhc2UgXCJuYW5cIjogY2FzZSBcIk5BTlwiOiBjYXNlIFwiTmFuXCI6IGNhc2UgXCJOYU5cIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBOYU47XHJcbiAgICAgICAgICAgIGNhc2UgXCIwXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJhc2UxMFJlLnRlc3QodG9rZW4pKVxyXG4gICAgICAgICAgICByZXR1cm4gc2lnbiAqIHBhcnNlSW50KHRva2VuLCAxMCk7XHJcbiAgICAgICAgaWYgKGJhc2UxNlJlLnRlc3QodG9rZW4pKVxyXG4gICAgICAgICAgICByZXR1cm4gc2lnbiAqIHBhcnNlSW50KHRva2VuLCAxNik7XHJcbiAgICAgICAgaWYgKGJhc2U4UmUudGVzdCh0b2tlbikpXHJcbiAgICAgICAgICAgIHJldHVybiBzaWduICogcGFyc2VJbnQodG9rZW4sIDgpO1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgIGlmIChudW1iZXJSZS50ZXN0KHRva2VuKSlcclxuICAgICAgICAgICAgcmV0dXJuIHNpZ24gKiBwYXJzZUZsb2F0KHRva2VuKTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuLCBcIm51bWJlclwiLCBpbnNpZGVUcnlDYXRjaCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VJZCh0b2tlbiwgYWNjZXB0TmVnYXRpdmUpIHtcclxuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJtYXhcIjogY2FzZSBcIk1BWFwiOiBjYXNlIFwiTWF4XCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gNTM2ODcwOTExO1xyXG4gICAgICAgICAgICBjYXNlIFwiMFwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIWFjY2VwdE5lZ2F0aXZlICYmIHRva2VuLmNoYXJBdCgwKSA9PT0gXCItXCIpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4sIFwiaWRcIik7XHJcblxyXG4gICAgICAgIGlmIChiYXNlMTBOZWdSZS50ZXN0KHRva2VuKSlcclxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHRva2VuLCAxMCk7XHJcbiAgICAgICAgaWYgKGJhc2UxNk5lZ1JlLnRlc3QodG9rZW4pKVxyXG4gICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQodG9rZW4sIDE2KTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICBpZiAoYmFzZThOZWdSZS50ZXN0KHRva2VuKSlcclxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHRva2VuLCA4KTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuLCBcImlkXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlUGFja2FnZSgpIHtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKHBrZyAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKFwicGFja2FnZVwiKTtcclxuXHJcbiAgICAgICAgcGtnID0gbmV4dCgpO1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIXR5cGVSZWZSZS50ZXN0KHBrZykpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwocGtnLCBcIm5hbWVcIik7XHJcblxyXG4gICAgICAgIHB0ciA9IHB0ci5kZWZpbmUocGtnKTtcclxuICAgICAgICBza2lwKFwiO1wiKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZUltcG9ydCgpIHtcclxuICAgICAgICB2YXIgdG9rZW4gPSBwZWVrKCk7XHJcbiAgICAgICAgdmFyIHdoaWNoSW1wb3J0cztcclxuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ3ZWFrXCI6XHJcbiAgICAgICAgICAgICAgICB3aGljaEltcG9ydHMgPSB3ZWFrSW1wb3J0cyB8fCAod2Vha0ltcG9ydHMgPSBbXSk7XHJcbiAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInB1YmxpY1wiOlxyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1mYWxsdGhyb3VnaFxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgd2hpY2hJbXBvcnRzID0gaW1wb3J0cyB8fCAoaW1wb3J0cyA9IFtdKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0b2tlbiA9IHJlYWRTdHJpbmcoKTtcclxuICAgICAgICBza2lwKFwiO1wiKTtcclxuICAgICAgICB3aGljaEltcG9ydHMucHVzaCh0b2tlbik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VTeW50YXgoKSB7XHJcbiAgICAgICAgc2tpcChcIj1cIik7XHJcbiAgICAgICAgc3ludGF4ID0gcmVhZFN0cmluZygpO1xyXG4gICAgICAgIGlzUHJvdG8zID0gc3ludGF4ID09PSBcInByb3RvM1wiO1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIWlzUHJvdG8zICYmIHN5bnRheCAhPT0gXCJwcm90bzJcIilcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbChzeW50YXgsIFwic3ludGF4XCIpO1xyXG5cclxuICAgICAgICBza2lwKFwiO1wiKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZUNvbW1vbihwYXJlbnQsIHRva2VuKSB7XHJcbiAgICAgICAgc3dpdGNoICh0b2tlbikge1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIm9wdGlvblwiOlxyXG4gICAgICAgICAgICAgICAgcGFyc2VPcHRpb24ocGFyZW50LCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICBza2lwKFwiO1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIm1lc3NhZ2VcIjpcclxuICAgICAgICAgICAgICAgIHBhcnNlVHlwZShwYXJlbnQsIHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcImVudW1cIjpcclxuICAgICAgICAgICAgICAgIHBhcnNlRW51bShwYXJlbnQsIHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcInNlcnZpY2VcIjpcclxuICAgICAgICAgICAgICAgIHBhcnNlU2VydmljZShwYXJlbnQsIHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcImV4dGVuZFwiOlxyXG4gICAgICAgICAgICAgICAgcGFyc2VFeHRlbnNpb24ocGFyZW50LCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGlmQmxvY2sob2JqLCBmbklmLCBmbkVsc2UpIHtcclxuICAgICAgICB2YXIgdHJhaWxpbmdMaW5lID0gdG4ubGluZSgpO1xyXG4gICAgICAgIGlmIChvYmopIHtcclxuICAgICAgICAgICAgb2JqLmNvbW1lbnQgPSBjbW50KCk7IC8vIHRyeSBibG9jay10eXBlIGNvbW1lbnRcclxuICAgICAgICAgICAgb2JqLmZpbGVuYW1lID0gcGFyc2UuZmlsZW5hbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChza2lwKFwie1wiLCB0cnVlKSkge1xyXG4gICAgICAgICAgICB2YXIgdG9rZW47XHJcbiAgICAgICAgICAgIHdoaWxlICgodG9rZW4gPSBuZXh0KCkpICE9PSBcIn1cIilcclxuICAgICAgICAgICAgICAgIGZuSWYodG9rZW4pO1xyXG4gICAgICAgICAgICBza2lwKFwiO1wiLCB0cnVlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoZm5FbHNlKVxyXG4gICAgICAgICAgICAgICAgZm5FbHNlKCk7XHJcbiAgICAgICAgICAgIHNraXAoXCI7XCIpO1xyXG4gICAgICAgICAgICBpZiAob2JqICYmIHR5cGVvZiBvYmouY29tbWVudCAhPT0gXCJzdHJpbmdcIilcclxuICAgICAgICAgICAgICAgIG9iai5jb21tZW50ID0gY21udCh0cmFpbGluZ0xpbmUpOyAvLyB0cnkgbGluZS10eXBlIGNvbW1lbnQgaWYgbm8gYmxvY2tcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VUeXBlKHBhcmVudCwgdG9rZW4pIHtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCFuYW1lUmUudGVzdCh0b2tlbiA9IG5leHQoKSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4sIFwidHlwZSBuYW1lXCIpO1xyXG5cclxuICAgICAgICB2YXIgdHlwZSA9IG5ldyBUeXBlKHRva2VuKTtcclxuICAgICAgICBpZkJsb2NrKHR5cGUsIGZ1bmN0aW9uIHBhcnNlVHlwZV9ibG9jayh0b2tlbikge1xyXG4gICAgICAgICAgICBpZiAocGFyc2VDb21tb24odHlwZSwgdG9rZW4pKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0b2tlbikge1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJtYXBcIjpcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZU1hcEZpZWxkKHR5cGUsIHRva2VuKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVxdWlyZWRcIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJvcHRpb25hbFwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJlcGVhdGVkXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VGaWVsZCh0eXBlLCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIm9uZW9mXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VPbmVPZih0eXBlLCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSBcImV4dGVuc2lvbnNcIjpcclxuICAgICAgICAgICAgICAgICAgICByZWFkUmFuZ2VzKHR5cGUuZXh0ZW5zaW9ucyB8fCAodHlwZS5leHRlbnNpb25zID0gW10pKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVzZXJ2ZWRcIjpcclxuICAgICAgICAgICAgICAgICAgICByZWFkUmFuZ2VzKHR5cGUucmVzZXJ2ZWQgfHwgKHR5cGUucmVzZXJ2ZWQgPSBbXSksIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc1Byb3RvMyB8fCAhdHlwZVJlZlJlLnRlc3QodG9rZW4pKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcHVzaCh0b2tlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VGaWVsZCh0eXBlLCBcIm9wdGlvbmFsXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcGFyZW50LmFkZCh0eXBlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZUZpZWxkKHBhcmVudCwgcnVsZSwgZXh0ZW5kKSB7XHJcbiAgICAgICAgdmFyIHR5cGUgPSBuZXh0KCk7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IFwiZ3JvdXBcIikge1xyXG4gICAgICAgICAgICBwYXJzZUdyb3VwKHBhcmVudCwgcnVsZSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghdHlwZVJlZlJlLnRlc3QodHlwZSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodHlwZSwgXCJ0eXBlXCIpO1xyXG5cclxuICAgICAgICB2YXIgbmFtZSA9IG5leHQoKTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCFuYW1lUmUudGVzdChuYW1lKSlcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbChuYW1lLCBcIm5hbWVcIik7XHJcblxyXG4gICAgICAgIG5hbWUgPSBhcHBseUNhc2UobmFtZSk7XHJcbiAgICAgICAgc2tpcChcIj1cIik7XHJcblxyXG4gICAgICAgIHZhciBmaWVsZCA9IG5ldyBGaWVsZChuYW1lLCBwYXJzZUlkKG5leHQoKSksIHR5cGUsIHJ1bGUsIGV4dGVuZCk7XHJcbiAgICAgICAgaWZCbG9jayhmaWVsZCwgZnVuY3Rpb24gcGFyc2VGaWVsZF9ibG9jayh0b2tlbikge1xyXG5cclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgaWYgKHRva2VuID09PSBcIm9wdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJzZU9wdGlvbihmaWVsZCwgdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgc2tpcChcIjtcIik7XHJcbiAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbik7XHJcblxyXG4gICAgICAgIH0sIGZ1bmN0aW9uIHBhcnNlRmllbGRfbGluZSgpIHtcclxuICAgICAgICAgICAgcGFyc2VJbmxpbmVPcHRpb25zKGZpZWxkKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBwYXJlbnQuYWRkKGZpZWxkKTtcclxuXHJcbiAgICAgICAgLy8gSlNPTiBkZWZhdWx0cyB0byBwYWNrZWQ9dHJ1ZSBpZiBub3Qgc2V0IHNvIHdlIGhhdmUgdG8gc2V0IHBhY2tlZD1mYWxzZSBleHBsaWNpdHkgd2hlblxyXG4gICAgICAgIC8vIHBhcnNpbmcgcHJvdG8yIGRlc2NyaXB0b3JzIHdpdGhvdXQgdGhlIG9wdGlvbiwgd2hlcmUgYXBwbGljYWJsZS4gVGhpcyBtdXN0IGJlIGRvbmUgZm9yXHJcbiAgICAgICAgLy8gYW55IHR5cGUgKG5vdCBqdXN0IHBhY2thYmxlIHR5cGVzKSBiZWNhdXNlIGVudW1zIGFsc28gdXNlIHZhcmludCBlbmNvZGluZyBhbmQgaXQgaXMgbm90XHJcbiAgICAgICAgLy8geWV0IGtub3duIHdoZXRoZXIgYSB0eXBlIGlzIGFuIGVudW0gb3Igbm90LlxyXG4gICAgICAgIGlmICghaXNQcm90bzMgJiYgZmllbGQucmVwZWF0ZWQpXHJcbiAgICAgICAgICAgIGZpZWxkLnNldE9wdGlvbihcInBhY2tlZFwiLCBmYWxzZSwgLyogaWZOb3RTZXQgKi8gdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VHcm91cChwYXJlbnQsIHJ1bGUpIHtcclxuICAgICAgICB2YXIgbmFtZSA9IG5leHQoKTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCFuYW1lUmUudGVzdChuYW1lKSlcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbChuYW1lLCBcIm5hbWVcIik7XHJcblxyXG4gICAgICAgIHZhciBmaWVsZE5hbWUgPSB1dGlsLmxjRmlyc3QobmFtZSk7XHJcbiAgICAgICAgaWYgKG5hbWUgPT09IGZpZWxkTmFtZSlcclxuICAgICAgICAgICAgbmFtZSA9IHV0aWwudWNGaXJzdChuYW1lKTtcclxuICAgICAgICBza2lwKFwiPVwiKTtcclxuICAgICAgICB2YXIgaWQgPSBwYXJzZUlkKG5leHQoKSk7XHJcbiAgICAgICAgdmFyIHR5cGUgPSBuZXcgVHlwZShuYW1lKTtcclxuICAgICAgICB0eXBlLmdyb3VwID0gdHJ1ZTtcclxuICAgICAgICB2YXIgZmllbGQgPSBuZXcgRmllbGQoZmllbGROYW1lLCBpZCwgbmFtZSwgcnVsZSk7XHJcbiAgICAgICAgZmllbGQuZmlsZW5hbWUgPSBwYXJzZS5maWxlbmFtZTtcclxuICAgICAgICBpZkJsb2NrKHR5cGUsIGZ1bmN0aW9uIHBhcnNlR3JvdXBfYmxvY2sodG9rZW4pIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0b2tlbikge1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgXCJvcHRpb25cIjpcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZU9wdGlvbih0eXBlLCB0b2tlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgc2tpcChcIjtcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJlcXVpcmVkXCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwib3B0aW9uYWxcIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJyZXBlYXRlZFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlRmllbGQodHlwZSwgdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pOyAvLyB0aGVyZSBhcmUgbm8gZ3JvdXBzIHdpdGggcHJvdG8zIHNlbWFudGljc1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcGFyZW50LmFkZCh0eXBlKVxyXG4gICAgICAgICAgICAgIC5hZGQoZmllbGQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlTWFwRmllbGQocGFyZW50KSB7XHJcbiAgICAgICAgc2tpcChcIjxcIik7XHJcbiAgICAgICAgdmFyIGtleVR5cGUgPSBuZXh0KCk7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICh0eXBlcy5tYXBLZXlba2V5VHlwZV0gPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbChrZXlUeXBlLCBcInR5cGVcIik7XHJcblxyXG4gICAgICAgIHNraXAoXCIsXCIpO1xyXG4gICAgICAgIHZhciB2YWx1ZVR5cGUgPSBuZXh0KCk7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghdHlwZVJlZlJlLnRlc3QodmFsdWVUeXBlKSlcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh2YWx1ZVR5cGUsIFwidHlwZVwiKTtcclxuXHJcbiAgICAgICAgc2tpcChcIj5cIik7XHJcbiAgICAgICAgdmFyIG5hbWUgPSBuZXh0KCk7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghbmFtZVJlLnRlc3QobmFtZSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwobmFtZSwgXCJuYW1lXCIpO1xyXG5cclxuICAgICAgICBza2lwKFwiPVwiKTtcclxuICAgICAgICB2YXIgZmllbGQgPSBuZXcgTWFwRmllbGQoYXBwbHlDYXNlKG5hbWUpLCBwYXJzZUlkKG5leHQoKSksIGtleVR5cGUsIHZhbHVlVHlwZSk7XHJcbiAgICAgICAgaWZCbG9jayhmaWVsZCwgZnVuY3Rpb24gcGFyc2VNYXBGaWVsZF9ibG9jayh0b2tlbikge1xyXG5cclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgaWYgKHRva2VuID09PSBcIm9wdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJzZU9wdGlvbihmaWVsZCwgdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgc2tpcChcIjtcIik7XHJcbiAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbik7XHJcblxyXG4gICAgICAgIH0sIGZ1bmN0aW9uIHBhcnNlTWFwRmllbGRfbGluZSgpIHtcclxuICAgICAgICAgICAgcGFyc2VJbmxpbmVPcHRpb25zKGZpZWxkKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBwYXJlbnQuYWRkKGZpZWxkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZU9uZU9mKHBhcmVudCwgdG9rZW4pIHtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCFuYW1lUmUudGVzdCh0b2tlbiA9IG5leHQoKSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4sIFwibmFtZVwiKTtcclxuXHJcbiAgICAgICAgdmFyIG9uZW9mID0gbmV3IE9uZU9mKGFwcGx5Q2FzZSh0b2tlbikpO1xyXG4gICAgICAgIGlmQmxvY2sob25lb2YsIGZ1bmN0aW9uIHBhcnNlT25lT2ZfYmxvY2sodG9rZW4pIHtcclxuICAgICAgICAgICAgaWYgKHRva2VuID09PSBcIm9wdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJzZU9wdGlvbihvbmVvZiwgdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgc2tpcChcIjtcIik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBwdXNoKHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHBhcnNlRmllbGQob25lb2YsIFwib3B0aW9uYWxcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBwYXJlbnQuYWRkKG9uZW9mKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZUVudW0ocGFyZW50LCB0b2tlbikge1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIW5hbWVSZS50ZXN0KHRva2VuID0gbmV4dCgpKSlcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbiwgXCJuYW1lXCIpO1xyXG5cclxuICAgICAgICB2YXIgZW5tID0gbmV3IEVudW0odG9rZW4pO1xyXG4gICAgICAgIGlmQmxvY2soZW5tLCBmdW5jdGlvbiBwYXJzZUVudW1fYmxvY2sodG9rZW4pIHtcclxuICAgICAgICAgICAgaWYgKHRva2VuID09PSBcIm9wdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJzZU9wdGlvbihlbm0sIHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHNraXAoXCI7XCIpO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHBhcnNlRW51bVZhbHVlKGVubSwgdG9rZW4pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHBhcmVudC5hZGQoZW5tKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZUVudW1WYWx1ZShwYXJlbnQsIHRva2VuKSB7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghbmFtZVJlLnRlc3QodG9rZW4pKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuLCBcIm5hbWVcIik7XHJcblxyXG4gICAgICAgIHNraXAoXCI9XCIpO1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnNlSWQobmV4dCgpLCB0cnVlKSxcclxuICAgICAgICAgICAgZHVtbXkgPSB7fTtcclxuICAgICAgICBpZkJsb2NrKGR1bW15LCBmdW5jdGlvbiBwYXJzZUVudW1WYWx1ZV9ibG9jayh0b2tlbikge1xyXG5cclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgaWYgKHRva2VuID09PSBcIm9wdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJzZU9wdGlvbihkdW1teSwgdG9rZW4pOyAvLyBza2lwXHJcbiAgICAgICAgICAgICAgICBza2lwKFwiO1wiKTtcclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTtcclxuXHJcbiAgICAgICAgfSwgZnVuY3Rpb24gcGFyc2VFbnVtVmFsdWVfbGluZSgpIHtcclxuICAgICAgICAgICAgcGFyc2VJbmxpbmVPcHRpb25zKGR1bW15KTsgLy8gc2tpcFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHBhcmVudC5hZGQodG9rZW4sIHZhbHVlLCBkdW1teS5jb21tZW50KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZU9wdGlvbihwYXJlbnQsIHRva2VuKSB7XHJcbiAgICAgICAgdmFyIGlzQ3VzdG9tID0gc2tpcChcIihcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghdHlwZVJlZlJlLnRlc3QodG9rZW4gPSBuZXh0KCkpKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuLCBcIm5hbWVcIik7XHJcblxyXG4gICAgICAgIHZhciBuYW1lID0gdG9rZW47XHJcbiAgICAgICAgaWYgKGlzQ3VzdG9tKSB7XHJcbiAgICAgICAgICAgIHNraXAoXCIpXCIpO1xyXG4gICAgICAgICAgICBuYW1lID0gXCIoXCIgKyBuYW1lICsgXCIpXCI7XHJcbiAgICAgICAgICAgIHRva2VuID0gcGVlaygpO1xyXG4gICAgICAgICAgICBpZiAoZnFUeXBlUmVmUmUudGVzdCh0b2tlbikpIHtcclxuICAgICAgICAgICAgICAgIG5hbWUgKz0gdG9rZW47XHJcbiAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgc2tpcChcIj1cIik7XHJcbiAgICAgICAgcGFyc2VPcHRpb25WYWx1ZShwYXJlbnQsIG5hbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlT3B0aW9uVmFsdWUocGFyZW50LCBuYW1lKSB7XHJcbiAgICAgICAgaWYgKHNraXAoXCJ7XCIsIHRydWUpKSB7IC8vIHsgYTogXCJmb29cIiBiIHsgYzogXCJiYXJcIiB9IH1cclxuICAgICAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgICAgICBpZiAoIW5hbWVSZS50ZXN0KHRva2VuID0gbmV4dCgpKSlcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuLCBcIm5hbWVcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHBlZWsoKSA9PT0gXCJ7XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VPcHRpb25WYWx1ZShwYXJlbnQsIG5hbWUgKyBcIi5cIiArIHRva2VuKTtcclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNraXAoXCI6XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNldE9wdGlvbihwYXJlbnQsIG5hbWUgKyBcIi5cIiArIHRva2VuLCByZWFkVmFsdWUodHJ1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IHdoaWxlICghc2tpcChcIn1cIiwgdHJ1ZSkpO1xyXG4gICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICBzZXRPcHRpb24ocGFyZW50LCBuYW1lLCByZWFkVmFsdWUodHJ1ZSkpO1xyXG4gICAgICAgIC8vIERvZXMgbm90IGVuZm9yY2UgYSBkZWxpbWl0ZXIgdG8gYmUgdW5pdmVyc2FsXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2V0T3B0aW9uKHBhcmVudCwgbmFtZSwgdmFsdWUpIHtcclxuICAgICAgICBpZiAocGFyZW50LnNldE9wdGlvbilcclxuICAgICAgICAgICAgcGFyZW50LnNldE9wdGlvbihuYW1lLCB2YWx1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VJbmxpbmVPcHRpb25zKHBhcmVudCkge1xyXG4gICAgICAgIGlmIChza2lwKFwiW1wiLCB0cnVlKSkge1xyXG4gICAgICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgICAgICBwYXJzZU9wdGlvbihwYXJlbnQsIFwib3B0aW9uXCIpO1xyXG4gICAgICAgICAgICB9IHdoaWxlIChza2lwKFwiLFwiLCB0cnVlKSk7XHJcbiAgICAgICAgICAgIHNraXAoXCJdXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcGFyZW50O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlU2VydmljZShwYXJlbnQsIHRva2VuKSB7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghbmFtZVJlLnRlc3QodG9rZW4gPSBuZXh0KCkpKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuLCBcInNlcnZpY2UgbmFtZVwiKTtcclxuXHJcbiAgICAgICAgdmFyIHNlcnZpY2UgPSBuZXcgU2VydmljZSh0b2tlbik7XHJcbiAgICAgICAgaWZCbG9jayhzZXJ2aWNlLCBmdW5jdGlvbiBwYXJzZVNlcnZpY2VfYmxvY2sodG9rZW4pIHtcclxuICAgICAgICAgICAgaWYgKHBhcnNlQ29tbW9uKHNlcnZpY2UsIHRva2VuKSlcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgIGlmICh0b2tlbiA9PT0gXCJycGNcIilcclxuICAgICAgICAgICAgICAgIHBhcnNlTWV0aG9kKHNlcnZpY2UsIHRva2VuKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbik7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcGFyZW50LmFkZChzZXJ2aWNlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZU1ldGhvZChwYXJlbnQsIHRva2VuKSB7XHJcbiAgICAgICAgdmFyIHR5cGUgPSB0b2tlbjtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCFuYW1lUmUudGVzdCh0b2tlbiA9IG5leHQoKSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4sIFwibmFtZVwiKTtcclxuXHJcbiAgICAgICAgdmFyIG5hbWUgPSB0b2tlbixcclxuICAgICAgICAgICAgcmVxdWVzdFR5cGUsIHJlcXVlc3RTdHJlYW0sXHJcbiAgICAgICAgICAgIHJlc3BvbnNlVHlwZSwgcmVzcG9uc2VTdHJlYW07XHJcblxyXG4gICAgICAgIHNraXAoXCIoXCIpO1xyXG4gICAgICAgIGlmIChza2lwKFwic3RyZWFtXCIsIHRydWUpKVxyXG4gICAgICAgICAgICByZXF1ZXN0U3RyZWFtID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCF0eXBlUmVmUmUudGVzdCh0b2tlbiA9IG5leHQoKSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG5cclxuICAgICAgICByZXF1ZXN0VHlwZSA9IHRva2VuO1xyXG4gICAgICAgIHNraXAoXCIpXCIpOyBza2lwKFwicmV0dXJuc1wiKTsgc2tpcChcIihcIik7XHJcbiAgICAgICAgaWYgKHNraXAoXCJzdHJlYW1cIiwgdHJ1ZSkpXHJcbiAgICAgICAgICAgIHJlc3BvbnNlU3RyZWFtID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCF0eXBlUmVmUmUudGVzdCh0b2tlbiA9IG5leHQoKSkpXHJcbiAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG5cclxuICAgICAgICByZXNwb25zZVR5cGUgPSB0b2tlbjtcclxuICAgICAgICBza2lwKFwiKVwiKTtcclxuXHJcbiAgICAgICAgdmFyIG1ldGhvZCA9IG5ldyBNZXRob2QobmFtZSwgdHlwZSwgcmVxdWVzdFR5cGUsIHJlc3BvbnNlVHlwZSwgcmVxdWVzdFN0cmVhbSwgcmVzcG9uc2VTdHJlYW0pO1xyXG4gICAgICAgIGlmQmxvY2sobWV0aG9kLCBmdW5jdGlvbiBwYXJzZU1ldGhvZF9ibG9jayh0b2tlbikge1xyXG5cclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgaWYgKHRva2VuID09PSBcIm9wdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJzZU9wdGlvbihtZXRob2QsIHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHNraXAoXCI7XCIpO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG5cclxuICAgICAgICB9KTtcclxuICAgICAgICBwYXJlbnQuYWRkKG1ldGhvZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VFeHRlbnNpb24ocGFyZW50LCB0b2tlbikge1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIXR5cGVSZWZSZS50ZXN0KHRva2VuID0gbmV4dCgpKSlcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbiwgXCJyZWZlcmVuY2VcIik7XHJcblxyXG4gICAgICAgIHZhciByZWZlcmVuY2UgPSB0b2tlbjtcclxuICAgICAgICBpZkJsb2NrKG51bGwsIGZ1bmN0aW9uIHBhcnNlRXh0ZW5zaW9uX2Jsb2NrKHRva2VuKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW4pIHtcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVxdWlyZWRcIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJyZXBlYXRlZFwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIm9wdGlvbmFsXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VGaWVsZChwYXJlbnQsIHRva2VuLCByZWZlcmVuY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc1Byb3RvMyB8fCAhdHlwZVJlZlJlLnRlc3QodG9rZW4pKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTtcclxuICAgICAgICAgICAgICAgICAgICBwdXNoKHRva2VuKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZUZpZWxkKHBhcmVudCwgXCJvcHRpb25hbFwiLCByZWZlcmVuY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHRva2VuO1xyXG4gICAgd2hpbGUgKCh0b2tlbiA9IG5leHQoKSkgIT09IG51bGwpIHtcclxuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFwicGFja2FnZVwiOlxyXG5cclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICAgICAgaWYgKCFoZWFkKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG5cclxuICAgICAgICAgICAgICAgIHBhcnNlUGFja2FnZSgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiaW1wb3J0XCI6XHJcblxyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgICAgICBpZiAoIWhlYWQpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbCh0b2tlbik7XHJcblxyXG4gICAgICAgICAgICAgICAgcGFyc2VJbXBvcnQoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcInN5bnRheFwiOlxyXG5cclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICAgICAgaWYgKCFoZWFkKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG5cclxuICAgICAgICAgICAgICAgIHBhcnNlU3ludGF4KCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJvcHRpb25cIjpcclxuXHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICAgICAgICAgIGlmICghaGVhZClcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKHRva2VuKTtcclxuXHJcbiAgICAgICAgICAgICAgICBwYXJzZU9wdGlvbihwdHIsIHRva2VuKTtcclxuICAgICAgICAgICAgICAgIHNraXAoXCI7XCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG5cclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VDb21tb24ocHRyLCB0b2tlbikpIHtcclxuICAgICAgICAgICAgICAgICAgICBoZWFkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwodG9rZW4pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwYXJzZS5maWxlbmFtZSA9IG51bGw7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIFwicGFja2FnZVwiICAgICA6IHBrZyxcclxuICAgICAgICBcImltcG9ydHNcIiAgICAgOiBpbXBvcnRzLFxyXG4gICAgICAgICB3ZWFrSW1wb3J0cyAgOiB3ZWFrSW1wb3J0cyxcclxuICAgICAgICAgc3ludGF4ICAgICAgIDogc3ludGF4LFxyXG4gICAgICAgICByb290ICAgICAgICAgOiByb290XHJcbiAgICB9O1xyXG59XHJcblxyXG4vKipcclxuICogUGFyc2VzIHRoZSBnaXZlbiAucHJvdG8gc291cmNlIGFuZCByZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBwYXJzZWQgY29udGVudHMuXHJcbiAqIEBuYW1lIHBhcnNlXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc291cmNlIFNvdXJjZSBjb250ZW50c1xyXG4gKiBAcGFyYW0ge1BhcnNlT3B0aW9uc30gW29wdGlvbnNdIFBhcnNlIG9wdGlvbnMuIERlZmF1bHRzIHRvIHtAbGluayBwYXJzZS5kZWZhdWx0c30gd2hlbiBvbWl0dGVkLlxyXG4gKiBAcmV0dXJucyB7UGFyc2VyUmVzdWx0fSBQYXJzZXIgcmVzdWx0XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBmaWxlbmFtZT1udWxsIEN1cnJlbnRseSBwcm9jZXNzaW5nIGZpbGUgbmFtZSBmb3IgZXJyb3IgcmVwb3J0aW5nLCBpZiBrbm93blxyXG4gKiBAcHJvcGVydHkge1BhcnNlT3B0aW9uc30gZGVmYXVsdHMgRGVmYXVsdCB7QGxpbmsgUGFyc2VPcHRpb25zfVxyXG4gKiBAdmFyaWF0aW9uIDJcclxuICovXHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRlcjtcclxuXHJcbnZhciB1dGlsICAgICAgPSByZXF1aXJlKFwiLi91dGlsL21pbmltYWxcIik7XHJcblxyXG52YXIgQnVmZmVyUmVhZGVyOyAvLyBjeWNsaWNcclxuXHJcbnZhciBMb25nQml0cyAgPSB1dGlsLkxvbmdCaXRzLFxyXG4gICAgdXRmOCAgICAgID0gdXRpbC51dGY4O1xyXG5cclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZnVuY3Rpb24gaW5kZXhPdXRPZlJhbmdlKHJlYWRlciwgd3JpdGVMZW5ndGgpIHtcclxuICAgIHJldHVybiBSYW5nZUVycm9yKFwiaW5kZXggb3V0IG9mIHJhbmdlOiBcIiArIHJlYWRlci5wb3MgKyBcIiArIFwiICsgKHdyaXRlTGVuZ3RoIHx8IDEpICsgXCIgPiBcIiArIHJlYWRlci5sZW4pO1xyXG59XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyByZWFkZXIgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBidWZmZXIuXHJcbiAqIEBjbGFzc2Rlc2MgV2lyZSBmb3JtYXQgcmVhZGVyIHVzaW5nIGBVaW50OEFycmF5YCBpZiBhdmFpbGFibGUsIG90aGVyd2lzZSBgQXJyYXlgLlxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWZmZXIgQnVmZmVyIHRvIHJlYWQgZnJvbVxyXG4gKi9cclxuZnVuY3Rpb24gUmVhZGVyKGJ1ZmZlcikge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCBidWZmZXIuXHJcbiAgICAgKiBAdHlwZSB7VWludDhBcnJheX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5idWYgPSBidWZmZXI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIGJ1ZmZlciBwb3NpdGlvbi5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMucG9zID0gMDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgYnVmZmVyIGxlbmd0aC5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubGVuID0gYnVmZmVyLmxlbmd0aDtcclxufVxyXG5cclxudmFyIGNyZWF0ZV9hcnJheSA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSBcInVuZGVmaW5lZFwiXHJcbiAgICA/IGZ1bmN0aW9uIGNyZWF0ZV90eXBlZF9hcnJheShidWZmZXIpIHtcclxuICAgICAgICBpZiAoYnVmZmVyIGluc3RhbmNlb2YgVWludDhBcnJheSB8fCBBcnJheS5pc0FycmF5KGJ1ZmZlcikpXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmVhZGVyKGJ1ZmZlcik7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJpbGxlZ2FsIGJ1ZmZlclwiKTtcclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICA6IGZ1bmN0aW9uIGNyZWF0ZV9hcnJheShidWZmZXIpIHtcclxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShidWZmZXIpKVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlYWRlcihidWZmZXIpO1xyXG4gICAgICAgIHRocm93IEVycm9yKFwiaWxsZWdhbCBidWZmZXJcIik7XHJcbiAgICB9O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgcmVhZGVyIHVzaW5nIHRoZSBzcGVjaWZpZWQgYnVmZmVyLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtVaW50OEFycmF5fEJ1ZmZlcn0gYnVmZmVyIEJ1ZmZlciB0byByZWFkIGZyb21cclxuICogQHJldHVybnMge1JlYWRlcnxCdWZmZXJSZWFkZXJ9IEEge0BsaW5rIEJ1ZmZlclJlYWRlcn0gaWYgYGJ1ZmZlcmAgaXMgYSBCdWZmZXIsIG90aGVyd2lzZSBhIHtAbGluayBSZWFkZXJ9XHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiBgYnVmZmVyYCBpcyBub3QgYSB2YWxpZCBidWZmZXJcclxuICovXHJcblJlYWRlci5jcmVhdGUgPSB1dGlsLkJ1ZmZlclxyXG4gICAgPyBmdW5jdGlvbiBjcmVhdGVfYnVmZmVyX3NldHVwKGJ1ZmZlcikge1xyXG4gICAgICAgIHJldHVybiAoUmVhZGVyLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZV9idWZmZXIoYnVmZmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB1dGlsLkJ1ZmZlci5pc0J1ZmZlcihidWZmZXIpXHJcbiAgICAgICAgICAgICAgICA/IG5ldyBCdWZmZXJSZWFkZXIoYnVmZmVyKVxyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgICAgIDogY3JlYXRlX2FycmF5KGJ1ZmZlcik7XHJcbiAgICAgICAgfSkoYnVmZmVyKTtcclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICA6IGNyZWF0ZV9hcnJheTtcclxuXHJcblJlYWRlci5wcm90b3R5cGUuX3NsaWNlID0gdXRpbC5BcnJheS5wcm90b3R5cGUuc3ViYXJyYXkgfHwgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gdXRpbC5BcnJheS5wcm90b3R5cGUuc2xpY2U7XHJcblxyXG4vKipcclxuICogUmVhZHMgYSB2YXJpbnQgYXMgYW4gdW5zaWduZWQgMzIgYml0IHZhbHVlLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS51aW50MzIgPSAoZnVuY3Rpb24gcmVhZF91aW50MzJfc2V0dXAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSA0Mjk0OTY3Mjk1OyAvLyBvcHRpbWl6ZXIgdHlwZS1oaW50LCB0ZW5kcyB0byBkZW9wdCBvdGhlcndpc2UgKD8hKVxyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHJlYWRfdWludDMyKCkge1xyXG4gICAgICAgIHZhbHVlID0gKCAgICAgICAgIHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNyAgICAgICApID4+PiAwOyBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB2YWx1ZSA9ICh2YWx1ZSB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpIDw8ICA3KSA+Pj4gMDsgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KSByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgdmFsdWUgPSAodmFsdWUgfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA8PCAxNCkgPj4+IDA7IGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOCkgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIHZhbHVlID0gKHZhbHVlIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgMjEpID4+PiAwOyBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB2YWx1ZSA9ICh2YWx1ZSB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAgMTUpIDw8IDI4KSA+Pj4gMDsgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KSByZXR1cm4gdmFsdWU7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICgodGhpcy5wb3MgKz0gNSkgPiB0aGlzLmxlbikge1xyXG4gICAgICAgICAgICB0aGlzLnBvcyA9IHRoaXMubGVuO1xyXG4gICAgICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgMTApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9O1xyXG59KSgpO1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgdmFyaW50IGFzIGEgc2lnbmVkIDMyIGJpdCB2YWx1ZS5cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5pbnQzMiA9IGZ1bmN0aW9uIHJlYWRfaW50MzIoKSB7XHJcbiAgICByZXR1cm4gdGhpcy51aW50MzIoKSB8IDA7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVhZHMgYSB6aWctemFnIGVuY29kZWQgdmFyaW50IGFzIGEgc2lnbmVkIDMyIGJpdCB2YWx1ZS5cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5zaW50MzIgPSBmdW5jdGlvbiByZWFkX3NpbnQzMigpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMudWludDMyKCk7XHJcbiAgICByZXR1cm4gdmFsdWUgPj4+IDEgXiAtKHZhbHVlICYgMSkgfCAwO1xyXG59O1xyXG5cclxuLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzICovXHJcblxyXG5mdW5jdGlvbiByZWFkTG9uZ1ZhcmludCgpIHtcclxuICAgIC8vIHRlbmRzIHRvIGRlb3B0IHdpdGggbG9jYWwgdmFycyBmb3Igb2N0ZXQgZXRjLlxyXG4gICAgdmFyIGJpdHMgPSBuZXcgTG9uZ0JpdHMoMCwgMCk7XHJcbiAgICB2YXIgaSA9IDA7XHJcbiAgICBpZiAodGhpcy5sZW4gLSB0aGlzLnBvcyA+IDQpIHsgLy8gZmFzdCByb3V0ZSAobG8pXHJcbiAgICAgICAgZm9yICg7IGkgPCA0OyArK2kpIHtcclxuICAgICAgICAgICAgLy8gMXN0Li40dGhcclxuICAgICAgICAgICAgYml0cy5sbyA9IChiaXRzLmxvIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgaSAqIDcpID4+PiAwO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYml0cztcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gNXRoXHJcbiAgICAgICAgYml0cy5sbyA9IChiaXRzLmxvIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgMjgpID4+PiAwO1xyXG4gICAgICAgIGJpdHMuaGkgPSAoYml0cy5oaSB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpID4+ICA0KSA+Pj4gMDtcclxuICAgICAgICBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpXHJcbiAgICAgICAgICAgIHJldHVybiBiaXRzO1xyXG4gICAgICAgIGkgPSAwO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBmb3IgKDsgaSA8IDM7ICsraSkge1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMubGVuKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMpO1xyXG4gICAgICAgICAgICAvLyAxc3QuLjN0aFxyXG4gICAgICAgICAgICBiaXRzLmxvID0gKGJpdHMubG8gfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA8PCBpICogNykgPj4+IDA7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOClcclxuICAgICAgICAgICAgICAgIHJldHVybiBiaXRzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyA0dGhcclxuICAgICAgICBiaXRzLmxvID0gKGJpdHMubG8gfCAodGhpcy5idWZbdGhpcy5wb3MrK10gJiAxMjcpIDw8IGkgKiA3KSA+Pj4gMDtcclxuICAgICAgICByZXR1cm4gYml0cztcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmxlbiAtIHRoaXMucG9zID4gNCkgeyAvLyBmYXN0IHJvdXRlIChoaSlcclxuICAgICAgICBmb3IgKDsgaSA8IDU7ICsraSkge1xyXG4gICAgICAgICAgICAvLyA2dGguLjEwdGhcclxuICAgICAgICAgICAgYml0cy5oaSA9IChiaXRzLmhpIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgaSAqIDcgKyAzKSA+Pj4gMDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJpdHM7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBmb3IgKDsgaSA8IDU7ICsraSkge1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMubGVuKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMpO1xyXG4gICAgICAgICAgICAvLyA2dGguLjEwdGhcclxuICAgICAgICAgICAgYml0cy5oaSA9IChiaXRzLmhpIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgaSAqIDcgKyAzKSA+Pj4gMDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJpdHM7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIHRocm93IEVycm9yKFwiaW52YWxpZCB2YXJpbnQgZW5jb2RpbmdcIik7XHJcbn1cclxuXHJcbi8qIGVzbGludC1lbmFibGUgbm8taW52YWxpZC10aGlzICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSB2YXJpbnQgYXMgYSBzaWduZWQgNjQgYml0IHZhbHVlLlxyXG4gKiBAbmFtZSBSZWFkZXIjaW50NjRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtMb25nfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgdmFyaW50IGFzIGFuIHVuc2lnbmVkIDY0IGJpdCB2YWx1ZS5cclxuICogQG5hbWUgUmVhZGVyI3VpbnQ2NFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0xvbmd9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSB6aWctemFnIGVuY29kZWQgdmFyaW50IGFzIGEgc2lnbmVkIDY0IGJpdCB2YWx1ZS5cclxuICogQG5hbWUgUmVhZGVyI3NpbnQ2NFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0xvbmd9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSB2YXJpbnQgYXMgYSBib29sZWFuLlxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5ib29sID0gZnVuY3Rpb24gcmVhZF9ib29sKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudWludDMyKCkgIT09IDA7XHJcbn07XHJcblxyXG5mdW5jdGlvbiByZWFkRml4ZWQzMl9lbmQoYnVmLCBlbmQpIHsgLy8gbm90ZSB0aGF0IHRoaXMgdXNlcyBgZW5kYCwgbm90IGBwb3NgXHJcbiAgICByZXR1cm4gKGJ1ZltlbmQgLSA0XVxyXG4gICAgICAgICAgfCBidWZbZW5kIC0gM10gPDwgOFxyXG4gICAgICAgICAgfCBidWZbZW5kIC0gMl0gPDwgMTZcclxuICAgICAgICAgIHwgYnVmW2VuZCAtIDFdIDw8IDI0KSA+Pj4gMDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGZpeGVkIDMyIGJpdHMgYXMgYW4gdW5zaWduZWQgMzIgYml0IGludGVnZXIuXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuZml4ZWQzMiA9IGZ1bmN0aW9uIHJlYWRfZml4ZWQzMigpIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICh0aGlzLnBvcyArIDQgPiB0aGlzLmxlbilcclxuICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgNCk7XHJcblxyXG4gICAgcmV0dXJuIHJlYWRGaXhlZDMyX2VuZCh0aGlzLmJ1ZiwgdGhpcy5wb3MgKz0gNCk7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVhZHMgZml4ZWQgMzIgYml0cyBhcyBhIHNpZ25lZCAzMiBiaXQgaW50ZWdlci5cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5zZml4ZWQzMiA9IGZ1bmN0aW9uIHJlYWRfc2ZpeGVkMzIoKSB7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAodGhpcy5wb3MgKyA0ID4gdGhpcy5sZW4pXHJcbiAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIDQpO1xyXG5cclxuICAgIHJldHVybiByZWFkRml4ZWQzMl9lbmQodGhpcy5idWYsIHRoaXMucG9zICs9IDQpIHwgMDtcclxufTtcclxuXHJcbi8qIGVzbGludC1kaXNhYmxlIG5vLWludmFsaWQtdGhpcyAqL1xyXG5cclxuZnVuY3Rpb24gcmVhZEZpeGVkNjQoLyogdGhpczogUmVhZGVyICovKSB7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAodGhpcy5wb3MgKyA4ID4gdGhpcy5sZW4pXHJcbiAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIDgpO1xyXG5cclxuICAgIHJldHVybiBuZXcgTG9uZ0JpdHMocmVhZEZpeGVkMzJfZW5kKHRoaXMuYnVmLCB0aGlzLnBvcyArPSA0KSwgcmVhZEZpeGVkMzJfZW5kKHRoaXMuYnVmLCB0aGlzLnBvcyArPSA0KSk7XHJcbn1cclxuXHJcbi8qIGVzbGludC1lbmFibGUgbm8taW52YWxpZC10aGlzICovXHJcblxyXG4vKipcclxuICogUmVhZHMgZml4ZWQgNjQgYml0cy5cclxuICogQG5hbWUgUmVhZGVyI2ZpeGVkNjRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtMb25nfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIHppZy16YWcgZW5jb2RlZCBmaXhlZCA2NCBiaXRzLlxyXG4gKiBAbmFtZSBSZWFkZXIjc2ZpeGVkNjRcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtMb25nfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgZmxvYXQgKDMyIGJpdCkgYXMgYSBudW1iZXIuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLmZsb2F0ID0gZnVuY3Rpb24gcmVhZF9mbG9hdCgpIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICh0aGlzLnBvcyArIDQgPiB0aGlzLmxlbilcclxuICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgNCk7XHJcblxyXG4gICAgdmFyIHZhbHVlID0gdXRpbC5mbG9hdC5yZWFkRmxvYXRMRSh0aGlzLmJ1ZiwgdGhpcy5wb3MpO1xyXG4gICAgdGhpcy5wb3MgKz0gNDtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIGRvdWJsZSAoNjQgYml0IGZsb2F0KSBhcyBhIG51bWJlci5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuZG91YmxlID0gZnVuY3Rpb24gcmVhZF9kb3VibGUoKSB7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAodGhpcy5wb3MgKyA4ID4gdGhpcy5sZW4pXHJcbiAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIDQpO1xyXG5cclxuICAgIHZhciB2YWx1ZSA9IHV0aWwuZmxvYXQucmVhZERvdWJsZUxFKHRoaXMuYnVmLCB0aGlzLnBvcyk7XHJcbiAgICB0aGlzLnBvcyArPSA4O1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgc2VxdWVuY2Ugb2YgYnl0ZXMgcHJlY2VlZGVkIGJ5IGl0cyBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLmJ5dGVzID0gZnVuY3Rpb24gcmVhZF9ieXRlcygpIHtcclxuICAgIHZhciBsZW5ndGggPSB0aGlzLnVpbnQzMigpLFxyXG4gICAgICAgIHN0YXJ0ICA9IHRoaXMucG9zLFxyXG4gICAgICAgIGVuZCAgICA9IHRoaXMucG9zICsgbGVuZ3RoO1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKGVuZCA+IHRoaXMubGVuKVxyXG4gICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzLCBsZW5ndGgpO1xyXG5cclxuICAgIHRoaXMucG9zICs9IGxlbmd0aDtcclxuICAgIHJldHVybiBzdGFydCA9PT0gZW5kIC8vIGZpeCBmb3IgSUUgMTAvV2luOCBhbmQgb3RoZXJzJyBzdWJhcnJheSByZXR1cm5pbmcgYXJyYXkgb2Ygc2l6ZSAxXHJcbiAgICAgICAgPyBuZXcgdGhpcy5idWYuY29uc3RydWN0b3IoMClcclxuICAgICAgICA6IHRoaXMuX3NsaWNlLmNhbGwodGhpcy5idWYsIHN0YXJ0LCBlbmQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgc3RyaW5nIHByZWNlZWRlZCBieSBpdHMgYnl0ZSBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuc3RyaW5nID0gZnVuY3Rpb24gcmVhZF9zdHJpbmcoKSB7XHJcbiAgICB2YXIgYnl0ZXMgPSB0aGlzLmJ5dGVzKCk7XHJcbiAgICByZXR1cm4gdXRmOC5yZWFkKGJ5dGVzLCAwLCBieXRlcy5sZW5ndGgpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNraXBzIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGJ5dGVzIGlmIHNwZWNpZmllZCwgb3RoZXJ3aXNlIHNraXBzIGEgdmFyaW50LlxyXG4gKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTGVuZ3RoIGlmIGtub3duLCBvdGhlcndpc2UgYSB2YXJpbnQgaXMgYXNzdW1lZFxyXG4gKiBAcmV0dXJucyB7UmVhZGVyfSBgdGhpc2BcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uIHNraXAobGVuZ3RoKSB7XHJcbiAgICBpZiAodHlwZW9mIGxlbmd0aCA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICh0aGlzLnBvcyArIGxlbmd0aCA+IHRoaXMubGVuKVxyXG4gICAgICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgbGVuZ3RoKTtcclxuICAgICAgICB0aGlzLnBvcyArPSBsZW5ndGg7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGRvIHtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmxlbilcclxuICAgICAgICAgICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzKTtcclxuICAgICAgICB9IHdoaWxlICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSAmIDEyOCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTa2lwcyB0aGUgbmV4dCBlbGVtZW50IG9mIHRoZSBzcGVjaWZpZWQgd2lyZSB0eXBlLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gd2lyZVR5cGUgV2lyZSB0eXBlIHJlY2VpdmVkXHJcbiAqIEByZXR1cm5zIHtSZWFkZXJ9IGB0aGlzYFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5za2lwVHlwZSA9IGZ1bmN0aW9uKHdpcmVUeXBlKSB7XHJcbiAgICBzd2l0Y2ggKHdpcmVUeXBlKSB7XHJcbiAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICB0aGlzLnNraXAoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLnNraXAoOCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgdGhpcy5za2lwKHRoaXMudWludDMyKCkpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgIGRvIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zdGFudC1jb25kaXRpb25cclxuICAgICAgICAgICAgICAgIGlmICgod2lyZVR5cGUgPSB0aGlzLnVpbnQzMigpICYgNykgPT09IDQpXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNraXBUeXBlKHdpcmVUeXBlKTtcclxuICAgICAgICAgICAgfSB3aGlsZSAodHJ1ZSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgNTpcclxuICAgICAgICAgICAgdGhpcy5za2lwKDQpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcImludmFsaWQgd2lyZSB0eXBlIFwiICsgd2lyZVR5cGUgKyBcIiBhdCBvZmZzZXQgXCIgKyB0aGlzLnBvcyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcblJlYWRlci5fY29uZmlndXJlID0gZnVuY3Rpb24oQnVmZmVyUmVhZGVyXykge1xyXG4gICAgQnVmZmVyUmVhZGVyID0gQnVmZmVyUmVhZGVyXztcclxuXHJcbiAgICB2YXIgZm4gPSB1dGlsLkxvbmcgPyBcInRvTG9uZ1wiIDogLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gXCJ0b051bWJlclwiO1xyXG4gICAgdXRpbC5tZXJnZShSZWFkZXIucHJvdG90eXBlLCB7XHJcblxyXG4gICAgICAgIGludDY0OiBmdW5jdGlvbiByZWFkX2ludDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZExvbmdWYXJpbnQuY2FsbCh0aGlzKVtmbl0oZmFsc2UpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHVpbnQ2NDogZnVuY3Rpb24gcmVhZF91aW50NjQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZWFkTG9uZ1ZhcmludC5jYWxsKHRoaXMpW2ZuXSh0cnVlKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzaW50NjQ6IGZ1bmN0aW9uIHJlYWRfc2ludDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZExvbmdWYXJpbnQuY2FsbCh0aGlzKS56ekRlY29kZSgpW2ZuXShmYWxzZSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZml4ZWQ2NDogZnVuY3Rpb24gcmVhZF9maXhlZDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZEZpeGVkNjQuY2FsbCh0aGlzKVtmbl0odHJ1ZSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2ZpeGVkNjQ6IGZ1bmN0aW9uIHJlYWRfc2ZpeGVkNjQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZWFkRml4ZWQ2NC5jYWxsKHRoaXMpW2ZuXShmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXJSZWFkZXI7XHJcblxyXG4vLyBleHRlbmRzIFJlYWRlclxyXG52YXIgUmVhZGVyID0gcmVxdWlyZShcIi4vcmVhZGVyXCIpO1xyXG4oQnVmZmVyUmVhZGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUmVhZGVyLnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gQnVmZmVyUmVhZGVyO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi91dGlsL21pbmltYWxcIik7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBidWZmZXIgcmVhZGVyIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFdpcmUgZm9ybWF0IHJlYWRlciB1c2luZyBub2RlIGJ1ZmZlcnMuXHJcbiAqIEBleHRlbmRzIFJlYWRlclxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtCdWZmZXJ9IGJ1ZmZlciBCdWZmZXIgdG8gcmVhZCBmcm9tXHJcbiAqL1xyXG5mdW5jdGlvbiBCdWZmZXJSZWFkZXIoYnVmZmVyKSB7XHJcbiAgICBSZWFkZXIuY2FsbCh0aGlzLCBidWZmZXIpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCBidWZmZXIuXHJcbiAgICAgKiBAbmFtZSBCdWZmZXJSZWFkZXIjYnVmXHJcbiAgICAgKiBAdHlwZSB7QnVmZmVyfVxyXG4gICAgICovXHJcbn1cclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbmlmICh1dGlsLkJ1ZmZlcilcclxuICAgIEJ1ZmZlclJlYWRlci5wcm90b3R5cGUuX3NsaWNlID0gdXRpbC5CdWZmZXIucHJvdG90eXBlLnNsaWNlO1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuQnVmZmVyUmVhZGVyLnByb3RvdHlwZS5zdHJpbmcgPSBmdW5jdGlvbiByZWFkX3N0cmluZ19idWZmZXIoKSB7XHJcbiAgICB2YXIgbGVuID0gdGhpcy51aW50MzIoKTsgLy8gbW9kaWZpZXMgcG9zXHJcbiAgICByZXR1cm4gdGhpcy5idWYudXRmOFNsaWNlKHRoaXMucG9zLCB0aGlzLnBvcyA9IE1hdGgubWluKHRoaXMucG9zICsgbGVuLCB0aGlzLmxlbikpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgc2VxdWVuY2Ugb2YgYnl0ZXMgcHJlY2VlZGVkIGJ5IGl0cyBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEBuYW1lIEJ1ZmZlclJlYWRlciNieXRlc1xyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0J1ZmZlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gUm9vdDtcclxuXHJcbi8vIGV4dGVuZHMgTmFtZXNwYWNlXHJcbnZhciBOYW1lc3BhY2UgPSByZXF1aXJlKFwiLi9uYW1lc3BhY2VcIik7XHJcbigoUm9vdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE5hbWVzcGFjZS5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IFJvb3QpLmNsYXNzTmFtZSA9IFwiUm9vdFwiO1xyXG5cclxudmFyIEZpZWxkICAgPSByZXF1aXJlKFwiLi9maWVsZFwiKSxcclxuICAgIEVudW0gICAgPSByZXF1aXJlKFwiLi9lbnVtXCIpLFxyXG4gICAgdXRpbCAgICA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG52YXIgVHlwZSwgICAvLyBjeWNsaWNcclxuICAgIHBhcnNlLCAgLy8gbWlnaHQgYmUgZXhjbHVkZWRcclxuICAgIGNvbW1vbjsgLy8gXCJcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHJvb3QgbmFtZXNwYWNlIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFJvb3QgbmFtZXNwYWNlIHdyYXBwaW5nIGFsbCB0eXBlcywgZW51bXMsIHNlcnZpY2VzLCBzdWItbmFtZXNwYWNlcyBldGMuIHRoYXQgYmVsb25nIHRvZ2V0aGVyLlxyXG4gKiBAZXh0ZW5kcyBOYW1lc3BhY2VCYXNlXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gVG9wIGxldmVsIG9wdGlvbnNcclxuICovXHJcbmZ1bmN0aW9uIFJvb3Qob3B0aW9ucykge1xyXG4gICAgTmFtZXNwYWNlLmNhbGwodGhpcywgXCJcIiwgb3B0aW9ucyk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZlcnJlZCBleHRlbnNpb24gZmllbGRzLlxyXG4gICAgICogQHR5cGUge0ZpZWxkW119XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZGVmZXJyZWQgPSBbXTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlc29sdmVkIGZpbGUgbmFtZXMgb2YgbG9hZGVkIGZpbGVzLlxyXG4gICAgICogQHR5cGUge3N0cmluZ1tdfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmZpbGVzID0gW107XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMb2FkcyBhIG5hbWVzcGFjZSBkZXNjcmlwdG9yIGludG8gYSByb290IG5hbWVzcGFjZS5cclxuICogQHBhcmFtIHtOYW1lc3BhY2VEZXNjcmlwdG9yfSBqc29uIE5hbWVlc3BhY2UgZGVzY3JpcHRvclxyXG4gKiBAcGFyYW0ge1Jvb3R9IFtyb290XSBSb290IG5hbWVzcGFjZSwgZGVmYXVsdHMgdG8gY3JlYXRlIGEgbmV3IG9uZSBpZiBvbWl0dGVkXHJcbiAqIEByZXR1cm5zIHtSb290fSBSb290IG5hbWVzcGFjZVxyXG4gKi9cclxuUm9vdC5mcm9tSlNPTiA9IGZ1bmN0aW9uIGZyb21KU09OKGpzb24sIHJvb3QpIHtcclxuICAgIGlmICghcm9vdClcclxuICAgICAgICByb290ID0gbmV3IFJvb3QoKTtcclxuICAgIGlmIChqc29uLm9wdGlvbnMpXHJcbiAgICAgICAgcm9vdC5zZXRPcHRpb25zKGpzb24ub3B0aW9ucyk7XHJcbiAgICByZXR1cm4gcm9vdC5hZGRKU09OKGpzb24ubmVzdGVkKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNvbHZlcyB0aGUgcGF0aCBvZiBhbiBpbXBvcnRlZCBmaWxlLCByZWxhdGl2ZSB0byB0aGUgaW1wb3J0aW5nIG9yaWdpbi5cclxuICogVGhpcyBtZXRob2QgZXhpc3RzIHNvIHlvdSBjYW4gb3ZlcnJpZGUgaXQgd2l0aCB5b3VyIG93biBsb2dpYyBpbiBjYXNlIHlvdXIgaW1wb3J0cyBhcmUgc2NhdHRlcmVkIG92ZXIgbXVsdGlwbGUgZGlyZWN0b3JpZXMuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge3N0cmluZ30gb3JpZ2luIFRoZSBmaWxlIG5hbWUgb2YgdGhlIGltcG9ydGluZyBmaWxlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXQgVGhlIGZpbGUgbmFtZSBiZWluZyBpbXBvcnRlZFxyXG4gKiBAcmV0dXJucyB7P3N0cmluZ30gUmVzb2x2ZWQgcGF0aCB0byBgdGFyZ2V0YCBvciBgbnVsbGAgdG8gc2tpcCB0aGUgZmlsZVxyXG4gKi9cclxuUm9vdC5wcm90b3R5cGUucmVzb2x2ZVBhdGggPSB1dGlsLnBhdGgucmVzb2x2ZTtcclxuXHJcbi8vIEEgc3ltYm9sLWxpa2UgZnVuY3Rpb24gdG8gc2FmZWx5IHNpZ25hbCBzeW5jaHJvbm91cyBsb2FkaW5nXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmZ1bmN0aW9uIFNZTkMoKSB7fSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5LWZ1bmN0aW9uXHJcblxyXG4vKipcclxuICogTG9hZHMgb25lIG9yIG11bHRpcGxlIC5wcm90byBvciBwcmVwcm9jZXNzZWQgLmpzb24gZmlsZXMgaW50byB0aGlzIHJvb3QgbmFtZXNwYWNlIGFuZCBjYWxscyB0aGUgY2FsbGJhY2suXHJcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBmaWxlbmFtZSBOYW1lcyBvZiBvbmUgb3IgbXVsdGlwbGUgZmlsZXMgdG8gbG9hZFxyXG4gKiBAcGFyYW0ge1BhcnNlT3B0aW9uc30gb3B0aW9ucyBQYXJzZSBvcHRpb25zXHJcbiAqIEBwYXJhbSB7TG9hZENhbGxiYWNrfSBjYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuUm9vdC5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uIGxvYWQoZmlsZW5hbWUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcclxuICAgICAgICBvcHRpb25zID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgaWYgKCFjYWxsYmFjaylcclxuICAgICAgICByZXR1cm4gdXRpbC5hc1Byb21pc2UobG9hZCwgc2VsZiwgZmlsZW5hbWUsIG9wdGlvbnMpO1xyXG5cclxuICAgIHZhciBzeW5jID0gY2FsbGJhY2sgPT09IFNZTkM7IC8vIHVuZG9jdW1lbnRlZFxyXG5cclxuICAgIC8vIEZpbmlzaGVzIGxvYWRpbmcgYnkgY2FsbGluZyB0aGUgY2FsbGJhY2sgKGV4YWN0bHkgb25jZSlcclxuICAgIGZ1bmN0aW9uIGZpbmlzaChlcnIsIHJvb3QpIHtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAoIWNhbGxiYWNrKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgdmFyIGNiID0gY2FsbGJhY2s7XHJcbiAgICAgICAgY2FsbGJhY2sgPSBudWxsO1xyXG4gICAgICAgIGlmIChzeW5jKVxyXG4gICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgY2IoZXJyLCByb290KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQcm9jZXNzZXMgYSBzaW5nbGUgZmlsZVxyXG4gICAgZnVuY3Rpb24gcHJvY2VzcyhmaWxlbmFtZSwgc291cmNlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHV0aWwuaXNTdHJpbmcoc291cmNlKSAmJiBzb3VyY2UuY2hhckF0KDApID09PSBcIntcIilcclxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IEpTT04ucGFyc2Uoc291cmNlKTtcclxuICAgICAgICAgICAgaWYgKCF1dGlsLmlzU3RyaW5nKHNvdXJjZSkpXHJcbiAgICAgICAgICAgICAgICBzZWxmLnNldE9wdGlvbnMoc291cmNlLm9wdGlvbnMpLmFkZEpTT04oc291cmNlLm5lc3RlZCk7XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcGFyc2UuZmlsZW5hbWUgPSBmaWxlbmFtZTtcclxuICAgICAgICAgICAgICAgIHZhciBwYXJzZWQgPSBwYXJzZShzb3VyY2UsIHNlbGYsIG9wdGlvbnMpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIGkgPSAwO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlZC5pbXBvcnRzKVxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgcGFyc2VkLmltcG9ydHMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNvbHZlZCA9IHNlbGYucmVzb2x2ZVBhdGgoZmlsZW5hbWUsIHBhcnNlZC5pbXBvcnRzW2ldKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZldGNoKHJlc29sdmVkKTtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJzZWQud2Vha0ltcG9ydHMpXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhcnNlZC53ZWFrSW1wb3J0cy5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc29sdmVkID0gc2VsZi5yZXNvbHZlUGF0aChmaWxlbmFtZSwgcGFyc2VkLndlYWtJbXBvcnRzW2ldKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZldGNoKHJlc29sdmVkLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBmaW5pc2goZXJyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFzeW5jICYmICFxdWV1ZWQpXHJcbiAgICAgICAgICAgIGZpbmlzaChudWxsLCBzZWxmKTsgLy8gb25seSBvbmNlIGFueXdheVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEZldGNoZXMgYSBzaW5nbGUgZmlsZVxyXG4gICAgZnVuY3Rpb24gZmV0Y2goZmlsZW5hbWUsIHdlYWspIHtcclxuXHJcbiAgICAgICAgLy8gU3RyaXAgcGF0aCBpZiB0aGlzIGZpbGUgcmVmZXJlbmNlcyBhIGJ1bmRsZWQgZGVmaW5pdGlvblxyXG4gICAgICAgIHZhciBpZHggPSBmaWxlbmFtZS5sYXN0SW5kZXhPZihcImdvb2dsZS9wcm90b2J1Zi9cIik7XHJcbiAgICAgICAgaWYgKGlkeCA+IC0xKSB7XHJcbiAgICAgICAgICAgIHZhciBhbHRuYW1lID0gZmlsZW5hbWUuc3Vic3RyaW5nKGlkeCk7XHJcbiAgICAgICAgICAgIGlmIChhbHRuYW1lIGluIGNvbW1vbilcclxuICAgICAgICAgICAgICAgIGZpbGVuYW1lID0gYWx0bmFtZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNraXAgaWYgYWxyZWFkeSBsb2FkZWQgLyBhdHRlbXB0ZWRcclxuICAgICAgICBpZiAoc2VsZi5maWxlcy5pbmRleE9mKGZpbGVuYW1lKSA+IC0xKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgc2VsZi5maWxlcy5wdXNoKGZpbGVuYW1lKTtcclxuXHJcbiAgICAgICAgLy8gU2hvcnRjdXQgYnVuZGxlZCBkZWZpbml0aW9uc1xyXG4gICAgICAgIGlmIChmaWxlbmFtZSBpbiBjb21tb24pIHtcclxuICAgICAgICAgICAgaWYgKHN5bmMpXHJcbiAgICAgICAgICAgICAgICBwcm9jZXNzKGZpbGVuYW1lLCBjb21tb25bZmlsZW5hbWVdKTtcclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICArK3F1ZXVlZDtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLS1xdWV1ZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvY2VzcyhmaWxlbmFtZSwgY29tbW9uW2ZpbGVuYW1lXSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBPdGhlcndpc2UgZmV0Y2ggZnJvbSBkaXNrIG9yIG5ldHdvcmtcclxuICAgICAgICBpZiAoc3luYykge1xyXG4gICAgICAgICAgICB2YXIgc291cmNlO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgc291cmNlID0gdXRpbC5mcy5yZWFkRmlsZVN5bmMoZmlsZW5hbWUpLnRvU3RyaW5nKFwidXRmOFwiKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXdlYWspXHJcbiAgICAgICAgICAgICAgICAgICAgZmluaXNoKGVycik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcHJvY2VzcyhmaWxlbmFtZSwgc291cmNlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICArK3F1ZXVlZDtcclxuICAgICAgICAgICAgdXRpbC5mZXRjaChmaWxlbmFtZSwgZnVuY3Rpb24oZXJyLCBzb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgIC0tcXVldWVkO1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgICAgICBpZiAoIWNhbGxiYWNrKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjsgLy8gdGVybWluYXRlZCBtZWFud2hpbGVcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghd2VhaylcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoKGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoIXF1ZXVlZCkgLy8gY2FuJ3QgYmUgY292ZXJlZCByZWxpYWJseVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaW5pc2gobnVsbCwgc2VsZik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcHJvY2VzcyhmaWxlbmFtZSwgc291cmNlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdmFyIHF1ZXVlZCA9IDA7XHJcblxyXG4gICAgLy8gQXNzZW1ibGluZyB0aGUgcm9vdCBuYW1lc3BhY2UgZG9lc24ndCByZXF1aXJlIHdvcmtpbmcgdHlwZVxyXG4gICAgLy8gcmVmZXJlbmNlcyBhbnltb3JlLCBzbyB3ZSBjYW4gbG9hZCBldmVyeXRoaW5nIGluIHBhcmFsbGVsXHJcbiAgICBpZiAodXRpbC5pc1N0cmluZyhmaWxlbmFtZSkpXHJcbiAgICAgICAgZmlsZW5hbWUgPSBbIGZpbGVuYW1lIF07XHJcbiAgICBmb3IgKHZhciBpID0gMCwgcmVzb2x2ZWQ7IGkgPCBmaWxlbmFtZS5sZW5ndGg7ICsraSlcclxuICAgICAgICBpZiAocmVzb2x2ZWQgPSBzZWxmLnJlc29sdmVQYXRoKFwiXCIsIGZpbGVuYW1lW2ldKSlcclxuICAgICAgICAgICAgZmV0Y2gocmVzb2x2ZWQpO1xyXG5cclxuICAgIGlmIChzeW5jKVxyXG4gICAgICAgIHJldHVybiBzZWxmO1xyXG4gICAgaWYgKCFxdWV1ZWQpXHJcbiAgICAgICAgZmluaXNoKG51bGwsIHNlbGYpO1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxufTtcclxuLy8gZnVuY3Rpb24gbG9hZChmaWxlbmFtZTpzdHJpbmcsIG9wdGlvbnM6UGFyc2VPcHRpb25zLCBjYWxsYmFjazpMb2FkQ2FsbGJhY2spOnVuZGVmaW5lZFxyXG5cclxuLyoqXHJcbiAqIExvYWRzIG9uZSBvciBtdWx0aXBsZSAucHJvdG8gb3IgcHJlcHJvY2Vzc2VkIC5qc29uIGZpbGVzIGludG8gdGhpcyByb290IG5hbWVzcGFjZSBhbmQgY2FsbHMgdGhlIGNhbGxiYWNrLlxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gZmlsZW5hbWUgTmFtZXMgb2Ygb25lIG9yIG11bHRpcGxlIGZpbGVzIHRvIGxvYWRcclxuICogQHBhcmFtIHtMb2FkQ2FsbGJhY2t9IGNhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEB2YXJpYXRpb24gMlxyXG4gKi9cclxuLy8gZnVuY3Rpb24gbG9hZChmaWxlbmFtZTpzdHJpbmcsIGNhbGxiYWNrOkxvYWRDYWxsYmFjayk6dW5kZWZpbmVkXHJcblxyXG4vKipcclxuICogTG9hZHMgb25lIG9yIG11bHRpcGxlIC5wcm90byBvciBwcmVwcm9jZXNzZWQgLmpzb24gZmlsZXMgaW50byB0aGlzIHJvb3QgbmFtZXNwYWNlIGFuZCByZXR1cm5zIGEgcHJvbWlzZS5cclxuICogQG5hbWUgUm9vdCNsb2FkXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gZmlsZW5hbWUgTmFtZXMgb2Ygb25lIG9yIG11bHRpcGxlIGZpbGVzIHRvIGxvYWRcclxuICogQHBhcmFtIHtQYXJzZU9wdGlvbnN9IFtvcHRpb25zXSBQYXJzZSBvcHRpb25zLiBEZWZhdWx0cyB0byB7QGxpbmsgcGFyc2UuZGVmYXVsdHN9IHdoZW4gb21pdHRlZC5cclxuICogQHJldHVybnMge1Byb21pc2U8Um9vdD59IFByb21pc2VcclxuICogQHZhcmlhdGlvbiAzXHJcbiAqL1xyXG4vLyBmdW5jdGlvbiBsb2FkKGZpbGVuYW1lOnN0cmluZywgW29wdGlvbnM6UGFyc2VPcHRpb25zXSk6UHJvbWlzZTxSb290PlxyXG5cclxuLyoqXHJcbiAqIFN5bmNocm9ub3VzbHkgbG9hZHMgb25lIG9yIG11bHRpcGxlIC5wcm90byBvciBwcmVwcm9jZXNzZWQgLmpzb24gZmlsZXMgaW50byB0aGlzIHJvb3QgbmFtZXNwYWNlIChub2RlIG9ubHkpLlxyXG4gKiBAbmFtZSBSb290I2xvYWRTeW5jXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gZmlsZW5hbWUgTmFtZXMgb2Ygb25lIG9yIG11bHRpcGxlIGZpbGVzIHRvIGxvYWRcclxuICogQHBhcmFtIHtQYXJzZU9wdGlvbnN9IFtvcHRpb25zXSBQYXJzZSBvcHRpb25zLiBEZWZhdWx0cyB0byB7QGxpbmsgcGFyc2UuZGVmYXVsdHN9IHdoZW4gb21pdHRlZC5cclxuICogQHJldHVybnMge1Jvb3R9IFJvb3QgbmFtZXNwYWNlXHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiBzeW5jaHJvbm91cyBmZXRjaGluZyBpcyBub3Qgc3VwcG9ydGVkIChpLmUuIGluIGJyb3dzZXJzKSBvciBpZiBhIGZpbGUncyBzeW50YXggaXMgaW52YWxpZFxyXG4gKi9cclxuUm9vdC5wcm90b3R5cGUubG9hZFN5bmMgPSBmdW5jdGlvbiBsb2FkU3luYyhmaWxlbmFtZSwgb3B0aW9ucykge1xyXG4gICAgaWYgKCF1dGlsLmlzTm9kZSlcclxuICAgICAgICB0aHJvdyBFcnJvcihcIm5vdCBzdXBwb3J0ZWRcIik7XHJcbiAgICByZXR1cm4gdGhpcy5sb2FkKGZpbGVuYW1lLCBvcHRpb25zLCBTWU5DKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcblJvb3QucHJvdG90eXBlLnJlc29sdmVBbGwgPSBmdW5jdGlvbiByZXNvbHZlQWxsKCkge1xyXG4gICAgaWYgKHRoaXMuZGVmZXJyZWQubGVuZ3RoKVxyXG4gICAgICAgIHRocm93IEVycm9yKFwidW5yZXNvbHZhYmxlIGV4dGVuc2lvbnM6IFwiICsgdGhpcy5kZWZlcnJlZC5tYXAoZnVuY3Rpb24oZmllbGQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwiJ2V4dGVuZCBcIiArIGZpZWxkLmV4dGVuZCArIFwiJyBpbiBcIiArIGZpZWxkLnBhcmVudC5mdWxsTmFtZTtcclxuICAgICAgICB9KS5qb2luKFwiLCBcIikpO1xyXG4gICAgcmV0dXJuIE5hbWVzcGFjZS5wcm90b3R5cGUucmVzb2x2ZUFsbC5jYWxsKHRoaXMpO1xyXG59O1xyXG5cclxuLy8gb25seSB1cHBlcmNhc2VkIChhbmQgdGh1cyBjb25mbGljdC1mcmVlKSBjaGlsZHJlbiBhcmUgZXhwb3NlZCwgc2VlIGJlbG93XHJcbnZhciBleHBvc2VSZSA9IC9eW0EtWl0vO1xyXG5cclxuLyoqXHJcbiAqIEhhbmRsZXMgYSBkZWZlcnJlZCBkZWNsYXJpbmcgZXh0ZW5zaW9uIGZpZWxkIGJ5IGNyZWF0aW5nIGEgc2lzdGVyIGZpZWxkIHRvIHJlcHJlc2VudCBpdCB3aXRoaW4gaXRzIGV4dGVuZGVkIHR5cGUuXHJcbiAqIEBwYXJhbSB7Um9vdH0gcm9vdCBSb290IGluc3RhbmNlXHJcbiAqIEBwYXJhbSB7RmllbGR9IGZpZWxkIERlY2xhcmluZyBleHRlbnNpb24gZmllbGQgd2l0aW4gdGhlIGRlY2xhcmluZyB0eXBlXHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgc3VjY2Vzc2Z1bGx5IGFkZGVkIHRvIHRoZSBleHRlbmRlZCB0eXBlLCBgZmFsc2VgIG90aGVyd2lzZVxyXG4gKiBAaW5uZXJcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gdHJ5SGFuZGxlRXh0ZW5zaW9uKHJvb3QsIGZpZWxkKSB7XHJcbiAgICB2YXIgZXh0ZW5kZWRUeXBlID0gZmllbGQucGFyZW50Lmxvb2t1cChmaWVsZC5leHRlbmQpO1xyXG4gICAgaWYgKGV4dGVuZGVkVHlwZSkge1xyXG4gICAgICAgIHZhciBzaXN0ZXJGaWVsZCA9IG5ldyBGaWVsZChmaWVsZC5mdWxsTmFtZSwgZmllbGQuaWQsIGZpZWxkLnR5cGUsIGZpZWxkLnJ1bGUsIHVuZGVmaW5lZCwgZmllbGQub3B0aW9ucyk7XHJcbiAgICAgICAgc2lzdGVyRmllbGQuZGVjbGFyaW5nRmllbGQgPSBmaWVsZDtcclxuICAgICAgICBmaWVsZC5leHRlbnNpb25GaWVsZCA9IHNpc3RlckZpZWxkO1xyXG4gICAgICAgIGV4dGVuZGVkVHlwZS5hZGQoc2lzdGVyRmllbGQpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsbGVkIHdoZW4gYW55IG9iamVjdCBpcyBhZGRlZCB0byB0aGlzIHJvb3Qgb3IgaXRzIHN1Yi1uYW1lc3BhY2VzLlxyXG4gKiBAcGFyYW0ge1JlZmxlY3Rpb25PYmplY3R9IG9iamVjdCBPYmplY3QgYWRkZWRcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQHByaXZhdGVcclxuICovXHJcblJvb3QucHJvdG90eXBlLl9oYW5kbGVBZGQgPSBmdW5jdGlvbiBfaGFuZGxlQWRkKG9iamVjdCkge1xyXG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIEZpZWxkKSB7XHJcblxyXG4gICAgICAgIGlmICgvKiBhbiBleHRlbnNpb24gZmllbGQgKGltcGxpZXMgbm90IHBhcnQgb2YgYSBvbmVvZikgKi8gb2JqZWN0LmV4dGVuZCAhPT0gdW5kZWZpbmVkICYmIC8qIG5vdCBhbHJlYWR5IGhhbmRsZWQgKi8gIW9iamVjdC5leHRlbnNpb25GaWVsZClcclxuICAgICAgICAgICAgaWYgKCF0cnlIYW5kbGVFeHRlbnNpb24odGhpcywgb2JqZWN0KSlcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWQucHVzaChvYmplY3QpO1xyXG5cclxuICAgIH0gZWxzZSBpZiAob2JqZWN0IGluc3RhbmNlb2YgRW51bSkge1xyXG5cclxuICAgICAgICBpZiAoZXhwb3NlUmUudGVzdChvYmplY3QubmFtZSkpXHJcbiAgICAgICAgICAgIG9iamVjdC5wYXJlbnRbb2JqZWN0Lm5hbWVdID0gb2JqZWN0LnZhbHVlczsgLy8gZXhwb3NlIGVudW0gdmFsdWVzIGFzIHByb3BlcnR5IG9mIGl0cyBwYXJlbnRcclxuXHJcbiAgICB9IGVsc2UgLyogZXZlcnl0aGluZyBlbHNlIGlzIGEgbmFtZXNwYWNlICovIHtcclxuXHJcbiAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIFR5cGUpIC8vIFRyeSB0byBoYW5kbGUgYW55IGRlZmVycmVkIGV4dGVuc2lvbnNcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRlZmVycmVkLmxlbmd0aDspXHJcbiAgICAgICAgICAgICAgICBpZiAodHJ5SGFuZGxlRXh0ZW5zaW9uKHRoaXMsIHRoaXMuZGVmZXJyZWRbaV0pKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWQuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICsraTtcclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IC8qIGluaXRpYWxpemVzICovIG9iamVjdC5uZXN0ZWRBcnJheS5sZW5ndGg7ICsraikgLy8gcmVjdXJzZSBpbnRvIHRoZSBuYW1lc3BhY2VcclxuICAgICAgICAgICAgdGhpcy5faGFuZGxlQWRkKG9iamVjdC5fbmVzdGVkQXJyYXlbal0pO1xyXG4gICAgICAgIGlmIChleHBvc2VSZS50ZXN0KG9iamVjdC5uYW1lKSlcclxuICAgICAgICAgICAgb2JqZWN0LnBhcmVudFtvYmplY3QubmFtZV0gPSBvYmplY3Q7IC8vIGV4cG9zZSBuYW1lc3BhY2UgYXMgcHJvcGVydHkgb2YgaXRzIHBhcmVudFxyXG4gICAgfVxyXG5cclxuICAgIC8vIFRoZSBhYm92ZSBhbHNvIGFkZHMgdXBwZXJjYXNlZCAoYW5kIHRodXMgY29uZmxpY3QtZnJlZSkgbmVzdGVkIHR5cGVzLCBzZXJ2aWNlcyBhbmQgZW51bXMgYXNcclxuICAgIC8vIHByb3BlcnRpZXMgb2YgbmFtZXNwYWNlcyBqdXN0IGxpa2Ugc3RhdGljIGNvZGUgZG9lcy4gVGhpcyBhbGxvd3MgdXNpbmcgYSAuZC50cyBnZW5lcmF0ZWQgZm9yXHJcbiAgICAvLyBhIHN0YXRpYyBtb2R1bGUgd2l0aCByZWZsZWN0aW9uLWJhc2VkIHNvbHV0aW9ucyB3aGVyZSB0aGUgY29uZGl0aW9uIGlzIG1ldC5cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxsZWQgd2hlbiBhbnkgb2JqZWN0IGlzIHJlbW92ZWQgZnJvbSB0aGlzIHJvb3Qgb3IgaXRzIHN1Yi1uYW1lc3BhY2VzLlxyXG4gKiBAcGFyYW0ge1JlZmxlY3Rpb25PYmplY3R9IG9iamVjdCBPYmplY3QgcmVtb3ZlZFxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUm9vdC5wcm90b3R5cGUuX2hhbmRsZVJlbW92ZSA9IGZ1bmN0aW9uIF9oYW5kbGVSZW1vdmUob2JqZWN0KSB7XHJcbiAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgRmllbGQpIHtcclxuXHJcbiAgICAgICAgaWYgKC8qIGFuIGV4dGVuc2lvbiBmaWVsZCAqLyBvYmplY3QuZXh0ZW5kICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgaWYgKC8qIGFscmVhZHkgaGFuZGxlZCAqLyBvYmplY3QuZXh0ZW5zaW9uRmllbGQpIHsgLy8gcmVtb3ZlIGl0cyBzaXN0ZXIgZmllbGRcclxuICAgICAgICAgICAgICAgIG9iamVjdC5leHRlbnNpb25GaWVsZC5wYXJlbnQucmVtb3ZlKG9iamVjdC5leHRlbnNpb25GaWVsZCk7XHJcbiAgICAgICAgICAgICAgICBvYmplY3QuZXh0ZW5zaW9uRmllbGQgPSBudWxsO1xyXG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBjYW5jZWwgdGhlIGV4dGVuc2lvblxyXG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5kZWZlcnJlZC5pbmRleE9mKG9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID4gLTEpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZC5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0gZWxzZSBpZiAob2JqZWN0IGluc3RhbmNlb2YgRW51bSkge1xyXG5cclxuICAgICAgICBpZiAoZXhwb3NlUmUudGVzdChvYmplY3QubmFtZSkpXHJcbiAgICAgICAgICAgIGRlbGV0ZSBvYmplY3QucGFyZW50W29iamVjdC5uYW1lXTsgLy8gdW5leHBvc2UgZW51bSB2YWx1ZXNcclxuXHJcbiAgICB9IGVsc2UgaWYgKG9iamVjdCBpbnN0YW5jZW9mIE5hbWVzcGFjZSkge1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IC8qIGluaXRpYWxpemVzICovIG9iamVjdC5uZXN0ZWRBcnJheS5sZW5ndGg7ICsraSkgLy8gcmVjdXJzZSBpbnRvIHRoZSBuYW1lc3BhY2VcclxuICAgICAgICAgICAgdGhpcy5faGFuZGxlUmVtb3ZlKG9iamVjdC5fbmVzdGVkQXJyYXlbaV0pO1xyXG5cclxuICAgICAgICBpZiAoZXhwb3NlUmUudGVzdChvYmplY3QubmFtZSkpXHJcbiAgICAgICAgICAgIGRlbGV0ZSBvYmplY3QucGFyZW50W29iamVjdC5uYW1lXTsgLy8gdW5leHBvc2UgbmFtZXNwYWNlc1xyXG5cclxuICAgIH1cclxufTtcclxuXHJcblJvb3QuX2NvbmZpZ3VyZSA9IGZ1bmN0aW9uKFR5cGVfLCBwYXJzZV8sIGNvbW1vbl8pIHtcclxuICAgIFR5cGUgPSBUeXBlXztcclxuICAgIHBhcnNlID0gcGFyc2VfO1xyXG4gICAgY29tbW9uID0gY29tbW9uXztcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vKipcclxuICogU3RyZWFtaW5nIFJQQyBoZWxwZXJzLlxyXG4gKiBAbmFtZXNwYWNlXHJcbiAqL1xyXG52YXIgcnBjID0gZXhwb3J0cztcclxuXHJcbi8qKlxyXG4gKiBSUEMgaW1wbGVtZW50YXRpb24gcGFzc2VkIHRvIHtAbGluayBTZXJ2aWNlI2NyZWF0ZX0gcGVyZm9ybWluZyBhIHNlcnZpY2UgcmVxdWVzdCBvbiBuZXR3b3JrIGxldmVsLCBpLmUuIGJ5IHV0aWxpemluZyBodHRwIHJlcXVlc3RzIG9yIHdlYnNvY2tldHMuXHJcbiAqIEB0eXBlZGVmIFJQQ0ltcGxcclxuICogQHR5cGUge2Z1bmN0aW9ufVxyXG4gKiBAcGFyYW0ge01ldGhvZHxycGMuU2VydmljZU1ldGhvZH0gbWV0aG9kIFJlZmxlY3RlZCBvciBzdGF0aWMgbWV0aG9kIGJlaW5nIGNhbGxlZFxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IHJlcXVlc3REYXRhIFJlcXVlc3QgZGF0YVxyXG4gKiBAcGFyYW0ge1JQQ0ltcGxDYWxsYmFja30gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb25cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQGV4YW1wbGVcclxuICogZnVuY3Rpb24gcnBjSW1wbChtZXRob2QsIHJlcXVlc3REYXRhLCBjYWxsYmFjaykge1xyXG4gKiAgICAgaWYgKHByb3RvYnVmLnV0aWwubGNGaXJzdChtZXRob2QubmFtZSkgIT09IFwibXlNZXRob2RcIikgLy8gY29tcGF0aWJsZSB3aXRoIHN0YXRpYyBjb2RlXHJcbiAqICAgICAgICAgdGhyb3cgRXJyb3IoXCJubyBzdWNoIG1ldGhvZFwiKTtcclxuICogICAgIGFzeW5jaHJvbm91c2x5T2J0YWluQVJlc3BvbnNlKHJlcXVlc3REYXRhLCBmdW5jdGlvbihlcnIsIHJlc3BvbnNlRGF0YSkge1xyXG4gKiAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzcG9uc2VEYXRhKTtcclxuICogICAgIH0pO1xyXG4gKiB9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIE5vZGUtc3R5bGUgY2FsbGJhY2sgYXMgdXNlZCBieSB7QGxpbmsgUlBDSW1wbH0uXHJcbiAqIEB0eXBlZGVmIFJQQ0ltcGxDYWxsYmFja1xyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7P0Vycm9yfSBlcnJvciBFcnJvciwgaWYgYW55LCBvdGhlcndpc2UgYG51bGxgXHJcbiAqIEBwYXJhbSB7P1VpbnQ4QXJyYXl9IFtyZXNwb25zZV0gUmVzcG9uc2UgZGF0YSBvciBgbnVsbGAgdG8gc2lnbmFsIGVuZCBvZiBzdHJlYW0sIGlmIHRoZXJlIGhhc24ndCBiZWVuIGFuIGVycm9yXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxucnBjLlNlcnZpY2UgPSByZXF1aXJlKFwiLi9ycGMvc2VydmljZVwiKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gU2VydmljZTtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4uL3V0aWwvbWluaW1hbFwiKTtcclxuXHJcbi8vIEV4dGVuZHMgRXZlbnRFbWl0dGVyXHJcbihTZXJ2aWNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodXRpbC5FdmVudEVtaXR0ZXIucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBTZXJ2aWNlO1xyXG5cclxuLyoqXHJcbiAqIEEgc2VydmljZSBtZXRob2QgY2FsbGJhY2sgYXMgdXNlZCBieSB7QGxpbmsgcnBjLlNlcnZpY2VNZXRob2R8U2VydmljZU1ldGhvZH0uXHJcbiAqXHJcbiAqIERpZmZlcnMgZnJvbSB7QGxpbmsgUlBDSW1wbENhbGxiYWNrfSBpbiB0aGF0IGl0IGlzIGFuIGFjdHVhbCBjYWxsYmFjayBvZiBhIHNlcnZpY2UgbWV0aG9kIHdoaWNoIG1heSBub3QgcmV0dXJuIGByZXNwb25zZSA9IG51bGxgLlxyXG4gKiBAdHlwZWRlZiBycGMuU2VydmljZU1ldGhvZENhbGxiYWNrXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHs/RXJyb3J9IGVycm9yIEVycm9yLCBpZiBhbnlcclxuICogQHBhcmFtIHs/TWVzc2FnZX0gW3Jlc3BvbnNlXSBSZXNwb25zZSBtZXNzYWdlXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEEgc2VydmljZSBtZXRob2QgcGFydCBvZiBhIHtAbGluayBycGMuU2VydmljZU1ldGhvZE1peGlufFNlcnZpY2VNZXRob2RNaXhpbn0gYW5kIHRodXMge0BsaW5rIHJwYy5TZXJ2aWNlfSBhcyBjcmVhdGVkIGJ5IHtAbGluayBTZXJ2aWNlLmNyZWF0ZX0uXHJcbiAqIEB0eXBlZGVmIHJwYy5TZXJ2aWNlTWV0aG9kXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHtNZXNzYWdlfE9iamVjdC48c3RyaW5nLCo+fSByZXF1ZXN0IFJlcXVlc3QgbWVzc2FnZSBvciBwbGFpbiBvYmplY3RcclxuICogQHBhcmFtIHtycGMuU2VydmljZU1ldGhvZENhbGxiYWNrfSBbY2FsbGJhY2tdIE5vZGUtc3R5bGUgY2FsbGJhY2sgY2FsbGVkIHdpdGggdGhlIGVycm9yLCBpZiBhbnksIGFuZCB0aGUgcmVzcG9uc2UgbWVzc2FnZVxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxNZXNzYWdlPn0gUHJvbWlzZSBpZiBgY2FsbGJhY2tgIGhhcyBiZWVuIG9taXR0ZWQsIG90aGVyd2lzZSBgdW5kZWZpbmVkYFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBBIHNlcnZpY2UgbWV0aG9kIG1peGluLlxyXG4gKlxyXG4gKiBXaGVuIHVzaW5nIFR5cGVTY3JpcHQsIG1peGVkIGluIHNlcnZpY2UgbWV0aG9kcyBhcmUgb25seSBzdXBwb3J0ZWQgZGlyZWN0bHkgd2l0aCBhIHR5cGUgZGVmaW5pdGlvbiBvZiBhIHN0YXRpYyBtb2R1bGUgKHVzZWQgd2l0aCByZWZsZWN0aW9uKS4gT3RoZXJ3aXNlLCBleHBsaWNpdCBjYXN0aW5nIGlzIHJlcXVpcmVkLlxyXG4gKiBAdHlwZWRlZiBycGMuU2VydmljZU1ldGhvZE1peGluXHJcbiAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxycGMuU2VydmljZU1ldGhvZD59XHJcbiAqIEBleGFtcGxlXHJcbiAqIC8vIEV4cGxpY2l0IGNhc3Rpbmcgd2l0aCBUeXBlU2NyaXB0XHJcbiAqIChteVJwY1NlcnZpY2VbXCJteU1ldGhvZFwiXSBhcyBwcm90b2J1Zi5ycGMuU2VydmljZU1ldGhvZCkoLi4uKVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IFJQQyBzZXJ2aWNlIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIEFuIFJQQyBzZXJ2aWNlIGFzIHJldHVybmVkIGJ5IHtAbGluayBTZXJ2aWNlI2NyZWF0ZX0uXHJcbiAqIEBleHBvcnRzIHJwYy5TZXJ2aWNlXHJcbiAqIEBleHRlbmRzIHV0aWwuRXZlbnRFbWl0dGVyXHJcbiAqIEBhdWdtZW50cyBycGMuU2VydmljZU1ldGhvZE1peGluXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge1JQQ0ltcGx9IHJwY0ltcGwgUlBDIGltcGxlbWVudGF0aW9uXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3JlcXVlc3REZWxpbWl0ZWQ9ZmFsc2VdIFdoZXRoZXIgcmVxdWVzdHMgYXJlIGxlbmd0aC1kZWxpbWl0ZWRcclxuICogQHBhcmFtIHtib29sZWFufSBbcmVzcG9uc2VEZWxpbWl0ZWQ9ZmFsc2VdIFdoZXRoZXIgcmVzcG9uc2VzIGFyZSBsZW5ndGgtZGVsaW1pdGVkXHJcbiAqL1xyXG5mdW5jdGlvbiBTZXJ2aWNlKHJwY0ltcGwsIHJlcXVlc3REZWxpbWl0ZWQsIHJlc3BvbnNlRGVsaW1pdGVkKSB7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBycGNJbXBsICE9PSBcImZ1bmN0aW9uXCIpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwicnBjSW1wbCBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XHJcblxyXG4gICAgdXRpbC5FdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJQQyBpbXBsZW1lbnRhdGlvbi4gQmVjb21lcyBgbnVsbGAgb25jZSB0aGUgc2VydmljZSBpcyBlbmRlZC5cclxuICAgICAqIEB0eXBlIHs/UlBDSW1wbH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5ycGNJbXBsID0gcnBjSW1wbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgcmVxdWVzdHMgYXJlIGxlbmd0aC1kZWxpbWl0ZWQuXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXF1ZXN0RGVsaW1pdGVkID0gQm9vbGVhbihyZXF1ZXN0RGVsaW1pdGVkKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgcmVzcG9uc2VzIGFyZSBsZW5ndGgtZGVsaW1pdGVkLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVzcG9uc2VEZWxpbWl0ZWQgPSBCb29sZWFuKHJlc3BvbnNlRGVsaW1pdGVkKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGxzIGEgc2VydmljZSBtZXRob2QgdGhyb3VnaCB7QGxpbmsgcnBjLlNlcnZpY2UjcnBjSW1wbHxycGNJbXBsfS5cclxuICogQHBhcmFtIHtNZXRob2R8cnBjLlNlcnZpY2VNZXRob2R9IG1ldGhvZCBSZWZsZWN0ZWQgb3Igc3RhdGljIG1ldGhvZFxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSByZXF1ZXN0Q3RvciBSZXF1ZXN0IGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHJlc3BvbnNlQ3RvciBSZXNwb25zZSBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge01lc3NhZ2V8T2JqZWN0LjxzdHJpbmcsKj59IHJlcXVlc3QgUmVxdWVzdCBtZXNzYWdlIG9yIHBsYWluIG9iamVjdFxyXG4gKiBAcGFyYW0ge3JwYy5TZXJ2aWNlTWV0aG9kQ2FsbGJhY2t9IGNhbGxiYWNrIFNlcnZpY2UgY2FsbGJhY2tcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLnJwY0NhbGwgPSBmdW5jdGlvbiBycGNDYWxsKG1ldGhvZCwgcmVxdWVzdEN0b3IsIHJlc3BvbnNlQ3RvciwgcmVxdWVzdCwgY2FsbGJhY2spIHtcclxuXHJcbiAgICBpZiAoIXJlcXVlc3QpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwicmVxdWVzdCBtdXN0IGJlIHNwZWNpZmllZFwiKTtcclxuXHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBpZiAoIWNhbGxiYWNrKVxyXG4gICAgICAgIHJldHVybiB1dGlsLmFzUHJvbWlzZShycGNDYWxsLCBzZWxmLCBtZXRob2QsIHJlcXVlc3RDdG9yLCByZXNwb25zZUN0b3IsIHJlcXVlc3QpO1xyXG5cclxuICAgIGlmICghc2VsZi5ycGNJbXBsKSB7XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soRXJyb3IoXCJhbHJlYWR5IGVuZGVkXCIpKTsgfSwgMCk7XHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBzZWxmLnJwY0ltcGwoXHJcbiAgICAgICAgICAgIG1ldGhvZCxcclxuICAgICAgICAgICAgcmVxdWVzdEN0b3Jbc2VsZi5yZXF1ZXN0RGVsaW1pdGVkID8gXCJlbmNvZGVEZWxpbWl0ZWRcIiA6IFwiZW5jb2RlXCJdKHJlcXVlc3QpLmZpbmlzaCgpLFxyXG4gICAgICAgICAgICBmdW5jdGlvbiBycGNDYWxsYmFjayhlcnIsIHJlc3BvbnNlKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImVycm9yXCIsIGVyciwgbWV0aG9kKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmVuZCgvKiBlbmRlZEJ5UlBDICovIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCEocmVzcG9uc2UgaW5zdGFuY2VvZiByZXNwb25zZUN0b3IpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSByZXNwb25zZUN0b3Jbc2VsZi5yZXNwb25zZURlbGltaXRlZCA/IFwiZGVjb2RlRGVsaW1pdGVkXCIgOiBcImRlY29kZVwiXShyZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImVycm9yXCIsIGVyciwgbWV0aG9kKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImRhdGFcIiwgcmVzcG9uc2UsIG1ldGhvZCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgIHNlbGYuZW1pdChcImVycm9yXCIsIGVyciwgbWV0aG9kKTtcclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhlcnIpOyB9LCAwKTtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEVuZHMgdGhpcyBzZXJ2aWNlIGFuZCBlbWl0cyB0aGUgYGVuZGAgZXZlbnQuXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2VuZGVkQnlSUEM9ZmFsc2VdIFdoZXRoZXIgdGhlIHNlcnZpY2UgaGFzIGJlZW4gZW5kZWQgYnkgdGhlIFJQQyBpbXBsZW1lbnRhdGlvbi5cclxuICogQHJldHVybnMge3JwYy5TZXJ2aWNlfSBgdGhpc2BcclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIGVuZChlbmRlZEJ5UlBDKSB7XHJcbiAgICBpZiAodGhpcy5ycGNJbXBsKSB7XHJcbiAgICAgICAgaWYgKCFlbmRlZEJ5UlBDKSAvLyBzaWduYWwgZW5kIHRvIHJwY0ltcGxcclxuICAgICAgICAgICAgdGhpcy5ycGNJbXBsKG51bGwsIG51bGwsIG51bGwpO1xyXG4gICAgICAgIHRoaXMucnBjSW1wbCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5lbWl0KFwiZW5kXCIpLm9mZigpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFNlcnZpY2U7XHJcblxyXG4vLyBleHRlbmRzIE5hbWVzcGFjZVxyXG52YXIgTmFtZXNwYWNlID0gcmVxdWlyZShcIi4vbmFtZXNwYWNlXCIpO1xyXG4oKFNlcnZpY2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShOYW1lc3BhY2UucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBTZXJ2aWNlKS5jbGFzc05hbWUgPSBcIlNlcnZpY2VcIjtcclxuXHJcbnZhciBNZXRob2QgPSByZXF1aXJlKFwiLi9tZXRob2RcIiksXHJcbiAgICB1dGlsICAgPSByZXF1aXJlKFwiLi91dGlsXCIpLFxyXG4gICAgcnBjICAgID0gcmVxdWlyZShcIi4vcnBjXCIpO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgc2VydmljZSBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBSZWZsZWN0ZWQgc2VydmljZS5cclxuICogQGV4dGVuZHMgTmFtZXNwYWNlQmFzZVxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgU2VydmljZSBuYW1lXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IFtvcHRpb25zXSBTZXJ2aWNlIG9wdGlvbnNcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICovXHJcbmZ1bmN0aW9uIFNlcnZpY2UobmFtZSwgb3B0aW9ucykge1xyXG4gICAgTmFtZXNwYWNlLmNhbGwodGhpcywgbmFtZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZXJ2aWNlIG1ldGhvZHMuXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsTWV0aG9kPn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5tZXRob2RzID0ge307IC8vIHRvSlNPTiwgbWFya2VyXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWNoZWQgbWV0aG9kcyBhcyBhbiBhcnJheS5cclxuICAgICAqIEB0eXBlIHs/TWV0aG9kW119XHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICB0aGlzLl9tZXRob2RzQXJyYXkgPSBudWxsO1xyXG59XHJcblxyXG4vKipcclxuICogU2VydmljZSBkZXNjcmlwdG9yLlxyXG4gKiBAdHlwZWRlZiBTZXJ2aWNlRGVzY3JpcHRvclxyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCo+fSBbb3B0aW9uc10gU2VydmljZSBvcHRpb25zXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsTWV0aG9kRGVzY3JpcHRvcj59IG1ldGhvZHMgTWV0aG9kIGRlc2NyaXB0b3JzXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsQW55TmVzdGVkRGVzY3JpcHRvcj59IFtuZXN0ZWRdIE5lc3RlZCBvYmplY3QgZGVzY3JpcHRvcnNcclxuICovXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIHNlcnZpY2UgZnJvbSBhIHNlcnZpY2UgZGVzY3JpcHRvci5cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgU2VydmljZSBuYW1lXHJcbiAqIEBwYXJhbSB7U2VydmljZURlc2NyaXB0b3J9IGpzb24gU2VydmljZSBkZXNjcmlwdG9yXHJcbiAqIEByZXR1cm5zIHtTZXJ2aWNlfSBDcmVhdGVkIHNlcnZpY2VcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBhcmd1bWVudHMgYXJlIGludmFsaWRcclxuICovXHJcblNlcnZpY2UuZnJvbUpTT04gPSBmdW5jdGlvbiBmcm9tSlNPTihuYW1lLCBqc29uKSB7XHJcbiAgICB2YXIgc2VydmljZSA9IG5ldyBTZXJ2aWNlKG5hbWUsIGpzb24ub3B0aW9ucyk7XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgaWYgKGpzb24ubWV0aG9kcylcclxuICAgICAgICBmb3IgKHZhciBuYW1lcyA9IE9iamVjdC5rZXlzKGpzb24ubWV0aG9kcyksIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgIHNlcnZpY2UuYWRkKE1ldGhvZC5mcm9tSlNPTihuYW1lc1tpXSwganNvbi5tZXRob2RzW25hbWVzW2ldXSkpO1xyXG4gICAgaWYgKGpzb24ubmVzdGVkKVxyXG4gICAgICAgIHNlcnZpY2UuYWRkSlNPTihqc29uLm5lc3RlZCk7XHJcbiAgICByZXR1cm4gc2VydmljZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIHNlcnZpY2UgdG8gYSBzZXJ2aWNlIGRlc2NyaXB0b3IuXHJcbiAqIEByZXR1cm5zIHtTZXJ2aWNlRGVzY3JpcHRvcn0gU2VydmljZSBkZXNjcmlwdG9yXHJcbiAqL1xyXG5TZXJ2aWNlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XHJcbiAgICB2YXIgaW5oZXJpdGVkID0gTmFtZXNwYWNlLnByb3RvdHlwZS50b0pTT04uY2FsbCh0aGlzKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgb3B0aW9ucyA6IGluaGVyaXRlZCAmJiBpbmhlcml0ZWQub3B0aW9ucyB8fCB1bmRlZmluZWQsXHJcbiAgICAgICAgbWV0aG9kcyA6IE5hbWVzcGFjZS5hcnJheVRvSlNPTih0aGlzLm1ldGhvZHNBcnJheSkgfHwgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8ge30sXHJcbiAgICAgICAgbmVzdGVkICA6IGluaGVyaXRlZCAmJiBpbmhlcml0ZWQubmVzdGVkIHx8IHVuZGVmaW5lZFxyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBNZXRob2RzIG9mIHRoaXMgc2VydmljZSBhcyBhbiBhcnJheSBmb3IgaXRlcmF0aW9uLlxyXG4gKiBAbmFtZSBTZXJ2aWNlI21ldGhvZHNBcnJheVxyXG4gKiBAdHlwZSB7TWV0aG9kW119XHJcbiAqIEByZWFkb25seVxyXG4gKi9cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNlcnZpY2UucHJvdG90eXBlLCBcIm1ldGhvZHNBcnJheVwiLCB7XHJcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9tZXRob2RzQXJyYXkgfHwgKHRoaXMuX21ldGhvZHNBcnJheSA9IHV0aWwudG9BcnJheSh0aGlzLm1ldGhvZHMpKTtcclxuICAgIH1cclxufSk7XHJcblxyXG5mdW5jdGlvbiBjbGVhckNhY2hlKHNlcnZpY2UpIHtcclxuICAgIHNlcnZpY2UuX21ldGhvZHNBcnJheSA9IG51bGw7XHJcbiAgICByZXR1cm4gc2VydmljZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuU2VydmljZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0KG5hbWUpIHtcclxuICAgIHJldHVybiB0aGlzLm1ldGhvZHNbbmFtZV1cclxuICAgICAgICB8fCBOYW1lc3BhY2UucHJvdG90eXBlLmdldC5jYWxsKHRoaXMsIG5hbWUpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuU2VydmljZS5wcm90b3R5cGUucmVzb2x2ZUFsbCA9IGZ1bmN0aW9uIHJlc29sdmVBbGwoKSB7XHJcbiAgICB2YXIgbWV0aG9kcyA9IHRoaXMubWV0aG9kc0FycmF5O1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXRob2RzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgIG1ldGhvZHNbaV0ucmVzb2x2ZSgpO1xyXG4gICAgcmV0dXJuIE5hbWVzcGFjZS5wcm90b3R5cGUucmVzb2x2ZS5jYWxsKHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuU2VydmljZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkKG9iamVjdCkge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKHRoaXMuZ2V0KG9iamVjdC5uYW1lKSlcclxuICAgICAgICB0aHJvdyBFcnJvcihcImR1cGxpY2F0ZSBuYW1lICdcIiArIG9iamVjdC5uYW1lICsgXCInIGluIFwiICsgdGhpcyk7XHJcblxyXG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIE1ldGhvZCkge1xyXG4gICAgICAgIHRoaXMubWV0aG9kc1tvYmplY3QubmFtZV0gPSBvYmplY3Q7XHJcbiAgICAgICAgb2JqZWN0LnBhcmVudCA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIGNsZWFyQ2FjaGUodGhpcyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gTmFtZXNwYWNlLnByb3RvdHlwZS5hZGQuY2FsbCh0aGlzLCBvYmplY3QpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuU2VydmljZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKG9iamVjdCkge1xyXG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIE1ldGhvZCkge1xyXG5cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICBpZiAodGhpcy5tZXRob2RzW29iamVjdC5uYW1lXSAhPT0gb2JqZWN0KVxyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihvYmplY3QgKyBcIiBpcyBub3QgYSBtZW1iZXIgb2YgXCIgKyB0aGlzKTtcclxuXHJcbiAgICAgICAgZGVsZXRlIHRoaXMubWV0aG9kc1tvYmplY3QubmFtZV07XHJcbiAgICAgICAgb2JqZWN0LnBhcmVudCA9IG51bGw7XHJcbiAgICAgICAgcmV0dXJuIGNsZWFyQ2FjaGUodGhpcyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gTmFtZXNwYWNlLnByb3RvdHlwZS5yZW1vdmUuY2FsbCh0aGlzLCBvYmplY3QpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBydW50aW1lIHNlcnZpY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBycGMgaW1wbGVtZW50YXRpb24uXHJcbiAqIEBwYXJhbSB7UlBDSW1wbH0gcnBjSW1wbCBSUEMgaW1wbGVtZW50YXRpb25cclxuICogQHBhcmFtIHtib29sZWFufSBbcmVxdWVzdERlbGltaXRlZD1mYWxzZV0gV2hldGhlciByZXF1ZXN0cyBhcmUgbGVuZ3RoLWRlbGltaXRlZFxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtyZXNwb25zZURlbGltaXRlZD1mYWxzZV0gV2hldGhlciByZXNwb25zZXMgYXJlIGxlbmd0aC1kZWxpbWl0ZWRcclxuICogQHJldHVybnMge3JwYy5TZXJ2aWNlfSBSUEMgc2VydmljZS4gVXNlZnVsIHdoZXJlIHJlcXVlc3RzIGFuZC9vciByZXNwb25zZXMgYXJlIHN0cmVhbWVkLlxyXG4gKi9cclxuU2VydmljZS5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHJwY0ltcGwsIHJlcXVlc3REZWxpbWl0ZWQsIHJlc3BvbnNlRGVsaW1pdGVkKSB7XHJcbiAgICB2YXIgcnBjU2VydmljZSA9IG5ldyBycGMuU2VydmljZShycGNJbXBsLCByZXF1ZXN0RGVsaW1pdGVkLCByZXNwb25zZURlbGltaXRlZCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IC8qIGluaXRpYWxpemVzICovIHRoaXMubWV0aG9kc0FycmF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgcnBjU2VydmljZVt1dGlsLmxjRmlyc3QodGhpcy5fbWV0aG9kc0FycmF5W2ldLnJlc29sdmUoKS5uYW1lKV0gPSB1dGlsLmNvZGVnZW4oXCJyXCIsXCJjXCIpKFwicmV0dXJuIHRoaXMucnBjQ2FsbChtLHEscyxyLGMpXCIpLmVvZih1dGlsLmxjRmlyc3QodGhpcy5fbWV0aG9kc0FycmF5W2ldLm5hbWUpLCB7XHJcbiAgICAgICAgICAgIG06IHRoaXMuX21ldGhvZHNBcnJheVtpXSxcclxuICAgICAgICAgICAgcTogdGhpcy5fbWV0aG9kc0FycmF5W2ldLnJlc29sdmVkUmVxdWVzdFR5cGUuY3RvcixcclxuICAgICAgICAgICAgczogdGhpcy5fbWV0aG9kc0FycmF5W2ldLnJlc29sdmVkUmVzcG9uc2VUeXBlLmN0b3JcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBycGNTZXJ2aWNlO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSB0b2tlbml6ZTtcclxuXHJcbnZhciBkZWxpbVJlICAgICAgICA9IC9bXFxze309OzpbXFxdLCdcIigpPD5dL2csXHJcbiAgICBzdHJpbmdEb3VibGVSZSA9IC8oPzpcIihbXlwiXFxcXF0qKD86XFxcXC5bXlwiXFxcXF0qKSopXCIpL2csXHJcbiAgICBzdHJpbmdTaW5nbGVSZSA9IC8oPzonKFteJ1xcXFxdKig/OlxcXFwuW14nXFxcXF0qKSopJykvZztcclxuXHJcbnZhciBzZXRDb21tZW50UmUgPSAvXiAqWyovXSsgKi8sXHJcbiAgICBzZXRDb21tZW50U3BsaXRSZSA9IC9cXG4vZyxcclxuICAgIHdoaXRlc3BhY2VSZSA9IC9cXHMvLFxyXG4gICAgdW5lc2NhcGVSZSA9IC9cXFxcKC4/KS9nO1xyXG5cclxudmFyIHVuZXNjYXBlTWFwID0ge1xyXG4gICAgXCIwXCI6IFwiXFwwXCIsXHJcbiAgICBcInJcIjogXCJcXHJcIixcclxuICAgIFwiblwiOiBcIlxcblwiLFxyXG4gICAgXCJ0XCI6IFwiXFx0XCJcclxufTtcclxuXHJcbi8qKlxyXG4gKiBVbmVzY2FwZXMgYSBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHIgU3RyaW5nIHRvIHVuZXNjYXBlXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFVuZXNjYXBlZCBzdHJpbmdcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZyxzdHJpbmc+fSBtYXAgU3BlY2lhbCBjaGFyYWN0ZXJzIG1hcFxyXG4gKiBAaWdub3JlXHJcbiAqL1xyXG5mdW5jdGlvbiB1bmVzY2FwZShzdHIpIHtcclxuICAgIHJldHVybiBzdHIucmVwbGFjZSh1bmVzY2FwZVJlLCBmdW5jdGlvbigkMCwgJDEpIHtcclxuICAgICAgICBzd2l0Y2ggKCQxKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJcXFxcXCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiAkMTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB1bmVzY2FwZU1hcFskMV0gfHwgXCJcIjtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5cclxudG9rZW5pemUudW5lc2NhcGUgPSB1bmVzY2FwZTtcclxuXHJcbi8qKlxyXG4gKiBIYW5kbGUgb2JqZWN0IHJldHVybmVkIGZyb20ge0BsaW5rIHRva2VuaXplfS5cclxuICogQHR5cGVkZWYge09iamVjdC48c3RyaW5nLCo+fSBUb2tlbml6ZXJIYW5kbGVcclxuICogQHByb3BlcnR5IHtmdW5jdGlvbigpOm51bWJlcn0gbGluZSBHZXRzIHRoZSBjdXJyZW50IGxpbmUgbnVtYmVyXHJcbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb24oKTo/c3RyaW5nfSBuZXh0IEdldHMgdGhlIG5leHQgdG9rZW4gYW5kIGFkdmFuY2VzIChgbnVsbGAgb24gZW9mKVxyXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9uKCk6P3N0cmluZ30gcGVlayBQZWVrcyBmb3IgdGhlIG5leHQgdG9rZW4gKGBudWxsYCBvbiBlb2YpXHJcbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb24oc3RyaW5nKX0gcHVzaCBQdXNoZXMgYSB0b2tlbiBiYWNrIHRvIHRoZSBzdGFja1xyXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9uKHN0cmluZywgYm9vbGVhbj0pOmJvb2xlYW59IHNraXAgU2tpcHMgYSB0b2tlbiwgcmV0dXJucyBpdHMgcHJlc2VuY2UgYW5kIGFkdmFuY2VzIG9yLCBpZiBub24tb3B0aW9uYWwgYW5kIG5vdCBwcmVzZW50LCB0aHJvd3NcclxuICogQHByb3BlcnR5IHtmdW5jdGlvbihudW1iZXI9KTo/c3RyaW5nfSBjbW50IEdldHMgdGhlIGNvbW1lbnQgb24gdGhlIHByZXZpb3VzIGxpbmUgb3IgdGhlIGxpbmUgY29tbWVudCBvbiB0aGUgc3BlY2lmaWVkIGxpbmUsIGlmIGFueVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBUb2tlbml6ZXMgdGhlIGdpdmVuIC5wcm90byBzb3VyY2UgYW5kIHJldHVybnMgYW4gb2JqZWN0IHdpdGggdXNlZnVsIHV0aWxpdHkgZnVuY3Rpb25zLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc291cmNlIFNvdXJjZSBjb250ZW50c1xyXG4gKiBAcmV0dXJucyB7VG9rZW5pemVySGFuZGxlfSBUb2tlbml6ZXIgaGFuZGxlXHJcbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb24oc3RyaW5nKTpzdHJpbmd9IHVuZXNjYXBlIFVuZXNjYXBlcyBhIHN0cmluZ1xyXG4gKi9cclxuZnVuY3Rpb24gdG9rZW5pemUoc291cmNlKSB7XHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBjYWxsYmFjay1yZXR1cm4gKi9cclxuICAgIHNvdXJjZSA9IHNvdXJjZS50b1N0cmluZygpO1xyXG5cclxuICAgIHZhciBvZmZzZXQgPSAwLFxyXG4gICAgICAgIGxlbmd0aCA9IHNvdXJjZS5sZW5ndGgsXHJcbiAgICAgICAgbGluZSA9IDEsXHJcbiAgICAgICAgY29tbWVudFR5cGUgPSBudWxsLFxyXG4gICAgICAgIGNvbW1lbnRUZXh0ID0gbnVsbCxcclxuICAgICAgICBjb21tZW50TGluZSA9IDA7XHJcblxyXG4gICAgdmFyIHN0YWNrID0gW107XHJcblxyXG4gICAgdmFyIHN0cmluZ0RlbGltID0gbnVsbDtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGVzIGFuIGVycm9yIGZvciBpbGxlZ2FsIHN5bnRheC5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzdWJqZWN0IFN1YmplY3RcclxuICAgICAqIEByZXR1cm5zIHtFcnJvcn0gRXJyb3IgY3JlYXRlZFxyXG4gICAgICogQGlubmVyXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGlsbGVnYWwoc3ViamVjdCkge1xyXG4gICAgICAgIHJldHVybiBFcnJvcihcImlsbGVnYWwgXCIgKyBzdWJqZWN0ICsgXCIgKGxpbmUgXCIgKyBsaW5lICsgXCIpXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZHMgYSBzdHJpbmcgdGlsbCBpdHMgZW5kLlxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gU3RyaW5nIHJlYWRcclxuICAgICAqIEBpbm5lclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiByZWFkU3RyaW5nKCkge1xyXG4gICAgICAgIHZhciByZSA9IHN0cmluZ0RlbGltID09PSBcIidcIiA/IHN0cmluZ1NpbmdsZVJlIDogc3RyaW5nRG91YmxlUmU7XHJcbiAgICAgICAgcmUubGFzdEluZGV4ID0gb2Zmc2V0IC0gMTtcclxuICAgICAgICB2YXIgbWF0Y2ggPSByZS5leGVjKHNvdXJjZSk7XHJcbiAgICAgICAgaWYgKCFtYXRjaClcclxuICAgICAgICAgICAgdGhyb3cgaWxsZWdhbChcInN0cmluZ1wiKTtcclxuICAgICAgICBvZmZzZXQgPSByZS5sYXN0SW5kZXg7XHJcbiAgICAgICAgcHVzaChzdHJpbmdEZWxpbSk7XHJcbiAgICAgICAgc3RyaW5nRGVsaW0gPSBudWxsO1xyXG4gICAgICAgIHJldHVybiB1bmVzY2FwZShtYXRjaFsxXSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXRzIHRoZSBjaGFyYWN0ZXIgYXQgYHBvc2Agd2l0aGluIHRoZSBzb3VyY2UuXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcG9zIFBvc2l0aW9uXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDaGFyYWN0ZXJcclxuICAgICAqIEBpbm5lclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBjaGFyQXQocG9zKSB7XHJcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5jaGFyQXQocG9zKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFNldHMgdGhlIGN1cnJlbnQgY29tbWVudCB0ZXh0LlxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IFN0YXJ0IG9mZnNldFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCBFbmQgb2Zmc2V0XHJcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gICAgICogQGlubmVyXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHNldENvbW1lbnQoc3RhcnQsIGVuZCkge1xyXG4gICAgICAgIGNvbW1lbnRUeXBlID0gc291cmNlLmNoYXJBdChzdGFydCsrKTtcclxuICAgICAgICBjb21tZW50TGluZSA9IGxpbmU7XHJcbiAgICAgICAgdmFyIGxpbmVzID0gc291cmNlXHJcbiAgICAgICAgICAgIC5zdWJzdHJpbmcoc3RhcnQsIGVuZClcclxuICAgICAgICAgICAgLnNwbGl0KHNldENvbW1lbnRTcGxpdFJlKTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICBsaW5lc1tpXSA9IGxpbmVzW2ldLnJlcGxhY2Uoc2V0Q29tbWVudFJlLCBcIlwiKS50cmltKCk7XHJcbiAgICAgICAgY29tbWVudFRleHQgPSBsaW5lc1xyXG4gICAgICAgICAgICAuam9pbihcIlxcblwiKVxyXG4gICAgICAgICAgICAudHJpbSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogT2J0YWlucyB0aGUgbmV4dCB0b2tlbi5cclxuICAgICAqIEByZXR1cm5zIHs/c3RyaW5nfSBOZXh0IHRva2VuIG9yIGBudWxsYCBvbiBlb2ZcclxuICAgICAqIEBpbm5lclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBuZXh0KCkge1xyXG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICByZXR1cm4gc3RhY2suc2hpZnQoKTtcclxuICAgICAgICBpZiAoc3RyaW5nRGVsaW0pXHJcbiAgICAgICAgICAgIHJldHVybiByZWFkU3RyaW5nKCk7XHJcbiAgICAgICAgdmFyIHJlcGVhdCxcclxuICAgICAgICAgICAgcHJldixcclxuICAgICAgICAgICAgY3VycixcclxuICAgICAgICAgICAgc3RhcnQsXHJcbiAgICAgICAgICAgIGlzQ29tbWVudDtcclxuICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgIGlmIChvZmZzZXQgPT09IGxlbmd0aClcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICByZXBlYXQgPSBmYWxzZTtcclxuICAgICAgICAgICAgd2hpbGUgKHdoaXRlc3BhY2VSZS50ZXN0KGN1cnIgPSBjaGFyQXQob2Zmc2V0KSkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyID09PSBcIlxcblwiKVxyXG4gICAgICAgICAgICAgICAgICAgICsrbGluZTtcclxuICAgICAgICAgICAgICAgIGlmICgrK29mZnNldCA9PT0gbGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjaGFyQXQob2Zmc2V0KSA9PT0gXCIvXCIpIHtcclxuICAgICAgICAgICAgICAgIGlmICgrK29mZnNldCA9PT0gbGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGlsbGVnYWwoXCJjb21tZW50XCIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNoYXJBdChvZmZzZXQpID09PSBcIi9cIikgeyAvLyBMaW5lXHJcbiAgICAgICAgICAgICAgICAgICAgaXNDb21tZW50ID0gY2hhckF0KHN0YXJ0ID0gb2Zmc2V0ICsgMSkgPT09IFwiL1wiO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChjaGFyQXQoKytvZmZzZXQpICE9PSBcIlxcblwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2Zmc2V0ID09PSBsZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICArK29mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb21tZW50KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDb21tZW50KHN0YXJ0LCBvZmZzZXQgLSAxKTtcclxuICAgICAgICAgICAgICAgICAgICArK2xpbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVwZWF0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoKGN1cnIgPSBjaGFyQXQob2Zmc2V0KSkgPT09IFwiKlwiKSB7IC8qIEJsb2NrICovXHJcbiAgICAgICAgICAgICAgICAgICAgaXNDb21tZW50ID0gY2hhckF0KHN0YXJ0ID0gb2Zmc2V0ICsgMSkgPT09IFwiKlwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGRvIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnIgPT09IFwiXFxuXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArK2xpbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgrK29mZnNldCA9PT0gbGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgaWxsZWdhbChcImNvbW1lbnRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXYgPSBjdXJyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyID0gY2hhckF0KG9mZnNldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSB3aGlsZSAocHJldiAhPT0gXCIqXCIgfHwgY3VyciAhPT0gXCIvXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICsrb2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbW1lbnQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldENvbW1lbnQoc3RhcnQsIG9mZnNldCAtIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcGVhdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCIvXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IHdoaWxlIChyZXBlYXQpO1xyXG5cclxuICAgICAgICAvLyBvZmZzZXQgIT09IGxlbmd0aCBpZiB3ZSBnb3QgaGVyZVxyXG5cclxuICAgICAgICB2YXIgZW5kID0gb2Zmc2V0O1xyXG4gICAgICAgIGRlbGltUmUubGFzdEluZGV4ID0gMDtcclxuICAgICAgICB2YXIgZGVsaW0gPSBkZWxpbVJlLnRlc3QoY2hhckF0KGVuZCsrKSk7XHJcbiAgICAgICAgaWYgKCFkZWxpbSlcclxuICAgICAgICAgICAgd2hpbGUgKGVuZCA8IGxlbmd0aCAmJiAhZGVsaW1SZS50ZXN0KGNoYXJBdChlbmQpKSlcclxuICAgICAgICAgICAgICAgICsrZW5kO1xyXG4gICAgICAgIHZhciB0b2tlbiA9IHNvdXJjZS5zdWJzdHJpbmcob2Zmc2V0LCBvZmZzZXQgPSBlbmQpO1xyXG4gICAgICAgIGlmICh0b2tlbiA9PT0gXCJcXFwiXCIgfHwgdG9rZW4gPT09IFwiJ1wiKVxyXG4gICAgICAgICAgICBzdHJpbmdEZWxpbSA9IHRva2VuO1xyXG4gICAgICAgIHJldHVybiB0b2tlbjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFB1c2hlcyBhIHRva2VuIGJhY2sgdG8gdGhlIHN0YWNrLlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIFRva2VuXHJcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gICAgICogQGlubmVyXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHB1c2godG9rZW4pIHtcclxuICAgICAgICBzdGFjay5wdXNoKHRva2VuKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlZWtzIGZvciB0aGUgbmV4dCB0b2tlbi5cclxuICAgICAqIEByZXR1cm5zIHs/c3RyaW5nfSBUb2tlbiBvciBgbnVsbGAgb24gZW9mXHJcbiAgICAgKiBAaW5uZXJcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gcGVlaygpIHtcclxuICAgICAgICBpZiAoIXN0YWNrLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB2YXIgdG9rZW4gPSBuZXh0KCk7XHJcbiAgICAgICAgICAgIGlmICh0b2tlbiA9PT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBwdXNoKHRva2VuKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHN0YWNrWzBdO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2tpcHMgYSB0b2tlbi5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHBlY3RlZCBFeHBlY3RlZCB0b2tlblxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9uYWw9ZmFsc2VdIFdoZXRoZXIgdGhlIHRva2VuIGlzIG9wdGlvbmFsXHJcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gYHRydWVgIHdoZW4gc2tpcHBlZCwgYGZhbHNlYCBpZiBub3RcclxuICAgICAqIEB0aHJvd3Mge0Vycm9yfSBXaGVuIGEgcmVxdWlyZWQgdG9rZW4gaXMgbm90IHByZXNlbnRcclxuICAgICAqIEBpbm5lclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBza2lwKGV4cGVjdGVkLCBvcHRpb25hbCkge1xyXG4gICAgICAgIHZhciBhY3R1YWwgPSBwZWVrKCksXHJcbiAgICAgICAgICAgIGVxdWFscyA9IGFjdHVhbCA9PT0gZXhwZWN0ZWQ7XHJcbiAgICAgICAgaWYgKGVxdWFscykge1xyXG4gICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIW9wdGlvbmFsKVxyXG4gICAgICAgICAgICB0aHJvdyBpbGxlZ2FsKFwidG9rZW4gJ1wiICsgYWN0dWFsICsgXCInLCAnXCIgKyBleHBlY3RlZCArIFwiJyBleHBlY3RlZFwiKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXRzIGEgY29tbWVudC5cclxuICAgICAqIEBwYXJhbSB7bnVtYmVyPX0gdHJhaWxpbmdMaW5lIFRyYWlsaW5nIGxpbmUgbnVtYmVyIGlmIGFwcGxpY2FibGVcclxuICAgICAqIEByZXR1cm5zIHs/c3RyaW5nfSBDb21tZW50IHRleHRcclxuICAgICAqIEBpbm5lclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBjbW50KHRyYWlsaW5nTGluZSkge1xyXG4gICAgICAgIHZhciByZXQ7XHJcbiAgICAgICAgaWYgKHRyYWlsaW5nTGluZSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICByZXQgPSBjb21tZW50TGluZSA9PT0gbGluZSAtIDEgJiYgY29tbWVudFRleHQgfHwgbnVsbDtcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKCFjb21tZW50VGV4dClcclxuICAgICAgICAgICAgICAgIHBlZWsoKTtcclxuICAgICAgICAgICAgcmV0ID0gY29tbWVudExpbmUgPT09IHRyYWlsaW5nTGluZSAmJiBjb21tZW50VHlwZSA9PT0gXCIvXCIgJiYgY29tbWVudFRleHQgfHwgbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29tbWVudFR5cGUgPSBjb21tZW50VGV4dCA9IG51bGw7XHJcbiAgICAgICAgY29tbWVudExpbmUgPSAwO1xyXG4gICAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBuZXh0LFxyXG4gICAgICAgIHBlZWs6IHBlZWssXHJcbiAgICAgICAgcHVzaDogcHVzaCxcclxuICAgICAgICBza2lwOiBza2lwLFxyXG4gICAgICAgIGxpbmU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbGluZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNtbnQ6IGNtbnRcclxuICAgIH07XHJcbiAgICAvKiBlc2xpbnQtZW5hYmxlIGNhbGxiYWNrLXJldHVybiAqL1xyXG59XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFR5cGU7XHJcblxyXG4vLyBleHRlbmRzIE5hbWVzcGFjZVxyXG52YXIgTmFtZXNwYWNlID0gcmVxdWlyZShcIi4vbmFtZXNwYWNlXCIpO1xyXG4oKFR5cGUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShOYW1lc3BhY2UucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBUeXBlKS5jbGFzc05hbWUgPSBcIlR5cGVcIjtcclxuXHJcbnZhciBFbnVtICAgICAgPSByZXF1aXJlKFwiLi9lbnVtXCIpLFxyXG4gICAgT25lT2YgICAgID0gcmVxdWlyZShcIi4vb25lb2ZcIiksXHJcbiAgICBGaWVsZCAgICAgPSByZXF1aXJlKFwiLi9maWVsZFwiKSxcclxuICAgIE1hcEZpZWxkICA9IHJlcXVpcmUoXCIuL21hcGZpZWxkXCIpLFxyXG4gICAgU2VydmljZSAgID0gcmVxdWlyZShcIi4vc2VydmljZVwiKSxcclxuICAgIENsYXNzICAgICA9IHJlcXVpcmUoXCIuL2NsYXNzXCIpLFxyXG4gICAgTWVzc2FnZSAgID0gcmVxdWlyZShcIi4vbWVzc2FnZVwiKSxcclxuICAgIFJlYWRlciAgICA9IHJlcXVpcmUoXCIuL3JlYWRlclwiKSxcclxuICAgIFdyaXRlciAgICA9IHJlcXVpcmUoXCIuL3dyaXRlclwiKSxcclxuICAgIHV0aWwgICAgICA9IHJlcXVpcmUoXCIuL3V0aWxcIiksXHJcbiAgICBlbmNvZGVyICAgPSByZXF1aXJlKFwiLi9lbmNvZGVyXCIpLFxyXG4gICAgZGVjb2RlciAgID0gcmVxdWlyZShcIi4vZGVjb2RlclwiKSxcclxuICAgIHZlcmlmaWVyICA9IHJlcXVpcmUoXCIuL3ZlcmlmaWVyXCIpLFxyXG4gICAgY29udmVydGVyID0gcmVxdWlyZShcIi4vY29udmVydGVyXCIpO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgcmVmbGVjdGVkIG1lc3NhZ2UgdHlwZSBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBSZWZsZWN0ZWQgbWVzc2FnZSB0eXBlLlxyXG4gKiBAZXh0ZW5kcyBOYW1lc3BhY2VCYXNlXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBNZXNzYWdlIG5hbWVcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIERlY2xhcmVkIG9wdGlvbnNcclxuICovXHJcbmZ1bmN0aW9uIFR5cGUobmFtZSwgb3B0aW9ucykge1xyXG4gICAgTmFtZXNwYWNlLmNhbGwodGhpcywgbmFtZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBNZXNzYWdlIGZpZWxkcy5cclxuICAgICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxGaWVsZD59XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZmllbGRzID0ge307ICAvLyB0b0pTT04sIG1hcmtlclxyXG5cclxuICAgIC8qKlxyXG4gICAgICogT25lb2ZzIGRlY2xhcmVkIHdpdGhpbiB0aGlzIG5hbWVzcGFjZSwgaWYgYW55LlxyXG4gICAgICogQHR5cGUge09iamVjdC48c3RyaW5nLE9uZU9mPn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5vbmVvZnMgPSB1bmRlZmluZWQ7IC8vIHRvSlNPTlxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRXh0ZW5zaW9uIHJhbmdlcywgaWYgYW55LlxyXG4gICAgICogQHR5cGUge251bWJlcltdW119XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZXh0ZW5zaW9ucyA9IHVuZGVmaW5lZDsgLy8gdG9KU09OXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXNlcnZlZCByYW5nZXMsIGlmIGFueS5cclxuICAgICAqIEB0eXBlIHtBcnJheS48bnVtYmVyW118c3RyaW5nPn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXNlcnZlZCA9IHVuZGVmaW5lZDsgLy8gdG9KU09OXHJcblxyXG4gICAgLyo/XHJcbiAgICAgKiBXaGV0aGVyIHRoaXMgdHlwZSBpcyBhIGxlZ2FjeSBncm91cC5cclxuICAgICAqIEB0eXBlIHtib29sZWFufHVuZGVmaW5lZH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5ncm91cCA9IHVuZGVmaW5lZDsgLy8gdG9KU09OXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWNoZWQgZmllbGRzIGJ5IGlkLlxyXG4gICAgICogQHR5cGUgez9PYmplY3QuPG51bWJlcixGaWVsZD59XHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICB0aGlzLl9maWVsZHNCeUlkID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENhY2hlZCBmaWVsZHMgYXMgYW4gYXJyYXkuXHJcbiAgICAgKiBAdHlwZSB7P0ZpZWxkW119XHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICB0aGlzLl9maWVsZHNBcnJheSA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWNoZWQgb25lb2ZzIGFzIGFuIGFycmF5LlxyXG4gICAgICogQHR5cGUgez9PbmVPZltdfVxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgdGhpcy5fb25lb2ZzQXJyYXkgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FjaGVkIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHR5cGUgeyp9XHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICB0aGlzLl9jdG9yID0gbnVsbDtcclxufVxyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoVHlwZS5wcm90b3R5cGUsIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE1lc3NhZ2UgZmllbGRzIGJ5IGlkLlxyXG4gICAgICogQG5hbWUgVHlwZSNmaWVsZHNCeUlkXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxudW1iZXIsRmllbGQ+fVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIGZpZWxkc0J5SWQ6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9maWVsZHNCeUlkKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZpZWxkc0J5SWQ7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9maWVsZHNCeUlkID0ge307XHJcbiAgICAgICAgICAgIGZvciAodmFyIG5hbWVzID0gT2JqZWN0LmtleXModGhpcy5maWVsZHMpLCBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZmllbGQgPSB0aGlzLmZpZWxkc1tuYW1lc1tpXV0sXHJcbiAgICAgICAgICAgICAgICAgICAgaWQgPSBmaWVsZC5pZDtcclxuXHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9maWVsZHNCeUlkW2lkXSlcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcImR1cGxpY2F0ZSBpZCBcIiArIGlkICsgXCIgaW4gXCIgKyB0aGlzKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9maWVsZHNCeUlkW2lkXSA9IGZpZWxkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9maWVsZHNCeUlkO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaWVsZHMgb2YgdGhpcyBtZXNzYWdlIGFzIGFuIGFycmF5IGZvciBpdGVyYXRpb24uXHJcbiAgICAgKiBAbmFtZSBUeXBlI2ZpZWxkc0FycmF5XHJcbiAgICAgKiBAdHlwZSB7RmllbGRbXX1cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBmaWVsZHNBcnJheToge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9maWVsZHNBcnJheSB8fCAodGhpcy5fZmllbGRzQXJyYXkgPSB1dGlsLnRvQXJyYXkodGhpcy5maWVsZHMpKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogT25lb2ZzIG9mIHRoaXMgbWVzc2FnZSBhcyBhbiBhcnJheSBmb3IgaXRlcmF0aW9uLlxyXG4gICAgICogQG5hbWUgVHlwZSNvbmVvZnNBcnJheVxyXG4gICAgICogQHR5cGUge09uZU9mW119XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgb25lb2ZzQXJyYXk6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb25lb2ZzQXJyYXkgfHwgKHRoaXMuX29uZW9mc0FycmF5ID0gdXRpbC50b0FycmF5KHRoaXMub25lb2ZzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSByZWdpc3RlcmVkIGNvbnN0cnVjdG9yLCBpZiBhbnkgcmVnaXN0ZXJlZCwgb3RoZXJ3aXNlIGEgZ2VuZXJpYyBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEFzc2lnbmluZyBhIGZ1bmN0aW9uIHJlcGxhY2VzIHRoZSBpbnRlcm5hbCBjb25zdHJ1Y3Rvci4gSWYgdGhlIGZ1bmN0aW9uIGRvZXMgbm90IGV4dGVuZCB7QGxpbmsgTWVzc2FnZX0geWV0LCBpdHMgcHJvdG90eXBlIHdpbGwgYmUgc2V0dXAgYWNjb3JkaW5nbHkgYW5kIHN0YXRpYyBtZXRob2RzIHdpbGwgYmUgcG9wdWxhdGVkLiBJZiBpdCBhbHJlYWR5IGV4dGVuZHMge0BsaW5rIE1lc3NhZ2V9LCBpdCB3aWxsIGp1c3QgcmVwbGFjZSB0aGUgaW50ZXJuYWwgY29uc3RydWN0b3IuXHJcbiAgICAgKiBAbmFtZSBUeXBlI2N0b3JcclxuICAgICAqIEB0eXBlIHtDbGFzc31cclxuICAgICAqL1xyXG4gICAgY3Rvcjoge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jdG9yIHx8ICh0aGlzLl9jdG9yID0gQ2xhc3ModGhpcykuY29uc3RydWN0b3IpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbihjdG9yKSB7XHJcbiAgICAgICAgICAgIGlmIChjdG9yICYmICEoY3Rvci5wcm90b3R5cGUgaW5zdGFuY2VvZiBNZXNzYWdlKSlcclxuICAgICAgICAgICAgICAgIENsYXNzKHRoaXMsIGN0b3IpO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9jdG9yID0gY3RvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gY2xlYXJDYWNoZSh0eXBlKSB7XHJcbiAgICB0eXBlLl9maWVsZHNCeUlkID0gdHlwZS5fZmllbGRzQXJyYXkgPSB0eXBlLl9vbmVvZnNBcnJheSA9IHR5cGUuX2N0b3IgPSBudWxsO1xyXG4gICAgZGVsZXRlIHR5cGUuZW5jb2RlO1xyXG4gICAgZGVsZXRlIHR5cGUuZGVjb2RlO1xyXG4gICAgZGVsZXRlIHR5cGUudmVyaWZ5O1xyXG4gICAgcmV0dXJuIHR5cGU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNZXNzYWdlIHR5cGUgZGVzY3JpcHRvci5cclxuICogQHR5cGVkZWYgVHlwZURlc2NyaXB0b3JcclxuICogQHR5cGUge09iamVjdH1cclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywqPn0gW29wdGlvbnNdIE1lc3NhZ2UgdHlwZSBvcHRpb25zXHJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsT25lT2ZEZXNjcmlwdG9yPn0gW29uZW9mc10gT25lb2YgZGVzY3JpcHRvcnNcclxuICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZyxGaWVsZERlc2NyaXB0b3I+fSBmaWVsZHMgRmllbGQgZGVzY3JpcHRvcnNcclxuICogQHByb3BlcnR5IHtudW1iZXJbXVtdfSBbZXh0ZW5zaW9uc10gRXh0ZW5zaW9uIHJhbmdlc1xyXG4gKiBAcHJvcGVydHkge251bWJlcltdW119IFtyZXNlcnZlZF0gUmVzZXJ2ZWQgcmFuZ2VzXHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2dyb3VwPWZhbHNlXSBXaGV0aGVyIGEgbGVnYWN5IGdyb3VwIG9yIG5vdFxyXG4gKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLEFueU5lc3RlZERlc2NyaXB0b3I+fSBbbmVzdGVkXSBOZXN0ZWQgb2JqZWN0IGRlc2NyaXB0b3JzXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBtZXNzYWdlIHR5cGUgZnJvbSBhIG1lc3NhZ2UgdHlwZSBkZXNjcmlwdG9yLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBNZXNzYWdlIG5hbWVcclxuICogQHBhcmFtIHtUeXBlRGVzY3JpcHRvcn0ganNvbiBNZXNzYWdlIHR5cGUgZGVzY3JpcHRvclxyXG4gKiBAcmV0dXJucyB7VHlwZX0gQ3JlYXRlZCBtZXNzYWdlIHR5cGVcclxuICovXHJcblR5cGUuZnJvbUpTT04gPSBmdW5jdGlvbiBmcm9tSlNPTihuYW1lLCBqc29uKSB7XHJcbiAgICB2YXIgdHlwZSA9IG5ldyBUeXBlKG5hbWUsIGpzb24ub3B0aW9ucyk7XHJcbiAgICB0eXBlLmV4dGVuc2lvbnMgPSBqc29uLmV4dGVuc2lvbnM7XHJcbiAgICB0eXBlLnJlc2VydmVkID0ganNvbi5yZXNlcnZlZDtcclxuICAgIHZhciBuYW1lcyA9IE9iamVjdC5rZXlzKGpzb24uZmllbGRzKSxcclxuICAgICAgICBpID0gMDtcclxuICAgIGZvciAoOyBpIDwgbmFtZXMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgdHlwZS5hZGQoXHJcbiAgICAgICAgICAgICggdHlwZW9mIGpzb24uZmllbGRzW25hbWVzW2ldXS5rZXlUeXBlICE9PSBcInVuZGVmaW5lZFwiXHJcbiAgICAgICAgICAgID8gTWFwRmllbGQuZnJvbUpTT05cclxuICAgICAgICAgICAgOiBGaWVsZC5mcm9tSlNPTiApKG5hbWVzW2ldLCBqc29uLmZpZWxkc1tuYW1lc1tpXV0pXHJcbiAgICAgICAgKTtcclxuICAgIGlmIChqc29uLm9uZW9mcylcclxuICAgICAgICBmb3IgKG5hbWVzID0gT2JqZWN0LmtleXMoanNvbi5vbmVvZnMpLCBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICB0eXBlLmFkZChPbmVPZi5mcm9tSlNPTihuYW1lc1tpXSwganNvbi5vbmVvZnNbbmFtZXNbaV1dKSk7XHJcbiAgICBpZiAoanNvbi5uZXN0ZWQpXHJcbiAgICAgICAgZm9yIChuYW1lcyA9IE9iamVjdC5rZXlzKGpzb24ubmVzdGVkKSwgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICB2YXIgbmVzdGVkID0ganNvbi5uZXN0ZWRbbmFtZXNbaV1dO1xyXG4gICAgICAgICAgICB0eXBlLmFkZCggLy8gbW9zdCB0byBsZWFzdCBsaWtlbHlcclxuICAgICAgICAgICAgICAgICggbmVzdGVkLmlkICE9PSB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgID8gRmllbGQuZnJvbUpTT05cclxuICAgICAgICAgICAgICAgIDogbmVzdGVkLmZpZWxkcyAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICA/IFR5cGUuZnJvbUpTT05cclxuICAgICAgICAgICAgICAgIDogbmVzdGVkLnZhbHVlcyAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICA/IEVudW0uZnJvbUpTT05cclxuICAgICAgICAgICAgICAgIDogbmVzdGVkLm1ldGhvZHMgIT09IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgPyBTZXJ2aWNlLmZyb21KU09OXHJcbiAgICAgICAgICAgICAgICA6IE5hbWVzcGFjZS5mcm9tSlNPTiApKG5hbWVzW2ldLCBuZXN0ZWQpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgaWYgKGpzb24uZXh0ZW5zaW9ucyAmJiBqc29uLmV4dGVuc2lvbnMubGVuZ3RoKVxyXG4gICAgICAgIHR5cGUuZXh0ZW5zaW9ucyA9IGpzb24uZXh0ZW5zaW9ucztcclxuICAgIGlmIChqc29uLnJlc2VydmVkICYmIGpzb24ucmVzZXJ2ZWQubGVuZ3RoKVxyXG4gICAgICAgIHR5cGUucmVzZXJ2ZWQgPSBqc29uLnJlc2VydmVkO1xyXG4gICAgaWYgKGpzb24uZ3JvdXApXHJcbiAgICAgICAgdHlwZS5ncm91cCA9IHRydWU7XHJcbiAgICByZXR1cm4gdHlwZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIG1lc3NhZ2UgdHlwZSB0byBhIG1lc3NhZ2UgdHlwZSBkZXNjcmlwdG9yLlxyXG4gKiBAcmV0dXJucyB7VHlwZURlc2NyaXB0b3J9IE1lc3NhZ2UgdHlwZSBkZXNjcmlwdG9yXHJcbiAqL1xyXG5UeXBlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XHJcbiAgICB2YXIgaW5oZXJpdGVkID0gTmFtZXNwYWNlLnByb3RvdHlwZS50b0pTT04uY2FsbCh0aGlzKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgb3B0aW9ucyAgICA6IGluaGVyaXRlZCAmJiBpbmhlcml0ZWQub3B0aW9ucyB8fCB1bmRlZmluZWQsXHJcbiAgICAgICAgb25lb2ZzICAgICA6IE5hbWVzcGFjZS5hcnJheVRvSlNPTih0aGlzLm9uZW9mc0FycmF5KSxcclxuICAgICAgICBmaWVsZHMgICAgIDogTmFtZXNwYWNlLmFycmF5VG9KU09OKHRoaXMuZmllbGRzQXJyYXkuZmlsdGVyKGZ1bmN0aW9uKG9iaikgeyByZXR1cm4gIW9iai5kZWNsYXJpbmdGaWVsZDsgfSkpIHx8IHt9LFxyXG4gICAgICAgIGV4dGVuc2lvbnMgOiB0aGlzLmV4dGVuc2lvbnMgJiYgdGhpcy5leHRlbnNpb25zLmxlbmd0aCA/IHRoaXMuZXh0ZW5zaW9ucyA6IHVuZGVmaW5lZCxcclxuICAgICAgICByZXNlcnZlZCAgIDogdGhpcy5yZXNlcnZlZCAmJiB0aGlzLnJlc2VydmVkLmxlbmd0aCA/IHRoaXMucmVzZXJ2ZWQgOiB1bmRlZmluZWQsXHJcbiAgICAgICAgZ3JvdXAgICAgICA6IHRoaXMuZ3JvdXAgfHwgdW5kZWZpbmVkLFxyXG4gICAgICAgIG5lc3RlZCAgICAgOiBpbmhlcml0ZWQgJiYgaW5oZXJpdGVkLm5lc3RlZCB8fCB1bmRlZmluZWRcclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogQG92ZXJyaWRlXHJcbiAqL1xyXG5UeXBlLnByb3RvdHlwZS5yZXNvbHZlQWxsID0gZnVuY3Rpb24gcmVzb2x2ZUFsbCgpIHtcclxuICAgIHZhciBmaWVsZHMgPSB0aGlzLmZpZWxkc0FycmF5LCBpID0gMDtcclxuICAgIHdoaWxlIChpIDwgZmllbGRzLmxlbmd0aClcclxuICAgICAgICBmaWVsZHNbaSsrXS5yZXNvbHZlKCk7XHJcbiAgICB2YXIgb25lb2ZzID0gdGhpcy5vbmVvZnNBcnJheTsgaSA9IDA7XHJcbiAgICB3aGlsZSAoaSA8IG9uZW9mcy5sZW5ndGgpXHJcbiAgICAgICAgb25lb2ZzW2krK10ucmVzb2x2ZSgpO1xyXG4gICAgcmV0dXJuIE5hbWVzcGFjZS5wcm90b3R5cGUucmVzb2x2ZS5jYWxsKHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0KG5hbWUpIHtcclxuICAgIHJldHVybiB0aGlzLmZpZWxkc1tuYW1lXVxyXG4gICAgICAgIHx8IHRoaXMub25lb2ZzICYmIHRoaXMub25lb2ZzW25hbWVdXHJcbiAgICAgICAgfHwgdGhpcy5uZXN0ZWQgJiYgdGhpcy5uZXN0ZWRbbmFtZV1cclxuICAgICAgICB8fCBudWxsO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXN0ZWQgb2JqZWN0IHRvIHRoaXMgdHlwZS5cclxuICogQHBhcmFtIHtSZWZsZWN0aW9uT2JqZWN0fSBvYmplY3QgTmVzdGVkIG9iamVjdCB0byBhZGRcclxuICogQHJldHVybnMge1R5cGV9IGB0aGlzYFxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGFyZ3VtZW50cyBhcmUgaW52YWxpZFxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlcmUgaXMgYWxyZWFkeSBhIG5lc3RlZCBvYmplY3Qgd2l0aCB0aGlzIG5hbWUgb3IsIGlmIGEgZmllbGQsIHdoZW4gdGhlcmUgaXMgYWxyZWFkeSBhIGZpZWxkIHdpdGggdGhpcyBpZFxyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkKG9iamVjdCkge1xyXG5cclxuICAgIGlmICh0aGlzLmdldChvYmplY3QubmFtZSkpXHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJkdXBsaWNhdGUgbmFtZSAnXCIgKyBvYmplY3QubmFtZSArIFwiJyBpbiBcIiArIHRoaXMpO1xyXG5cclxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBGaWVsZCAmJiBvYmplY3QuZXh0ZW5kID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAvLyBOT1RFOiBFeHRlbnNpb24gZmllbGRzIGFyZW4ndCBhY3R1YWwgZmllbGRzIG9uIHRoZSBkZWNsYXJpbmcgdHlwZSwgYnV0IG5lc3RlZCBvYmplY3RzLlxyXG4gICAgICAgIC8vIFRoZSByb290IG9iamVjdCB0YWtlcyBjYXJlIG9mIGFkZGluZyBkaXN0aW5jdCBzaXN0ZXItZmllbGRzIHRvIHRoZSByZXNwZWN0aXZlIGV4dGVuZGVkXHJcbiAgICAgICAgLy8gdHlwZSBpbnN0ZWFkLlxyXG5cclxuICAgICAgICAvLyBhdm9pZHMgY2FsbGluZyB0aGUgZ2V0dGVyIGlmIG5vdCBhYnNvbHV0ZWx5IG5lY2Vzc2FyeSBiZWNhdXNlIGl0J3MgY2FsbGVkIHF1aXRlIGZyZXF1ZW50bHlcclxuICAgICAgICBpZiAodGhpcy5fZmllbGRzQnlJZCA/IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIHRoaXMuX2ZpZWxkc0J5SWRbb2JqZWN0LmlkXSA6IHRoaXMuZmllbGRzQnlJZFtvYmplY3QuaWRdKVxyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcImR1cGxpY2F0ZSBpZCBcIiArIG9iamVjdC5pZCArIFwiIGluIFwiICsgdGhpcyk7XHJcbiAgICAgICAgaWYgKHRoaXMuaXNSZXNlcnZlZElkKG9iamVjdC5pZCkpXHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiaWQgXCIgKyBvYmplY3QuaWQgKyBcIiBpcyByZXNlcnZlZCBpbiBcIiArIHRoaXMpO1xyXG4gICAgICAgIGlmICh0aGlzLmlzUmVzZXJ2ZWROYW1lKG9iamVjdC5uYW1lKSlcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJuYW1lICdcIiArIG9iamVjdC5uYW1lICsgXCInIGlzIHJlc2VydmVkIGluIFwiICsgdGhpcyk7XHJcblxyXG4gICAgICAgIGlmIChvYmplY3QucGFyZW50KVxyXG4gICAgICAgICAgICBvYmplY3QucGFyZW50LnJlbW92ZShvYmplY3QpO1xyXG4gICAgICAgIHRoaXMuZmllbGRzW29iamVjdC5uYW1lXSA9IG9iamVjdDtcclxuICAgICAgICBvYmplY3QubWVzc2FnZSA9IHRoaXM7XHJcbiAgICAgICAgb2JqZWN0Lm9uQWRkKHRoaXMpO1xyXG4gICAgICAgIHJldHVybiBjbGVhckNhY2hlKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIE9uZU9mKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLm9uZW9mcylcclxuICAgICAgICAgICAgdGhpcy5vbmVvZnMgPSB7fTtcclxuICAgICAgICB0aGlzLm9uZW9mc1tvYmplY3QubmFtZV0gPSBvYmplY3Q7XHJcbiAgICAgICAgb2JqZWN0Lm9uQWRkKHRoaXMpO1xyXG4gICAgICAgIHJldHVybiBjbGVhckNhY2hlKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIE5hbWVzcGFjZS5wcm90b3R5cGUuYWRkLmNhbGwodGhpcywgb2JqZWN0KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmVzIGEgbmVzdGVkIG9iamVjdCBmcm9tIHRoaXMgdHlwZS5cclxuICogQHBhcmFtIHtSZWZsZWN0aW9uT2JqZWN0fSBvYmplY3QgTmVzdGVkIG9iamVjdCB0byByZW1vdmVcclxuICogQHJldHVybnMge1R5cGV9IGB0aGlzYFxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGFyZ3VtZW50cyBhcmUgaW52YWxpZFxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgYG9iamVjdGAgaXMgbm90IGEgbWVtYmVyIG9mIHRoaXMgdHlwZVxyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKG9iamVjdCkge1xyXG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIEZpZWxkICYmIG9iamVjdC5leHRlbmQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIC8vIFNlZSBUeXBlI2FkZCBmb3IgdGhlIHJlYXNvbiB3aHkgZXh0ZW5zaW9uIGZpZWxkcyBhcmUgZXhjbHVkZWQgaGVyZS5cclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCF0aGlzLmZpZWxkcyB8fCB0aGlzLmZpZWxkc1tvYmplY3QubmFtZV0gIT09IG9iamVjdClcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3Iob2JqZWN0ICsgXCIgaXMgbm90IGEgbWVtYmVyIG9mIFwiICsgdGhpcyk7XHJcblxyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmZpZWxkc1tvYmplY3QubmFtZV07XHJcbiAgICAgICAgb2JqZWN0LnBhcmVudCA9IG51bGw7XHJcbiAgICAgICAgb2JqZWN0Lm9uUmVtb3ZlKHRoaXMpO1xyXG4gICAgICAgIHJldHVybiBjbGVhckNhY2hlKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIE9uZU9mKSB7XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICghdGhpcy5vbmVvZnMgfHwgdGhpcy5vbmVvZnNbb2JqZWN0Lm5hbWVdICE9PSBvYmplY3QpXHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKG9iamVjdCArIFwiIGlzIG5vdCBhIG1lbWJlciBvZiBcIiArIHRoaXMpO1xyXG5cclxuICAgICAgICBkZWxldGUgdGhpcy5vbmVvZnNbb2JqZWN0Lm5hbWVdO1xyXG4gICAgICAgIG9iamVjdC5wYXJlbnQgPSBudWxsO1xyXG4gICAgICAgIG9iamVjdC5vblJlbW92ZSh0aGlzKTtcclxuICAgICAgICByZXR1cm4gY2xlYXJDYWNoZSh0aGlzKTtcclxuICAgIH1cclxuICAgIHJldHVybiBOYW1lc3BhY2UucHJvdG90eXBlLnJlbW92ZS5jYWxsKHRoaXMsIG9iamVjdCk7XHJcbn07XHJcblxyXG4vKipcclxuICogVGVzdHMgaWYgdGhlIHNwZWNpZmllZCBpZCBpcyByZXNlcnZlZC5cclxuICogQHBhcmFtIHtudW1iZXJ9IGlkIElkIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiByZXNlcnZlZCwgb3RoZXJ3aXNlIGBmYWxzZWBcclxuICovXHJcblR5cGUucHJvdG90eXBlLmlzUmVzZXJ2ZWRJZCA9IGZ1bmN0aW9uIGlzUmVzZXJ2ZWRJZChpZCkge1xyXG4gICAgaWYgKHRoaXMucmVzZXJ2ZWQpXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnJlc2VydmVkLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMucmVzZXJ2ZWRbaV0gIT09IFwic3RyaW5nXCIgJiYgdGhpcy5yZXNlcnZlZFtpXVswXSA8PSBpZCAmJiB0aGlzLnJlc2VydmVkW2ldWzFdID49IGlkKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogVGVzdHMgaWYgdGhlIHNwZWNpZmllZCBuYW1lIGlzIHJlc2VydmVkLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiByZXNlcnZlZCwgb3RoZXJ3aXNlIGBmYWxzZWBcclxuICovXHJcblR5cGUucHJvdG90eXBlLmlzUmVzZXJ2ZWROYW1lID0gZnVuY3Rpb24gaXNSZXNlcnZlZE5hbWUobmFtZSkge1xyXG4gICAgaWYgKHRoaXMucmVzZXJ2ZWQpXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnJlc2VydmVkLmxlbmd0aDsgKytpKVxyXG4gICAgICAgICAgICBpZiAodGhpcy5yZXNlcnZlZFtpXSA9PT0gbmFtZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgbWVzc2FnZSBvZiB0aGlzIHR5cGUgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcclxuICogQHJldHVybnMge01lc3NhZ2V9IFJ1bnRpbWUgbWVzc2FnZVxyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcclxuICAgIHJldHVybiBuZXcgdGhpcy5jdG9yKHByb3BlcnRpZXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldHMgdXAge0BsaW5rIFR5cGUjZW5jb2RlfGVuY29kZX0sIHtAbGluayBUeXBlI2RlY29kZXxkZWNvZGV9IGFuZCB7QGxpbmsgVHlwZSN2ZXJpZnl8dmVyaWZ5fS5cclxuICogQHJldHVybnMge1R5cGV9IGB0aGlzYFxyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUuc2V0dXAgPSBmdW5jdGlvbiBzZXR1cCgpIHtcclxuICAgIC8vIFNldHMgdXAgZXZlcnl0aGluZyBhdCBvbmNlIHNvIHRoYXQgdGhlIHByb3RvdHlwZSBjaGFpbiBkb2VzIG5vdCBoYXZlIHRvIGJlIHJlLWV2YWx1YXRlZFxyXG4gICAgLy8gbXVsdGlwbGUgdGltZXMgKFY4LCBzb2Z0LWRlb3B0IHByb3RvdHlwZS1jaGVjaykuXHJcbiAgICB2YXIgZnVsbE5hbWUgPSB0aGlzLmZ1bGxOYW1lLFxyXG4gICAgICAgIHR5cGVzICAgID0gW107XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IC8qIGluaXRpYWxpemVzICovIHRoaXMuZmllbGRzQXJyYXkubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgdHlwZXMucHVzaCh0aGlzLl9maWVsZHNBcnJheVtpXS5yZXNvbHZlKCkucmVzb2x2ZWRUeXBlKTtcclxuICAgIHRoaXMuZW5jb2RlID0gZW5jb2Rlcih0aGlzKS5lb2YoZnVsbE5hbWUgKyBcIiRlbmNvZGVcIiwge1xyXG4gICAgICAgIFdyaXRlciA6IFdyaXRlcixcclxuICAgICAgICB0eXBlcyAgOiB0eXBlcyxcclxuICAgICAgICB1dGlsICAgOiB1dGlsXHJcbiAgICB9KTtcclxuICAgIHRoaXMuZGVjb2RlID0gZGVjb2Rlcih0aGlzKS5lb2YoZnVsbE5hbWUgKyBcIiRkZWNvZGVcIiwge1xyXG4gICAgICAgIFJlYWRlciA6IFJlYWRlcixcclxuICAgICAgICB0eXBlcyAgOiB0eXBlcyxcclxuICAgICAgICB1dGlsICAgOiB1dGlsXHJcbiAgICB9KTtcclxuICAgIHRoaXMudmVyaWZ5ID0gdmVyaWZpZXIodGhpcykuZW9mKGZ1bGxOYW1lICsgXCIkdmVyaWZ5XCIsIHtcclxuICAgICAgICB0eXBlcyA6IHR5cGVzLFxyXG4gICAgICAgIHV0aWwgIDogdXRpbFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmZyb21PYmplY3QgPSB0aGlzLmZyb20gPSBjb252ZXJ0ZXIuZnJvbU9iamVjdCh0aGlzKS5lb2YoZnVsbE5hbWUgKyBcIiRmcm9tT2JqZWN0XCIsIHtcclxuICAgICAgICB0eXBlcyA6IHR5cGVzLFxyXG4gICAgICAgIHV0aWwgIDogdXRpbFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLnRvT2JqZWN0ID0gY29udmVydGVyLnRvT2JqZWN0KHRoaXMpLmVvZihmdWxsTmFtZSArIFwiJHRvT2JqZWN0XCIsIHtcclxuICAgICAgICB0eXBlcyA6IHR5cGVzLFxyXG4gICAgICAgIHV0aWwgIDogdXRpbFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbmNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIFR5cGUjdmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXHJcbiAqIEBwYXJhbSB7TWVzc2FnZXxPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBNZXNzYWdlIGluc3RhbmNlIG9yIHBsYWluIG9iamVjdFxyXG4gKiBAcGFyYW0ge1dyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSB3cml0ZXJcclxuICovXHJcblR5cGUucHJvdG90eXBlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZV9zZXR1cChtZXNzYWdlLCB3cml0ZXIpIHtcclxuICAgIHJldHVybiB0aGlzLnNldHVwKCkuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcik7IC8vIG92ZXJyaWRlcyB0aGlzIG1ldGhvZFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEVuY29kZXMgYSBtZXNzYWdlIG9mIHRoaXMgdHlwZSBwcmVjZWVkZWQgYnkgaXRzIGJ5dGUgbGVuZ3RoIGFzIGEgdmFyaW50LiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBUeXBlI3ZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxyXG4gKiBAcGFyYW0ge01lc3NhZ2V8T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgTWVzc2FnZSBpbnN0YW5jZSBvciBwbGFpbiBvYmplY3RcclxuICogQHBhcmFtIHtXcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cclxuICogQHJldHVybnMge1dyaXRlcn0gd3JpdGVyXHJcbiAqL1xyXG5UeXBlLnByb3RvdHlwZS5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyICYmIHdyaXRlci5sZW4gPyB3cml0ZXIuZm9yaygpIDogd3JpdGVyKS5sZGVsaW0oKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWNvZGVzIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUuXHJcbiAqIEBwYXJhbSB7UmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBMZW5ndGggb2YgdGhlIG1lc3NhZ2UsIGlmIGtub3duIGJlZm9yZWhhbmRcclxuICogQHJldHVybnMge01lc3NhZ2V9IERlY29kZWQgbWVzc2FnZVxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxyXG4gKiBAdGhyb3dzIHt1dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlX3NldHVwKHJlYWRlciwgbGVuZ3RoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5zZXR1cCgpLmRlY29kZShyZWFkZXIsIGxlbmd0aCk7IC8vIG92ZXJyaWRlcyB0aGlzIG1ldGhvZFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlY29kZXMgYSBtZXNzYWdlIG9mIHRoaXMgdHlwZSBwcmVjZWVkZWQgYnkgaXRzIGJ5dGUgbGVuZ3RoIGFzIGEgdmFyaW50LlxyXG4gKiBAcGFyYW0ge1JlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxyXG4gKiBAcmV0dXJucyB7TWVzc2FnZX0gRGVjb2RlZCBtZXNzYWdlXHJcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXHJcbiAqIEB0aHJvd3Mge3V0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXHJcbiAqL1xyXG5UeXBlLnByb3RvdHlwZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XHJcbiAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiBSZWFkZXIpKVxyXG4gICAgICAgIHJlYWRlciA9IFJlYWRlci5jcmVhdGUocmVhZGVyKTtcclxuICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XHJcbn07XHJcblxyXG4vKipcclxuICogVmVyaWZpZXMgdGhhdCBmaWVsZCB2YWx1ZXMgYXJlIHZhbGlkIGFuZCB0aGF0IHJlcXVpcmVkIGZpZWxkcyBhcmUgcHJlc2VudC5cclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XHJcbiAqIEByZXR1cm5zIHs/c3RyaW5nfSBgbnVsbGAgaWYgdmFsaWQsIG90aGVyd2lzZSB0aGUgcmVhc29uIHdoeSBpdCBpcyBub3RcclxuICovXHJcblR5cGUucHJvdG90eXBlLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeV9zZXR1cChtZXNzYWdlKSB7XHJcbiAgICByZXR1cm4gdGhpcy5zZXR1cCgpLnZlcmlmeShtZXNzYWdlKTsgLy8gb3ZlcnJpZGVzIHRoaXMgbWV0aG9kXHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBtZXNzYWdlIG9mIHRoaXMgdHlwZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0IHRvIGNvbnZlcnRcclxuICogQHJldHVybnMge01lc3NhZ2V9IE1lc3NhZ2UgaW5zdGFuY2VcclxuICovXHJcblR5cGUucHJvdG90eXBlLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xyXG4gICAgcmV0dXJuIHRoaXMuc2V0dXAoKS5mcm9tT2JqZWN0KG9iamVjdCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBtZXNzYWdlIG9mIHRoaXMgdHlwZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxyXG4gKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayBUeXBlI2Zyb21PYmplY3R9LlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxyXG4gKiBAcmV0dXJucyB7TWVzc2FnZX0gTWVzc2FnZSBpbnN0YW5jZVxyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUuZnJvbSA9IFR5cGUucHJvdG90eXBlLmZyb21PYmplY3Q7XHJcblxyXG4vKipcclxuICogQ29udmVyc2lvbiBvcHRpb25zIGFzIHVzZWQgYnkge0BsaW5rIFR5cGUjdG9PYmplY3R9IGFuZCB7QGxpbmsgTWVzc2FnZS50b09iamVjdH0uXHJcbiAqIEB0eXBlZGVmIENvbnZlcnNpb25PcHRpb25zXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7Kn0gW2xvbmdzXSBMb25nIGNvbnZlcnNpb24gdHlwZS5cclxuICogVmFsaWQgdmFsdWVzIGFyZSBgU3RyaW5nYCBhbmQgYE51bWJlcmAgKHRoZSBnbG9iYWwgdHlwZXMpLlxyXG4gKiBEZWZhdWx0cyB0byBjb3B5IHRoZSBwcmVzZW50IHZhbHVlLCB3aGljaCBpcyBhIHBvc3NpYmx5IHVuc2FmZSBudW1iZXIgd2l0aG91dCBhbmQgYSB7QGxpbmsgTG9uZ30gd2l0aCBhIGxvbmcgbGlicmFyeS5cclxuICogQHByb3BlcnR5IHsqfSBbZW51bXNdIEVudW0gdmFsdWUgY29udmVyc2lvbiB0eXBlLlxyXG4gKiBPbmx5IHZhbGlkIHZhbHVlIGlzIGBTdHJpbmdgICh0aGUgZ2xvYmFsIHR5cGUpLlxyXG4gKiBEZWZhdWx0cyB0byBjb3B5IHRoZSBwcmVzZW50IHZhbHVlLCB3aGljaCBpcyB0aGUgbnVtZXJpYyBpZC5cclxuICogQHByb3BlcnR5IHsqfSBbYnl0ZXNdIEJ5dGVzIHZhbHVlIGNvbnZlcnNpb24gdHlwZS5cclxuICogVmFsaWQgdmFsdWVzIGFyZSBgQXJyYXlgIGFuZCAoYSBiYXNlNjQgZW5jb2RlZCkgYFN0cmluZ2AgKHRoZSBnbG9iYWwgdHlwZXMpLlxyXG4gKiBEZWZhdWx0cyB0byBjb3B5IHRoZSBwcmVzZW50IHZhbHVlLCB3aGljaCB1c3VhbGx5IGlzIGEgQnVmZmVyIHVuZGVyIG5vZGUgYW5kIGFuIFVpbnQ4QXJyYXkgaW4gdGhlIGJyb3dzZXIuXHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2RlZmF1bHRzPWZhbHNlXSBBbHNvIHNldHMgZGVmYXVsdCB2YWx1ZXMgb24gdGhlIHJlc3VsdGluZyBvYmplY3RcclxuICogQHByb3BlcnR5IHtib29sZWFufSBbYXJyYXlzPWZhbHNlXSBTZXRzIGVtcHR5IGFycmF5cyBmb3IgbWlzc2luZyByZXBlYXRlZCBmaWVsZHMgZXZlbiBpZiBgZGVmYXVsdHM9ZmFsc2VgXHJcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW29iamVjdHM9ZmFsc2VdIFNldHMgZW1wdHkgb2JqZWN0cyBmb3IgbWlzc2luZyBtYXAgZmllbGRzIGV2ZW4gaWYgYGRlZmF1bHRzPWZhbHNlYFxyXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtvbmVvZnM9ZmFsc2VdIEluY2x1ZGVzIHZpcnR1YWwgb25lb2YgcHJvcGVydGllcyBzZXQgdG8gdGhlIHByZXNlbnQgZmllbGQncyBuYW1lLCBpZiBhbnlcclxuICovXHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgbWVzc2FnZSBvZiB0aGlzIHR5cGUuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cclxuICogQHBhcmFtIHtNZXNzYWdlfSBtZXNzYWdlIE1lc3NhZ2UgaW5zdGFuY2VcclxuICogQHBhcmFtIHtDb252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xyXG4gKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxyXG4gKi9cclxuVHlwZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5zZXR1cCgpLnRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8qKlxyXG4gKiBDb21tb24gdHlwZSBjb25zdGFudHMuXHJcbiAqIEBuYW1lc3BhY2VcclxuICovXHJcbnZhciB0eXBlcyA9IGV4cG9ydHM7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcblxyXG52YXIgcyA9IFtcclxuICAgIFwiZG91YmxlXCIsICAgLy8gMFxyXG4gICAgXCJmbG9hdFwiLCAgICAvLyAxXHJcbiAgICBcImludDMyXCIsICAgIC8vIDJcclxuICAgIFwidWludDMyXCIsICAgLy8gM1xyXG4gICAgXCJzaW50MzJcIiwgICAvLyA0XHJcbiAgICBcImZpeGVkMzJcIiwgIC8vIDVcclxuICAgIFwic2ZpeGVkMzJcIiwgLy8gNlxyXG4gICAgXCJpbnQ2NFwiLCAgICAvLyA3XHJcbiAgICBcInVpbnQ2NFwiLCAgIC8vIDhcclxuICAgIFwic2ludDY0XCIsICAgLy8gOVxyXG4gICAgXCJmaXhlZDY0XCIsICAvLyAxMFxyXG4gICAgXCJzZml4ZWQ2NFwiLCAvLyAxMVxyXG4gICAgXCJib29sXCIsICAgICAvLyAxMlxyXG4gICAgXCJzdHJpbmdcIiwgICAvLyAxM1xyXG4gICAgXCJieXRlc1wiICAgICAvLyAxNFxyXG5dO1xyXG5cclxuZnVuY3Rpb24gYmFrZSh2YWx1ZXMsIG9mZnNldCkge1xyXG4gICAgdmFyIGkgPSAwLCBvID0ge307XHJcbiAgICBvZmZzZXQgfD0gMDtcclxuICAgIHdoaWxlIChpIDwgdmFsdWVzLmxlbmd0aCkgb1tzW2kgKyBvZmZzZXRdXSA9IHZhbHVlc1tpKytdO1xyXG4gICAgcmV0dXJuIG87XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCYXNpYyB0eXBlIHdpcmUgdHlwZXMuXHJcbiAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxudW1iZXI+fVxyXG4gKiBAY29uc3RcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGRvdWJsZT0xIEZpeGVkNjQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBmbG9hdD01IEZpeGVkMzIgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBpbnQzMj0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHVpbnQzMj0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNpbnQzMj0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGZpeGVkMzI9NSBGaXhlZDMyIHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ZpeGVkMzI9NSBGaXhlZDMyIHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gaW50NjQ9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSB1aW50NjQ9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzaW50NjQ9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBmaXhlZDY0PTEgRml4ZWQ2NCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNmaXhlZDY0PTEgRml4ZWQ2NCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGJvb2w9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzdHJpbmc9MiBMZGVsaW0gd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBieXRlcz0yIExkZWxpbSB3aXJlIHR5cGVcclxuICovXHJcbnR5cGVzLmJhc2ljID0gYmFrZShbXHJcbiAgICAvKiBkb3VibGUgICAqLyAxLFxyXG4gICAgLyogZmxvYXQgICAgKi8gNSxcclxuICAgIC8qIGludDMyICAgICovIDAsXHJcbiAgICAvKiB1aW50MzIgICAqLyAwLFxyXG4gICAgLyogc2ludDMyICAgKi8gMCxcclxuICAgIC8qIGZpeGVkMzIgICovIDUsXHJcbiAgICAvKiBzZml4ZWQzMiAqLyA1LFxyXG4gICAgLyogaW50NjQgICAgKi8gMCxcclxuICAgIC8qIHVpbnQ2NCAgICovIDAsXHJcbiAgICAvKiBzaW50NjQgICAqLyAwLFxyXG4gICAgLyogZml4ZWQ2NCAgKi8gMSxcclxuICAgIC8qIHNmaXhlZDY0ICovIDEsXHJcbiAgICAvKiBib29sICAgICAqLyAwLFxyXG4gICAgLyogc3RyaW5nICAgKi8gMixcclxuICAgIC8qIGJ5dGVzICAgICovIDJcclxuXSk7XHJcblxyXG4vKipcclxuICogQmFzaWMgdHlwZSBkZWZhdWx0cy5cclxuICogQHR5cGUge09iamVjdC48c3RyaW5nLCo+fVxyXG4gKiBAY29uc3RcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGRvdWJsZT0wIERvdWJsZSBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBmbG9hdD0wIEZsb2F0IGRlZmF1bHRcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGludDMyPTAgSW50MzIgZGVmYXVsdFxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gdWludDMyPTAgVWludDMyIGRlZmF1bHRcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNpbnQzMj0wIFNpbnQzMiBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBmaXhlZDMyPTAgRml4ZWQzMiBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzZml4ZWQzMj0wIFNmaXhlZDMyIGRlZmF1bHRcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGludDY0PTAgSW50NjQgZGVmYXVsdFxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gdWludDY0PTAgVWludDY0IGRlZmF1bHRcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNpbnQ2ND0wIFNpbnQzMiBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBmaXhlZDY0PTAgRml4ZWQ2NCBkZWZhdWx0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzZml4ZWQ2ND0wIFNmaXhlZDY0IGRlZmF1bHRcclxuICogQHByb3BlcnR5IHtib29sZWFufSBib29sPWZhbHNlIEJvb2wgZGVmYXVsdFxyXG4gKiBAcHJvcGVydHkge3N0cmluZ30gc3RyaW5nPVwiXCIgU3RyaW5nIGRlZmF1bHRcclxuICogQHByb3BlcnR5IHtBcnJheS48bnVtYmVyPn0gYnl0ZXM9QXJyYXkoMCkgQnl0ZXMgZGVmYXVsdFxyXG4gKiBAcHJvcGVydHkge01lc3NhZ2V9IG1lc3NhZ2U9bnVsbCBNZXNzYWdlIGRlZmF1bHRcclxuICovXHJcbnR5cGVzLmRlZmF1bHRzID0gYmFrZShbXHJcbiAgICAvKiBkb3VibGUgICAqLyAwLFxyXG4gICAgLyogZmxvYXQgICAgKi8gMCxcclxuICAgIC8qIGludDMyICAgICovIDAsXHJcbiAgICAvKiB1aW50MzIgICAqLyAwLFxyXG4gICAgLyogc2ludDMyICAgKi8gMCxcclxuICAgIC8qIGZpeGVkMzIgICovIDAsXHJcbiAgICAvKiBzZml4ZWQzMiAqLyAwLFxyXG4gICAgLyogaW50NjQgICAgKi8gMCxcclxuICAgIC8qIHVpbnQ2NCAgICovIDAsXHJcbiAgICAvKiBzaW50NjQgICAqLyAwLFxyXG4gICAgLyogZml4ZWQ2NCAgKi8gMCxcclxuICAgIC8qIHNmaXhlZDY0ICovIDAsXHJcbiAgICAvKiBib29sICAgICAqLyBmYWxzZSxcclxuICAgIC8qIHN0cmluZyAgICovIFwiXCIsXHJcbiAgICAvKiBieXRlcyAgICAqLyB1dGlsLmVtcHR5QXJyYXksXHJcbiAgICAvKiBtZXNzYWdlICAqLyBudWxsXHJcbl0pO1xyXG5cclxuLyoqXHJcbiAqIEJhc2ljIGxvbmcgdHlwZSB3aXJlIHR5cGVzLlxyXG4gKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsbnVtYmVyPn1cclxuICogQGNvbnN0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBpbnQ2ND0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHVpbnQ2ND0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNpbnQ2ND0wIFZhcmludCB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGZpeGVkNjQ9MSBGaXhlZDY0IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ZpeGVkNjQ9MSBGaXhlZDY0IHdpcmUgdHlwZVxyXG4gKi9cclxudHlwZXMubG9uZyA9IGJha2UoW1xyXG4gICAgLyogaW50NjQgICAgKi8gMCxcclxuICAgIC8qIHVpbnQ2NCAgICovIDAsXHJcbiAgICAvKiBzaW50NjQgICAqLyAwLFxyXG4gICAgLyogZml4ZWQ2NCAgKi8gMSxcclxuICAgIC8qIHNmaXhlZDY0ICovIDFcclxuXSwgNyk7XHJcblxyXG4vKipcclxuICogQWxsb3dlZCB0eXBlcyBmb3IgbWFwIGtleXMgd2l0aCB0aGVpciBhc3NvY2lhdGVkIHdpcmUgdHlwZS5cclxuICogQHR5cGUge09iamVjdC48c3RyaW5nLG51bWJlcj59XHJcbiAqIEBjb25zdFxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gaW50MzI9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSB1aW50MzI9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzaW50MzI9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBmaXhlZDMyPTUgRml4ZWQzMiB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNmaXhlZDMyPTUgRml4ZWQzMiB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGludDY0PTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gdWludDY0PTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ludDY0PTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZml4ZWQ2ND0xIEZpeGVkNjQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzZml4ZWQ2ND0xIEZpeGVkNjQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBib29sPTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc3RyaW5nPTIgTGRlbGltIHdpcmUgdHlwZVxyXG4gKi9cclxudHlwZXMubWFwS2V5ID0gYmFrZShbXHJcbiAgICAvKiBpbnQzMiAgICAqLyAwLFxyXG4gICAgLyogdWludDMyICAgKi8gMCxcclxuICAgIC8qIHNpbnQzMiAgICovIDAsXHJcbiAgICAvKiBmaXhlZDMyICAqLyA1LFxyXG4gICAgLyogc2ZpeGVkMzIgKi8gNSxcclxuICAgIC8qIGludDY0ICAgICovIDAsXHJcbiAgICAvKiB1aW50NjQgICAqLyAwLFxyXG4gICAgLyogc2ludDY0ICAgKi8gMCxcclxuICAgIC8qIGZpeGVkNjQgICovIDEsXHJcbiAgICAvKiBzZml4ZWQ2NCAqLyAxLFxyXG4gICAgLyogYm9vbCAgICAgKi8gMCxcclxuICAgIC8qIHN0cmluZyAgICovIDJcclxuXSwgMik7XHJcblxyXG4vKipcclxuICogQWxsb3dlZCB0eXBlcyBmb3IgcGFja2VkIHJlcGVhdGVkIGZpZWxkcyB3aXRoIHRoZWlyIGFzc29jaWF0ZWQgd2lyZSB0eXBlLlxyXG4gKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsbnVtYmVyPn1cclxuICogQGNvbnN0XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBkb3VibGU9MSBGaXhlZDY0IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZmxvYXQ9NSBGaXhlZDMyIHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gaW50MzI9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSB1aW50MzI9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzaW50MzI9MCBWYXJpbnQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBmaXhlZDMyPTUgRml4ZWQzMiB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNmaXhlZDMyPTUgRml4ZWQzMiB3aXJlIHR5cGVcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGludDY0PTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gdWludDY0PTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2ludDY0PTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gZml4ZWQ2ND0xIEZpeGVkNjQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzZml4ZWQ2ND0xIEZpeGVkNjQgd2lyZSB0eXBlXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBib29sPTAgVmFyaW50IHdpcmUgdHlwZVxyXG4gKi9cclxudHlwZXMucGFja2VkID0gYmFrZShbXHJcbiAgICAvKiBkb3VibGUgICAqLyAxLFxyXG4gICAgLyogZmxvYXQgICAgKi8gNSxcclxuICAgIC8qIGludDMyICAgICovIDAsXHJcbiAgICAvKiB1aW50MzIgICAqLyAwLFxyXG4gICAgLyogc2ludDMyICAgKi8gMCxcclxuICAgIC8qIGZpeGVkMzIgICovIDUsXHJcbiAgICAvKiBzZml4ZWQzMiAqLyA1LFxyXG4gICAgLyogaW50NjQgICAgKi8gMCxcclxuICAgIC8qIHVpbnQ2NCAgICovIDAsXHJcbiAgICAvKiBzaW50NjQgICAqLyAwLFxyXG4gICAgLyogZml4ZWQ2NCAgKi8gMSxcclxuICAgIC8qIHNmaXhlZDY0ICovIDEsXHJcbiAgICAvKiBib29sICAgICAqLyAwXHJcbl0pO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8qKlxyXG4gKiBWYXJpb3VzIHV0aWxpdHkgZnVuY3Rpb25zLlxyXG4gKiBAbmFtZXNwYWNlXHJcbiAqL1xyXG52YXIgdXRpbCA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxudXRpbC5jb2RlZ2VuID0gcmVxdWlyZShcIkBwcm90b2J1ZmpzL2NvZGVnZW5cIik7XHJcbnV0aWwuZmV0Y2ggICA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9mZXRjaFwiKTtcclxudXRpbC5wYXRoICAgID0gcmVxdWlyZShcIkBwcm90b2J1ZmpzL3BhdGhcIik7XHJcblxyXG4vKipcclxuICogTm9kZSdzIGZzIG1vZHVsZSBpZiBhdmFpbGFibGUuXHJcbiAqIEB0eXBlIHtPYmplY3QuPHN0cmluZywqPn1cclxuICovXHJcbnV0aWwuZnMgPSB1dGlsLmlucXVpcmUoXCJmc1wiKTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyBhbiBvYmplY3QncyB2YWx1ZXMgdG8gYW4gYXJyYXkuXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBPYmplY3QgdG8gY29udmVydFxyXG4gKiBAcmV0dXJucyB7QXJyYXkuPCo+fSBDb252ZXJ0ZWQgYXJyYXlcclxuICovXHJcbnV0aWwudG9BcnJheSA9IGZ1bmN0aW9uIHRvQXJyYXkob2JqZWN0KSB7XHJcbiAgICB2YXIgYXJyYXkgPSBbXTtcclxuICAgIGlmIChvYmplY3QpXHJcbiAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdCksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgYXJyYXkucHVzaChvYmplY3Rba2V5c1tpXV0pO1xyXG4gICAgcmV0dXJuIGFycmF5O1xyXG59O1xyXG5cclxudmFyIHNhZmVQcm9wQmFja3NsYXNoUmUgPSAvXFxcXC9nLFxyXG4gICAgc2FmZVByb3BRdW90ZVJlICAgICA9IC9cIi9nO1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgYSBzYWZlIHByb3BlcnR5IGFjY2Vzc29yIGZvciB0aGUgc3BlY2lmaWVkIHByb3Blcmx5IG5hbWUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wIFByb3BlcnR5IG5hbWVcclxuICogQHJldHVybnMge3N0cmluZ30gU2FmZSBhY2Nlc3NvclxyXG4gKi9cclxudXRpbC5zYWZlUHJvcCA9IGZ1bmN0aW9uIHNhZmVQcm9wKHByb3ApIHtcclxuICAgIHJldHVybiBcIltcXFwiXCIgKyBwcm9wLnJlcGxhY2Uoc2FmZVByb3BCYWNrc2xhc2hSZSwgXCJcXFxcXFxcXFwiKS5yZXBsYWNlKHNhZmVQcm9wUXVvdGVSZSwgXCJcXFxcXFxcIlwiKSArIFwiXFxcIl1cIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGUgZmlyc3QgY2hhcmFjdGVyIG9mIGEgc3RyaW5nIHRvIHVwcGVyIGNhc2UuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHIgU3RyaW5nIHRvIGNvbnZlcnRcclxuICogQHJldHVybnMge3N0cmluZ30gQ29udmVydGVkIHN0cmluZ1xyXG4gKi9cclxudXRpbC51Y0ZpcnN0ID0gZnVuY3Rpb24gdWNGaXJzdChzdHIpIHtcclxuICAgIHJldHVybiBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc3Vic3RyaW5nKDEpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbXBhcmVzIHJlZmxlY3RlZCBmaWVsZHMgYnkgaWQuXHJcbiAqIEBwYXJhbSB7RmllbGR9IGEgRmlyc3QgZmllbGRcclxuICogQHBhcmFtIHtGaWVsZH0gYiBTZWNvbmQgZmllbGRcclxuICogQHJldHVybnMge251bWJlcn0gQ29tcGFyaXNvbiB2YWx1ZVxyXG4gKi9cclxudXRpbC5jb21wYXJlRmllbGRzQnlJZCA9IGZ1bmN0aW9uIGNvbXBhcmVGaWVsZHNCeUlkKGEsIGIpIHtcclxuICAgIHJldHVybiBhLmlkIC0gYi5pZDtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gTG9uZ0JpdHM7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuLi91dGlsL21pbmltYWxcIik7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBuZXcgbG9uZyBiaXRzLlxyXG4gKiBAY2xhc3NkZXNjIEhlbHBlciBjbGFzcyBmb3Igd29ya2luZyB3aXRoIHRoZSBsb3cgYW5kIGhpZ2ggYml0cyBvZiBhIDY0IGJpdCB2YWx1ZS5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBsbyBMb3cgMzIgYml0cywgdW5zaWduZWRcclxuICogQHBhcmFtIHtudW1iZXJ9IGhpIEhpZ2ggMzIgYml0cywgdW5zaWduZWRcclxuICovXHJcbmZ1bmN0aW9uIExvbmdCaXRzKGxvLCBoaSkge1xyXG5cclxuICAgIC8vIG5vdGUgdGhhdCB0aGUgY2FzdHMgYmVsb3cgYXJlIHRoZW9yZXRpY2FsbHkgdW5uZWNlc3NhcnkgYXMgb2YgdG9kYXksIGJ1dCBvbGRlciBzdGF0aWNhbGx5XHJcbiAgICAvLyBnZW5lcmF0ZWQgY29udmVydGVyIGNvZGUgbWlnaHQgc3RpbGwgY2FsbCB0aGUgY3RvciB3aXRoIHNpZ25lZCAzMmJpdHMuIGtlcHQgZm9yIGNvbXBhdC5cclxuXHJcbiAgICAvKipcclxuICAgICAqIExvdyBiaXRzLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5sbyA9IGxvID4+PiAwO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGlnaCBiaXRzLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5oaSA9IGhpID4+PiAwO1xyXG59XHJcblxyXG4vKipcclxuICogWmVybyBiaXRzLlxyXG4gKiBAbWVtYmVyb2YgdXRpbC5Mb25nQml0c1xyXG4gKiBAdHlwZSB7dXRpbC5Mb25nQml0c31cclxuICovXHJcbnZhciB6ZXJvID0gTG9uZ0JpdHMuemVybyA9IG5ldyBMb25nQml0cygwLCAwKTtcclxuXHJcbnplcm8udG9OdW1iZXIgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XHJcbnplcm8uenpFbmNvZGUgPSB6ZXJvLnp6RGVjb2RlID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9O1xyXG56ZXJvLmxlbmd0aCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMTsgfTtcclxuXHJcbi8qKlxyXG4gKiBaZXJvIGhhc2guXHJcbiAqIEBtZW1iZXJvZiB1dGlsLkxvbmdCaXRzXHJcbiAqIEB0eXBlIHtzdHJpbmd9XHJcbiAqL1xyXG52YXIgemVyb0hhc2ggPSBMb25nQml0cy56ZXJvSGFzaCA9IFwiXFwwXFwwXFwwXFwwXFwwXFwwXFwwXFwwXCI7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBuZXcgbG9uZyBiaXRzIGZyb20gdGhlIHNwZWNpZmllZCBudW1iZXIuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSBWYWx1ZVxyXG4gKiBAcmV0dXJucyB7dXRpbC5Mb25nQml0c30gSW5zdGFuY2VcclxuICovXHJcbkxvbmdCaXRzLmZyb21OdW1iZXIgPSBmdW5jdGlvbiBmcm9tTnVtYmVyKHZhbHVlKSB7XHJcbiAgICBpZiAodmFsdWUgPT09IDApXHJcbiAgICAgICAgcmV0dXJuIHplcm87XHJcbiAgICB2YXIgc2lnbiA9IHZhbHVlIDwgMDtcclxuICAgIGlmIChzaWduKVxyXG4gICAgICAgIHZhbHVlID0gLXZhbHVlO1xyXG4gICAgdmFyIGxvID0gdmFsdWUgPj4+IDAsXHJcbiAgICAgICAgaGkgPSAodmFsdWUgLSBsbykgLyA0Mjk0OTY3Mjk2ID4+PiAwO1xyXG4gICAgaWYgKHNpZ24pIHtcclxuICAgICAgICBoaSA9IH5oaSA+Pj4gMDtcclxuICAgICAgICBsbyA9IH5sbyA+Pj4gMDtcclxuICAgICAgICBpZiAoKytsbyA+IDQyOTQ5NjcyOTUpIHtcclxuICAgICAgICAgICAgbG8gPSAwO1xyXG4gICAgICAgICAgICBpZiAoKytoaSA+IDQyOTQ5NjcyOTUpXHJcbiAgICAgICAgICAgICAgICBoaSA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5ldyBMb25nQml0cyhsbywgaGkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgbmV3IGxvbmcgYml0cyBmcm9tIGEgbnVtYmVyLCBsb25nIG9yIHN0cmluZy5cclxuICogQHBhcmFtIHtMb25nfG51bWJlcnxzdHJpbmd9IHZhbHVlIFZhbHVlXHJcbiAqIEByZXR1cm5zIHt1dGlsLkxvbmdCaXRzfSBJbnN0YW5jZVxyXG4gKi9cclxuTG9uZ0JpdHMuZnJvbSA9IGZ1bmN0aW9uIGZyb20odmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpXHJcbiAgICAgICAgcmV0dXJuIExvbmdCaXRzLmZyb21OdW1iZXIodmFsdWUpO1xyXG4gICAgaWYgKHV0aWwuaXNTdHJpbmcodmFsdWUpKSB7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICBpZiAodXRpbC5Mb25nKVxyXG4gICAgICAgICAgICB2YWx1ZSA9IHV0aWwuTG9uZy5mcm9tU3RyaW5nKHZhbHVlKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBMb25nQml0cy5mcm9tTnVtYmVyKHBhcnNlSW50KHZhbHVlLCAxMCkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlLmxvdyB8fCB2YWx1ZS5oaWdoID8gbmV3IExvbmdCaXRzKHZhbHVlLmxvdyA+Pj4gMCwgdmFsdWUuaGlnaCA+Pj4gMCkgOiB6ZXJvO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoaXMgbG9uZyBiaXRzIHRvIGEgcG9zc2libHkgdW5zYWZlIEphdmFTY3JpcHQgbnVtYmVyLlxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFt1bnNpZ25lZD1mYWxzZV0gV2hldGhlciB1bnNpZ25lZCBvciBub3RcclxuICogQHJldHVybnMge251bWJlcn0gUG9zc2libHkgdW5zYWZlIG51bWJlclxyXG4gKi9cclxuTG9uZ0JpdHMucHJvdG90eXBlLnRvTnVtYmVyID0gZnVuY3Rpb24gdG9OdW1iZXIodW5zaWduZWQpIHtcclxuICAgIGlmICghdW5zaWduZWQgJiYgdGhpcy5oaSA+Pj4gMzEpIHtcclxuICAgICAgICB2YXIgbG8gPSB+dGhpcy5sbyArIDEgPj4+IDAsXHJcbiAgICAgICAgICAgIGhpID0gfnRoaXMuaGkgICAgID4+PiAwO1xyXG4gICAgICAgIGlmICghbG8pXHJcbiAgICAgICAgICAgIGhpID0gaGkgKyAxID4+PiAwO1xyXG4gICAgICAgIHJldHVybiAtKGxvICsgaGkgKiA0Mjk0OTY3Mjk2KTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzLmxvICsgdGhpcy5oaSAqIDQyOTQ5NjcyOTY7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhpcyBsb25nIGJpdHMgdG8gYSBsb25nLlxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFt1bnNpZ25lZD1mYWxzZV0gV2hldGhlciB1bnNpZ25lZCBvciBub3RcclxuICogQHJldHVybnMge0xvbmd9IExvbmdcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS50b0xvbmcgPSBmdW5jdGlvbiB0b0xvbmcodW5zaWduZWQpIHtcclxuICAgIHJldHVybiB1dGlsLkxvbmdcclxuICAgICAgICA/IG5ldyB1dGlsLkxvbmcodGhpcy5sbyB8IDAsIHRoaXMuaGkgfCAwLCBCb29sZWFuKHVuc2lnbmVkKSlcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIDogeyBsb3c6IHRoaXMubG8gfCAwLCBoaWdoOiB0aGlzLmhpIHwgMCwgdW5zaWduZWQ6IEJvb2xlYW4odW5zaWduZWQpIH07XHJcbn07XHJcblxyXG52YXIgY2hhckNvZGVBdCA9IFN0cmluZy5wcm90b3R5cGUuY2hhckNvZGVBdDtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIG5ldyBsb25nIGJpdHMgZnJvbSB0aGUgc3BlY2lmaWVkIDggY2hhcmFjdGVycyBsb25nIGhhc2guXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBoYXNoIEhhc2hcclxuICogQHJldHVybnMge3V0aWwuTG9uZ0JpdHN9IEJpdHNcclxuICovXHJcbkxvbmdCaXRzLmZyb21IYXNoID0gZnVuY3Rpb24gZnJvbUhhc2goaGFzaCkge1xyXG4gICAgaWYgKGhhc2ggPT09IHplcm9IYXNoKVxyXG4gICAgICAgIHJldHVybiB6ZXJvO1xyXG4gICAgcmV0dXJuIG5ldyBMb25nQml0cyhcclxuICAgICAgICAoIGNoYXJDb2RlQXQuY2FsbChoYXNoLCAwKVxyXG4gICAgICAgIHwgY2hhckNvZGVBdC5jYWxsKGhhc2gsIDEpIDw8IDhcclxuICAgICAgICB8IGNoYXJDb2RlQXQuY2FsbChoYXNoLCAyKSA8PCAxNlxyXG4gICAgICAgIHwgY2hhckNvZGVBdC5jYWxsKGhhc2gsIDMpIDw8IDI0KSA+Pj4gMFxyXG4gICAgLFxyXG4gICAgICAgICggY2hhckNvZGVBdC5jYWxsKGhhc2gsIDQpXHJcbiAgICAgICAgfCBjaGFyQ29kZUF0LmNhbGwoaGFzaCwgNSkgPDwgOFxyXG4gICAgICAgIHwgY2hhckNvZGVBdC5jYWxsKGhhc2gsIDYpIDw8IDE2XHJcbiAgICAgICAgfCBjaGFyQ29kZUF0LmNhbGwoaGFzaCwgNykgPDwgMjQpID4+PiAwXHJcbiAgICApO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoaXMgbG9uZyBiaXRzIHRvIGEgOCBjaGFyYWN0ZXJzIGxvbmcgaGFzaC5cclxuICogQHJldHVybnMge3N0cmluZ30gSGFzaFxyXG4gKi9cclxuTG9uZ0JpdHMucHJvdG90eXBlLnRvSGFzaCA9IGZ1bmN0aW9uIHRvSGFzaCgpIHtcclxuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKFxyXG4gICAgICAgIHRoaXMubG8gICAgICAgICYgMjU1LFxyXG4gICAgICAgIHRoaXMubG8gPj4+IDggICYgMjU1LFxyXG4gICAgICAgIHRoaXMubG8gPj4+IDE2ICYgMjU1LFxyXG4gICAgICAgIHRoaXMubG8gPj4+IDI0ICAgICAgLFxyXG4gICAgICAgIHRoaXMuaGkgICAgICAgICYgMjU1LFxyXG4gICAgICAgIHRoaXMuaGkgPj4+IDggICYgMjU1LFxyXG4gICAgICAgIHRoaXMuaGkgPj4+IDE2ICYgMjU1LFxyXG4gICAgICAgIHRoaXMuaGkgPj4+IDI0XHJcbiAgICApO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFppZy16YWcgZW5jb2RlcyB0aGlzIGxvbmcgYml0cy5cclxuICogQHJldHVybnMge3V0aWwuTG9uZ0JpdHN9IGB0aGlzYFxyXG4gKi9cclxuTG9uZ0JpdHMucHJvdG90eXBlLnp6RW5jb2RlID0gZnVuY3Rpb24genpFbmNvZGUoKSB7XHJcbiAgICB2YXIgbWFzayA9ICAgdGhpcy5oaSA+PiAzMTtcclxuICAgIHRoaXMuaGkgID0gKCh0aGlzLmhpIDw8IDEgfCB0aGlzLmxvID4+PiAzMSkgXiBtYXNrKSA+Pj4gMDtcclxuICAgIHRoaXMubG8gID0gKCB0aGlzLmxvIDw8IDEgICAgICAgICAgICAgICAgICAgXiBtYXNrKSA+Pj4gMDtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFppZy16YWcgZGVjb2RlcyB0aGlzIGxvbmcgYml0cy5cclxuICogQHJldHVybnMge3V0aWwuTG9uZ0JpdHN9IGB0aGlzYFxyXG4gKi9cclxuTG9uZ0JpdHMucHJvdG90eXBlLnp6RGVjb2RlID0gZnVuY3Rpb24genpEZWNvZGUoKSB7XHJcbiAgICB2YXIgbWFzayA9IC0odGhpcy5sbyAmIDEpO1xyXG4gICAgdGhpcy5sbyAgPSAoKHRoaXMubG8gPj4+IDEgfCB0aGlzLmhpIDw8IDMxKSBeIG1hc2spID4+PiAwO1xyXG4gICAgdGhpcy5oaSAgPSAoIHRoaXMuaGkgPj4+IDEgICAgICAgICAgICAgICAgICBeIG1hc2spID4+PiAwO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgbGVuZ3RoIG9mIHRoaXMgbG9uZ2JpdHMgd2hlbiBlbmNvZGVkIGFzIGEgdmFyaW50LlxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBMZW5ndGhcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiBsZW5ndGgoKSB7XHJcbiAgICB2YXIgcGFydDAgPSAgdGhpcy5sbyxcclxuICAgICAgICBwYXJ0MSA9ICh0aGlzLmxvID4+PiAyOCB8IHRoaXMuaGkgPDwgNCkgPj4+IDAsXHJcbiAgICAgICAgcGFydDIgPSAgdGhpcy5oaSA+Pj4gMjQ7XHJcbiAgICByZXR1cm4gcGFydDIgPT09IDBcclxuICAgICAgICAgPyBwYXJ0MSA9PT0gMFxyXG4gICAgICAgICAgID8gcGFydDAgPCAxNjM4NFxyXG4gICAgICAgICAgICAgPyBwYXJ0MCA8IDEyOCA/IDEgOiAyXHJcbiAgICAgICAgICAgICA6IHBhcnQwIDwgMjA5NzE1MiA/IDMgOiA0XHJcbiAgICAgICAgICAgOiBwYXJ0MSA8IDE2Mzg0XHJcbiAgICAgICAgICAgICA/IHBhcnQxIDwgMTI4ID8gNSA6IDZcclxuICAgICAgICAgICAgIDogcGFydDEgPCAyMDk3MTUyID8gNyA6IDhcclxuICAgICAgICAgOiBwYXJ0MiA8IDEyOCA/IDkgOiAxMDtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciB1dGlsID0gZXhwb3J0cztcclxuXHJcbi8vIHVzZWQgdG8gcmV0dXJuIGEgUHJvbWlzZSB3aGVyZSBjYWxsYmFjayBpcyBvbWl0dGVkXHJcbnV0aWwuYXNQcm9taXNlID0gcmVxdWlyZShcIkBwcm90b2J1ZmpzL2FzcHJvbWlzZVwiKTtcclxuXHJcbi8vIGNvbnZlcnRzIHRvIC8gZnJvbSBiYXNlNjQgZW5jb2RlZCBzdHJpbmdzXHJcbnV0aWwuYmFzZTY0ID0gcmVxdWlyZShcIkBwcm90b2J1ZmpzL2Jhc2U2NFwiKTtcclxuXHJcbi8vIGJhc2UgY2xhc3Mgb2YgcnBjLlNlcnZpY2VcclxudXRpbC5FdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiQHByb3RvYnVmanMvZXZlbnRlbWl0dGVyXCIpO1xyXG5cclxuLy8gZmxvYXQgaGFuZGxpbmcgYWNjcm9zcyBicm93c2Vyc1xyXG51dGlsLmZsb2F0ID0gcmVxdWlyZShcIkBwcm90b2J1ZmpzL2Zsb2F0XCIpO1xyXG5cclxuLy8gcmVxdWlyZXMgbW9kdWxlcyBvcHRpb25hbGx5IGFuZCBoaWRlcyB0aGUgY2FsbCBmcm9tIGJ1bmRsZXJzXHJcbnV0aWwuaW5xdWlyZSA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9pbnF1aXJlXCIpO1xyXG5cclxuLy8gY29udmVydHMgdG8gLyBmcm9tIHV0ZjggZW5jb2RlZCBzdHJpbmdzXHJcbnV0aWwudXRmOCA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy91dGY4XCIpO1xyXG5cclxuLy8gcHJvdmlkZXMgYSBub2RlLWxpa2UgYnVmZmVyIHBvb2wgaW4gdGhlIGJyb3dzZXJcclxudXRpbC5wb29sID0gcmVxdWlyZShcIkBwcm90b2J1ZmpzL3Bvb2xcIik7XHJcblxyXG4vLyB1dGlsaXR5IHRvIHdvcmsgd2l0aCB0aGUgbG93IGFuZCBoaWdoIGJpdHMgb2YgYSA2NCBiaXQgdmFsdWVcclxudXRpbC5Mb25nQml0cyA9IHJlcXVpcmUoXCIuL2xvbmdiaXRzXCIpO1xyXG5cclxuLyoqXHJcbiAqIEFuIGltbXVhYmxlIGVtcHR5IGFycmF5LlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAdHlwZSB7QXJyYXkuPCo+fVxyXG4gKiBAY29uc3RcclxuICovXHJcbnV0aWwuZW1wdHlBcnJheSA9IE9iamVjdC5mcmVlemUgPyBPYmplY3QuZnJlZXplKFtdKSA6IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIFtdOyAvLyB1c2VkIG9uIHByb3RvdHlwZXNcclxuXHJcbi8qKlxyXG4gKiBBbiBpbW11dGFibGUgZW1wdHkgb2JqZWN0LlxyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKiBAY29uc3RcclxuICovXHJcbnV0aWwuZW1wdHlPYmplY3QgPSBPYmplY3QuZnJlZXplID8gT2JqZWN0LmZyZWV6ZSh7fSkgOiAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyB7fTsgLy8gdXNlZCBvbiBwcm90b3R5cGVzXHJcblxyXG4vKipcclxuICogV2hldGhlciBydW5uaW5nIHdpdGhpbiBub2RlIG9yIG5vdC5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQHR5cGUge2Jvb2xlYW59XHJcbiAqIEBjb25zdFxyXG4gKi9cclxudXRpbC5pc05vZGUgPSBCb29sZWFuKGdsb2JhbC5wcm9jZXNzICYmIGdsb2JhbC5wcm9jZXNzLnZlcnNpb25zICYmIGdsb2JhbC5wcm9jZXNzLnZlcnNpb25zLm5vZGUpO1xyXG5cclxuLyoqXHJcbiAqIFRlc3RzIGlmIHRoZSBzcGVjaWZpZWQgdmFsdWUgaXMgYW4gaW50ZWdlci5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gYHRydWVgIGlmIHRoZSB2YWx1ZSBpcyBhbiBpbnRlZ2VyXHJcbiAqL1xyXG51dGlsLmlzSW50ZWdlciA9IE51bWJlci5pc0ludGVnZXIgfHwgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gZnVuY3Rpb24gaXNJbnRlZ2VyKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmIGlzRmluaXRlKHZhbHVlKSAmJiBNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWU7XHJcbn07XHJcblxyXG4vKipcclxuICogVGVzdHMgaWYgdGhlIHNwZWNpZmllZCB2YWx1ZSBpcyBhIHN0cmluZy5cclxuICogQHBhcmFtIHsqfSB2YWx1ZSBWYWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgdGhlIHZhbHVlIGlzIGEgc3RyaW5nXHJcbiAqL1xyXG51dGlsLmlzU3RyaW5nID0gZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcclxuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdmFsdWUgaW5zdGFuY2VvZiBTdHJpbmc7XHJcbn07XHJcblxyXG4vKipcclxuICogVGVzdHMgaWYgdGhlIHNwZWNpZmllZCB2YWx1ZSBpcyBhIG5vbi1udWxsIG9iamVjdC5cclxuICogQHBhcmFtIHsqfSB2YWx1ZSBWYWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgdGhlIHZhbHVlIGlzIGEgbm9uLW51bGwgb2JqZWN0XHJcbiAqL1xyXG51dGlsLmlzT2JqZWN0ID0gZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcclxuICAgIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCI7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2tzIGlmIGEgcHJvcGVydHkgb24gYSBtZXNzYWdlIGlzIGNvbnNpZGVyZWQgdG8gYmUgcHJlc2VudC5cclxuICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgdXRpbC5pc1NldH0uXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFBsYWluIG9iamVjdCBvciBtZXNzYWdlIGluc3RhbmNlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wIFByb3BlcnR5IG5hbWVcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiBjb25zaWRlcmVkIHRvIGJlIHByZXNlbnQsIG90aGVyd2lzZSBgZmFsc2VgXHJcbiAqL1xyXG51dGlsLmlzc2V0ID1cclxuXHJcbi8qKlxyXG4gKiBDaGVja3MgaWYgYSBwcm9wZXJ0eSBvbiBhIG1lc3NhZ2UgaXMgY29uc2lkZXJlZCB0byBiZSBwcmVzZW50LlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFBsYWluIG9iamVjdCBvciBtZXNzYWdlIGluc3RhbmNlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wIFByb3BlcnR5IG5hbWVcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiBjb25zaWRlcmVkIHRvIGJlIHByZXNlbnQsIG90aGVyd2lzZSBgZmFsc2VgXHJcbiAqL1xyXG51dGlsLmlzU2V0ID0gZnVuY3Rpb24gaXNTZXQob2JqLCBwcm9wKSB7XHJcbiAgICB2YXIgdmFsdWUgPSBvYmpbcHJvcF07XHJcbiAgICBpZiAodmFsdWUgIT0gbnVsbCAmJiBvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxLCBuby1wcm90b3R5cGUtYnVpbHRpbnNcclxuICAgICAgICByZXR1cm4gdHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiIHx8IChBcnJheS5pc0FycmF5KHZhbHVlKSA/IHZhbHVlLmxlbmd0aCA6IE9iamVjdC5rZXlzKHZhbHVlKS5sZW5ndGgpID4gMDtcclxuICAgIHJldHVybiBmYWxzZTtcclxufTtcclxuXHJcbi8qXHJcbiAqIEFueSBjb21wYXRpYmxlIEJ1ZmZlciBpbnN0YW5jZS5cclxuICogVGhpcyBpcyBhIG1pbmltYWwgc3RhbmQtYWxvbmUgZGVmaW5pdGlvbiBvZiBhIEJ1ZmZlciBpbnN0YW5jZS4gVGhlIGFjdHVhbCB0eXBlIGlzIHRoYXQgZXhwb3J0ZWQgYnkgbm9kZSdzIHR5cGluZ3MuXHJcbiAqIEB0eXBlZGVmIEJ1ZmZlclxyXG4gKiBAdHlwZSB7VWludDhBcnJheX1cclxuICovXHJcblxyXG4vKipcclxuICogTm9kZSdzIEJ1ZmZlciBjbGFzcyBpZiBhdmFpbGFibGUuXHJcbiAqIEB0eXBlIHs/ZnVuY3Rpb24obmV3OiBCdWZmZXIpfVxyXG4gKi9cclxudXRpbC5CdWZmZXIgPSAoZnVuY3Rpb24oKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHZhciBCdWZmZXIgPSB1dGlsLmlucXVpcmUoXCJidWZmZXJcIikuQnVmZmVyO1xyXG4gICAgICAgIC8vIHJlZnVzZSB0byB1c2Ugbm9uLW5vZGUgYnVmZmVycyBpZiBub3QgZXhwbGljaXRseSBhc3NpZ25lZCAocGVyZiByZWFzb25zKTpcclxuICAgICAgICByZXR1cm4gQnVmZmVyLnByb3RvdHlwZS51dGY4V3JpdGUgPyBCdWZmZXIgOiAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBudWxsO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn0pKCk7XHJcblxyXG4vKipcclxuICogSW50ZXJuYWwgYWxpYXMgb2Ygb3IgcG9seWZ1bGwgZm9yIEJ1ZmZlci5mcm9tLlxyXG4gKiBAdHlwZSB7P2Z1bmN0aW9ufVxyXG4gKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJbXX0gdmFsdWUgVmFsdWVcclxuICogQHBhcmFtIHtzdHJpbmd9IFtlbmNvZGluZ10gRW5jb2RpbmcgaWYgdmFsdWUgaXMgYSBzdHJpbmdcclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl9XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG51dGlsLl9CdWZmZXJfZnJvbSA9IG51bGw7XHJcblxyXG4vKipcclxuICogSW50ZXJuYWwgYWxpYXMgb2Ygb3IgcG9seWZpbGwgZm9yIEJ1ZmZlci5hbGxvY1Vuc2FmZS5cclxuICogQHR5cGUgez9mdW5jdGlvbn1cclxuICogQHBhcmFtIHtudW1iZXJ9IHNpemUgQnVmZmVyIHNpemVcclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl9XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG51dGlsLl9CdWZmZXJfYWxsb2NVbnNhZmUgPSBudWxsO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgYnVmZmVyIG9mIHdoYXRldmVyIHR5cGUgc3VwcG9ydGVkIGJ5IHRoZSBlbnZpcm9ubWVudC5cclxuICogQHBhcmFtIHtudW1iZXJ8bnVtYmVyW119IFtzaXplT3JBcnJheT0wXSBCdWZmZXIgc2l6ZSBvciBudW1iZXIgYXJyYXlcclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl8QnVmZmVyfSBCdWZmZXJcclxuICovXHJcbnV0aWwubmV3QnVmZmVyID0gZnVuY3Rpb24gbmV3QnVmZmVyKHNpemVPckFycmF5KSB7XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgcmV0dXJuIHR5cGVvZiBzaXplT3JBcnJheSA9PT0gXCJudW1iZXJcIlxyXG4gICAgICAgID8gdXRpbC5CdWZmZXJcclxuICAgICAgICAgICAgPyB1dGlsLl9CdWZmZXJfYWxsb2NVbnNhZmUoc2l6ZU9yQXJyYXkpXHJcbiAgICAgICAgICAgIDogbmV3IHV0aWwuQXJyYXkoc2l6ZU9yQXJyYXkpXHJcbiAgICAgICAgOiB1dGlsLkJ1ZmZlclxyXG4gICAgICAgICAgICA/IHV0aWwuX0J1ZmZlcl9mcm9tKHNpemVPckFycmF5KVxyXG4gICAgICAgICAgICA6IHR5cGVvZiBVaW50OEFycmF5ID09PSBcInVuZGVmaW5lZFwiXHJcbiAgICAgICAgICAgICAgICA/IHNpemVPckFycmF5XHJcbiAgICAgICAgICAgICAgICA6IG5ldyBVaW50OEFycmF5KHNpemVPckFycmF5KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBcnJheSBpbXBsZW1lbnRhdGlvbiB1c2VkIGluIHRoZSBicm93c2VyLiBgVWludDhBcnJheWAgaWYgc3VwcG9ydGVkLCBvdGhlcndpc2UgYEFycmF5YC5cclxuICogQHR5cGUgez9mdW5jdGlvbihuZXc6IFVpbnQ4QXJyYXksICopfVxyXG4gKi9cclxudXRpbC5BcnJheSA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSBcInVuZGVmaW5lZFwiID8gVWludDhBcnJheSAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyA6IEFycmF5O1xyXG5cclxuLypcclxuICogQW55IGNvbXBhdGlibGUgTG9uZyBpbnN0YW5jZS5cclxuICogVGhpcyBpcyBhIG1pbmltYWwgc3RhbmQtYWxvbmUgZGVmaW5pdGlvbiBvZiBhIExvbmcgaW5zdGFuY2UuIFRoZSBhY3R1YWwgdHlwZSBpcyB0aGF0IGV4cG9ydGVkIGJ5IGxvbmcuanMuXHJcbiAqIEB0eXBlZGVmIExvbmdcclxuICogQHR5cGUge09iamVjdH1cclxuICogQHByb3BlcnR5IHtudW1iZXJ9IGxvdyBMb3cgYml0c1xyXG4gKiBAcHJvcGVydHkge251bWJlcn0gaGlnaCBIaWdoIGJpdHNcclxuICogQHByb3BlcnR5IHtib29sZWFufSB1bnNpZ25lZCBXaGV0aGVyIHVuc2lnbmVkIG9yIG5vdFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBMb25nLmpzJ3MgTG9uZyBjbGFzcyBpZiBhdmFpbGFibGUuXHJcbiAqIEB0eXBlIHs/ZnVuY3Rpb24obmV3OiBMb25nKX1cclxuICovXHJcbnV0aWwuTG9uZyA9IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIGdsb2JhbC5kY29kZUlPICYmIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIGdsb2JhbC5kY29kZUlPLkxvbmcgfHwgdXRpbC5pbnF1aXJlKFwibG9uZ1wiKTtcclxuXHJcbi8qKlxyXG4gKiBSZWd1bGFyIGV4cHJlc3Npb24gdXNlZCB0byB2ZXJpZnkgMiBiaXQgKGBib29sYCkgbWFwIGtleXMuXHJcbiAqIEB0eXBlIHtSZWdFeHB9XHJcbiAqIEBjb25zdFxyXG4gKi9cclxudXRpbC5rZXkyUmUgPSAvXnRydWV8ZmFsc2V8MHwxJC87XHJcblxyXG4vKipcclxuICogUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gdmVyaWZ5IDMyIGJpdCAoYGludDMyYCBldGMuKSBtYXAga2V5cy5cclxuICogQHR5cGUge1JlZ0V4cH1cclxuICogQGNvbnN0XHJcbiAqL1xyXG51dGlsLmtleTMyUmUgPSAvXi0/KD86MHxbMS05XVswLTldKikkLztcclxuXHJcbi8qKlxyXG4gKiBSZWd1bGFyIGV4cHJlc3Npb24gdXNlZCB0byB2ZXJpZnkgNjQgYml0IChgaW50NjRgIGV0Yy4pIG1hcCBrZXlzLlxyXG4gKiBAdHlwZSB7UmVnRXhwfVxyXG4gKiBAY29uc3RcclxuICovXHJcbnV0aWwua2V5NjRSZSA9IC9eKD86W1xcXFx4MDAtXFxcXHhmZl17OH18LT8oPzowfFsxLTldWzAtOV0qKSkkLztcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyBhIG51bWJlciBvciBsb25nIHRvIGFuIDggY2hhcmFjdGVycyBsb25nIGhhc2ggc3RyaW5nLlxyXG4gKiBAcGFyYW0ge0xvbmd8bnVtYmVyfSB2YWx1ZSBWYWx1ZSB0byBjb252ZXJ0XHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEhhc2hcclxuICovXHJcbnV0aWwubG9uZ1RvSGFzaCA9IGZ1bmN0aW9uIGxvbmdUb0hhc2godmFsdWUpIHtcclxuICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICAgID8gdXRpbC5Mb25nQml0cy5mcm9tKHZhbHVlKS50b0hhc2goKVxyXG4gICAgICAgIDogdXRpbC5Mb25nQml0cy56ZXJvSGFzaDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyBhbiA4IGNoYXJhY3RlcnMgbG9uZyBoYXNoIHN0cmluZyB0byBhIGxvbmcgb3IgbnVtYmVyLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaGFzaCBIYXNoXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3Vuc2lnbmVkPWZhbHNlXSBXaGV0aGVyIHVuc2lnbmVkIG9yIG5vdFxyXG4gKiBAcmV0dXJucyB7TG9uZ3xudW1iZXJ9IE9yaWdpbmFsIHZhbHVlXHJcbiAqL1xyXG51dGlsLmxvbmdGcm9tSGFzaCA9IGZ1bmN0aW9uIGxvbmdGcm9tSGFzaChoYXNoLCB1bnNpZ25lZCkge1xyXG4gICAgdmFyIGJpdHMgPSB1dGlsLkxvbmdCaXRzLmZyb21IYXNoKGhhc2gpO1xyXG4gICAgaWYgKHV0aWwuTG9uZylcclxuICAgICAgICByZXR1cm4gdXRpbC5Mb25nLmZyb21CaXRzKGJpdHMubG8sIGJpdHMuaGksIHVuc2lnbmVkKTtcclxuICAgIHJldHVybiBiaXRzLnRvTnVtYmVyKEJvb2xlYW4odW5zaWduZWQpKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBNZXJnZXMgdGhlIHByb3BlcnRpZXMgb2YgdGhlIHNvdXJjZSBvYmplY3QgaW50byB0aGUgZGVzdGluYXRpb24gb2JqZWN0LlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBkc3QgRGVzdGluYXRpb24gb2JqZWN0XHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IHNyYyBTb3VyY2Ugb2JqZWN0XHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lmTm90U2V0PWZhbHNlXSBNZXJnZXMgb25seSBpZiB0aGUga2V5IGlzIG5vdCBhbHJlYWR5IHNldFxyXG4gKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IERlc3RpbmF0aW9uIG9iamVjdFxyXG4gKi9cclxuZnVuY3Rpb24gbWVyZ2UoZHN0LCBzcmMsIGlmTm90U2V0KSB7IC8vIHVzZWQgYnkgY29udmVydGVyc1xyXG4gICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHNyYyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcclxuICAgICAgICBpZiAoZHN0W2tleXNbaV1dID09PSB1bmRlZmluZWQgfHwgIWlmTm90U2V0KVxyXG4gICAgICAgICAgICBkc3Rba2V5c1tpXV0gPSBzcmNba2V5c1tpXV07XHJcbiAgICByZXR1cm4gZHN0O1xyXG59XHJcblxyXG51dGlsLm1lcmdlID0gbWVyZ2U7XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhlIGZpcnN0IGNoYXJhY3RlciBvZiBhIHN0cmluZyB0byBsb3dlciBjYXNlLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIFN0cmluZyB0byBjb252ZXJ0XHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IENvbnZlcnRlZCBzdHJpbmdcclxuICovXHJcbnV0aWwubGNGaXJzdCA9IGZ1bmN0aW9uIGxjRmlyc3Qoc3RyKSB7XHJcbiAgICByZXR1cm4gc3RyLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgc3RyLnN1YnN0cmluZygxKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgY3VzdG9tIGVycm9yIGNvbnN0cnVjdG9yLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBFcnJvciBuYW1lXHJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gQ3VzdG9tIGVycm9yIGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBuZXdFcnJvcihuYW1lKSB7XHJcblxyXG4gICAgZnVuY3Rpb24gQ3VzdG9tRXJyb3IobWVzc2FnZSwgcHJvcGVydGllcykge1xyXG5cclxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ3VzdG9tRXJyb3IpKVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEN1c3RvbUVycm9yKG1lc3NhZ2UsIHByb3BlcnRpZXMpO1xyXG5cclxuICAgICAgICAvLyBFcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xyXG4gICAgICAgIC8vIF4ganVzdCByZXR1cm5zIGEgbmV3IGVycm9yIGluc3RhbmNlIGJlY2F1c2UgdGhlIGN0b3IgY2FuIGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uXHJcblxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIm1lc3NhZ2VcIiwgeyBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbWVzc2FnZTsgfSB9KTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIC8vIG5vZGVcclxuICAgICAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgQ3VzdG9tRXJyb3IpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RhY2tcIiwgeyB2YWx1ZTogKG5ldyBFcnJvcigpKS5zdGFjayB8fCBcIlwiIH0pO1xyXG5cclxuICAgICAgICBpZiAocHJvcGVydGllcylcclxuICAgICAgICAgICAgbWVyZ2UodGhpcywgcHJvcGVydGllcyk7XHJcbiAgICB9XHJcblxyXG4gICAgKEN1c3RvbUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBDdXN0b21FcnJvcjtcclxuXHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQ3VzdG9tRXJyb3IucHJvdG90eXBlLCBcIm5hbWVcIiwgeyBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmFtZTsgfSB9KTtcclxuXHJcbiAgICBDdXN0b21FcnJvci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5uYW1lICsgXCI6IFwiICsgdGhpcy5tZXNzYWdlO1xyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gQ3VzdG9tRXJyb3I7XHJcbn1cclxuXHJcbnV0aWwubmV3RXJyb3IgPSBuZXdFcnJvcjtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHByb3RvY29sIGVycm9yLlxyXG4gKiBAY2xhc3NkZXNjIEVycm9yIHN1YmNsYXNzIGluZGljYXRpbmcgYSBwcm90b2NvbCBzcGVjaWZjIGVycm9yLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAZXh0ZW5kcyBFcnJvclxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgRXJyb3IgbWVzc2FnZVxyXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+PX0gcHJvcGVydGllcyBBZGRpdGlvbmFsIHByb3BlcnRpZXNcclxuICogQGV4YW1wbGVcclxuICogdHJ5IHtcclxuICogICAgIE15TWVzc2FnZS5kZWNvZGUoc29tZUJ1ZmZlcik7IC8vIHRocm93cyBpZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcclxuICogfSBjYXRjaCAoZSkge1xyXG4gKiAgICAgaWYgKGUgaW5zdGFuY2VvZiBQcm90b2NvbEVycm9yICYmIGUuaW5zdGFuY2UpXHJcbiAqICAgICAgICAgY29uc29sZS5sb2coXCJkZWNvZGVkIHNvIGZhcjogXCIgKyBKU09OLnN0cmluZ2lmeShlLmluc3RhbmNlKSk7XHJcbiAqIH1cclxuICovXHJcbnV0aWwuUHJvdG9jb2xFcnJvciA9IG5ld0Vycm9yKFwiUHJvdG9jb2xFcnJvclwiKTtcclxuXHJcbi8qKlxyXG4gKiBTbyBmYXIgZGVjb2RlZCBtZXNzYWdlIGluc3RhbmNlLlxyXG4gKiBAbmFtZSB1dGlsLlByb3RvY29sRXJyb3IjaW5zdGFuY2VcclxuICogQHR5cGUge01lc3NhZ2V9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEJ1aWxkcyBhIGdldHRlciBmb3IgYSBvbmVvZidzIHByZXNlbnQgZmllbGQgbmFtZS5cclxuICogQHBhcmFtIHtzdHJpbmdbXX0gZmllbGROYW1lcyBGaWVsZCBuYW1lc1xyXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb24oKTpzdHJpbmd8dW5kZWZpbmVkfSBVbmJvdW5kIGdldHRlclxyXG4gKi9cclxudXRpbC5vbmVPZkdldHRlciA9IGZ1bmN0aW9uIGdldE9uZU9mKGZpZWxkTmFtZXMpIHtcclxuICAgIHZhciBmaWVsZE1hcCA9IHt9O1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZE5hbWVzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgIGZpZWxkTWFwW2ZpZWxkTmFtZXNbaV1dID0gMTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8dW5kZWZpbmVkfSBTZXQgZmllbGQgbmFtZSwgaWYgYW55XHJcbiAgICAgKiBAdGhpcyBPYmplY3RcclxuICAgICAqIEBpZ25vcmVcclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGNvbnNpc3RlbnQtcmV0dXJuXHJcbiAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMpLCBpID0ga2V5cy5sZW5ndGggLSAxOyBpID4gLTE7IC0taSlcclxuICAgICAgICAgICAgaWYgKGZpZWxkTWFwW2tleXNbaV1dID09PSAxICYmIHRoaXNba2V5c1tpXV0gIT09IHVuZGVmaW5lZCAmJiB0aGlzW2tleXNbaV1dICE9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGtleXNbaV07XHJcbiAgICB9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEJ1aWxkcyBhIHNldHRlciBmb3IgYSBvbmVvZidzIHByZXNlbnQgZmllbGQgbmFtZS5cclxuICogQHBhcmFtIHtzdHJpbmdbXX0gZmllbGROYW1lcyBGaWVsZCBuYW1lc1xyXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb24oP3N0cmluZyk6dW5kZWZpbmVkfSBVbmJvdW5kIHNldHRlclxyXG4gKi9cclxudXRpbC5vbmVPZlNldHRlciA9IGZ1bmN0aW9uIHNldE9uZU9mKGZpZWxkTmFtZXMpIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIEZpZWxkIG5hbWVcclxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAgICAgKiBAdGhpcyBPYmplY3RcclxuICAgICAqIEBpZ25vcmVcclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkTmFtZXMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgIGlmIChmaWVsZE5hbWVzW2ldICE9PSBuYW1lKVxyXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXNbZmllbGROYW1lc1tpXV07XHJcbiAgICB9O1xyXG59O1xyXG5cclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuLyoqXHJcbiAqIExhemlseSByZXNvbHZlcyBmdWxseSBxdWFsaWZpZWQgdHlwZSBuYW1lcyBhZ2FpbnN0IHRoZSBzcGVjaWZpZWQgcm9vdC5cclxuICogQHBhcmFtIHtSb290fSByb290IFJvb3QgaW5zdGFuY2VvZlxyXG4gKiBAcGFyYW0ge09iamVjdC48bnVtYmVyLHN0cmluZ3xSZWZsZWN0aW9uT2JqZWN0Pn0gbGF6eVR5cGVzIFR5cGUgbmFtZXNcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQGRlcHJlY2F0ZWQgc2luY2UgNi43LjAgc3RhdGljIGNvZGUgZG9lcyBub3QgZW1pdCBsYXp5IHR5cGVzIGFueW1vcmVcclxuICovXHJcbnV0aWwubGF6eVJlc29sdmUgPSBmdW5jdGlvbiBsYXp5UmVzb2x2ZShyb290LCBsYXp5VHlwZXMpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGF6eVR5cGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKGxhenlUeXBlc1tpXSksIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICB2YXIgcGF0aCA9IGxhenlUeXBlc1tpXVtrZXlzW2pdXS5zcGxpdChcIi5cIiksXHJcbiAgICAgICAgICAgICAgICBwdHIgID0gcm9vdDtcclxuICAgICAgICAgICAgd2hpbGUgKHBhdGgubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgcHRyID0gcHRyW3BhdGguc2hpZnQoKV07XHJcbiAgICAgICAgICAgIGxhenlUeXBlc1tpXVtrZXlzW2pdXSA9IHB0cjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG4vKipcclxuICogRGVmYXVsdCBjb252ZXJzaW9uIG9wdGlvbnMgdXNlZCBmb3Ige0BsaW5rIE1lc3NhZ2UjdG9KU09OfSBpbXBsZW1lbnRhdGlvbnMuIExvbmdzLCBlbnVtcyBhbmQgYnl0ZXMgYXJlIGNvbnZlcnRlZCB0byBzdHJpbmdzIGJ5IGRlZmF1bHQuXHJcbiAqIEB0eXBlIHtDb252ZXJzaW9uT3B0aW9uc31cclxuICovXHJcbnV0aWwudG9KU09OT3B0aW9ucyA9IHtcclxuICAgIGxvbmdzOiBTdHJpbmcsXHJcbiAgICBlbnVtczogU3RyaW5nLFxyXG4gICAgYnl0ZXM6IFN0cmluZ1xyXG59O1xyXG5cclxudXRpbC5fY29uZmlndXJlID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgQnVmZmVyID0gdXRpbC5CdWZmZXI7XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICghQnVmZmVyKSB7XHJcbiAgICAgICAgdXRpbC5fQnVmZmVyX2Zyb20gPSB1dGlsLl9CdWZmZXJfYWxsb2NVbnNhZmUgPSBudWxsO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vIGJlY2F1c2Ugbm9kZSA0LnggYnVmZmVycyBhcmUgaW5jb21wYXRpYmxlICYgaW1tdXRhYmxlXHJcbiAgICAvLyBzZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9kY29kZUlPL3Byb3RvYnVmLmpzL3B1bGwvNjY1XHJcbiAgICB1dGlsLl9CdWZmZXJfZnJvbSA9IEJ1ZmZlci5mcm9tICE9PSBVaW50OEFycmF5LmZyb20gJiYgQnVmZmVyLmZyb20gfHxcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGZ1bmN0aW9uIEJ1ZmZlcl9mcm9tKHZhbHVlLCBlbmNvZGluZykge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmZlcih2YWx1ZSwgZW5jb2RpbmcpO1xyXG4gICAgICAgIH07XHJcbiAgICB1dGlsLl9CdWZmZXJfYWxsb2NVbnNhZmUgPSBCdWZmZXIuYWxsb2NVbnNhZmUgfHxcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGZ1bmN0aW9uIEJ1ZmZlcl9hbGxvY1Vuc2FmZShzaXplKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZmVyKHNpemUpO1xyXG4gICAgICAgIH07XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IHZlcmlmaWVyO1xyXG5cclxudmFyIEVudW0gICAgICA9IHJlcXVpcmUoXCIuL2VudW1cIiksXHJcbiAgICB1dGlsICAgICAgPSByZXF1aXJlKFwiLi91dGlsXCIpO1xyXG5cclxuZnVuY3Rpb24gaW52YWxpZChmaWVsZCwgZXhwZWN0ZWQpIHtcclxuICAgIHJldHVybiBmaWVsZC5uYW1lICsgXCI6IFwiICsgZXhwZWN0ZWQgKyAoZmllbGQucmVwZWF0ZWQgJiYgZXhwZWN0ZWQgIT09IFwiYXJyYXlcIiA/IFwiW11cIiA6IGZpZWxkLm1hcCAmJiBleHBlY3RlZCAhPT0gXCJvYmplY3RcIiA/IFwie2s6XCIrZmllbGQua2V5VHlwZStcIn1cIiA6IFwiXCIpICsgXCIgZXhwZWN0ZWRcIjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIHBhcnRpYWwgdmFsdWUgdmVyaWZpZXIuXHJcbiAqIEBwYXJhbSB7Q29kZWdlbn0gZ2VuIENvZGVnZW4gaW5zdGFuY2VcclxuICogQHBhcmFtIHtGaWVsZH0gZmllbGQgUmVmbGVjdGVkIGZpZWxkXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBmaWVsZEluZGV4IEZpZWxkIGluZGV4XHJcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWYgVmFyaWFibGUgcmVmZXJlbmNlXHJcbiAqIEByZXR1cm5zIHtDb2RlZ2VufSBDb2RlZ2VuIGluc3RhbmNlXHJcbiAqIEBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIGdlblZlcmlmeVZhbHVlKGdlbiwgZmllbGQsIGZpZWxkSW5kZXgsIHJlZikge1xyXG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUgKi9cclxuICAgIGlmIChmaWVsZC5yZXNvbHZlZFR5cGUpIHtcclxuICAgICAgICBpZiAoZmllbGQucmVzb2x2ZWRUeXBlIGluc3RhbmNlb2YgRW51bSkgeyBnZW5cclxuICAgICAgICAgICAgKFwic3dpdGNoKCVzKXtcIiwgcmVmKVxyXG4gICAgICAgICAgICAgICAgKFwiZGVmYXVsdDpcIilcclxuICAgICAgICAgICAgICAgICAgICAoXCJyZXR1cm4lalwiLCBpbnZhbGlkKGZpZWxkLCBcImVudW0gdmFsdWVcIikpO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMoZmllbGQucmVzb2x2ZWRUeXBlLnZhbHVlcyksIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7ICsraikgZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJjYXNlICVkOlwiLCBmaWVsZC5yZXNvbHZlZFR5cGUudmFsdWVzW2tleXNbal1dKTtcclxuICAgICAgICAgICAgZ2VuXHJcbiAgICAgICAgICAgICAgICAgICAgKFwiYnJlYWtcIilcclxuICAgICAgICAgICAgKFwifVwiKTtcclxuICAgICAgICB9IGVsc2UgZ2VuXHJcbiAgICAgICAgICAgIChcInZhciBlPXR5cGVzWyVkXS52ZXJpZnkoJXMpO1wiLCBmaWVsZEluZGV4LCByZWYpXHJcbiAgICAgICAgICAgIChcImlmKGUpXCIpXHJcbiAgICAgICAgICAgICAgICAoXCJyZXR1cm4laitlXCIsIGZpZWxkLm5hbWUgKyBcIi5cIik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHN3aXRjaCAoZmllbGQudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFwiaW50MzJcIjpcclxuICAgICAgICAgICAgY2FzZSBcInVpbnQzMlwiOlxyXG4gICAgICAgICAgICBjYXNlIFwic2ludDMyXCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJmaXhlZDMyXCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJzZml4ZWQzMlwiOiBnZW5cclxuICAgICAgICAgICAgICAgIChcImlmKCF1dGlsLmlzSW50ZWdlciglcykpXCIsIHJlZilcclxuICAgICAgICAgICAgICAgICAgICAoXCJyZXR1cm4lalwiLCBpbnZhbGlkKGZpZWxkLCBcImludGVnZXJcIikpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJpbnQ2NFwiOlxyXG4gICAgICAgICAgICBjYXNlIFwidWludDY0XCI6XHJcbiAgICAgICAgICAgIGNhc2UgXCJzaW50NjRcIjpcclxuICAgICAgICAgICAgY2FzZSBcImZpeGVkNjRcIjpcclxuICAgICAgICAgICAgY2FzZSBcInNmaXhlZDY0XCI6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwiaWYoIXV0aWwuaXNJbnRlZ2VyKCVzKSYmISglcyYmdXRpbC5pc0ludGVnZXIoJXMubG93KSYmdXRpbC5pc0ludGVnZXIoJXMuaGlnaCkpKVwiLCByZWYsIHJlZiwgcmVmLCByZWYpXHJcbiAgICAgICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJpbnRlZ2VyfExvbmdcIikpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJmbG9hdFwiOlxyXG4gICAgICAgICAgICBjYXNlIFwiZG91YmxlXCI6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwiaWYodHlwZW9mICVzIT09XFxcIm51bWJlclxcXCIpXCIsIHJlZilcclxuICAgICAgICAgICAgICAgICAgICAoXCJyZXR1cm4lalwiLCBpbnZhbGlkKGZpZWxkLCBcIm51bWJlclwiKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImJvb2xcIjogZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJpZih0eXBlb2YgJXMhPT1cXFwiYm9vbGVhblxcXCIpXCIsIHJlZilcclxuICAgICAgICAgICAgICAgICAgICAoXCJyZXR1cm4lalwiLCBpbnZhbGlkKGZpZWxkLCBcImJvb2xlYW5cIikpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJzdHJpbmdcIjogZ2VuXHJcbiAgICAgICAgICAgICAgICAoXCJpZighdXRpbC5pc1N0cmluZyglcykpXCIsIHJlZilcclxuICAgICAgICAgICAgICAgICAgICAoXCJyZXR1cm4lalwiLCBpbnZhbGlkKGZpZWxkLCBcInN0cmluZ1wiKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImJ5dGVzXCI6IGdlblxyXG4gICAgICAgICAgICAgICAgKFwiaWYoISglcyYmdHlwZW9mICVzLmxlbmd0aD09PVxcXCJudW1iZXJcXFwifHx1dGlsLmlzU3RyaW5nKCVzKSkpXCIsIHJlZiwgcmVmLCByZWYpXHJcbiAgICAgICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJidWZmZXJcIikpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGdlbjtcclxuICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUgKi9cclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIHBhcnRpYWwga2V5IHZlcmlmaWVyLlxyXG4gKiBAcGFyYW0ge0NvZGVnZW59IGdlbiBDb2RlZ2VuIGluc3RhbmNlXHJcbiAqIEBwYXJhbSB7RmllbGR9IGZpZWxkIFJlZmxlY3RlZCBmaWVsZFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVmIFZhcmlhYmxlIHJlZmVyZW5jZVxyXG4gKiBAcmV0dXJucyB7Q29kZWdlbn0gQ29kZWdlbiBpbnN0YW5jZVxyXG4gKiBAaWdub3JlXHJcbiAqL1xyXG5mdW5jdGlvbiBnZW5WZXJpZnlLZXkoZ2VuLCBmaWVsZCwgcmVmKSB7XHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSAqL1xyXG4gICAgc3dpdGNoIChmaWVsZC5rZXlUeXBlKSB7XHJcbiAgICAgICAgY2FzZSBcImludDMyXCI6XHJcbiAgICAgICAgY2FzZSBcInVpbnQzMlwiOlxyXG4gICAgICAgIGNhc2UgXCJzaW50MzJcIjpcclxuICAgICAgICBjYXNlIFwiZml4ZWQzMlwiOlxyXG4gICAgICAgIGNhc2UgXCJzZml4ZWQzMlwiOiBnZW5cclxuICAgICAgICAgICAgKFwiaWYoIXV0aWwua2V5MzJSZS50ZXN0KCVzKSlcIiwgcmVmKVxyXG4gICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJpbnRlZ2VyIGtleVwiKSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJpbnQ2NFwiOlxyXG4gICAgICAgIGNhc2UgXCJ1aW50NjRcIjpcclxuICAgICAgICBjYXNlIFwic2ludDY0XCI6XHJcbiAgICAgICAgY2FzZSBcImZpeGVkNjRcIjpcclxuICAgICAgICBjYXNlIFwic2ZpeGVkNjRcIjogZ2VuXHJcbiAgICAgICAgICAgIChcImlmKCF1dGlsLmtleTY0UmUudGVzdCglcykpXCIsIHJlZikgLy8gc2VlIGNvbW1lbnQgYWJvdmU6IHggaXMgb2ssIGQgaXMgbm90XHJcbiAgICAgICAgICAgICAgICAoXCJyZXR1cm4lalwiLCBpbnZhbGlkKGZpZWxkLCBcImludGVnZXJ8TG9uZyBrZXlcIikpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYm9vbFwiOiBnZW5cclxuICAgICAgICAgICAgKFwiaWYoIXV0aWwua2V5MlJlLnRlc3QoJXMpKVwiLCByZWYpXHJcbiAgICAgICAgICAgICAgICAoXCJyZXR1cm4lalwiLCBpbnZhbGlkKGZpZWxkLCBcImJvb2xlYW4ga2V5XCIpKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZ2VuO1xyXG4gICAgLyogZXNsaW50LWVuYWJsZSBuby11bmV4cGVjdGVkLW11bHRpbGluZSAqL1xyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGVzIGEgdmVyaWZpZXIgc3BlY2lmaWMgdG8gdGhlIHNwZWNpZmllZCBtZXNzYWdlIHR5cGUuXHJcbiAqIEBwYXJhbSB7VHlwZX0gbXR5cGUgTWVzc2FnZSB0eXBlXHJcbiAqIEByZXR1cm5zIHtDb2RlZ2VufSBDb2RlZ2VuIGluc3RhbmNlXHJcbiAqL1xyXG5mdW5jdGlvbiB2ZXJpZmllcihtdHlwZSkge1xyXG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUgKi9cclxuXHJcbiAgICB2YXIgZ2VuID0gdXRpbC5jb2RlZ2VuKFwibVwiKVxyXG4gICAgKFwiaWYodHlwZW9mIG0hPT1cXFwib2JqZWN0XFxcInx8bT09PW51bGwpXCIpXHJcbiAgICAgICAgKFwicmV0dXJuJWpcIiwgXCJvYmplY3QgZXhwZWN0ZWRcIik7XHJcbiAgICB2YXIgb25lb2ZzID0gbXR5cGUub25lb2ZzQXJyYXksXHJcbiAgICAgICAgc2VlbkZpcnN0RmllbGQgPSB7fTtcclxuICAgIGlmIChvbmVvZnMubGVuZ3RoKSBnZW5cclxuICAgIChcInZhciBwPXt9XCIpO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgLyogaW5pdGlhbGl6ZXMgKi8gbXR5cGUuZmllbGRzQXJyYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICB2YXIgZmllbGQgPSBtdHlwZS5fZmllbGRzQXJyYXlbaV0ucmVzb2x2ZSgpLFxyXG4gICAgICAgICAgICByZWYgICA9IFwibVwiICsgdXRpbC5zYWZlUHJvcChmaWVsZC5uYW1lKTtcclxuXHJcbiAgICAgICAgaWYgKGZpZWxkLm9wdGlvbmFsKSBnZW5cclxuICAgICAgICAoXCJpZiglcyE9bnVsbCYmbS5oYXNPd25Qcm9wZXJ0eSglaikpe1wiLCByZWYsIGZpZWxkLm5hbWUpOyAvLyAhPT0gdW5kZWZpbmVkICYmICE9PSBudWxsXHJcblxyXG4gICAgICAgIC8vIG1hcCBmaWVsZHNcclxuICAgICAgICBpZiAoZmllbGQubWFwKSB7IGdlblxyXG4gICAgICAgICAgICAoXCJpZighdXRpbC5pc09iamVjdCglcykpXCIsIHJlZilcclxuICAgICAgICAgICAgICAgIChcInJldHVybiVqXCIsIGludmFsaWQoZmllbGQsIFwib2JqZWN0XCIpKVxyXG4gICAgICAgICAgICAoXCJ2YXIgaz1PYmplY3Qua2V5cyglcylcIiwgcmVmKVxyXG4gICAgICAgICAgICAoXCJmb3IodmFyIGk9MDtpPGsubGVuZ3RoOysraSl7XCIpO1xyXG4gICAgICAgICAgICAgICAgZ2VuVmVyaWZ5S2V5KGdlbiwgZmllbGQsIFwia1tpXVwiKTtcclxuICAgICAgICAgICAgICAgIGdlblZlcmlmeVZhbHVlKGdlbiwgZmllbGQsIGksIHJlZiArIFwiW2tbaV1dXCIpXHJcbiAgICAgICAgICAgIChcIn1cIik7XHJcblxyXG4gICAgICAgIC8vIHJlcGVhdGVkIGZpZWxkc1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZmllbGQucmVwZWF0ZWQpIHsgZ2VuXHJcbiAgICAgICAgICAgIChcImlmKCFBcnJheS5pc0FycmF5KCVzKSlcIiwgcmVmKVxyXG4gICAgICAgICAgICAgICAgKFwicmV0dXJuJWpcIiwgaW52YWxpZChmaWVsZCwgXCJhcnJheVwiKSlcclxuICAgICAgICAgICAgKFwiZm9yKHZhciBpPTA7aTwlcy5sZW5ndGg7KytpKXtcIiwgcmVmKTtcclxuICAgICAgICAgICAgICAgIGdlblZlcmlmeVZhbHVlKGdlbiwgZmllbGQsIGksIHJlZiArIFwiW2ldXCIpXHJcbiAgICAgICAgICAgIChcIn1cIik7XHJcblxyXG4gICAgICAgIC8vIHJlcXVpcmVkIG9yIHByZXNlbnQgZmllbGRzXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGZpZWxkLnBhcnRPZikge1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uZW9mUHJvcCA9IHV0aWwuc2FmZVByb3AoZmllbGQucGFydE9mLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlZW5GaXJzdEZpZWxkW2ZpZWxkLnBhcnRPZi5uYW1lXSA9PT0gMSkgZ2VuXHJcbiAgICAgICAgICAgIChcImlmKHAlcz09PTEpXCIsIG9uZW9mUHJvcClcclxuICAgICAgICAgICAgICAgIChcInJldHVybiVqXCIsIGZpZWxkLnBhcnRPZi5uYW1lICsgXCI6IG11bHRpcGxlIHZhbHVlc1wiKTtcclxuICAgICAgICAgICAgICAgIHNlZW5GaXJzdEZpZWxkW2ZpZWxkLnBhcnRPZi5uYW1lXSA9IDE7XHJcbiAgICAgICAgICAgICAgICBnZW5cclxuICAgICAgICAgICAgKFwicCVzPTFcIiwgb25lb2ZQcm9wKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnZW5WZXJpZnlWYWx1ZShnZW4sIGZpZWxkLCBpLCByZWYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZmllbGQub3B0aW9uYWwpIGdlblxyXG4gICAgICAgIChcIn1cIik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZ2VuXHJcbiAgICAoXCJyZXR1cm4gbnVsbFwiKTtcclxuICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW5leHBlY3RlZC1tdWx0aWxpbmUgKi9cclxufSIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFdyaXRlcjtcclxuXHJcbnZhciB1dGlsICAgICAgPSByZXF1aXJlKFwiLi91dGlsL21pbmltYWxcIik7XHJcblxyXG52YXIgQnVmZmVyV3JpdGVyOyAvLyBjeWNsaWNcclxuXHJcbnZhciBMb25nQml0cyAgPSB1dGlsLkxvbmdCaXRzLFxyXG4gICAgYmFzZTY0ICAgID0gdXRpbC5iYXNlNjQsXHJcbiAgICB1dGY4ICAgICAgPSB1dGlsLnV0Zjg7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyB3cml0ZXIgb3BlcmF0aW9uIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFNjaGVkdWxlZCB3cml0ZXIgb3BlcmF0aW9uLlxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtmdW5jdGlvbigqLCBVaW50OEFycmF5LCBudW1iZXIpfSBmbiBGdW5jdGlvbiB0byBjYWxsXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBsZW4gVmFsdWUgYnl0ZSBsZW5ndGhcclxuICogQHBhcmFtIHsqfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gT3AoZm4sIGxlbiwgdmFsKSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGdW5jdGlvbiB0byBjYWxsLlxyXG4gICAgICogQHR5cGUge2Z1bmN0aW9uKFVpbnQ4QXJyYXksIG51bWJlciwgKil9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZm4gPSBmbjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFZhbHVlIGJ5dGUgbGVuZ3RoLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5sZW4gPSBsZW47XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBOZXh0IG9wZXJhdGlvbi5cclxuICAgICAqIEB0eXBlIHtXcml0ZXIuT3B8dW5kZWZpbmVkfVxyXG4gICAgICovXHJcbiAgICB0aGlzLm5leHQgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBWYWx1ZSB0byB3cml0ZS5cclxuICAgICAqIEB0eXBlIHsqfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnZhbCA9IHZhbDsgLy8gdHlwZSB2YXJpZXNcclxufVxyXG5cclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZnVuY3Rpb24gbm9vcCgpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHktZnVuY3Rpb25cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHdyaXRlciBzdGF0ZSBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBDb3BpZWQgd3JpdGVyIHN0YXRlLlxyXG4gKiBAbWVtYmVyb2YgV3JpdGVyXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge1dyaXRlcn0gd3JpdGVyIFdyaXRlciB0byBjb3B5IHN0YXRlIGZyb21cclxuICogQHByaXZhdGVcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gU3RhdGUod3JpdGVyKSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDdXJyZW50IGhlYWQuXHJcbiAgICAgKiBAdHlwZSB7V3JpdGVyLk9wfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmhlYWQgPSB3cml0ZXIuaGVhZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEN1cnJlbnQgdGFpbC5cclxuICAgICAqIEB0eXBlIHtXcml0ZXIuT3B9XHJcbiAgICAgKi9cclxuICAgIHRoaXMudGFpbCA9IHdyaXRlci50YWlsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3VycmVudCBidWZmZXIgbGVuZ3RoLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5sZW4gPSB3cml0ZXIubGVuO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTmV4dCBzdGF0ZS5cclxuICAgICAqIEB0eXBlIHs/U3RhdGV9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubmV4dCA9IHdyaXRlci5zdGF0ZXM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHdyaXRlciBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBXaXJlIGZvcm1hdCB3cml0ZXIgdXNpbmcgYFVpbnQ4QXJyYXlgIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIGBBcnJheWAuXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gV3JpdGVyKCkge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3VycmVudCBsZW5ndGguXHJcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmxlbiA9IDA7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBPcGVyYXRpb25zIGhlYWQuXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxyXG4gICAgICovXHJcbiAgICB0aGlzLmhlYWQgPSBuZXcgT3Aobm9vcCwgMCwgMCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBPcGVyYXRpb25zIHRhaWxcclxuICAgICAqIEB0eXBlIHtPYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHRoaXMudGFpbCA9IHRoaXMuaGVhZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIExpbmtlZCBmb3JrZWQgc3RhdGVzLlxyXG4gICAgICogQHR5cGUgez9PYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuc3RhdGVzID0gbnVsbDtcclxuXHJcbiAgICAvLyBXaGVuIGEgdmFsdWUgaXMgd3JpdHRlbiwgdGhlIHdyaXRlciBjYWxjdWxhdGVzIGl0cyBieXRlIGxlbmd0aCBhbmQgcHV0cyBpdCBpbnRvIGEgbGlua2VkXHJcbiAgICAvLyBsaXN0IG9mIG9wZXJhdGlvbnMgdG8gcGVyZm9ybSB3aGVuIGZpbmlzaCgpIGlzIGNhbGxlZC4gVGhpcyBib3RoIGFsbG93cyB1cyB0byBhbGxvY2F0ZVxyXG4gICAgLy8gYnVmZmVycyBvZiB0aGUgZXhhY3QgcmVxdWlyZWQgc2l6ZSBhbmQgcmVkdWNlcyB0aGUgYW1vdW50IG9mIHdvcmsgd2UgaGF2ZSB0byBkbyBjb21wYXJlZFxyXG4gICAgLy8gdG8gZmlyc3QgY2FsY3VsYXRpbmcgb3ZlciBvYmplY3RzIGFuZCB0aGVuIGVuY29kaW5nIG92ZXIgb2JqZWN0cy4gSW4gb3VyIGNhc2UsIHRoZSBlbmNvZGluZ1xyXG4gICAgLy8gcGFydCBpcyBqdXN0IGEgbGlua2VkIGxpc3Qgd2FsayBjYWxsaW5nIG9wZXJhdGlvbnMgd2l0aCBhbHJlYWR5IHByZXBhcmVkIHZhbHVlcy5cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgd3JpdGVyLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0J1ZmZlcldyaXRlcnxXcml0ZXJ9IEEge0BsaW5rIEJ1ZmZlcldyaXRlcn0gd2hlbiBCdWZmZXJzIGFyZSBzdXBwb3J0ZWQsIG90aGVyd2lzZSBhIHtAbGluayBXcml0ZXJ9XHJcbiAqL1xyXG5Xcml0ZXIuY3JlYXRlID0gdXRpbC5CdWZmZXJcclxuICAgID8gZnVuY3Rpb24gY3JlYXRlX2J1ZmZlcl9zZXR1cCgpIHtcclxuICAgICAgICByZXR1cm4gKFdyaXRlci5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGVfYnVmZmVyKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmZlcldyaXRlcigpO1xyXG4gICAgICAgIH0pKCk7XHJcbiAgICB9XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgOiBmdW5jdGlvbiBjcmVhdGVfYXJyYXkoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBXcml0ZXIoKTtcclxuICAgIH07XHJcblxyXG4vKipcclxuICogQWxsb2NhdGVzIGEgYnVmZmVyIG9mIHRoZSBzcGVjaWZpZWQgc2l6ZS5cclxuICogQHBhcmFtIHtudW1iZXJ9IHNpemUgQnVmZmVyIHNpemVcclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl9IEJ1ZmZlclxyXG4gKi9cclxuV3JpdGVyLmFsbG9jID0gZnVuY3Rpb24gYWxsb2Moc2l6ZSkge1xyXG4gICAgcmV0dXJuIG5ldyB1dGlsLkFycmF5KHNpemUpO1xyXG59O1xyXG5cclxuLy8gVXNlIFVpbnQ4QXJyYXkgYnVmZmVyIHBvb2wgaW4gdGhlIGJyb3dzZXIsIGp1c3QgbGlrZSBub2RlIGRvZXMgd2l0aCBidWZmZXJzXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbmlmICh1dGlsLkFycmF5ICE9PSBBcnJheSlcclxuICAgIFdyaXRlci5hbGxvYyA9IHV0aWwucG9vbChXcml0ZXIuYWxsb2MsIHV0aWwuQXJyYXkucHJvdG90eXBlLnN1YmFycmF5KTtcclxuXHJcbi8qKlxyXG4gKiBQdXNoZXMgYSBuZXcgb3BlcmF0aW9uIHRvIHRoZSBxdWV1ZS5cclxuICogQHBhcmFtIHtmdW5jdGlvbihVaW50OEFycmF5LCBudW1iZXIsICopfSBmbiBGdW5jdGlvbiB0byBjYWxsXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBsZW4gVmFsdWUgYnl0ZSBsZW5ndGhcclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbCBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIHB1c2goZm4sIGxlbiwgdmFsKSB7XHJcbiAgICB0aGlzLnRhaWwgPSB0aGlzLnRhaWwubmV4dCA9IG5ldyBPcChmbiwgbGVuLCB2YWwpO1xyXG4gICAgdGhpcy5sZW4gKz0gbGVuO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5mdW5jdGlvbiB3cml0ZUJ5dGUodmFsLCBidWYsIHBvcykge1xyXG4gICAgYnVmW3Bvc10gPSB2YWwgJiAyNTU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdyaXRlVmFyaW50MzIodmFsLCBidWYsIHBvcykge1xyXG4gICAgd2hpbGUgKHZhbCA+IDEyNykge1xyXG4gICAgICAgIGJ1Zltwb3MrK10gPSB2YWwgJiAxMjcgfCAxMjg7XHJcbiAgICAgICAgdmFsID4+Pj0gNztcclxuICAgIH1cclxuICAgIGJ1Zltwb3NdID0gdmFsO1xyXG59XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyB2YXJpbnQgd3JpdGVyIG9wZXJhdGlvbiBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBTY2hlZHVsZWQgdmFyaW50IHdyaXRlciBvcGVyYXRpb24uXHJcbiAqIEBleHRlbmRzIE9wXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge251bWJlcn0gbGVuIFZhbHVlIGJ5dGUgbGVuZ3RoXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gVmFyaW50T3AobGVuLCB2YWwpIHtcclxuICAgIHRoaXMubGVuID0gbGVuO1xyXG4gICAgdGhpcy5uZXh0ID0gdW5kZWZpbmVkO1xyXG4gICAgdGhpcy52YWwgPSB2YWw7XHJcbn1cclxuXHJcblZhcmludE9wLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT3AucHJvdG90eXBlKTtcclxuVmFyaW50T3AucHJvdG90eXBlLmZuID0gd3JpdGVWYXJpbnQzMjtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYW4gdW5zaWduZWQgMzIgYml0IHZhbHVlIGFzIGEgdmFyaW50LlxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnVpbnQzMiA9IGZ1bmN0aW9uIHdyaXRlX3VpbnQzMih2YWx1ZSkge1xyXG4gICAgLy8gaGVyZSwgdGhlIGNhbGwgdG8gdGhpcy5wdXNoIGhhcyBiZWVuIGlubGluZWQgYW5kIGEgdmFyaW50IHNwZWNpZmljIE9wIHN1YmNsYXNzIGlzIHVzZWQuXHJcbiAgICAvLyB1aW50MzIgaXMgYnkgZmFyIHRoZSBtb3N0IGZyZXF1ZW50bHkgdXNlZCBvcGVyYXRpb24gYW5kIGJlbmVmaXRzIHNpZ25pZmljYW50bHkgZnJvbSB0aGlzLlxyXG4gICAgdGhpcy5sZW4gKz0gKHRoaXMudGFpbCA9IHRoaXMudGFpbC5uZXh0ID0gbmV3IFZhcmludE9wKFxyXG4gICAgICAgICh2YWx1ZSA9IHZhbHVlID4+PiAwKVxyXG4gICAgICAgICAgICAgICAgPCAxMjggICAgICAgPyAxXHJcbiAgICAgICAgOiB2YWx1ZSA8IDE2Mzg0ICAgICA/IDJcclxuICAgICAgICA6IHZhbHVlIDwgMjA5NzE1MiAgID8gM1xyXG4gICAgICAgIDogdmFsdWUgPCAyNjg0MzU0NTYgPyA0XHJcbiAgICAgICAgOiAgICAgICAgICAgICAgICAgICAgIDUsXHJcbiAgICB2YWx1ZSkpLmxlbjtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIHNpZ25lZCAzMiBiaXQgdmFsdWUgYXMgYSB2YXJpbnQuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmludDMyID0gZnVuY3Rpb24gd3JpdGVfaW50MzIodmFsdWUpIHtcclxuICAgIHJldHVybiB2YWx1ZSA8IDBcclxuICAgICAgICA/IHRoaXMucHVzaCh3cml0ZVZhcmludDY0LCAxMCwgTG9uZ0JpdHMuZnJvbU51bWJlcih2YWx1ZSkpIC8vIDEwIGJ5dGVzIHBlciBzcGVjXHJcbiAgICAgICAgOiB0aGlzLnVpbnQzMih2YWx1ZSk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgMzIgYml0IHZhbHVlIGFzIGEgdmFyaW50LCB6aWctemFnIGVuY29kZWQuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuc2ludDMyID0gZnVuY3Rpb24gd3JpdGVfc2ludDMyKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdGhpcy51aW50MzIoKHZhbHVlIDw8IDEgXiB2YWx1ZSA+PiAzMSkgPj4+IDApO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gd3JpdGVWYXJpbnQ2NCh2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICB3aGlsZSAodmFsLmhpKSB7XHJcbiAgICAgICAgYnVmW3BvcysrXSA9IHZhbC5sbyAmIDEyNyB8IDEyODtcclxuICAgICAgICB2YWwubG8gPSAodmFsLmxvID4+PiA3IHwgdmFsLmhpIDw8IDI1KSA+Pj4gMDtcclxuICAgICAgICB2YWwuaGkgPj4+PSA3O1xyXG4gICAgfVxyXG4gICAgd2hpbGUgKHZhbC5sbyA+IDEyNykge1xyXG4gICAgICAgIGJ1Zltwb3MrK10gPSB2YWwubG8gJiAxMjcgfCAxMjg7XHJcbiAgICAgICAgdmFsLmxvID0gdmFsLmxvID4+PiA3O1xyXG4gICAgfVxyXG4gICAgYnVmW3BvcysrXSA9IHZhbC5sbztcclxufVxyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhbiB1bnNpZ25lZCA2NCBiaXQgdmFsdWUgYXMgYSB2YXJpbnQuXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBgdmFsdWVgIGlzIGEgc3RyaW5nIGFuZCBubyBsb25nIGxpYnJhcnkgaXMgcHJlc2VudC5cclxuICovXHJcbldyaXRlci5wcm90b3R5cGUudWludDY0ID0gZnVuY3Rpb24gd3JpdGVfdWludDY0KHZhbHVlKSB7XHJcbiAgICB2YXIgYml0cyA9IExvbmdCaXRzLmZyb20odmFsdWUpO1xyXG4gICAgcmV0dXJuIHRoaXMucHVzaCh3cml0ZVZhcmludDY0LCBiaXRzLmxlbmd0aCgpLCBiaXRzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzaWduZWQgNjQgYml0IHZhbHVlIGFzIGEgdmFyaW50LlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtMb25nfG51bWJlcnxzdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGB2YWx1ZWAgaXMgYSBzdHJpbmcgYW5kIG5vIGxvbmcgbGlicmFyeSBpcyBwcmVzZW50LlxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5pbnQ2NCA9IFdyaXRlci5wcm90b3R5cGUudWludDY0O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIHNpZ25lZCA2NCBiaXQgdmFsdWUgYXMgYSB2YXJpbnQsIHppZy16YWcgZW5jb2RlZC5cclxuICogQHBhcmFtIHtMb25nfG51bWJlcnxzdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGB2YWx1ZWAgaXMgYSBzdHJpbmcgYW5kIG5vIGxvbmcgbGlicmFyeSBpcyBwcmVzZW50LlxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5zaW50NjQgPSBmdW5jdGlvbiB3cml0ZV9zaW50NjQodmFsdWUpIHtcclxuICAgIHZhciBiaXRzID0gTG9uZ0JpdHMuZnJvbSh2YWx1ZSkuenpFbmNvZGUoKTtcclxuICAgIHJldHVybiB0aGlzLnB1c2god3JpdGVWYXJpbnQ2NCwgYml0cy5sZW5ndGgoKSwgYml0cyk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgYm9vbGlzaCB2YWx1ZSBhcyBhIHZhcmludC5cclxuICogQHBhcmFtIHtib29sZWFufSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuYm9vbCA9IGZ1bmN0aW9uIHdyaXRlX2Jvb2wodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLnB1c2god3JpdGVCeXRlLCAxLCB2YWx1ZSA/IDEgOiAwKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIHdyaXRlRml4ZWQzMih2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICBidWZbcG9zICAgIF0gPSAgdmFsICAgICAgICAgJiAyNTU7XHJcbiAgICBidWZbcG9zICsgMV0gPSAgdmFsID4+PiA4ICAgJiAyNTU7XHJcbiAgICBidWZbcG9zICsgMl0gPSAgdmFsID4+PiAxNiAgJiAyNTU7XHJcbiAgICBidWZbcG9zICsgM10gPSAgdmFsID4+PiAyNDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhbiB1bnNpZ25lZCAzMiBiaXQgdmFsdWUgYXMgZml4ZWQgMzIgYml0cy5cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5maXhlZDMyID0gZnVuY3Rpb24gd3JpdGVfZml4ZWQzMih2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHRoaXMucHVzaCh3cml0ZUZpeGVkMzIsIDQsIHZhbHVlID4+PiAwKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzaWduZWQgMzIgYml0IHZhbHVlIGFzIGZpeGVkIDMyIGJpdHMuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnNmaXhlZDMyID0gV3JpdGVyLnByb3RvdHlwZS5maXhlZDMyO1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhbiB1bnNpZ25lZCA2NCBiaXQgdmFsdWUgYXMgZml4ZWQgNjQgYml0cy5cclxuICogQHBhcmFtIHtMb25nfG51bWJlcnxzdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGB2YWx1ZWAgaXMgYSBzdHJpbmcgYW5kIG5vIGxvbmcgbGlicmFyeSBpcyBwcmVzZW50LlxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5maXhlZDY0ID0gZnVuY3Rpb24gd3JpdGVfZml4ZWQ2NCh2YWx1ZSkge1xyXG4gICAgdmFyIGJpdHMgPSBMb25nQml0cy5mcm9tKHZhbHVlKTtcclxuICAgIHJldHVybiB0aGlzLnB1c2god3JpdGVGaXhlZDMyLCA0LCBiaXRzLmxvKS5wdXNoKHdyaXRlRml4ZWQzMiwgNCwgYml0cy5oaSk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgc2lnbmVkIDY0IGJpdCB2YWx1ZSBhcyBmaXhlZCA2NCBiaXRzLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtMb25nfG51bWJlcnxzdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGB2YWx1ZWAgaXMgYSBzdHJpbmcgYW5kIG5vIGxvbmcgbGlicmFyeSBpcyBwcmVzZW50LlxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5zZml4ZWQ2NCA9IFdyaXRlci5wcm90b3R5cGUuZml4ZWQ2NDtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBmbG9hdCAoMzIgYml0KS5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZmxvYXQgPSBmdW5jdGlvbiB3cml0ZV9mbG9hdCh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHRoaXMucHVzaCh1dGlsLmZsb2F0LndyaXRlRmxvYXRMRSwgNCwgdmFsdWUpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIGRvdWJsZSAoNjQgYml0IGZsb2F0KS5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZG91YmxlID0gZnVuY3Rpb24gd3JpdGVfZG91YmxlKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdGhpcy5wdXNoKHV0aWwuZmxvYXQud3JpdGVEb3VibGVMRSwgOCwgdmFsdWUpO1xyXG59O1xyXG5cclxudmFyIHdyaXRlQnl0ZXMgPSB1dGlsLkFycmF5LnByb3RvdHlwZS5zZXRcclxuICAgID8gZnVuY3Rpb24gd3JpdGVCeXRlc19zZXQodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgIGJ1Zi5zZXQodmFsLCBwb3MpOyAvLyBhbHNvIHdvcmtzIGZvciBwbGFpbiBhcnJheSB2YWx1ZXNcclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICA6IGZ1bmN0aW9uIHdyaXRlQnl0ZXNfZm9yKHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbC5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgYnVmW3BvcyArIGldID0gdmFsW2ldO1xyXG4gICAgfTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzZXF1ZW5jZSBvZiBieXRlcy5cclxuICogQHBhcmFtIHtVaW50OEFycmF5fHN0cmluZ30gdmFsdWUgQnVmZmVyIG9yIGJhc2U2NCBlbmNvZGVkIHN0cmluZyB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuYnl0ZXMgPSBmdW5jdGlvbiB3cml0ZV9ieXRlcyh2YWx1ZSkge1xyXG4gICAgdmFyIGxlbiA9IHZhbHVlLmxlbmd0aCA+Pj4gMDtcclxuICAgIGlmICghbGVuKVxyXG4gICAgICAgIHJldHVybiB0aGlzLnB1c2god3JpdGVCeXRlLCAxLCAwKTtcclxuICAgIGlmICh1dGlsLmlzU3RyaW5nKHZhbHVlKSkge1xyXG4gICAgICAgIHZhciBidWYgPSBXcml0ZXIuYWxsb2MobGVuID0gYmFzZTY0Lmxlbmd0aCh2YWx1ZSkpO1xyXG4gICAgICAgIGJhc2U2NC5kZWNvZGUodmFsdWUsIGJ1ZiwgMCk7XHJcbiAgICAgICAgdmFsdWUgPSBidWY7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy51aW50MzIobGVuKS5wdXNoKHdyaXRlQnl0ZXMsIGxlbiwgdmFsdWUpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIHN0cmluZy5cclxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5zdHJpbmcgPSBmdW5jdGlvbiB3cml0ZV9zdHJpbmcodmFsdWUpIHtcclxuICAgIHZhciBsZW4gPSB1dGY4Lmxlbmd0aCh2YWx1ZSk7XHJcbiAgICByZXR1cm4gbGVuXHJcbiAgICAgICAgPyB0aGlzLnVpbnQzMihsZW4pLnB1c2godXRmOC53cml0ZSwgbGVuLCB2YWx1ZSlcclxuICAgICAgICA6IHRoaXMucHVzaCh3cml0ZUJ5dGUsIDEsIDApO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEZvcmtzIHRoaXMgd3JpdGVyJ3Mgc3RhdGUgYnkgcHVzaGluZyBpdCB0byBhIHN0YWNrLlxyXG4gKiBDYWxsaW5nIHtAbGluayBXcml0ZXIjcmVzZXR8cmVzZXR9IG9yIHtAbGluayBXcml0ZXIjbGRlbGltfGxkZWxpbX0gcmVzZXRzIHRoZSB3cml0ZXIgdG8gdGhlIHByZXZpb3VzIHN0YXRlLlxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZm9yayA9IGZ1bmN0aW9uIGZvcmsoKSB7XHJcbiAgICB0aGlzLnN0YXRlcyA9IG5ldyBTdGF0ZSh0aGlzKTtcclxuICAgIHRoaXMuaGVhZCA9IHRoaXMudGFpbCA9IG5ldyBPcChub29wLCAwLCAwKTtcclxuICAgIHRoaXMubGVuID0gMDtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlc2V0cyB0aGlzIGluc3RhbmNlIHRvIHRoZSBsYXN0IHN0YXRlLlxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiByZXNldCgpIHtcclxuICAgIGlmICh0aGlzLnN0YXRlcykge1xyXG4gICAgICAgIHRoaXMuaGVhZCAgID0gdGhpcy5zdGF0ZXMuaGVhZDtcclxuICAgICAgICB0aGlzLnRhaWwgICA9IHRoaXMuc3RhdGVzLnRhaWw7XHJcbiAgICAgICAgdGhpcy5sZW4gICAgPSB0aGlzLnN0YXRlcy5sZW47XHJcbiAgICAgICAgdGhpcy5zdGF0ZXMgPSB0aGlzLnN0YXRlcy5uZXh0O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmhlYWQgPSB0aGlzLnRhaWwgPSBuZXcgT3Aobm9vcCwgMCwgMCk7XHJcbiAgICAgICAgdGhpcy5sZW4gID0gMDtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlc2V0cyB0byB0aGUgbGFzdCBzdGF0ZSBhbmQgYXBwZW5kcyB0aGUgZm9yayBzdGF0ZSdzIGN1cnJlbnQgd3JpdGUgbGVuZ3RoIGFzIGEgdmFyaW50IGZvbGxvd2VkIGJ5IGl0cyBvcGVyYXRpb25zLlxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUubGRlbGltID0gZnVuY3Rpb24gbGRlbGltKCkge1xyXG4gICAgdmFyIGhlYWQgPSB0aGlzLmhlYWQsXHJcbiAgICAgICAgdGFpbCA9IHRoaXMudGFpbCxcclxuICAgICAgICBsZW4gID0gdGhpcy5sZW47XHJcbiAgICB0aGlzLnJlc2V0KCkudWludDMyKGxlbik7XHJcbiAgICBpZiAobGVuKSB7XHJcbiAgICAgICAgdGhpcy50YWlsLm5leHQgPSBoZWFkLm5leHQ7IC8vIHNraXAgbm9vcFxyXG4gICAgICAgIHRoaXMudGFpbCA9IHRhaWw7XHJcbiAgICAgICAgdGhpcy5sZW4gKz0gbGVuO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogRmluaXNoZXMgdGhlIHdyaXRlIG9wZXJhdGlvbi5cclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl9IEZpbmlzaGVkIGJ1ZmZlclxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5maW5pc2ggPSBmdW5jdGlvbiBmaW5pc2goKSB7XHJcbiAgICB2YXIgaGVhZCA9IHRoaXMuaGVhZC5uZXh0LCAvLyBza2lwIG5vb3BcclxuICAgICAgICBidWYgID0gdGhpcy5jb25zdHJ1Y3Rvci5hbGxvYyh0aGlzLmxlbiksXHJcbiAgICAgICAgcG9zICA9IDA7XHJcbiAgICB3aGlsZSAoaGVhZCkge1xyXG4gICAgICAgIGhlYWQuZm4oaGVhZC52YWwsIGJ1ZiwgcG9zKTtcclxuICAgICAgICBwb3MgKz0gaGVhZC5sZW47XHJcbiAgICAgICAgaGVhZCA9IGhlYWQubmV4dDtcclxuICAgIH1cclxuICAgIC8vIHRoaXMuaGVhZCA9IHRoaXMudGFpbCA9IG51bGw7XHJcbiAgICByZXR1cm4gYnVmO1xyXG59O1xyXG5cclxuV3JpdGVyLl9jb25maWd1cmUgPSBmdW5jdGlvbihCdWZmZXJXcml0ZXJfKSB7XHJcbiAgICBCdWZmZXJXcml0ZXIgPSBCdWZmZXJXcml0ZXJfO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXJXcml0ZXI7XHJcblxyXG4vLyBleHRlbmRzIFdyaXRlclxyXG52YXIgV3JpdGVyID0gcmVxdWlyZShcIi4vd3JpdGVyXCIpO1xyXG4oQnVmZmVyV3JpdGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoV3JpdGVyLnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gQnVmZmVyV3JpdGVyO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi91dGlsL21pbmltYWxcIik7XHJcblxyXG52YXIgQnVmZmVyID0gdXRpbC5CdWZmZXI7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBidWZmZXIgd3JpdGVyIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFdpcmUgZm9ybWF0IHdyaXRlciB1c2luZyBub2RlIGJ1ZmZlcnMuXHJcbiAqIEBleHRlbmRzIFdyaXRlclxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIEJ1ZmZlcldyaXRlcigpIHtcclxuICAgIFdyaXRlci5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG4vKipcclxuICogQWxsb2NhdGVzIGEgYnVmZmVyIG9mIHRoZSBzcGVjaWZpZWQgc2l6ZS5cclxuICogQHBhcmFtIHtudW1iZXJ9IHNpemUgQnVmZmVyIHNpemVcclxuICogQHJldHVybnMge0J1ZmZlcn0gQnVmZmVyXHJcbiAqL1xyXG5CdWZmZXJXcml0ZXIuYWxsb2MgPSBmdW5jdGlvbiBhbGxvY19idWZmZXIoc2l6ZSkge1xyXG4gICAgcmV0dXJuIChCdWZmZXJXcml0ZXIuYWxsb2MgPSB1dGlsLl9CdWZmZXJfYWxsb2NVbnNhZmUpKHNpemUpO1xyXG59O1xyXG5cclxudmFyIHdyaXRlQnl0ZXNCdWZmZXIgPSBCdWZmZXIgJiYgQnVmZmVyLnByb3RvdHlwZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgJiYgQnVmZmVyLnByb3RvdHlwZS5zZXQubmFtZSA9PT0gXCJzZXRcIlxyXG4gICAgPyBmdW5jdGlvbiB3cml0ZUJ5dGVzQnVmZmVyX3NldCh2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgYnVmLnNldCh2YWwsIHBvcyk7IC8vIGZhc3RlciB0aGFuIGNvcHkgKHJlcXVpcmVzIG5vZGUgPj0gNCB3aGVyZSBCdWZmZXJzIGV4dGVuZCBVaW50OEFycmF5IGFuZCBzZXQgaXMgcHJvcGVybHkgaW5oZXJpdGVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhbHNvIHdvcmtzIGZvciBwbGFpbiBhcnJheSB2YWx1ZXNcclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICA6IGZ1bmN0aW9uIHdyaXRlQnl0ZXNCdWZmZXJfY29weSh2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgaWYgKHZhbC5jb3B5KSAvLyBCdWZmZXIgdmFsdWVzXHJcbiAgICAgICAgICAgIHZhbC5jb3B5KGJ1ZiwgcG9zLCAwLCB2YWwubGVuZ3RoKTtcclxuICAgICAgICBlbHNlIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsLmxlbmd0aDspIC8vIHBsYWluIGFycmF5IHZhbHVlc1xyXG4gICAgICAgICAgICBidWZbcG9zKytdID0gdmFsW2krK107XHJcbiAgICB9O1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuQnVmZmVyV3JpdGVyLnByb3RvdHlwZS5ieXRlcyA9IGZ1bmN0aW9uIHdyaXRlX2J5dGVzX2J1ZmZlcih2YWx1ZSkge1xyXG4gICAgaWYgKHV0aWwuaXNTdHJpbmcodmFsdWUpKVxyXG4gICAgICAgIHZhbHVlID0gdXRpbC5fQnVmZmVyX2Zyb20odmFsdWUsIFwiYmFzZTY0XCIpO1xyXG4gICAgdmFyIGxlbiA9IHZhbHVlLmxlbmd0aCA+Pj4gMDtcclxuICAgIHRoaXMudWludDMyKGxlbik7XHJcbiAgICBpZiAobGVuKVxyXG4gICAgICAgIHRoaXMucHVzaCh3cml0ZUJ5dGVzQnVmZmVyLCBsZW4sIHZhbHVlKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gd3JpdGVTdHJpbmdCdWZmZXIodmFsLCBidWYsIHBvcykge1xyXG4gICAgaWYgKHZhbC5sZW5ndGggPCA0MCkgLy8gcGxhaW4ganMgaXMgZmFzdGVyIGZvciBzaG9ydCBzdHJpbmdzIChwcm9iYWJseSBkdWUgdG8gcmVkdW5kYW50IGFzc2VydGlvbnMpXHJcbiAgICAgICAgdXRpbC51dGY4LndyaXRlKHZhbCwgYnVmLCBwb3MpO1xyXG4gICAgZWxzZVxyXG4gICAgICAgIGJ1Zi51dGY4V3JpdGUodmFsLCBwb3MpO1xyXG59XHJcblxyXG4vKipcclxuICogQG92ZXJyaWRlXHJcbiAqL1xyXG5CdWZmZXJXcml0ZXIucHJvdG90eXBlLnN0cmluZyA9IGZ1bmN0aW9uIHdyaXRlX3N0cmluZ19idWZmZXIodmFsdWUpIHtcclxuICAgIHZhciBsZW4gPSBCdWZmZXIuYnl0ZUxlbmd0aCh2YWx1ZSk7XHJcbiAgICB0aGlzLnVpbnQzMihsZW4pO1xyXG4gICAgaWYgKGxlbilcclxuICAgICAgICB0aGlzLnB1c2god3JpdGVTdHJpbmdCdWZmZXIsIGxlbiwgdmFsdWUpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIEZpbmlzaGVzIHRoZSB3cml0ZSBvcGVyYXRpb24uXHJcbiAqIEBuYW1lIEJ1ZmZlcldyaXRlciNmaW5pc2hcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtCdWZmZXJ9IEZpbmlzaGVkIGJ1ZmZlclxyXG4gKi9cclxuIiwiLyplc2xpbnQtZGlzYWJsZSBibG9jay1zY29wZWQtdmFyLCBuby1yZWRlY2xhcmUsIG5vLWNvbnRyb2wtcmVnZXgsIG5vLXByb3RvdHlwZS1idWlsdGlucyovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyICRwcm90b2J1ZiA9IHJlcXVpcmUoXCJwcm90b2J1ZmpzL21pbmltYWxcIik7XG5cbi8vIENvbW1vbiBhbGlhc2VzXG52YXIgJFJlYWRlciA9ICRwcm90b2J1Zi5SZWFkZXIsICRXcml0ZXIgPSAkcHJvdG9idWYuV3JpdGVyLCAkdXRpbCA9ICRwcm90b2J1Zi51dGlsO1xuXG4vLyBFeHBvcnRlZCByb290IG5hbWVzcGFjZVxudmFyICRyb290ID0gJHByb3RvYnVmLnJvb3RzW1wiZGVmYXVsdFwiXSB8fCAoJHByb3RvYnVmLnJvb3RzW1wiZGVmYXVsdFwiXSA9IHt9KTtcblxuJHJvb3Qud2VicmVhbG1zID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogTmFtZXNwYWNlIHdlYnJlYWxtcy5cbiAgICAgKiBAZXhwb3J0cyB3ZWJyZWFsbXNcbiAgICAgKiBAbmFtZXNwYWNlXG4gICAgICovXG4gICAgdmFyIHdlYnJlYWxtcyA9IHt9O1xuXG4gICAgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZSA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFByb3RvY29sTWVzc2FnZS5cbiAgICAgICAgICogQHR5cGVkZWYgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZSRQcm9wZXJ0aWVzXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5NZXNzYWdlVHlwZX0gW1R5cGVdIFByb3RvY29sTWVzc2FnZSBUeXBlLlxuICAgICAgICAgKiBAcHJvcGVydHkge3N0cmluZ30gW1NlbmRlcl0gUHJvdG9jb2xNZXNzYWdlIFNlbmRlci5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSRQcm9wZXJ0aWVzfSBbSGVsbG9dIFByb3RvY29sTWVzc2FnZSBIZWxsby5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlJFByb3BlcnRpZXN9IFtDb25uZWN0XSBQcm90b2NvbE1lc3NhZ2UgQ29ubmVjdC5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlJFByb3BlcnRpZXN9IFtEaXNjb25uZWN0XSBQcm90b2NvbE1lc3NhZ2UgRGlzY29ubmVjdC5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlJFByb3BlcnRpZXN9IFtQaW5nXSBQcm90b2NvbE1lc3NhZ2UgUGluZy5cbiAgICAgICAgICogQHByb3BlcnR5IHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXN9IFtQb25nXSBQcm90b2NvbE1lc3NhZ2UgUG9uZy5cbiAgICAgICAgICogQHByb3BlcnR5IHtBcnJheS48d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UkUHJvcGVydGllcz59IFtTcGF3bl0gUHJvdG9jb2xNZXNzYWdlIFNwYXduLlxuICAgICAgICAgKiBAcHJvcGVydHkge0FycmF5Ljx3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlJFByb3BlcnRpZXM+fSBbVW5zcGF3bl0gUHJvdG9jb2xNZXNzYWdlIFVuc3Bhd24uXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlJFByb3BlcnRpZXM+fSBbUG9zaXRpb25dIFByb3RvY29sTWVzc2FnZSBQb3NpdGlvbi5cbiAgICAgICAgICogQHByb3BlcnR5IHtBcnJheS48d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UkUHJvcGVydGllcz59IFtSb3RhdGlvbl0gUHJvdG9jb2xNZXNzYWdlIFJvdGF0aW9uLlxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBQcm90b2NvbE1lc3NhZ2UuXG4gICAgICAgICAqIEBleHBvcnRzIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2VcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBQcm90b2NvbE1lc3NhZ2UocHJvcGVydGllcykge1xuICAgICAgICAgICAgdGhpcy5TcGF3biA9IFtdO1xuICAgICAgICAgICAgdGhpcy5VbnNwYXduID0gW107XG4gICAgICAgICAgICB0aGlzLlBvc2l0aW9uID0gW107XG4gICAgICAgICAgICB0aGlzLlJvdGF0aW9uID0gW107XG4gICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBUeXBlLlxuICAgICAgICAgKiBAdHlwZSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5NZXNzYWdlVHlwZX1cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuVHlwZSA9IDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBTZW5kZXIuXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UucHJvdG90eXBlLlNlbmRlciA9IFwiXCI7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBIZWxsby5cbiAgICAgICAgICogQHR5cGUgeyh3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSRQcm9wZXJ0aWVzfG51bGwpfVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5IZWxsbyA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBDb25uZWN0LlxuICAgICAgICAgKiBAdHlwZSB7KHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UkUHJvcGVydGllc3xudWxsKX1cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuQ29ubmVjdCA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBEaXNjb25uZWN0LlxuICAgICAgICAgKiBAdHlwZSB7KHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2UkUHJvcGVydGllc3xudWxsKX1cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuRGlzY29ubmVjdCA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBQaW5nLlxuICAgICAgICAgKiBAdHlwZSB7KHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UkUHJvcGVydGllc3xudWxsKX1cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuUGluZyA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBQb25nLlxuICAgICAgICAgKiBAdHlwZSB7KHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UkUHJvcGVydGllc3xudWxsKX1cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuUG9uZyA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBTcGF3bi5cbiAgICAgICAgICogQHR5cGUge0FycmF5Ljx3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzPn1cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuU3Bhd24gPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcm90b2NvbE1lc3NhZ2UgVW5zcGF3bi5cbiAgICAgICAgICogQHR5cGUge0FycmF5Ljx3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlJFByb3BlcnRpZXM+fVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5VbnNwYXduID0gJHV0aWwuZW1wdHlBcnJheTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvdG9jb2xNZXNzYWdlIFBvc2l0aW9uLlxuICAgICAgICAgKiBAdHlwZSB7QXJyYXkuPHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlJFByb3BlcnRpZXM+fVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS5Qb3NpdGlvbiA9ICR1dGlsLmVtcHR5QXJyYXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3RvY29sTWVzc2FnZSBSb3RhdGlvbi5cbiAgICAgICAgICogQHR5cGUge0FycmF5Ljx3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzPn1cbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5wcm90b3R5cGUuUm90YXRpb24gPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IFByb3RvY29sTWVzc2FnZSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlfSBQcm90b2NvbE1lc3NhZ2UgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm90b2NvbE1lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5UeXBlICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlR5cGVcIikpXG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAxLCB3aXJlVHlwZSAwID0qLzgpLnVpbnQzMihtZXNzYWdlLlR5cGUpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuU2VuZGVyICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlNlbmRlclwiKSlcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDIsIHdpcmVUeXBlIDIgPSovMTgpLnN0cmluZyhtZXNzYWdlLlNlbmRlcik7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5IZWxsbyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJIZWxsb1wiKSlcbiAgICAgICAgICAgICAgICAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZS5lbmNvZGUobWVzc2FnZS5IZWxsbywgd3JpdGVyLnVpbnQzMigvKiBpZCAxMywgd2lyZVR5cGUgMiA9Ki8xMDYpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Db25uZWN0ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIkNvbm5lY3RcIikpXG4gICAgICAgICAgICAgICAgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZS5lbmNvZGUobWVzc2FnZS5Db25uZWN0LCB3cml0ZXIudWludDMyKC8qIGlkIDE0LCB3aXJlVHlwZSAyID0qLzExNCkuZm9yaygpKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLkRpc2Nvbm5lY3QgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiRGlzY29ubmVjdFwiKSlcbiAgICAgICAgICAgICAgICAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlLmVuY29kZShtZXNzYWdlLkRpc2Nvbm5lY3QsIHdyaXRlci51aW50MzIoLyogaWQgMTUsIHdpcmVUeXBlIDIgPSovMTIyKS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUGluZyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQaW5nXCIpKVxuICAgICAgICAgICAgICAgICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UuZW5jb2RlKG1lc3NhZ2UuUGluZywgd3JpdGVyLnVpbnQzMigvKiBpZCAxNiwgd2lyZVR5cGUgMiA9Ki8xMzApLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Qb25nICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlBvbmdcIikpXG4gICAgICAgICAgICAgICAgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZS5lbmNvZGUobWVzc2FnZS5Qb25nLCB3cml0ZXIudWludDMyKC8qIGlkIDE3LCB3aXJlVHlwZSAyID0qLzEzOCkuZm9yaygpKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlNwYXduICE9IG51bGwgJiYgbWVzc2FnZS5TcGF3bi5sZW5ndGgpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLlNwYXduLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZS5lbmNvZGUobWVzc2FnZS5TcGF3bltpXSwgd3JpdGVyLnVpbnQzMigvKiBpZCAxOCwgd2lyZVR5cGUgMiA9Ki8xNDYpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5VbnNwYXduICE9IG51bGwgJiYgbWVzc2FnZS5VbnNwYXduLmxlbmd0aClcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UuVW5zcGF3bi5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZS5lbmNvZGUobWVzc2FnZS5VbnNwYXduW2ldLCB3cml0ZXIudWludDMyKC8qIGlkIDE5LCB3aXJlVHlwZSAyID0qLzE1NCkuZm9yaygpKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlBvc2l0aW9uICE9IG51bGwgJiYgbWVzc2FnZS5Qb3NpdGlvbi5sZW5ndGgpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLlBvc2l0aW9uLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZS5lbmNvZGUobWVzc2FnZS5Qb3NpdGlvbltpXSwgd3JpdGVyLnVpbnQzMigvKiBpZCAyMCwgd2lyZVR5cGUgMiA9Ki8xNjIpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Sb3RhdGlvbiAhPSBudWxsICYmIG1lc3NhZ2UuUm90YXRpb24ubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5Sb3RhdGlvbi5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UuZW5jb2RlKG1lc3NhZ2UuUm90YXRpb25baV0sIHdyaXRlci51aW50MzIoLyogaWQgMjEsIHdpcmVUeXBlIDIgPSovMTcwKS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFByb3RvY29sTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikubGRlbGltKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlY29kZXMgYSBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlci5cbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlfSBQcm90b2NvbE1lc3NhZ2VcbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZSgpO1xuICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlR5cGUgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5TZW5kZXIgPSByZWFkZXIuc3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTM6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuSGVsbG8gPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZS5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE0OlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLkNvbm5lY3QgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTU6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuRGlzY29ubmVjdCA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2UuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxNjpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5QaW5nID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZS5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE3OlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlBvbmcgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTg6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UuU3Bhd24gJiYgbWVzc2FnZS5TcGF3bi5sZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5TcGF3biA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlNwYXduLnB1c2goJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTk6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UuVW5zcGF3biAmJiBtZXNzYWdlLlVuc3Bhd24ubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuVW5zcGF3biA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlVuc3Bhd24ucHVzaCgkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDIwOlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLlBvc2l0aW9uICYmIG1lc3NhZ2UuUG9zaXRpb24ubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuUG9zaXRpb24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5Qb3NpdGlvbi5wdXNoKCRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDIxOlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLlJvdGF0aW9uICYmIG1lc3NhZ2UuUm90YXRpb24ubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuUm90YXRpb24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5Sb3RhdGlvbi5wdXNoKCRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZX0gUHJvdG9jb2xNZXNzYWdlXG4gICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZlcmlmaWVzIGEgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2UuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuVHlwZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJUeXBlXCIpKVxuICAgICAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS5UeXBlKSB7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiVHlwZTogZW51bSB2YWx1ZSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICBjYXNlIDEzOlxuICAgICAgICAgICAgICAgIGNhc2UgMTQ6XG4gICAgICAgICAgICAgICAgY2FzZSAxNTpcbiAgICAgICAgICAgICAgICBjYXNlIDE2OlxuICAgICAgICAgICAgICAgIGNhc2UgMTc6XG4gICAgICAgICAgICAgICAgY2FzZSAxODpcbiAgICAgICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgIGNhc2UgMjA6XG4gICAgICAgICAgICAgICAgY2FzZSAyMTpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuU2VuZGVyICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlNlbmRlclwiKSlcbiAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzU3RyaW5nKG1lc3NhZ2UuU2VuZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiU2VuZGVyOiBzdHJpbmcgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLkhlbGxvICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIkhlbGxvXCIpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UudmVyaWZ5KG1lc3NhZ2UuSGVsbG8pO1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiSGVsbG8uXCIgKyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLkNvbm5lY3QgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiQ29ubmVjdFwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UudmVyaWZ5KG1lc3NhZ2UuQ29ubmVjdCk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJDb25uZWN0LlwiICsgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5EaXNjb25uZWN0ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIkRpc2Nvbm5lY3RcIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlLnZlcmlmeShtZXNzYWdlLkRpc2Nvbm5lY3QpO1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiRGlzY29ubmVjdC5cIiArIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUGluZyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQaW5nXCIpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZS52ZXJpZnkobWVzc2FnZS5QaW5nKTtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlBpbmcuXCIgKyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLlBvbmcgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUG9uZ1wiKSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UudmVyaWZ5KG1lc3NhZ2UuUG9uZyk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJQb25nLlwiICsgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5TcGF3biAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJTcGF3blwiKSkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlLlNwYXduKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiU3Bhd246IGFycmF5IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLlNwYXduLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlLnZlcmlmeShtZXNzYWdlLlNwYXduW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiU3Bhd24uXCIgKyBlcnJvcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5VbnNwYXduICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlVuc3Bhd25cIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5VbnNwYXduKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiVW5zcGF3bjogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UuVW5zcGF3bi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlLnZlcmlmeShtZXNzYWdlLlVuc3Bhd25baV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJVbnNwYXduLlwiICsgZXJyb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUG9zaXRpb24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUG9zaXRpb25cIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5Qb3NpdGlvbikpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlBvc2l0aW9uOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5Qb3NpdGlvbi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZS52ZXJpZnkobWVzc2FnZS5Qb3NpdGlvbltpXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlBvc2l0aW9uLlwiICsgZXJyb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUm90YXRpb24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUm90YXRpb25cIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5Sb3RhdGlvbikpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlJvdGF0aW9uOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5Sb3RhdGlvbi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZS52ZXJpZnkobWVzc2FnZS5Sb3RhdGlvbltpXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlJvdGF0aW9uLlwiICsgZXJyb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlfSBQcm90b2NvbE1lc3NhZ2VcbiAgICAgICAgICovXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlKVxuICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlKCk7XG4gICAgICAgICAgICBzd2l0Y2ggKG9iamVjdC5UeXBlKSB7XG4gICAgICAgICAgICBjYXNlIFwiTk9ORVwiOlxuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiSEVMTE9cIjpcbiAgICAgICAgICAgIGNhc2UgMTM6XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gMTM7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiQ09OTkVDVFwiOlxuICAgICAgICAgICAgY2FzZSAxNDpcbiAgICAgICAgICAgICAgICBtZXNzYWdlLlR5cGUgPSAxNDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJESVNDT05ORUNUXCI6XG4gICAgICAgICAgICBjYXNlIDE1OlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDE1O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlBJTkdcIjpcbiAgICAgICAgICAgIGNhc2UgMTY6XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5UeXBlID0gMTY7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiUE9OR1wiOlxuICAgICAgICAgICAgY2FzZSAxNzpcbiAgICAgICAgICAgICAgICBtZXNzYWdlLlR5cGUgPSAxNztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJTUEFXTlwiOlxuICAgICAgICAgICAgY2FzZSAxODpcbiAgICAgICAgICAgICAgICBtZXNzYWdlLlR5cGUgPSAxODtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJVTlNQQVdOXCI6XG4gICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDE5O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlBPU0lUSU9OXCI6XG4gICAgICAgICAgICBjYXNlIDIwOlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDIwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlJPVEFUSU9OXCI6XG4gICAgICAgICAgICBjYXNlIDIxOlxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuVHlwZSA9IDIxO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5TZW5kZXIgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBtZXNzYWdlLlNlbmRlciA9IFN0cmluZyhvYmplY3QuU2VuZGVyKTtcbiAgICAgICAgICAgIGlmIChvYmplY3QuSGVsbG8gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LkhlbGxvICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsbzogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuSGVsbG8gPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZS5mcm9tT2JqZWN0KG9iamVjdC5IZWxsbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LkNvbm5lY3QgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LkNvbm5lY3QgIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3Q6IG9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLkNvbm5lY3QgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlLmZyb21PYmplY3Qob2JqZWN0LkNvbm5lY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5EaXNjb25uZWN0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5EaXNjb25uZWN0ICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0OiBvYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5EaXNjb25uZWN0ID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZS5mcm9tT2JqZWN0KG9iamVjdC5EaXNjb25uZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QuUGluZyAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QuUGluZyAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZzogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuUGluZyA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UuZnJvbU9iamVjdChvYmplY3QuUGluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LlBvbmcgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LlBvbmcgIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmc6IG9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLlBvbmcgPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLmZyb21PYmplY3Qob2JqZWN0LlBvbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5TcGF3bikge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QuU3Bhd24pKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5TcGF3bjogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5TcGF3biA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LlNwYXduLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LlNwYXduW2ldICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuU3Bhd246IG9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5TcGF3bltpXSA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlLmZyb21PYmplY3Qob2JqZWN0LlNwYXduW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LlVuc3Bhd24pIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LlVuc3Bhd24pKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5VbnNwYXduOiBhcnJheSBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLlVuc3Bhd24gPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdC5VbnNwYXduLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LlVuc3Bhd25baV0gIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5VbnNwYXduOiBvYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuVW5zcGF3bltpXSA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UuZnJvbU9iamVjdChvYmplY3QuVW5zcGF3bltpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5Qb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QuUG9zaXRpb24pKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbjogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5Qb3NpdGlvbiA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LlBvc2l0aW9uLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LlBvc2l0aW9uW2ldICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb246IG9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5Qb3NpdGlvbltpXSA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlLmZyb21PYmplY3Qob2JqZWN0LlBvc2l0aW9uW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LlJvdGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG9iamVjdC5Sb3RhdGlvbikpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uOiBhcnJheSBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLlJvdGF0aW9uID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3QuUm90YXRpb24ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QuUm90YXRpb25baV0gIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbjogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlJvdGF0aW9uW2ldID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UuZnJvbU9iamVjdChvYmplY3QuUm90YXRpb25baV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5mcm9tT2JqZWN0fS5cbiAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2V9IFByb3RvY29sTWVzc2FnZVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLmZyb20gPSBQcm90b2NvbE1lc3NhZ2UuZnJvbU9iamVjdDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgUHJvdG9jb2xNZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlfSBtZXNzYWdlIFByb3RvY29sTWVzc2FnZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmFycmF5cyB8fCBvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LlNwYXduID0gW107XG4gICAgICAgICAgICAgICAgb2JqZWN0LlVuc3Bhd24gPSBbXTtcbiAgICAgICAgICAgICAgICBvYmplY3QuUG9zaXRpb24gPSBbXTtcbiAgICAgICAgICAgICAgICBvYmplY3QuUm90YXRpb24gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LlR5cGUgPSBvcHRpb25zLmVudW1zID09PSBTdHJpbmcgPyBcIk5PTkVcIiA6IDA7XG4gICAgICAgICAgICAgICAgb2JqZWN0LlNlbmRlciA9IFwiXCI7XG4gICAgICAgICAgICAgICAgb2JqZWN0LkhlbGxvID0gbnVsbDtcbiAgICAgICAgICAgICAgICBvYmplY3QuQ29ubmVjdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgb2JqZWN0LkRpc2Nvbm5lY3QgPSBudWxsO1xuICAgICAgICAgICAgICAgIG9iamVjdC5QaW5nID0gbnVsbDtcbiAgICAgICAgICAgICAgICBvYmplY3QuUG9uZyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5UeXBlICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlR5cGVcIikpXG4gICAgICAgICAgICAgICAgb2JqZWN0LlR5cGUgPSBvcHRpb25zLmVudW1zID09PSBTdHJpbmcgPyAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLk1lc3NhZ2VUeXBlW21lc3NhZ2UuVHlwZV0gOiBtZXNzYWdlLlR5cGU7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5TZW5kZXIgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiU2VuZGVyXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5TZW5kZXIgPSBtZXNzYWdlLlNlbmRlcjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLkhlbGxvICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIkhlbGxvXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5IZWxsbyA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlLnRvT2JqZWN0KG1lc3NhZ2UuSGVsbG8sIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuQ29ubmVjdCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJDb25uZWN0XCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5Db25uZWN0ID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZS50b09iamVjdChtZXNzYWdlLkNvbm5lY3QsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuRGlzY29ubmVjdCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJEaXNjb25uZWN0XCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5EaXNjb25uZWN0ID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZS50b09iamVjdChtZXNzYWdlLkRpc2Nvbm5lY3QsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUGluZyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQaW5nXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5QaW5nID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZS50b09iamVjdChtZXNzYWdlLlBpbmcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUG9uZyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJQb25nXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5Qb25nID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZS50b09iamVjdChtZXNzYWdlLlBvbmcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuU3Bhd24gJiYgbWVzc2FnZS5TcGF3bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QuU3Bhd24gPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2UuU3Bhd24ubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5TcGF3bltqXSA9ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlLnRvT2JqZWN0KG1lc3NhZ2UuU3Bhd25bal0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuVW5zcGF3biAmJiBtZXNzYWdlLlVuc3Bhd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LlVuc3Bhd24gPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2UuVW5zcGF3bi5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlVuc3Bhd25bal0gPSAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlLnRvT2JqZWN0KG1lc3NhZ2UuVW5zcGF3bltqXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Qb3NpdGlvbiAmJiBtZXNzYWdlLlBvc2l0aW9uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5Qb3NpdGlvbiA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWVzc2FnZS5Qb3NpdGlvbi5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlBvc2l0aW9uW2pdID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UudG9PYmplY3QobWVzc2FnZS5Qb3NpdGlvbltqXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5Sb3RhdGlvbiAmJiBtZXNzYWdlLlJvdGF0aW9uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5Sb3RhdGlvbiA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWVzc2FnZS5Sb3RhdGlvbi5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlJvdGF0aW9uW2pdID0gJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UudG9PYmplY3QobWVzc2FnZS5Sb3RhdGlvbltqXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gdGhpcyBQcm90b2NvbE1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIFByb3RvY29sTWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBQcm90b2NvbE1lc3NhZ2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNZXNzYWdlVHlwZSBlbnVtLlxuICAgICAgICAgKiBAbmFtZSBNZXNzYWdlVHlwZVxuICAgICAgICAgKiBAbWVtYmVyb2Ygd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZVxuICAgICAgICAgKiBAZW51bSB7bnVtYmVyfVxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gTk9ORT0wIE5PTkUgdmFsdWVcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IEhFTExPPTEzIEhFTExPIHZhbHVlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBDT05ORUNUPTE0IENPTk5FQ1QgdmFsdWVcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IERJU0NPTk5FQ1Q9MTUgRElTQ09OTkVDVCB2YWx1ZVxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gUElORz0xNiBQSU5HIHZhbHVlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBQT05HPTE3IFBPTkcgdmFsdWVcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IFNQQVdOPTE4IFNQQVdOIHZhbHVlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBVTlNQQVdOPTE5IFVOU1BBV04gdmFsdWVcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IFBPU0lUSU9OPTIwIFBPU0lUSU9OIHZhbHVlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBST1RBVElPTj0yMSBST1RBVElPTiB2YWx1ZVxuICAgICAgICAgKi9cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLk1lc3NhZ2VUeXBlID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlc0J5SWQgPSB7fSwgdmFsdWVzID0gT2JqZWN0LmNyZWF0ZSh2YWx1ZXNCeUlkKTtcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzBdID0gXCJOT05FXCJdID0gMDtcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzEzXSA9IFwiSEVMTE9cIl0gPSAxMztcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzE0XSA9IFwiQ09OTkVDVFwiXSA9IDE0O1xuICAgICAgICAgICAgdmFsdWVzW3ZhbHVlc0J5SWRbMTVdID0gXCJESVNDT05ORUNUXCJdID0gMTU7XG4gICAgICAgICAgICB2YWx1ZXNbdmFsdWVzQnlJZFsxNl0gPSBcIlBJTkdcIl0gPSAxNjtcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzE3XSA9IFwiUE9OR1wiXSA9IDE3O1xuICAgICAgICAgICAgdmFsdWVzW3ZhbHVlc0J5SWRbMThdID0gXCJTUEFXTlwiXSA9IDE4O1xuICAgICAgICAgICAgdmFsdWVzW3ZhbHVlc0J5SWRbMTldID0gXCJVTlNQQVdOXCJdID0gMTk7XG4gICAgICAgICAgICB2YWx1ZXNbdmFsdWVzQnlJZFsyMF0gPSBcIlBPU0lUSU9OXCJdID0gMjA7XG4gICAgICAgICAgICB2YWx1ZXNbdmFsdWVzQnlJZFsyMV0gPSBcIlJPVEFUSU9OXCJdID0gMjE7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIEhlbGxvTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlJFByb3BlcnRpZXNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge3N0cmluZ30gW1Nlc3Npb25dIEhlbGxvTWVzc2FnZSBTZXNzaW9uLlxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBIZWxsb01lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAZXhwb3J0cyB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZVxuICAgICAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb24gSGVsbG9NZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEhlbGxvTWVzc2FnZSBTZXNzaW9uLlxuICAgICAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgSGVsbG9NZXNzYWdlLnByb3RvdHlwZS5TZXNzaW9uID0gXCJcIjtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IEhlbGxvTWVzc2FnZSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZX0gSGVsbG9NZXNzYWdlIGluc3RhbmNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgSGVsbG9NZXNzYWdlKHByb3BlcnRpZXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgSGVsbG9NZXNzYWdlIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIEhlbGxvTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBIZWxsb01lc3NhZ2UuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlNlc3Npb24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiU2Vzc2lvblwiKSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAxLCB3aXJlVHlwZSAyID0qLzEwKS5zdHJpbmcobWVzc2FnZS5TZXNzaW9uKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgSGVsbG9NZXNzYWdlIG1lc3NhZ2UsIGxlbmd0aCBkZWxpbWl0ZWQuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIEhlbGxvTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBIZWxsb01lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgSGVsbG9NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2V9IEhlbGxvTWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBIZWxsb01lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlNlc3Npb24gPSByZWFkZXIuc3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgSGVsbG9NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZX0gSGVsbG9NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIEhlbGxvTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5TZXNzaW9uICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlNlc3Npb25cIikpXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNTdHJpbmcobWVzc2FnZS5TZXNzaW9uKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlNlc3Npb246IHN0cmluZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgSGVsbG9NZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZX0gSGVsbG9NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5IZWxsb01lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LlNlc3Npb24gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5TZXNzaW9uID0gU3RyaW5nKG9iamVjdC5TZXNzaW9uKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIEhlbGxvTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZS5mcm9tT2JqZWN0fS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuSGVsbG9NZXNzYWdlfSBIZWxsb01lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgSGVsbG9NZXNzYWdlLmZyb20gPSBIZWxsb01lc3NhZ2UuZnJvbU9iamVjdDtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBIZWxsb01lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkhlbGxvTWVzc2FnZX0gbWVzc2FnZSBIZWxsb01lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBIZWxsb01lc3NhZ2UudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuU2Vzc2lvbiA9IFwiXCI7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuU2Vzc2lvbiAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJTZXNzaW9uXCIpKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuU2Vzc2lvbiA9IG1lc3NhZ2UuU2Vzc2lvbjtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gdGhpcyBIZWxsb01lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIHRoaXMgSGVsbG9NZXNzYWdlIHRvIEpTT04uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIEhlbGxvTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIEhlbGxvTWVzc2FnZTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIENvbm5lY3RNZXNzYWdlLlxuICAgICAgICAgICAgICogQHR5cGVkZWYgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFtVc2VybmFtZV0gQ29ubmVjdE1lc3NhZ2UgVXNlcm5hbWUuXG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge3N0cmluZ30gW1Bhc3N3b3JkXSBDb25uZWN0TWVzc2FnZSBQYXNzd29yZC5cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgQ29ubmVjdE1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAZXhwb3J0cyB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlXG4gICAgICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIENvbm5lY3RNZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbm5lY3RNZXNzYWdlIFVzZXJuYW1lLlxuICAgICAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQ29ubmVjdE1lc3NhZ2UucHJvdG90eXBlLlVzZXJuYW1lID0gXCJcIjtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25uZWN0TWVzc2FnZSBQYXNzd29yZC5cbiAgICAgICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLnByb3RvdHlwZS5QYXNzd29yZCA9IFwiXCI7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBDb25uZWN0TWVzc2FnZSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2V9IENvbm5lY3RNZXNzYWdlIGluc3RhbmNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDb25uZWN0TWVzc2FnZShwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIENvbm5lY3RNZXNzYWdlIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBDb25uZWN0TWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBDb25uZWN0TWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuVXNlcm5hbWUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiVXNlcm5hbWVcIikpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMSwgd2lyZVR5cGUgMiA9Ki8xMCkuc3RyaW5nKG1lc3NhZ2UuVXNlcm5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlBhc3N3b3JkICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlBhc3N3b3JkXCIpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDIsIHdpcmVUeXBlIDIgPSovMTgpLnN0cmluZyhtZXNzYWdlLlBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgQ29ubmVjdE1lc3NhZ2UgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIENvbm5lY3RNZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIENvbm5lY3RNZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZX0gQ29ubmVjdE1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQ29ubmVjdE1lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuVXNlcm5hbWUgPSByZWFkZXIuc3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5QYXNzd29yZCA9IHJlYWRlci5zdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBDb25uZWN0TWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLCBsZW5ndGggZGVsaW1pdGVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Db25uZWN0TWVzc2FnZX0gQ29ubmVjdE1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgQ29ubmVjdE1lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmVyaWZpZXMgYSBDb25uZWN0TWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeShtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlVzZXJuYW1lICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlVzZXJuYW1lXCIpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzU3RyaW5nKG1lc3NhZ2UuVXNlcm5hbWUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiVXNlcm5hbWU6IHN0cmluZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlBhc3N3b3JkICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlBhc3N3b3JkXCIpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzU3RyaW5nKG1lc3NhZ2UuUGFzc3dvcmQpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiUGFzc3dvcmQ6IHN0cmluZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgQ29ubmVjdE1lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2V9IENvbm5lY3RNZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LlVzZXJuYW1lICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuVXNlcm5hbWUgPSBTdHJpbmcob2JqZWN0LlVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LlBhc3N3b3JkICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuUGFzc3dvcmQgPSBTdHJpbmcob2JqZWN0LlBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIENvbm5lY3RNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkNvbm5lY3RNZXNzYWdlfSBDb25uZWN0TWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBDb25uZWN0TWVzc2FnZS5mcm9tID0gQ29ubmVjdE1lc3NhZ2UuZnJvbU9iamVjdDtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBDb25uZWN0TWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuQ29ubmVjdE1lc3NhZ2V9IG1lc3NhZ2UgQ29ubmVjdE1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBDb25uZWN0TWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlVzZXJuYW1lID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlBhc3N3b3JkID0gXCJcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuVXNlcm5hbWUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiVXNlcm5hbWVcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5Vc2VybmFtZSA9IG1lc3NhZ2UuVXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuUGFzc3dvcmQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiUGFzc3dvcmRcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5QYXNzd29yZCA9IG1lc3NhZ2UuUGFzc3dvcmQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgQ29ubmVjdE1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIENvbm5lY3RNZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgdGhpcyBDb25uZWN0TWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBDb25uZWN0TWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIENvbm5lY3RNZXNzYWdlO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZSA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQcm9wZXJ0aWVzIG9mIGEgRGlzY29ubmVjdE1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAdHlwZWRlZiB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlJFByb3BlcnRpZXNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IERpc2Nvbm5lY3RNZXNzYWdlLlxuICAgICAgICAgICAgICogQGV4cG9ydHMgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZVxuICAgICAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmdW5jdGlvbiBEaXNjb25uZWN0TWVzc2FnZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IERpc2Nvbm5lY3RNZXNzYWdlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZX0gRGlzY29ubmVjdE1lc3NhZ2UgaW5zdGFuY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgRGlzY29ubmVjdE1lc3NhZ2UuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERpc2Nvbm5lY3RNZXNzYWdlKHByb3BlcnRpZXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgRGlzY29ubmVjdE1lc3NhZ2UgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIERpc2Nvbm5lY3RNZXNzYWdlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgRGlzY29ubmVjdE1lc3NhZ2UgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIERpc2Nvbm5lY3RNZXNzYWdlLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZX0gRGlzY29ubmVjdE1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgRGlzY29ubmVjdE1lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlfSBEaXNjb25uZWN0TWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBEaXNjb25uZWN0TWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIFBsYWluIG9iamVjdCB0byB2ZXJpZnlcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHs/c3RyaW5nfSBgbnVsbGAgaWYgdmFsaWQsIG90aGVyd2lzZSB0aGUgcmVhc29uIHdoeSBpdCBpcyBub3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgRGlzY29ubmVjdE1lc3NhZ2UudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UgIT09IFwib2JqZWN0XCIgfHwgbWVzc2FnZSA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBEaXNjb25uZWN0TWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZX0gRGlzY29ubmVjdE1lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgRGlzY29ubmVjdE1lc3NhZ2UuZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuRGlzY29ubmVjdE1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBEaXNjb25uZWN0TWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlLmZyb21PYmplY3R9LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5EaXNjb25uZWN0TWVzc2FnZX0gRGlzY29ubmVjdE1lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgRGlzY29ubmVjdE1lc3NhZ2UuZnJvbSA9IERpc2Nvbm5lY3RNZXNzYWdlLmZyb21PYmplY3Q7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgRGlzY29ubmVjdE1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLkRpc2Nvbm5lY3RNZXNzYWdlfSBtZXNzYWdlIERpc2Nvbm5lY3RNZXNzYWdlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgRGlzY29ubmVjdE1lc3NhZ2UudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSB0aGlzIERpc2Nvbm5lY3RNZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBEaXNjb25uZWN0TWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIHRoaXMgRGlzY29ubmVjdE1lc3NhZ2UgdG8gSlNPTi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gSlNPTiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgRGlzY29ubmVjdE1lc3NhZ2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBEaXNjb25uZWN0TWVzc2FnZTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFBpbmdNZXNzYWdlLlxuICAgICAgICAgICAgICogQHR5cGVkZWYgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZSRQcm9wZXJ0aWVzXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBQaW5nTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBleHBvcnRzIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2VcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb24gUGluZ01lc3NhZ2UocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2tleXNbaV1dICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXlzW2ldXSA9IHByb3BlcnRpZXNba2V5c1tpXV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBQaW5nTWVzc2FnZSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2V9IFBpbmdNZXNzYWdlIGluc3RhbmNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQaW5nTWVzc2FnZShwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFBpbmdNZXNzYWdlIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBQaW5nTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQaW5nTWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFBpbmdNZXNzYWdlIG1lc3NhZ2UsIGxlbmd0aCBkZWxpbWl0ZWQuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBQaW5nTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQaW5nTWVzc2FnZS5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikubGRlbGltKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBQaW5nTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2V9IFBpbmdNZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY29kZXMgYSBQaW5nTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLCBsZW5ndGggZGVsaW1pdGVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZX0gUGluZ01lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUGluZ01lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmVyaWZpZXMgYSBQaW5nTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeShtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgUGluZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2V9IFBpbmdNZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBpbmdNZXNzYWdlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgUGluZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZS5mcm9tT2JqZWN0fS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUGluZ01lc3NhZ2V9IFBpbmdNZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLmZyb20gPSBQaW5nTWVzc2FnZS5mcm9tT2JqZWN0O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIFBpbmdNZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5QaW5nTWVzc2FnZX0gbWVzc2FnZSBQaW5nTWVzc2FnZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gdGhpcyBQaW5nTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUGluZ01lc3NhZ2UucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3Qob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIFBpbmdNZXNzYWdlIHRvIEpTT04uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBpbmdNZXNzYWdlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gUGluZ01lc3NhZ2U7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBQb25nTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UkUHJvcGVydGllc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgUG9uZ01lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAZXhwb3J0cyB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlXG4gICAgICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIFBvbmdNZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgUG9uZ01lc3NhZ2UgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlfSBQb25nTWVzc2FnZSBpbnN0YW5jZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUG9uZ01lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBQb25nTWVzc2FnZSBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUG9uZ01lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9uZ01lc3NhZ2UuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBQb25nTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUG9uZ01lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9uZ01lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgUG9uZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIE1lc3NhZ2UgbGVuZ3RoIGlmIGtub3duIGJlZm9yZWhhbmRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlfSBQb25nTWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgICAgICB2YXIgZW5kID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyByZWFkZXIubGVuIDogcmVhZGVyLnBvcyArIGxlbmd0aCwgbWVzc2FnZSA9IG5ldyAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgUG9uZ01lc3NhZ2UgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2V9IFBvbmdNZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvbmdNZXNzYWdlLmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlcihyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFZlcmlmaWVzIGEgUG9uZ01lc3NhZ2UgbWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgICAgICogQHJldHVybnMgez9zdHJpbmd9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFBvbmdNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlfSBQb25nTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb25nTWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFBvbmdNZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2UuZnJvbU9iamVjdH0uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvbmdNZXNzYWdlfSBQb25nTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5mcm9tID0gUG9uZ01lc3NhZ2UuZnJvbU9iamVjdDtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBQb25nTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9uZ01lc3NhZ2V9IG1lc3NhZ2UgUG9uZ01lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgUG9uZ01lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvbmdNZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgdGhpcyBQb25nTWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb25nTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIFBvbmdNZXNzYWdlO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFNwYXduTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlJFByb3BlcnRpZXNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge3N0cmluZ30gW05hbWVdIFNwYXduTWVzc2FnZSBOYW1lLlxuICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBTcGF3bk1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAZXhwb3J0cyB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZVxuICAgICAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb24gU3Bhd25NZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNwYXduTWVzc2FnZSBOYW1lLlxuICAgICAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgU3Bhd25NZXNzYWdlLnByb3RvdHlwZS5OYW1lID0gXCJcIjtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IFNwYXduTWVzc2FnZSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZX0gU3Bhd25NZXNzYWdlIGluc3RhbmNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNwYXduTWVzc2FnZS5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgU3Bhd25NZXNzYWdlKHByb3BlcnRpZXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgU3Bhd25NZXNzYWdlIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIFNwYXduTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBTcGF3bk1lc3NhZ2UuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLk5hbWUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiTmFtZVwiKSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAxLCB3aXJlVHlwZSAyID0qLzEwKS5zdHJpbmcobWVzc2FnZS5OYW1lKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgU3Bhd25NZXNzYWdlIG1lc3NhZ2UsIGxlbmd0aCBkZWxpbWl0ZWQuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzfSBtZXNzYWdlIFNwYXduTWVzc2FnZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBTcGF3bk1lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgU3Bhd25NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2V9IFNwYXduTWVzc2FnZVxuICAgICAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBTcGF3bk1lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLk5hbWUgPSByZWFkZXIuc3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgU3Bhd25NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZX0gU3Bhd25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNwYXduTWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIFNwYXduTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNwYXduTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5OYW1lICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIk5hbWVcIikpXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNTdHJpbmcobWVzc2FnZS5OYW1lKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIk5hbWU6IHN0cmluZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgU3Bhd25NZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZX0gU3Bhd25NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNwYXduTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5TcGF3bk1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0Lk5hbWUgIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5OYW1lID0gU3RyaW5nKG9iamVjdC5OYW1lKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFNwYXduTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZS5mcm9tT2JqZWN0fS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuU3Bhd25NZXNzYWdlfSBTcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgU3Bhd25NZXNzYWdlLmZyb20gPSBTcGF3bk1lc3NhZ2UuZnJvbU9iamVjdDtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBTcGF3bk1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlNwYXduTWVzc2FnZX0gbWVzc2FnZSBTcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBTcGF3bk1lc3NhZ2UudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuTmFtZSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuTmFtZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJOYW1lXCIpKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuTmFtZSA9IG1lc3NhZ2UuTmFtZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gdGhpcyBTcGF3bk1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNwYXduTWVzc2FnZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIHRoaXMgU3Bhd25NZXNzYWdlIHRvIEpTT04uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNwYXduTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIFNwYXduTWVzc2FnZTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICBQcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhbiBVbnNwYXduTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UkUHJvcGVydGllc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgVW5zcGF3bk1lc3NhZ2UuXG4gICAgICAgICAgICAgKiBAZXhwb3J0cyB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIFVuc3Bhd25NZXNzYWdlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgVW5zcGF3bk1lc3NhZ2UgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlJFByb3BlcnRpZXM9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlfSBVbnNwYXduTWVzc2FnZSBpbnN0YW5jZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBVbnNwYXduTWVzc2FnZS5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVW5zcGF3bk1lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBVbnNwYXduTWVzc2FnZSBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgVW5zcGF3bk1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgVW5zcGF3bk1lc3NhZ2UuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBVbnNwYXduTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgVW5zcGF3bk1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgVW5zcGF3bk1lc3NhZ2UuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGFuIFVuc3Bhd25NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZX0gVW5zcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgVW5zcGF3bk1lc3NhZ2UuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhbiBVbnNwYXduTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLCBsZW5ndGggZGVsaW1pdGVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZX0gVW5zcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgVW5zcGF3bk1lc3NhZ2UuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmVyaWZpZXMgYW4gVW5zcGF3bk1lc3NhZ2UgbWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgICAgICogQHJldHVybnMgez9zdHJpbmd9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBVbnNwYXduTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhbiBVbnNwYXduTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZX0gVW5zcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgVW5zcGF3bk1lc3NhZ2UuZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlVuc3Bhd25NZXNzYWdlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYW4gVW5zcGF3bk1lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhbiBhbGlhcyBvZiB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5VbnNwYXduTWVzc2FnZS5mcm9tT2JqZWN0fS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2V9IFVuc3Bhd25NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFVuc3Bhd25NZXNzYWdlLmZyb20gPSBVbnNwYXduTWVzc2FnZS5mcm9tT2JqZWN0O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhbiBVbnNwYXduTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuVW5zcGF3bk1lc3NhZ2V9IG1lc3NhZ2UgVW5zcGF3bk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBVbnNwYXduTWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgVW5zcGF3bk1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFVuc3Bhd25NZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgdGhpcyBVbnNwYXduTWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBVbnNwYXduTWVzc2FnZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIFVuc3Bhd25NZXNzYWdlO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIFByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFBvc2l0aW9uTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEB0eXBlZGVmIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlJFByb3BlcnRpZXNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gW1hdIFBvc2l0aW9uTWVzc2FnZSBYLlxuICAgICAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IFtZXSBQb3NpdGlvbk1lc3NhZ2UgWS5cbiAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgUG9zaXRpb25NZXNzYWdlLlxuICAgICAgICAgICAgICogQGV4cG9ydHMgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZSRQcm9wZXJ0aWVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uIFBvc2l0aW9uTWVzc2FnZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQb3NpdGlvbk1lc3NhZ2UgWC5cbiAgICAgICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5wcm90b3R5cGUuWCA9IDA7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUG9zaXRpb25NZXNzYWdlIFkuXG4gICAgICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UucHJvdG90eXBlLlkgPSAwO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgUG9zaXRpb25NZXNzYWdlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlfSBQb3NpdGlvbk1lc3NhZ2UgaW5zdGFuY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9zaXRpb25NZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQb3NpdGlvbk1lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBQb3NpdGlvbk1lc3NhZ2UgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUG9zaXRpb25NZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJYXCIpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDEsIHdpcmVUeXBlIDUgPSovMTMpLmZsb2F0KG1lc3NhZ2UuWCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJZXCIpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDIsIHdpcmVUeXBlIDUgPSovMjEpLmZsb2F0KG1lc3NhZ2UuWSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBQb3NpdGlvbk1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9zaXRpb25NZXNzYWdlLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlfSBQb3NpdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9zaXRpb25NZXNzYWdlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5YID0gcmVhZGVyLmZsb2F0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5ZID0gcmVhZGVyLmZsb2F0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgUG9zaXRpb25NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZX0gUG9zaXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5YICE9PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiWDogbnVtYmVyIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJZXCIpKVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UuWSAhPT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlk6IG51bWJlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgUG9zaXRpb25NZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZX0gUG9zaXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFBvc2l0aW9uTWVzc2FnZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBuZXcgJHJvb3Qud2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Qb3NpdGlvbk1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LlggIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5YID0gTnVtYmVyKG9iamVjdC5YKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LlkgIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5ZID0gTnVtYmVyKG9iamVjdC5ZKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIFBvc2l0aW9uTWVzc2FnZSBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZS5mcm9tT2JqZWN0fS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUG9zaXRpb25NZXNzYWdlfSBQb3NpdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUG9zaXRpb25NZXNzYWdlLmZyb20gPSBQb3NpdGlvbk1lc3NhZ2UuZnJvbU9iamVjdDtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBQb3NpdGlvbk1lc3NhZ2UgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlBvc2l0aW9uTWVzc2FnZX0gbWVzc2FnZSBQb3NpdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5YID0gMDtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlkgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5YID0gbWVzc2FnZS5YO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLlkgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiWVwiKSlcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LlkgPSBtZXNzYWdlLlk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIHRoaXMgUG9zaXRpb25NZXNzYWdlIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLkNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3Qob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIFBvc2l0aW9uTWVzc2FnZSB0byBKU09OLlxuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBQb3NpdGlvbk1lc3NhZ2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBQb3NpdGlvbk1lc3NhZ2U7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQcm9wZXJ0aWVzIG9mIGEgUm90YXRpb25NZXNzYWdlLlxuICAgICAgICAgICAgICogQHR5cGVkZWYgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UkUHJvcGVydGllc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBbWF0gUm90YXRpb25NZXNzYWdlIFguXG4gICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFJvdGF0aW9uTWVzc2FnZS5cbiAgICAgICAgICAgICAqIEBleHBvcnRzIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmdW5jdGlvbiBSb3RhdGlvbk1lc3NhZ2UocHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2tleXNbaV1dICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXlzW2ldXSA9IHByb3BlcnRpZXNba2V5c1tpXV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUm90YXRpb25NZXNzYWdlIFguXG4gICAgICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UucHJvdG90eXBlLlggPSAwO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgUm90YXRpb25NZXNzYWdlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UkUHJvcGVydGllcz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlfSBSb3RhdGlvbk1lc3NhZ2UgaW5zdGFuY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBSb3RhdGlvbk1lc3NhZ2UocHJvcGVydGllcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBSb3RhdGlvbk1lc3NhZ2UgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgd2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlJFByb3BlcnRpZXN9IG1lc3NhZ2UgUm90YXRpb25NZXNzYWdlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuWCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJYXCIpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDEsIHdpcmVUeXBlIDUgPSovMTMpLmZsb2F0KG1lc3NhZ2UuWCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayB3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2UkUHJvcGVydGllc30gbWVzc2FnZSBSb3RhdGlvbk1lc3NhZ2UgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlfSBSb3RhdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5YID0gcmVhZGVyLmZsb2F0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNvZGVzIGEgUm90YXRpb25NZXNzYWdlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHt3ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZX0gUm90YXRpb25NZXNzYWdlXG4gICAgICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWZXJpZmllcyBhIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5YICE9PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiWDogbnVtYmVyIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBSb3RhdGlvbk1lc3NhZ2UgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlfSBSb3RhdGlvbk1lc3NhZ2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyAkcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlLlJvdGF0aW9uTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QuWCAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLlggPSBOdW1iZXIob2JqZWN0LlgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgUm90YXRpb25NZXNzYWdlIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYW4gYWxpYXMgb2Yge0BsaW5rIHdlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlLmZyb21PYmplY3R9LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7d2VicmVhbG1zLlByb3RvY29sTWVzc2FnZS5Sb3RhdGlvbk1lc3NhZ2V9IFJvdGF0aW9uTWVzc2FnZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBSb3RhdGlvbk1lc3NhZ2UuZnJvbSA9IFJvdGF0aW9uTWVzc2FnZS5mcm9tT2JqZWN0O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3dlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuUm90YXRpb25NZXNzYWdlfSBtZXNzYWdlIFJvdGF0aW9uTWVzc2FnZVxuICAgICAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFJvdGF0aW9uTWVzc2FnZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdHMpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5YID0gMDtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5YICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIlhcIikpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5YID0gbWVzc2FnZS5YO1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSB0aGlzIFJvdGF0aW9uTWVzc2FnZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Db252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgdGhpcyBSb3RhdGlvbk1lc3NhZ2UgdG8gSlNPTi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gSlNPTiBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUm90YXRpb25NZXNzYWdlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gUm90YXRpb25NZXNzYWdlO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIHJldHVybiBQcm90b2NvbE1lc3NhZ2U7XG4gICAgfSkoKTtcblxuICAgIHJldHVybiB3ZWJyZWFsbXM7XG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9ICRyb290O1xuIiwiaW1wb3J0ICogYXMgQnl0ZUJ1ZmZlciBmcm9tICdieXRlYnVmZmVyJztcclxuaW1wb3J0ICogYXMgUHJvdG9CdWYgZnJvbSAncHJvdG9idWZqcyc7XHJcbmltcG9ydCAqIGFzIHJvb3QgZnJvbSAnLi4vcHJvdG8vd2VicmVhbG1zLnByb3RvLmpzJ1xyXG5cclxuZGVjbGFyZSBmdW5jdGlvbiBwb3N0TWVzc2FnZShtZXNzYWdlOiBhbnkpO1xyXG5cclxuY2xhc3MgQ2xpZW50e1xyXG4gICAgcHJpdmF0ZSBzb2NrZXQ7XHJcbiAgICBwcml2YXRlIGJ1aWxkZXI7XHJcbiAgICBwcml2YXRlIHdvcmtlcjtcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3Iod2luZG93KXtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgbGV0IGJ1aWxkZXIgPSB0aGlzLmJ1aWxkZXIgPSByb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2U7XHJcbiAgICAgICAgbGV0IHNvY2tldCA9IHRoaXMuc29ja2V0ID0gbmV3IFdlYlNvY2tldChcIndzOi8vXCIrd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lK1wiL3dzXCIpO1xyXG4gICAgICAgIHdpbmRvdy5vbm1lc3NhZ2UgPSBmdW5jdGlvbihkYXRhKXtcclxuICAgICAgICAgICAgIHRoYXQub25tZXNzYWdlKGRhdGEpXHJcbiAgICAgICAgfTtcclxuICAgICAgICBzb2NrZXQub25vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzb2NrZXQuYmluYXJ5VHlwZSA9IFwiYXJyYXlidWZmZXJcIjtcclxuICAgICAgICAgICAgcG9zdE1lc3NhZ2UoW1wiY29ubmVjdGVkXCJdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNvY2tldC5vbmNsb3NlID0gZnVuY3Rpb24oZXZ0OiBDbG9zZUV2ZW50KSB7XHJcbiAgICAgICAgICAgIHBvc3RNZXNzYWdlKFtcImRpc2Nvbm5lY3RlZFwiLGV2dC50eXBlXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHNvY2tldC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG0gPSByb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UudG9PYmplY3QoYnVpbGRlci5kZWNvZGUobmV3IFVpbnQ4QXJyYXkoZXZlbnQuZGF0YSkpKTtcclxuICAgICAgICAgICAgICAgIHBvc3RNZXNzYWdlKFtcIm1lc3NhZ2VcIixtXSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgUHJvdG9CdWYudXRpbC5Qcm90b2NvbEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3JcIixlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9ubWVzc2FnZShldmVudCkge1xyXG4gICAgICAgIHN3aXRjaChldmVudC5kYXRhWzBdKXtcclxuICAgICAgICAgICAgY2FzZSBcIm1lc3NhZ2VcIjpcclxuICAgICAgICAgICAgICAgIGxldCBjb250ZW50OiByb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UgPSByb290LndlYnJlYWxtcy5Qcm90b2NvbE1lc3NhZ2UuZnJvbU9iamVjdChldmVudC5kYXRhWzFdKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VuZChjb250ZW50KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIHNlbmQobWVzc2FnZTogcm9vdC53ZWJyZWFsbXMuUHJvdG9jb2xNZXNzYWdlKXtcclxuICAgICAgICBsZXQgZGF0YSA9IHRoaXMuYnVpbGRlci5lbmNvZGUobWVzc2FnZSkuZmluaXNoKCk7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuc2VuZChkYXRhKTtcclxuICAgIH1cclxufVxyXG5cclxudmFyIHdvcmtlcjogQ2xpZW50ID0gbmV3IENsaWVudChzZWxmKTtcclxuZXhwb3J0ID0gd29ya2VyO1xyXG5cclxuIl19
