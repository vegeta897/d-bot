'use strict';
// The great RPG
var util = require('./util.js');
var jsonfile = require('jsonfile');
jsonfile.spaces = 4;
var rpgMap = require('./rpg-map.js');

var wordListJSON = require('word-list-json');
var wordListTrim = wordListJSON.slice(6963,270633);

var sendMsg, messages, members; // Vars from bot.js
var rpg, ready;
var unknownNames;

var playerInitValues = {
    state: 'new', hp: [10,10], level: 1, xp: 0, atk: 1, def: 1, evd: 1, gold: 10, 
    weapon: { name: 'small dagger', dmg: 1, value: 1 }
};

jsonfile.readFile('rpg.json',function(err,obj) {
    if(err) { console.log(err); return; }
    //console.log(JSON.stringify(obj, null, 4));
    rpg = obj;
    if(!rpg.users) rpg.users = {};
    // Fill in missing user init values
    for(var uKey in rpg.users) { if(!rpg.users.hasOwnProperty(uKey)) continue;
        rpg.users[uKey] = new Player(rpg.users[uKey]);
    }
    save();
});

var save = function() {jsonfile.writeFile('rpg.json',rpg,function(err){if(err)console.error(err)});};

var initUser = function(user,name) {
    rpg.users[user] = JSON.parse(JSON.stringify(playerInitValues));
    rpg.users[user].name = name;
    save();
};

var describeUser = function(user) {
    var messages = [];
    var rpgUser = rpg.users[user];
    messages.push('**'+rpgUser.name+'**, you are **level '+rpgUser.level+'** with **'+rpgUser.gold+' gold**. ' +
        'Your weapon is a **'+rpgUser.weapon.name+'**.');
    return messages;
};

var newEncounter = function(cb) {
    console.log(new Date(),'generating encounter');
    var monster = unknownNames[util.randomInt(unknownNames.length-1)];
    monster = { master: monster[1], name: monster[0], hp: [3,3], atk: 1, def: 1, evd: 1 };
    messages.find({ user:monster.master, 
            $where: function () { return !util.contains(this.content,'http') && !util.contains(this.content,'<@'); } },
        function(err,msgs) {
            if (err) { console.log(err); return; }
            monster.message = msgs[util.randomInt(msgs.length-1)].content;
            cb(monster);
        }
    );
};

var getMonsterXP = function(monster) {
    return monster.hp[1] + (monster.atk || 0)*3 + (monster.def || 0)*2 + (monster.evd || 0)*2;
};

class Player {
    constructor(data) {
        for(var iKey in playerInitValues) { if(!playerInitValues.hasOwnProperty(iKey)) continue;
            this[iKey] = playerInitValues[iKey]; // Fill init values as defaults
        }
        for(var dKey in data) { if(!data.hasOwnProperty(dKey)) continue;
            this[dKey] = data[dKey]; // Fill input data
        }
        if(this.module) {
            this.module = new Module(this.module);
        }
    }
    sendMessage(msg) {
        sendMsg(this.id,[msg]);
    }
    takeItem(item) {
        if(!this.hasOwnProperty('inventory')) {
            this.inventory = [item];
        } else {
            this.inventory.push(item);
        }
    }
    doAction(cmd) {
        var result = this.module.doAction(cmd);
        if(result) {
            if(result.msg) this.sendMessage(result.msg);
            if(result.pickup) this.takeItem(result.pickup);
        } else {
            this.sendMessage('You must enter one of the action words.');
        }
    }
    getPrompt() {
        return this.module.getPrompt();
    }
}

class Module {
    constructor(data) {
        if(modules.hasOwnProperty(data)) { // If data param is a module name, initialize a new one
            data = { module: data, room: modules[data].startingRoom };
        }
        for(var pKey in data) { if(!data.hasOwnProperty(pKey)) continue;
            this[pKey] = data[pKey]; // Fill in module properties from saved data
        }
    }
    doAction(cmd) {
        var monster = modules[this.module].rooms[this.room].monster;
        if(monster) { this.monster = monster; return monster; }
        var actions = modules[this.module].rooms[this.room].actions;
        if(actions[cmd]) { this.room = actions[cmd].goto; return actions[cmd]; }
        return false;
    }
    getPrompt() {
        return modules[this.module].rooms[this.room].prompt;
    }
}

