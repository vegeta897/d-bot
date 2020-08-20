// Great World of Sound
const util = require(__base+'core/util.js');
const { bot } = require(__base+'core/discord.js');
const storage = require(__base+'core/storage.js');
var requireUncached = require('require-uncached');
const soundBuilder = requireUncached('./helpers/sound-builder.js');

const _commands = {};

const clipStorage = storage.json('clips', { libraries: {}, maintainers: {}, messages: [] }, '\t');

// TODO: Move sound files to storage using getStoragePath

const disconnectTimeouts = {};
const COMMAND_MEMORY_LIMIT = 30; // Remember 30 commands per channel
const FILTERS = {
    vibrato: 'vibrato=f=7.0:d=1',
    crush: 'acrusher=bits=4:mix=0:samples=250',
    echo: 'aecho=in_gain=1:delays=150|300|450|600|750:decays=0.8|0.6|0.4|0.2|0.1',
    hlreverb: 'asplit[d][r];[r]aecho=in_gain=0.8:delays='
        + [...Array(250).keys()].map((v, i) => 15 * (i + 1)).join('|') + ':decays='
        + [...Array(250).keys()].map((v, i) => Math.round(0.98 ** i * 1000) / 1000).join('|')
        + '[r];[r]lowpass=f=500[r];[d][r]amix',
    chorus: 'chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3',
    lowpass: 'lowpass=f=16000',
    slow: 'aresample=48000[a];[a]asetrate=48000*0.7',
    fast: 'aresample=48000[a];[a]asetrate=48000*1.4'
};

let autoDisconnect = (voiceChannel, voiceConn) => {
    disconnectTimeouts[voiceConn.id] = setTimeout(() => {
        if(voiceConn.playing) autoDisconnect(voiceChannel, voiceConn);
        else voiceChannel.leave();
    }, 5 * 60 * 1000);
};

const getVoiceConn = async channelID => {
    let guildID = bot.channelGuildMap[channelID];
    let voiceChannel = bot.guilds.get(guildID).channels.get(channelID);
    clearTimeout(disconnectTimeouts[guildID]);
    if(bot.voiceConnections.has(guildID)) {
        if(bot.voiceConnections.get(guildID).channelID !== channelID) {
            await voiceChannel.join();
        }
        return bot.voiceConnections.get(guildID);
    } else {
        let voiceConn = await voiceChannel.join();
        voiceConn.on('end', () => {
            clearTimeout(disconnectTimeouts[voiceConn.id]);
            autoDisconnect(voiceChannel, voiceConn);
        });
        voiceConn.on('error', console.log);
        return voiceConn;
    }
};

const pickClip = library => {
    if(library.clips.length < 1) return;
    let clip;
    clipStorage.trans('libraries', libraries => {
        libraries[library.name] = libraries[library.name] || { played: [] };
        let played = libraries[library.name].played;
        played.length = Math.min(played.length, Math.floor(library.clips.length / 2.1));
        // Divide by 2.1 so 2-clip libraries don't just alternate
        do {
            clip = util.pickInArray(library.clips);
        } while(played.includes(clip));
        played.unshift(clip);
    });
    return clip;
};

const playSound = async (voiceChannel, library, clip, filters = []) => {
    if(!voiceChannel) throw 'Join a voice channel first.';
    let voiceConn;
    try {
        voiceConn = await getVoiceConn(voiceChannel);
    } catch(e) {
        throw 'Unable to join your voice channel';
    }
    let filterArgs = 'loudnorm';
    filters.forEach(filter => {
        if(!FILTERS[filter]) return;
        filterArgs = FILTERS[filter] + '[a];[a]' + filterArgs;
    });
    if(voiceConn.playing) voiceConn.stopPlaying();
    try {
        voiceConn.play(soundBuilder.getSoundClipPath(library, clip), {
            encoderArgs: ['-filter:a', filterArgs]
        });
    } catch(e) {
        throw 'Error playing clip:\n```' + e.message + '```';
    }
    // 'loudnorm[a];[a]vibrato=f=7.0:d=1'
};

const stopSound = voiceConnID => bot.voiceConnections.has(voiceConnID) && bot.voiceConnections.get(voiceConnID).stopPlaying();

_commands.sounds = async data => {
    let libraries = soundBuilder.getSoundClipLibraries();
    if(data.isPM) {
        soundBuilder.maintain(data, clipStorage, true);
    } else {
        let libraryList = '**Sound Libraries**```xl\n';
        let longestLibraryName = Math.max(...libraries.map(lib => lib.name.length), 7);
        libraryList += 'Command'.padEnd(longestLibraryName) + '   Clips\n';
        libraryList += ''.padEnd(longestLibraryName + 8, '-') + '\n';
        libraryList += libraries.map(lib => lib.name.padEnd(longestLibraryName) + '   '
            + lib.clips.length.toString().padStart(5)).join('\n');
        libraryList += '```Filters: `' + Object.keys(FILTERS).join(', ') + '`';
        libraryList += '\nType `' + '/' + data.command + '` to me in a PM to add your own sounds';
        data.reply(libraryList);
    }
};
_commands.sound = _commands.sounds;
_commands.clips = _commands.sounds;

module.exports = {
    commands: _commands,
    listen: async data => {
        if(data.consumed) return;
        if(data.isPM) {
            soundBuilder.maintain(data, clipStorage);
        } else {
            let libraryList = soundBuilder.getSoundClipLibraries();
            let library = libraryList.find(lib => lib.name === data.command);
            if(!library) return;
            let clip = pickClip(library);
            if(!clip) return data.reply('There are no sound clips in the `' + data.command + '` library');
            playSound(data.messageObject.member.voiceState.channelID, library.name, clip, data.params)
                .then(() => {
                    clipStorage.trans('messages', messages => {
                        messages.unshift({
                            id: data.messageObject.id, channel: data.channel,
                            library: library.name, clip, filters: data.params
                        });
                        let channelMessageCounts = {};
                        for(let i = 0; i < messages.length; i++) {
                            let message = messages[i];
                            if(channelMessageCounts[message.channel] >= COMMAND_MEMORY_LIMIT) {
                                messages.splice(i, 1);
                                i--;
                            } else {
                                channelMessageCounts[message.channel] = (channelMessageCounts[message.channel] || 0) + 1;
                            }
                        }
                    });
                    ['🆕', '🔁', '⏹'].forEach((emoji, i) => setTimeout(() => {
                        data.messageObject.addReaction(emoji).catch(console.log);
                    }, i * 750));
                })
                .catch(err => {
                    if(err instanceof Error) console.log(err);
                    else data.reply(err);
                });
        }
    },
    react: async (message, { id: emojiID, name: emojiName }, userID) => {
        if(userID === bot.user.id || !['🆕', '🔁', '⏹'].includes(emojiName)) return;
        if(emojiName === '⏹') return stopSound(message.channel.guild.id);
        let messages = clipStorage.get('messages');
        let clipInfo = messages.find(m => m.id === message.id);
        if(!clipInfo) return;
        let member = message.channel.guild.members.get(userID);
        let libraryList = soundBuilder.getSoundClipLibraries();
        let library = libraryList.find(lib => lib.name === clipInfo.library);
        if(!library) return;
        let clip = emojiName === '🆕' ? pickClip(library) : clipInfo.clip;
        if(!clip) return;
        playSound(member.voiceState.channelID, clipInfo.library, clip, clipInfo.filters)
            .catch(err => err instanceof Error && console.log(err));
    },
    help: {
        sounds: ['Show all available sound library commands']
    }
};
