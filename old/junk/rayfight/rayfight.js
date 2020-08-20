// A graphical turn-based game where players try to eliminate each other with lasers
var util = require('./../util.js');
var map = require('./map.js');
var powerups = require('./powerups.js');
var fs = require('fs');

var directions = { u: { x: 0, y: -1 }, d: { x: 0, y: 1 }, l: { x: -1, y: 0 }, r: { x: 1, y: 0 } };
var sendMsg, bot;
var game = false;

var joinGame = function(user,userID) {
    if(!game || game.state != 'starting') return;
    
    function randomColor() {
        var hex = '#';
        for(var i = 0; i < 6; i++) { hex += util.pickInArray(util.hex); }
        return hex;
    }
    function initPlayer() {
        var userColor = randomColor(), roles = bot.servers[game.server].members[userID].roles;
        for(var i = 0; i < roles.length; i++) {
            var role = bot.servers[game.server].roles[roles[i]];
            if(role.color) userColor = '#'+role.color.toString(16);
        }
        game.players[user] = { id: userID, color: userColor, channel: bot.directMessages[userID].id };
    }
    
    if(!bot.directMessages[userID]) { // Greet player if never PMed before
        bot.sendMessage({
            to: userID, message: 'Hi there!'
        }, function(){ initPlayer(); });
    } else {
        initPlayer();
    }
};

var newTurn = function() {
    game.turn++;
    var turnMessage = game.turn == 1 ? 'You can choose up to **2** commands per turn.'
    + 'If you shoot or reflect, it must be the last action.\n' +
    '    **move** <direction>\n' + '    **shoot** <direction>\n' + '    **reflect** <direction>\n' +
    '_Example moves:_  "move right move up", "move down shoot left", "move left reflect up", "shoot down"\n' : '';
    turnMessage += '__Turn '+game.turn+'__';
    setTimeout(function(){ // TODO: Move this into image send callback
        for(var pKey in game.players) { if(!game.players.hasOwnProperty(pKey)) continue;
            if(game.players[pKey].dead) continue;
            var powerNotice = game.players[pKey].powerup ? '\n You have a ' + game.players[pKey].powerup.name + 
                ' powerup. To use it, include "powerup" in your command.' : '';
            bot.sendMessage({to:game.players[pKey].id,message:turnMessage+powerNotice});
        }
    },3000);
};

