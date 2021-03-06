// Counts messages and words for all members
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var DateFormat = require('dateformat');

var _commands = {};

_commands.members = function(data) {
    let message;
    if(data.params[0] === 'joined') {
        message = '**Members sorted by join date**';
        let members = discord.bot.servers[data.server].members;
        Object.keys(members)
            .sort((a, b) => members[a].joined_at - members[b].joined_at)
            .forEach(member => {
                member = members[member];
                let timestamp = DateFormat(new Date(member.joined_at), 'mmm dS, yyyy - h:MM:ss TT') + ' EST';
                message += `\n${timestamp} - **${member.nick || member.username}**`;
        });
        return data.reply(message);
    }
    messages.wrap(messages.db.find(),function(allMessages) {
        if(!allMessages) return;
        var members = {};
        for(let { content, user } of allMessages) {
            if(!members[user]) members[user] = { msgCount: 0, wordCount: 0 };
            members[user].msgCount += 1;
            members[user].wordCount += content.split(' ').length;
        }
        message = '**Members sorted by message count**';
        for(let memberID of Object.keys(members).sort((a, b) => members[b].msgCount - members[a].msgCount)) {
            if(!discord.getUsernameFromID(memberID)) continue;
            message += '\n**' + discord.getUsernameFromID(memberID) + '** — ' +
                members[memberID].msgCount.toLocaleString() + ' messages - ' +
                members[memberID].wordCount.toLocaleString() + ' words';
        }
        data.reply(message);
    });
};

module.exports = {
    commands: _commands,
    help: {
        members: ['Get member statistics', 'messages', 'joined']
    }
};