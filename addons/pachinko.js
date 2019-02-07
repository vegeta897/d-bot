// Big in Japan
const util = require(__base+'core/util.js');
const discord = require(__base+'core/discord.js');
const config = require(__base+'core/config.js');
const storage = require(__base+'core/storage.js');
const { Thumbnail } = require('./helpers/canvas.js');
const Canvas = require('canvas');
const GIFEncoder = require('gifencoder');
const fse = require('fs-extra');
const imagemin = require('imagemin');
const imageminGifsicle = require('imagemin-gifsicle');
const download = require('download');
const p2 = require('p2');

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
const PEG_SPACE_FACTOR = 1.2;
const PEG_SPACING = Math.ceil(PEG_RADIUS * 2 + BALL_RADIUS * 2 * PEG_SPACE_FACTOR);
const PEG_AREA_HEIGHT = HEIGHT - TOP_SPACE - BOTTOM_SPACE;
const PEG_AREA_WIDTH = WIDTH - PEG_SPACING * 2;

const BG_COLOR = '#202225';
const BORDER_COLOR = '#AAAAAA';
const DIM_COLOR = '#888888';
const PEG_COLOR = '#CCCCCC';
const DEFAULT_USER_COLOR = '#AAABAD';
const DEFAULT_BALL_COLOR = '#7289DA';

const AVATAR_URL = 'https://cdn.discordapp.com/avatars/';

const GRAVITY = 1;
const BALL_MASS = 0.2;
const BALL_DAMPING = 0.01;
const BALL_MATERIAL = new p2.Material();
const PEG_MATERIAL = new p2.Material();
const FLOOR_MATERIAL = new p2.Material();

const FPS = 30;
const SUBFRAMES = 8;

let game = false;

const _commands = {};

_commands.pachinko = async function(data) {
    console.log('starting pachinko');
    game = false;
    if(game) return data.reply('There is already a pachinko game in progress!');
    game = {
        channel: data.channel, players: new Map(), world: new p2.World({ gravity: [0, GRAVITY] }),
        slots: [], highestSlotStack: 0
    };
    game.world.addContactMaterial(new p2.ContactMaterial(BALL_MATERIAL, PEG_MATERIAL, {
        restitution: 0.6, stiffness: Number.MAX_VALUE, friction: 5
    }));
    console.log('initialized game object');
    for(let i = 0; i <= SLOTS; i++) game.slots.push([]); // Each slot is an array of player IDs
    generateMap(game.world); // Add pegs and bumpers to world
    console.log('generated map');
    game.mapImage = drawMap(game.world);
    console.log('drawn map');
    //data.reply(inspectBodies(game.world.bodies).substring(0, 2000));
    let canvas = new Canvas(game.mapImage.width, game.mapImage.height);
    let ctx = canvas.getContext('2d');
    ctx.drawImage(game.mapImage, 0, 0);
    //ctx.drawImage(SLOT_IMAGE, 0, 0);
    console.log('sending map image');
    // discord.uploadFile({
    //     to: data.channel, filename: `pachinko-${Date.now()}.png`, file: canvas.toBuffer(),
    //     message: `**__Pachinko!__**\nUse \`${config.prefixes[0]}p\` to choose a slot #`
    // });
    let body = new p2.Body({
        mass: BALL_MASS, position: [WIDTH / 2, - BALL_RADIUS],
        damping: BALL_DAMPING, angularDamping: 0
    });
    body.addShape(new p2.Circle({ radius: BALL_RADIUS, material: BALL_MATERIAL }));
    game.world.addBody(body);
    game.players.set('1', { body });
    let finalGIF = await simulate(game.world);
    discord.uploadFile({
        to: data.channel, filename: `pachinko-${Date.now()}.gif`, file: finalGIF
    });
};

