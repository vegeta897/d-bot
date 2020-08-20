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
const wiki = require('wikijs').default({ apiUrl: 'https://commons.wikimedia.org/w/api.php' });

const timeData = storage.json('time', { zoneUsers: {} }, '\t');
const reminderData = storage.json('reminders', { reminders: [] }, '\t');

const _commands = {};

_commands.me = data => {
    discord.bot.deleteMessage(data.channel, data.messageID, 'Consumed /me command');
    data.reply(`_${data.user} ${data.paramStr}_`);
};

_commands.echo = data => data.reply(data.paramStr);

_commands.channelsay = data => {
    let guildID = discord.bot.channelGuildMap[data.params[0]];
    if(!guildID) {
        return data.reply('Invalid channel');
    }
    let message = data.params.slice(1).join(' ');
    if(message.trim() === '') {
        return data.reply('Message can\'t be blank');
    }
    discord.bot.guilds.get(guildID).channels.get(data.params[0]).createMessage(message)
};

_commands.earliest = async data => {
    let firstMessage = await messages.cursor(db => db.cfind().sort({ time: 1 }).limit(1));
    data.reply(`Earliest message logged was on ` +
        DateFormat(new Date(firstMessage[0].time), 'mmmm dS, yyyy "at" h:MM:ss TT') + ' EST');
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
    for(let tz of Object.keys(timezones).sort((a, b) => now.tz(timezones[a]).format('ZZ') - now.tz(timezones[b]).format('ZZ'))) {
        if(!zoneUsers[tz] || zoneUsers[tz].length === 0) continue;
        message += `\n${now.tz(timezones[tz]).format('ddd h:mm a')} - **${tz}**`;
        message += ' - ' + zoneUsers[tz].map(u => discord.getUsernameFromID(u)).join(', ');
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

_commands.wikimage = async data => {
    let [randomPage] = await wiki.random(1);
    randomPage = await wiki.page(randomPage);
    let image = await randomPage.mainImage();
    data.reply(image);
};

const impureWords = ['fuck', 'fucks', 'fucking', 'fucked', 'fucker', 'feck', 'shit', 'shite', 'shat', 'shits',
    'ass', 'asses', 'jackass', 'dumbass', 'shithead', 'shitty', 'damn' ,'damnit', 'dammit', 'damned', 'dick',
    'cock', 'motherfuck' ,'motherfucker', 'asshole', 'pussy', 'cunt', 'twat', 'bitch', 'bitching'];

_commands.pure = async data => {
    let userMessages = await messages.cursor(db => db.cfind({ user: data.userID }));
    let pureCount = 0;
    let impureCount = 0;
    for(let message of userMessages) {
        for(let word of message.content.split(' ')) {
            if(word.trim() === '') continue;
            if(impureWords.includes(word.toLowerCase())) impureCount++;
            else pureCount++;
        }
    }
    data.reply(`You're **${+(100 * pureCount / (pureCount + impureCount)).toFixed(2)}%** pure.`)
};

const dotaHeroes = ['Phantom Lancer','Tiny','Undying','Bristleback','Treant Protector','Broodmother','Lycan','Ogre Magi','Gyrocopter','Snapfire','Riki','Terrorblade','Witch Doctor','Nature\'s Prophet','Kunkka','Wraith King','Slardar','Slark','Razor','Pangolier','Bounty Hunter','Sven','Dragon Knight','Lich','Ursa','Death Prophet','Axe','Anti-Mage','Crystal Maiden','Luna','Mirana','Nyx Assassin','Monkey King','Spirit Breaker','Vengeful Spirit','Juggernaut','Doom','Night Stalker','Dazzle','Jakiro','Batrider','Bloodseeker','Beastmaster','Ancient Apparition','Dark Willow','Tidehunter','Sand King','Disruptor','Outworld Devourer','chaos Knight','Centaur Warrunner','Abaddon','Venomancer','Viper','Zeus','Winter Wyvern','Windranger','Lion','Grimstroke','Keeper of the Light','Earthshaker','Leshrac','Lifestealer','Tusk','Void Spirit','Tinker','Silencer','Shadow Demon','Shadow Shaman','Lina','Sniper','Mars','Omniknight','Drow Ranger','Magnus','Phantom Assassin','Phoenix','Enchantress','Pudge','Faceless Void','Shadow Fiend','Alchemist','Weaver','Clockwerk','Pugna','Enigma','Huskar','Underlord','Elder Titan','Puck','Bane','Chen','Dark Seer','Visage','Warlock','Techies','Invoker','Rubick','Oracle','Necrophos','Storm Spirit','Skywrath Mage','Queen of Pain','Meepo','Io','Naga Siren','Troll Warlord','Brewmaster','Legion Commander','Medusa','Clinkz','Arc Warden','Ember Spirit','Morphling','Earth Spirit','Timbersaw','Lone Druid','Templar Assassin','Spectre'];
_commands.hero = async data => {
    data.reply(util.pickInArray(dotaHeroes));
};

const request = require('request');

_commands.imgtest = async data => {
    request.get({ url: 'https://i.imgur.com/mXzHIk0.jpg', encoding:null }, (err, res, body) => {
        if(err) return console.log(err);
        discord.uploadFile({
            to: data.channel,
            filename: 'test.jpg',
            file: body
        })
    });
};

_commands.g = async data => {
    if(data.paramStr.trim() === 'th' && data.userID === '86928421359198208') data.reply('Done.');
};

_commands.msgtest = async data => {
    data.messageObject.channel.createMessage(`Sorry, I couldn't find that ${undefined}.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
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
