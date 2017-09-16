// Bring some beauty to the dull grays of discord chat
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var Canvas = require('canvas');
var { wordsToNumbers } = require('words-to-numbers');
var requireUncached = require('require-uncached');
var { resizeCanvas, cropCanvas, flipCanvas, rotateCanvas } = requireUncached('./helpers/canvas.js');
const { COLORS, COLOR_MODS, SHAPES, DRAW_SHAPE, SIZE_SHAPE } = requireUncached('./helpers/imagery-library.js');
var { Color } = requireUncached('./helpers/color.js');

const RES = 200; // Pixels per unit
const SPACE = 0.1; // Unit space between elements
const ASPECT = 4 / 3; // Target aspect ratio
const DEG_RAD_RATIO = Math.PI / 180;
const DEG_TO_RAD = degrees => DEG_RAD_RATIO * degrees;

// TODO: Ideas
// Write text -- /draw a big red "hello"
// Quantity -- /draw 30 boxes
// Improvisation -- /draw something in a circle, or just /draw
// Color variation -- /draw dark red square, pale blue dot
// Color schemes -- randomly choose a color scheme when colors not specified
// Modifications -- /add a red square    /move the blue circle down

// Show this to the procjam server when it's impressive enough!

function drawShape(elem) {
    if(!elem.shape) return;
    elem.canvas = new Canvas(Math.ceil(elem.width), Math.ceil(elem.height));
    let ctx = elem.canvas.getContext('2d');
    ctx.fillStyle = elem.color.hex;
    DRAW_SHAPE[elem.shape](ctx, elem);
    if(elem.flipped) elem.canvas = flipCanvas(elem.canvas);
    if(elem.rotation) {
        elem.canvas = rotateCanvas(elem.canvas, elem.rotation);
        if(elem.rotation !== 2) {
            Object.assign(elem, { width: elem.height, height: elem.width });
            let newOY = elem.ox;
            elem.ox = elem.oy;
            elem.oy = newOY;
        }
    }
}

function sizeElements(elems) { // Set element sizes
    elems.forEach(elem => {
        elem.u = 1;
        Object.assign(elem, { ox: 0, oy: 0 }, SIZE_SHAPE[elem.shape](elem.u * RES))
    });
    elems.sort((a, b) => b.u - a.u);
}

function transformElement(elem) {
    elem.flipped = elem.flip && util.flip();
    elem.rotation = elem.rotate ? util.randomInt(0, 3) : 0;
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
    let collides = elem => {
        for(let j = 0; j < placed.length; j++) {
            if(elemsCollide(elem, placed[j])) return true;
        }
        return false;
    };
    elems.forEach(elem => {
        
        // let ctx = elem.canvas.getContext('2d');
        // ctx.fillStyle = '#000000';
        // ctx.font = '24px Arial';
        // ctx.textBaseline = 'middle';
        // ctx.textAlign = 'center';
        // ctx.fillText((placed.length + 1).toString(), elem.width / 2, elem.height / 2);
        
        let valid = [];
        for(let y = box.bTop - elem.u; y <= box.bBottom; y++) {
            for(let x = box.bLeft - elem.u; x <= box.bRight; x++) {
                let place = { x, y, u: elem.u };
                if(!collides(place)) valid.push(place);
            }
        }
        valid.sort((a, b) => {
            let aBox = getNewBoundingBox(a), bBox = getNewBoundingBox(b);
            let aRatio = Math.abs(1 - aBox.width / aBox.height / ASPECT),
                bRatio = Math.abs(1 - bBox.width / bBox.height / ASPECT);
            let aWider = aBox.width > box.width, aTaller = aBox.height > box.height,
                bWider = bBox.width > box.width, bTaller = bBox.height > box.height;
            let aInline = !aTaller || !aWider, bInline = !bTaller || !bWider;
            let aSameBox = !aWider && !aTaller, bSameBox = !bWider && !bTaller;
            let aNotNegative = a.x >= box.bLeft && a.y >= box.bTop,
                bNotNegative = b.x >= box.bLeft && b.y >= box.bTop;
            if(aInline && !bInline) return -1;
            else if(bInline && !aInline) return 1;
            else if(aSameBox && !bSameBox) return -1;
            else if(bSameBox && !aSameBox) return 1;
            else if(aRatio !== bRatio) return aRatio - bRatio;
            else if(aNotNegative && !bNotNegative) return -1;
            else if(bNotNegative && !aNotNegative) return 1;
            else if(a.y !== b.y) return a.y - b.y;
            else return a.x - b.x;
        });
        elem.x = valid[0].x;
        elem.y = valid[0].y;
        placed.push(elem);
        Object.assign(box, getNewBoundingBox(elem));
    });
    return box;
}

var _commands = {};
_commands.draw = function(data) {
    if(data.userID !== '86913608335773696') return;
    if(data.params.length === 0) return discord.sendMessage(data.channel, 'Describe something, e.g. `a red circle`');
    let words = data.paramStr.split(' ');
    let elements = [];
    let element = { colors: [], colorMods: [] };
    for(let i = 0; i < words.length; i++) {
        let word = words[i].toUpperCase();
        let number = wordsToNumbers(word.toLowerCase());
        let foundDelimiter = false;
        if(word.substr(-1) === ',') {
            word = word.substr(0, word.length - 1);
            foundDelimiter = true;
        }
        if(word === 'AND') foundDelimiter = true;
        else if(util.isNumeric(number) && number > 1) element.quantity = number;
        else if(COLOR_MODS[word]) element.colorMods.push(COLOR_MODS[word]);
        else if(COLORS[word]) element.colors.push(COLORS[word]);
        else if(SHAPES[word]) element.shape = SHAPES[word];
        else if(word.slice(-1) === 'S') {
            let singularS = word.substr(0, word.length - 1);
            let singularES = word.substr(0, word.length - 2);
            if(SHAPES[singularS]) {
                element.shape = SHAPES[singularS];
                element.plural = true;
            }
            if(word.slice(-2) === 'ES' && SHAPES[singularES]) {
                element.shape = SHAPES[singularES];
                element.plural = true;
            }
        }
        if(foundDelimiter && element.shape) {
            elements.push(element);
            element = { colors: [], colorMods: [] };
        }
        // TODO: When an unknown word is encountered, ask the user what they mean, thus creating a feature request
    }
    elements.push(element);
    elements = elements.filter(elem => elem.shape); // Elements need a shape
    if(elements.length === 0) return discord.sendMessage(data.channel, 'Describe something, e.g. `a red circle`');
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
    elements.forEach(transformElement); // Flip and rotate elements
    elements.forEach(elem => { // Color and draw elements
        elem.color = new Color(elem.colors[elem.child % elem.colors.length || 0] || COLORS.DEFAULT);
        elem.colorMods.forEach(mod => elem.color.modify(mod));
        elem.color.vary();
        //console.log(elem);
        drawShape(elem);
    });
    let box = arrangeElements(elements); // Arrange elements on canvas
    let canvas = new Canvas(box.width * RES * (1 + SPACE), box.height * RES * (1 + SPACE));
    let ctx = canvas.getContext('2d');
    elements.forEach(elem => ctx.drawImage( // Draw to canvas
        elem.canvas,
        (elem.x - box.bLeft + (elem.u - 1) * SPACE / 2) * RES * (1 + SPACE) + elem.ox,
        (elem.y - box.bTop + (elem.u - 1) * SPACE / 2) * RES * (1 + SPACE) + elem.oy
    ));
    canvas = cropCanvas(resizeCanvas(canvas, 1200, 800), 20);
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