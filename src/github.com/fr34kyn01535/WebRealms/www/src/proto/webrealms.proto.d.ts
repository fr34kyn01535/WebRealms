import * as $protobuf from "protobufjs";

/**
 * Namespace webrealms.
 * @exports webrealms
 * @namespace
 */
export namespace webrealms {

    type ProtocolMessage$Properties = {
        Type?: webrealms.ProtocolMessage.MessageType;
        Sender?: string;
        Hello?: webrealms.ProtocolMessage.HelloMessage$Properties;
        Connect?: webrealms.ProtocolMessage.ConnectMessage$Properties;
        Disconnect?: webrealms.ProtocolMessage.DisconnectMessage$Properties;
        Ping?: webrealms.ProtocolMessage.PingMessage$Properties;
        Pong?: webrealms.ProtocolMessage.PongMessage$Properties;
        Spawn?: webrealms.ProtocolMessage.SpawnMessage$Properties[];
        Unspawn?: webrealms.ProtocolMessage.UnspawnMessage$Properties[];
        Position?: webrealms.ProtocolMessage.PositionMessage$Properties[];
        Rotation?: webrealms.ProtocolMessage.RotationMessage$Properties[];
    };

    /**
     * Constructs a new ProtocolMessage.
     * @exports webrealms.ProtocolMessage
     * @constructor
     * @param {webrealms.ProtocolMessage$Properties=} [properties] Properties to set
     */
    class ProtocolMessage {

        /**
         * Constructs a new ProtocolMessage.
         * @exports webrealms.ProtocolMessage
         * @constructor
         * @param {webrealms.ProtocolMessage$Properties=} [properties] Properties to set
         */
        constructor(properties?: webrealms.ProtocolMessage$Properties);

        /**
         * ProtocolMessage Type.
         * @type {webrealms.ProtocolMessage.MessageType}
         */
        public Type: webrealms.ProtocolMessage.MessageType;

        /**
         * ProtocolMessage Sender.
         * @type {string}
         */
        public Sender: string;

        /**
         * ProtocolMessage Hello.
         * @type {(webrealms.ProtocolMessage.HelloMessage$Properties|null)}
         */
        public Hello: (webrealms.ProtocolMessage.HelloMessage$Properties|null);

        /**
         * ProtocolMessage Connect.
         * @type {(webrealms.ProtocolMessage.ConnectMessage$Properties|null)}
         */
        public Connect: (webrealms.ProtocolMessage.ConnectMessage$Properties|null);

        /**
         * ProtocolMessage Disconnect.
         * @type {(webrealms.ProtocolMessage.DisconnectMessage$Properties|null)}
         */
        public Disconnect: (webrealms.ProtocolMessage.DisconnectMessage$Properties|null);

        /**
         * ProtocolMessage Ping.
         * @type {(webrealms.ProtocolMessage.PingMessage$Properties|null)}
         */
        public Ping: (webrealms.ProtocolMessage.PingMessage$Properties|null);

        /**
         * ProtocolMessage Pong.
         * @type {(webrealms.ProtocolMessage.PongMessage$Properties|null)}
         */
        public Pong: (webrealms.ProtocolMessage.PongMessage$Properties|null);

        /**
         * ProtocolMessage Spawn.
         * @type {Array.<webrealms.ProtocolMessage.SpawnMessage$Properties>}
         */
        public Spawn: webrealms.ProtocolMessage.SpawnMessage$Properties[];

        /**
         * ProtocolMessage Unspawn.
         * @type {Array.<webrealms.ProtocolMessage.UnspawnMessage$Properties>}
         */
        public Unspawn: webrealms.ProtocolMessage.UnspawnMessage$Properties[];

        /**
         * ProtocolMessage Position.
         * @type {Array.<webrealms.ProtocolMessage.PositionMessage$Properties>}
         */
        public Position: webrealms.ProtocolMessage.PositionMessage$Properties[];

