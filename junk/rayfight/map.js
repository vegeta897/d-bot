'use strict';
var util = require('./../util.js');
var Canvas = require('canvas');
var GIFEncoder = require('gifencoder');
var fs = require('fs');

var cWidth = 400, cHeight = 300; // Max embedded image dimensions

var main = createCanvas(),
    canvas = main.canvas, ctx = main.ctx;

function createCanvas() {
    var newCanvas = new Canvas(cWidth, cHeight), newCtx = newCanvas.getContext('2d');
    newCtx.antialias = 'none';
    newCtx.patternQuality = 'nearest';
    newCtx.filter = 'nearest';
    return { canvas: newCanvas, ctx: newCtx };
}

var mapWidth = 20, mapHeight = 15, gridSize = 20;
var bgColor = '#36393e';

module.exports = {
    createMap: function(game) {
        var map = {}, playerMap = {};
        for(var x = 0; x < mapWidth; x++) { for(var y = 0; y < mapHeight; y++) {
            var rng = Math.random();
            if(x == 0 || x == mapWidth-1 || y == 0 || y == mapHeight-1/* || rng < 0.02*/) {
                map[x+':'+y] = 'block';
            } else if(rng > 0.5) {
                map[x+':'+y] = { type: Math.random() > 0.5 ? 'forSlash' : 'backSlash' };
            }
        }}
        for(var pKey in game.players) { if (!game.players.hasOwnProperty(pKey)) continue;
            do {
                var px = util.randomIntRange(1,mapWidth-2),
                    py = util.randomIntRange(1,mapHeight-2);
            } while(map[px+':'+py] || playerMap[px+':'+py]);
            playerMap[px+':'+py] = game.players[pKey];
            game.players[pKey].x = game.players[pKey].prevX = px;
            game.players[pKey].y = game.players[pKey].prevY = py;
        }
        game.map = map;
        game.playerMap = playerMap;
        game.powerups = {};
    },
    drawMap: function(game, cb) {
        var encoder = new GIFEncoder(cWidth,cHeight);
        var stream = encoder.createReadStream();
        stream.pipe(fs.createWriteStream(__dirname + '/turn.png')).on('finish', cb);
        encoder.start();
        encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
        encoder.setDelay(500);  // frame delay in ms
        encoder.setTransparent(0xFF00FF);
        var frames = [];
        function addFrame(stage,count) { for(var i = 0; i < count; i++) {
            frames.push({ stage:stage, frame:i, last: i+1 == count });
        } }
        addFrame('start',1);
        //if(game.turnAngles) addFrame('angles',8);
        if(game.movement) addFrame('move',12);
        if(game.reflection) addFrame('reflect',5);
        //console.log('movement:',game.movement,'    longestLaser:',game.longestLaser);
        if(game.longestLaser) addFrame('laser',game.longestLaser*2);
        var empty = createCanvas();
        for(var f = 0; f < frames.length; f++) {
            var stage = frames[f].stage;
            var delay = f+1 == frames.length ? 800 : // Hold last frame
                stage == 'laser' ? 60 : 45;
            encoder.setDelay(delay);
            encoder.setDispose(stage == 'start' ? 0 // Redraw
                : (stage == 'move'/* || stage == 'angles'*/) && !frames[f].last ? 3 // Restore to previous
                : 1); // No dispose
            //console.log(frames[f]);
            drawFrame(game,frames[f],empty);
            var frame = createCanvas();
            frame.ctx.drawImage(canvas,0,0);
            game.frames.push(frame);
            encoder.addFrame(ctx);
            frame.delay = delay;
            frame.dispose = encoder.dispose;
        }
        encoder.finish();
    },
    drawFinal: function(game, cb) {
        var encoder = new GIFEncoder(cWidth,cHeight);
        var stream = encoder.createReadStream();
        stream.pipe(fs.createWriteStream(__dirname + '/final.png')).on('finish', cb);
        encoder.start();
        encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
        encoder.setDelay(500);  // frame delay in ms
        encoder.setTransparent(0xFF00FF);
        for(var f = 0; f < game.frames.length; f++) {
            var delay = game.frames[f].delay;
            encoder.setDelay(delay == 800 ? 200 : delay == 60 ? 40 : 30);
            encoder.setDispose(game.frames[f].dispose);
            encoder.addFrame(game.frames[f].ctx);
        }
        encoder.finish();
    },
    width: mapWidth, height: mapHeight, cWidth: cWidth, cHeight: cHeight, canvas: canvas, ctx: ctx
};

