// Validate command parameters against a provided pattern(s)
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');

const Pattern = function(names, values, params) {
    this.names = names;
    this.values = values;
    this.params = params;
};

const Param = function() {
    this.checks = [];
};
Param.prototype.numeric = function(error) {
    this.checks.push(function(val) {
        if(!util.isNumeric(val)) return error;
    });
    return this;
};
Param.prototype.whole = function(error) {
    this.checks.push(function(val) {
        if(Math.floor(+val) !== +val) return error;
    });
    return this;
};
Param.prototype.min = function(min, error) {
    this.checks.push(function(val) {
        if(+val < min) return error;
    });
    return this;
};
Param.prototype.max = function(max, error) {
    this.checks.push(function(val) {
        if(+val > max) return error;
    });
    return this;
};
Param.prototype.oneOf = function(options, error) {
    this.checks.push(function(val) {
        if(!options.includes(val)) return error;
    });
    return this;
};

Param.prototype.check = function(val) {
    for(let i = 0; i < this.checks.length; i++) {
        let check = this.checks[i](val);
        if(check) return check;
    }
};

module.exports = {
    Pattern, Param,
    validate(patterns) {
        let finalResult;
        for(let p = patterns.length - 1; p >= 0; p--) {
            let pattern = patterns[p];
            let errorCount = 0;
            let result = {};
            for(let n = 0; n < pattern.names.length; n++) {
                result[pattern.names[n]] = pattern.values[n];
            }
            for(let i = 0; i < pattern.params.length; i++) {
                let error = pattern.params[i].check(pattern.values[i]);
                if(error) errorCount++;
                result.error = result.error || error;
            }
            if(!finalResult || errorCount <= finalResult.errorCount) {
                // We want the result with the fewest errors
                finalResult = result;
                finalResult.errorCount = errorCount;
            }
        }
        return finalResult; // Return the result with the fewest errors
    }
};