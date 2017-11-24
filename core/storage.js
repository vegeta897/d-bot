// Storage interface to keep files organized
var path = require('path');
var fse = require('fs-extra');
var Nedb = require('nedb');
var callsite = require('callsite'); // For getting filename of calling module

const DEBUG = process.argv[2] === 'debug';
const PATH = DEBUG ? 'debug/' : 'storage/';

function JSONFile(filename, initData, space) {
    this.filename = filename;
    this.space = space;
    try {
        let data = fse.readJsonSync(filename);
        this.data = Object.assign(initData || {}, data);
    } catch(err) {
        this.data = initData || {};
    } finally {
        this.save();
    }
}
JSONFile.prototype.save = function() {
    if(this.saving) return;
    this.saving = true;
    setTimeout(() => { // Multiple saves called at once will collapse into a single save
        fse.writeJson(this.filename + '.tmp', this.data, { spaces: this.space })
            .then(() => {
                fse.move(this.filename + '.tmp', this.filename, { overwrite: true })
                    .then(() => this.saving = false)
                    .catch(err => {
                        console.error('Error writing to file', this.filename, err);
                        this.saving = false;
                    });
            })
            .catch(err => console.error('Error saving temporary file', this.filename + '.tmp', err));
    }, 0);
};
JSONFile.prototype.reset = function() {
    Object.keys(this.data).forEach(function(key) { delete this.data[key]; }, this); // Empty the object
    this.save();
};

module.exports = {
    nedb: function(name) {
        let dir = getDirectory(PATH + path.basename(callsite()[1].getFileName(),'.js'));
        return new Nedb({
            filename: dir + '/' + name + '.db', 
            autoload: true
        });
    },
    json: function(name, initData, space) {
        let dir = getDirectory(PATH + path.basename(callsite()[1].getFileName(),'.js'));
        return new JSONFile(dir + '/' + name + '.json', initData, space);
    },
    getStoragePath: function(name) {
        let dir = getDirectory(PATH + path.basename(callsite()[1].getFileName(),'.js'));
        return dir + '/' + name;
    }
};

function getDirectory(dir) {
    fse.ensureDirSync(dir);
    return dir;
}