// Bring some beauty to the dull grays of discord chat
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var Canvas = require('canvas');
var { wordsToNumbers } = require('words-to-numbers');
var requireUncached = require('require-uncached');
const { resizeCanvas, cropCanvas, flipCanvas, rotateCanvas, UnitContext } = requireUncached('./helpers/canvas.js');
const { COLORS, COLOR_MODS, SHAPES, DRAW_SHAPE, SIZE_SHAPE } = requireUncached('./helpers/imagery/main.js');
var { Color } = requireUncached('./helpers/color.js');

const MAX_WIDTH = 1200; // Max resolution of final image
const MAX_HEIGHT = 900;
const BASE_RES = 200; // Maximum pixels per unit, before scaling down
const SPACE = 0.1; // Unit space between elements
const ASPECT = 4 / 2; // Target aspect ratio (Discord's image embedding is 4:3, but 4:2 is better aesthetically)

// TODO: Ideas
// Write text -- /draw a big red "hello"
// Quantity -- /draw 30 boxes
// Improvisation -- /draw something in a circle, or just /draw
// Color variation -- /draw dark red square, pale blue dot
// Color schemes -- randomly choose a color scheme when colors not specified
// Modifications -- /add a red square    /move the blue circle down

// Show this to the procjam server when it's impressive enough!

function drawShape(elem, res) {
    if(!elem.shape) return;
    elem.canvas = new Canvas(Math.ceil(elem.width * res), Math.ceil(elem.height * res));
    let ctx = new UnitContext(elem.canvas.getContext('2d'), res);
    ctx.fillStyle = elem.color.hex;
    DRAW_SHAPE[elem.shape](ctx, elem);
    if(elem.flipped) elem.canvas = flipCanvas(elem.canvas);
    if(elem.rotation) {
        elem.canvas = rotateCanvas(elem.canvas, elem.rotation);
        if(elem.rotation !== 2) {
            Object.assign(elem, { width: elem.height, height: elem.width, ox: elem.oy, oy: elem.ox });
        }
    }
}

function sizeElements(elems) { // Set element sizes
    elems.forEach(elem => elem.u = 1);
    elems.sort((a, b) => b.u !== a.u ? b.u - a.u : a.num - b.num);
}

function transformElements(elems) {
    elems.forEach(elem => {
        Object.assign(elem, { ox: 0, oy: 0 }, SIZE_SHAPE[elem.shape](elem.u));
        elem.flipped = elem.flip && util.flip();
        elem.rotation = elem.rotate ? util.randomInt(3) : 0;
    });
}

function elemsCollide(e1, e2) {
    return e2.x < e1.x + e1.u && e2.x + e2.u > e1.x && e2.y < e1.y + e1.u && e2.y + e2.u > e1.y;
}
function elemsTouch(e1, e2) {
    return ((e2.x === e1.x + e1.u || e2.x + e2.u === e1.x) && (e2.y < e1.y + e1.u && e2.y + e2.u > e1.y))
        || ((e2.y === e1.y + e1.u || e2.y + e2.u === e1.y) && (e2.x < e1.x + e1.u && e2.x + e2.u > e1.x));
}

function arrangeElements(elems) {
    let box = { bTop: 0, bBottom: 0, bLeft: 0, bRight: 0, width: 0, height: 0 };
    let getNewBoundingBox = elem => {
        let newBox = {
            bTop: Math.min(box.bTop, elem.y),
            bBottom: Math.max(box.bBottom, elem.y + elem.u),
            bLeft: Math.min(box.bLeft, elem.x),
            bRight: Math.max(box.bRight, elem.x + elem.u)
        };
        return Object.assign(newBox, { width: newBox.bRight - newBox.bLeft, height: newBox.bBottom - newBox.bTop });
    };
    let placed = [];
    let placeMap = {};
    let collides = elem => { // TODO: Find a way to optimize this
        for(let i = 0; i < placed.length; i++) {
            if(elemsCollide(elem, placed[i])) return true;
        }
        return false;
    };
    let getScore = elem => {
        let newBox = getNewBoundingBox(elem);
        let wider = newBox.width > box.width, taller = newBox.height > box.height;
        let bits = 12;
        let score = (1 << bits++) - Math.min(Math.abs(elem.x), Math.abs(elem.y));
        if(Math.abs(1 - newBox.width / newBox.height / ASPECT) 
            <= Math.abs(1 - box.width / box.height / ASPECT)) score += 1 << bits++;
        if(!taller || !wider) score += 1 << bits++;
        if(!wider && !taller) score += 1 << bits;
        return score;
    };
    util.timer.reset();
    elems.forEach(elem => {
        let bestPlace;
        let bestScore = 0;
        // util.timer.start('finding valid positions');
        for(let y = box.bTop; y <= box.bBottom; y++) {
            for(let x = box.bLeft; x <= box.bRight; x++) {
                if(placeMap[x + ':' + y]) continue;
                let place = { x, y, u: elem.u };
                if(collides(place)) continue;
                let score = getScore(place);
                if(score > bestScore) {
                    bestScore = score;
                    bestPlace = place;
                }
            }
        }
        // util.timer.stop('finding valid positions');
        elem.x = bestPlace.x;
        elem.y = bestPlace.y;
        placed.push(elem);
        for(let x = 0; x < elem.u; x++) {
            for(let y = 0; y < elem.u; y++) {
                placeMap[(elem.x + x) + ':' + (elem.y + y)] = true;
            }
        }
        Object.assign(box, getNewBoundingBox(elem));
    });
    // util.timer.results();
    return box;
}

