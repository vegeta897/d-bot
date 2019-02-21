// Discord.io!
var util = require(__base+'core/util.js');
var config = require('./config.js');
const Eris = require('eris');

let bot = new Eris(config.token);

// TODO: Crawl back through message history, 100 messages every 20 seconds, to the beginning of time
// Track when the bot is online/offline to know when to look for gaps to fill in

module.exports = {
    bot,
    pmOwner: message => _sendMessages(config.owner, message),
    sendMessage: _sendMessages,
    sendMessages: _sendMessages,
    editMessage: _editMessage,
    uploadFile: _uploadFile,
    fixMessage: _fixMessage,
    getUsernameFromID: _getUsernameFromID,
    getIDFromUsername: username => {
        // TODO: Use fuzzy matching to get closest match (minimum 50% similarity)
        username = username.toLowerCase();
        if(!username || username.trim() === '') return false;
        for(let [guildID, guild] of bot.guilds) {
            for(let [memberID, member] of guild.members) {
                if((member.nick && member.nick.toLowerCase() === username)
                    || member.username.toLowerCase() === username) return memberID;
            }
        }
        for(let aliasID of Object.keys(config.userAliases)) {
            if(config.userAliases[aliasID].includes(username)) return aliasID;
        }
        return false;
    },
    getTimeFromID: _getTimeFromID,
    getUserColor: (member, guild) => {
        let color;
        let rolePosition = -1;
        for(let roleID of member.roles) {
            let role = guild.roles.get(roleID);
            if(!role || !role.color || role.position < rolePosition) continue;
            color = '#' + ('00000' + role.color.toString(16)).substr(-6);
            rolePosition = role.position;
        }
        return color;
    }
};

async function _sendMessages(ID, messageArr, polite, callback) {
    if(bot.users.has(ID)) ID = (await bot.getDMChannel(ID)).id; // Get DM channel if user ID
    if(!ID) return console.log(new Date(), 'Invalid channel ID in sendMessage');
    messageArr = Array.isArray(messageArr) ? messageArr : [messageArr];
    let noMentions = polite === true || (polite && polite.noMentions);
    let noEmbeds = polite === true || (polite && polite.noEmbeds);
    Promise.all(messageArr.map(msg => {
        if(noMentions) msg = suppressMentions(msg);
        if(noEmbeds) msg = suppressLinks(msg);
        if(msg.length > 2000) {
            console.log((new Date()).toString().substr(0,24), 'Trimming message over 2000 chars');
            msg = msg.substring(0, 2000);
        }
        return bot.createMessage(ID, msg);
    })).then(callback).catch(err => console.log(new Date(), 'Error sending message(s)', err));
}

function _editMessage(channelID, messageID, content, polite, callback) {
    if(polite === true || (polite && polite.noMentions)) content = suppressMentions(content);
    if(polite === true || (polite && polite.noEmbeds)) content = suppressLinks(content);
    bot.editMessage(channelID, messageID, content).then(callback);
}

function _uploadFile({ to, filename, file, message }, callback) {
    bot.createMessage(to, message, { file, name: filename }).then(callback)
        .catch(err => console.log(new Date(), 'Error uploading file', err));
}

function _fixMessage(message, serverID) { // Credit to discord.io
    return message.replace(/<@&(\d*)>|<@!(\d*)>|<@(\d*)>|<#(\d*)>/g, function(match, RID, NID, UID, CID) {
        if(UID || CID) {
            if(bot.users.has(UID)) return '@' + bot.users.get(UID).username;
            if(bot.channelGuildMap[CID]) return '#' + bot.guilds.get(bot.channelGuildMap[CID]).channels.get(CID).name;
        }
        if(RID || NID) {
            if(NID && bot.guilds.has(serverID)) return '@' + bot.guilds.get(serverID).members.get(NID).nick;
            for(let [guildID, guild] of bot.guilds) {
                if(guild.roles.has(RID)) return '@' + guild.roles.get(RID).name;
                if(guild.members.has(NID) && guild.members.get(NID).nick) return '@' + guild.members.get(NID).nick;
            }
        }
    });
}

function _getUsernameFromID(id) {
    return bot.users.has(id) ? bot.users.get(id).username :
        config.userAliases[id] ? config.userAliases[id][0] : false;
}

function _getRoleFromID(id) {
    for(let [guildID, guild] of bot.guilds) {
        let role = guild.roles.find(role => role.id === id);
        if(role) return role;
    }
}

function _getTimeFromID(id) { // Converts Discord snowflake ID to timestamp, thanks /u/Natsulus!
    return new Date((id / 4194304) + 1420070400000);
}

function suppressMentions(message) {
    return message.split('@everyone').join('(@)everyone')
        .replace(/<@!?[0-9]+>/g, match => {
            match = match.replace('!', '');
            return '(@)' + _getUsernameFromID(match.substring(2, match.length - 1))
        })
        .replace(/<@&[0-9]+>/g, match => {
            let role = _getRoleFromID(match.substring(3, match.length - 1));
            return '(@)' + (role ? role.name : '<unknown role>');
        });
}

function suppressLinks(message) {
    return message.replace(util.urlRX, match => (match[0] === ' ' ? ' ' : '') + '<' + match.trim() + '>');
}

bot.on('error', error => {
    _sendMessages(config.owner, `An error has occurred: \`\`\`${error}\`\`\``);
    console.log(new Date(), error);
});

bot.on('debug', debug => {
    //console.log(debug) //Logs every event
});
