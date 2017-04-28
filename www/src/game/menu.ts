import * as Phaser from 'phaser-ce';

export class Menu extends Phaser.State {               
    constructor() {            
        super();                    
    }        
    create(){
        this.state.start("level");   
    }
    preload() {
        this.game.load.image('white', 'white.png');
    }        
    render() { }
    update() { }
}