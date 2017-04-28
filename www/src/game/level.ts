import * as Phaser from 'phaser-ce';
import { Client } from './client'; 

export class Level extends Phaser.State {
    private connection:Client;

    private cursor :Phaser.CursorKeys;
    private player: Phaser.Sprite;

    private walls: Phaser.Group;
    private enemies: Phaser.Group;

    constructor(){
        super();
        let connection = this.connection = new Client();

        connection.on("connected",function(data){
            console.log("yes2");
        });

        connection.on("disconnected",function(data){
            console.log("yes3");
        });

        connection.on(connection.MessageType.SPAWN,function(data){
            console.log("yes");
        });
    }

    public preload(){

    }
    public gameOver(){
        this.player.kill();
        console.log("You dead pal");
    }

    public create (){
        this.game.stage.backgroundColor = '#3598db';
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        this.game.world.enableBody = true;

        this.cursor = this.game.input.keyboard.createCursorKeys();
        this.createPlayer();
        this.createLevel();
    }

    private createPlayer(){
        this.player = this.game.add.sprite(70, 100,"white");
        this.player.tint = 0xffffff;
    }

    private createLevel(){
        this.walls = this.game.add.group();
        this.enemies = this.game.add.group();
        var level = [
            'xxxxxxxxxxxxxxxxxxxxxx',
            'x         x          x',
            'x                    x',
            'x                    x',
            'x                    x',
            'x         x    x     x',
            'xxxxxxxxxxxxxxxxx!!!!x',
        ];

        for (var i = 0; i < level.length; i++) {
            for (var j = 0; j < level[i].length; j++) {

                // Create a wall and add it to the 'walls' group
                if (level[i][j] == 'x') {
                    let wall = this.game.add.sprite(30+20*j, 30+20*i,"white");
                    wall.tint = 0x000000;
                    this.walls.add(wall);
                    wall.body.immovable = true; 
                }
                // Create a enemy and add it to the 'enemies' group
                else if (level[i][j] == '!') {
                    let enemy = this.game.add.sprite(30+20*j, 30+20*i,"white");
                    enemy.tint = 0xFF2500;
                    this.enemies.add(enemy);
                }
            }
        }

    }

    public update(){
        if(this.player.alive){
            if (this.cursor.left.isDown) {
                this.player.body.velocity.x = -200;
            }
            else if (this.cursor.right.isDown) {
                this.player.body.velocity.x = 200;
            }else{
                this.player.body.velocity.x = 0;
            }
            
            if (this.cursor.up.isDown) {
                this.player.body.velocity.y = -200;
            }
            else if (this.cursor.down.isDown) {
                this.player.body.velocity.y = 200;
            }
            else {
                this.player.body.velocity.y = 0;
            }

            this.game.physics.arcade.collide(this.player, this.walls);
            this.game.physics.arcade.overlap(this.player, this.enemies, this.gameOver, null, this);
        }
    }
}