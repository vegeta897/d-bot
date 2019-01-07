global.__base = __dirname + '/';
const util = require('./core/util.js');
const config = require('./core/config.js');
const { bot } = require('./core/discord.js');
const messages = require('./core/messages.js');
const addons = require('./core/addons.js');
const debug = require('./debug/debug.js');

bot.on('ready', () => {
    console.log((new Date()).toString().substr(0,24),
        `Logged in as: ${bot.user.username} - (${bot.user.id})`);
    debug.botToJSON(bot);
    addons.scanAddons();
});

bot.on('messageCreate', message => {
    let { channel, author } = message;
    if(author.id === bot.user.id) return; // Don't listen to yourself, bot
    debug.messageToJSON(message);
    let command = addons.readMessage(message);
    if(command || !channel.guild || author.discriminator === '0000') {
        // This is a command, PM, or webhook
    } else {
        // Not a command, PM, or webhook
        messages.logMessage(message); // Log message in DB
    }
} );

bot.connect();

// TODO: Delete original command and error message when a command is retried successfully immediately after
