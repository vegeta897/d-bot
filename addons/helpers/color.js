// A super smart color object
var util = require(__base+'core/util.js');

function Color({ rgb, hsv, hex }) {
    if(rgb) this.rgb = rgb;
    if(hsv) this.hsv = hsv;
    if(hex) this.hex = hex;
}

Color.prototype = {
    set rgb(value) {
        console.log('setting rgb to', value);
        this._rgb = value;
        this._hsv = this.rgbToHSV(this._rgb);
        this._hex = this.rgbToHex(this._rgb);
    },
    set hex(value) {
        value = value.substr(0, 1) === '#' ? value : '#' + value;
        this._rgb = this.hexToRGB(value);
        this._hsv = this.rgbToHSV(this._rgb);
        this._hex = value;
    },
    set hsv(value) {
        this._rgb = this.hsvToRGB(value);
        this._hsv = value;
        this._hex = this.rgbToHex(this._rgb);
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
        h = (h + util.randomInt(-10, 10)) % 360;
        if(h < 0) h += 360;
        s = Math.max(0, Math.min(100, s + util.randomInt(-10, 10)));
    }
    v = Math.max(0, Math.min(100, v + util.randomInt(-10, 10)));
    this.hsv = [h, s, v];
};

// Conversions

// https://stackoverflow.com/a/5624139/2612679
Color.prototype.rgbToHex = ([r, g, b]) => '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
Color.prototype.hexToRGB = hex => { 
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
};
Color.prototype.hsvToRGB = ([h, s, v]) => {
    h /= 360; s /= 100; v /= 100;
    let r, g, b, i = Math.floor(h * 6);
    let f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break; case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break; case 5: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};
// https://gist.github.com/mjackson/5311256
Color.prototype.rgbToHSV = ([r, g, b]) => {
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
};

module.exports = Color;