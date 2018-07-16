// A comic strip generator using the message log
const util = require(__base+'core/util.js');
const storage = require(__base+'core/storage.js');
const messages = require(__base+'core/messages.js');
const discord = require(__base+'core/discord.js');
const config = require(__base+'core/config.js');
const requireUncached = require('require-uncached');
const images = requireUncached('./helpers/comic/images.js');
const Canvas = require('canvas');

// ✔️️ Multiple messages from the same user can clump into one frame
// ✔️ Pay attention to message times to create conversations, and insert pauses with silent frames
// ✔️ If message contains only a URL, character should be holding up a link symbol
// ✔️ Randomly transpose actors alone in frame horizontally
// Make random platforms for viper to be on, so he is in frame (separate image drawn under viper)
// Markov can show up randomly in the last frame to deliver a non-sequitur
// Create "themes" with location backgrounds and/or activities and/or outfits for the actors
// Grab linked images and draw them in the frame
// Allow generating a comic from a search term
// Use Twemoji lib to draw emoji

const SCALE = 2;
const FRAME_WIDTH = 200 * SCALE; // Frame dimensions
const FRAME_HEIGHT = 150 * SCALE;
const FRAME_COLUMNS = 2;

const DEFAULT_FONT_SIZE = 36;
const FONT_FAMILY = 'px "SF Action Man"';
const FONT_COLOR = '#222222';
const FONT_SHADOW_COLOR = '#FFFFFF';

const MSG_POOL_SIZE = 30;
const DEFAULT_FRAME_COUNT = 4;
const MIN_PAUSE_TIME = 3 * 60 * 1000;
const LEFT = 'left', RIGHT = 'right';

let _commands = {};

_commands.comic = async function(data) {
    if(!config.comic) return data.reply('The comic command has not been configured!');
    // if(data.userID === '86919912156573696') return data.reply('No more comics for you, Raz');
    let query = {
        channel: config.comic.channel,
        $not: { content: '' }
    };
    let skip = 0;
    if(data.params[0] !== 'that') { // Grab messages from a random point
        // util.timer.start('count messages');
        let count = await messages.cursor(db => db.ccount(query));
        // util.timer.stop('count messages');
        skip = util.randomInt(count - skip);
    }
    // util.timer.start('get messages');
    let msgPool = await messages.cursor(db => db.cfind(query).sort({time:-1}).skip(skip).limit(MSG_POOL_SIZE));
    msgPool = msgPool.map(({ content, user, time }) => ({
        text: discord.bot.fixMessage(util.emojiToText(content).replace(/<(:\w+:)\d+>/gi,'$1'), data.server),
        time, user: config.comic.users[user] || user
    }));
    // util.timer.stop('get messages');
    let dialogue = buildDialogue(msgPool);
    //console.log(dialogue);
    let frames = createFrames(dialogue);
    // util.timer.start('draw comic');
    drawActors(frames);
    drawText(frames);
    let { canvas: mainCanvas, ctx: mainContext } = createCanvas(FRAME_WIDTH * FRAME_COLUMNS, FRAME_HEIGHT * 2);
    for(let f = 0; f < frames.length; f++) {
        frames[f].number = f + 1;
        drawFrameToComic(mainContext, mainCanvas, frames[f]);
    }
    fillText(mainContext, (new Date(msgPool[0].time)).toLocaleDateString(), mainCanvas.width - 2, mainCanvas.height - 4, 28, RIGHT, 1);
    // util.timer.stop('draw comic');
    // util.timer.start('upload');
    let filename = `comic-${Date.now()}.png`;
    require('fs').writeFile(storage.getStoragePath(filename), mainCanvas.toBuffer(), () => {});
    discord.bot.uploadFile({
        to: data.channel, filename, file: mainCanvas.toBuffer()
    }, () => {
        // util.timer.stop('upload');
        // util.timer.results();
        // util.timer.reset();
    });
};

function createCanvas(width, height) {
    let newCanvas = new Canvas(width, height),
        newCtx = newCanvas.getContext('2d');
    newCtx.patternQuality = 'best';
    return { canvas: newCanvas, ctx: newCtx };
}

