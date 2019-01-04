// Helping people who can't read history
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');
var storage = require(__base+'core/storage.js');
var requireUncached = require('require-uncached');
var findHelper = requireUncached('./helpers/find.js');

var subs = storage.json('subscriptions', {}, '\t');

var _commands = {};

_commands.mentions = async function(data) {
    // Change subscription
    if(data.paramStr.toLowerCase().includes('sub')) {
        var channel = data.params[1] && data.params[1].toLowerCase() == 'all' ? 'all' : data.channel;
        var result;
        if(data.paramStr.toLowerCase().includes('un')) result = removeSub(data.userID, channel);
        else result = addSub(data.userID, channel);
        subs.save();
        return data.reply(result);
    }
    // Get mentions
    var mCount = Math.min(25,parseInt(data.params[0]));
    if(!mCount) {
        data.reply('Please provide the number of mentions to retrieve, eg. `/mentions 3`');
        return;
    }
    var rx = new RegExp('<@!?' + data.userID + '>','g');
    var query = {content: rx};
    findHelper.addChannelQuery(query, data.channel);
    let mentionMessages = await messages.cursor(db => db.cfind(query).limit(mCount).sort({time: -1}));
    if(!mentionMessages) return data.reply(`Sorry, I don't have any record of you being mentioned.`);
    data.reply(mentionMessages.reverse().reduce((recap, msg) => recap + '\n' + findHelper.formatMessage(msg),
        `__Your last ${mentionMessages.length}mentions__`), true);
};

function addSub(id, channel) {
    if(!subs.get(id)) subs.set(id, []);
    if(subs.get(id) === 'all') {
        return 'You are already subscribed to all channels.';
    }
    if(channel === 'all') {
        subs.set(id, 'all');
        return 'You are now subscribed to mentions in all channels.';
    }
    if(subs.get(id).includes(channel)) {
        return 'You are already subscribed to this channel.';
    }
    subs.get(id).push(channel);
    return 'You are now subscribed to mentions in this channel.';
}

function removeSub(id, channel) {
    if(!subs.get(id)) return `You aren't subscribed to any channel!`;
    if(channel === 'all') {
        subs.delete(id);
        return 'You have unsubscribed from all channels.';
    }
    if(subs.get(id) !== 'all' && !subs.get(id).includes(channel)) {
        return `You aren't subscribed to this channel!`;
    }
    if(subs.get(id) === 'all') {
        var server = discord.bot.channelGuildMap[channel];
        subs.set(id, Array.from(discord.bot.guilds.get(server).channels.keys())); // Add all channels
        config.privateChannels.forEach(function(elem) {
            util.findAndRemove(elem, subs.get(id)); // Remove private channels
        });
    }
    util.findAndRemove(channel, subs.get(id));
    if(subs.get(id).length === 0) subs.delete(id);
    return 'You have unsubscribed from this channel.';
}

module.exports = {
    commands: _commands,
    listen: function(data) {
        data.messageObject.mentions.forEach(function(mention) {
            if(config.privateChannels.includes(data.channel)) return;
            if(!subs.get(mention.id)) return;
            if(subs.get(mention.id) !== 'all' && !subs.get(mention.id).includes(data.channel)) return;
            var userStatus = data.messageObject.guild.members.get(mention.id).status;
            if(userStatus && userStatus !== 'offline') return;
            var pm = `**${data.user}** mentioned you!\n` + findHelper.formatMessage({
                    user: data.userID, time: data.messageObject.timestamp, content: data.message
                }, 0, true);
            discord.sendMessage(mention.id, pm, true);
        });
    },
    help: {
        mentions: ['Get your last X recorded mentions, or subscribe to your mentions in a channel to have D-Bot PM you when you receive one while offline', '3', 'sub', 'sub all', 'unsub']
    }
};