function drawFrame(game, frame, empty) {
    ctx.fillStyle = '#FF00FF';
    ctx.fillRect(0,0,cWidth,cHeight);
    //if(frame.stage == 'start') drawMap(game.map);
    //for(var lmh = 0; lmh < game.laserMapHistory.length; lmh++) {
    //    drawLasers(game.laserMapHistory[lmh], -1, false);
    //}
    if(frame.stage == 'start') {
        drawMap(game.map);
        drawPowerups(game.powerups);
        empty.ctx.drawImage(canvas,0,0);
    }
    //if(frame.stage == 'angles') {
    //    drawMap(game.map);
    //}
    if((frame.stage == 'start' || frame.stage == 'move' || frame.stage == 'reflect')) {
        drawPlayers(game.playerMap, frame, empty.canvas, game.turn);
    }
    if(frame.stage == 'laser') drawLasers(game.laserMap, frame, true);
    if(frame.stage == 'move' && frame.last) {
        empty.ctx.drawImage(canvas,0,0);
    }
}

function drawPlayers(playerMap, frame, empty, turn) {
    for(var pKey in playerMap) { if(!playerMap.hasOwnProperty(pKey)) continue;
        var player = playerMap[pKey];
        if(frame.stage == 'move') {
            var canvasXOld = player.prevX * gridSize, canvasYOld = player.prevY * gridSize;
            ctx.drawImage(empty,canvasXOld-5,canvasYOld-5,30,30,canvasXOld-5,canvasYOld-5,30,30);
        }
    }
    for(pKey in playerMap) { if (!playerMap.hasOwnProperty(pKey)) continue;
        player = playerMap[pKey];
        var move = { x: player.x - player.prevX, y: player.y - player.prevY };
        var progress = frame.stage == 'start' ? 0 
            : frame.stage == 'move' ? Math.easeInOutCubic(frame.frame,0,1,12) : 1;
        var x = player.prevX + move.x*progress, y = player.prevY + move.y*progress,
            canvasX = Math.round(x * gridSize), canvasY = Math.round(y * gridSize);
        if(player.powerup) {
            if(player.powerup.turn < turn) {
                ctx.fillStyle = player.powerup.color;
                ctx.beginPath();
                ctx.arc(canvasX+gridSize/2, canvasY+gridSize/2, gridSize/2-1, 0, 2 * Math.PI, false);
                ctx.fill();
            } else if(frame.stage == 'move' || frame.stage == 'start') {
                drawPowerup(player.powerup);
            }
        }
        if(player.reflecting && frame.stage != 'start' && frame.stage != 'move') {
            ctx.lineWidth = 3;
            var stokeValue = frame.stage == 'reflect' ? Math.round(60 + frame.frame/4 * 127) : 187;
            ctx.strokeStyle = 'rgba('+stokeValue+','+stokeValue+','+stokeValue+',1)';
            ctx.beginPath();
            if(player.command.powerup && player.command.powerup.name == 'Omni Power') {
                ctx.moveTo(canvasX,canvasY);
                ctx.lineTo(canvasX+gridSize,canvasY);
                ctx.lineTo(canvasX+gridSize,canvasY+gridSize);
                ctx.lineTo(canvasX,canvasY+gridSize);
                ctx.lineTo(canvasX,canvasY);
            } else {
                var rx = canvasX+gridSize/2+player.reflecting.x*gridSize/2,
                    ry = canvasY+gridSize/2+player.reflecting.y*gridSize/2;
                ctx.moveTo(rx+player.reflecting.y*gridSize/2,ry+player.reflecting.x*gridSize/2);
                ctx.lineTo(rx-player.reflecting.y*gridSize/2,ry-player.reflecting.x*gridSize/2);
            }
            ctx.stroke();
        }
        if(player.dead < turn) drawKillMarker(player.x,player.y);
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(canvasX+gridSize/2, canvasY+gridSize/2, gridSize/2-3, 0, 2 * Math.PI, false);
        ctx.fill();
    }
}

function drawMap(map) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,cWidth,cHeight);
    for(var mKey in map) { if (!map.hasOwnProperty(mKey)) continue;
        var x = +mKey.split(':')[0], y = +mKey.split(':')[1];
        var tile = map[mKey];
        drawTile(x,y,tile,0);
    }
}

