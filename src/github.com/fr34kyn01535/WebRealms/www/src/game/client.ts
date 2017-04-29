import * as root from '../proto/webrealms.proto.js'

class Listener {
    public topic: root.webrealms.ProtocolMessage.MessageType | string;
    public callback: Function;
    public constructor(topic: root.webrealms.ProtocolMessage.MessageType | string,callback: Function){
        this.topic = topic;
        this.callback = callback;
    }
}

export class Client {
    public worker: Worker 
    public listeners: Array<Listener> = []
    private builder;
    public MessageType = root.webrealms.ProtocolMessage.MessageType;
    public ProtocolMessage = root.webrealms.ProtocolMessage;
    private id:string;
    public Connect() {
        let that = this;
        let builder = this.builder = root.webrealms.ProtocolMessage;
        let worker = this.worker = new Worker("dist/worker.bundle.min.js");
        worker.onmessage = function(event) {
            let name: string = event.data[0];
            if(name === "message"){
                let data :root.webrealms.ProtocolMessage = root.webrealms.ProtocolMessage.fromObject(event.data[1]);
                if(data.Sender != that.id){
                    console.log("WORKER <",data);
                    that.listeners.filter((listener)=>{ return listener.topic == data.Type}).forEach((listener)=>{
                        listener.callback(data);
                    });
                }
            } else{
                console.log("WORKER <",name);
                that.listeners.filter((listener)=>{ return listener.topic == name}).forEach((listener)=>{
                    listener.callback(name,(event.data as Array<any>).splice(0,1));
                });
            }
        };

        that.on(that.MessageType.HELLO,function(data){
            that.id = data.Sender;
        });

        this.send("connect");
    }
    
    private send(content: root.webrealms.ProtocolMessage$Properties | string){
        console.log("WORKER >",content);
        if(typeof content == 'string'){
            this.worker.postMessage(content);
        }else{
            content.Sender = this.id;
            let message = this.builder.create(content);
            this.worker.postMessage(["message",root.webrealms.ProtocolMessage.toObject(message)]);
        }
    }

    public SendPosition(x: number,y: number){
        this.send({
            Type: root.webrealms.ProtocolMessage.MessageType.POSITION,
            Position: [{
                X: x,
                Y: y
            }]
        });
    }
    
    public SendConnect(username: string,password: string,session: string = null){
        this.send({
            Type: root.webrealms.ProtocolMessage.MessageType.CONNECT,
            Connect: {
                Username: username,
                Password: password,
                Session: session 
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