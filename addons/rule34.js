// Because BadHat wanted it
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var request = require('request');
var parseString = require('xml2js').parseString;

var _commands = {};

_commands.r34 = function(data) {
    if(data.channel !== '162513414420299776') return data.reply('<#162513414420299776> channel only!');
    data.messageObject.channel.sendTyping();
    var url = `http://rule34.xxx/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(data.params.join('+'))}+-young`;
    request(url, function(err, response, body) {
        if(err) {
            console.log(err);
            return data.reply('`Error loading rule34.xxx`');
        }
        parseString(body, function (err, result) {
            if(!result.posts) return data.reply('`Error loading rule34.xxx`');
            if(result.posts.$.count === '0') return data.reply('`No images found :(`');
            let url = util.pickInArray(result.posts.post).$.file_url;
            if(url.substr(0, 4) !== 'http') url = 'http:' + url;
            return data.reply(`\`${result.posts.$.count} total results\` ${url}`);
        });
    });
};

module.exports = {
    commands: _commands,
    help: {
        r34: ['Get some lewds','c-3po r2-d2']
    }
};
