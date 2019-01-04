// Counts messages and words for all members
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var DateFormat = require('dateformat');

var _commands = {};

_commands.members = async function(data) {
    let message;
    if(data.params[0] === 'joined') {
        message = '**Members sorted by join date**';
        let members = Array.from(data.messageObject.channel.guild.members.values());
        members.sort((a, b) => a.joinedAt - b.joinedAt)
            .forEach(member => {
                let timestamp = DateFormat(new Date(member.joinedAt), 'mmm dS, yyyy - h:MM:ss TT') + ' EST';
                message += `\n${timestamp} - **${member.nick || member.username}**`;
        });
        return data.reply(message);
    }
    let allMessages = await messages.cursor(db => db.cfind());
    if(!allMessages) return;
    let members = new Map();
    for(let { content, user } of allMessages) {
        if(!members.has(user)) members.set(user, {
            msgCount: 0,
            wordCount: 0,
            name: discord.getUsernameFromID(user)
        });
        members.get(user).msgCount += 1;
        members.get(user).wordCount += content.split(' ').length;
    }
    let maxNameLength = 'Name'.length;
    let maxMsgCount = 'Messages'.length;
    let maxWordCount = 'Words'.length;
    let ranks = Array.from(members).sort((a, b) => b[1].msgCount - a[1].msgCount)
        .map(([memberID, member]) => {
            if(!member.name) return;
            maxNameLength = Math.max(maxNameLength, member.name.length);
            maxMsgCount = Math.max(maxMsgCount, member.msgCount.toLocaleString().length);
            maxWordCount = Math.max(maxWordCount, member.wordCount.toLocaleString().length);
            return member;
        });
    let header = 'Name'.padEnd(maxNameLength) + '   ' +
        'Messages'.padStart(maxMsgCount) + '   ' +
        'Words'.padStart(maxWordCount);
    header += '\n' + '-'.repeat(header.length);
    message = ranks.reduce((msg, member) => member && msg + '\n' +
        member.name.padEnd(maxNameLength) + '   ' +
        member.msgCount.toLocaleString().padStart(maxMsgCount) + '   ' +
        member.wordCount.toLocaleString().padStart(maxWordCount) || msg,
        '**Members sorted by message count**\n```xl\n' + header);
    message += '\n```';
    data.reply(message);
};

module.exports = {
    commands: _commands,
    help: {
        members: ['Get member statistics', 'messages', 'joined']
    }
};
