//  I am a mechanical boy
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var requireNew = require('require-new');
var findHelper = requireNew('./helpers/find.js');
var FuzzySet = require('fuzzyset.js');

var virtualUser; // Stores current virtual user session

var _commands = {};

_commands.virtual = function(data) {
    if(virtualUser) return discord.sendMessage(data.channel, 'Only one virtual chatter at a time!');
    var id = discord.getIDFromUsername(data.paramStr) || data.userID;
    var name = discord.getUsernameFromID(id);
    virtualUser = {
        name: name, id: id, channel: data.channel, pre: `**Virtual ${name}**: `,
        exchanges: [], fuzzy: FuzzySet(), responses: 0
    };
    discord.sendMessage(data.channel, 
        `${virtualUser.pre}Hello! I'm _virtual ${virtualUser.name}._ Say some stuff to me, dude.`);
    setTimeout(createVirtualUser, 100);
};

function createVirtualUser() {
    var msgQuery = {};
    findHelper.addChannelQuery(msgQuery, virtualUser.channel);
    messages.wrap(messages.db.find(msgQuery).sort({time:1}), function(allMessages) {
        if(!allMessages) return discord.sendMessage(virtualUser.channel, `Can't do that, no messages logged here!`);
        for(var i = 1; i < allMessages.length; i++) {
            if(allMessages[i-1].user != virtualUser.id && allMessages[i].user == virtualUser.id) {
                virtualUser.exchanges.push([allMessages[i-1].content.toLowerCase(), allMessages[i].content]);
                virtualUser.fuzzy.add(allMessages[i-1].content.toLowerCase());
            }
        }
        if(!virtualUser.exchanges[0]) {
            discord.sendMessage(virtualUser.channel, virtualUser.pre + `Actually, never mind. I'm leaving.`);
            virtualUser = false;
        }
    });
}

function listen(data) {
    if(!virtualUser || virtualUser.done || !virtualUser.exchanges[0] 
        || data.channel != virtualUser.channel || data.message.length < 5) return;
    var matchedPrompt = virtualUser.fuzzy.get(data.message.toLowerCase());
    if(!matchedPrompt || !matchedPrompt[0]) return;
    var responses = [];
    for(var i = 0; i < virtualUser.exchanges.length; i++) {
        if(virtualUser.exchanges[i][0] == matchedPrompt[0][1]) {
            responses.push(i);
        }
    }
    var response = virtualUser.exchanges[util.pickInArray(responses)][1];
    setTimeout(function(){
        discord.sendMessage(data.channel, virtualUser.pre + response, true);
    }, Math.min(2000,response.length * 25));
    virtualUser.responses++;
    if(virtualUser.responses == 5) {
        virtualUser.done = true;
        setTimeout(function(){
            discord.sendMessage(data.channel, virtualUser.pre + `I have to go now. See you later!`);
            virtualUser = false;
        }, 3000);
    }
}

module.exports = {
    commands: _commands,
    listen: function(data) {
        if(!data.command) listen(data);
    },
    help: {
        virtual: ['Boot up a virtual version of someone to chat with for a minute', 'vegeta897']
    }
};