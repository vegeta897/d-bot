// Let users color their names
const discord = require(__base+'core/discord.js');
const config = require(__base+'core/config.js');
const util = require(__base+'core/util.js')
const colorNamer = require('color-namer')

const rolePrefix = 'Color: '
const otherPrefix = 'Other '

async function fixRoles(guild) {
    let { roles, members } = require('../rolefix.json')
    let colorRoles = roles.filter(r => r.name.startsWith(rolePrefix))
    let roleIDMap = {}
    for(let role of colorRoles) {
        roleIDMap[role.id] = await guild.createRole({ name: role.name, color: role.color }, 'Oops')
    }
    for(let member of members) {
        let memberColorRoleID = member.roles.find(mr => colorRoles.find(cr => cr.id === mr))
        if(!memberColorRoleID) continue
        await guild.addMemberRole(member.id, roleIDMap[memberColorRoleID].id) // Assign role to user
    }
}

function getColor(input) {
    let lists = colorNamer(input);
    let bestMatch;
    for(let list of Object.keys(lists)) {
        for(let color of lists[list]) {
            if(!bestMatch || bestMatch.distance > color.distance) bestMatch = color;
        }
    }
    return bestMatch;
}

async function cleanupColorRoles(guild) {
    let colorRoles = guild.roles.filter(role => role.name.startsWith(rolePrefix))
    for(let role of colorRoles) {
        let roleInUse = false
        for(let [userID, member] of guild.members) {
            if(member.roles.includes(role.id)) {
                roleInUse = true
                break
            }
        }
        if(!roleInUse) await guild.deleteRole(role.id, 'Removing unused color role')
    }
    let otherColorRoles = guild.roles.filter(role => role.name.startsWith(rolePrefix + otherPrefix))
    for(let role of otherColorRoles) {
        let nonOtherName = rolePrefix + role.name.substring(rolePrefix.length + otherPrefix.length)
        if(!otherColorRoles.some(r => r.name === nonOtherName)) {
            guild.editRole(role.id, { name: nonOtherName }, 'Cleaning up color role names')
        }
    }
}

const _commands = {};

_commands.color = async function(data) {
    if(data.userID === config.owner && data.params[0] === 'fix') {
        return fixRoles(data.messageObject.channel.guild)
    }
    if(data.userID === config.owner && data.params[0] === 'cleanup') {
        return cleanupColorRoles(data.messageObject.channel.guild)
    }
    if(!config.allowCustomColors) return;
    let { member, channel: { guild } } = data.messageObject;
    let currentColor = discord.getUserColor(member, guild) || 'default';
    let allColorRoles = guild.roles.filter(role => role.name.startsWith(rolePrefix))
    let userColorRole = allColorRoles.find(role => member.roles.includes(role.id));
    if(!data.params[0]) {
        return data.reply(`Your current color is "${userColorRole.name.substring(rolePrefix.length)}" \`${currentColor.toUpperCase()}\`\n`);
    }
    let input = data.paramStr.toLowerCase();
    if(input >= 0 && input <= 16777215 && Math.round(input) === +input) {
        input = '#' + ('00000' + (+input).toString(16)).substr(-6)
    }
    let colorMatch
    try {
        colorMatch = getColor(input)
    }
    catch(e) {}
    if(!colorMatch) {
        return data.reply('Color unrecognized. Try a hex color, e.g. `#897897`');
    }
    console.log('color match',colorMatch)
    let colorName = util.toProperCase(colorMatch.name);
    let exactColor = (/^#(?:[0-9a-f]{6})$/i).test(input) && input
    if((exactColor || colorMatch.hex).toLowerCase() === currentColor) {
        return data.reply('You already have that color!');
    }
    let color = parseInt((exactColor || colorMatch.hex).replace('#',''), 16);
    let colorRole = allColorRoles.find(role => role.name === rolePrefix + colorName);
    if(colorRole) console.log('found color role',colorRole.name)
    if(userColorRole) console.log('user has role',userColorRole.name)
    // Change name if existing color role is for a different color value
    while(allColorRoles.some(role => role.name === rolePrefix + colorName && role.color !== color)) {
        colorName = otherPrefix + colorName
        colorRole = false
    }
    let auditReason = `${data.user} used /color command`
    if(!colorRole) { // Create color role if not found
        colorRole = await guild.createRole({ name: rolePrefix + colorName, color }, auditReason)
    }
    let position = allColorRoles[0] && allColorRoles[0].position || guild.roles.get(config.modRole).position-1
    await colorRole.editPosition(position) // Change role position
    if(userColorRole) { // Remove user's existing color role
        member.removeRole(userColorRole.id, auditReason)
    }
    await guild.addMemberRole(data.userID, colorRole.id) // Assign role to user
    data.reply(`Color changed to "${colorName}" \`${'#' + ('00000' + color.toString(16)).substr(-6)}\``)
    cleanupColorRoles(guild) // Clean up roles
};

module.exports = {
    commands: _commands,
    help: {
        color: ['Change the color of your name with a hex value','#AA20EE']
    }
};
