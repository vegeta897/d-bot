// Storage interface to keep files organized
var path = require('path');
var fs = require('fs');
var Nedb = require('nedb');
var callsite = require('callsite'); // For getting filename of calling module

function JSONFile(filename, initData, space) {
    this.filename = filename;
    this.space = space;
    try {
        fs.readFileSync(filename);
        JSON.parse(fs.readFileSync(filename));
    } catch(err) {
        initData = JSON.stringify(initData || {}, null, this.space);
        fs.writeFileSync(this.filename, `${initData}\n`);
    } finally {
        this.data = JSON.parse(fs.readFileSync(filename));
    }
}
JSONFile.prototype.save = function() {
    fs.writeFile(this.filename, JSON.stringify(this.data, null, this.space) + '\n');
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
    json: function(name, initData, space) {
        var dir = getDirectory('storage/' + path.basename(callsite()[1].getFileName(),'.js'));
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