var simulateTurn = function() {
    var newPlayerPositions = {};
    if(game.laserMap) game.laserMapHistory.push(game.laserMap);
    game.laserMap = {};
    game.movement = false;
    game.reflection = false;
    //game.newPowerups = false;
    // First process everyone's commands
    for(var pKey in game.players) { if(!game.players.hasOwnProperty(pKey)) continue;
        if(!game.players[pKey].command) continue;
        var player = game.players[pKey];
        delete player.newX; delete player.newY;
        var moveTo = { x: player.x, y: player.y };
        if(moveTo.x+player.command.move.x >= 0 && moveTo.y+player.command.move.y >= 0
            && moveTo.x+player.command.move.x < map.width && moveTo.y+player.command.move.y < map.height
            && game.map[(moveTo.x+player.command.move.x)+':'+(moveTo.y+player.command.move.y)] != 'block') {
            moveTo.x += player.command.move.x;
            moveTo.y += player.command.move.y;
            if(newPlayerPositions[moveTo.x+':'+moveTo.y]) { // If another player is moving here
                var existingPlayer = newPlayerPositions[moveTo.x+':'+moveTo.y];
                existingPlayer.newX = existingPlayer.x; // Cancel his move
                existingPlayer.newY = existingPlayer.y;
            }
        }
        player.reflecting = player.command.reflect;
        if(player.reflecting) game.reflection = true;
        player.newX = moveTo.x;
        player.newY = moveTo.y;
        newPlayerPositions[moveTo.x+':'+moveTo.y] = player;
    }
    // Simulate player movement
    for(pKey in game.players) { if(!game.players.hasOwnProperty(pKey)) continue;
        player = game.players[pKey];
        delete game.playerMap[player.x+':'+player.y];
        player.prevX = player.x;
        player.prevY = player.y;
        if(player.newX != player.x || player.newY != player.y) game.movement = true;
        player.x = player.newX;
        player.y = player.newY;
        game.playerMap[player.x+':'+player.y] = player;
        if(game.powerups[player.x+':'+player.y]) {
            player.powerup = game.powerups[player.x+':'+player.y];
            player.powerup.turn = game.turn;
            delete game.powerups[player.x+':'+player.y];
        }
    }
    game.longestLaser = 0;
    for(pKey in game.players) { if(!game.players.hasOwnProperty(pKey)) continue;
        player = game.players[pKey];
        if(player.command.shoot) {
            var addLaser = function(grid,laser) {
                if(game.laserMap[grid]) {
                    game.laserMap[grid].push(laser);
                    for(var l = 0; l < game.laserMap[grid].length; l++) {
                        var checkLaser = game.laserMap[grid][l];
                        if(checkLaser != laser 
                            && checkLaser.to.x == laser.to.x
                            && checkLaser.to.y == laser.to.y
                            && checkLaser.from.x == laser.from.x
                            && checkLaser.from.y == laser.from.y
                            && checkLaser.player.id == laser.player.id) {
                            return true; // Laser is repeating itself
                        }
                    }
                } else {
                    game.laserMap[grid] = [laser];
                }
                return false;
            };
            var lasers = [player.command.shoot];
            if(player.command.powerup && player.command.powerup.name == 'Omni Power') {
                lasers = [{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0}];
            }
            for(var l = 0; l < lasers.length; l++) {
                var laser = {
                    player: player, from: {x:0,y:0}, to: lasers[l], segment: 0, x: player.x, y: player.y
                };
                var laserLength = 1;
                var laserPoint = { x: player.x, y: player.y };
                addLaser(laserPoint.x+':'+laserPoint.y,laser);
                var reflected = false;
                do {
                    laserPoint.x += laser.to.x;
                    laserPoint.y += laser.to.y;
                    var from = { x: laser.to.x * -1, y: laser.to.y * -1 };
                    var to = { x: laser.to.x, y: laser.to.y };
                    var mapGrid = game.map[laserPoint.x+':'+laserPoint.y];
                    var angled = false, kill = false;
                    if(mapGrid) {
                        if(mapGrid == 'block') {
                            break; // Stop laser at block
                        } else { // Angle
                            if(!player.command.powerup || player.command.powerup.name != 'Clipper Beam') {
                                var flip = mapGrid.type == 'forSlash' ? -1 : 1;
                                if(to.x != 0) {
                                    to.y = to.x * flip;
                                    to.x = 0;
                                } else {
                                    to.x = to.y * flip;
                                    to.y = 0;
                                }
                            }
                            if(!mapGrid.hit || mapGrid.hit > laserLength) mapGrid.hit = laserLength;
                            angled = mapGrid;
                        }
                    }
                    var playerGrid = game.playerMap[laserPoint.x+':'+laserPoint.y];
                    if(playerGrid) {
                        if(playerGrid.reflecting 
                            && (playerGrid.reflecting.x == from.x && playerGrid.reflecting.y == from.y
                                || (playerGrid.command.powerup && playerGrid.command.powerup.name == 'Omni Power'))) {
                            // If player is reflecting in proper direction, or omni reflecting
                            to.x = from.x;
                            to.y = from.y;
                            reflected = true;
                        } else {
                            playerGrid.dead = game.turn;
                            kill = true;
                        }
                    }
                    laser = { 
                        player: player, from: from, to: to, x: laserPoint.x, y: laserPoint.y,
                        segment: laserLength, reflected: reflected, angled: angled, kill: kill
                    };
                    if(addLaser(laserPoint.x+':'+laserPoint.y,laser)) {
                        break; // Break if laser is repeating itself
                    }
                    laserLength++;
                } while(true);
                game.longestLaser = Math.max(laserLength,game.longestLaser);
            }
        }
    }
    for(var p = 0; p < Object.keys(game.players).length - Object.keys(game.powerups).length; p++) {
        //game.newPowerups = true;
        spawnPowerup(); // Spawn powerups to match player count
    }
    
    //require('fs').writeFileSync('./rayfight/game.json', JSON.stringify(game, null, '\t'));
    map.drawMap(game, function() {
        for(var pKey in game.players) { if(!game.players.hasOwnProperty(pKey)) continue;
            bot.uploadFile({
                channel: game.players[pKey].channel,
                file: fs.createReadStream(__dirname + '/turn.png')
            });
        }
        game.turnAngles = false;
        for(var mKey in game.map) { if(!game.map.hasOwnProperty(mKey)) continue;
            if(game.map[mKey].type) game.map[mKey].turned = false;
            if(game.map[mKey] != 'block' && game.map[mKey].hit) {
                if(Math.random() > 0.5) {
                    game.map[mKey].type = game.map[mKey].type == 'backSlash' ? 'forSlash' : 'backSlash';
                    game.map[mKey].turned = true;
                    game.turnAngles = true;
                }
                game.map[mKey].hit = false;
            }
        }
        var deadCount = 0, playerCount = Object.keys(game.players).length, winner;
        for(pKey in game.players) { if(!game.players.hasOwnProperty(pKey)) continue;
            game.players[pKey].command = false;
            if(game.players[pKey].dead) {
                deadCount++;
            } else {
                winner = pKey;
            }
        }
        if(deadCount == playerCount - 1) {
            gameOver(winner);
            return;
        } else if(deadCount == playerCount) {
            gameOver(false);
            return;
        }
        newTurn();
    });
};

