// Big in Japan
const util = require(__base+'core/util.js');
const discord = require(__base+'core/discord.js');
const config = require(__base+'core/config.js');
const storage = require(__base+'core/storage.js');
const { Thumbnail } = require('./helpers/canvas.js');
const Canvas = require('canvas');
const GIFEncoder = require('gifencoder');
const fs = require('fs');
const { execFile } = require('child_process');
const gifsicle = require('gifsicle');
const download = require('download');

const _commands = {};

const IMAGE_PATH = storage.getStoragePath('play.gif');

const RES = 1; // Output image scale
const WIDTH = 200;
const HEIGHT = 300;
const TOP_SPACE = 40; // Before pegs
const BOTTOM_SPACE = 50; // After pegs
const SLOTS = 6; // Deploy positions
const SLOT_WIDTH = WIDTH / (SLOTS + 1);
const GOALS = 8;
const GOAL_HEIGHT = 20;
const PEG_RADIUS = 2.5;
const BUMPER_RADIUS = 5;
const BALL_RADIUS = 9;
const PEG_SPACING = Math.ceil(PEG_RADIUS * 2 + BALL_RADIUS * 2.5);
const PEG_AREA_HEIGHT = HEIGHT - TOP_SPACE - BOTTOM_SPACE;
const PEG_AREA_WIDTH = WIDTH - PEG_SPACING * 2;

const GRAVITY = 0.01;
const FRICTION = 0.9;
const ELASTICITY = 0.7;

const FRAME_DIVIDER = 6;
const FPS = 30;

const BORDER_COLOR = '#AAAAAA';
const PEG_COLOR = '#CCCCCC';
const DEFAULT_USER_COLOR = '#AAABAD';
const DEFAULT_BALL_COLOR = '#CCCCCC';
const BG_COLOR = '#202225';

const AVATAR_URL = 'https://cdn.discordapp.com/avatars/';

const SLOT_IMAGE = new Canvas(WIDTH * RES, TOP_SPACE * RES);

function drawSlots() {
    let slotCtx = SLOT_IMAGE.getContext('2d');
    slotCtx.strokeStyle = BORDER_COLOR;
    slotCtx.lineWidth = RES;
    slotCtx.fillStyle = PEG_COLOR;
    slotCtx.font = `${Math.floor(TOP_SPACE / 2.8 * RES)}px Roboto`;
    slotCtx.textBaseline = 'top';
    slotCtx.textAlign = 'center';
    for(let s = 0; s < SLOTS; s++) {
        let x = Math.floor((s + 1) * SLOT_WIDTH * RES);
        slotCtx.beginPath();
        slotCtx.moveTo(x + 0.5, TOP_SPACE / 2 * RES);
        slotCtx.lineTo(x + 0.5, TOP_SPACE * 0.75 * RES);
        slotCtx.moveTo(x + 0.5 - SLOT_WIDTH / 10 * RES, TOP_SPACE * 0.7 * RES);
        slotCtx.lineTo(x + 0.5, TOP_SPACE * 0.75 * RES);
        slotCtx.lineTo(x + 0.5 + SLOT_WIDTH / 10 * RES, TOP_SPACE * 0.7 * RES);
        slotCtx.stroke();
        slotCtx.fillText((s + 1).toString(), x + RES - (s + 1 === 1 ? 1 : 0) * RES, 0);
    }
}
drawSlots();

let game = false;

function generateMap() {
    let pegs = [];
    let map = { width: WIDTH, height: HEIGHT, pegs };
    let pegRows = Math.floor(PEG_AREA_HEIGHT / PEG_SPACING) + 1;
    let pegRowHeight = Math.floor(PEG_AREA_HEIGHT / (pegRows - 1));
    let maxXPegs = Math.floor(PEG_AREA_WIDTH / PEG_SPACING) + 1;
    let prevXPegCount = 0;
    let prevBumpers = false;
    for(let r = 0; r < pegRows; r++) {
        let pegY = TOP_SPACE + pegRowHeight * r;
        let xPegCount;
        do {
            xPegCount = util.randomInt(Math.max(2, Math.ceil(maxXPegs * 2 / 3)), maxXPegs);
        } while(xPegCount % 2 === prevXPegCount % 2 || (r === 0 && xPegCount === SLOTS));
        prevXPegCount = xPegCount;
        let xPegWidth = util.random(PEG_SPACING, PEG_AREA_WIDTH / (xPegCount - 1));
        let xPegPadding = (WIDTH - (xPegCount - 1) * xPegWidth) / 2;
        if(xPegPadding > BUMPER_RADIUS + PEG_SPACING && !prevBumpers && r + 1 < pegRows) {
            pegs.push([0, pegY + pegRowHeight / 2, BUMPER_RADIUS]);
            pegs.push([WIDTH, pegY + pegRowHeight / 2, BUMPER_RADIUS]);
            prevBumpers = true;
        } else prevBumpers = false;
        for(let x = 0; x < xPegCount; x++) {
            pegs.push([Math.round(xPegPadding + xPegWidth * x), pegY, PEG_RADIUS]);
        }
    }
    return map;
}

