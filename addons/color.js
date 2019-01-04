// Let users color their names
// NOTE: Another role's color may override the one added if it is higher on the list, I will fix this "eventually"
const discord = require(__base+'core/discord.js');
const config = require(__base+'core/config.js');

const _commands = {};

_commands.color = function(data) {
    if(!config.allowCustomColors) return;
    let hexColorRX = /^#(?:[0-9a-f]{6})$/i;
    if(!data.params[0] || !hexColorRX.test(data.params[0])) {
        return data.reply('You must specify a hex color, e.g. #897897');
    }
    let color = parseInt(data.params[0].toUpperCase().replace('#',''), 16);
    let { guild } = data.messageObject.channel;
    let userRole = guild.roles.find(role => role.name === 'user' + data.userID);
    if(userRole) return userRole.edit({ color }, `${data.user} used /color command`)
        .then(() => data.reply('Color changed!')); // Role found, edit it
    // Role not found, create and assign it to user
    guild.createRole({ name: 'user' + data.userID, color }, `${data.user} used /color command`)
        .then(role => guild.addMemberRole(data.userID, role.id));
};

module.exports = {
    commands: _commands,
    help: {
        color: ['Change the color of your name with a hex value','#AA20EE']
    }
};
