// Helping people who can't read history
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');
var storage = require(__base+'core/storage.js');
var requireNew = require('require-new');
var findHelper = requireNew('./helpers/find.js');

var subsStorage = storage.json('subscriptions');
var subs = subsStorage.data;

var _commands = {};

_commands.mentions = function(data) {
    // Change subscription
    if(data.paramStr.toLowerCase().includes('sub')) {
        var channel = data.params[1] && data.params[1].toLowerCase() == 'all' ? 'all' : data.channel;
        var result;
        if(data.paramStr.toLowerCase().includes('un')) result = removeSub(data.userID, channel);
        else result = addSub(data.userID, channel);
        subsStorage.save();
        return discord.sendMessage(data.channel, result);
    }
    // Get mentions
    var mCount = Math.min(25,parseInt(data.params[0]));
    if(!mCount) {
        discord.sendMessage(data.channel, 'Please provide the number of mentions to retrieve, eg. `/mentions 3`');
        return;
    }
    var rx = new RegExp('<@!?' + data.userID + '>','g');
    var query = {content: rx};
    findHelper.addChannelQuery(query, data.channel);
    messages.wrap(messages.db.find(query).limit(mCount).sort({time: -1}), function(results) {
        if(!results) return discord.sendMessage(data.channel, 'Sorry, I don\'t have any record of you being mentioned.');
        var mentionRecap = '__Your last ' + results.length + 'mentions__';
        results.reverse();
        for(var m = 0; m < results.length; m++) {
            mentionRecap += '\n' + findHelper.formatMessage(results[m]);
        }
        discord.sendMessage(data.channel, mentionRecap, true);
    });
};

function addSub(id, channel) {
    if(!subs[id]) subs[id] = [];
    if(subs[id] == 'all') {
        return 'You are already subscribed to all channels.';
    }
    if(channel == 'all') {
        subs[id] = 'all';
        return 'You are now subscribed to mentions in all channels.';
    }
    if(subs[id].includes(channel)) {
        return 'You are already subscribed to this channel.';
    }
    subs[id].push(channel);
    return 'You are now subscribed to mentions in this channel.';
}

function removeSub(id, channel) {
    if(!subs[id]) return 'You aren\'t subscribed to any channel!';
    if(channel == 'all') {
        delete subs[id];
        return 'You have unsubscribed from all channels.';
    }
    if(subs[id] != 'all' && !subs[id].includes(channel)) {
        return 'You aren\'t subscribed to this channel!';
    }
    if(subs[id] == 'all') {
        var server = discord.bot.channels[channel].guild_id;
        subs[id] = Object.keys(discord.bot.servers[server].channels); // Add all channels
        config.privateChannels.forEach(function(elem) {
            util.findAndRemove(elem, subs[id]); // Remove private channels
        });
    }
    util.findAndRemove(channel, subs[id]);
    if(subs[id].length == 0) delete subs[id];
    return 'You have unsubscribed from this channel.';
}

module.exports = {
    commands: _commands,
    listen: function(data) {
        if(!data.rawEvent.d.mentions.length) return;
        data.rawEvent.d.mentions.forEach(function(mention) {
            if(config.privateChannels.includes(data.channel)) return;
            if(!subs[mention.id]) return;
            if(subs[mention.id] != 'all' && !subs[mention.id].includes(data.channel)) return;
            var userStatus = discord.bot.servers[data.server].members[mention.id].status;
            if(userStatus && userStatus != 'offline') return;
            var pm = '**' + data.user + '** mentioned you!\n' + findHelper.formatMessage({
                    user: data.userID, time: new Date(data.rawEvent.d.timestamp).getTime(), content: data.message
                }, 0, true);
            discord.sendMessage(mention.id, pm, true);
        });
    },
    help: {
        mentions: ['Get your last X recorded mentions, or subscribe to your mentions in a channel to have D-Bot PM you when you receive one while offline', '3', 'sub', 'sub all', 'unsub']
    }
};