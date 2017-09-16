// Definitions and utils and stuff for making images
var util = require(__base+'core/util.js');

const COLORS = {
    DEFAULT: { hex: '#CCCCCC' },
    RED: { hex: '#F44336' },
    PINK: { hex: '#E91E63' },
    PURPLE: { hex: '#9C27B0' },
    INDIGO: { hex: '#3F51B5' },
    BLUE: { hex: '#2196F3' },
    CYAN: { hex: '#00BCD4' },
    TEAL: { hex: '#009688' },
    GREEN: { hex: '#4CAF50' },
    LIME: { hex: '#CDDC39' },
    YELLOW: { hex: '#FFEB3B' },
    AMBER: { hex: '#FFC107' },
    ORANGE: { hex: '#FF9800' },
    BROWN: { hex: '#795548' },
    GRAY: { hex: '#9E9E9E' },
    GREY: { hex: '#9E9E9E' },
    WHITE: { hex: '#FFFFFF' },
    BLACK: { hex: '#000000' },
    RAINBOW: { custom: 'rainbow' }
};

const COLOR_MODS = {
    DARK: { hsv: [1, 1, 0.4] },
    DIM: { hsv: [1, 0.8, 0.6] },
    LIGHT: { hsv: [1, 0.7, 1.5] },
    BRIGHT: { hsv: [1, 100, 100] },
    PALE: { hsv: [1, 0.2, 1.2] },
    DULL: { hsv: [1, 0.2, 1.0] }
};

const SHAPES = {};
const SIZE_SHAPE = {};
const DRAW_SHAPE = {};

SHAPES.CIRCLE = 'circle';
SIZE_SHAPE.circle = size => ({ size, radius: size / 2, width: size, height: size });
DRAW_SHAPE.circle = (ctx, { radius }) => {
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, 2 * Math.PI, false);
    ctx.fill();
};

SHAPES.DOT = 'dot';
SIZE_SHAPE.dot = size => Object.assign({ shape: 'circle' },
    SIZE_SHAPE.circle(Math.ceil(size * util.random(0.01, 0.05))));

SHAPES.SQUARE = 'square';
SIZE_SHAPE.square = size => ({ size, width: size, height: size });
DRAW_SHAPE.square = (ctx, { size }) => {
    ctx.fillRect(0, 0, size, size);
};

SHAPES.RECTANGLE = 'rectangle';
SIZE_SHAPE.rectangle = size => {
    let width = size;
    let height = util.randomInt(Math.round(size/4), Math.round(size/1.3));
    return { size, width, height, oy: (size - height) / 2, rotate: true };
};
DRAW_SHAPE.rectangle = (ctx, { width, height }) => {
    ctx.fillRect(0, 0, width, height);
};

SHAPES.BOX = 'box';
SIZE_SHAPE.box = size => {
    if(util.flip()) return Object.assign({ shape: 'square' }, SIZE_SHAPE.square(size));
    else return Object.assign({ shape: 'rectangle' }, SIZE_SHAPE.rectangle(size));
};

SHAPES.TRIANGLE = 'triangle';
SIZE_SHAPE.triangle = size => {
    let triangleType = util.randomInt(3);
    let height;
    switch(triangleType) {
        case 0: // Equilateral
            height = Math.round(size * Math.sqrt(3) / 2);
            return { size, width: size, height, oy: (size - height) / 2, rotate: true };
        case 1: // Isosceles
        case 2: // Right
            let right = triangleType === 2;
            let width = size;
            height = util.randomInt(Math.round(size/3), Math.round(size/1.3));
            return { size, width, height, oy: (size - height) / 2, right, rotate: true, flip: true };
        case 3: // Scalene
            return { size, width: size, height: size, scalene: true, rotate: true, flip: true };
    }
};
DRAW_SHAPE.triangle = (ctx, { width, height, right, scalene }) => {
    let randomHeight = util.randomInt(height);
    let randomWidth = util.randomInt(Math.max(0, Math.round(height / 2 - randomHeight)), width);
    ctx.beginPath();
    ctx.moveTo(0, scalene ? randomHeight : height);
    ctx.lineTo(width, height);
    if(right) ctx.lineTo(0, 0);
    else if(scalene) ctx.lineTo(randomWidth, 0);
    else ctx.lineTo(width / 2, 0);
    ctx.closePath();
    ctx.fill();
};

SHAPES.STAR = 'star';
SIZE_SHAPE.star = size => ({ size, width: size, height: size });
DRAW_SHAPE.star = (ctx, { size }) => {
    ctx.beginPath();
    ctx.moveTo(size / 2, size * 0.03);
    ctx.lineTo(size * 0.62, size * 0.40);
    ctx.lineTo(size, size * 0.40);
    ctx.lineTo(size * 0.69, size * 0.62);
    ctx.lineTo(size * 0.80, size * 0.98);
    ctx.lineTo(size / 2, size * 0.75);
    ctx.lineTo(size * 0.20, size * 0.98);
    ctx.lineTo(size * 0.31, size * 0.62);
    ctx.lineTo(0, size * 0.40);
    ctx.lineTo(size * 0.38, size * 0.40);
    ctx.closePath();
    ctx.fill();
};

['pentagon', 'hexagon', 'heptagon', 'octagon', 'nonagon', 'decagon', 'hendecagon', 'dodecagon',
    'tridecagon', 'tetradecagon', 'pentadecagon', 'hexadecagon', 'heptadecagon', 'octadecagon',
    'enneadecagon', 'icosagon'].forEach((ngon, index) => {
    let sides = index + 5;
    SHAPES[ngon.toUpperCase()] = ngon;
    SIZE_SHAPE[ngon] = size => ({ size, radius: size / 2, width: size, height: size });
    DRAW_SHAPE[ngon] = (ctx, { radius }) => {
        ctx.save();
        ctx.beginPath();
        ctx.translate(radius, radius);
        ctx.moveTo(0, -radius);
        for (var i = 0; i < sides; i++) {
            ctx.rotate(2 * Math.PI / sides);
            ctx.lineTo(0, -radius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    };
});

module.exports = {
    COLORS,
    COLOR_MODS,
    SHAPES,
    DRAW_SHAPE,
    SIZE_SHAPE
};