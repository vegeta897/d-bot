// Big in Japan
const util = require(__base+'core/util.js');
const discord = require(__base+'core/discord.js');
const config = require(__base+'core/config.js');
const storage = require(__base+'core/storage.js');
const { Thumbnail } = require('./helpers/canvas.js');
const Canvas = require('canvas');
const GIFEncoder = require('gifencoder');
const fs = require('fs');
const imagemin = require('imagemin');
const imageminGifsicle = require('imagemin-gifsicle');
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

const GRAVITY = 0.012;
const FRICTION = 0.9;
const ELASTICITY = 0.7;

const FRAME_DIVIDER = 6;
const FPS = 30;
const MAX_SUBFRAMES = 150 * 7.5 * FRAME_DIVIDER; // Avg 150 frames per megabyte, max 7.5mb upload

const DIM_COLOR = '#888888';
const BORDER_COLOR = '#AAAAAA';
const PEG_COLOR = '#CCCCCC';
const DEFAULT_USER_COLOR = '#AAABAD';
const DEFAULT_BALL_COLOR = '#CCCCCC';
const BG_COLOR = '#202225';

const AVATAR_URL = 'https://cdn.discordapp.com/avatars/';

const SLOT_IMAGE = new Canvas(WIDTH * RES, TOP_SPACE * RES);

