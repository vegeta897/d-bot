// Search message content or get the nth last message from somebody
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var requireUncached = require('require-uncached');
var findHelper = requireUncached('./helpers/find.js');

var _commands = {};

_commands.find = async function(data) {
    var params = findHelper.parseParams(data.params);
    if(!params) {
        data.reply('Please specify a search string');
        return;
    }
    var command = { query: { content: util.regExpify(params.string) }, limit: params.limit };
    findHelper.addChannelQuery(command.query, data.channel);
    let findResults = await messages.cursor(db => db.cfind(command.query).sort({time:-1}));
    if(!findResults) return data.reply(`No messages found matching _${params.string}_`, true);
    var msgNum = Math.min(findResults.length, params.limit);
    command.limit = Math.min(msgNum, params.limit);
    var message = findHelper.formatMessage(findResults[msgNum - 1], [msgNum, findResults.length]);
    data.reply(message, true, function(message) {
        command.responseID = message[0].id;
        lastCommands[data.channel] = command;
    });
};

_commands.last = async function(data) {
    var params = findHelper.parseParams(data.params);
    var userID = params ? discord.getIDFromUsername(params.string) : 'any';
    if(!userID) return data.reply(`That user doesn't seem to exist.`);
    var command = { query: { user: userID }, limit: params.limit || 1 };
    if(userID === 'any') delete command.query.user;
    findHelper.addChannelQuery(command.query, data.channel);
    let userMessages = await messages.cursor(db => db.cfind(command.query).sort({time:-1}));
    if(!userMessages) return data.reply(`No messages found from **${params.string}**`, true);
    var msgNum = Math.min(userMessages.length, params.limit || 1);
    command.limit = Math.min(msgNum, params.limit || 1);
    var message = findHelper.formatMessage(userMessages[msgNum - 1], [msgNum, userMessages.length]);
    data.reply(message, true, function(message) {
        command.responseID = message[0].id;
        lastCommands[data.channel] = command;
    });
};

_commands.skip = async function(data) {
    var lastCommand = lastCommands[data.channel];
    if(!lastCommand) return data.reply('The `skip` command must be used after `find` or `last`');
    let skip = data.params[0];
    if(!skip) skip = ['1'];
    if(skip != parseInt(skip)) return data.reply('Skip number must be an integer, you silly');
    lastCommand.limit += +skip;
    let findResults = await messages.cursor(db => db.cfind(lastCommand.query).sort({time:-1}));
    if(!findResults) return data.reply(`Something went very wrong! Tell Vegeta`);
    var msgNum = Math.min(findResults.length, lastCommand.limit);
    var message = findHelper.formatMessage(findResults[msgNum - 1], [msgNum, findResults.length]);
    discord.editMessage(data.channel, lastCommand.responseID, message, true,
        // Delete skip command after edit complete
        () => discord.bot.deleteMessage(data.channel, data.messageID, 'Consumed /skip command'));
};

_commands.mentioned = async function(data) {
    if(data.params.length < 2) return data.reply('Specify the `from` and `mentioned` user IDs');
    let from = data.params[0];
    let mentioned = data.params[1];
    let mentions = await messages.cursor(db => db.cfind({user: from, content: new RegExp(mentioned, 'g') }).sort({time:-1}));
    if(!mentions) return data.reply(`No messages found from **${from}** that mention **${mentioned}**`, true);
    data.reply(mentions.length);
};

var lastCommands = {}; // Store last command per channel, so skip command can be used

module.exports = {
    commands: _commands,
    help: {
        find: ['Find the last message containing a string (include a number to find the Nth last message)',
            'chocolate','6 pretzels'],
        last: ['Find the last message sent by a user (username, not nickname)', '$user', '3 $user'],
        skip: ['Change the last used `find` or `last` command to skip the desired number of messages (relative)']
    }
};
