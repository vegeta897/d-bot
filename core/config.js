// Loads, validates, and provides config values
var schema = require('./../config_schema.json');
var { Validator } = require('jsonschema');
var schemaDefaults = require('json-schema-defaults');
var moment = require('moment-timezone');

Validator.prototype.customFormats.IANATimeZone = function(input) {
    let m = moment();
    return m.tz(input)._isUTC;
};

var config;
try {
    config = require('./../config.json');
} catch(e) {
    console.log('Error loading config file, check that config.json exists in root directory and contains valid JSON');
    process.exit(); // Exit if config did not load successfully
}

var validation = new Validator().validate(config, schema);

if(validation.errors.length > 0) {
    console.log('Config validation failed, see errors below:');
    for(var e = 0; e < validation.errors.length; e++) {
        console.log('Error #' + (e+1), validation.errors[e].property, validation.errors[e].message);
    }
    console.log('To view the whole config schema, look at ./config_schema.json');
    process.exit(); // Exit if config does not validate
}

// Create missing config properties with default values
var defaults = schemaDefaults(schema);
for(var d in defaults) {
    if(!defaults.hasOwnProperty(d) || config[d]) continue;
    config[d] = defaults[d];
}

module.exports = config;
