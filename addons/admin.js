// I just don't trust anyone
const util = require(__base+'core/util.js');
const messages = require(__base+'core/messages.js');
const discord = require(__base+'core/discord.js');
const config = require(__base+'core/config.js');

const _commands = {};

_commands.topic = function(data) {
    if(!data.member.roles.includes(config.adminRole)) {
        return data.reply('You do not have admin permissions!');
    }
    if(data.paramStr === '') {
        return data.reply('Type the topic you want after the command, e.g. `/topic hello`');
    }
    if(data.paramStr.length > 1024) {
        return data.reply(`Sorry, that topic is \`${1024 - data.paramStr.length}\` characters too long!`);
    }
    discord.bot.editChannel(data.channel, { topic: data.paramStr }, `${data.user} commanded it`)
        .then(() => data.reply('Topic set!'))
        .catch(err => data.reply('Error setting topic! ' + err));
};

module.exports = {
    commands: _commands,
    help: {
        topic: ['Set the current channel\'s topic', 'Welcome to this channel']
    }
};
