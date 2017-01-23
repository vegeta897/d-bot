//  I am a mechanical boy
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var requireNew = require('require-new');
var VirtualUser = requireNew('./helpers/virtual-user.js');
var VirtualCustom = requireNew('./helpers/virtual-custom.js');

var virtual; // Stores current virtual session

var _commands = {};

_commands.virtual = function(data) {
    if(data.paramStr == 'profiles') return discord.sendMessage(data.channel, VirtualCustom.getProfileSummary());
    if(data.isPM) return VirtualCustom.startMaintenance(data);
    if(virtual) return discord.sendMessage(data.channel, 'Only one virtual chatter at a time!');
    var id = discord.getIDFromUsername(data.paramStr);
    var virtualParams = { 
        name: id ? discord.getUsernameFromID(id) : data.paramStr, id: id, channel: data.channel 
    };
    virtual = id ? new VirtualUser(virtualParams) : VirtualCustom.newSession(virtualParams);
    if(!virtual) return discord.sendMessage(data.channel, `I don't know anyone named "${data.paramStr}"`);
    discord.sendMessage(data.channel, virtual.pre + virtual.greeting);
    virtual.prepare();
};

function listen(data) {
    if(!virtual || virtual.done || data.channel != virtual.channel || data.message.length < 5) return;
    discord.bot.simulateTyping(data.channel);
    var response = virtual.getResponse(data);
    setTimeout(function(){
        discord.sendMessage(data.channel, virtual.pre + response, true);
    }, Math.min(2000, response.length * 25));
    virtual.responses++;
    if(virtual.responses == 6) {
        virtual.done = true;
        setTimeout(function(){
            discord.sendMessage(data.channel, virtual.pre + `I have to go now. See you later!`);
            virtual = false;
        }, 3000);
    }
}

module.exports = {
    commands: _commands,
    listen: function(data) {
        if(data.isPM && data.message) VirtualCustom.maintain(data);
        if(!data.command) listen(data);
    },
    help: {
        virtual: ['Boot up a virtual version of someone to chat with for a minute', 'vegeta897']
    }
};