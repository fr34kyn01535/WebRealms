import * as ByteBuffer from 'bytebuffer';
import * as ProtoBuf from 'protobufjs';
import * as root from '../proto/webrealms.proto.js'

export class Worker{
    private socket;
    private builder;

    public constructor(){
        let message = root.webrealms.ProtocolMessage;
        let socket = this.socket = new WebSocket(window.document.location.href.replace("http","ws"));

        socket.onopen = function () {
            console.log("Opening a connection...");
            socket.send('MSG');
            socket.binaryType = "arraybuffer";
        }

        socket.onclose = function(evt: CloseEvent) {
            postMessage("disconnect","*",[evt.type]);
        }
        
        socket.onmessage = function(event) {
            postMessage("message","*",[message.decode(event.data)]);
        }
    }

    public onmessage(args) {
        self.postMessage("You said: " + args.data,"*");
    };

}