        /**
         * ProtocolMessage Rotation.
         * @type {Array.<webrealms.ProtocolMessage.RotationMessage$Properties>}
         */
        public Rotation: webrealms.ProtocolMessage.RotationMessage$Properties[];

        /**
         * Creates a new ProtocolMessage instance using the specified properties.
         * @param {webrealms.ProtocolMessage$Properties=} [properties] Properties to set
         * @returns {webrealms.ProtocolMessage} ProtocolMessage instance
         */
        public static create(properties?: webrealms.ProtocolMessage$Properties): webrealms.ProtocolMessage;

        /**
         * Encodes the specified ProtocolMessage message. Does not implicitly {@link webrealms.ProtocolMessage.verify|verify} messages.
         * @param {webrealms.ProtocolMessage$Properties} message ProtocolMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        public static encode(message: webrealms.ProtocolMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ProtocolMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.verify|verify} messages.
         * @param {webrealms.ProtocolMessage$Properties} message ProtocolMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        public static encodeDelimited(message: webrealms.ProtocolMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ProtocolMessage message from the specified reader or buffer.
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {webrealms.ProtocolMessage} ProtocolMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage;

        /**
         * Decodes a ProtocolMessage message from the specified reader or buffer, length delimited.
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {webrealms.ProtocolMessage} ProtocolMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage;

        /**
         * Verifies a ProtocolMessage message.
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {?string} `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string;

        /**
         * Creates a ProtocolMessage message from a plain object. Also converts values to their respective internal types.
         * @param {Object.<string,*>} object Plain object
         * @returns {webrealms.ProtocolMessage} ProtocolMessage
         */
        public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage;

        /**
         * Creates a ProtocolMessage message from a plain object. Also converts values to their respective internal types.
         * This is an alias of {@link webrealms.ProtocolMessage.fromObject}.
         * @function
         * @param {Object.<string,*>} object Plain object
         * @returns {webrealms.ProtocolMessage} ProtocolMessage
         */
        public static from(object: { [k: string]: any }): webrealms.ProtocolMessage;

        /**
         * Creates a plain object from a ProtocolMessage message. Also converts values to other types if specified.
         * @param {webrealms.ProtocolMessage} message ProtocolMessage
         * @param {$protobuf.ConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        public static toObject(message: webrealms.ProtocolMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

        /**
         * Creates a plain object from this ProtocolMessage message. Also converts values to other types if specified.
         * @param {$protobuf.ConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

        /**
         * Converts this ProtocolMessage to JSON.
         * @returns {Object.<string,*>} JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    namespace ProtocolMessage {

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
        enum MessageType {
            NONE = 0,
            HELLO = 13,
            CONNECT = 14,
            DISCONNECT = 15,
            PING = 16,
            PONG = 17,
            SPAWN = 18,
            UNSPAWN = 19,
            POSITION = 20,
            ROTATION = 21
        }

        type HelloMessage$Properties = {};

        /**
         * Constructs a new HelloMessage.
         * @exports webrealms.ProtocolMessage.HelloMessage
         * @constructor
         * @param {webrealms.ProtocolMessage.HelloMessage$Properties=} [properties] Properties to set
         */
        class HelloMessage {

            /**
             * Constructs a new HelloMessage.
             * @exports webrealms.ProtocolMessage.HelloMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.HelloMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: webrealms.ProtocolMessage.HelloMessage$Properties);

            /**
             * Creates a new HelloMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.HelloMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.HelloMessage} HelloMessage instance
             */
            public static create(properties?: webrealms.ProtocolMessage.HelloMessage$Properties): webrealms.ProtocolMessage.HelloMessage;

            /**
             * Encodes the specified HelloMessage message. Does not implicitly {@link webrealms.ProtocolMessage.HelloMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.HelloMessage$Properties} message HelloMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: webrealms.ProtocolMessage.HelloMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified HelloMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.HelloMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.HelloMessage$Properties} message HelloMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: webrealms.ProtocolMessage.HelloMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a HelloMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.HelloMessage} HelloMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage.HelloMessage;

            /**
             * Decodes a HelloMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.HelloMessage} HelloMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage.HelloMessage;

            /**
             * Verifies a HelloMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a HelloMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.HelloMessage} HelloMessage
             */
            public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage.HelloMessage;