module.exports = {
    async listen(data) {
        if(!game || game.channel !== data.channel || data.command !== 'p') return;
        let slot = +data.paramStr;
        if(!(slot > 0 && slot <= SLOTS)) return data.reply(`Pick a slot from 1 to ${SLOTS}`);
        let { member: user, channel: { guild } } = data.messageObject;
        let body = new p2.Body({ mass: BALL_MASS, position: [slot * SLOT_WIDTH, HEIGHT] });
        body.addShape(new p2.Circle({ radius: BALL_RADIUS }));
        game.world.addBody(body);
        game.slots[slot].push(data.userID);
        game.maxSlotStack = Math.max(game.maxSlotStack, game.slots[slot].length);
        let avatarImg = new Canvas(BALL_RADIUS * 2 * RES, BALL_RADIUS * 2 * RES);
        let avatarCtx = avatarImg.getContext('2d');
        avatarCtx.beginPath();
        avatarCtx.arc(BALL_RADIUS * RES, BALL_RADIUS * RES, BALL_RADIUS * RES, 0, 2 * Math.PI);
        try {
            let avatarImgData = await download(`${AVATAR_URL}${data.userID}/${user.avatar}.png`);
            let img = new Canvas.Image;
            img.src = avatarImgData;
            avatarCtx.clip();
            let resizedAvatar = new Thumbnail(img, BALL_RADIUS * 2 * RES, 3);
            avatarCtx.drawImage(resizedAvatar, 0, 0);
        } catch(e) {
            console.error(e);
            avatarCtx.fillStyle = DEFAULT_BALL_COLOR;
            avatarCtx.fill();
        }
        game.players.set(data.userID, {
            slot, body, color: discord.getUserColor(user, guild) || DEFAULT_USER_COLOR, avatarImg
        });
        let finalGIF = await simulate(game.world);
        console.log(finalGIF);
        // discord.uploadFile({
        //     to: data.channel, filename: `pachinko-${Date.now()}.gif`, file: finalGIF
        // });
    },
    dev: true,
    commands: _commands
};

function generateMap(world) {
    let ground = new p2.Body({ position: [0, HEIGHT], angle: Math.PI });
    ground.addShape(new p2.Plane({ material: PEG_MATERIAL }));
    world.addBody(ground);
    let leftWall = new p2.Body({ position: [0, 0], angle: -Math.PI / 2 });
    leftWall.addShape(new p2.Plane({ material: PEG_MATERIAL }));
    world.addBody(leftWall);
    let rightWall = new p2.Body({ position: [WIDTH, 0], angle: Math.PI / 2 });
    rightWall.addShape(new p2.Plane({ material: PEG_MATERIAL }));
    world.addBody(rightWall);
    let pegRows = Math.floor(PEG_AREA_HEIGHT / PEG_SPACING) + 1;
    let pegRowHeight = Math.floor(PEG_AREA_HEIGHT / (pegRows - 1));
    let maxXPegs = Math.floor(PEG_AREA_WIDTH / PEG_SPACING) + 1;
    let prevXPegCount = 0;
    let prevBumpers = false;
    function addStaticCircle(x, y, radius) {
        let pegBody = new p2.Body({ position: [x, y] });
        pegBody.addShape(new p2.Circle({ radius, material: PEG_MATERIAL }));
        world.addBody(pegBody);
    }
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
            addStaticCircle(0, pegY + pegRowHeight / 2, BUMPER_RADIUS);
            addStaticCircle(WIDTH, pegY + pegRowHeight / 2, BUMPER_RADIUS);
            prevBumpers = true;
        } else prevBumpers = false;
        for(let x = 0; x < xPegCount; x++) {
            addStaticCircle(Math.round(xPegPadding + xPegWidth * x), pegY, PEG_RADIUS);
        }
    }
}

