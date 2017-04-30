import * as $protobuf from "protobufjs";

/**
 * Namespace main.
 * @exports main
 * @namespace
 */
export namespace main {

    type ProtocolMessage$Properties = {
        Type?: main.ProtocolMessage.MessageType;
        Sender?: string;
        Hello?: main.ProtocolMessage.HelloMessage$Properties;
        Connect?: main.ProtocolMessage.ConnectMessage$Properties;
        Disconnect?: main.ProtocolMessage.DisconnectMessage$Properties;
        Ping?: main.ProtocolMessage.PingMessage$Properties;
        Pong?: main.ProtocolMessage.PongMessage$Properties;
        Spawn?: main.ProtocolMessage.SpawnMessage$Properties[];
        Unspawn?: main.ProtocolMessage.UnspawnMessage$Properties[];
        Position?: main.ProtocolMessage.PositionMessage$Properties[];
        Rotation?: main.ProtocolMessage.RotationMessage$Properties[];
    };

    /**
     * Constructs a new ProtocolMessage.
     * @exports main.ProtocolMessage
     * @constructor
     * @param {main.ProtocolMessage$Properties=} [properties] Properties to set
     */
    class ProtocolMessage {

        /**
         * Constructs a new ProtocolMessage.
         * @exports main.ProtocolMessage
         * @constructor
         * @param {main.ProtocolMessage$Properties=} [properties] Properties to set
         */
        constructor(properties?: main.ProtocolMessage$Properties);

        /**
         * ProtocolMessage Type.
         * @type {main.ProtocolMessage.MessageType}
         */
        public Type: main.ProtocolMessage.MessageType;

        /**
         * ProtocolMessage Sender.
         * @type {string}
         */
        public Sender: string;

        /**
         * ProtocolMessage Hello.
         * @type {(main.ProtocolMessage.HelloMessage$Properties|null)}
         */
        public Hello: (main.ProtocolMessage.HelloMessage$Properties|null);

        /**
         * ProtocolMessage Connect.
         * @type {(main.ProtocolMessage.ConnectMessage$Properties|null)}
         */
        public Connect: (main.ProtocolMessage.ConnectMessage$Properties|null);

        /**
         * ProtocolMessage Disconnect.
         * @type {(main.ProtocolMessage.DisconnectMessage$Properties|null)}
         */
        public Disconnect: (main.ProtocolMessage.DisconnectMessage$Properties|null);

        /**
         * ProtocolMessage Ping.
         * @type {(main.ProtocolMessage.PingMessage$Properties|null)}
         */
        public Ping: (main.ProtocolMessage.PingMessage$Properties|null);

        /**
         * ProtocolMessage Pong.
         * @type {(main.ProtocolMessage.PongMessage$Properties|null)}
         */
        public Pong: (main.ProtocolMessage.PongMessage$Properties|null);

        /**
         * ProtocolMessage Spawn.
         * @type {Array.<main.ProtocolMessage.SpawnMessage$Properties>}
         */
        public Spawn: main.ProtocolMessage.SpawnMessage$Properties[];

        /**
         * ProtocolMessage Unspawn.
         * @type {Array.<main.ProtocolMessage.UnspawnMessage$Properties>}
         */
        public Unspawn: main.ProtocolMessage.UnspawnMessage$Properties[];

        /**
         * ProtocolMessage Position.
         * @type {Array.<main.ProtocolMessage.PositionMessage$Properties>}
         */
        public Position: main.ProtocolMessage.PositionMessage$Properties[];

        /**
         * ProtocolMessage Rotation.
         * @type {Array.<main.ProtocolMessage.RotationMessage$Properties>}
         */
        public Rotation: main.ProtocolMessage.RotationMessage$Properties[];

        /**
         * Creates a new ProtocolMessage instance using the specified properties.
         * @param {main.ProtocolMessage$Properties=} [properties] Properties to set
         * @returns {main.ProtocolMessage} ProtocolMessage instance
         */
        public static create(properties?: main.ProtocolMessage$Properties): main.ProtocolMessage;

