var util = require(__base+'core/util.js');
var Canvas = require('canvas');

// TODO: allow for random slight variation, and modifiers like dark, light, pale, etc
const COLORS = {
    DEFAULT: '#CCCCCC',
    RED: '#F44336',
    PINK: '#E91E63',
    PURPLE: '#9C27B0',
    INDIGO: '#3F51B5',
    BLUE: '#2196F3',
    CYAN: '#00BCD4',
    TEAL: '#009688',
    GREEN: '#4CAF50',
    LIME: '#CDDC39',
    YELLOW: '#FFEB3B',
    AMBER: '#FFC107',
    ORANGE: '#FF9800',
    BROWN: '#795548',
    GRAY: '#9E9E9E',
    GREY: '#9E9E9E',
    WHITE: '#FFFFFF',
    BLACK: '#000000'
};

const SHAPES = {
    CIRCLE: 'circle',
    SQUARE: 'square',
    RECTANGLE: 'rectangle',
    TRIANGLE: 'triangle'
};

const SIZE_SHAPE = {
    circle: size => ({ size, radius: size / 2, width: size, height: size }),
    square: size => ({ size, width: size, height: size }),
    rectangle: size => {
        let width = size;
        let height = util.randomInt(size/4, size/1.3);
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
                let height = util.randomInt(size/3, size/1.3);
                if(util.flip()) {
                    width = height;
                    height = size;
                }
                return { size, width, height, right: triangleType === 2, rotate: true, flip: true };
            case 3: // Scalene
                return { size, width: size, height: size, scalene: true, rotate: true, flip: true };
        }
    }
};

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
        let randomWidth = util.randomInt(width); // TODO: Prevent thin sliver triangles
        ctx.beginPath();
        ctx.moveTo(0, scalene ? randomHeight : height);
        ctx.lineTo(width, height);
        if(right) ctx.lineTo(0, 0);
        else if(scalene) ctx.lineTo(randomWidth, 0);
        else ctx.lineTo(width / 2, 0);
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

function flipCanvas(canvas) {
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