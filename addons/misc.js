// Small commands not worth having their own file
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');

var DateFormat = require('dateformat');

var _commands = {};

_commands.me = function(data) {
    discord.bot.deleteMessage({ channelID: data.channel, messageID: data.rawEvent.d.id });
    discord.sendMessage(data.channel, '_' + data.user + ' ' + data.paramStr + '_');
};

_commands.earliest = function(data) {
    messages.wrap(messages.db.find().sort({ time: 1 }).limit(1), function(firstMessage) {
        var firstMsgTimestamp = DateFormat(new Date(firstMessage.time), 'mmmm dS, yyyy - h:MM:ss TT') + ' EST';
        discord.sendMessage(data.channel, 'Earliest message in log was on: ' + firstMsgTimestamp);
    });
};

module.exports = {
    commands: _commands,
    help: {
        earliest: ['Get the time and date of the earliest recorded message'],
        me: ['Make D-Bot narrate your life', 'is eating cotton candy']
    }
};