        /**
         * Encodes the specified ProtocolMessage message. Does not implicitly {@link main.ProtocolMessage.verify|verify} messages.
         * @param {main.ProtocolMessage$Properties} message ProtocolMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        public static encode(message: main.ProtocolMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ProtocolMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.verify|verify} messages.
         * @param {main.ProtocolMessage$Properties} message ProtocolMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        public static encodeDelimited(message: main.ProtocolMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ProtocolMessage message from the specified reader or buffer.
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {main.ProtocolMessage} ProtocolMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): main.ProtocolMessage;

        /**
         * Decodes a ProtocolMessage message from the specified reader or buffer, length delimited.
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {main.ProtocolMessage} ProtocolMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): main.ProtocolMessage;

        /**
         * Verifies a ProtocolMessage message.
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {?string} `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string;

        /**
         * Creates a ProtocolMessage message from a plain object. Also converts values to their respective internal types.
         * @param {Object.<string,*>} object Plain object
         * @returns {main.ProtocolMessage} ProtocolMessage
         */
        public static fromObject(object: { [k: string]: any }): main.ProtocolMessage;

        /**
         * Creates a ProtocolMessage message from a plain object. Also converts values to their respective internal types.
         * This is an alias of {@link main.ProtocolMessage.fromObject}.
         * @function
         * @param {Object.<string,*>} object Plain object
         * @returns {main.ProtocolMessage} ProtocolMessage
         */
        public static from(object: { [k: string]: any }): main.ProtocolMessage;

        /**
         * Creates a plain object from a ProtocolMessage message. Also converts values to other types if specified.
         * @param {main.ProtocolMessage} message ProtocolMessage
         * @param {$protobuf.ConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        public static toObject(message: main.ProtocolMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

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
         * @exports main.ProtocolMessage.HelloMessage
         * @constructor
         * @param {main.ProtocolMessage.HelloMessage$Properties=} [properties] Properties to set
         */
        class HelloMessage {

            /**
             * Constructs a new HelloMessage.
             * @exports main.ProtocolMessage.HelloMessage
             * @constructor
             * @param {main.ProtocolMessage.HelloMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: main.ProtocolMessage.HelloMessage$Properties);

            /**
             * Creates a new HelloMessage instance using the specified properties.
             * @param {main.ProtocolMessage.HelloMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.HelloMessage} HelloMessage instance
             */
            public static create(properties?: main.ProtocolMessage.HelloMessage$Properties): main.ProtocolMessage.HelloMessage;

            /**
             * Encodes the specified HelloMessage message. Does not implicitly {@link main.ProtocolMessage.HelloMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.HelloMessage$Properties} message HelloMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: main.ProtocolMessage.HelloMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified HelloMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.HelloMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.HelloMessage$Properties} message HelloMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: main.ProtocolMessage.HelloMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a HelloMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.HelloMessage} HelloMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): main.ProtocolMessage.HelloMessage;

            /**
             * Decodes a HelloMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.HelloMessage} HelloMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): main.ProtocolMessage.HelloMessage;

            /**
             * Verifies a HelloMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a HelloMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.HelloMessage} HelloMessage
             */
            public static fromObject(object: { [k: string]: any }): main.ProtocolMessage.HelloMessage;

            /**
             * Creates a HelloMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.HelloMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.HelloMessage} HelloMessage
             */
            public static from(object: { [k: string]: any }): main.ProtocolMessage.HelloMessage;

            /**
             * Creates a plain object from a HelloMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.HelloMessage} message HelloMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: main.ProtocolMessage.HelloMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

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
         * @exports main.ProtocolMessage.ConnectMessage
         * @constructor
         * @param {main.ProtocolMessage.ConnectMessage$Properties=} [properties] Properties to set
         */
        class ConnectMessage {

            /**
             * Constructs a new ConnectMessage.
             * @exports main.ProtocolMessage.ConnectMessage
             * @constructor
             * @param {main.ProtocolMessage.ConnectMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: main.ProtocolMessage.ConnectMessage$Properties);

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
             * @param {main.ProtocolMessage.ConnectMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.ConnectMessage} ConnectMessage instance
             */
            public static create(properties?: main.ProtocolMessage.ConnectMessage$Properties): main.ProtocolMessage.ConnectMessage;

            /**
             * Encodes the specified ConnectMessage message. Does not implicitly {@link main.ProtocolMessage.ConnectMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.ConnectMessage$Properties} message ConnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: main.ProtocolMessage.ConnectMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ConnectMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.ConnectMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.ConnectMessage$Properties} message ConnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: main.ProtocolMessage.ConnectMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ConnectMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.ConnectMessage} ConnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): main.ProtocolMessage.ConnectMessage;

            /**
             * Decodes a ConnectMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.ConnectMessage} ConnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): main.ProtocolMessage.ConnectMessage;

            /**
             * Verifies a ConnectMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a ConnectMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.ConnectMessage} ConnectMessage
             */
            public static fromObject(object: { [k: string]: any }): main.ProtocolMessage.ConnectMessage;