function drawMap(map) {
    let canvas = new Canvas(WIDTH * RES, HEIGHT * RES);
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, WIDTH * RES, HEIGHT * RES);
    ctx.fillStyle = PEG_COLOR;
    for(let [pegX, pegY, pegRadius] of map.pegs) {
        ctx.beginPath();
        ctx.arc(pegX * RES, pegY * RES, pegRadius * RES, 0, 2 * Math.PI);
        ctx.fill();
    }
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = RES;
    ctx.beginPath();
    ctx.moveTo(RES / 2, RES / 2);
    ctx.lineTo(WIDTH * RES - RES / 2, RES / 2);
    ctx.lineTo(WIDTH * RES - RES / 2, HEIGHT * RES - RES / 2);
    ctx.lineTo(RES / 2, HEIGHT * RES - RES / 2);
    ctx.closePath();
    ctx.stroke();
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
    let player = game.players.get('86913608335773696');
    let ballImg = player.avatarImg;
    let x = player.slot * SLOT_WIDTH;
    let y = BALL_RADIUS;
    let v = { x: util.random(GRAVITY * -20, GRAVITY * 20), y: 0 };
    //console.time('simulating result');
    //util.timer.reset();
    ctx.drawImage(map.image, 0, 0);
    ctx.beginPath();
    ctx.moveTo(RES, RES);
    ctx.lineTo(WIDTH * RES - RES, RES);
    ctx.lineTo(WIDTH * RES - RES, HEIGHT * RES - RES);
    ctx.lineTo(RES, HEIGHT * RES - RES);
    ctx.closePath();
    ctx.clip();
    while(y < HEIGHT - BALL_RADIUS) {
        //util.timer.start('drawing frame');
        let subFrame = frame % FRAME_DIVIDER;
        ctx.globalAlpha = subFrame === 0 ? 1 : Math.pow(0.5, FRAME_DIVIDER - subFrame);
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(x * RES, y * RES, BALL_RADIUS * RES + RES, 0, 2 * Math.PI);
        ctx.fill();
        ctx.save();
        ctx.shadowColor = player.color;
        ctx.shadowBlur = 5 * RES;
        ctx.drawImage(ballImg, (x - BALL_RADIUS) * RES, (y - BALL_RADIUS) * RES);
        ctx.restore();
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
        for(let [pegX, pegY, pegRadius] of map.pegs) { // Detect peg collisions
            let pegCollisionDist = Math.pow(pegRadius + BALL_RADIUS, 2);
            if(x + BALL_RADIUS <= pegX - pegRadius || x - BALL_RADIUS > pegX + pegRadius
                || y + BALL_RADIUS <= pegY - pegRadius || y - BALL_RADIUS > pegY + pegRadius
                || Math.pow(x - pegX, 2) + Math.pow(y - pegY, 2) > pegCollisionDist) continue;
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
    game = { players: new Map() };
    game.channel = data.channel;
    game.map = generateMap();
    game.map.image = drawMap(game.map);
    let canvas = new Canvas(game.map.image.width, game.map.image.height);
    let ctx = canvas.getContext('2d');
    ctx.drawImage(game.map.image, 0, 0);
    ctx.drawImage(SLOT_IMAGE, 0, 0);
    discord.bot.uploadFile({
        to: data.channel, filename: `pachinko-${Date.now()}.png`, file: canvas.toBuffer(),
        message: `**__Pachinko!__**\nUse \`${config.prefixes[0]}p\` to choose a slot #`
    });
};

module.exports = {
    listen(data) {
        if(!game || game.channel !== data.channel || data.command !== 'p') return;
        let slot = +data.paramStr;
        if(!(slot > 0 && slot <= SLOTS)) return data.reply(`Pick a slot from 1 to ${SLOTS}`);
        let user = discord.bot.servers[data.server].members[data.userID];
        game.players.set(data.userID, {
            slot, color: user.color !== null ? ('#' + user.color.toString(16)) : DEFAULT_USER_COLOR
        });
        let avatarCanvas = new Canvas(BALL_RADIUS * 2 * RES, BALL_RADIUS * 2 * RES);
        let avatarCtx = avatarCanvas.getContext('2d');
        avatarCtx.beginPath();
        avatarCtx.arc(BALL_RADIUS * RES, BALL_RADIUS * RES, BALL_RADIUS * RES, 0, 2 * Math.PI);
        let avatarURL = `${AVATAR_URL}${data.userID}/${user.avatar}.png`;
        download(avatarURL).then(imgData => {
            let img = new Canvas.Image;
            img.src = imgData;
            avatarCtx.clip();
            let resizedAvatar = new Thumbnail(img, BALL_RADIUS * 2 * RES, 3);
            avatarCtx.drawImage(resizedAvatar, 0, 0);
            game.players.get(data.userID).avatarImg = avatarCanvas;
            simulate(game.map, (err, file) => {
                if(err) return console.log(err);
                discord.bot.uploadFile({
                    to: data.channel, filename: `pachinko-${Date.now()}.gif`, file
                });
            });
        }).catch(err => {
            console.log(err);
            avatarCtx.fillStyle = DEFAULT_BALL_COLOR;
            avatarCtx.fill();
            game.players.get(data.userID).avatarImg = false;
        });
    },
    dev: true,
    commands: _commands
};