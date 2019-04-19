// Small commands not worth having their own file
const util = require(__base+'core/util.js');
const messages = require(__base+'core/messages.js');
const config = require(__base+'core/config.js');
const storage = require(__base+'core/storage.js');
const discord = require(__base+'core/discord.js');
const DateFormat = require('dateformat');
const moment = require('moment-timezone');
const convert = require('convert-units');
const timestring = require('timestring');

const timeData = storage.json('time', { zoneUsers: {} }, '\t');
const reminderData = storage.json('reminders', { reminders: [] }, '\t');

const _commands = {};

_commands.me = data => {
    discord.bot.deleteMessage(data.channel, data.messageID, 'Consumed /me command');
    data.reply(`_${data.user} ${data.paramStr}_`);
};

_commands.echo = data => data.reply(data.paramStr);

_commands.earliest = async data => {
    let firstMessage = await messages.cursor(db => db.cfind().sort({ time: 1 }).limit(1));
    data.reply(`Earliest message logged was on ` +
        DateFormat(new Date(firstMessage[0].time), 'mmmm dS, yyyy at h:MM:ss TT') + ' EST');
};

_commands.youtube = async data => {
    let ytrx = /(http[s]?:\/\/\S*youtu\S*\.\S*)(?= |$)/gi; // I made this myself!
    let ytMessages = await messages.cursor(db => db.cfind({ content: ytrx }));
    data.reply(util.pickInArray(util.getRegExpMatches(util.pickInArray(ytMessages).content, ytrx)));
};

_commands.time = async data => {
    let { timezones } = config;
    if(!timezones || Object.keys(timezones).length === 0) return data.reply(`No timezones are configured.\nD-Bot's local time is **${DateFormat(new Date(), 'dddd, h:mm a')}**`);
    if(data.params.length > 0) {
        timeData.trans('zoneUsers', zu => {
            let zuNew = {};
            let assigned = false;
            for(let zKey of Object.keys(timezones)) {
                zuNew[zKey] = zu[zKey] ? zu[zKey].slice(0) : [];
                let match = zKey.toLowerCase() === data.paramStr.toLowerCase();
                if(zuNew[zKey].includes(data.userID)) {
                    if(match) {
                        data.reply(`You're already in that timezone`);
                        return zu;
                    }
                    util.findAndRemove(data.userID, zuNew[zKey]);
                }
                if(match) {
                    zuNew[zKey].push(data.userID);
                    assigned = zKey;
                }
            }
            if(!assigned) {
                data.reply('Invalid timezone, you must choose one of: ' + Object.keys(timezones).join(', '));
                return zu; // Return original data
            }
            else {
                data.reply(`You've been assigned to timezone \`${assigned}\``);
                return zuNew; // Return new data
            }
        });
        return;
    }
    let message = '__Local Times__';
    let now = moment();
    let zoneUsers = timeData.get('zoneUsers');
    for(let tz of Object.keys(timezones)) {
        message += `\n${now.tz(timezones[tz]).format('ddd h:mm a')} - **${tz}**`;
        if(zoneUsers[tz] && zoneUsers[tz].length > 0) message += ' - ' + zoneUsers[tz].map(u => discord.getUsernameFromID(u)).join(', ');
    }
    data.reply(message);
};