            /**
             * Creates a ConnectMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.ConnectMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.ConnectMessage} ConnectMessage
             */
            public static from(object: { [k: string]: any }): main.ProtocolMessage.ConnectMessage;

            /**
             * Creates a plain object from a ConnectMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.ConnectMessage} message ConnectMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: main.ProtocolMessage.ConnectMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

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
         * @exports main.ProtocolMessage.DisconnectMessage
         * @constructor
         * @param {main.ProtocolMessage.DisconnectMessage$Properties=} [properties] Properties to set
         */
        class DisconnectMessage {

            /**
             * Constructs a new DisconnectMessage.
             * @exports main.ProtocolMessage.DisconnectMessage
             * @constructor
             * @param {main.ProtocolMessage.DisconnectMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: main.ProtocolMessage.DisconnectMessage$Properties);

            /**
             * Creates a new DisconnectMessage instance using the specified properties.
             * @param {main.ProtocolMessage.DisconnectMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.DisconnectMessage} DisconnectMessage instance
             */
            public static create(properties?: main.ProtocolMessage.DisconnectMessage$Properties): main.ProtocolMessage.DisconnectMessage;

            /**
             * Encodes the specified DisconnectMessage message. Does not implicitly {@link main.ProtocolMessage.DisconnectMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.DisconnectMessage$Properties} message DisconnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: main.ProtocolMessage.DisconnectMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DisconnectMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.DisconnectMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.DisconnectMessage$Properties} message DisconnectMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: main.ProtocolMessage.DisconnectMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DisconnectMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.DisconnectMessage} DisconnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): main.ProtocolMessage.DisconnectMessage;

            /**
             * Decodes a DisconnectMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.DisconnectMessage} DisconnectMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): main.ProtocolMessage.DisconnectMessage;

            /**
             * Verifies a DisconnectMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a DisconnectMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.DisconnectMessage} DisconnectMessage
             */
            public static fromObject(object: { [k: string]: any }): main.ProtocolMessage.DisconnectMessage;

            /**
             * Creates a DisconnectMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.DisconnectMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.DisconnectMessage} DisconnectMessage
             */
            public static from(object: { [k: string]: any }): main.ProtocolMessage.DisconnectMessage;

            /**
             * Creates a plain object from a DisconnectMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.DisconnectMessage} message DisconnectMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: main.ProtocolMessage.DisconnectMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

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
         * @exports main.ProtocolMessage.PingMessage
         * @constructor
         * @param {main.ProtocolMessage.PingMessage$Properties=} [properties] Properties to set
         */
        class PingMessage {

            /**
             * Constructs a new PingMessage.
             * @exports main.ProtocolMessage.PingMessage
             * @constructor
             * @param {main.ProtocolMessage.PingMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: main.ProtocolMessage.PingMessage$Properties);

            /**
             * Creates a new PingMessage instance using the specified properties.
             * @param {main.ProtocolMessage.PingMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.PingMessage} PingMessage instance
             */
            public static create(properties?: main.ProtocolMessage.PingMessage$Properties): main.ProtocolMessage.PingMessage;

            /**
             * Encodes the specified PingMessage message. Does not implicitly {@link main.ProtocolMessage.PingMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PingMessage$Properties} message PingMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: main.ProtocolMessage.PingMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PingMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.PingMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PingMessage$Properties} message PingMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: main.ProtocolMessage.PingMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PingMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.PingMessage} PingMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): main.ProtocolMessage.PingMessage;

            /**
             * Decodes a PingMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.PingMessage} PingMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): main.ProtocolMessage.PingMessage;

            /**
             * Verifies a PingMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a PingMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.PingMessage} PingMessage
             */
            public static fromObject(object: { [k: string]: any }): main.ProtocolMessage.PingMessage;

            /**
             * Creates a PingMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.PingMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.PingMessage} PingMessage
             */
            public static from(object: { [k: string]: any }): main.ProtocolMessage.PingMessage;

            /**
             * Creates a plain object from a PingMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.PingMessage} message PingMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: main.ProtocolMessage.PingMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

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
         * @exports main.ProtocolMessage.PongMessage
         * @constructor
         * @param {main.ProtocolMessage.PongMessage$Properties=} [properties] Properties to set
         */
        class PongMessage {

            /**
             * Constructs a new PongMessage.
             * @exports main.ProtocolMessage.PongMessage
             * @constructor
             * @param {main.ProtocolMessage.PongMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: main.ProtocolMessage.PongMessage$Properties);

            /**
             * Creates a new PongMessage instance using the specified properties.
             * @param {main.ProtocolMessage.PongMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.PongMessage} PongMessage instance
             */
            public static create(properties?: main.ProtocolMessage.PongMessage$Properties): main.ProtocolMessage.PongMessage;

