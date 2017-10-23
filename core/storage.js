// Storage interface to keep files organized
var path = require('path');
var fs = require('fs');
var Nedb = require('nedb');
var callsite = require('callsite'); // For getting filename of calling module

const DEBUG = process.argv[2] === 'debug';
const PATH = DEBUG ? 'debug/' : 'storage/';

function JSONFile(filename, initData, space) {
    this.filename = filename;
    this.space = space;
    try {
        let data = JSON.parse(fs.readFileSync(filename));
        this.data = Object.assign(initData || {}, data);
    } catch(err) {
        this.data = initData || {};
    } finally {
        this.save();
    }
}
JSONFile.prototype.save = function() {
    // TODO: Write to temporary file first to avoid corruption
    try {
        let json = JSON.stringify(this.data, null, this.space);
        fs.writeFileSync(this.filename, json + '\n');
    } catch(err) {
        console.log('Error saving', this.filename, 'data', err);
    }
};
JSONFile.prototype.reset = function() {
    Object.keys(this.data).forEach(function(key) { delete this.data[key]; }, this); // Empty the object
    this.save();
};

module.exports = {
    nedb: function(name) {
        var dir = getDirectory(PATH + path.basename(callsite()[1].getFileName(),'.js'));
        return new Nedb({
            filename: dir + '/' + name + '.db', 
            autoload: true
        });
    },
    json: function(name, initData, space) {
        var dir = getDirectory(PATH + path.basename(callsite()[1].getFileName(),'.js'));
        return new JSONFile(dir + '/' + name + '.json', initData, space);
    }
};

function getDirectory(dir) {
    try {
        fs.readdirSync(dir);
    } catch(err) {
        fs.mkdirSync(dir);
    }
    return dir;
}