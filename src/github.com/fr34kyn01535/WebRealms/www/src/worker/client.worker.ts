import * as ByteBuffer from 'bytebuffer';
import * as ProtoBuf from 'protobufjs';
import { main }  from '../proto/webrealms.proto.js'
declare function postMessage(message: any);

class Client{
    private socket: WebSocket;
    private builder;
    private packetBuilder;
    private worker: Worker;
    private address:string;

    private connect(){
        var that = this;
        this.socket = new WebSocket(this.address);
        
        this.socket.onopen = function () {
            that.socket.binaryType = "arraybuffer";
            postMessage(["connected"]);
        }

        this.socket.onclose = function(evt: CloseEvent) {
            postMessage(["disconnected",evt.type]);
            setTimeout(function(){that.connect()}, 5000);
        }
        
        this.socket.onmessage = function(event) {
            try {
                let packet = that.packetBuilder.decode(new Uint8Array(event.data));
                for(let message of packet.Message){
                    postMessage(["message",message]);
                }
            } catch (e) {
                if (e instanceof ProtoBuf.util.ProtocolError) {
                    console.log(e);
                } else {
                    console.log("Error",e);
                }
            }

        }
    }

    public constructor(window){
        var that = this;
        this.address = "ws://"+window.location.hostname+":"+window.location.port+"/ws";
        let builder = this.builder = main.ProtocolMessage;
        let packetBuilder = this.packetBuilder = main.ProtocolPacket;
        this.connect();
        window.onmessage = function(data){
             that.onmessage(data)
        };
    }

    public onmessage(event) {
        switch(event.data[0]){
            case "message":
                let content: main.ProtocolMessage$Properties = event.data[1];
                this.sendMessage(content);
            break;
        }
    };

    private sendMessage(message: main.ProtocolMessage$Properties){
        this.sendPacket([message]);
    }
    private sendPacket(messages: main.ProtocolMessage$Properties[]){
        let packet = main.ProtocolPacket.create();
        packet.Message = messages;
        let data = this.packetBuilder.encode(packet).finish();
        this.socket.send(data);
    }
}

var worker: Client = new Client(self);
export = worker;