function drawMap(world) {
    let canvas = new Canvas(WIDTH * RES, HEIGHT * RES);
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, WIDTH * RES, HEIGHT * RES);
    ctx.fillStyle = PEG_COLOR;
    for(let body of world.bodies) {
        let shape = body.shapes[0];
        if(!shape || shape.type !== p2.Shape.CIRCLE) continue;
        ctx.beginPath();
        ctx.arc(body.position[0] * RES, body.position[1] * RES, shape.boundingRadius * RES, 0, 2 * Math.PI);
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

function simulate(world) {
    return new Promise((resolve, reject) => {
        let frame = 0;
        let canvas = new Canvas(WIDTH * RES, HEIGHT * RES);
        let ctx = canvas.getContext('2d');
        let encoder = new GIFEncoder(WIDTH * RES, HEIGHT * RES);

        let buffers = [];
        console.log('creating read stream');
        let encoderStream = encoder.createReadStream();
        encoderStream.on('data', d => buffers.push(d));
        encoderStream.on('end', () => {
            let encodedBuffer = Buffer.concat(buffers);
            fse.outputFile('play.gif', encodedBuffer).then(() => console.log('wrote file!')).catch(console.log);
            resolve(encodedBuffer);
            // TODO: Imagemin output is buggy!
            // imagemin.buffer(encodedBuffer, { use: [imageminGifsicle({ optimizationLevel: 1 })] })
            //     .then(resolve);
        });

        encoder.start();
        encoder.setRepeat(0);
        encoder.setDelay(Math.round(1000 / FPS));
        encoder.setQuality(4);
        ctx.drawImage(game.mapImage, 0, 0);
        ctx.beginPath();
        ctx.moveTo(RES, RES);
        ctx.lineTo(WIDTH * RES - RES, RES);
        ctx.lineTo(WIDTH * RES - RES, HEIGHT * RES - RES);
        ctx.lineTo(RES, HEIGHT * RES - RES);
        ctx.closePath();
        ctx.clip(); // Don't draw over map border

        ctx.strokeStyle = '#FFFFFF';

        // Apply random horizontal starting forces to players
        let playerBody;
        for(let [userID, player] of game.players) {
            // player.body.position[1] = HEIGHT;
            player.body.force[0] = 2; //util.random(-1, 1) * 10;
            console.log('player start position', player.body.position, player.body.force);
            playerBody = player.body;
        }
        console.log('simulating');
        world.on('impact', ({ bodyA, bodyB, shapeA, shapeB }) => {
            // console.log('impact', bodyA.id, shapeA.boundingRadius, bodyB.id, shapeB.boundingRadius);

            // TODO: Light up pegs when hit
            // Store hit pegs in an array to be drawn below

        });
        for(let i = 0; i < 2000; i++) {
            world.step(0.1);
            // console.log(i, playerBody.sleepState, playerBody.position, playerBody.velocity);
            // console.log(playerBody.angle);
            if(i % SUBFRAMES > 0) continue;
            for(let [userID, player] of game.players) {
                let { position: [x, y], angle } = player.body;
                ctx.fillStyle = DEFAULT_BALL_COLOR;
                ctx.beginPath();
                ctx.arc(x * RES, y * RES, BALL_RADIUS * RES + RES, 0, 2 * Math.PI);
                ctx.fill();

                // Draw angle
                ctx.beginPath();
                ctx.moveTo(x * RES, y * RES);
                ctx.lineTo(x * RES + Math.cos(angle) * BALL_RADIUS, y * RES + Math.sin(angle) * BALL_RADIUS);
                ctx.stroke();
            }
            encoder.addFrame(ctx);
            ctx.drawImage(game.mapImage, 0, 0);
        }
        encoder.finish();
        console.log('simulation complete');

        // return new Promise((resolve, reject) => {
        //     setTimeout(resolve, 100);
        // });
    });
}

function inspectBodies(bodies) {
    return require('util').inspect(bodies.map(({ id, angle, angularForce, angularVelocity, force, inertia, position, velocity, type, shapes }) => {
        let body = {
            id, angle, x: position[0], y: position[1], shape: shapes[0].type, radius: shapes[0].boundingRadius
        };
        if(type !== p2.Body.STATIC) Object.assign(body, {
            angForce: angularForce, angVel: angularVelocity, force, inertia, xVel: velocity[0], yVel: velocity[1]
        });
        return body;
    }));
}

function testRun() {
    _commands.pachinko({
        channel: '209177876975583232',
        reply: (msg, polite, cb) => discord.sendMessage('209177876975583232', msg, polite, cb)
    });
}
if(discord.bot.uptime > 0) testRun();
