// Bring some beauty to the dull grays of discord chat
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var Canvas = require('canvas');
var { wordsToNumbers } = require('words-to-numbers');
var requireUncached = require('require-uncached');
var { cropCanvas, flipCanvas, rotateCanvas } = requireUncached('./helpers/canvas.js');
const { COLORS, COLOR_MODS, SHAPES, DRAW_SHAPE, SIZE_SHAPE } = requireUncached('./helpers/imagery-library.js');
var { Color } = requireUncached('./helpers/color.js');

const W = 800;
const H = 600;

// TODO: Ideas
// Write text -- /draw a big red "hello"
// Quantity -- /draw 30 boxes
// Improvisation -- /draw something in a circle, or just /draw
// Color variation -- /draw dark red square, pale blue dot
// Color schemes -- randomly choose a color scheme when colors not specified

// Show this to the procjam server when it's impressive enough!

function drawShape(elem) {
    if(!elem.shape) return;
    elem.canvas = new Canvas(Math.ceil(elem.width), Math.ceil(elem.height));
    let ctx = elem.canvas.getContext('2d');
    ctx.fillStyle = elem.color.hex;
    DRAW_SHAPE[elem.shape](ctx, elem);
    if(elem.flipped) elem.canvas = flipCanvas(elem.canvas);
    if(elem.rotation) elem.canvas = rotateCanvas(elem.canvas, elem.rotation);
}

function sizeElements(elems) { // Set element sizes
    elems.forEach(elem => Object.assign(elem, SIZE_SHAPE[elem.shape](util.randomInt(100, 300))));
}

function transformElement(elem) {
    elem.flipped = elem.flip && util.flip();
    elem.rotation = elem.rotate ? util.randomInt(0, 3) : 0;
}

function arrangeElements(elems) {
    //elems.sort((a, b) => b.size - a.size); // Arrange largest to smallest
    // TODO: Custom collision detection per shape type
    // Or just do per-pixel collision...?
    for(let i = 0; i < elems.length; i++) {
        let elem = elems[i];
        do {
            elem.size = Math.round(elem.size * 0.95); // Maybe make shapes a prototype with getters and setters
            elem.width = Math.round(elem.width * 0.95);
            elem.height = Math.round(elem.height * 0.95);
            if(elem.radius) elem.radius = elem.size / 2;
            let elemWidth = elem.rotation % 2 ? elem.height : elem.width;
            let elemHeight = elem.rotation % 2 ? elem.width : elem.height;
            elem.x = util.randomInt(W - elemWidth);
            elem.y = util.randomInt(H - elemHeight);
            var collides = false;
            for(let j = i -1; j >= 0; j--) {
                let elem2 = elems[j];
                let elem2Width = elem2.rotation % 2 ? elem2.height : elem2.width;
                let elem2Height = elem2.rotation % 2 ? elem2.width : elem2.height;
                if(elem2.x < elem.x + elemWidth && elem2.x + elem2Width > elem.x
                    && elem2.y < elem.y + elemHeight && elem2.y + elem2Height > elem.y) {
                    collides = true;
                    break;
                }
            }
        } while(collides && elem.size > 4)
    }
}

var _commands = {};
_commands.draw = function(data) {
    if(data.userID !== '86913608335773696') return;
    if(data.params.length === 0) return discord.sendMessage(data.channel, 'Describe something, e.g. `a red circle`');
    let canvas = new Canvas(W, H);
    let ctx = canvas.getContext('2d');
    let words = wordsToNumbers(' ' + data.paramStr).slice(1).split(' ');
    let elements = [];
    let element = { colors: [], colorMods: [] };
    for(let i = 0; i < words.length; i++) {
        let word = words[i].toUpperCase();
        let foundDelimiter = false;
        if(word.substr(-1) === ',') {
            word = word.substr(0, word.length - 1);
            foundDelimiter = true;
        }
        if(word === 'AND') foundDelimiter = true;
        else if(util.isNumeric(word)) element.quantity = word;
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
            element = {};
        }
        // TODO: When an unknown word is encountered, ask the user what they mean, thus creating a feature request
    }
    elements.push(element);
    elements = elements.filter(elem => elem.shape); // Elements need a shape
    if(elements.length === 0) return discord.sendMessage(data.channel, 'Describe something, e.g. `a red circle`');
    elements.forEach(elem => { // Pluralize
        if(elem.plural) {
            delete elem.plural;
            let qty = elem.quantity || util.randomInt(2, 4);
            delete elem.quantity;
            for(let i = 0; i < qty - 1; i++) {
                elements.push(Object.assign({ child: i }, elem));
            }
        }
    });
    sizeElements(elements); // Give elements sizes
    elements.forEach(transformElement);
    arrangeElements(elements); // Arrange elements on canvas
    elements.forEach(elem => { // Color and draw elements
        elem.color = new Color(elem.colors[elem.child % elem.colors.length || 0] || COLORS.DEFAULT);
        elem.colorMods.forEach(mod => elem.color.modify(mod));
        elem.color.vary();
        // console.log(elem);
        drawShape(elem);
        ctx.drawImage(elem.canvas, elem.x, elem.y);
    });
    canvas = cropCanvas(canvas, 20);
    discord.bot.uploadFile({ to: data.channel, filename: 'picture.png', file: canvas.toBuffer() });
};

module.exports = {
    commands: _commands,
    help: {
        draw: ['Draw a picture based on your description', 'big red circle and a blue square']
    }
};