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
