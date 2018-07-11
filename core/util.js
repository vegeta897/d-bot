// Helper functions!
var NodeEmoji = require('node-emoji');

const alphabet = [ ...'abcdefghijklmnopqrstuvwxyz'];
const emojiAlphabet = [ ...'🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽🇾🇿'];

var util = {
    contains: function(a, b) { // Check if string A contains string B, case insensitive
        return a.toLowerCase().indexOf(b.toLowerCase()) > -1;
    },
    random(min, max) {
        if(isNaN(max)) {
            max = min < 0 ? 0 : min;
            min = min < 0 ? min : 0;
        }
        return Math.random() * (+max - +min) + +min;
    },
    randomInt(min, max) {
        if(isNaN(max)) {
            max = min < 0 ? 0 : min;
            min = min < 0 ? min : 0;
        }
        return Math.floor(Math.random() * (+max - +min + 1)) + +min
    },
    isNumeric: n => !(''+n).includes(' ') && !isNaN(parseFloat(n)) && isFinite(n),
    capitalize: s => s[0].toUpperCase() + s.substring(1),
    toProperCase: function(s) {
        var newstr = s.split(' ');
        for(var i = 0; i < newstr.length; i++){
            if(newstr[i] === '') continue;
            var copy = newstr[i].substring(1).toLowerCase();
            newstr[i] = newstr[i][0].toUpperCase() + copy;
        }
        newstr = newstr.join(' ');
        return newstr;
    },
    getTimeUnits: function(ms) {
        var seconds = Math.round(ms/1000);
        var timeUnit;
        if(seconds < 60) { timeUnit = [seconds,'second']; }
        else if(seconds < 3600) { timeUnit = [Math.floor(seconds/60),'minute']; }
        else if(seconds < 86400) { timeUnit = [Math.floor(seconds/3600),'hour']; }
        else { timeUnit = [Math.floor(seconds/86400),'day']; }
        if(timeUnit[0] !== 1) timeUnit[1] += 's'; // Pluralize
        return timeUnit;
    },
    pickInArray: function(arr/*, splice */) {
        var randomIndex = this.randomInt(arr.length - 1);
        if(arguments[1]) return arr.splice(randomIndex, 1)[0];
        else return arr[randomIndex];
    },
    pickInObject: function(obj) { // Return random property name from object
        return this.pickInArray(Object.keys(obj));
    },
    propertiesToArray: function(obj) {
        var arr = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                arr.push(obj[key]);
            }
        }
        return arr.sort();
    },
    arrayAverage: function(arr) {
        var sum = 0;
        for(var i = 0; i < arr.length; i++) {
            sum += +arr[i];
        }
        return sum/arr.length;
    },
    arrayHighest: function(arr) {
        var highest = false;
        for(var i = 0; i < arr.length; i++) {
            if(highest === false || arr[i] > highest) highest = arr[i];
        }
        return highest;
    },
    arrayLowest: function(arr) {
        var lowest = false;
        for(var i = 0; i < arr.length; i++) {
            if(lowest === false || arr[i] < lowest) lowest = arr[i];
        }
        return lowest;
    },
    findAndRemove: function(elem,arr) {
        for(var i = 0; i < arr.length; i++) {
            if(arr[i] === elem) {
                arr.splice(i, 1);
                i--;
            }
        }
    },
    right: (text, length) => text.substring(text.length-length,text.length),
    clamp: (val, min, max) => Math.min(max,Math.max(min,val)),
    clampWrap: function(val, min, max) { // Clamp to range by wrapping value
        var wrap = (val-min) % (max+1-min);
        return wrap >= 0 ? min + wrap : max + 1 + wrap;
    },
    fractionalArrayIndex: function(arr, index) {
        var floorX = Math.floor(index);
        var lower = arr[floorX];
        if(floorX == index) return lower;
        var upper = arr[Math.ceil(index)];
        var fraction = index - Math.floor(index);
        return (lower + ((upper - lower) * fraction));
    },
    getURLParameter: function(name) {
        return decodeURIComponent(
                (new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)')
                    .exec(location.search)||[,""])[1].replace(/\+/g, '%20')) || null
    },
    getDomain: function(url) {
        if(url.indexOf('://') < 0) return false;
        url = url.replace(':///','://'); // Undo triple-slashing
        url = url.replace(/(^\w+:|^)\/\//, ''); // Remove protocol
        url = url.substring(0, url.indexOf('/')); // Remove subfolders
        let parts = url.split('.').reverse();
        let domain = parts.shift();
        if(parts[0].length === 2) domain = parts.shift() + '.' + domain; // Get 2-part TLDs (like co.jp)
        domain = parts.shift() + '.' + domain;
        return domain;
    },
    hsvToRGB: function(h, s, v) {
        var r, g, b, i = Math.floor(h * 6);
        var f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break; case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break; case 5: r = v; g = p; b = q; break;
        }
        return {r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)};
    },
    flip: function(input) { // Flip a coin, flip a value, flip a side
        if(input === undefined) return Math.random() > 0.5;
        if(input === 'left') return 'right';
        if(input === 'right') return 'left';
        if(!isNaN(parseFloat(input)) && isFinite(input)) return input * -1;
        console.error('flip function received invalid input:', input);
    },
    regExpify: function(str, doNotEscapeRegex) {
        var parsed = str.match(/^\/(.*)\/([gmi]{0,3})?$/);
        if(parsed) {
            try {
                return new RegExp(parsed[1], parsed[2]);
            } catch(e) {
                // Invalid regexp!
            }
        }
        if(!doNotEscapeRegex) str = str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        return new RegExp(`(?:${str}{0}|^|[^a-z])(${str})(?![a-z])`, 'gi');
    },
    getRegExpMatches: function(str, rx) {
        rx.lastIndex = 0; // Reset matching
        var matches = [];
        var match;
        while(match = rx.exec(str)) {
            matches = matches.concat(match.slice(Math.min(match.length - 1, 1)).filter(m => m));
            if(!rx.global) break; // Loop will go on endlessly if not global
        }
        return matches;
    },
    commonArrayElement: function(a, b) {
        for(var i = 0; i < a.length; i++) {
            if(b.includes(a[i])) return a[i];
        }
    },
    fixIndefiniteArticle(pre, word) {
        if(pre.toLowerCase() === 'an' && util.consonants.includes(word.substr(0, 1).toLowerCase())) {
            return pre.substr(0, 1) + ' ' + word;
        } else if(pre.toLowerCase() === 'a' && util.vowels.includes(word.substr(0, 1).toLowerCase())) {
            return pre + 'n ' + word;
        }
        return pre + ' ' + word;
    },
    resizeFontToFit(ctx, text, font, width, startSize) {
        do {
            ctx.font = startSize-- + 'px ' + font;
            var metrics = ctx.measureText(text);
        } while(metrics.width > width && startSize > 1);
        return metrics;
    },
    emojiToText(input) {
        return NodeEmoji.unemojify(input).replace(new RegExp('(' + emojiAlphabet.join('|') + ')', 'g'),
            a => `:${alphabet[emojiAlphabet.indexOf(a)]}:`);
    },
    timer: {
        times: {},
        timing: {},
        now() {
            const hrTime = process.hrtime();
            return hrTime[0] * 1000000000 + hrTime[1];
        },
        start(label) {
            if(!this.times[label]) this.times[label] = 0;
            this.timing[label] = this.now();
        },
        stop(label) {
            this.times[label] += this.now() - this.timing[label];
        },
        results() {
            console.log('---Timer Results---');
            Object.keys(this.times).forEach(label => {
                console.log(label, this.times[label] / 1000000, 'ms');
            });
            console.log('-------------------');
        },
        reset() {
            this.times = {};
            this.timing = {};
        }
    },
    urlRX: /(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi,
    matchWordsRX: /(?: |^)([a-z1-9'-]+)(?=$|[ ,.!?:])/gi,
    alphabet, emojiAlphabet,
    vowels: [ ...'aeiou'],
    consonants: [ ...'bcdfghjklmnpqrstvwxyz'],
    hex: [ ...'0123456789abcdef']
};

module.exports = util;

// Polyfill
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement /*, fromIndex*/) {
        'use strict';
        if (this == null) {
            throw new TypeError('Array.prototype.includes called on null or undefined');
        }

        var O = Object(this);
        var len = parseInt(O.length, 10) || 0;
        if (len === 0) {
            return false;
        }
        var n = parseInt(arguments[1], 10) || 0;
        var k;
        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) {k = 0;}
        }
        var currentElement;
        while (k < len) {
            currentElement = O[k];
            if (searchElement === currentElement ||
                (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
                return true;
            }
            k++;
        }
        return false;
    };
}
// https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength,padString) {
        targetLength = targetLength>>0; //floor if number or convert non-number to 0;
        padString = String(padString || ' ');
        if (this.length > targetLength) {
            return String(this);
        }
        else {
            targetLength = targetLength-this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
            }
            return padString.slice(0,targetLength) + String(this);
        }
    };
}
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd
if (!String.prototype.padEnd) {
    String.prototype.padEnd = function padEnd(targetLength,padString) {
        targetLength = targetLength>>0; //floor if number or convert non-number to 0;
        padString = String(padString || ' ');
        if (this.length > targetLength) {
            return String(this);
        }
        else {
            targetLength = targetLength-this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
            }
            return String(this) + padString.slice(0,targetLength);
        }
    };
}
Date.prototype.addDays = function(days) { // https://stackoverflow.com/a/563442/2612679
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
};