            /**
             * Creates a HelloMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.HelloMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.HelloMessage} HelloMessage
             */
            public static from(object: { [k: string]: any }): webrealms.ProtocolMessage.HelloMessage;

            /**
             * Creates a plain object from a HelloMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.HelloMessage} message HelloMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: webrealms.ProtocolMessage.HelloMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Creates a plain object from this HelloMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Converts this HelloMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        type ConnectMessage$Properties = {
            Username?: string;
            Password?: string;
        };

        /**
         * Constructs a new ConnectMessage.
         * @exports webrealms.ProtocolMessage.ConnectMessage
         * @constructor
         * @param {webrealms.ProtocolMessage.ConnectMessage$Properties=} [properties] Properties to set
         */
        class ConnectMessage {

            /**
             * Constructs a new ConnectMessage.
             * @exports webrealms.ProtocolMessage.ConnectMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.ConnectMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: webrealms.ProtocolMessage.ConnectMessage$Properties);

            /**
             * ConnectMessage Username.
             * @type {string}
             */
            public Username: string;

            /**
             * ConnectMessage Password.
             * @type {string}
             */
            public Password: string;

            /**
             * Creates a new ConnectMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.ConnectMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.ConnectMessage} ConnectMessage instance
             */
            public static create(properties?: webrealms.ProtocolMessage.ConnectMessage$Properties): webrealms.ProtocolMessage.ConnectMessage;

            /**
             * Encodes the specified ConnectMessage message. Does not implicitly {@link webrealms.ProtocolMessage.ConnectMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.ConnectMessage$Properties} message ConnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: webrealms.ProtocolMessage.ConnectMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ConnectMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.ConnectMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.ConnectMessage$Properties} message ConnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: webrealms.ProtocolMessage.ConnectMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ConnectMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.ConnectMessage} ConnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage.ConnectMessage;

            /**
             * Decodes a ConnectMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.ConnectMessage} ConnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage.ConnectMessage;

            /**
             * Verifies a ConnectMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a ConnectMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.ConnectMessage} ConnectMessage
             */
            public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage.ConnectMessage;

            /**
             * Creates a ConnectMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.ConnectMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.ConnectMessage} ConnectMessage
             */
            public static from(object: { [k: string]: any }): webrealms.ProtocolMessage.ConnectMessage;

            /**
             * Creates a plain object from a ConnectMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.ConnectMessage} message ConnectMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: webrealms.ProtocolMessage.ConnectMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Creates a plain object from this ConnectMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Converts this ConnectMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        type DisconnectMessage$Properties = {};

        /**
         * Constructs a new DisconnectMessage.
         * @exports webrealms.ProtocolMessage.DisconnectMessage
         * @constructor
         * @param {webrealms.ProtocolMessage.DisconnectMessage$Properties=} [properties] Properties to set
         */
        class DisconnectMessage {

            /**
             * Constructs a new DisconnectMessage.
             * @exports webrealms.ProtocolMessage.DisconnectMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.DisconnectMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: webrealms.ProtocolMessage.DisconnectMessage$Properties);

            /**
             * Creates a new DisconnectMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.DisconnectMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.DisconnectMessage} DisconnectMessage instance
             */
            public static create(properties?: webrealms.ProtocolMessage.DisconnectMessage$Properties): webrealms.ProtocolMessage.DisconnectMessage;

            /**
             * Encodes the specified DisconnectMessage message. Does not implicitly {@link webrealms.ProtocolMessage.DisconnectMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.DisconnectMessage$Properties} message DisconnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: webrealms.ProtocolMessage.DisconnectMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DisconnectMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.DisconnectMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.DisconnectMessage$Properties} message DisconnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: webrealms.ProtocolMessage.DisconnectMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DisconnectMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.DisconnectMessage} DisconnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage.DisconnectMessage;

            /**
             * Decodes a DisconnectMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.DisconnectMessage} DisconnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage.DisconnectMessage;

            /**
             * Verifies a DisconnectMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a DisconnectMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.DisconnectMessage} DisconnectMessage
             */
            public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage.DisconnectMessage;

