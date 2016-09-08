// Loads, validates, and provides config values
var validator = new (require('jsonschema').Validator)();

var config;
try {
    config = require('./../config.json');
} catch(e) {
    console.log('Error loading config file, check that config.json exists in root directory and contains valid JSON');
    process.exit(); // Exit if config did not load successfully
}

var validation = validator.validate(config, require('./../config_schema.json'));

if(validation.errors.length > 0) {
    console.log('Config validation failed, see errors below:');
    for(var e = 0; e < validation.errors.length; e++) {
        console.log('Error #' + (e+1), validation.errors[e].property, validation.errors[e].message);
    }
    console.log('To view the whole config schema, look at ./config_schema.json');
    process.exit(); // Exit if config does not validate
}

// Create missing config properties with default values
var defaults = require('./../config_defaults.json');
for(var d in defaults) {
    if(!defaults.hasOwnProperty(d) || config[d]) continue;
    config[d] = defaults[d];
}

module.exports = config;