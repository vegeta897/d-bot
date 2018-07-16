'use strict';
const fs = require('fs');
const util = require(__base+'core/util.js');
const Canvas = require('canvas'),
    Image = Canvas.Image;

const images = { users: {} };
const COLLIDE_PRECISION = 2;
const FRAME_WIDTH = 400;
const FRAME_HEIGHT = 300;
const LEFT = 'left', RIGHT = 'right';

var imageList = fs.readdirSync(__dirname + '/img/users');
imageList.sort();
for(var i = 0; i < imageList.length; i++) {
    var props = imageList[i].split('-'), user = props[0], state = props[1];
    if(!images.users[user]) images.users[user] = {};
    if(!images.users[user][state]) images.users[user][state] = [];
    var img = new Image;
    img.src = fs.readFileSync(__dirname + '/img/users/' + imageList[i]);
    var imgCanvas = new Canvas(FRAME_WIDTH, FRAME_HEIGHT), imgCtx = imgCanvas.getContext('2d');
    imgCtx.drawImage(img,0,0,img.width, img.height, 0,0, FRAME_WIDTH, FRAME_HEIGHT);
    var imgData = imgCtx.getImageData(0,0,FRAME_WIDTH, FRAME_HEIGHT).data;
    var collisionMap = { side: RIGHT, rows: [] };
    for(var by = 0; by < FRAME_HEIGHT / COLLIDE_PRECISION; by++) {
        var firstSolidX = false;
        for(var bx = 0; bx < FRAME_WIDTH / COLLIDE_PRECISION; bx++) {
            for(var px = 0; px < COLLIDE_PRECISION; px++) {
                for(var py = 0; py < COLLIDE_PRECISION; py++) {
                    var pixelAlpha = imgData[(bx * COLLIDE_PRECISION + px) * 4 +
                        (by * COLLIDE_PRECISION + py) * FRAME_WIDTH * 4 + 3];
                    if(pixelAlpha > 0.3) {
                        firstSolidX = bx;
                        break;
                    }
                }
                if(firstSolidX !== false) break;
            }
            if(firstSolidX !== false) break;
        }
        collisionMap.rows.push(firstSolidX);
    }
    images.users[user][state].push(collisionMap);
}

function flipCollision(collisionMap) { // Flip collision map side
    var flipped = { side: collisionMap.side === RIGHT ? LEFT : RIGHT, rows: [] };
    for(var fc = 0; fc < FRAME_HEIGHT/COLLIDE_PRECISION; fc++) {
        flipped.rows.push(collisionMap.rows[fc] !== false ?
            FRAME_WIDTH/COLLIDE_PRECISION-collisionMap.rows[fc] : false)
    }
    return flipped;
}

// Build average shaped collision box for rough text planning
var genericCollisionLeft = { side: LEFT, rows: [] };
for(var gc = 0; gc < FRAME_HEIGHT/COLLIDE_PRECISION; gc++) {
    genericCollisionLeft.rows.push(gc > 75/COLLIDE_PRECISION ? 300/COLLIDE_PRECISION : false);
}
var genericCollisionRight = flipCollision(genericCollisionLeft);

module.exports = {
    getImage: function(user, state) {
        user = images.users[user] ? user : 'anon';
        if(!images.users[user][state]) { // If user doesn't have this state, find a generic one
            switch(state) {
                case 'link': state = 'talk'; break;
                default: state = 'idle'; break;
            }
        }
        var variation = util.randomInt(1,images.users[user][state].length);
        var imageName = user+'-'+state+'-'+ variation + '.png',
            img = new Image;
        img.src = fs.readFileSync(__dirname + '/img/users/' + imageName);
        var imgCanvas = new Canvas(FRAME_WIDTH, FRAME_HEIGHT), imgCtx = imgCanvas.getContext('2d');
        imgCtx.patternQuality = 'best';
        imgCtx.drawImage(img,0,0,img.width, img.height, 0,0, FRAME_WIDTH, FRAME_HEIGHT);
        //imgCtx.fillStyle = 'rgba(255,0,0,0.2)';
        //for(var r = 0; r < images.users[user][state][variation-1].rows.length; r++) {
        //    var rowValue = images.users[user][state][variation-1].rows[r];
        //    if(rowValue === false) continue;
        //    imgCtx.fillRect(rowValue*collisionPrecision,r*collisionPrecision,
        //        fWidth-(rowValue*collisionPrecision),collisionPrecision);
        //}
        return { collisionMap: images.users[user][state][variation-1], img: imgCanvas };
    },
    getEmptySpace: function(y,h,collisionMaps) {
        var maxLeft = 0, minRight = FRAME_WIDTH;
        for(var r = Math.floor(y/COLLIDE_PRECISION); r < Math.floor((y+h)/COLLIDE_PRECISION); r++) {
            for(var c = 0; c < collisionMaps.length; c++) {
                var side = collisionMaps[c].side, rows = collisionMaps[c].rows;
                if(!rows[r]) continue;
                if(side === LEFT) {
                    maxLeft = Math.max(maxLeft, rows[r]*COLLIDE_PRECISION);
                } else {
                    minRight = Math.min(minRight, rows[r]*COLLIDE_PRECISION);
                }
            }
        }
        return maxLeft >= minRight ? false : { left: maxLeft, right: minRight };
    },
    images: images,
    genericCollisionLeft: genericCollisionLeft, genericCollisionRight: genericCollisionRight,
    genericCollisions: [genericCollisionLeft,genericCollisionRight],
    flipCollision: flipCollision
};
