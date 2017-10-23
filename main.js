global.__base = __dirname + '/';
var util = require('./core/util.js');
var config = require('./core/config.js');
var { bot } = require('./core/discord.js');
var messages = require('./core/messages.js');
var addons = require('./core/addons.js');
var SpoilerBot = require('discord-spoiler-bot');
const DEBUG = process.argv[2] === 'debug';

var spoilBot = DEBUG ? null : new SpoilerBot({
    client: bot,
    markAllowAll: true
});

bot.on('ready', function(event) {
    console.log((new Date()).toString().substr(0,24),
        `Logged in as: ${bot.username} - (${bot.id})`);
    if(DEBUG) return setTimeout(setupConsoleInput, 500);
    require('fs').writeFile('./debug/bot.json', JSON.stringify(bot, null, '\t'));
    spoilBot.connect();
});

bot.on('message', function(user, userID, channelID, message, rawEvent) {
    if(userID === bot.id) return; // Don't listen to yourself, bot
    var data = addons.readMessage(user, userID, channelID, message, rawEvent);
    require('fs').writeFile('./debug/lastMessage.json', JSON.stringify(rawEvent, null, '\t'));
    if(data.isPM || data.isWebhook) {
        // This is a PM or webhook
    } else {
        // Not a PM
        messages.logMessage(data); // Log message in DB
    }
} );

function setupConsoleInput() {
    const userID = config.owner;
    const username = bot.users[config.owner].username;
    const rl = require('readline').createInterface(process.stdin, process.stdout);
    const prefix = 'Send Message: ';
    rl.setPrompt(prefix, prefix.length);
    rl.prompt();
    rl.on('line', function(cmd) {
        rl.pause();
        bot.emit('message', username, userID, config.debugChannel, cmd, {
            d: { timestamp: Date.now(), id: Date.now(), mentions: [] }
        });
        rl.resume();
        rl.setPrompt(prefix, prefix.length);
        rl.prompt();
    }).on('close', function() {
        console.log('Exiting...');
        process.exit(0);
    })
}

// TODO: Delete original command and error message when a command is retried successfully immediately after