var _commands = {};
_commands.draw = function(data) {
    if(data.channel !== '209177876975583232') return;
    if(data.params.length === 0) return discord.sendMessage(data.channel, 'Describe something, e.g. `a red circle`');
    let words = data.paramStr.split(' ');
    words = words.map((word, index) => {
        let wordObj = { text: word.toUpperCase(), index, toString() { return this.text; } };
        let number = wordsToNumbers(word.toLowerCase());
        if(!isNaN(number)) wordObj.number = number;
        return wordObj;
    });
    let elements = [];
    let element = { num: 1, colors: [], colorMods: [] };
    
    function parse(phrase) {
        let parsed = false;
        let parsedElement = Object.assign({}, element);
        let phraseText = phrase.join(' ');
        let toNumber = wordsToNumbers(phraseText.toLowerCase());
        if(phrase[0].number && phrase[phrase.length -1].number && !isNaN(toNumber)) {
            parsedElement.quantity = toNumber;
            return parsedElement;
        }
        let foundDelimiter = false;
        if(phraseText.substr(-1) === ',') {
            phraseText = phraseText.substr(0, phraseText.length - 1);
            foundDelimiter = true;
        }
        if(phraseText === 'AND') {
            foundDelimiter = true;
            parsed = true;
        } else if(COLOR_MODS[phraseText]) {
            parsedElement.colorMods.push(COLOR_MODS[phraseText]);
            parsed = true;
        } else if(COLORS[phraseText]) {
            parsedElement.colors.push(COLORS[phraseText]);
            parsed = true;
        } else if(SHAPES[phraseText]) {
            parsedElement.shape = SHAPES[phraseText];
            parsed = true;
        } else if(phraseText.slice(-1) === 'S') {
            let singularS = phraseText.substr(0, phraseText.length - 1);
            let singularES = phraseText.substr(0, phraseText.length - 2);
            if(SHAPES[singularS]) {
                parsedElement.shape = SHAPES[singularS];
                parsedElement.plural = true;
                parsed = true;
            }
            if(phraseText.slice(-2) === 'ES' && SHAPES[singularES]) {
                parsedElement.shape = SHAPES[singularES];
                parsedElement.plural = true;
                parsed = true;
            }
        }
        if(foundDelimiter && parsedElement.shape) {
            parsedElement.complete = true;
            parsed = true;
        }
        // TODO: When an unknown word is encountered, ask the user what they mean, thus creating a feature request
        if(parsed) return parsedElement;
    }
    for(let i = 0; i < words.length; i++) {
        let lookAhead = i;
        let phrase = [];
        let extraWords = 0;
        let parsedElement;
        while(lookAhead < words.length) {
            phrase.push(Object.assign({}, words[lookAhead]));
            let parsed = parse(phrase);
            if(parsed) {
                parsedElement = parsed;
                extraWords = lookAhead - i;
            }
            lookAhead++;
        }
        // if(parsedElement) console.log('parsed:',phrase.slice(0, 1+extraWords).join(' '));
        element = parsedElement || element;
        if(element.complete) {
            elements.push(element);
            element = { num: element.num + 1, colors: [], colorMods: [] };
        }
        i += extraWords;
    }
    elements.push(element);
    elements = elements.filter(elem => elem.shape); // Elements need a shape
    if(elements.length === 0) return discord.sendMessage(data.channel, 'Describe something, e.g. `a red circle`');
    // elements.forEach(elem => console.log(JSON.stringify(elem, null, '\t')));
    elements.forEach(elem => { // Pluralize
        if(elem.plural) {
            delete elem.plural;
            let qty = Math.min(2000, elem.quantity) || util.randomInt(2, 4);
            delete elem.quantity;
            for(let i = 0; i < qty - 1; i++) {
                elements.push(Object.assign({ child: i }, elem));
            }
        }
    });
    sizeElements(elements); // Give elements sizes
    transformElements(elements); // Flip and rotate elements
    let box = arrangeElements(elements); // Arrange elements on canvas
    let res = Math.min(MAX_WIDTH / (box.width * (1 + SPACE)), MAX_HEIGHT / (box.height * (1 + SPACE)), BASE_RES);
    elements.forEach(elem => { // Color and draw elements
        elem.color = new Color(elem.colors[elem.child % elem.colors.length || 0] || COLORS.DEFAULT);
        elem.colorMods.forEach(mod => elem.color.modify(mod));
        elem.color.vary();
        // console.log(JSON.stringify(elem, null, '\t'));
        drawShape(elem, res);
    });
    let canvas = new Canvas(box.width * res * (1 + SPACE), box.height * res * (1 + SPACE));
    let ctx = canvas.getContext('2d');
    elements.forEach(elem => ctx.drawImage( // Draw to canvas
        elem.canvas,
        (elem.x - box.bLeft + (elem.u - 1) * SPACE / 2) * res * (1 + SPACE) + elem.ox * res,
        (elem.y - box.bTop + (elem.u - 1) * SPACE / 2) * res * (1 + SPACE) + elem.oy * res
    ));
    //canvas = cropCanvas(resizeCanvas(canvas, 1200, 900), 20);
    discord.bot.uploadFile({
        to: data.channel, filename: data.paramStr.split(' ').join('-') + '.png', file: canvas.toBuffer()
    });
};

