// Storage interface to keep files organized
var path = require('path');
var fs = require('fs');
var Nedb = require('nedb');
var callsite = require('callsite'); // For getting filename of calling module

function JSONFile(filename) {
    this.filename = filename;
    try {
        fs.readFileSync(filename);
    } catch(err) {
        fs.writeFileSync(this.filename, '{}\n');
    } finally {
        this.data = JSON.parse(fs.readFileSync(filename));
    }
}
JSONFile.prototype.save = function() {
    fs.writeFile(this.filename, JSON.stringify(this.data) + '\n');
};

JSONFile.prototype.reset = function() {
    Object.keys(this.data).forEach(function(key) { delete this.data[key]; }, this); // Empty the object
    this.save();
};

module.exports = {
    nedb: function(name) {
        var dir = getDirectory('storage/' + path.basename(callsite()[1].getFileName(),'.js'));
        return new Nedb({
            filename: dir + '/' + name + '.db', 
            autoload: true
        });
    },
    json: function(name) {
        var dir = getDirectory('storage/' + path.basename(callsite()[1].getFileName(),'.js'));
        return new JSONFile(dir + '/' + name + '.json');
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