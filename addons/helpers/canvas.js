// Canvas utilities
var Canvas = require('canvas');

function resizeCanvas(canvas, maxWidth, maxHeight) {
    let factor = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    if(factor >= 1) return canvas;
    let newCanvas = new Canvas(Math.ceil(canvas.width * factor), Math.ceil(canvas.height * factor));
    let newCtx = newCanvas.getContext('2d');
    newCtx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
    return newCanvas;
}

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
    ctx.rotate(rotation * 90 / 180 * Math.PI);
    if(rotation === 2) ctx.translate(-newWidth / 2, -newHeight / 2); // Mind-fuck
    else ctx.translate(-newHeight / 2, -newWidth / 2);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    return newCanvas;
}

function UnitContext(ctx, res) { // Canvas context proxy that scales command parameters by resolution
    return new Proxy({
        arc: (x, y, radius, arc, ac) => ctx.arc(x * res, y * res, radius * res, arc, ac),
        lineWidth: (width) => ctx.lineWidth = width * res,
        fillRect: (x, y, width, height) => ctx.fillRect(x * res, y * res, width * res, height * res),
        clearRect: (x, y, width, height) => ctx.clearRect(x * res, y * res, width * res, height * res),
        moveTo: (x, y) => ctx.moveTo(x * res, y * res),
        lineTo: (x, y) => ctx.lineTo(x * res, y * res)
    }, {
        get: function(target, name) {
            if(name in target) return target[name];
            if(ctx[name] && ctx[name].bind) return ctx[name].bind(ctx);
            return ctx[name];
        },
        set: function(target, property, value) { ctx[property] = value; }
    });
}

module.exports = {
    resizeCanvas,
    cropCanvas,
    flipCanvas,
    rotateCanvas,
    UnitContext
};