// Find out who has used a word or phrase the most
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');

var _commands = {};

_commands.king = function(data) {
    if(!data.paramStr.length) return data.reply('Please specify a word or phrase');
    let kingRX = util.regExpify(data.paramStr);
    messages.wrap(messages.db.find({ content: kingRX }), allMessages => {
        if(!allMessages) return data.reply(`Nobody is the king of _${data.paramStr}_`);
        var rankings = new Map();
        for(let { content: text, user } of allMessages) {
            var occurrences = util.getRegExpMatches(text, kingRX).length;
            if(occurrences === 0) continue;
            rankings.set(user, (rankings.get(user) || 0) + occurrences);
        }
        let kingCount = 0;
        let kings = [];
        rankings.forEach((count, user) => {
            if(count > kingCount) {
                kingCount = count;
                kings = [user];
            } else if(count === kingCount) kings.push(user);
        });
        let userList = kings.map(u => discord.getUsernameFromID(u) || '<Missing User>');
        if(kings.length > 1) userList = userList.slice(0, userList.length - 1).join(', ') + ', and ' + userList.pop();
        var message = `The kings of _${data.paramStr}_ are **${userList}**, who each said it **`;
        if(kings.length === 1) message = `The king of _${data.paramStr}_ is **${userList[0]}**, who said it **`;
        message += kingCount.toLocaleString() + '** time' + (kingCount > 1 ? 's' : '');
        data.reply(message, true);
    });
};

_commands.regicide = function(data) { // Find words that have changed kings the most
    messages.wrap(messages.db.find().sort({ time: 1 }), allMessages => {
        if(!allMessages) return data.reply(`No messages in database`);
        let dictionary = new Map();
        for(let { content: text, user } of allMessages) {
            let words = util.getRegExpMatches(text.toLowerCase(), util.regExpify('\\S+', true));
            if(!words || words.length === 0 || !words[0]) continue;
            for(let word of words) {
                if(!dictionary.has(word)) dictionary.set(word, { overthrows: 0, users: new Map() });
                let users = dictionary.get(word).users;
                let newCount = (users.get(user) || 0) + 1;
                users.set(user, newCount);
                if(users.size === 1) continue;
                if(Array.from(users).every(([u, c]) => u === user || c + 1 === newCount)) {
                    dictionary.get(word).overthrows++;
                }
            }
        }
        let overthrows = Array.from(dictionary).sort((a, b) => b[1].overthrows - a[1].overthrows);
        overthrows.length = Math.min(overthrows.length, 15);
        data.reply(`__Most contested king words__\n` +
            overthrows.map(o => `${o[1].overthrows} overthrows — **${o[0]}**`).join('\n'));
    });
};

module.exports = {
    commands: _commands,
    help: {
        king: ['Find the "king" of a word or phrase', 'candy']
    }
};