var spawnPowerup = function() {
    do {
        var px = util.randomInt(1,map.width-2),
            py = util.randomInt(1,map.height-2);
    } while(game.map[px+':'+py] || game.playerMap[px+':'+py]);
    game.powerups[px+':'+py] = powerups.spawn(game.turn,px,py);
};

var checkCommands = function() { // Check if all players have sent a command for this turn
    var missingCommands = [];
    for(var pKey in game.players) { if(!game.players.hasOwnProperty(pKey)) continue;
        // At least one living player still hasn't sent a command
        if(!game.players[pKey].dead && !game.players[pKey].command) {
            missingCommands.push(game.players[pKey]);
        }
    }
    return missingCommands;
};

var gameOver = function(winner) {
    game.state = 'ended';
    console.log('game over, drawing final');
    setTimeout(function(){
        map.drawFinal(game, function() {
            var message = winner ? '**'+winner+'** is the last man standing!':
                'Game over, everybody died!';

            bot.uploadFile({
                channel: game.channel,
                file: fs.createReadStream(__dirname + '/final.png')
            });
            setTimeout(function(){
                sendMsg(game.channel,[message]);
                for(var pKey in game.players) { if(!game.players.hasOwnProperty(pKey)) continue;
                    bot.sendMessage({to:game.players[pKey].id,message:message});
                }
                game = false;
            },4000);
        });
    },2000);
};

