// Traversing old messages with !before and !after
var util = require('./../core/util.js');
var messages = require(__base+'core/messages.js');
var requireUncached = require('require-uncached');
var findHelper = requireUncached('./helpers/find.js');

var contexts = {};

async function getContext(data, direction) {
    if(data.params.length === 0) {
        if(!contexts[data.channel]) return data.reply('Please specify a search string');
        traverse(data.channel, direction, data.reply);
    } else {
        var params = findHelper.parseParams(data.params);
        var command = { query: { content: util.regExpify(params.string) }, limit: params.limit };
        findHelper.addChannelQuery(command.query, data.channel);
        let contextMessages = await messages.cursor(db => db.cfind(command.query).sort({time:-1}).limit(command.limit));
        if(!contextMessages) return data.reply(`No messages found matching _${params.string}_`);
        var foundMessage = contextMessages[contextMessages.length - 1];
        contexts[data.channel] = {
            pivotMessage: foundMessage,
            first: foundMessage.time, last: foundMessage.time
        };
        traverse(data.channel, direction, data.reply);
    }
}

async function traverse(channel, direction, reply) {
    var findOptions = { channel: contexts[channel].pivotMessage.channel };
    var sortDir = 1;
    if(direction === 'before') {
        findOptions.time = { $lt: contexts[channel].first };
        sortDir = -1;
    } else {
        findOptions.time = { $gt: contexts[channel].last };
    }
    let contextMessages = await messages.cursor(db => db.cfind(findOptions).sort({time:sortDir}).limit(3));
    if(!contextMessages) return reply(`No messages found ${direction} that`);
    // Include pivot message if found from a search and message is older than a day
    if(contexts[channel].first === contexts[channel].last && contexts[channel].pivotMessage
        && Date.now() - contexts[channel].pivotMessage.time > 3600000) {
        contextMessages.unshift(contexts[channel].pivotMessage);
    }
    if(direction === 'before') {
        contextMessages.reverse();
        contexts[channel].first = contextMessages[0].time;
    } else {
        contexts[channel].last = contextMessages[contextMessages.length-1].time;
    }
    let contextSummary = '';
    for(let message of contextMessages) {
        contextSummary += findHelper.formatMessage(message, 0, true) + '\n';
    }
    contextSummary.slice(0,-2); // Remove last newline
    reply(contextSummary, true);
}

var _commands = {};
_commands.before = data => getContext(data, 'before');
_commands.after = data => getContext(data, 'after');

module.exports = {
    commands: _commands,
    help: {
        after: ['Like the `find` command, but includes the next 3 messages for context (Use again without parameters to show more context)','cookies','4 soda'],
        before: ['Like the `after` command, but shows previous messages instead']
    }
};