            /**
             * Creates a DisconnectMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.DisconnectMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.DisconnectMessage} DisconnectMessage
             */
            public static from(object: { [k: string]: any }): webrealms.ProtocolMessage.DisconnectMessage;

            /**
             * Creates a plain object from a DisconnectMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.DisconnectMessage} message DisconnectMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: webrealms.ProtocolMessage.DisconnectMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Creates a plain object from this DisconnectMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Converts this DisconnectMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        type PingMessage$Properties = {};

        /**
         * Constructs a new PingMessage.
         * @exports webrealms.ProtocolMessage.PingMessage
         * @constructor
         * @param {webrealms.ProtocolMessage.PingMessage$Properties=} [properties] Properties to set
         */
        class PingMessage {

            /**
             * Constructs a new PingMessage.
             * @exports webrealms.ProtocolMessage.PingMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.PingMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: webrealms.ProtocolMessage.PingMessage$Properties);

            /**
             * Creates a new PingMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.PingMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.PingMessage} PingMessage instance
             */
            public static create(properties?: webrealms.ProtocolMessage.PingMessage$Properties): webrealms.ProtocolMessage.PingMessage;

            /**
             * Encodes the specified PingMessage message. Does not implicitly {@link webrealms.ProtocolMessage.PingMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PingMessage$Properties} message PingMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: webrealms.ProtocolMessage.PingMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PingMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.PingMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PingMessage$Properties} message PingMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: webrealms.ProtocolMessage.PingMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PingMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.PingMessage} PingMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage.PingMessage;

            /**
             * Decodes a PingMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.PingMessage} PingMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage.PingMessage;

            /**
             * Verifies a PingMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a PingMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PingMessage} PingMessage
             */
            public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage.PingMessage;

            /**
             * Creates a PingMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.PingMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PingMessage} PingMessage
             */
            public static from(object: { [k: string]: any }): webrealms.ProtocolMessage.PingMessage;

            /**
             * Creates a plain object from a PingMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.PingMessage} message PingMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: webrealms.ProtocolMessage.PingMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Creates a plain object from this PingMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Converts this PingMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        type PongMessage$Properties = {};

        /**
         * Constructs a new PongMessage.
         * @exports webrealms.ProtocolMessage.PongMessage
         * @constructor
         * @param {webrealms.ProtocolMessage.PongMessage$Properties=} [properties] Properties to set
         */
        class PongMessage {

            /**
             * Constructs a new PongMessage.
             * @exports webrealms.ProtocolMessage.PongMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.PongMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: webrealms.ProtocolMessage.PongMessage$Properties);

            /**
             * Creates a new PongMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.PongMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.PongMessage} PongMessage instance
             */
            public static create(properties?: webrealms.ProtocolMessage.PongMessage$Properties): webrealms.ProtocolMessage.PongMessage;

            /**
             * Encodes the specified PongMessage message. Does not implicitly {@link webrealms.ProtocolMessage.PongMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PongMessage$Properties} message PongMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: webrealms.ProtocolMessage.PongMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PongMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.PongMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PongMessage$Properties} message PongMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: webrealms.ProtocolMessage.PongMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PongMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.PongMessage} PongMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage.PongMessage;

            /**
             * Decodes a PongMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.PongMessage} PongMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage.PongMessage;

            /**
             * Verifies a PongMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a PongMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PongMessage} PongMessage
             */
            public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage.PongMessage;

            /**
             * Creates a PongMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.PongMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PongMessage} PongMessage
             */
            public static from(object: { [k: string]: any }): webrealms.ProtocolMessage.PongMessage;

