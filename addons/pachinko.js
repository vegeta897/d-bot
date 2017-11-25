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

const RES = 1; // Output image scale
const WIDTH = 200;
const HEIGHT = 300;
const TOP_SPACE = 40; // Before pegs
const BOTTOM_SPACE = 50; // After pegs
const GOALS = 8;
const GOAL_HEIGHT = 20;
const PEG_RADIUS = 3;
const BALL_RADIUS = 6;
const PEG_COLLISION_DIST = Math.pow(PEG_RADIUS + BALL_RADIUS, 2);
const PEG_SPACING = PEG_RADIUS * 4 + BALL_RADIUS * 3;
const PEG_AREA_HEIGHT = HEIGHT - TOP_SPACE - BOTTOM_SPACE;
const PEG_AREA_WIDTH = WIDTH - (BALL_RADIUS * 2 + PEG_RADIUS * 3) * 2;

const GRAVITY = 0.01;
const FRICTION = 0.9;
const ELASTICITY = 0.75;

const FRAME_DIVIDER = 6;
const FPS = 30;

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
    //pegs.push([130, 40]);
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
    ctx.fillStyle = PEG_COLOR;
    for(let [pegX, pegY] of map.pegs) {
        ctx.beginPath();
        ctx.arc(pegX * RES, pegY * RES, PEG_RADIUS * RES, 0, 2 * Math.PI, false);
        ctx.fill();
    }
    return canvas;
}

let dotProduct = (a, b) => a.x * b.x + a.y * b.y;
let subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
let multiply = (a, f) => ({ x: a.x * f, y: a.y * f });

function simulate(map, cb) {
    let frame = 0;
    let canvas = new Canvas(WIDTH * RES, HEIGHT * RES);
    let ctx = canvas.getContext('2d');
    let encoder = new GIFEncoder(WIDTH * RES, HEIGHT * RES);
    encoder.createReadStream().pipe(fs.createWriteStream(IMAGE_PATH));
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(Math.round(1000 / FPS));
    encoder.setQuality(5);
    let x = WIDTH / 2;
    let y = BALL_RADIUS;
    let v = { x: 0.7, y: 0 };
    ctx.fillStyle = '#7E89DE';
    //console.time('simulating result');
    //util.timer.reset();
    ctx.drawImage(map.image, 0, 0);
    while(y < HEIGHT - BALL_RADIUS) {
        //util.timer.start('drawing frame');
        let subFrame = frame % FRAME_DIVIDER;
        ctx.beginPath();
        ctx.globalAlpha = subFrame === 0 ? 1 : Math.pow(0.5, FRAME_DIVIDER - subFrame);
        ctx.arc(x * RES, y * RES, BALL_RADIUS * RES, 0, 2 * Math.PI, false);
        ctx.fill();
        if(subFrame === 0) {
            encoder.addFrame(ctx);
            ctx.drawImage(map.image, 0, 0);
        }
        //util.timer.stop('drawing frame');
        v.y += GRAVITY;
        if(x < BALL_RADIUS || x > WIDTH - BALL_RADIUS) {
            v.x *= -ELASTICITY;
            x = x < BALL_RADIUS ? BALL_RADIUS : WIDTH - BALL_RADIUS;
        }
        for(let [pegX, pegY] of map.pegs) { // Detect peg collisions
            if(x + BALL_RADIUS <= pegX - PEG_RADIUS || x - BALL_RADIUS > pegX + PEG_RADIUS
                || y + BALL_RADIUS <= pegY - PEG_RADIUS || y - BALL_RADIUS > pegY + PEG_RADIUS
                || Math.pow(x - pegX, 2) + Math.pow(y - pegY, 2) > PEG_COLLISION_DIST) continue;
            //console.log('old velocity:', v.x, v.y);
            let n = { x: pegX - x, y: pegY - y }; // Collision normal
            let u = multiply(n, dotProduct(v, n) / dotProduct(n, n)); // Perpendicular
            let w = subtract(v, u); // Parallel
            let nv = subtract(multiply(w, FRICTION), multiply(u, ELASTICITY)); // New velocity
            x -= n.x * 0.2; // De-collide
            y -= n.y * 0.2;
            v.x = nv.x; // Set new velocity
            v.y = nv.y;
            //console.log('new velocity:', v.x, v.y);
        }
        x += v.x;
        y += v.y;
        frame++;
    }
    encoder.finish();
    //util.timer.results();
    //console.timeEnd('simulating result');
    //console.time('optimizing gif');
    execFile(gifsicle, [IMAGE_PATH], { maxBuffer: 1024 * 5000 }, err => {
        if(err) return console.log(err);
        //console.timeEnd('optimizing gif');
        setTimeout(() => fs.readFile(IMAGE_PATH, cb), 300); // Delay file read
    });
}

_commands.pachinko = function(data) {
    game = false;
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
            if(err) return console.log(err);
            discord.bot.uploadFile({
                to: data.channel, filename: `pachinko-${Date.now()}.gif`, file
            });
        });
    }, 1000)
};

module.exports = {
    listen(data) {
        if(!game || !game.channel !== data.channel) return;
        
    },
    commands: _commands
};