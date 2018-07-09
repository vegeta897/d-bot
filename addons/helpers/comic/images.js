'use strict';
var fs = require('fs');
var util = require(__base+'core/util.js');
var Canvas = require('canvas'),
    Image = Canvas.Image;

var images = { users: {} };
var collisionPrecision = 2;
var fWidth = 400, fHeight = 300;

var imageList = fs.readdirSync(__dirname + '/img/users');
imageList.sort();
for(var i = 0; i < imageList.length; i++) {
    var props = imageList[i].split('-'), user = props[0], state = props[1];
    if(!images.users[user]) images.users[user] = {};
    if(!images.users[user][state]) images.users[user][state] = [];
    var img = new Image;
    img.src = fs.readFileSync(__dirname + '/img/users/' + imageList[i]);
    var imgCanvas = new Canvas(fWidth, fHeight), imgCtx = imgCanvas.getContext('2d');
    imgCtx.drawImage(img,0,0,img.width, img.height, 0,0, fWidth, fHeight);
    var imgData = imgCtx.getImageData(0,0,fWidth, fHeight).data;
    var collisionMap = { side: 'right', rows: [] };
    for(var by = 0; by < fHeight / collisionPrecision; by++) {
        var firstSolidX = false;
        for(var bx = 0; bx < fWidth / collisionPrecision; bx++) {
            for(var px = 0; px < collisionPrecision; px++) {
                for(var py = 0; py < collisionPrecision; py++) {
                    var pixelAlpha = imgData[(bx * collisionPrecision + px) * 4 +
                        (by * collisionPrecision + py) * fWidth * 4 + 3];
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
    var flipped = { side: collisionMap.side === 'right' ? 'left' : 'right', rows: [] };
    for(var fc = 0; fc < fHeight/collisionPrecision; fc++) {
        flipped.rows.push(collisionMap.rows[fc] !== false ?
            fWidth/collisionPrecision-collisionMap.rows[fc] : false)
    }
    return flipped;
}

// Build average shaped collision box for rough text planning
var genericCollisionLeft = { side: 'left', rows: [] };
for(var gc = 0; gc < fHeight/collisionPrecision; gc++) {
    genericCollisionLeft.rows.push(gc > 75/collisionPrecision ? 300/collisionPrecision : false);
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
        var imgCanvas = new Canvas(fWidth, fHeight), imgCtx = imgCanvas.getContext('2d');
        imgCtx.patternQuality = 'best';
        imgCtx.drawImage(img,0,0,img.width, img.height, 0,0, fWidth, fHeight);
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
        var maxLeft = 0, minRight = fWidth;
        for(var r = Math.floor(y/collisionPrecision); r < Math.floor((y+h)/collisionPrecision); r++) {
            for(var c = 0; c < collisionMaps.length; c++) {
                var side = collisionMaps[c].side, rows = collisionMaps[c].rows;
                if(!rows[r]) continue;
                if(side == 'left') {
                    maxLeft = Math.max(maxLeft, rows[r]*collisionPrecision);
                } else {
                    minRight = Math.min(minRight, rows[r]*collisionPrecision);
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