function drawSlots() {
    let slotCtx = SLOT_IMAGE.getContext('2d');
    slotCtx.strokeStyle = DIM_COLOR;
    slotCtx.lineWidth = RES * 3;
    slotCtx.lineCap = 'round';
    slotCtx.fillStyle = PEG_COLOR;
    slotCtx.font = `${Math.floor(TOP_SPACE * 0.45 * RES)}px Roboto`;
    slotCtx.textBaseline = 'top';
    slotCtx.textAlign = 'center';
    for(let s = 0; s < SLOTS; s++) {
        let x = Math.floor((s + 1) * SLOT_WIDTH * RES);
        slotCtx.beginPath();
        slotCtx.moveTo(x + 0.5 - SLOT_WIDTH * 0.2 * RES, TOP_SPACE * 0.61 * RES);
        slotCtx.lineTo(x + 0.5, TOP_SPACE * 0.75 * RES);
        slotCtx.lineTo(x + 0.5 + SLOT_WIDTH * 0.2 * RES, TOP_SPACE * 0.61 * RES);
        slotCtx.stroke();
        slotCtx.fillText((s + 1).toString(), x + RES - (s + 1 === 1 ? 2 : 0) * RES, 0);
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
    encoder.setQuality(4);
    //console.time('simulating result');
    //util.timer.reset();
    ctx.drawImage(map.image, 0, 0);
    ctx.beginPath();
    ctx.moveTo(RES, RES);
    ctx.lineTo(WIDTH * RES - RES, RES);
    ctx.lineTo(WIDTH * RES - RES, HEIGHT * RES - RES);
    ctx.lineTo(RES, HEIGHT * RES - RES);
    ctx.closePath();
    ctx.clip(); // Don't draw over map border
    let playersDone = 0;
    let slotRound = 0;
    let roundFrames = Math.ceil(Math.sqrt(2 * HEIGHT / GRAVITY)); // t = sqrt(2d/a)
    function nextRound() {
        if(slotRound + 1 > game.maxSlotStack) return;
        game.slots.forEach(slot => {
            if(game.players.has(slot[slotRound])) game.players.get(slot[slotRound]).status.falling = true;
        });
        slotRound++;
    }
    nextRound();
    while((playersDone < game.players.size || slotRound < game.maxSlotStack) && frame < MAX_SUBFRAMES) {
        //util.timer.start('drawing frame');
        let subFrame = frame % FRAME_DIVIDER;
        //util.timer.stop('drawing frame');
        game.players.forEach(({ p, v, a, status, color, avatarImg }, playerID) => {
            if(!status.falling) return;
            ctx.globalAlpha = subFrame === 0 ? 1 : Math.pow(0.5, FRAME_DIVIDER - subFrame);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x * RES, p.y * RES, BALL_RADIUS * RES + RES, 0, 2 * Math.PI);
            ctx.fill();
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 3 * RES;
            ctx.drawImage(avatarImg, (p.x - BALL_RADIUS) * RES, (p.y - BALL_RADIUS) * RES);
            ctx.restore();
            v.y += GRAVITY;
            if(p.x < BALL_RADIUS || p.x > WIDTH - BALL_RADIUS) {
                v.x *= -ELASTICITY;
                p.x = p.x < BALL_RADIUS ? BALL_RADIUS : WIDTH - BALL_RADIUS;
            }
            a.v += a.t * 0.5; // Angular velocity affected by torque and inertia
            game.players.forEach(({ p: p2, v: v2, status: status2 }, player2ID) => {
                if(playerID === player2ID || !status2.falling) return;
                let playerCollisionDist = Math.pow(BALL_RADIUS * 2, 2);
                if(Math.abs(p.x - p2.x) > BALL_RADIUS * 2 || Math.abs(p.y - p2.y) > BALL_RADIUS * 2
                    || Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2) > playerCollisionDist) return;
                let n = { x: p2.x - p.x, y: p2.y - p.y }; // Collision normal
                let rv = subtract(v, v2); // Relative velocity
                let vNorm = dotProduct(rv, n); // Velocity along normal
                if(vNorm <= 0) return; // Already moving away
                let u = multiply(n, vNorm / dotProduct(n, n)); // Perpendicular
                let u2 = multiply(n, -vNorm / dotProduct(n, n)); // Perpendicular
                let w = subtract(v, u); // Parallel
                let w2 = subtract(v2, u2); // Parallel
                // Calculate new velocities
                Object.assign(v, subtract(multiply(w, FRICTION / 2), multiply(u, ELASTICITY / 2)));
                Object.assign(v2, subtract(multiply(w2, FRICTION / 2), multiply(u2, ELASTICITY / 2)));
            });
            for(let [pegX, pegY, pegRadius] of map.pegs) { // Detect peg collisions
                let pegCollisionDist = Math.pow(pegRadius + BALL_RADIUS, 2);
                if(p.x + BALL_RADIUS <= pegX - pegRadius || p.x - BALL_RADIUS > pegX + pegRadius
                    || p.y + BALL_RADIUS <= pegY - pegRadius || p.y - BALL_RADIUS > pegY + pegRadius
                    || Math.pow(p.x - pegX, 2) + Math.pow(p.y - pegY, 2) > pegCollisionDist) continue;
                //console.log('old velocity:', v.x, v.y);
                let n = { x: pegX - p.x, y: pegY - p.y }; // Collision normal
                let vNorm = dotProduct(v, n); // Velocity along normal
                if(vNorm <= 0) return; // Already moving away
                let u = multiply(n, vNorm / dotProduct(n, n)); // Perpendicular
                let w = subtract(v, u); // Parallel
                Object.assign(v, subtract(multiply(w, FRICTION), multiply(u, ELASTICITY))); // Calc new velocity
                //console.log('new velocity:', v.x, v.y);
            }
        });
        game.players.forEach(({ p, v, a, status }) => {
            if(!status.falling) return;
            if(Math.abs(v.x) + Math.abs(v.y) <= GRAVITY) status.stillFrames++;
            else status.stillFrames = 0;
            p.x += v.x;
            p.y += v.y;
            if(p.y >= HEIGHT + BALL_RADIUS || status.stillFrames > 30) {
                playersDone++;
                status.falling = false;
            }
            a.o += a.v; // Angular velocity affects orientation
        });
        if(subFrame === 0) {
            encoder.addFrame(ctx);
            ctx.drawImage(map.image, 0, 0);
        }
        frame++;
        if(frame % roundFrames === 0) nextRound();
    }
    encoder.finish();
    //util.timer.results();
    //console.timeEnd('simulating result');
    //console.time('optimizing gif');
    imagemin([IMAGE_PATH], { use: [imageminGifsicle({ optimizationLevel: 2 })] }).then(() => {
        setTimeout(() => fs.readFile(IMAGE_PATH, cb), 300); // Delay file read
    }).catch(console.log);
}

