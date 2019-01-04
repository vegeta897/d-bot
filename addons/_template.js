// Copy me to make a new addon
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');
var storage = require(__base+'core/storage.js');

let db;
storage.nedb('test', { fieldName: 'id', unique: true }).then(d => db = d);

var _commands = {};

_commands.blank = async function(data) {
    var blankMessage = 'You gave no parameters!';
    // data.messageObject.channel.sendTyping(); // Use for async commands!
    if(data.params.length) blankMessage = 'Your parameters are ' + data.paramStr;
    data.reply(blankMessage);
};

_commands.async = async function(data) {
    data.reply(await messages.getRandomWord());
};

module.exports = {
    commands: _commands
};
