import * as ByteBuffer from 'bytebuffer';
import * as ProtoBuf from 'protobufjs';
import { main }  from '../proto/webrealms.proto.js'
declare function postMessage(message: any);

class Client{
    private socket;
    private builder;
    private worker;

    public constructor(window){
        var that = this;
        let builder = this.builder = main.ProtocolMessage;
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
                let m = main.ProtocolMessage.toObject(builder.decode(new Uint8Array(event.data)));
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
                let content: main.ProtocolMessage = main.ProtocolMessage.fromObject(event.data[1]);
                this.send(content);
            break;
        }
    };

    private send(message: main.ProtocolMessage){
        let data = this.builder.encode(message).finish();
        this.socket.send(data);
    }
}

var worker: Client = new Client(self);
export = worker;

