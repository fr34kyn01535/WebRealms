import * as pixi from 'pixi.js';
import { Client } from './client'; 

var connection = new Client();

connection.on("connected",function(data){
    console.log("yes2");
    connection.SendHello(new Uint8Array([1,2]),"HEy");
});

connection.on("disconnected",function(data){
    console.log("yes3");
});

connection.on(connection.MessageType.HELLO,function(data){
    console.log("yes");
    connection.SendHello(new Uint8Array([1,2]),"HEy");
});

pixi.utils.skipHello();
var renderer = new pixi.WebGLRenderer(800, 600);
document.body.appendChild(renderer.view);

var container = new pixi.Container();
var bunnyTexture = pixi.Texture.fromImage("bunny.png");
var bunny = new pixi.Sprite(bunnyTexture);

var angle = 0;

bunny.position.x = 400;
bunny.position.y = 300;
bunny.scale.x = 2;
bunny.scale.y = 2;
bunny.interactive = true;

bunny.on('pointerdown', function(){
    connection.SendPing();
});
container.addChild(bunny);  
 
requestAnimationFrame(animate);

function animate() {
    /*angle += 5;
    bunny.position.x += Math.cos(angle) * 100;
    bunny.position.y += Math.sin(angle) * 100;
    bunny.rotation += 0.02;*/
    renderer.render(container);
    requestAnimationFrame(animate); 
}