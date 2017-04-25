import * as pixi from 'pixi.js';
import { SocketConnection } from './SocketConnection'; 

var connection = new SocketConnection("ws://run.screeps.net");

var renderer = new pixi.WebGLRenderer(800, 600);
document.body.appendChild(renderer.view);

var container = new pixi.Container();
var bunnyTexture = pixi.Texture.fromImage("bunny.png");
var bunny = new pixi.Sprite(bunnyTexture);
bunny.position.x = 400;
bunny.position.y = 300;
bunny.scale.x = 2;
bunny.scale.y = 2;
container.addChild(bunny);

requestAnimationFrame(animate);
 
function animate() {
    bunny.rotation += 0.05;
    renderer.render(container);
    requestAnimationFrame(animate);
}