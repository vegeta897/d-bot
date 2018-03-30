// Storage interface to keep files organized
var path = require('path');
var fse = require('fs-extra');
var Nedb = require('nedb-promise');
var callsite = require('callsite'); // For getting filename of calling module

const DEBUG = process.argv[2] === 'debug';
const PATH = DEBUG ? 'debug/' : 'storage/';

function JSONFile(filename, initData, space) {
    this.filename = filename;
    this.space = space;
    initData = objToMap(initData || {});
    try {
        let data = fse.readJsonSync(filename);
        this.data = new Map([...initData, ...objToMap(data)]);
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
JSONFile.prototype.save = function() {
    if(this.saving) return;
    this.saving = true;
    setTimeout(() => { // Multiple saves called at once will collapse into a single save
        fse.writeJson(this.filename + '.tmp', mapToObj(this.data), { spaces: this.space })
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
            if(index) await db.ensureIndex(index);
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

function objToMap(obj) { // https://stackoverflow.com/a/36644532/2612679
    let map = new Map();
    Object.keys(obj).forEach(key => {
        map.set(key, obj[key]);
    });
    return map;
}

function mapToObj(map) {
    let obj = Object.create(null);
    for (let [k,v] of map) obj[k] = v;
    return obj;
}
