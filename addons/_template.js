// Copy me to make a new addon
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');

var _commands = {};

_commands.blank = function(data) {
    var blankMessage = 'You gave no parameters!';
    // discord.bot.simulateTyping(data.channel); // Use for async commands!
    if(data.params.length) blankMessage = 'Your parameters are ' + data.paramStr;
    data.reply(blankMessage);
};

module.exports = {
    commands: _commands
};