module.exports = {
    init: function(sm,b) { sendMsg = sm; bot = b; },
    createGame: function(user,channel,server,userID) {
        if(game) {
            sendMsg(channel,['Sorry '+user+', a game is already in progress.']);
            return;
        }
        sendMsg(channel,['**'+user+'** wants to play Ray Fight, type  **!rf join**  to play!']);
        game = { 
            host: user, state: 'starting', server: server, channel: channel, 
            players: {}, turn: 0, laserMapHistory: [], frames: []
        };
        joinGame(user,userID);
    },
    joinGame: function(user,channel, userID) {
        if(!game || game.state != 'starting' || game.channel != channel || game.players[user]) {
            if(!game) {
                sendMsg(channel,['You must create a game first with  **!rf create**']);
            } else if(game.state == 'playing') {
                sendMsg(channel,['The game has already in progress!']);
            } else if(game.players[user]) {
                sendMsg(channel,[user+', you already joined!']);
            }
            return;
        }
        joinGame(user,userID);
        sendMsg(channel,[''+user+' has joined the game!']);
    },
    startGame: function(user,channel) {
        if(!game || game.state != 'starting' || game.host != user || game.channel != channel) {
            if(!game) {
                sendMsg(channel,['You must create a game first with  **!rf create**']);
            } else if(game.state != 'starting') {
                sendMsg(channel,['The game is already in progress!']);
            } else if(game.host != user) {
                sendMsg(channel,['Sorry, only '+game.host+' may start the game.']);
            }
            return;
        }
        map.createMap(game);
        for(var p = 0; p < Object.keys(game.players).length; p++) {
            spawnPowerup(); // Spawn a powerup for every player
        }
        game.state = 'playing';
        sendMsg(channel,['**The game has begun!**  Check your PMs!']);
        map.drawMap(game, function() {
            for(var pKey in game.players) { if(!game.players.hasOwnProperty(pKey)) continue;
                bot.uploadFile({
                    channel: game.players[pKey].channel,
                    file: fs.createReadStream(__dirname + '/turn.png')
                });
            }
            newTurn();
        });
    },
    stopGame: function(user,channel) {
        if(!game || game.host != user || game.channel != channel) {
            if(game.host != user) {
                sendMsg(channel,['Sorry, only '+game.host+' may stop the game.']);
            }
            return;
        }
        sendMsg(channel,['**Game has been stopped.**']);
        game = false;
    },
    kickPlayer: function(user,channel,player) {
        if(!game || game.host != user || !game.players[player]) {
            if(game.host != user) {
                sendMsg(channel,['Sorry, only '+game.host+' may kick players.']);
            } else if(!game.players[player]) {
                sendMsg(channel,['Can\'t find that player in the game.']);
            }
            return;
        }
        game.players[player].dead = true;
        if(checkCommands().length == 0) simulateTurn(); // Simulate turn if all players have sent commands
    },
    command: function(user,message) {
        if(!game || game.state != 'playing' || !game.players[user]) return;
        if(game.players[user].command || game.players[user].dead) return; // Already sent command, or dead
        message = message.toLowerCase();
        var commands = message.split(' ');
        var command = { move: { x: 0, y: 0 } };
        for(var c = 0; c < Math.min(commands.length,5); c++) {
            commands[c] = commands[c][0];
            if(commands[c] == 'p') {
                command.powerup = game.players[user].powerup;
                game.players[user].powerup = false;
                continue;
            }
            if(['m','s','r'].indexOf(commands[c]) < 0) {
                bot.sendMessage({to:game.players[user].id,message:'Invalid command!'});
                return;
            }
            if(!commands[c+1] || ['u','l','r','d'].indexOf(commands[c+1][0]) < 0) {
                bot.sendMessage({to:game.players[user].id,
                    message:'The **'+commands[c]+'** command requires a **direction**! ' +
                'Up, down, left, or right.'});
                return;
            }
            if(commands[c] == 'm') { // Add movement deltas
                command.move.x += directions[commands[c+1][0]].x;
                command.move.y += directions[commands[c+1][0]].y;
            } else if(commands[c] == 's') {
                command.shoot = { // Shoot
                    x: directions[commands[c+1][0]].x,
                    y: directions[commands[c+1][0]].y
                };
            } else {
                command.reflect = { // Reflect
                    x: directions[commands[c+1][0]].x,
                    y: directions[commands[c+1][0]].y
                };
            }
            c++;
        }
        if(command.shoot) command.reflect = false;
        if(command.powerup && command.powerup.name == 'Clipper Beam' && !command.shoot) { // Can't clipper reflect
            command.powerup = false;
        }
        bot.sendMessage({to:game.players[user].id,message:'Command received.'});
        game.players[user].command = command;
        setTimeout(function(){
            if(checkCommands().length == 0) { // All players have sent commands
                for(var pKey in game.players) { if(!game.players.hasOwnProperty(pKey)) continue;
                    bot.sendMessage({to:game.players[pKey].id,message:'Processing turn ' + game.turn + '...'});
                }
                setTimeout(simulateTurn,300);
            }
        },300);
    }
};

// Commands
switch(params[0]) {
    case 'create': rayFight.createGame(user,channelID,serverID,userID); break;
    case 'start': rayFight.startGame(user,channelID); break;
    case 'join': rayFight.joinGame(user,channelID,userID); break;
    case 'stop': rayFight.stopGame(user,channelID); break;
    case 'kick': rayFight.kickPlayer(user,channelID,params[1]); break;
}