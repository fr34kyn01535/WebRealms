import { Menu } from './menu'; 
import { Level } from './level'; 
import * as Phaser from 'phaser-ce';
import * as $ from 'jquery';

export class Main extends Phaser.Game {               
    constructor() {                        
        super(800,600);     
        var that = this;
        this.state.add("menu", Menu);            
        this.state.add("level", Level);            
        this.state.start("menu");  
    } 
}

var wm:Main;
window.onload = () => {    
    wm = new Main(); 
};