            /**
             * Creates a plain object from a PongMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.PongMessage} message PongMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: webrealms.ProtocolMessage.PongMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Creates a plain object from this PongMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Converts this PongMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        type SpawnMessage$Properties = {
            Name?: string;
        };

        /**
         * Constructs a new SpawnMessage.
         * @exports webrealms.ProtocolMessage.SpawnMessage
         * @constructor
         * @param {webrealms.ProtocolMessage.SpawnMessage$Properties=} [properties] Properties to set
         */
        class SpawnMessage {

            /**
             * Constructs a new SpawnMessage.
             * @exports webrealms.ProtocolMessage.SpawnMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.SpawnMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: webrealms.ProtocolMessage.SpawnMessage$Properties);

            /**
             * SpawnMessage Name.
             * @type {string}
             */
            public Name: string;

            /**
             * Creates a new SpawnMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.SpawnMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.SpawnMessage} SpawnMessage instance
             */
            public static create(properties?: webrealms.ProtocolMessage.SpawnMessage$Properties): webrealms.ProtocolMessage.SpawnMessage;

            /**
             * Encodes the specified SpawnMessage message. Does not implicitly {@link webrealms.ProtocolMessage.SpawnMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.SpawnMessage$Properties} message SpawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: webrealms.ProtocolMessage.SpawnMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SpawnMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.SpawnMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.SpawnMessage$Properties} message SpawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: webrealms.ProtocolMessage.SpawnMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SpawnMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.SpawnMessage} SpawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage.SpawnMessage;

            /**
             * Decodes a SpawnMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.SpawnMessage} SpawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage.SpawnMessage;

            /**
             * Verifies a SpawnMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a SpawnMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.SpawnMessage} SpawnMessage
             */
            public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage.SpawnMessage;

            /**
             * Creates a SpawnMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.SpawnMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.SpawnMessage} SpawnMessage
             */
            public static from(object: { [k: string]: any }): webrealms.ProtocolMessage.SpawnMessage;

            /**
             * Creates a plain object from a SpawnMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.SpawnMessage} message SpawnMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: webrealms.ProtocolMessage.SpawnMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Creates a plain object from this SpawnMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Converts this SpawnMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        type UnspawnMessage$Properties = {};

        /**
         * Constructs a new UnspawnMessage.
         * @exports webrealms.ProtocolMessage.UnspawnMessage
         * @constructor
         * @param {webrealms.ProtocolMessage.UnspawnMessage$Properties=} [properties] Properties to set
         */
        class UnspawnMessage {

            /**
             * Constructs a new UnspawnMessage.
             * @exports webrealms.ProtocolMessage.UnspawnMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.UnspawnMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: webrealms.ProtocolMessage.UnspawnMessage$Properties);

            /**
             * Creates a new UnspawnMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.UnspawnMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.UnspawnMessage} UnspawnMessage instance
             */
            public static create(properties?: webrealms.ProtocolMessage.UnspawnMessage$Properties): webrealms.ProtocolMessage.UnspawnMessage;

            /**
             * Encodes the specified UnspawnMessage message. Does not implicitly {@link webrealms.ProtocolMessage.UnspawnMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.UnspawnMessage$Properties} message UnspawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: webrealms.ProtocolMessage.UnspawnMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UnspawnMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.UnspawnMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.UnspawnMessage$Properties} message UnspawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: webrealms.ProtocolMessage.UnspawnMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an UnspawnMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.UnspawnMessage} UnspawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage.UnspawnMessage;

            /**
             * Decodes an UnspawnMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.UnspawnMessage} UnspawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage.UnspawnMessage;

            /**
             * Verifies an UnspawnMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates an UnspawnMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.UnspawnMessage} UnspawnMessage
             */
            public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage.UnspawnMessage;

            /**
             * Creates an UnspawnMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.UnspawnMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.UnspawnMessage} UnspawnMessage
             */
            public static from(object: { [k: string]: any }): webrealms.ProtocolMessage.UnspawnMessage;

