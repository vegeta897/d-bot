// Canvas utilities
var Canvas = require('canvas');

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
    cropCanvas,
    flipCanvas,
    rotateCanvas
};