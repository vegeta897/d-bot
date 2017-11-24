// Big in Japan
const util = require(__base+'core/util.js');
const discord = require(__base+'core/discord.js');
const config = require(__base+'core/config.js');
const storage = require(__base+'core/storage.js');
const Canvas = require('canvas');
const GIFEncoder = require('gifencoder');
const fs = require('fs');
const { execFile } = require('child_process');
const gifsicle = require('gifsicle');

const _commands = {};

const IMAGE_PATH = storage.getStoragePath('play.gif');

const RES = 2;
const WIDTH = 200;
const HEIGHT = 300;
const TOP_SPACE = 40;
const BOTTOM_SPACE = 50;
const GOALS = 8;
const GOAL_HEIGHT = 20;
const PEG_RADIUS = 3;
const BALL_RADIUS = 6;
const PEG_SPACING = PEG_RADIUS * 4 + BALL_RADIUS * 2;
const PEG_AREA_HEIGHT = HEIGHT - TOP_SPACE - BOTTOM_SPACE;
const PEG_AREA_WIDTH = WIDTH - (BALL_RADIUS * 2 + PEG_RADIUS * 3) * 2;

const BORDER_COLOR = '#AAAAAA';
const PEG_COLOR = '#CCCCCC';
const BG_COLOR = '#202225';

let game = false;

function generateMap() {
    let pegs = [];
    let map = { width: WIDTH, height: HEIGHT, pegs };
    let pegRows = Math.floor(PEG_AREA_HEIGHT / PEG_SPACING);
    let pegRowHeight = Math.floor(PEG_AREA_HEIGHT / pegRows);
    let maxXPegs = Math.floor(PEG_AREA_WIDTH / PEG_SPACING);
    let prevXPegCount = 0;
    for(let r = 0; r <= pegRows; r++) {
        let pegY = TOP_SPACE + pegRowHeight * r;
        let xPegCount;
        do {
            xPegCount = util.randomInt(3, maxXPegs);
        } while(xPegCount % 2 === prevXPegCount % 2);
        prevXPegCount = xPegCount;
        let xPegWidth = util.random(PEG_SPACING, PEG_AREA_WIDTH / xPegCount);
        let xPegPadding = (WIDTH - xPegCount * xPegWidth) / 2;
        for(let x = 0; x <= xPegCount; x++) {
            pegs.push([Math.round(xPegPadding + xPegWidth * x), pegY]);
        }
    }
    return map;
}

function drawMap(map) {
    let canvas = new Canvas(WIDTH * RES, HEIGHT * RES);
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = BORDER_COLOR;
    ctx.fillRect(0, 0, WIDTH * RES, HEIGHT * RES);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(RES, RES, (WIDTH - 2) * RES, (HEIGHT - 2) * RES);
    ctx.fillStyle = '#7E89DE';
    ctx.beginPath();
    ctx.arc(WIDTH / 2 * RES, (BALL_RADIUS + 4) * RES, BALL_RADIUS * RES, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.fillStyle = PEG_COLOR;
    for(let [pegX, pegY] of map.pegs) {
        ctx.beginPath();
        ctx.arc(pegX * RES, pegY * RES, PEG_RADIUS * RES, 0, 2 * Math.PI, false);
        ctx.fill();
    }
    return canvas;
}

function simulate(map, cb) {
    let canvas = new Canvas(WIDTH * RES, HEIGHT * RES);
    let ctx = canvas.getContext('2d');
    ctx.drawImage(map.image, 0, 0);
    let encoder = new GIFEncoder(WIDTH * RES, HEIGHT * RES);
    encoder.createReadStream().pipe(fs.createWriteStream(IMAGE_PATH));
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(40);
    encoder.addFrame(ctx);
    encoder.finish();
    execFile(gifsicle, [IMAGE_PATH], err => {
        if(err) return console.log(err);
        fs.readFile(IMAGE_PATH, cb);
    });
}

_commands.pachinko = function(data) {
    if(game) return data.reply('There is already a pachinko game in progress!');
    game = { players: [] };
    game.channel = data.channel;
    game.map = generateMap();
    game.map.image = drawMap(game.map);
    discord.bot.uploadFile({
        to: data.channel, filename: `pachinko-${Date.now()}.png`, file: game.map.image.toBuffer()
    });
    setTimeout(() => {
        simulate(game.map, (err, file) => {
            if(err) return data.reply('Error: ' + err);
            discord.bot.uploadFile({
                to: data.channel, filename: `pachinko-${Date.now()}.gif`, file
            });
        });
    }, 10000)
};

module.exports = {
    listen(data) {
        if(!game || !game.channel !== data.channel) return;
        
    },
    commands: _commands
};