// Definitions and utils and stuff for making images
var util = require(__base+'core/util.js');
var Canvas = require('canvas');

const hex = hex => ({ hex });
const COLORS = {
    DEFAULT: hex('#CCCCCC'),
    RED: hex('#F44336'),
    PINK: hex('#E91E63'),
    PURPLE: hex('#9C27B0'),
    INDIGO: hex('#3F51B5'),
    BLUE: hex('#2196F3'),
    CYAN: hex('#00BCD4'),
    TEAL: hex('#009688'),
    GREEN: hex('#4CAF50'),
    LIME: hex('#CDDC39'),
    YELLOW: hex('#FFEB3B'),
    AMBER: hex('#FFC107'),
    ORANGE: hex('#FF9800'),
    BROWN: hex('#795548'),
    GRAY: hex('#9E9E9E'),
    GREY: hex('#9E9E9E'),
    WHITE: hex('#FFFFFF'),
    BLACK: hex('#000000'),
    RAINBOW: { custom: 'rainbow' }
};

const SHAPES = {
    CIRCLE: 'circle',
    SQUARE: 'square',
    RECTANGLE: 'rectangle',
    TRIANGLE: 'triangle',
    STAR: 'star',
    BOX: 'box',
    DOT: 'dot'
};
const SIZE_SHAPE = {
    circle: size => ({ size, radius: size / 2, width: size, height: size }),
    square: size => ({ size, width: size, height: size }),
    rectangle: size => {
        let width = size;
        let height = util.randomInt(Math.round(size/4), Math.round(size/1.3));
        return { size, width, height, rotate: true };
    },
    triangle: size => {
        let triangleType = util.randomInt(3);
        switch(triangleType) {
            case 0: // Equilateral
                return { size, width: size, height: Math.round(size * Math.sqrt(3) / 2), rotate: true };
            case 1: // Isosceles
            case 2: // Right
                let width = size;
                let height = util.randomInt(Math.round(size/3), Math.round(size/1.3));
                if(util.flip()) {
                    width = height;
                    height = size;
                }
                return { size, width, height, right: triangleType === 2, rotate: true, flip: true };
            case 3: // Scalene
                return { size, width: size, height: size, scalene: true, rotate: true, flip: true };
        }
    },
    star: size => ({ size, width: size, height: size })
};
SIZE_SHAPE.box = size => {
    if(util.flip()) return Object.assign({ shape: 'square' }, SIZE_SHAPE.square(size));
    else return Object.assign({ shape: 'rectangle' }, SIZE_SHAPE.rectangle(size));
};
SIZE_SHAPE.dot = size => Object.assign({ shape: 'circle' }, SIZE_SHAPE.circle(util.randomInt(2, 6)));

const DRAW_SHAPE = {
    circle: (ctx, { radius }) => {
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, 2 * Math.PI, false);
        ctx.fill();
    },
    square: (ctx, { size }) => {
        ctx.fillRect(0, 0, size, size);
    },
    rectangle: (ctx, { width, height }) => {
        ctx.fillRect(0, 0, width, height);
    },
    triangle: (ctx, { width, height, right, scalene }) => {
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
    },
    star: (ctx, { size }) => {
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
    }
};

function cropCanvas(canvas, padding) {
    padding = padding || 0;
    let ctx = canvas.getContext('2d');
    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let top = canvas.height, bottom = 0, left = canvas.width, right = 0;
    for(let i = 3; i < imgData.data.length; i += 4) {
        if(imgData.data[i] === 0) continue;
        let x = (i - 3) / 4 % canvas.width;
        let y = Math.floor(i / 4 / canvas.width);
        top = Math.min(y, top);
        bottom = y; // Always going to be higher or equal to previous bottom
        left = Math.min(x, left);
        right = Math.max(x, right);
    }
    let boundingW = right - left + 1;
    let boundingH = bottom - top + 1;
    if(boundingW > 0 && boundingH > 0) {
        let newCanvas = new Canvas(boundingW + padding * 2, boundingH + padding * 2);
        let newCtx = newCanvas.getContext('2d');
        newCtx.drawImage(canvas, left, top, boundingW, boundingH, padding, padding, boundingW, boundingH);
        return newCanvas;
    } else return canvas;
}

function flipCanvas(canvas) { // Only need horizontal flip, because of rotation
    let newCanvas = new Canvas(canvas.width, canvas.height);
    let ctx = newCanvas.getContext('2d');
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    return newCanvas;
}

function rotateCanvas(canvas, rotation) {
    if(rotation === 0) return canvas;
    // 90 or 270 degree rotation requires swapped canvas width/height
    let newWidth = rotation === 2 ? canvas.width : canvas.height;
    let newHeight = rotation === 2 ? canvas.height : canvas.width;
    let newCanvas = new Canvas(newWidth, newHeight);
    let ctx = newCanvas.getContext('2d');
    ctx.save();
    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(rotation * 90 * Math.PI / 180);
    if(rotation === 2) ctx.translate(-newWidth / 2, -newHeight / 2); // Mind-fuck
    else ctx.translate(-newHeight / 2, -newWidth / 2);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    return newCanvas;
}

module.exports = {
    COLORS,
    SHAPES,
    DRAW_SHAPE,
    SIZE_SHAPE,
    cropCanvas,
    flipCanvas,
    rotateCanvas
};