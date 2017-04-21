// Helper functions!

module.exports = {
    contains: function(a, b) { // Check if string A contains string B, case insensitive
        return a.toLowerCase().indexOf(b.toLowerCase()) > -1;
    },
    randomIntRange: (min, max) => Math.floor(Math.random() * (+max - +min + 1)) + +min,
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
        var randomIndex = this.randomIntRange(0, arr.length-1);
        if(arguments[1]) return arr.splice(randomIndex,1)[0];
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
        var firstPeriod = url.indexOf('.');
        if(firstPeriod < 0) return false;
        var afterFirstPeriod = url.substring(firstPeriod);
        var firstFolder = afterFirstPeriod.indexOf('/');
        firstFolder = firstFolder == -1 ? afterFirstPeriod.length : firstFolder;
        var beforeFirstFolder = url.substring(0,firstPeriod + firstFolder);
        var domainParts = beforeFirstFolder.split('.');
        if(domainParts.length < 2) return false;
        var finalized = domainParts[domainParts.length-2].split('://');
        return finalized[finalized.length-1] + '.' + domainParts[domainParts.length-1];
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
        if(input == 'left') return 'right';
        if(input == 'right') return 'left';
        if(!isNaN(parseFloat(input)) && isFinite(input)) return input * -1;
        console.error('bad use of flip function!', input);
    },
    regExpify: function(str) {
        var rxParser = /^\/(.*)\/([gmi]{0,3})?$/;
        var parsed = str.match(rxParser);
        if(parsed) {
            try {
                return new RegExp(parsed[1],parsed[2]);
            } catch(e) {
                return false; // Invalid regexp!
            }
        } else if(str.match(/^\w\S*\w$/)) {
            return new RegExp('\\b'+str+'\\b','gi');
        } else {
            return new RegExp(str,'gi');
        }
    },
    getRegExpMatches: function(str, rx) {
        rx.lastIndex = 0; // Reset matching
        var matches = [];
        var match;
        while(match = rx.exec(str)) {
            matches.push(match[1]);
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
    matchWordsRX: /(?: |^)([a-z1-9'-]+)(?=$|[ ,.!?])/gi,
    alphabet: ['a','b','c','d','e','f','g','h','i','j','k','l','m',
        'n','o','p','q','r','s','t','u','v','w','x','y','z'],
    vowels: ['a','e','i','o','u'],
    consonants: ['b','c','d','f','g','h','j','k','l','m','n','p','q','r','s','t','v','w','x','y','z'],
    hex: ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f']
};

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