function buildDialogue(messages) {
    let dialogue = [];
    let longestPause = 0;
    let totalPauseTime = 0;
    let addBeat = function() {
        if(dialogue.length > 0) {
            let pauseLength = dialogue[0].time - beat.time;
            longestPause = Math.max(pauseLength, longestPause);
            totalPauseTime += pauseLength;
        }
        dialogue.unshift(beat); // Add beat to dialogue (reversed because the messages are reversed)
        beat = {};
    };
    let beat = {};
    for(let i = 0; i < messages.length; i++) { // Loop through messages, newest to oldest
        if(dialogue.length === DEFAULT_FRAME_COUNT) break;
        let { user, text, time } = messages[i];
        // console.log('m =',m,'user:',user,'text:',text,'time:',time);
        // console.log('beat:',beat);
        if(beat.speaker) { // If speaker already defined for this beat
            //console.log('speaker already defined:',beat.speaker);
            if(beat.speaker === user) { // If beat speaker matches current message speaker
                //console.log('speaker matches message user');
                let joinedText = text + ' \n \n ' + beat.text;
                let textFit = planText.bind( // Test fit
                    null, joinedText, LEFT, images.genericCollisions, DEFAULT_FONT_SIZE / 6
                );
                if(beat.time - time < MIN_PAUSE_TIME && textFit()) { // If msg is < min pause time & text fits
                    //console.log('fits and less than 3 min, joining');
                    beat.text = text + ' \n \n ' + beat.text;
                    beat.time = time;
                } else { // Pause too long or doesn't fit, so this beat is done
                    //console.log('pause too long or doesn't fit, adding beat');
                    addBeat();
                    i--; // Run through this message again
                }
            } else { // If different speaker
                //console.log('different speaker, adding beat');
                addBeat();
                i--; // Run through this message again
            }
        }
        else { // Beat has no speaker
            //console.log('new beat, setting speaker time and text');
            beat.speaker = user;
            beat.text = text;
            beat.time = time;
        }
    }
    let averagePauseLength = (totalPauseTime / (dialogue.length - 1));
    for(let b = dialogue.length - 1; b > 0; b--) {
        // Check if pause time is more than twice the average, and more than min pause time
        let pauseTime = dialogue[b].time - dialogue[b - 1].time;
        if(pauseTime > Math.max(MIN_PAUSE_TIME, averagePauseLength * 2)) {
            dialogue.splice(b, 0, { pause: true, time: dialogue[b - 1].time + pauseTime / 2 });
            dialogue.shift();
            break; // Only one pause per comic
        }
    }
    // console.log(dialogue);
    return dialogue;
}

function createFrames(dialogue) {
    let frames = [], actors = {};
    let placeActor = function(actor, side) {
        for(let aKey of Object.keys(actors)) {
            if(actors[aKey] === side) delete actors[aKey]; // Remove actor already on this side
        }
        actors[actor] = side;
    };
    let lastSpeaker;
    // Place actors (first pass)
    for(let i = 0; i < dialogue.length; i++) {
        let { speaker, time, text } = dialogue[i];
        let frame = { actors: {}, speaker, time, text };
        if(speaker) { // If beat has a speaker
            if(!lastSpeaker) { // First speaker
                placeActor(speaker, util.flip() ? LEFT : RIGHT); // Put speaker on random side
            } else { // If not on first frame
                if(lastSpeaker && speaker !== lastSpeaker.actor) { // If different than last speaker
                    // Put new speaker on opposite side
                    placeActor(speaker,util.flip(lastSpeaker.side));
                }
            }
            lastSpeaker = { side: actors[speaker], actor: speaker };
        }
        // for(let aKey in actors) { if(!actors.hasOwnProperty(aKey)) continue;
        //     if(aKey !== speaker && dialogue[pa + 1] && aKey !== dialogue[pa + 1].speaker) {
        //         // If actor not speaking this frame or next frame, chance of leaving
        //         if(Math.random() > 0.7) delete actors[aKey];
        //     }
        // }
        frame.actors = Object.assign({}, actors); // Write actors to frame
        // console.log('actors placed in frame',pa,frame.actors);
        frames.push(frame);
    }
    let leftActorFill, rightActorFill;
    for(let i = frames.length - 1; i >= 0; i--) {
        let { actors } = frames[i];
        let leftActor = Object.keys(actors).find(aKey => actors[aKey] === LEFT);
        let rightActor = Object.keys(actors).find(aKey => actors[aKey] === RIGHT);
        if(leftActor) leftActorFill = leftActor;
        if(rightActor) rightActorFill = rightActor;
        if(!leftActor && leftActorFill) actors[leftActorFill] = LEFT;
        if(!rightActor && rightActorFill) actors[rightActorFill] = RIGHT;
    }
    // console.log(JSON.stringify(frames, null, '\t'));
    return frames;
}

