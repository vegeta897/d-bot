// Checking server statuses
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');
var request = require('request');
var download = require('download');

var _commands = {};

// TODO: Use promises or observables

_commands.mumble = function(data) {
    if(!config.mumble || !config.mumble.email || !config.mumble.apiKey) return;
    var url = 'http://api.commandchannel.com/cvp.json?email='+ config.mumble.email +'&apiKey=' + config.mumble.apiKey;
    request(url, function(err, response, body) {
        if(err) {
            console.log(err);
            return discord.sendMessage(data.channel, 'Error getting Mumble status...');
        }
        body = JSON.parse(body);
        var status = '__**Mumble Status**__';
        var nobodyOnline = true;
        var checkChannel = function(channel) {
            if(channel.users.length > 0) {
                status += '\n  **' + channel.name + ':**';
                for(var u = 0; u < channel.users.length; u++) {
                    status += (u == 0 ? ' ' : ', ') + channel.users[u].name;
                    nobodyOnline = false;
                }
            }
            if(channel.channels.length > 0) {
                for(var sc = 0; sc < channel.channels.length; sc++) {
                    checkChannel(channel.channels[sc]);
                }
            }
        };
        checkChannel(body.root);
        if(nobodyOnline) status = 'Nobody is in Mumble :(';
        discord.sendMessage(data.channel, status);
    });
};

_commands.minecraft = function(data) {
    if(!config.minecraft || !config.minecraft.ip || !config.minecraft.port) return;
    var url = 'http://mcapi.us/server/status?ip=' + config.minecraft.ip + '&port=' + config.minecraft.port;
    request(url, function(err, response, body) {
        if(err) {
            console.log(err);
            return discord.sendMessage(data.channel, 'Error getting Minecraft server status...');
        }
        body = JSON.parse(body);
        var status = '*Minecraft server is currently offline*';
        if(body.online) {
            status = '**Minecraft** server is **online**  -  ';
            if(body.players.now) {
                status += '**' + body.players.now + '** people are playing!';
            } else {
                status += '*Nobody is playing!*';
            }
        }
        discord.sendMessage(data.channel, status);
    });
};

_commands.starbound = function(data) {
    if(!config.starbound || !config.starbound.statusImage) return;
    download(config.starbound.statusImage).then(img => {
        discord.bot.uploadFile({
            to: data.channel, file: img, filename: 'sb.png', message: '**Starbound Server Status**'
        });
    });
};

module.exports = {
    commands: _commands,
    help: {
        minecraft: ['Get the Minecraft server status (if configured)'],
        mumble: ['Get the Numble server status (if configured)'],
        starbound: ['Get the Starbound server status (if configured)']
    }
};