_commands.convert = async data => {
    let v, f, t;
    try {
        [,v, f, t] = data.paramStr.match(/^([0-9.]+)\s?([a-z]+)\sto\s([a-z]+)$/i);
        f = unitAliases[f.toLowerCase()] || f;
        t = unitAliases[t.toLowerCase()] || t;
    } catch(e) {
        return data.reply('Please input: `<value> <from_unit> to <to_unit>`');
    }
    try {
        let result = convert(v).from(f).to(t);
        data.reply(`\`${util.roundDecimals(result, 4)} ${t}\``);
    } catch(e) {
        let err = 'Error: Invalid unit';
        try {
            data.reply(`${err} \`${t}\`, use: ${util.arrayToList(convert().from(f).possibilities(), '`', ', ')}`);
        } catch(e) {
            try {
                data.reply(`${err} \`${f}\`, use: ${util.arrayToList(convert().from(t).possibilities(), '`', ', ')}`);
            } catch(e) {
                data.reply(`${err}s, use abbreviations (e.g. ${util.arrayToList(['mi', 'km', 'lb', 'kg'], '`', ', ')})`);
            }
        }
    }
};

_commands.remind = async data => {
    if(data.params.length < 2) return data.reply('Please input: `<time>` `<reminder>`');
    let time, text;
    for(let i = 1; i <= data.params.length; i++) {
        try {
            time = timestring(data.params.slice(0, i).join(' '));
        } catch(e) {
            text = data.params.slice(i - 1).join(' ');
            break;
        }
    }
    if(!time || time <= 0 || !text) return data.reply('Please input: `<time>` `<reminder>`');
    reminderData.trans('reminders', reminders => {
        reminders.push({ time: Date.now() + time * 1000, text, creator: data.userID, channel: data.channel });
        return reminders;
    });
    data.reply('Reminder set!');
};

const unitAliases = {
    'mile': 'mi',
    'miles': 'mi',
    'foot': 'ft',
    'feet': 'ft',
    'inch': 'in',
    'inches': 'in',
    'meter': 'm',
    'meters': 'm',
    'kilometer': 'km',
    'kilometers': 'km',
    'centimeter': 'cm',
    'centimeters': 'cm',
    'millimeter': 'mm',
    'millimeters': 'mm',
    'celsius': 'C',
    'fahrenheit': 'F',
    'yard': 'yd',
    'yards': 'yd',
    'second': 's',
    'seconds': 's',
    'minute': 'min',
    'minutes': 'min',
    'hr': 'h',
    'hour': 'h',
    'hours': 'h',
    'day': 'd',
    'days': 'd',
    'weeks': 'week',
    'months': 'month',
    'years': 'year',
    'ounce': 'oz',
    'ounces': 'oz',
    'gram': 'g',
    'grams': 'g',
    'mph': 'm/h',
    'kmph': 'km/h',
    'kmh': 'km/h'
};

// let lastTonightQuestion = 0;

module.exports = {
    commands: _commands,
    /*listen: async function(data) {
        if(Date.now() - lastTonightQuestion < 1000 * 60 * 20) return; // 20 minute refresh
        if(!['86915384589967360','279534591075680257','345320472055119883','209177876975583232']
            .includes(data.channel)) return;
        if(!/(to|2)ni(gh)?te?/gi.test(data.message)) return;
        if(/((to|2)ni(gh)?te?),? (at|in)/gi.test(data.message)) return;
        if(/1?\d:\d\d/gi.test(data.message)) return;
        if(/(one|two|three|four|five|six|seven|eight|nine|\d+) (hour|minute)/gi.test(data.message)) return;
        if(/(when|what time)( i|'|’)s ((to|2)ni(gh)?te?)/.test(data.message)) return;
        data.messageObject.channel.sendTyping();
        await util.wait(1500);
        data.reply('When is **tonight**?');
        lastTonightQuestion = Date.now();
    },*/
    tick: async () => {
        let now = Date.now();
        let reminders = reminderData.get('reminders').slice(0);
        for(let i = 0; i < reminders.length; i++) {
            let { time, channel, creator, text } = reminders[i];
            if(time <= now) {
                reminderData.trans('reminders', r => {
                    r.splice(i, 1);
                    return r;
                });
                discord.sendMessage(channel, `<@!${creator}> ${text}`);
            }
        }
    },
    help: {
        earliest: ['Get the time and date of the earliest recorded message'],
        me: ['Make D-Bot narrate your life', 'is eating cotton candy'],
        youtube: ['Grab a random YouTube video from the chat log'],
        time: ['Get everybody\'s local time, or assign a timezone to yourself', 'Eastern'],
        convert: ['Convert all kinds of units!', '3 km to miles']
    }
};
