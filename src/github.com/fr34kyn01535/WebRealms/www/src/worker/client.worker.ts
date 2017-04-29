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
        let socket = this.socket = new WebSocket("ws://"+window.location.hostname+"/ws");
        window.onmessage = function(data){
             that.onmessage(data)
        };
        socket.onopen = function () {
            socket.binaryType = "arraybuffer";
            postMessage(["connected"]);
        }

        socket.onclose = function(evt: CloseEvent) {
            postMessage(["disconnected",evt.type]);
        }
        
        socket.onmessage = function(event) {
            try {
                let m = root.webrealms.ProtocolMessage.toObject(builder.decode(new Uint8Array(event.data)));
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
        switch(event.data[0]){
            case "message":
                let content: root.webrealms.ProtocolMessage = root.webrealms.ProtocolMessage.fromObject(event.data[1]);
                this.send(content);
            break;
        }
    };

    private send(message: root.webrealms.ProtocolMessage){
        let data = this.builder.encode(message).finish();
        this.socket.send(data);
    }
}

var worker: Client = new Client(self);
export = worker;

