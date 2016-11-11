// Search message content or get the nth last message from somebody
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var requireNew = require('require-new');
var findHelper = requireNew('./helpers/find.js');

var _commands = {};

_commands.find = function(data) {
    var params = findHelper.parseParams(data.params);
    if(!params) {
        discord.sendMessage(data.channel, 'Please specify a search string');
        return;
    }
    discord.bot.simulateTyping(data.channel);
    var command = { query: { content: util.regExpify(params.string) }, limit: params.limit };
    findHelper.addChannelQuery(command.query, data.channel);
    messages.wrap(messages.db.find(command.query).sort({time:-1}).limit(command.limit), function(results) {
        if(!results) return discord.sendMessage(data.channel, `Couldn't find any messages matching _${params.string}_`, true);
        var message = findHelper.formatMessage(results[results.length-1], results.length-1);
        discord.sendMessage(data.channel, message, true, function(err, res) {
            command.responseID = res.id;
            lastCommands[data.channel] = command;
        });
    });
};

_commands.last = function(data) {
    var params = findHelper.parseParams(data.params);
    var userID = params ? discord.getIDFromUsername(params.string) : 'any';
    if(!userID) return discord.sendMessage(data.channel, `That user doesn't seem to exist.`);
    discord.bot.simulateTyping(data.channel);
    var command = { query: { user: userID }, limit: params.limit || 1 };
    if(userID == 'any') delete command.query.user;
    findHelper.addChannelQuery(command.query, data.channel);
    messages.wrap(messages.db.find(command.query).sort({time:-1}).limit(command.limit), function(results) {
        if(!results) return discord.sendMessage(data.channel, `Couldn't find any messages from **${params.string}**`, true);
        var message = findHelper.formatMessage(results[results.length-1], results.length-1);
        discord.sendMessage(data.channel, message, true, function(err, res) {
            command.responseID = res.id;
            lastCommands[data.channel] = command;
        });
    });
};

_commands.skip = function(data) {
    var lastCommand = lastCommands[data.channel];
    if(!lastCommand) {
        return discord.sendMessage(data.channel, 'The `skip` command must be used after `find` or `last`');
    }
    if(!data.params[0]) data.params = ['1'];
    if(data.params[0] != parseInt(data.params[0])) {
        return discord.sendMessage(data.channel, 'Skip number must be an integer, you silly');
    }
    lastCommand.limit += +data.params[0];
    messages.wrap(messages.db.find(lastCommand.query).sort({time:-1}).limit(lastCommand.limit), function(results) {
        if(!results) return discord.sendMessage(data.channel, `If you're seeing this message, something went wrong`);
        var message = findHelper.formatMessage(results[results.length-1], results.length-1);
        discord.editMessage(data.channel, lastCommand.responseID, message, true,
            // Delete skip command after edit complete
            function() { discord.bot.deleteMessage({ channelID: data.channel, messageID: data.rawEvent.d.id }); });
    });
};

var lastCommands = {}; // Store last command per channel, so skip command can be used

module.exports = {
    commands: _commands,
    help: {
        find: ['Find the last message containing a string (include a number to find the Nth last message)',
            'chocolate','6 pretzels'],
        last: ['Find the last message sent by a user (username, not nickname)', 'vegeta897', '3 vegeta897'],
        skip: ['Change the last used `find` or `last` command to skip the desired number of messages (relative)']
    }
};