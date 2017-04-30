import * as Phaser from 'phaser-ce';
import { Client } from './client'; 
import { main }  from '../proto/webrealms.proto.js'

export class Level extends Phaser.State {
    private connection:Client;

    private cursor :Phaser.CursorKeys;
    private wasd;

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

        connection.on(connection.MessageType.POSITION,function(data: main.ProtocolMessage$Properties){
            if(that.players[data.Sender]){
                that.players[data.Sender].position.x = data.Position.X;
                that.players[data.Sender].position.y = data.Position.Y;
            }
        });

        connection.on(connection.MessageType.SPAWN,function(data: main.ProtocolMessage$Properties){
                let enemy = that.game.add.sprite(data.Position.X,data.Position.Y,"square");
                enemy.tint = 0xffccee;
                that.enemies.add(enemy);
                that.game.physics.arcade.enable(enemy);
                enemy.body.bounce.set(1, 1);
                that.players[data.Sender] = enemy;
        });

        connection.on(connection.MessageType.UNSPAWN,function(data: main.ProtocolMessage$Properties){
            if(that.players[data.Sender]){
                that.players[data.Sender].kill();
                delete that.players[data.Sender];
            }
        });

        connection.on(connection.MessageType.HELLO,function(data: main.ProtocolMessage$Properties){
            that.player.position.x = data.Position.X;
            that.player.position.y = data.Position.Y;
            that.player.revive();
        });
        connection.Connect();
    }

    public preload(){
        this.game.load.pack('dungeon', 'assets/tilesets/dungeon.json', null, this);
        this.game.load.pack('decoration', 'assets/tilesets/decoration.json', null, this);
        this.game.load.pack('ui', 'assets/tilesets/ui.json', null, this);
        this.game.load.pack('entities', 'assets/sprites/entities.json', null, this);
    }
    public gameOver(){
        //this.player.kill();
        console.log("You dead pal");
    }

    public create (){
        this.game.stage.backgroundColor = '#3598db';
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        this.game.world.setBounds(0, 0, 2000, 1500);
        this.game.world.enableBody = true;

        this.cursor = this.game.input.keyboard.createCursorKeys();
        this.connect();
        this.wasd = {
            up: this.game.input.keyboard.addKey(Phaser.Keyboard.W),
            down: this.game.input.keyboard.addKey(Phaser.Keyboard.S),
            left: this.game.input.keyboard.addKey(Phaser.Keyboard.A),
            right: this.game.input.keyboard.addKey(Phaser.Keyboard.D),
        };
        this.createPlayer();
        this.createLevel();

        this.stage.disableVisibilityChange = true;     
    }

    private createPlayer(){
        this.player = this.game.add.sprite(70, 100,"square");
        this.player.tint = 0xffffff;
        this.game.camera.follow(this.player, Phaser.Camera.FOLLOW_LOCKON);
        this.player.body.collideWorldBounds = true;
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
                    let wall = this.game.add.sprite(30+32*j, 30+32*i,"square");
                    wall.tint = 0x111111;
                    this.walls.add(wall);
                    wall.body.immovable = true; 
                }
                // Create a enemy and add it to the 'enemies' group
                else if (level[i][j] == '!') {
                    let fire = this.game.add.sprite(30+32*j, 30+32*i,"square");
                    fire.tint = 0xff0000;
                    this.fire.add(fire);
                }else{
                    //let floor = this.game.add.sprite(30+48*j, 30+48*i,"floor");
                    //floor.scale.setTo(3,3);
                }
            }
        }
    }

    public render(){
        this.game.debug.cameraInfo(this.game.camera, 32, 32);
        this.game.debug.spriteCoords(this.player, 32, 500);
    }

    public update(){
        if(this.player.alive){

            if(this.lastPosition.x != this.player.position.x || this.lastPosition.y != this.player.position.y){
                this.player.position.clone(this.lastPosition);
                this.connection.SendPosition(this.player.position.x,this.player.position.y);
            }

            if (this.cursor.left.isDown || this.wasd.left.isDown) {
                this.player.body.velocity.x = -200;
            }
            else if (this.cursor.right.isDown || this.wasd.right.isDown) {
                this.player.body.velocity.x = 200;
            }else{
                this.player.body.velocity.x = 0;
            }
            
            if (this.cursor.up.isDown || this.wasd.up.isDown) {
                this.player.body.velocity.y = -200;
            }
            else if (this.cursor.down.isDown || this.wasd.down.isDown) {
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