// Copy me to make a new addon
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var Canvas = require('canvas');
var requireUncached = require('require-uncached');
const { COLORS, SHAPES, DRAW_SHAPE, SIZE_SHAPE, cropCanvas } = requireUncached('./helpers/imagery-library.js');
var Color = requireUncached('./helpers/color.js');

const W = 800;
const H = 600;

// TODO: Ideas
// Write text -- /draw a big red "hello"
// Quantity -- /draw 30 boxes
// Improvisation -- /draw something in a circle, or just /draw

function drawShape(elem) {
    if(!elem.shape) return;
    elem.canvas = new Canvas(Math.ceil(elem.width), Math.ceil(elem.height));
    let ctx = elem.canvas.getContext('2d');
    ctx.fillStyle = elem.color.hex;
    DRAW_SHAPE[elem.shape](ctx, elem);
}

function sizeElements(elems) { // Set element sizes
    elems.forEach(elem => Object.assign(elem, SIZE_SHAPE[elem.shape](util.randomIntRange(100, 300))));
}

function arrangeElements(elems) {
    elems.sort((a, b) => b.size - a.size); // Arrange largest to smallest
    for(let i = 0; i < elems.length; i++) {
        let elem = elems[i];
        elem.size += 2;
        do {
            elem.size = Math.floor(elem.size * 0.95);
            Object.assign(elem, SIZE_SHAPE[elem.shape](elem.size));
            elem.x = util.randomIntRange(0, W - elem.width);
            elem.y = util.randomIntRange(0, H - elem.height);
            var collides = false;
            for(let j = i -1; j >= 0; j--) {
                let elem2 = elems[j];
                if(elem2.x < elem.x + elem.width && elem2.x + elem2.width > elem.x
                    && elem2.y < elem.y + elem.height && elem2.y + elem2.height > elem.y) {
                    collides = true;
                    break;
                }
            }
        } while(collides)
    }
}

var _commands = {};
_commands.draw = function(data) {
    if(data.params.length === 0) return discord.sendMessage(data.channel, 'Describe something, e.g. `a red circle`');
    let canvas = new Canvas(W, H);
    let ctx = canvas.getContext('2d');
    let elements = [];
    let element = {};
    for(let i = 0; i < data.params.length; i++) {
        let word = data.params[i].toUpperCase();
        let foundDelimiter = false;
        if(word.substr(-1) === ',') {
            word = word.substr(0, word.length - 1);
            foundDelimiter = true;
        }
        if(word === 'AND') foundDelimiter = true;
        else {
            if(COLORS[word]) element.color = new Color({ hex: COLORS[word] });
            if(SHAPES[word]) element.shape = SHAPES[word];
        }
        if(foundDelimiter && element.shape) {
            elements.push(element);
            element = {};
        }
        // TODO: When an unknown word is encountered, ask the user what they mean, thus creating a feature request
    }
    elements.push(element);
    elements = elements.filter(elem => elem.shape);
    sizeElements(elements);
    arrangeElements(elements);
    elements.forEach(elem => {
        elem.color = elem.color || new Color({ hex: COLORS.DEFAULT });
        elem.color.vary();
        //console.log(elem);
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