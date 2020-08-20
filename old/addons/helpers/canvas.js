// Canvas utilities
const { createCanvas, Canvas } = require('canvas');

function resizeCanvas(canvas, maxWidth, maxHeight) {
    let factor = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    if(factor >= 1) return canvas;
    let newCanvas = createCanvas(Math.ceil(canvas.width * factor), Math.ceil(canvas.height * factor));
    let newCtx = newCanvas.getContext('2d');
    newCtx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
    return newCanvas;
}

function cropCanvas(canvas, padding = 0) {
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
        let newCanvas = createCanvas(boundingW + padding * 2, boundingH + padding * 2);
        let newCtx = newCanvas.getContext('2d');
        newCtx.drawImage(canvas, left, top, boundingW, boundingH, padding, padding, boundingW, boundingH);
        return newCanvas;
    } else return canvas;
}

function flipCanvas(canvas) { // Only need horizontal flip, because of rotation
    let newCanvas = createCanvas(canvas.width, canvas.height);
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
    let newCanvas = createCanvas(newWidth, newHeight);
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

function UnitContext(ctx, resX, resY) { // Canvas context proxy that scales command parameters by resolution
    resY = resY || resX;
    return new Proxy({
        arc: (x, y, radius, arc, ac) => ctx.arc(x * resX, y * resY, radius * resX, arc, ac),
        lineWidth: width => ctx.lineWidth = width * resX,
        fillRect: (x, y, width, height) => ctx.fillRect(x * resX, y * resY, width * resX, height * resY),
        clearRect: (x, y, width, height) => ctx.clearRect(x * resX, y * resY, width * resX, height * resY),
        moveTo: (x, y) => ctx.moveTo(x * resX, y * resY),
        lineTo: (x, y) => ctx.lineTo(x * resX, y * resY)
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
    UnitContext,
    Thumbnail
};

// Cleaner image down-scaling (adapted from https://stackoverflow.com/a/3223466/2612679)
function Thumbnail(img, sx, lobes) {
    this.canvas = createCanvas(img.width, img.height);
    this.ctx = this.canvas.getContext('2d');
    this.ctx.drawImage(img, 0, 0);
    this.img = img;
    this.src = this.ctx.getImageData(0, 0, img.width, img.height);
    this.dest = {
        width: sx,
        height: Math.round(img.height * sx / img.width),
        data: []
    };
    this.lanczos = lanczosCreate(lobes);
    this.ratio = img.width / sx;
    this.rcp_ratio = 2 / this.ratio;
    this.range2 = Math.ceil(this.ratio * lobes / 2);
    this.cacheLanc = {};
    this.center = {};
    this.icenter = {};
    this.resample();
    return this.canvas;
}

Thumbnail.prototype.resample = function(u = 0) {
    this.center.x = (u + 0.5) * this.ratio;
    this.icenter.x = Math.floor(this.center.x);
    for(let v = 0; v < this.dest.height; v++) {
        this.center.y = (v + 0.5) * this.ratio;
        this.icenter.y = Math.floor(this.center.y);
        let a, r, g, b;
        a = r = g = b = 0;
        for(let i = this.icenter.x - this.range2; i <= this.icenter.x + this.range2; i++) {
            if(i < 0 || i >= this.src.width) continue;
            let f_x = Math.floor(1000 * Math.abs(i - this.center.x));
            if (!this.cacheLanc[f_x])
                this.cacheLanc[f_x] = {};
            for(let j = this.icenter.y - this.range2; j <= this.icenter.y + this.range2; j++) {
                if(j < 0 || j >= this.src.height)
                    continue;
                let f_y = Math.floor(1000 * Math.abs(j - this.center.y));
                if(this.cacheLanc[f_x][f_y] === undefined)
                    this.cacheLanc[f_x][f_y] = this.lanczos(Math.sqrt(Math.pow(f_x * this.rcp_ratio, 2)
                        + Math.pow(f_y * this.rcp_ratio, 2)) / 1000);
                let weight = this.cacheLanc[f_x][f_y];
                if(weight > 0) {
                    let idx = (j * this.src.width + i) * 4;
                    a += weight;
                    r += weight * this.src.data[idx];
                    g += weight * this.src.data[idx + 1];
                    b += weight * this.src.data[idx + 2];
                }
            }
        }
        let idx = (v * this.dest.width + u) * 3;
        this.dest.data[idx] = r / a;
        this.dest.data[idx + 1] = g / a;
        this.dest.data[idx + 2] = b / a;
    }

    if(++u < this.dest.width) this.resample(u);
    else {
        this.canvas.width = this.dest.width;
        this.canvas.height = this.dest.height;
        this.ctx.drawImage(this.img, 0, 0, this.dest.width, this.dest.height);
        this.src = this.ctx.getImageData(0, 0, this.dest.width, this.dest.height);
        let idx, idx2;
        for(let i = 0; i < this.dest.width; i++) {
            for(let j = 0; j < this.dest.height; j++) {
                idx = (j * this.dest.width + i) * 3;
                idx2 = (j * this.dest.width + i) * 4;
                this.src.data[idx2] = this.dest.data[idx];
                this.src.data[idx2 + 1] = this.dest.data[idx + 1];
                this.src.data[idx2 + 2] = this.dest.data[idx + 2];
            }
        }
        this.ctx.putImageData(this.src, 0, 0);
    }
};

function lanczosCreate(lobes) {
    return function(x) {
        if(x > lobes) return 0;
        x *= Math.PI;
        if(Math.abs(x) < 1e-16) return 1;
        let xx = x / lobes;
        return Math.sin(x) * Math.sin(xx) / x / xx;
    };
}
