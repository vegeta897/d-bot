global.__base = __dirname + '/';
var util = require('./core/util.js');
var config = require('./core/config.js');
var discord = require('./core/discord.js');
var messages = require('./core/messages.js');
var addons = require('./core/addons.js');

// TODO: Delete original command and error message when a command is retried successfully immediately after

discord.bot.on("ready", function() {
    console.log((new Date()).toString().substr(0,24),
        'Logged in as: ' + discord.bot.username + ' - (' + discord.bot.id + ')');
    require('fs').writeFile('./debug/bot.json', JSON.stringify(discord.bot, null, '\t'));
});

discord.bot.on('message', function(user, userID, channelID, message, rawEvent) {
    if(userID == discord.bot.id) return; // Don't listen to yourself, bot
    var data = addons.readMessage(user, userID, channelID, message, rawEvent);
    var isPM = discord.bot.directMessages[channelID];
    require('fs').writeFile('./debug/lastMessage.json', JSON.stringify(rawEvent, null, '\t'));
    if(isPM) {
        // This is a PM
        
    } else {
        // Not a PM
        messages.logMessage(data); // Log message in DB
    }
} );