global.__base = __dirname + '/';
var util = require('./core/util.js');
var config = require('./core/config.js');
var { bot } = require('./core/discord.js');
var messages = require('./core/messages.js');
var addons = require('./core/addons.js');

bot.on('ready', () => {
    console.log((new Date()).toString().substr(0,24),
        `Logged in as: ${bot.user.username} - (${bot.user.id})`);
    // TODO: Write custom bot.json output
    addons.scanAddons();
});

bot.on('messageCreate', message => {
    let { channel, author } = message;
    if(author.id === bot.user.id) return; // Don't listen to yourself, bot
    let command = addons.readMessage(message);
    // TODO: Write custom lastMessage.json output
    if(command || !channel.guild || author.discriminator === '0000') {
        // This is a command, PM, or webhook
    } else {
        // Not a command, PM, or webhook
        messages.logMessage(message); // Log message in DB
    }
} );

bot.connect();

// TODO: Delete original command and error message when a command is retried successfully immediately after