function drawTile(x,y,tile,laserSegment) {
    var canvasX = x * gridSize, canvasY = y * gridSize;
    ctx.fillStyle = tile.hit && tile.hit <= laserSegment ? '#4c84f6' : tile.turned ? '#6081ac' : '#666677';
    if(tile == 'block') {
        ctx.fillRect(canvasX,canvasY,gridSize,gridSize);
    } else if(tile.type == 'forSlash') {
        ctx.beginPath();
        ctx.moveTo(canvasX+gridSize,canvasY);
        ctx.lineTo(canvasX+gridSize,canvasY+2);
        ctx.lineTo(canvasX+2,canvasY+gridSize);
        ctx.lineTo(canvasX,canvasY+gridSize);
        ctx.lineTo(canvasX,canvasY+gridSize-2);
        ctx.lineTo(canvasX+gridSize-2,canvasY);
        ctx.fill();
    } else if(tile.type == 'backSlash') {
        ctx.beginPath();
        ctx.moveTo(canvasX,canvasY);
        ctx.lineTo(canvasX+2,canvasY);
        ctx.lineTo(canvasX+gridSize,canvasY+gridSize-2);
        ctx.lineTo(canvasX+gridSize,canvasY+gridSize);
        ctx.lineTo(canvasX+gridSize-2,canvasY+gridSize);
        ctx.lineTo(canvasX,canvasY+2);
        ctx.fill();
    }
}

function drawLasers(laserMap,frame,current) {
    ctx.lineWidth = 2;
    for(var lKey in laserMap) { if(!laserMap.hasOwnProperty(lKey)) continue;
        var x = +lKey.split(':')[0], y = +lKey.split(':')[1],
            canvasX = x * gridSize+gridSize/2, canvasY = y * gridSize+gridSize/2;
        var laserCount = laserMap[lKey].length;
        for(var l = 0; l < laserCount; l++) {
            var laser = laserMap[lKey][l];
            if(laser.from.x == laser.to.x && laser.from.y == laser.to.y) continue;
            var segment = Math.floor(frame.frame / 2);
            if(laser.segment != segment) continue;
            var laserProgress = frame.frame % 2;
            var fromD = { x: laser.from.x*gridSize/2, y: laser.from.y*gridSize/2 },
                toD = { x: laser.to.x*gridSize/2, y: laser.to.y*gridSize/2 };
            ctx.strokeStyle = current ? laser.reflected ? '#ffffff' 
                : laser.player.color : 'rgba(128,128,128,0.1)';
            var start = { x: canvasX+fromD.x, y: canvasY+fromD.y },
                mid = { x: canvasX, y: canvasY },
                end = { x: canvasX+toD.x, y: canvasY+toD.y };
            if(laser.angled) drawTile(laser.x,laser.y,laser.angled,segment);
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(mid.x, mid.y);
            if(laser.segment != segment || laserProgress > 0) ctx.lineTo(end.x, end.y);
            ctx.stroke();
            if(laser.segment != segment || laserProgress > 0) {
                if(laser.kill) drawKillMarker(laser.x,laser.y);
            }
        }
    }
}

function drawPowerups(powerups) {
    for(var pKey in powerups) { if(!powerups.hasOwnProperty(pKey)) continue;
        drawPowerup(powerups[pKey]);
    }
}

function drawPowerup(powerup) {
    var canvasX = powerup.x * gridSize, canvasY = powerup.y * gridSize;
    ctx.fillStyle = powerup.color;
    ctx.fillRect(canvasX+2,canvasY+2,gridSize-4,gridSize-4);
    ctx.fillStyle = '#222222';
    ctx.fillRect(canvasX+4,canvasY+4,gridSize-8,gridSize-8);
    ctx.fillStyle = powerup.color;
    ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(powerup.symbol,canvasX+gridSize/2,canvasY+gridSize/2+5);
}

function drawKillMarker(x,y) {
    var canvasX = x * gridSize, canvasY = y * gridSize;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#800000';
    ctx.beginPath();
    ctx.moveTo(canvasX+2,canvasY+2);
    ctx.lineTo(canvasX+gridSize-2,canvasY+gridSize-2);
    ctx.moveTo(canvasX+gridSize-2,canvasY+2);
    ctx.lineTo(canvasX+2,canvasY+gridSize-2);
    ctx.stroke();
}

Math.easeInOutCubic = function (t, b, c, d) {
    t /= d/2;
    if (t < 1) return c/2*t*t*t + b;
    t -= 2;
    return c/2*(t*t*t + 2) + b;
};