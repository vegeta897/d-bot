// Traversing old messages with !before and !after
var util = require('./../core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var requireNew = require('require-new');
var findHelper = requireNew('./helpers/find.js');

var contexts = {};

function getContext(data, direction) {
    if(data.params.length == 0) {
        if(!contexts[data.channel]) return discord.sendMessage(data.channel, 'Please specify a search string');
        traverse(data.channel,direction);
    } else {
        var params = findHelper.parseParams(data.params);
        var command = { query: { content: util.regExpify(params.string) }, limit: params.limit };
        findHelper.addChannelQuery(command.query, data.channel);
        messages.wrap(messages.db.find(command.query).sort({time:-1}).limit(command.limit), function(results) {
            if(!results) return discord.sendMessage(data.channel, 'Couldn\'t find any messages matching _' +
                params.string + '_');
            var foundMessage = results[results.length-1];
            contexts[data.channel] = {
                pivotMessage: foundMessage,
                first: foundMessage.time, last: foundMessage.time
            };
            traverse(data.channel,direction)
        });
    }
}

function traverse(channel, direction) {
    var findOptions = { channel: contexts[channel].pivotMessage.channel };
    var sortDir = 1;
    if(direction == 'before') {
        findOptions.time = { $lt: contexts[channel].first };
        sortDir = -1;
    } else {
        findOptions.time = { $gt: contexts[channel].last };
    }
    messages.wrap(messages.db.find(findOptions).sort({time:sortDir}).limit(3), function(results) {
        if(!results) {
            discord.sendMessage(channel,'Sorry, couldn\'t find any messages ' + direction + ' that');
            return;
        }
        if(contexts[channel].pivotMessage) {
        }
        // Include pivot message if found from a search and message is older than a day
        if(contexts[channel].first == contexts[channel].last && contexts[channel].pivotMessage
            && new Date().getTime() - contexts[channel].pivotMessage.time > 3600000) {
            results.unshift(contexts[channel].pivotMessage);
        }
        if(direction == 'before') {
            results.reverse();
            contexts[channel].first = results[0].time;
        } else {
            contexts[channel].last = results[results.length-1].time;
        }
        var contextSummary = '';
        for(var m = 0; m < results.length; m++) {
            contextSummary += findHelper.formatMessage(results[m], 0, true) + '\n';
        }
        contextSummary.slice(0,-2); // Remove last newline
        discord.sendMessage(channel, contextSummary, true);
    });
}

var _commands = {};
_commands.before = function(data) {
    getContext(data,'before');
};
_commands.after = function(data) {
    getContext(data,'after');
};

module.exports = {
    commands: _commands,
    help: {
        after: ['Like the `find` command, but includes the next 3 messages for context (Use again without parameters to show more context)','cookies','4 soda'],
        before: ['Like the `after` command, but shows previous messages instead']
    }
};