            /**
             * Encodes the specified PongMessage message. Does not implicitly {@link main.ProtocolMessage.PongMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PongMessage$Properties} message PongMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: main.ProtocolMessage.PongMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PongMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.PongMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PongMessage$Properties} message PongMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: main.ProtocolMessage.PongMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PongMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.PongMessage} PongMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): main.ProtocolMessage.PongMessage;

            /**
             * Decodes a PongMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.PongMessage} PongMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): main.ProtocolMessage.PongMessage;

            /**
             * Verifies a PongMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a PongMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.PongMessage} PongMessage
             */
            public static fromObject(object: { [k: string]: any }): main.ProtocolMessage.PongMessage;

            /**
             * Creates a PongMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.PongMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.PongMessage} PongMessage
             */
            public static from(object: { [k: string]: any }): main.ProtocolMessage.PongMessage;

            /**
             * Creates a plain object from a PongMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.PongMessage} message PongMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: main.ProtocolMessage.PongMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

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
         * @exports main.ProtocolMessage.SpawnMessage
         * @constructor
         * @param {main.ProtocolMessage.SpawnMessage$Properties=} [properties] Properties to set
         */
        class SpawnMessage {

            /**
             * Constructs a new SpawnMessage.
             * @exports main.ProtocolMessage.SpawnMessage
             * @constructor
             * @param {main.ProtocolMessage.SpawnMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: main.ProtocolMessage.SpawnMessage$Properties);

            /**
             * SpawnMessage Name.
             * @type {string}
             */
            public Name: string;

            /**
             * Creates a new SpawnMessage instance using the specified properties.
             * @param {main.ProtocolMessage.SpawnMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.SpawnMessage} SpawnMessage instance
             */
            public static create(properties?: main.ProtocolMessage.SpawnMessage$Properties): main.ProtocolMessage.SpawnMessage;

            /**
             * Encodes the specified SpawnMessage message. Does not implicitly {@link main.ProtocolMessage.SpawnMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.SpawnMessage$Properties} message SpawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: main.ProtocolMessage.SpawnMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SpawnMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.SpawnMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.SpawnMessage$Properties} message SpawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: main.ProtocolMessage.SpawnMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SpawnMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.SpawnMessage} SpawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): main.ProtocolMessage.SpawnMessage;

            /**
             * Decodes a SpawnMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.SpawnMessage} SpawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): main.ProtocolMessage.SpawnMessage;

            /**
             * Verifies a SpawnMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a SpawnMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.SpawnMessage} SpawnMessage
             */
            public static fromObject(object: { [k: string]: any }): main.ProtocolMessage.SpawnMessage;

            /**
             * Creates a SpawnMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.SpawnMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.SpawnMessage} SpawnMessage
             */
            public static from(object: { [k: string]: any }): main.ProtocolMessage.SpawnMessage;

            /**
             * Creates a plain object from a SpawnMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.SpawnMessage} message SpawnMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: main.ProtocolMessage.SpawnMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

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
         * @exports main.ProtocolMessage.UnspawnMessage
         * @constructor
         * @param {main.ProtocolMessage.UnspawnMessage$Properties=} [properties] Properties to set
         */
        class UnspawnMessage {

            /**
             * Constructs a new UnspawnMessage.
             * @exports main.ProtocolMessage.UnspawnMessage
             * @constructor
             * @param {main.ProtocolMessage.UnspawnMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: main.ProtocolMessage.UnspawnMessage$Properties);

            /**
             * Creates a new UnspawnMessage instance using the specified properties.
             * @param {main.ProtocolMessage.UnspawnMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.UnspawnMessage} UnspawnMessage instance
             */
            public static create(properties?: main.ProtocolMessage.UnspawnMessage$Properties): main.ProtocolMessage.UnspawnMessage;

            /**
             * Encodes the specified UnspawnMessage message. Does not implicitly {@link main.ProtocolMessage.UnspawnMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.UnspawnMessage$Properties} message UnspawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: main.ProtocolMessage.UnspawnMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UnspawnMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.UnspawnMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.UnspawnMessage$Properties} message UnspawnMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: main.ProtocolMessage.UnspawnMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an UnspawnMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.UnspawnMessage} UnspawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): main.ProtocolMessage.UnspawnMessage;

            /**
             * Decodes an UnspawnMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.UnspawnMessage} UnspawnMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): main.ProtocolMessage.UnspawnMessage;

            /**
             * Verifies an UnspawnMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates an UnspawnMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.UnspawnMessage} UnspawnMessage
             */
            public static fromObject(object: { [k: string]: any }): main.ProtocolMessage.UnspawnMessage;

