// Stuff for debugging
const fs = require('fs');
const util = require(__base+'core/util.js');

function writeToFile(obj, name) {
    try {
        fs.writeFile('./debug/' + name + '.json', JSON.stringify(obj, null, '\t'), () => {});
    } catch(e) { console.log(e); }
}

function cleanUser(user) {
    if(!user) return undefined;
    let clean = {
        avatar: user.avatar,
        avatarURL: user.avatarURL,
        bot: user.bot,
        createdAt: user.createdAt,
        defaultAvatar: user.defaultAvatar,
        defaultAvatarURL: user.defaultAvatarURL,
        discriminator: user.discriminator,
        id: user.id,
        mention: user.mention,
        staticAvatarURL: user.staticAvatarURL,
        username: user.username
    };
    if(user.guild) { // If this is a member object
        Object.assign(clean, {
            game: user.game,
            joinedAt: user.joinedAt,
            nick: user.nick,
            permission: user.permission,
            roles: user.roles,
            status: user.status,
            voiceState: user.voiceState
        });
    }
    return clean;
}

module.exports = {
    messageToJSON: message => {
        let writable = {
            activity: message.activity,
            application: message.application,
            attachments: message.attachments,
            channel: {
                id: message.channel.id,
                name: message.channel.name
            },
            channelMentions: message.channelMentions,
            cleanContent: message.cleanContent,
            content: message.content,
            editedTimestamp: message.editedTimestamp,
            embeds: message.embeds,
            id: message.id,
            mentionEveryone: message.mentionEveryone,
            mentions: message.mentions,
            pinned: message.pinned,
            reactions: message.reactions,
            roleMentions: message.roleMentions,
            timestamp: message.timestamp,
            tts: message.tts,
            type: message.type,
            user: cleanUser(message.member || message.author)
        };
        if(message.channel.guild) {
            writable.channel.guild = {
                id: message.channel.guild.id,
                name: message.channel.guild.name
            };
        }
        if(message.channel.recipient) {
            writable.channel.recipient = {
                id: message.channel.recipient.id,
                username: message.channel.recipient.username
            };
        }
        writeToFile(writable, 'lastMessage');
    },
    botToJSON: bot => {
        let writable = {
            bot: bot.bot,
            channelGuildMap: bot.channelGuildMap,
            guilds: Array.from(bot.guilds.values()).map(guild => ({
                afkChannelID: guild.afkChannelID,
                afkTimeout: guild.afkTimeout,
                channels: Array.from(guild.channels.values()).map(channel => {
                    let cleanChannel = {
                        bitrate: channel.bitrate,
                        createdAt: channel.createdAt,
                        id: channel.id,
                        lastMessageID: channel.lastMessageID,
                        lastPinTimestamp: channel.lastPinTimestamp,
                        mention: channel.mention,
                        name: channel.name,
                        nsfw: channel.nsfw,
                        parentID: channel.parentID,
                        position: channel.position,
                        topic: channel.topic,
                        type: channel.type,
                        userLimit: channel.userLimit
                    };
                    if(channel.channels) {
                        cleanChannel.channels = Array.from(channel.channels.values()).map(channel => ({
                            id: channel.id,
                            name: channel.name,
                            position: channel.position
                        }));
                    }
                    if(channel.permissionOverwrites) {
                        cleanChannel.permissionOverwrites = Array.from(channel.permissionOverwrites.values()).map(overwrite => ({
                            id: overwrite.id,
                            type: overwrite.type
                        }));
                    }
                    if(channel.voiceMembers) {
                        cleanChannel.voiceMembers = Array.from(channel.voiceMembers.values()).map(member => ({
                            id: member.id,
                            username: member.username,
                            voiceState: member.voiceState
                        }));
                    }
                    return cleanChannel;
                }),
                createdAt: guild.createdAt,
                defaultNotifications: guild.defaultNotifications,
                emojis: guild.emojis,
                explicitContentFilter: guild.explicitContentFilter,
                features: guild.features,
                icon: guild.icon,
                iconURL: guild.iconURL,
                id: guild.id,
                joinedAt: guild.joinedAt,
                large: guild.large,
                maxPresences: guild.maxPresences,
                memberCount: guild.memberCount,
                members: Array.from(guild.members.values()).map(cleanUser),
                mfaLevel: guild.mfaLevel,
                name: guild.name,
                ownerID: guild.ownerID,
                region: guild.region,
                roles: Array.from(guild.roles.values()).map(role => ({
                    color: role.color,
                    createdAt: role.createdAt,
                    guild: role.guild.id,
                    id: role.id,
                    managed: role.managed,
                    mention: role.mention,
                    mentionable: role.mentionable,
                    name: role.name,
                    permissions: role.permissions,
                    position: role.position
                })),
                shard: guild.shard.id,
                splash: guild.splash,
                systemChannelID: guild.systemChannelID,
                unavailable: guild.unavailable,
                verificationLevel: guild.verificationLevel
            })),
            guildShardMap: bot.guildShardMap,
            notes: bot.notes,
            options: bot.options,
            privateChannelMap: bot.privateChannelMap,
            privateChannels: Array.from(bot.privateChannels.values()).map(channel => ({
                createdAt: channel.createdAt,
                id: channel.id,
                lastMessageID: channel.lastMessageID,
                mention: channel.mention,
                recipient: {
                    id: channel.recipient.id,
                    username: channel.recipient.username
                },
                type: channel.type
            })),
            shards: Array.from(bot.shards.values()).map(shard => ({
                connectAttempts: shard.connectAttempts,
                id: shard.id,
                latency: shard.latency,
                presence: shard.presence,
                sessionID: shard.sessionID,
                status: shard.status
            })),
            startTime: bot.startTime,
            token: 'hidden',
            unavailableGuilds: Array.from(bot.unavailableGuilds.values()).map(guild => ({
                id: guild.id,
                shard: guild.shard.id,
                unavailable: guild.unavailable
            })),
            uptime: bot.uptime,
            user: cleanUser(bot.user),
            users: Array.from(bot.users.values()).map(cleanUser),
            voiceConnections: Array.from(bot.voiceConnections.values()).map(connection => ({
                channelID: connection.channelID,
                connecting: connection.connecting,
                current: connection.current,
                id: connection.id,
                paused: connection.paused,
                playing: connection.playing,
                ready: connection.ready,
                volume: connection.volume
            }))
        };
        writeToFile(writable, 'bot');
    }
};