_commands.pachinko = function(data) {
    game = false;
    if(game) return data.reply('There is already a pachinko game in progress!');
    game = { players: new Map(), channel: data.channel, slots: [], maxSlotStack: 0 };
    for(let i = 0; i <= SLOTS; i++) game.slots.push([]);
    game.map = generateMap();
    game.map.image = drawMap(game.map);
    let canvas = new Canvas(game.map.image.width, game.map.image.height);
    let ctx = canvas.getContext('2d');
    ctx.drawImage(game.map.image, 0, 0);
    ctx.drawImage(SLOT_IMAGE, 0, 0);
    discord.uploadFile({
        to: data.channel, filename: `pachinko-${Date.now()}.png`, file: canvas.toBuffer(),
        message: `**__Pachinko!__**\nUse \`${config.prefixes[0]}p\` to choose a slot #`
    });
};

function testRun() {
    _commands.pachinko({
        channel: '209177876975583232',
        reply: (msg, polite, cb) => discord.sendMessage('209177876975583232', msg, polite, cb)
    });
}
// if(!discord.bot.connected) discord.bot.on('ready', testRun);
// else testRun();

module.exports = {
    async listen(data) {
        if(!game || game.channel !== data.channel || data.command !== 'p') return;
        let slot = +data.paramStr;
        if(!(slot > 0 && slot <= SLOTS)) return data.reply(`Pick a slot from 1 to ${SLOTS}`);
        let { member: user, channel: { guild } } = data.messageObject;
        let avatarImg = new Canvas(BALL_RADIUS * 2 * RES, BALL_RADIUS * 2 * RES);
        let avatarCtx = avatarImg.getContext('2d');
        game.players.set(data.userID, {
            slot, color: discord.getUserColor(user, guild) || DEFAULT_USER_COLOR, avatarImg,
            v: { x: util.random(-1, 1) * GRAVITY * 20, y: 0 }, // Velocity
            p: { x: slot * SLOT_WIDTH, y: 0 }, // Position
            a: { o: 0, v: 0, t: 0 }, // Angular: orientation, velocity, torque
            status: { stillFrames: 0 }
        });
        // for(let i = 0; i < 12; i++) {
        //     game.players.set('test' + i, {
        //         slot, color: '#eaa5f3', avatarImg,
        //         v: { x: util.random(GRAVITY * -20, GRAVITY * 20), y: 0 },
        //         p: { x: ((i % 6) + 1) * SLOT_WIDTH, y: 0 },
        //         status: { stillFrames: 0 }
        //     });
        //     game.slots[i % 6 + 1].push('test' + i);
        // }
        game.slots[slot].push(data.userID);
        game.maxSlotStack = Math.max(game.maxSlotStack, game.slots[slot].length);
        avatarCtx.beginPath();
        avatarCtx.arc(BALL_RADIUS * RES, BALL_RADIUS * RES, BALL_RADIUS * RES, 0, 2 * Math.PI);
        let avatarURL = `${AVATAR_URL}${data.userID}/${user.avatar}.png`;
        download(avatarURL).then(imgData => {
            let img = new Canvas.Image;
            img.src = imgData;
            avatarCtx.clip();
            let resizedAvatar = new Thumbnail(img, BALL_RADIUS * 2 * RES, 3);
            avatarCtx.drawImage(resizedAvatar, 0, 0);
            simulate(game.map, (err, file) => {
                if(err) return console.log(err);
                discord.uploadFile({
                    to: data.channel, filename: `pachinko-${Date.now()}.gif`, file
                });
            });
        }).catch(err => {
            console.log(err);
            avatarCtx.fillStyle = DEFAULT_BALL_COLOR;
            avatarCtx.fill();
        });
    },
    dev: true,
    commands: _commands
};
