// Counts messages and words for all members
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');

var _commands = {};

_commands.members = function(data) {
    messages.wrap(messages.db.find(),function(allMessages) {
        if(!allMessages) return;
        var members = {};
        for(var i = 0; i < allMessages.length; i++) {
            var msg = allMessages[i];
            if(!members[msg.user]) members[msg.user] = { msgCount: 0, wordCount: 0 };
            members[msg.user].msgCount += 1;
            members[msg.user].wordCount += msg.content.split(' ').length;
        }
        var membersArr = Object.keys(members);
        membersArr.sort(function(a,b){
            return members[b].msgCount - members[a].msgCount;
        });
        var message = '**Members sorted by message count**';
        for(var m = 0; m < membersArr.length; m++) {
            var memberID = membersArr[m];
            if(!discord.getUsernameFromID(memberID)) continue;
            message += '\n**' + discord.getUsernameFromID(memberID) + '** — ' +
                members[memberID].msgCount.toLocaleString() + ' messages - ' +
                members[memberID].wordCount.toLocaleString() + ' words';
        }
        discord.sendMessage(data.channel, message);
    });
};

module.exports = {
    commands: _commands,
    help: {
        members: ['Get message statistics from all members']
    }
};