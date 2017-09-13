// A super smart color object
var util = require(__base+'core/util.js');

function Color({ rgb, hsv, hex, custom }) {
    if(rgb) this.rgb = rgb;
    if(hsv) this.hsv = hsv;
    if(hex) this.hex = hex;
    switch(custom) {
        case 'rainbow':
            this.hsv = [util.randomInt(0, 359), 90, 95];
            break;
    }
}

Color.prototype = {
    set rgb(value) {
        value = value.map(c => Math.min(255, Math.max(0, Math.round(c))));
        this._rgb = value;
        this._hsv = rgbToHSV(this._rgb);
        this._hex = rgbToHex(this._rgb);
    },
    set hex(value) {
        value = value.substr(0, 1) === '#' ? value : '#' + value;
        this._rgb = hexToRGB(value);
        this._hsv = rgbToHSV(this._rgb);
        this._hex = value;
    },
    set hsv(value) {
        value[0] = Math.round(value[0]) % 360;
        value[1] = Math.min(100, Math.max(0, Math.round(value[1])));
        value[2] = Math.min(100, Math.max(0, Math.round(value[2])));
        this._rgb = hsvToRGB(value);
        this._hsv = value;
        this._hex = rgbToHex(this._rgb);
    },
    get rgb() {
        return this._rgb;
    },
    get hex() {
        return this._hex;
    },
    get hsv() {
        return this._hsv;
    }
};

Color.prototype.vary = function() { // Can't use fat arrow because it breaks "this"
    let [h, s, v] = this._hsv;
    if(s > 0) {
        h = (h + util.randomInt(-10, 10));
        if(h < 0) h += 360;
        s += util.randomInt(-10, 10);
    }
    v += util.randomInt(-10, 10);
    this.hsv = [h, s, v];
};

Color.prototype.modify = function({ rgb, hsv }) {
    if(hsv) this.hsv = [this.hsv[0] * hsv[0], this.hsv[1] * hsv[1], this.hsv[2] * hsv[2]];
    else if(rgb) this.rgb = [this.rgb[0] * rgb[0], this.rgb[1] * rgb[1], this.rgb[2] * rgb[2]];
};

// Conversions

// https://stackoverflow.com/a/5624139/2612679
function rgbToHex([r, g, b]) {return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }
function hexToRGB(hex) { 
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}
function hsvToRGB([h, s, v]) {
    h /= 360; s /= 100; v /= 100;
    let r, g, b, i = Math.floor(h * 6);
    let f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break; case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break; case 5: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
// https://gist.github.com/mjackson/5311256
function rgbToHSV([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;
    var d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}

module.exports = {
    Color,
    rgbToHex,
    hexToRGB,
    hsvToRGB,
    rgbToHSV
};