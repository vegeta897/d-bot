// Addon manager
var fs = require('fs');
var path = require('path');
var requireUncached = require('require-uncached');
var util = require('./util.js');
var config = require('./config.js');
var discord = require('./discord.js');

const prefixes = config.prefixes;

var addons = {}; // Addon name -> Addon module
var commands = {}; // Command name -> Addon name
var msgListeners = []; // Addon names
var tickers = []; // Addon names
var help = {}; // Command reference

//var commandAttempts = {}; // Tracking unknown command attempts to offer help when needed

scanAddons();

setInterval(function tick() {
    for(let i = 0; i < tickers.length; i++) {
        addons[tickers[i]].tick();
    }
}, 1000);

function scanAddons() {
    // Clear all addons
    for(var aKey in addons) {
        if(!addons.hasOwnProperty(aKey)) continue;
        delete addons[aKey];
    }
    var addonFiles = fs.readdirSync(__base+'addons');
    addonFiles.forEach(function(add) {
        if(path.extname(add) !== '.js') return;
        var addonName = path.basename(add,'.js');
        loadAddon(addonName);
    });
}

function loadAddon(name) {
    var addon = requireUncached(__base+'addons/'+name+'.js');
    if(addons[name] && addons[name].unload) addons[name].unload(); // If addon already loaded and needs to be unloaded
    addons[name] = addon;
    for(var cKey in addon.commands) {
        if(!addon.commands.hasOwnProperty(cKey)) continue;
        if(commands[cKey] && commands[cKey] !== name) {
            console.error(`Addon "${name}" tried to add command "${cKey}" already added by addon "${commands[cKey]}"`);
            continue;
        }
        commands[cKey] = name;
    }
    for(var hKey in addon.help) {
        if(!addon.help.hasOwnProperty(hKey)) continue;
        help[hKey] = { desc: addon.help[hKey][0], examples: [] };
        for(var h = 1; h < addon.help[hKey].length; h++) {
            help[hKey].examples.push(addon.help[hKey][h]);
        }
    }
    util.findAndRemove(name, msgListeners);
    util.findAndRemove(name, tickers);
    if(addon.listen) msgListeners.push(name);
    if(addon.tick) tickers.push(name);
}

function reload(name, channel) {
    if(name) {
        try {
            loadAddon(name);
            discord.sendMessage(channel, `Successfully reloaded addon \`${name}\``);
        }
        catch(e) {
            console.log(e);
            discord.sendMessage(channel, `Couldn't load addon \`${name}\`, see log for details`);
        }
    } else {
        scanAddons();
    }
}

function generateHelpMessage() {
    var msg = '__D-Bot Command List__';
    msg += '\nCommands can be activated with ' + prefixes.map(p => '`'+p+'`').join(' or ');
    msg = [msg]; // Convert to array to handle splitting message if necessary
    for(var hKey in help) {
        if(!help.hasOwnProperty(hKey)) continue;
        var command = '\n**' + hKey + '** - ' + help[hKey].desc;
        if(help[hKey].examples[0]) command += ' — _ex._ ' + help[hKey].examples.map(
            e => `\`${prefixes[0] + hKey} ${e}\``
        ).join(' ');
        if(msg[msg.length-1].length + command.length > 2000) {
            msg.push('*(continued)*' + command);
        } else {
            msg[msg.length-1] += command;
        }
    }
    return msg;
}

module.exports = {
    readMessage(user, userID, channelID, message, rawEvent) {
        var isPM = discord.bot.directMessages[channelID];
        var server = isPM ? false : discord.bot.channels[channelID].guild_id;
        var msgData = { 
            channel: channelID, server, user, userID, isPM, message, rawEvent,
            nick: server ? (discord.bot.servers[server].members[userID].nick || user) : user,
            mention: '<@!' + userID + '>', words: message.toLowerCase().split(' '),
            reply: msg => discord.sendMessage(channelID, msg)
        };
        if(prefixes.indexOf(message[0]) >= 0 && message[1] !== ' ') { // Command
            var command = message.substring(1, message.length).split(' ')[0].toLowerCase();
            msgData.command = command;
            var params = message.trim().split(' ');
            params.shift();
            msgData.params = params;
            msgData.paramStr = params.join(' ');
            // TODO: Implement config reloading
            if(command === 'reload' && userID === config.owner) reload(msgData.paramStr, channelID); // Reload addon
            if(command === 'help' || command === 'commands') {
                discord.sendMessages(userID, generateHelpMessage());
                if(!isPM) discord.sendMessage(channelID, 'Command list sent, check your PMs!');
            }
            if(commands[command] && (!commands[command].dev || userID === config.owner)) {
                let dataCopy = JSON.parse(JSON.stringify(msgData));
                dataCopy.reply = msgData.reply; // Function is lost on stringify
                addons[commands[command]].commands[command](dataCopy);
            }
            // else if(!commands[command]) { // Unknown command
            //     if(message[2] == '/') return; // Ignore "/r/..."
            //     if(new Date() - commandAttempts[userID] < 8000) { // If tried 2 bad commands in 8 sec
            //         discord.sendMessage(channelID,'For a list of commands, type !help');
            //     }
            //     commandAttempts[userID] = new Date();
            //     return msgData;
            // }
        }
        for(var l = 0; l < msgListeners.length; l++) {
            let dataCopy = JSON.parse(JSON.stringify(msgData));
            dataCopy.reply = msgData.reply;
            addons[msgListeners[l]].listen(dataCopy)
        }
        return msgData;
    }
};