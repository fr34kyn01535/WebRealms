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

    main.ProtocolPacket = (function() {

        /**
         * Properties of a ProtocolPacket.
         * @typedef main.ProtocolPacket$Properties
         * @type {Object}
         * @property {Array.<main.ProtocolMessage$Properties>} [Message] ProtocolPacket Message.
         */

        /**
         * Constructs a new ProtocolPacket.
         * @exports main.ProtocolPacket
         * @constructor
         * @param {main.ProtocolPacket$Properties=} [properties] Properties to set
         */
        function ProtocolPacket(properties) {
            this.Message = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProtocolPacket Message.
         * @type {Array.<main.ProtocolMessage$Properties>}
         */
        ProtocolPacket.prototype.Message = $util.emptyArray;

        /**
         * Creates a new ProtocolPacket instance using the specified properties.
         * @param {main.ProtocolPacket$Properties=} [properties] Properties to set
         * @returns {main.ProtocolPacket} ProtocolPacket instance
         */
        ProtocolPacket.create = function create(properties) {
            return new ProtocolPacket(properties);
        };

        /**
         * Encodes the specified ProtocolPacket message. Does not implicitly {@link main.ProtocolPacket.verify|verify} messages.
         * @param {main.ProtocolPacket$Properties} message ProtocolPacket message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProtocolPacket.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.Message != null && message.Message.length)
                for (var i = 0; i < message.Message.length; ++i)
                    $root.main.ProtocolMessage.encode(message.Message[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ProtocolPacket message, length delimited. Does not implicitly {@link main.ProtocolPacket.verify|verify} messages.
         * @param {main.ProtocolPacket$Properties} message ProtocolPacket message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProtocolPacket.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ProtocolPacket message from the specified reader or buffer.
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {main.ProtocolPacket} ProtocolPacket
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProtocolPacket.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.main.ProtocolPacket();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    if (!(message.Message && message.Message.length))
                        message.Message = [];
                    message.Message.push($root.main.ProtocolMessage.decode(reader, reader.uint32()));
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ProtocolPacket message from the specified reader or buffer, length delimited.
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {main.ProtocolPacket} ProtocolPacket
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProtocolPacket.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProtocolPacket message.
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {?string} `null` if valid, otherwise the reason why it is not
         */
        ProtocolPacket.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.Message != null && message.hasOwnProperty("Message")) {
                if (!Array.isArray(message.Message))
                    return "Message: array expected";
                for (var i = 0; i < message.Message.length; ++i) {
                    var error = $root.main.ProtocolMessage.verify(message.Message[i]);
                    if (error)
                        return "Message." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ProtocolPacket message from a plain object. Also converts values to their respective internal types.
         * @param {Object.<string,*>} object Plain object
         * @returns {main.ProtocolPacket} ProtocolPacket
         */
        ProtocolPacket.fromObject = function fromObject(object) {
            if (object instanceof $root.main.ProtocolPacket)
                return object;
            var message = new $root.main.ProtocolPacket();
            if (object.Message) {
                if (!Array.isArray(object.Message))
                    throw TypeError(".main.ProtocolPacket.Message: array expected");
                message.Message = [];
                for (var i = 0; i < object.Message.length; ++i) {
                    if (typeof object.Message[i] !== "object")
                        throw TypeError(".main.ProtocolPacket.Message: object expected");
                    message.Message[i] = $root.main.ProtocolMessage.fromObject(object.Message[i]);
                }
            }
            return message;
        };

        /**
         * Creates a ProtocolPacket message from a plain object. Also converts values to their respective internal types.
         * This is an alias of {@link main.ProtocolPacket.fromObject}.
         * @function
         * @param {Object.<string,*>} object Plain object
         * @returns {main.ProtocolPacket} ProtocolPacket
         */
        ProtocolPacket.from = ProtocolPacket.fromObject;

        /**
         * Creates a plain object from a ProtocolPacket message. Also converts values to other types if specified.
         * @param {main.ProtocolPacket} message ProtocolPacket
         * @param {$protobuf.ConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProtocolPacket.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.Message = [];
            if (message.Message && message.Message.length) {
                object.Message = [];
                for (var j = 0; j < message.Message.length; ++j)
                    object.Message[j] = $root.main.ProtocolMessage.toObject(message.Message[j], options);
            }
            return object;
        };

        /**
         * Creates a plain object from this ProtocolPacket message. Also converts values to other types if specified.
         * @param {$protobuf.ConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProtocolPacket.prototype.toObject = function toObject(options) {
            return this.constructor.toObject(this, options);
        };

        /**
         * Converts this ProtocolPacket to JSON.
         * @returns {Object.<string,*>} JSON object
         */
        ProtocolPacket.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return ProtocolPacket;
    })();

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
         * @property {main.ProtocolMessage.SpawnMessage$Properties} [Spawn] ProtocolMessage Spawn.
         * @property {main.ProtocolMessage.PositionMessage$Properties} [Position] ProtocolMessage Position.
         * @property {main.ProtocolMessage.RotationMessage$Properties} [Rotation] ProtocolMessage Rotation.
         */

        /**
         * Constructs a new ProtocolMessage.
         * @exports main.ProtocolMessage
         * @constructor
         * @param {main.ProtocolMessage$Properties=} [properties] Properties to set
         */
        function ProtocolMessage(properties) {
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
         * @type {(main.ProtocolMessage.SpawnMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Spawn = null;

        /**
         * ProtocolMessage Position.
         * @type {(main.ProtocolMessage.PositionMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Position = null;

        /**
         * ProtocolMessage Rotation.
         * @type {(main.ProtocolMessage.RotationMessage$Properties|null)}
         */
        ProtocolMessage.prototype.Rotation = null;

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
            if (message.Spawn != null && message.hasOwnProperty("Spawn"))
                $root.main.ProtocolMessage.SpawnMessage.encode(message.Spawn, writer.uint32(/* id 18, wireType 2 =*/146).fork()).ldelim();
            if (message.Position != null && message.hasOwnProperty("Position"))
                $root.main.ProtocolMessage.PositionMessage.encode(message.Position, writer.uint32(/* id 20, wireType 2 =*/162).fork()).ldelim();
            if (message.Rotation != null && message.hasOwnProperty("Rotation"))
                $root.main.ProtocolMessage.RotationMessage.encode(message.Rotation, writer.uint32(/* id 21, wireType 2 =*/170).fork()).ldelim();
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
                    message.Spawn = $root.main.ProtocolMessage.SpawnMessage.decode(reader, reader.uint32());
                    break;
                case 20:
                    message.Position = $root.main.ProtocolMessage.PositionMessage.decode(reader, reader.uint32());
                    break;
                case 21:
                    message.Rotation = $root.main.ProtocolMessage.RotationMessage.decode(reader, reader.uint32());
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
                var error = $root.main.ProtocolMessage.SpawnMessage.verify(message.Spawn);
                if (error)
                    return "Spawn." + error;
            }
            if (message.Position != null && message.hasOwnProperty("Position")) {
                var error = $root.main.ProtocolMessage.PositionMessage.verify(message.Position);
                if (error)
                    return "Position." + error;
            }
            if (message.Rotation != null && message.hasOwnProperty("Rotation")) {
                var error = $root.main.ProtocolMessage.RotationMessage.verify(message.Rotation);
                if (error)
                    return "Rotation." + error;
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
            if (object.Spawn != null) {
                if (typeof object.Spawn !== "object")
                    throw TypeError(".main.ProtocolMessage.Spawn: object expected");
                message.Spawn = $root.main.ProtocolMessage.SpawnMessage.fromObject(object.Spawn);
            }
            if (object.Position != null) {
                if (typeof object.Position !== "object")
                    throw TypeError(".main.ProtocolMessage.Position: object expected");
                message.Position = $root.main.ProtocolMessage.PositionMessage.fromObject(object.Position);
            }
            if (object.Rotation != null) {
                if (typeof object.Rotation !== "object")
                    throw TypeError(".main.ProtocolMessage.Rotation: object expected");
                message.Rotation = $root.main.ProtocolMessage.RotationMessage.fromObject(object.Rotation);
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
            if (options.defaults) {
                object.Type = options.enums === String ? "NONE" : 0;
                object.Sender = "";
                object.Hello = null;
                object.Connect = null;
                object.Disconnect = null;
                object.Ping = null;
                object.Pong = null;
                object.Spawn = null;
                object.Position = null;
                object.Rotation = null;
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
            if (message.Spawn != null && message.hasOwnProperty("Spawn"))
                object.Spawn = $root.main.ProtocolMessage.SpawnMessage.toObject(message.Spawn, options);
            if (message.Position != null && message.hasOwnProperty("Position"))
                object.Position = $root.main.ProtocolMessage.PositionMessage.toObject(message.Position, options);
            if (message.Rotation != null && message.hasOwnProperty("Rotation"))
                object.Rotation = $root.main.ProtocolMessage.RotationMessage.toObject(message.Rotation, options);
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
