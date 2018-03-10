// I just don't trust anyone
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');

var _commands = {};

_commands.topic = function(data) {
    if(!discord.userHasRole(data.userID, config.adminRole)) {
        return data.reply('You do not have admin permissions!');
    }
    if(data.paramStr.length > 1024) {
        return data.reply(`Sorry, that topic is \`${1024 - data.paramStr.length}\` characters too long!`);
    }
    discord.bot.editChannelInfo({ channelID: data.channel, topic: data.paramStr }, function(err, res) {
        if(err) return data.reply('Error setting topic!', err);
        data.reply(`Topic set: **${data.paramStr}**`);
    });
};

module.exports = {
    commands: _commands,
    help: {
        topic: ['Set the current channel\'s topic']
    }
};
