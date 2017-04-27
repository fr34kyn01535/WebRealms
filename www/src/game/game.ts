import * as pixi from 'pixi.js';
import { Client } from './client'; 

var connection = new Client();
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
console.log("test");
bunny.on('pointerdown', function(){
    console.log("clicked");
    connection.emit("pong","test");
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