function drawActors(frames) {
    let bgColor = { h: Math.random(), s: 0.15, v: 0.9 };
    // console.log('drawing actors to frames');
    // Draw actors to frames
    for(let i = 0; i < frames.length; i++) {
        // console.log('drawing frame',da-frames.length+5);
        let frame = frames[i];
        frame.bgImage = createCanvas(FRAME_WIDTH,FRAME_HEIGHT);
        frame.bgImage.ctx.rect(0,0,FRAME_WIDTH,FRAME_HEIGHT);
        let bgGradient = frame.bgImage.ctx.createRadialGradient(
            FRAME_WIDTH/2, 0, FRAME_HEIGHT/2,
            FRAME_WIDTH/2, FRAME_HEIGHT/2, FRAME_HEIGHT
        );
        let hueOffset = 0;
        if(i === frames.length-1 && !frames[i-1].speaker) hueOffset = Math.random() * 0.3;
        let dark = util.hsvToRGB(bgColor.h+hueOffset,bgColor.s,bgColor.v),
            light = util.hsvToRGB(
                bgColor.h+hueOffset+Math.random()*0.12,
                bgColor.s-Math.random()*0.07,
                bgColor.v+Math.random()*0.07
            );
        bgGradient.addColorStop(0, 'rgba('+light.r+','+light.g+','+light.b+',1)');
        bgGradient.addColorStop(1, 'rgba('+dark.r+','+dark.g+','+dark.b+',1)');
        frame.bgImage.ctx.fillStyle = bgGradient;
        frame.bgImage.ctx.fill();
        frame.collisionMaps = [];
        frame.actorImage = createCanvas(FRAME_WIDTH,FRAME_HEIGHT);
        for(let aKey of Object.keys(frame.actors)) {
            let actorState = 'idle';
            if(frame.speaker) {
                if(frame.speaker === aKey) {
                    actorState = frame.text.substr(0,4) === 'http' ? 'link' : 'talk';
                } else {
                    actorState = 'listen';
                }
            } else {
                actorState = Object.keys(frame.actors).length === 1 ? 'alone' : 'idle';
            }
            let frameImage = images.getImage(aKey,actorState);
            // console.log(aKey,actorState,frame.actors[aKey]);
            if(frame.actors[aKey] === LEFT) {
                frame.actorImage.ctx.translate(FRAME_WIDTH,0);
                frame.actorImage.ctx.scale(-1,1);
                frameImage.collisionMap = images.flipCollision(frameImage.collisionMap);
            }
            let xOffset = 0;
            if(actorState === 'alone') xOffset = util.randomInt(150);
            frame.collisionMaps.push(frameImage.collisionMap);
            frame.actorImage.ctx.drawImage(frameImage.img,0,0,FRAME_WIDTH,FRAME_HEIGHT,xOffset*-1,0,FRAME_WIDTH,FRAME_HEIGHT);
            if(frame.actors[aKey] === LEFT) {
                frame.actorImage.ctx.translate(FRAME_WIDTH,0);
                frame.actorImage.ctx.scale(-1,1);
            }
        }
    }
}

function drawText(frames) {
    for(let frame of frames) {
        let { text, actors, collisionMaps } = frame;
        if(!frame.text) continue;
        let { lines, fontSize, align } = planText(text, actors[frame.speaker], collisionMaps, DEFAULT_FONT_SIZE);
        frame.textImage = createCanvas(FRAME_WIDTH, FRAME_HEIGHT);
        for(let { text, x, y } of lines) {
            fillText(frame.textImage.ctx, text, x, y, fontSize, align, SCALE);
        }
    }
}

