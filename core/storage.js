// Storage interface to keep files organized
const path = require('path');
const fse = require('fs-extra');
const Nedb = require('nedb-promise');
const callsite = require('callsite'); // For getting filename of calling module
const util = require('./util.js');

const PATH = 'storage/';

function JSONFile(filename, initData, space) {
    this.filename = filename;
    this.space = space;
    initData = util.objToMap(initData || {});
    try {
        let data = fse.readJsonSync(filename);
        this.data = new Map([...initData, ...util.objToMap(data)]);
    } catch(err) {
        this.data = initData;
    } finally {
        this.save();
    }
}
JSONFile.prototype.get = function(key) {
    return this.data.get(key);
};
JSONFile.prototype.set = function(key, value) {
    this.data.set(key, value);
    this.save();
    return this.data;
};
JSONFile.prototype.trans = function(key, fn) {
    this.data.set(key, fn(this.data.get(key)));
    this.save();
    return this.data;
};
JSONFile.prototype.save = function() {
    if(this.saving) return;
    this.saving = true;
    setTimeout(() => { // Multiple saves called at once will collapse into a single save
        fse.writeJson(this.filename + '.tmp', util.mapToObj(this.data), { spaces: this.space })
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
JSONFile.prototype.delete = function(key) {
    this.data.delete(key);
    this.save();
};
JSONFile.prototype.setData = function(data) {
    this.data = util.objToMap(data);
    this.save();
    return this.data;
};
JSONFile.prototype.reset = function() {
    this.data.clear();
    this.save();
};

module.exports = {
    nedb: async function(name, index) {
        try {
            let dir = getDirectory(PATH + path.basename(callsite()[1].getFileName(),'.js'));
            let db = new Nedb({
                filename: dir + '/' + name + '.db',
                autoload: true
            });
            if(index) {
                index = Array.isArray(index) ? index : [index];
                await index.forEach(i => db.ensureIndex(i));
            }
            return db;
        } catch(e) {
            console.log(`Error creating "${name}" nedb`, e);
        }
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

