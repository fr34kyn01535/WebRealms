class Listener {
    public topic: string;
    public callback: any;
    public constructor(topic: string,callback: any){
        this.topic = topic;
        this.callback = callback;
    }
}

export class Client {
    public worker: Worker = new Worker("dist/client.worker.js");
    public listeners: Array<Listener>

    public constructor() {
        this.worker.postMessage("connect");
        this.worker.onmessage = event => {
            let data :Array<any> = event.data;
            this.listeners.filter((listener)=>{ listener.topic == data[0] }).forEach((listener)=>{
                listener.callback(data.splice(0,1))
            });
        };
    }
    
    public emit(topic: string,message: any){
        this.worker.postMessage(topic,message);
    }

    public on(topic: string,callback: any){
        this.listeners.push(new Listener(topic,callback));
    }

}