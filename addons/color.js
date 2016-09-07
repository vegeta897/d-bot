// Let users color their names
// NOTE: Another role's color may override the one added if it is higher on the list, I will fix this "eventually"
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');

var _commands = {};

_commands.color = function(data) {
    if(!config.allowCustomColors) return;
    var hexColorRX = /^#(?:[0-9a-f]{6})$/i;
    if(!data.params[0] || !hexColorRX.test(data.params[0])) {
        discord.sendMessage(channelID,'You must specify a hex color, e.g. #897897');
        return;
    }
    var userRole = false;
    var roles = discord.bot.servers[data.server].roles;
    for(var rKey in roles) {
        if(!roles.hasOwnProperty(rKey)) continue;
        if(roles[rKey].name == 'user' + data.userID) {
            userRole = rKey;
            break;
        }
    }
    if(!userRole) { // Role not found, need to create it
        discord.bot.createRole(data.server, function(err, res) {
            if(err) return console.error(err);
            userRole = res.id; // New role ID
            discord.bot.addToRole({ serverID: data.server, roleID: userRole, userID: data.userID }); // Assign new role
            editRole()
        });
    } else { // Role found, edit it
        editRole();
    }
    
    function editRole() {
        discord.bot.editRole({
            serverID: data.server, roleID: userRole, name: 'user' + data.userID,
            color: data.params[0].toUpperCase() // TODO: Assign role position to top
        },function() {
            discord.sendMessage(data.channel,'Color changed!');
        });
    }
};

module.exports = {
    commands: _commands,
    help: {
        color: ['Change the color of your name with a hex value','#AA20EE']
    }
};