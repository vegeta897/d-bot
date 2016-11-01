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
        var firstMsgTimestamp = DateFormat(new Date(firstMessage[0].time), 'mmmm dS, yyyy - h:MM:ss TT') + ' EST';
        discord.sendMessage(data.channel, `Earliest message in log was on: ${firstMsgTimestamp}`);
    });
};

_commands.youtube = function(data) {
    var ytrx = /(http[s]?:\/\/\S*youtu\S*\.\S*)(?= |$)/gi; // I made this myself!
    messages.wrap(messages.db.find({ content: ytrx }), function(messages) {
        var msg = util.pickInArray(messages);
        var yt = util.pickInArray(util.getRegExpMatches(msg.content, ytrx));
        discord.sendMessage(data.channel, yt, true);
    });
};

module.exports = {
    commands: _commands,
    help: {
        earliest: ['Get the time and date of the earliest recorded message'],
        me: ['Make D-Bot narrate your life', 'is eating cotton candy'],
        youtube: ['Grab a random YouTube video from the chat log']
    }
};