var modules = {
    tutorial: {
        startingRoom: '1',
        rooms: {
            '1': {
                prompt: 'Ye find yeself in yon dungeon. You can `walk` forward ' +
                'through the narrow torch-lit hall, or `look` around.\n_Type an `action` to do something_',
                actions: {
                    'walk': {goto:'2'},
                    'look': {goto:'1-helmet'}
                }
            },
            '1-helmet': {
                prompt: 'Ever cautious, you examine your surroundings. ' +
                'There is an object hidden in shadow and cobwebs. ' +
                'You pick it up and brush off the decrepitude. It\'s an **iron skullcap**! ' +
                'You can `take` it, or ignore it and `walk` down the hallway.',
                actions: {
                    'walk': {goto:'2'},
                    'take': {goto:'2', msg: 'You don the old helmet, and its weighty yet sturdy presence on ' +
                    'your head is reassuring.', pickup:{ name:'iron skullcap', def:1, value:5 }}
                }
            },
            '2': {
                prompt: 'You walk for a time down winding corridors until you\'re suddenly ' +
                'interrupted by a wretched gasp. Quickly turning toward the source of the inhuman ' +
                'sound, dagger at the ready, you see before you an imp. It creeps toward you in ' +
                'a crouch, brandishing a jagged shard of steel with cloth wraps for a handle.\n\n' +
                'You\'re in combat now! Type `attack` to strike your foe!',
                monster: { name: 'imp', hp: [3,3], atk: 1, def: 1, evd: 1 }
            }
        }
    }
};
for(var mKey in modules) { if(!modules.hasOwnProperty(mKey)) continue;
    modules[mKey].module = mKey;
}

class Monster {
    constructor(data) {
        for(var dKey in data) { if(!data.hasOwnProperty(dKey)) continue;
            this[dKey] = data[dKey]; // Fill input data
        }
    }
}

// TODO: Combat system like the one in 100% orange juice

// TODO: Enemies are minions of other people in Discord, they say a random message upon encountering

module.exports = {
    init: function(sm,msg,mem) { 
        sendMsg = sm; messages = msg; members = mem;
        messages.find({},function(err,msgs) {
            if (err) { console.log(err); return; }
            var dictionary = {};
            var lettersRx = /^[a-z]*$/;
            for(var m = 0; m < msgs.length; m++) {
                if(['/','!'].indexOf(msgs[m].content[0]) >= 0) continue;
                if(msgs[m].user == '103730024510685184') continue;
                var words = msgs[m].content.split(' ');
                if(!words || words.length == 0) continue;
                for(var w = 0; w < words.length; w++) {
                    var thisWord = words[w].toLowerCase();
                    if(thisWord.length < 5) continue;
                    if(thisWord.length > 14) continue;
                    if(['shouldnt','shouldve','wouldnt','wouldve','couldnt','couldve','youre','didnt','theyre',
                        'thats','theyve','youve','havent'].indexOf(thisWord) >= 0) continue; // Typos
                    if(!thisWord.match(lettersRx)) continue;
                    if(wordListTrim.indexOf(thisWord) >= 0) continue;
                    dictionary[thisWord] = msgs[m].user;
                }
            }
            unknownNames = [];
            for(var wKey in dictionary) { if(!dictionary.hasOwnProperty(wKey)) continue;
                unknownNames.push([wKey,dictionary[wKey]]);
            }
            console.log(new Date(),'RPG initialized');
            ready = true;
            //console.log(unknownWords);
            //newEncounter(function(monster) {
            //    console.log(new Date(),monster);
            //});
        });
    },
    parse: function(msg,user,name,channel) {
        if(!rpg || !ready) return;
        if(msg.substr(0,4) == '!rpg' || msg.substr(0,4) == '/rpg') {
            if(!rpg.users.hasOwnProperty(user)) { // If user doesn't exist
                rpg.users[user] = new Player({ id:user, name: name, module: 'tutorial' });
                save();
            }
            sendMsg(channel,describeUser(user));
            if(user != channel) { // If not a PM
                sendMsg(channel,['To play the RPG, talk to me in private chat: @D-Bot']);
            } else {
                sendMsg(channel,[rpg.users[user].getPrompt()]);
            }
            return;
        } else if(msg[0] == '!' || msg[0] == '/') {
            return; // Don't listen to any other commands
        }
        if(user != channel) return; // Only proceed if PM
        if(!rpg.users.hasOwnProperty(user)) { // If user doesn't exist
            sendMsg(channel,['Type !rpg to initialize your character.']); return;
        }
        var player = rpg.users[user], cmd = msg.toLowerCase();
        if(cmd) {
            player.doAction(cmd);
        }
        sendMsg(channel,[player.getPrompt()]);
        ////////////////////////////////////////////////////////////////
        //sendMsg(channel,['The game\'s not ready yet, come back later.']); return;
        ////////////////////////////////////////////////////////////////
        save();
    }
};