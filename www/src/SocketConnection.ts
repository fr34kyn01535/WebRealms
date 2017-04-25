import * as io from 'socket.io-client';

export class SocketConnection{
    constructor(address){
        var socket = io(address);
        socket.on('connect', function(){
            console.log("connected");
        });
        socket.on('ping', function(data){
            socket.emit("pong",data);
            console.log("ping");
        });
        socket.on('disconnect', function(){
            console.log("disconnect");
        }); 
    }
}