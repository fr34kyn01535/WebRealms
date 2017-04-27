import * as root from '../proto/webrealms.proto.js'

class Listener {
    public topic: root.webrealms.ProtocolMessage.MessageType | string;
    public callback: any;
    public constructor(topic: root.webrealms.ProtocolMessage.MessageType | string,callback: any){
        this.topic = topic;
        this.callback = callback;
    }
}

export class Client {
    public worker: Worker 
    public listeners: Array<Listener> = []
    private builder;
    public MessageType = root.webrealms.ProtocolMessage.MessageType;
    
    public constructor() {
        let that = this;
        let builder = this.builder = root.webrealms.ProtocolMessage;
        let worker = this.worker = new Worker("dist/worker.bundle.min.js");
        worker.onmessage = function(event) {
            if(event.data[0] === "message"){
                let data :root.webrealms.ProtocolMessage = root.webrealms.ProtocolMessage.fromObject(event.data[1]);
                that.listeners.filter((listener)=>{ listener.topic == data.Type}).forEach((listener)=>{
                    listener.callback(data);
                });
                console.log("WORKER < ",data);
            } else{
                that.listeners.filter((listener)=>{ listener.topic == event.data[0]}).forEach((listener)=>{;
                    listener.callback(event.data[0],(event.data as Array<any>).splice(0,1));
                });
                console.log("WORKER < "+event.data[0]);
            }
        };
        this.send("connect");
    }
    
    private send(content: root.webrealms.ProtocolMessage$Properties | string){
        console.log("WORKER > ",content);
        if(typeof content == 'string'){
            this.worker.postMessage(content);
        }else{
            this.worker.postMessage(["message",content]);
        }
    }

    public SendHello(id: Uint8Array,name: string){
        this.send({
            Type: root.webrealms.ProtocolMessage.MessageType.HELLO,
            Hello: {
                Id: id,
                Name: name
            }
        });
    }

    public SendPing(){
        this.send({
            Type: root.webrealms.ProtocolMessage.MessageType.PING
        });
    }

    public on(topic: root.webrealms.ProtocolMessage.MessageType | string,callback: any){
        this.listeners.push(new Listener(topic,callback));
    }
}