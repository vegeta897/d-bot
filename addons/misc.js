// Small commands not worth having their own file
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var config = require(__base+'core/config.js');
var { bot } = require(__base+'core/discord.js');
var DateFormat = require('dateformat');
var moment = require('moment-timezone');

var _commands = {};

_commands.me = function(data) {
    bot.deleteMessage({ channelID: data.channel, messageID: data.rawEvent.d.id });
    data.reply(`_${data.user} ${data.paramStr}_`);
};

_commands.earliest = async function(data) {
    let firstMessage = await messages.cursor(db => db.cfind().sort({ time: 1 }).limit(1));
    data.reply(`Earliest message logged was on ` +
        DateFormat(new Date(firstMessage[0].time), 'mmmm dS, yyyy at h:MM:ss TT') + ' EST');
};

_commands.youtube = async function(data) {
    let ytrx = /(http[s]?:\/\/\S*youtu\S*\.\S*)(?= |$)/gi; // I made this myself!
    let ytMessages = await messages.cursor(db => db.cfind({ content: ytrx }));
    data.reply(util.pickInArray(util.getRegExpMatches(util.pickInArray(ytMessages).content, ytrx)));
};

_commands.time = async function(data) {
    let { timezones } = config;
    if(!timezones || Object.keys(timezones).length === 0) return data.reply(`No timezones are configured.\nD-Bot's local time is **${DateFormat(new Date(), 'dddd, h:mm a')}**`);
    let message = '__Local Times__';
    let now = moment();
    for(let tz of Object.keys(timezones)) {
        message += `\n${tz} - ${now.tz(timezones[tz]).format('dddd, h:mm a')}`;
    }
    data.reply(message);
};

module.exports = {
    commands: _commands,
    help: {
        earliest: ['Get the time and date of the earliest recorded message'],
        me: ['Make D-Bot narrate your life', 'is eating cotton candy'],
        youtube: ['Grab a random YouTube video from the chat log'],
        time: ['Get everybody\'s local time']
    }
};