            /**
             * Creates a plain object from an UnspawnMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.UnspawnMessage} message UnspawnMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: webrealms.ProtocolMessage.UnspawnMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Creates a plain object from this UnspawnMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Converts this UnspawnMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        type PositionMessage$Properties = {
            X?: number;
            Y?: number;
        };

        /**
         * Constructs a new PositionMessage.
         * @exports webrealms.ProtocolMessage.PositionMessage
         * @constructor
         * @param {webrealms.ProtocolMessage.PositionMessage$Properties=} [properties] Properties to set
         */
        class PositionMessage {

            /**
             * Constructs a new PositionMessage.
             * @exports webrealms.ProtocolMessage.PositionMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.PositionMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: webrealms.ProtocolMessage.PositionMessage$Properties);

            /**
             * PositionMessage X.
             * @type {number}
             */
            public X: number;

            /**
             * PositionMessage Y.
             * @type {number}
             */
            public Y: number;

            /**
             * Creates a new PositionMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.PositionMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.PositionMessage} PositionMessage instance
             */
            public static create(properties?: webrealms.ProtocolMessage.PositionMessage$Properties): webrealms.ProtocolMessage.PositionMessage;

            /**
             * Encodes the specified PositionMessage message. Does not implicitly {@link webrealms.ProtocolMessage.PositionMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PositionMessage$Properties} message PositionMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: webrealms.ProtocolMessage.PositionMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PositionMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.PositionMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.PositionMessage$Properties} message PositionMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: webrealms.ProtocolMessage.PositionMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PositionMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.PositionMessage} PositionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage.PositionMessage;

            /**
             * Decodes a PositionMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.PositionMessage} PositionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage.PositionMessage;

            /**
             * Verifies a PositionMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a PositionMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PositionMessage} PositionMessage
             */
            public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage.PositionMessage;

            /**
             * Creates a PositionMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.PositionMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.PositionMessage} PositionMessage
             */
            public static from(object: { [k: string]: any }): webrealms.ProtocolMessage.PositionMessage;

            /**
             * Creates a plain object from a PositionMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.PositionMessage} message PositionMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: webrealms.ProtocolMessage.PositionMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Creates a plain object from this PositionMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Converts this PositionMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        type RotationMessage$Properties = {
            X?: number;
        };

        /**
         * Constructs a new RotationMessage.
         * @exports webrealms.ProtocolMessage.RotationMessage
         * @constructor
         * @param {webrealms.ProtocolMessage.RotationMessage$Properties=} [properties] Properties to set
         */
        class RotationMessage {

            /**
             * Constructs a new RotationMessage.
             * @exports webrealms.ProtocolMessage.RotationMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.RotationMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: webrealms.ProtocolMessage.RotationMessage$Properties);

            /**
             * RotationMessage X.
             * @type {number}
             */
            public X: number;

            /**
             * Creates a new RotationMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.RotationMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.RotationMessage} RotationMessage instance
             */
            public static create(properties?: webrealms.ProtocolMessage.RotationMessage$Properties): webrealms.ProtocolMessage.RotationMessage;

            /**
             * Encodes the specified RotationMessage message. Does not implicitly {@link webrealms.ProtocolMessage.RotationMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.RotationMessage$Properties} message RotationMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: webrealms.ProtocolMessage.RotationMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RotationMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.RotationMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.RotationMessage$Properties} message RotationMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: webrealms.ProtocolMessage.RotationMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RotationMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.RotationMessage} RotationMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage.RotationMessage;

            /**
             * Decodes a RotationMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.RotationMessage} RotationMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage.RotationMessage;

            /**
             * Verifies a RotationMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a RotationMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.RotationMessage} RotationMessage
             */
            public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage.RotationMessage;

            /**
             * Creates a RotationMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.RotationMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.RotationMessage} RotationMessage
             */
            public static from(object: { [k: string]: any }): webrealms.ProtocolMessage.RotationMessage;

            /**
             * Creates a plain object from a RotationMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.RotationMessage} message RotationMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: webrealms.ProtocolMessage.RotationMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Creates a plain object from this RotationMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Converts this RotationMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            public toJSON(): { [k: string]: any };
        }
    }
}
