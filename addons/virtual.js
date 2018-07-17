//  I am a mechanical boy
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var requireUncached = require('require-uncached');
var VirtualUser = requireUncached('./helpers/virtual-user.js');
var VirtualCustom = requireUncached('./helpers/virtual-custom.js');

var virtual; // Stores current virtual session

var _commands = {};

_commands.virtual = function(data) {
    if(data.paramStr === 'profiles') return data.reply(VirtualCustom.getProfileSummary());
    if(data.isPM) return VirtualCustom.startMaintenance(data);
    if(virtual) return data.reply('Only one virtual chatter at a time!');
    var id = discord.getIDFromUsername(data.paramStr);
    var virtualParams = {
        name: id ? discord.getUsernameFromID(id) : data.paramStr, id: id, channel: data.channel
    };
    virtual = id ? new VirtualUser(virtualParams) : VirtualCustom.newSession(virtualParams);
    if(!virtual) return data.reply(`I don't know anyone named "${data.paramStr}"`);
    data.reply(virtual.pre + virtual.greeting);
    virtual.prepare();
};

function listen(data) {
    if(!virtual || !virtual.ready || virtual.done || data.channel !== virtual.channel || data.message.length < 5) return;
    discord.bot.simulateTyping(data.channel);
    virtual.responses++;
    var response = virtual.getResponse(data);
    if(response) setTimeout(function(){
        data.reply(virtual.pre + response, true);
    }, Math.max(300, Math.min(2000, response.length * 30)));
    else virtual.responses = 6;
    if(virtual.responses === 6) {
        virtual.done = true;
        setTimeout(function(){
            data.reply(virtual.pre + virtual.goodbye);
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
        virtual: ['Boot up a virtual version of someone to chat with for a minute', '$user']
    }
};
