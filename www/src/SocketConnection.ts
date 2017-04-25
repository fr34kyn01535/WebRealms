import * as io from 'socket.io-client';

export class SocketConnection {
    private socket;
    public constructor(address: string) {
        let me = this;
        me.socket = io(address,{autoConnect: false,reconnection :true});
        me.socket.on('connect', function(){
            console.log("connected");
        });
        me.socket.on('ping', function(data){ 
            console.log("ping",data);
            
            console.log("ponging back",data);
            me.socket.emit("pong",data,function(){
                console.log("received ak");
            }); 
        }); 
        me.socket.emit("getSomeData", function(data) {
          console.log(data);
        });
        me.socket.on('disconnect', function(){
            console.log("disconnect");
        }); 
        me.socket.open();
    }
    public emit(topic: string,message: any){
        let me = this;
        me.socket.emit(topic,message);
    }
}