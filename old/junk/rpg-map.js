var cWidth = 400, cHeight = 300; // Max embedded image dimensions

var { Canvas, createCanvas, Image } = require('canvas');
var canvas = createCanvas(cWidth, cHeight);
var ctx = canvas.getContext('2d');

ctx.fillStyle = 'white';
ctx.fillRect(0,0,cWidth,cHeight);
ctx.fillStyle = 'black';
ctx.fillRect(100,0,1,200);
ctx.fillRect(0,100,200,1);

var fs = require('fs')
    , out = fs.createWriteStream(__dirname + '/text.png')
    , stream = canvas.pngStream();

stream.on('data', function(chunk){
    out.write(chunk);
});

stream.on('end', function(){
    // Image ready
});

module.exports = {

};
