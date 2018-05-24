// Small commands not worth having their own file
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var config = require(__base+'core/config.js');
var storage = require(__base+'core/storage.js');
var discord = require(__base+'core/discord.js');
var DateFormat = require('dateformat');
var moment = require('moment-timezone');

const timeData = storage.json('time', { zoneUsers: {} }, '\t');

var _commands = {};

_commands.me = function(data) {
    discord.bot.deleteMessage({ channelID: data.channel, messageID: data.rawEvent.d.id });
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
    if(data.params.length > 0) {
        timeData.trans('zoneUsers', zu => {
            let assigned = false;
            for(let zKey of Object.keys(timezones)) {
                let match = zKey.toLowerCase() === data.paramStr.toLowerCase();
                if(zu[zKey] && zu[zKey].includes(data.userID)) {
                    if(match) {
                        data.reply(`You're already in that timezone`);
                        return zu;
                    }
                    util.findAndRemove(data.userID, zu[zKey]);
                }
                if(match) {
                    let z = zu[zKey] || [];
                    z.push(data.userID);
                    zu[zKey] = z;
                    assigned = zKey;
                }
            }
            if(!assigned) data.reply('Invalid timezone, you must choose one of: ' + Object.keys(timezones).split(', '));
            else data.reply(`You've been assigned to timezone \`${assigned}\``);
            return zu;
        });
        return;
    }
    let message = '__Local Times__';
    let now = moment();
    let zoneUsers = timeData.get('zoneUsers');
    for(let tz of Object.keys(timezones)) {
        message += `\n${now.tz(timezones[tz]).format('ddd h:mm a')} - ${tz}`;
        if(zoneUsers[tz]) message += ' - ' + zoneUsers[tz].map(u => discord.getUsernameFromID(u));
    }
    data.reply(message);
};

module.exports = {
    commands: _commands,
    help: {
        earliest: ['Get the time and date of the earliest recorded message'],
        me: ['Make D-Bot narrate your life', 'is eating cotton candy'],
        youtube: ['Grab a random YouTube video from the chat log'],
        time: ['Get everybody\'s local time, or assign a timezone to yourself', 'Eastern']
    }
};
