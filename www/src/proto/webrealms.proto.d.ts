import * as $protobuf from "protobufjs";

/**
 * Namespace webrealms.
 * @exports webrealms
 * @namespace
 */
export namespace webrealms {

    type ProtocolMessage$Properties = {
        Type?: webrealms.ProtocolMessage.MessageType;
        Ping?: webrealms.ProtocolMessage.PingMessage$Properties;
        Pong?: webrealms.ProtocolMessage.PongMessage$Properties;
        Hello?: webrealms.ProtocolMessage.HelloMessage$Properties;
        Bye?: webrealms.ProtocolMessage.ByeMessage$Properties;
        Position?: webrealms.ProtocolMessage.PositionMessage$Properties;
        Rotation?: webrealms.ProtocolMessage.RotationMessage$Properties;
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
         * ProtocolMessage Hello.
         * @type {(webrealms.ProtocolMessage.HelloMessage$Properties|null)}
         */
        public Hello: (webrealms.ProtocolMessage.HelloMessage$Properties|null);

        /**
         * ProtocolMessage Bye.
         * @type {(webrealms.ProtocolMessage.ByeMessage$Properties|null)}
         */
        public Bye: (webrealms.ProtocolMessage.ByeMessage$Properties|null);

        /**
         * ProtocolMessage Position.
         * @type {(webrealms.ProtocolMessage.PositionMessage$Properties|null)}
         */
        public Position: (webrealms.ProtocolMessage.PositionMessage$Properties|null);

        /**
         * ProtocolMessage Rotation.
         * @type {(webrealms.ProtocolMessage.RotationMessage$Properties|null)}
         */
        public Rotation: (webrealms.ProtocolMessage.RotationMessage$Properties|null);

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
         * @property {number} PING=16 PING value
         * @property {number} PONG=17 PONG value
         * @property {number} HELLO=18 HELLO value
         * @property {number} BYE=19 BYE value
         * @property {number} POSITION_ROTATION=21 POSITION_ROTATION value
         */
        enum MessageType {
            NONE = 0,
            PING = 16,
            PONG = 17,
            HELLO = 18,
            BYE = 19,
            POSITION_ROTATION = 21
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

        type HelloMessage$Properties = {
            Id?: Uint8Array;
            Name?: string;
        };

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
             * HelloMessage Id.
             * @type {Uint8Array}
             */
            public Id: Uint8Array;

            /**
             * HelloMessage Name.
             * @type {string}
             */
            public Name: string;

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

        type ByeMessage$Properties = {};

        /**
         * Constructs a new ByeMessage.
         * @exports webrealms.ProtocolMessage.ByeMessage
         * @constructor
         * @param {webrealms.ProtocolMessage.ByeMessage$Properties=} [properties] Properties to set
         */
        class ByeMessage {

            /**
             * Constructs a new ByeMessage.
             * @exports webrealms.ProtocolMessage.ByeMessage
             * @constructor
             * @param {webrealms.ProtocolMessage.ByeMessage$Properties=} [properties] Properties to set
             */
            constructor(properties?: webrealms.ProtocolMessage.ByeMessage$Properties);

            /**
             * Creates a new ByeMessage instance using the specified properties.
             * @param {webrealms.ProtocolMessage.ByeMessage$Properties=} [properties] Properties to set
             * @returns {webrealms.ProtocolMessage.ByeMessage} ByeMessage instance
             */
            public static create(properties?: webrealms.ProtocolMessage.ByeMessage$Properties): webrealms.ProtocolMessage.ByeMessage;

            /**
             * Encodes the specified ByeMessage message. Does not implicitly {@link webrealms.ProtocolMessage.ByeMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.ByeMessage$Properties} message ByeMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encode(message: webrealms.ProtocolMessage.ByeMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ByeMessage message, length delimited. Does not implicitly {@link webrealms.ProtocolMessage.ByeMessage.verify|verify} messages.
             * @param {webrealms.ProtocolMessage.ByeMessage$Properties} message ByeMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            public static encodeDelimited(message: webrealms.ProtocolMessage.ByeMessage$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ByeMessage message from the specified reader or buffer.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {webrealms.ProtocolMessage.ByeMessage} ByeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): webrealms.ProtocolMessage.ByeMessage;

            /**
             * Decodes a ByeMessage message from the specified reader or buffer, length delimited.
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {webrealms.ProtocolMessage.ByeMessage} ByeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): webrealms.ProtocolMessage.ByeMessage;

            /**
             * Verifies a ByeMessage message.
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string;

            /**
             * Creates a ByeMessage message from a plain object. Also converts values to their respective internal types.
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.ByeMessage} ByeMessage
             */
            public static fromObject(object: { [k: string]: any }): webrealms.ProtocolMessage.ByeMessage;

            /**
             * Creates a ByeMessage message from a plain object. Also converts values to their respective internal types.
             * This is an alias of {@link webrealms.ProtocolMessage.ByeMessage.fromObject}.
             * @function
             * @param {Object.<string,*>} object Plain object
             * @returns {webrealms.ProtocolMessage.ByeMessage} ByeMessage
             */
            public static from(object: { [k: string]: any }): webrealms.ProtocolMessage.ByeMessage;

            /**
             * Creates a plain object from a ByeMessage message. Also converts values to other types if specified.
             * @param {webrealms.ProtocolMessage.ByeMessage} message ByeMessage
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public static toObject(message: webrealms.ProtocolMessage.ByeMessage, options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Creates a plain object from this ByeMessage message. Also converts values to other types if specified.
             * @param {$protobuf.ConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            public toObject(options?: $protobuf.ConversionOptions): { [k: string]: any };

            /**
             * Converts this ByeMessage to JSON.
             * @returns {Object.<string,*>} JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        type PositionMessage$Properties = {
            X?: number;
            Y?: number;
            Z?: number;
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
             * PositionMessage Z.
             * @type {number}
             */
            public Z: number;

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
            Y?: number;
            Z?: number;
            W?: number;
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
             * RotationMessage Y.
             * @type {number}
             */
            public Y: number;

            /**
             * RotationMessage Z.
             * @type {number}
             */
            public Z: number;

            /**
             * RotationMessage W.
             * @type {number}
             */
            public W: number;

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
