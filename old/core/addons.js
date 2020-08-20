// Addon manager
var fs = require('fs');
var path = require('path');
var requireUncached = require('require-uncached');
var util = require('./util.js');
var config = require('./config.js');
var discord = require('./discord.js');

const prefixes = config.prefixes;

// TODO: Replace objects with maps
var addons = new Map(); // Addon name -> Addon module
var commands = new Map(); // Command name -> Addon name
var msgListeners = []; // Addon names
var reactListeners = []; // Addon names
var tickers = []; // Addon names
var help = {}; // Command reference

discord.commands = commands; // For addons to access full list of commands

//var commandAttempts = {}; // Tracking unknown command attempts to offer help when needed

//scanAddons();

setInterval(function tick() {
    for(let ticker of tickers) {
        let ticked = addons.get(ticker).tick();
        if(ticked && ticked.catch) {
            ticked.catch(err => console.error(`Error: ${ticker} ticking`, err));
        }
    }
}, 1000);

function scanAddons() {
    addons.clear(); // Clear all addons
    let addonFiles = fs.readdirSync(__base+'addons');
    addonFiles.forEach(function(add) {
        if(path.extname(add) !== '.js') return;
        var addonName = path.basename(add,'.js');
        loadAddon(addonName);
    });
}

function loadAddon(name) {
    var addon = requireUncached(__base+'addons/'+name+'.js');
    // If addon already loaded and needs to be unloaded
    if(addons.has(name) && addons.get(name).unload) addons.get(name).unload();
    addons.set(name, addon);
    for(var cKey in addon.commands) {
        if(!addon.commands.hasOwnProperty(cKey)) continue;
        if(commands.has(cKey) && commands.get(cKey) !== name) {
            console.error(`Addon "${name}" tried to add command "${cKey}" already added by "${commands.get(cKey)}"`);
            continue;
        }
        commands.set(cKey, name);
    }
    for(var hKey in addon.help) {
        if(!addon.help.hasOwnProperty(hKey)) continue;
        help[hKey] = { desc: addon.help[hKey][0], examples: [] };
        for(var h = 1; h < addon.help[hKey].length; h++) {
            help[hKey].examples.push(addon.help[hKey][h]);
        }
    }
    util.findAndRemove(name, msgListeners);
    util.findAndRemove(name, reactListeners);
    util.findAndRemove(name, tickers);
    if(addon.listen) msgListeners.push(name);
    if(addon.react) reactListeners.push(name);
    if(addon.tick) tickers.push(name);
}

function reload(name, reply) {
    if(name) {
        try {
            loadAddon(name);
            reply(`Successfully reloaded addon \`${name}\``);
        }
        catch(e) {
            console.log(e);
            reply(`Couldn't load addon \`${name}\`, see log for details`);
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

// TODO: Refactor project files, give each addon its own folder

module.exports = {
    scanAddons,
    readMessage(message) {
        let { author, channel, content, id, attachments, member } = message;
        let isWebhook = author.discriminator === '0000';
        let isPM = !channel.guild;
        let server = isPM ? false : channel.guild;
        let msgData = {
            channel: channel.id, server, user: author.username, userID: author.id, isWebhook, isPM,
            message: content, messageID: id, messageObject: message,
            attachments: attachments.length > 0 ? attachments.map(a => a.url) : null,
            nick: member && member.nick || author.username,
            mention: '<@!' + author.id + '>', words: content.toLowerCase().split(' '),
            reply: (msg, polite, cb) => discord.sendMessage(isPM ? author.id : channel.id, msg, polite, cb)
        };
        if(prefixes.includes(content[0]) && content[1] !== ' ') { // Command
            let command = content.substring(1, content.length).split(' ')[0].toLowerCase();
            msgData.paramStr = content.substring(command.length + 2, content.length);
            msgData.command = command;
            let params = util.getRegExpMatches(content.trim(), /"(.*?)"|(\S+)/gi);
            params.shift();
            msgData.params = params;
            // TODO: Implement config reloading
            if(command === 'reload' && author.id === config.owner) reload(msgData.paramStr, msgData.reply); // Reload addon
            // TODO: Better module reloading?
            // delete require.cache[require.resolve(`./${msgData.paramStr}.js`)];
            if(command === 'help' || command === 'commands') {
                discord.sendMessages(author.id, generateHelpMessage()
                    .map(msg => msg.replace(/\$user/g, author.username)));
                if(!isPM) discord.sendMessage(channel.id, 'Command list sent, check your PMs!');
            }
            let addon = addons.get(commands.get(command));
            if(addon && (!addon.dev || author.id === config.owner)) {
                let commanded = addon.commands[command](Object.assign({}, msgData));
                msgData.consumed = true; // Command has triggered an addon
                if(commanded && commanded.catch) commanded.catch(err => console.error(`Error: ${command} command`, err));
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
        for(let listener of msgListeners) {
            if(!addons.get(listener).dev || author.id === config.owner) {
                let listened = addons.get(listener).listen(Object.assign({}, msgData));
                if(listened && listened.catch) {
                    listened.catch(err => console.error(`Error: ${listener} message listener`, err));
                }
            }
        }
        return !!msgData.command;
    },
    seeReaction(message, emoji, userID, removed) {
        for(let listener of reactListeners) {
            if(!addons.get(listener).dev || userID === config.owner) {
                let reacted = addons.get(listener).react(message, emoji, userID, removed);
                if(reacted && reacted.catch) {
                    reacted.catch(err => console.error(`Error: ${listener} reaction listener`, err));
                }
            }
        }
    }
};
