// Sandboxed eval command
var Sandbox = require('sandbox');
var sandbox = new Sandbox();
sandbox.run(Data.params.join(' '), function(output) {
    discord.sendMessage(channelID, output.result);
});