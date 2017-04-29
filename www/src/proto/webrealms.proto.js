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
                object.Connect = null;
                object.Disconnect = null;
                object.Ping = null;
                object.Pong = null;
            }
            if (message.Type != null && message.hasOwnProperty("Type"))
                object.Type = options.enums === String ? $root.webrealms.ProtocolMessage.MessageType[message.Type] : message.Type;
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

        ProtocolMessage.ConnectMessage = (function() {

            /**
             * Properties of a ConnectMessage.
             * @typedef webrealms.ProtocolMessage.ConnectMessage$Properties
             * @type {Object}
             * @property {string} [Username] ConnectMessage Username.
             * @property {string} [Password] ConnectMessage Password.
             * @property {string} [Session] ConnectMessage Session.
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
             * ConnectMessage Session.
             * @type {string}
             */
            ConnectMessage.prototype.Session = "";

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
                if (message.Session != null && message.hasOwnProperty("Session"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.Session);
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
                    case 3:
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
                if (message.Session != null && message.hasOwnProperty("Session"))
                    if (!$util.isString(message.Session))
                        return "Session: string expected";
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
                if (object.Session != null)
                    message.Session = String(object.Session);
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
                    object.Session = "";
                }
                if (message.Username != null && message.hasOwnProperty("Username"))
                    object.Username = message.Username;
                if (message.Password != null && message.hasOwnProperty("Password"))
                    object.Password = message.Password;
                if (message.Session != null && message.hasOwnProperty("Session"))
                    object.Session = message.Session;
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
