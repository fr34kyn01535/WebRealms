import * as Phaser from 'phaser-ce';
import { Client } from './client'; 
import { main }  from '../proto/webrealms.proto.js'

export class Level extends Phaser.State {
    private connection:Client;

    private cursor :Phaser.CursorKeys;
    private player: Phaser.Sprite;
    private lastPosition: Phaser.Point = new Phaser.Point();

    private walls: Phaser.Group;
    private enemies: Phaser.Group;
    private fire: Phaser.Group;
    
    private players : { [id: string]: Phaser.Sprite; } = {};

    private connect(){
        let connection = this.connection = new Client();
        let that: Level = this;

        connection.on("connected",function(){
            connection.SendConnect("Sven","YEHA");
        });

        connection.on("disconnected",function(){
            for(var player in that.players){
                that.players[player].kill();
            }
            that.players = {};
        });

        connection.on(connection.MessageType.POSITION,function(data: main.ProtocolMessage){
            if(that.players[data.Sender]){
                for(let i in data.Position){
                    let position = data.Position[i];
                    that.players[data.Sender].position.x = position.X;
                    that.players[data.Sender].position.y = position.Y;
                }
            }
        });

        connection.on(connection.MessageType.SPAWN,function(data: main.ProtocolMessage){
            let enemy = that.game.add.sprite(70, 100,"white");
            enemy.tint = 0xffccee;
            that.enemies.add(enemy);
            that.game.physics.arcade.enable(enemy);
            enemy.body.bounce.set(1, 1);
            enemy.body.collideWorldBounds = true;
            that.players[data.Sender] = enemy;
        });

        connection.on(connection.MessageType.UNSPAWN,function(data: main.ProtocolMessage){
            if(that.players[data.Sender]){
                that.players[data.Sender].kill();
                delete that.players[data.Sender];
            }
        });

        connection.on(connection.MessageType.HELLO,function(data: main.ProtocolMessage){
            that.player.revive();
        });
        connection.Connect();
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
        this.connect();
        this.createPlayer();
        this.createLevel();

        this.stage.disableVisibilityChange = true;     
    }

    private createPlayer(){
        this.player = this.game.add.sprite(70, 100,"white");
        this.player.tint = 0xffffff;
        this.player.kill();
    }

    private createLevel(){
        this.walls = this.game.add.group();
        this.enemies = this.game.add.group();
        this.fire = this.game.add.group();
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
                    let fire = this.game.add.sprite(30+20*j, 30+20*i,"white");
                    fire.tint = 0xFF2500;
                    this.fire.add(fire);
                }
            }
        }
    }



    public update(){
        if(this.player.alive){

            if(this.lastPosition.x != this.player.position.x || this.lastPosition.y != this.player.position.y){
                this.player.position.clone(this.lastPosition);
                this.connection.SendPosition(this.player.position.x,this.player.position.y);
            }

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
            this.game.physics.arcade.overlap(this.player, this.fire, this.gameOver, null, this);
        }
    }
}