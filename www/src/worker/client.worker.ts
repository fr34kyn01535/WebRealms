import * as ByteBuffer from 'bytebuffer';
import * as ProtoBuf from 'protobufjs';
import * as root from '../proto/webrealms.proto.js'

declare function postMessage(message: any);

class Client{
    private socket;
    private builder;
    private worker;

    public constructor(window){
        var that = this;
        let builder = this.builder = root.webrealms.ProtocolMessage;
        let socket = this.socket = new WebSocket("ws://localhost:8182/ws");
        window.onmessage = function(data){
             that.onmessage(data)
        };
        socket.onopen = function () {
            postMessage(["connected"]);
            socket.binaryType = "arraybuffer";
        }

        socket.onclose = function(evt: CloseEvent) {
            postMessage(["disconnect",evt.type]);
        }
        
        socket.onmessage = function(event) {
            try {
                let m = builder.decode(new Uint8Array(event.data));
                postMessage(["message",m]);
            } catch (e) {
                if (e instanceof ProtoBuf.util.ProtocolError) {
                    console.log(e);
                } else {
                    console.log("Error",e);
                }
            }

        }
    }

    public onmessage(event) {
        if(typeof event.data !== 'string'){
            let content: root.webrealms.ProtocolMessage$Properties = event.data;
            this.send(content);
        }
    };

    private send(content: root.webrealms.ProtocolMessage$Properties){
        let message = this.builder.create(content);
        let data = this.builder.encode(message).finish();
        this.socket.send(data);
    }
}

var worker: Client = new Client(self);
export = worker;

