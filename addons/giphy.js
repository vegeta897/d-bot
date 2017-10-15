// Get a gif!
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var request = require('request');

var _commands = {};

_commands.gif = function(data) {
    discord.bot.simulateTyping(data.channel);
    var command = data.params.length == 0 ? 'random?' : (`search?q=${data.params.join('+')}&`);
    var url = `http://api.giphy.com/v1/gifs/${command}api_key=dc6zaTOxFJmzC`;
    request(url, function(err, response, body) {
        if(err) {
            console.log(err);
            return data.reply('Error loading giphy...');
        }
        var imgData = JSON.parse(body).data;
        var imgURL = imgData.image_url;
        if (!imgURL && imgData.length > 0) imgURL = util.pickInArray(imgData).images.original.url;
        var message = imgURL ? imgURL : 'No images found :(';
        data.reply(message);
    });
};

module.exports = {
    commands: _commands,
    help: {
        gif: ['Grab a gif from giphy.com','cake']
    }
};