function drawFrameToComic(ctx, canvas, frame) {
    // console.log('drawFrameToComic');
    // console.log('drawing:',frame.number,frame.speaker,frame.actors);
    // console.log('text plan:',JSON.stringify(frame.textPlan, null, '\t'));
    let frameX = (frame.number - 1) % FRAME_COLUMNS * FRAME_WIDTH,
        frameY = Math.floor((frame.number - 1) / FRAME_COLUMNS) * FRAME_HEIGHT;
    //ctx.fillStyle = '#eeeeee'; // Draw frame BG color
    //ctx.fillRect((frame.number-1) % 2 * F_WIDTH, Math.floor((frame.number-1) / 2) * F_HEIGHT, F_WIDTH, F_HEIGHT);
    ctx.drawImage(frame.bgImage.canvas, frameX, frameY);
    if(frame.textImage) ctx.drawImage(frame.textImage.canvas, frameX, frameY);
    ctx.drawImage(frame.actorImage.canvas, frameX, frameY);
    if(frame.number === DEFAULT_FRAME_COUNT) {  // After last frame is drawn
        // Draw frame borders
        ctx.clearRect(FRAME_WIDTH - 4, 0, 8, canvas.height);
        ctx.clearRect(0, FRAME_HEIGHT - 4, canvas.width, 8);
    }
}

function fillText(context, text, x, y, size, align, shadowSpread) {
    context.font = size + FONT_FAMILY;
    context.textAlign = align;
    context.fillStyle = FONT_SHADOW_COLOR;
    context.shadowColor = FONT_SHADOW_COLOR;
    context.shadowBlur = size / 10 * shadowSpread;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    for(let s = 0; s < 4; s++) { // Draw shadows
        let ox = shadowSpread, oy = shadowSpread;
        switch(s) {
            case 0: ox = -shadowSpread; oy = -shadowSpread; break;
            case 1: ox = shadowSpread; oy = -shadowSpread; break;
            case 2: ox = -shadowSpread; oy = shadowSpread; break;
        }
        context.fillText(text, x + ox, y + oy);
    }
    context.fillStyle = FONT_COLOR; // Draw primary color
    context.fillText(text, x, y);
}

function planText(text, align, collisionMaps, maxShrink) {
    //console.log('planning text, objects:',JSON.stringify(objects, null, '\t'));
    for(let s = 0; s <= maxShrink; s++) {
        let plan = { fontSize: DEFAULT_FONT_SIZE - s, align: align, lines: [] };
        plan.lineHeight = Math.round(plan.fontSize * 0.85);
        let horizontalPadding = Math.round(plan.fontSize * 0.35);
        let ctx = createCanvas(FRAME_WIDTH, FRAME_HEIGHT).ctx;
        ctx.font = plan.fontSize + FONT_FAMILY;
        ctx.textAlign = align;
        let words = text.split(' ');
        let line = '';
        let y = Math.round(plan.fontSize),
            textHeight = Math.round(plan.fontSize * 0.7);
        let space = images.getEmptySpace(y-textHeight, textHeight, collisionMaps);
        let x = align === LEFT ? space.left + horizontalPadding : space.right - horizontalPadding,
            maxWidth = space.right - space.left - horizontalPadding * 2;
        for(let n = 0; n < words.length; n++) {
            let urlDomain = util.getDomain(words[n]);
            let currentWord = urlDomain ? '<' + urlDomain + '>' : words[n];
            if(currentWord === '') continue;
            if(currentWord === '\n') {
                if(line !== '') plan.lines.push({ x: x, y: y, text: line });
                line = '';
                y += plan.lineHeight;
                space = images.getEmptySpace(y-textHeight, textHeight, collisionMaps);
                x = align === LEFT ? space.left + horizontalPadding : space.right - horizontalPadding;
                maxWidth = space.right - space.left - horizontalPadding * 2;
                continue;
            }
            let testLine = line + (line === '' ? '' : ' ') + currentWord;
            let testWidth = ctx.measureText(testLine).width;
            if ((!maxWidth || testWidth > maxWidth) && n > 0) {
                plan.lines.push({ x: x, y: y, text: line });
                line = currentWord;
                y += plan.lineHeight;
                space = images.getEmptySpace(y-textHeight, textHeight, collisionMaps);
                x = align === LEFT ? space.left + horizontalPadding : space.right - horizontalPadding;
                maxWidth = space.right - space.left - horizontalPadding * 2;
            } else {
                line = testLine;
            }
        }
        plan.height = y;
        plan.lines.push({ x: x, y: y, text: line });
        if(plan.height <= FRAME_HEIGHT/1.5) {
            return plan;
        }
    }
    return false;
}


module.exports = {
    commands: _commands,
    // dev: true,
    help: {
        comic: ['Generate a comic', '', 'that']
    }
};
