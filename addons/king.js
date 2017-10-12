// Find out who has used a word or phrase the most
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');

var _commands = {};

_commands.king = function(data) {
    if(!data.paramStr.length) return discord.sendMessage(data.channel, 'Please specify a word or phrase');
    discord.bot.simulateTyping(data.channel);
    var kingRX = util.regExpify(data.paramStr.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
    messages.wrap(messages.db.find({ content: kingRX }), function(allMessages) {
        if(!allMessages) return discord.sendMessage(data.channel, `Nobody is the king of _${data.paramStr}_`);
        var rankings = {};
        for(var k = 0; k < allMessages.length; k++) {
            var occurrences = allMessages[k].content.match(kingRX).length;
            if(rankings[allMessages[k].user]) {
                rankings[allMessages[k].user] += occurrences;
            } else {
                rankings[allMessages[k].user] = occurrences;
            }
        }
        var king = { count: -1 };
        for(var rKey in rankings) { if(!rankings.hasOwnProperty(rKey)) continue;
            if(rankings[rKey] > king.count) {
                king = { users: [rKey], count: rankings[rKey] };
            } else if(rankings[rKey] === king.count) {
                king.users.push(rKey);
            }
        }
        var userList = discord.getUsernameFromID(king.users[0]) || '<Missing User>';
        for(var u = 1; u < king.users.length; u++) {
            userList += (u === king.users.length-1 ? ' and ' : ' ') 
                + (discord.getUsernameFromID(king.users[u] || '<Missing User>'));
        }
        var message = `The kings of _${data.paramStr}_ are **${userList}**, who each said it **`;
        if(king.users.length === 1) message = `The king of _${data.paramStr}_ is **${userList}**, who said it **`;
        message += king.count.toLocaleString() + '** time' + (king.count > 1 ? 's' : '');
        discord.sendMessage(data.channel, message, true);
    });
};

module.exports = {
    commands: _commands,
    help: {
        king: ['Find the "king" of a word or phrase', 'candy']
    }
};