module.exports = {
    commands: _commands,
    help: {
        draw: ['Draw a picture based on your description', 'big red circle and a blue square']
    }
};

function arrangeElementsRadial(elems) {
    let PRECISION = 10; // Number of pixels to move each increment
    let box = { bTop: 0, bBottom: 0, bLeft: 0, bRight: 0, width: 0, height: 0 };
    let getNewBoundingBox = elem => {
        let newBox = {
            bTop: Math.min(box.bTop, elem.y),
            bBottom: Math.max(box.bBottom, elem.y + elem.height),
            bLeft: Math.min(box.bLeft, elem.x),
            bRight: Math.max(box.bRight, elem.x + elem.width)
        };
        return Object.assign(newBox, { width: newBox.bRight - newBox.bLeft, height: newBox.bBottom - newBox.bTop });
    };
    let placed = [];

    let dot = new Canvas(2,2);
    let dotCtx = dot.getContext('2d');
    dotCtx.fillStyle = '#00FF00';
    dotCtx.fillRect(0,0,2,2);
    let dots;

    for(let i = 0; i < elems.length; i++) {
        let elem = elems[i];
        dots = [];
        let ctx = elem.canvas.getContext('2d');
        ctx.fillStyle = '#FF0000';
        ctx.font = '24px Arial';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText((i + 1).toString(), elem.width / 2, elem.height / 2);

        elem.x = -elem.width / 2;
        elem.y = -elem.height / 2;
        let collides = () => {
            for(let j = 0; j < placed.length; j++) if(elemsCollide(elem, placed[j])) return true;
            return false;
        };
        let valid = !collides();
        let distance = 0; // Distance from origin
        while(!valid) {
            distance += PRECISION;
            let radIncrement = Math.min(0.5, PRECISION / distance); // Yes, it is this simple
            let rad = 0;
            let randomOffset = util.random(radIncrement);
            let spots = [];
            while(rad < 2 * Math.PI) {
                let spot = {
                    cx: Math.sin(rad + randomOffset) * distance,
                    cy: -Math.cos(rad + randomOffset) * distance
                };
                spot.x = spot.cx - elem.width / 2;
                spot.y = spot.cy - elem.height / 2;
                dots.push({ x: spot.cx, y: spot.cy, canvas: dot });
                spots.push(spot);
                rad += radIncrement;
            }
            spots.sort((a, b) => {
                return (Math.abs(a.cy) - Math.abs(b.cy));
                let newBoxA = getNewBoundingBox(a), newBoxB = getNewBoundingBox(b);
                if(Math.abs(a.x) < PRECISION / 2 && newBoxA.width / newBoxA.height >= ASPECT) return -1;
                if(Math.abs(a.y) < PRECISION / 2 && newBoxA.width / newBoxA.height <= ASPECT) return -1;
                if(Math.abs(b.x) < PRECISION / 2 && newBoxB.width / newBoxB.height >= ASPECT) return 1;
                if(Math.abs(b.y) < PRECISION / 2 && newBoxB.width / newBoxB.height <= ASPECT) return 1;
                return (newBoxA.width - box.width + (newBoxA.height - box.height) * ASPECT) -
                    (newBoxB.width - box.width + (newBoxB.height - box.height) * ASPECT);
            });
            for(let s = 0; s < spots.length; s++) {
                elem.x = spots[s].x;
                elem.y = spots[s].y;
                if(!collides(elem)) {
                    valid = true;
                    break;
                }
            }
        }
        placed.push(elem);
        //console.log(i+1,'  x:',Math.round(elem.x),'y:',Math.round(elem.y),'w:',elem.width,'h:',elem.height);
        Object.assign(box, getNewBoundingBox(elem));
    }
    elems.push(...dots);
    return box;
}