            /**
             * Creates an UnspawnMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.UnspawnMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.UnspawnMessage} UnspawnMessage
             */
            public static from(object: { [k: string]: any }): main.ProtocolMessage.UnspawnMessage;

            /**
             * Creates a plain object from an UnspawnMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.UnspawnMessage} message UnspawnMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: main.ProtocolMessage.UnspawnMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

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
         * @exports main.ProtocolMessage.PositionMessage
         * @constructor
         * @param {main.ProtocolMessage.PositionMessage$Properties=} [properties] Properties to set
         */
        class PositionMessage {

            /**
             * Constructs a new PositionMessage.
             * @exports main.ProtocolMessage.PositionMessage
             * @constructor
             * @param {main.ProtocolMessage.PositionMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: main.ProtocolMessage.PositionMessage$Properties);

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
             * @param {main.ProtocolMessage.PositionMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.PositionMessage} PositionMessage instance
             */
            public static create(properties?: main.ProtocolMessage.PositionMessage$Properties): main.ProtocolMessage.PositionMessage;

            /**
             * Encodes the specified PositionMessage message. Does not implicitly {@link main.ProtocolMessage.PositionMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PositionMessage$Properties} message PositionMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: main.ProtocolMessage.PositionMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PositionMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.PositionMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.PositionMessage$Properties} message PositionMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: main.ProtocolMessage.PositionMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PositionMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.PositionMessage} PositionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): main.ProtocolMessage.PositionMessage;

            /**
             * Decodes a PositionMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.PositionMessage} PositionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): main.ProtocolMessage.PositionMessage;

            /**
             * Verifies a PositionMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a PositionMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.PositionMessage} PositionMessage
             */
            public static fromObject(object: { [k: string]: any }): main.ProtocolMessage.PositionMessage;

            /**
             * Creates a PositionMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.PositionMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.PositionMessage} PositionMessage
             */
            public static from(object: { [k: string]: any }): main.ProtocolMessage.PositionMessage;

            /**
             * Creates a plain object from a PositionMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.PositionMessage} message PositionMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: main.ProtocolMessage.PositionMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

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
         * @exports main.ProtocolMessage.RotationMessage
         * @constructor
         * @param {main.ProtocolMessage.RotationMessage$Properties=} [properties] Properties to set
         */
        class RotationMessage {

            /**
             * Constructs a new RotationMessage.
             * @exports main.ProtocolMessage.RotationMessage
             * @constructor
             * @param {main.ProtocolMessage.RotationMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: main.ProtocolMessage.RotationMessage$Properties);

            /**
             * RotationMessage X.
             * @type {number}
             */
            public X: number;

            /**
             * Creates a new RotationMessage instance using the specified properties.
             * @param {main.ProtocolMessage.RotationMessage$Properties=} [properties] Properties to set
             * @returns {main.ProtocolMessage.RotationMessage} RotationMessage instance
             */
            public static create(properties?: main.ProtocolMessage.RotationMessage$Properties): main.ProtocolMessage.RotationMessage;

            /**
             * Encodes the specified RotationMessage message. Does not implicitly {@link main.ProtocolMessage.RotationMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.RotationMessage$Properties} message RotationMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: main.ProtocolMessage.RotationMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RotationMessage message, length delimited. Does not implicitly {@link main.ProtocolMessage.RotationMessage.verify|verify} messages.
             * @param {main.ProtocolMessage.RotationMessage$Properties} message RotationMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: main.ProtocolMessage.RotationMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RotationMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {main.ProtocolMessage.RotationMessage} RotationMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): main.ProtocolMessage.RotationMessage;

            /**
             * Decodes a RotationMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {main.ProtocolMessage.RotationMessage} RotationMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): main.ProtocolMessage.RotationMessage;

            /**
             * Verifies a RotationMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a RotationMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.RotationMessage} RotationMessage
             */
            public static fromObject(object: { [k: string]: any }): main.ProtocolMessage.RotationMessage;

            /**
             * Creates a RotationMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link main.ProtocolMessage.RotationMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {main.ProtocolMessage.RotationMessage} RotationMessage
             */
            public static from(object: { [k: string]: any }): main.ProtocolMessage.RotationMessage;

            /**
             * Creates a plain object from a RotationMessage message. Also converts values to other types if specified.
             * @param {main.ProtocolMessage.RotationMessage} message RotationMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: main.ProtocolMessage.RotationMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

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
