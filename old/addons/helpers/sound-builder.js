// Let users build their own sound clip libraries
const discord = require(__base+'core/discord.js');
const fs = require('fs');
const download = require('download');

const soundClipsPath = './addons/assets/soundclips/';

const timers = {};
const TIMEOUT = 5 * 60 * 1000;

const loadTimers = clipStorage => {
    clipStorage.trans('maintainers', maintainers => {
        for(let userID of Object.keys(maintainers)) {
            let maintainer = maintainers[userID];
            if(!maintainer.timeout) continue;
            let timeLeft = maintainer.timeout - Date.now();
            if(timeLeft > 0) {
                startTimer(clipStorage, maintainer, timeLeft);
            } else {
                endMaintenance(maintainer);
            }
        }
    });
};

const startTimer = (clipStorage, userID, timeLeft) => {
    timers[userID] = setTimeout(() => {
        clipStorage.trans('maintainers', maintainers => {
            discord.sendMessage(userID, '👋 You forgot to type `stop` so I stopped automatically. Type `/sounds` to start again.');
            endMaintenance(maintainers[userID]);
        });
    }, timeLeft);
};

const refreshMaintainer = (clipStorage, maintainer) => {
    maintainer.timeout = Date.now() + TIMEOUT;
    clearTimeout(timers[maintainer.id]);
    startTimer(clipStorage, maintainer.id, TIMEOUT);
};

const endMaintenance = (maintainer) => {
    maintainer.timeout = false;
    maintainer.maintaining = false;
};

const maintain = async (data, clipStorage, command) => {
    let urls, maintaining;
    clipStorage.trans('maintainers', maintainers => {
        maintainers[data.userID] = maintainers[data.userID] || { id: data.userID };
        let maintainer = maintainers[data.userID];
        maintaining = maintainer && maintainer.maintaining;
        if(maintaining && ['stop','quit','end','/stop','/quit'].includes(data.message.toLowerCase())) {
            endMaintenance(maintainer);
            clearTimeout(timers[maintainer.id]);
            data.reply('👋 Thanks, bye.');
            return;
        }
        refreshMaintainer(clipStorage, maintainer);
        if(maintaining === true) { // Choosing a library to maintain
            if(discord.commands.has(data.message)) {
                data.reply(`❌ That is an invalid library name because there is already a \`/${data.message}\` command`);
            } else if(/^[a-z0-9]+$/.test(data.message)) {
                maintainer.maintaining = data.message;
                data.reply(`📚 You are now working in the \`${data.message}\` library.
You may now send sound files as direct links or file uploads.
Type \`stop\` or \`quit\` when you're done.`);
            } else {
                data.reply('❌ Library names can only be letters and numbers, with no spaces');
            }
        } else if(maintaining) {
            urls = data.attachments || data.message.split(' ');
        } else if(command) {
            let libraries = getSoundClipLibraries();
            data.reply('🔊 Hello!\n'
                + 'Type the name of a library you want to create or add to.\n'
                + 'Current libraries are: `' + libraries.map(l => l.name).join(', ') + '`\n'
                + 'Type `stop` or `quit` when you\'re done.');
            maintainer.maintaining = true;
        }
    });
    if(urls && maintaining) {
        let results = [];
        for(let url of urls) {
            let filename = decodeURI(url.split('/')[url.split('/').length - 1]);
            results.push({ filename });
            try {
                await downloadClip(url, maintaining, filename);
            } catch(e) {
                console.log(e);
                results[results.length - 1].failed = true;
            }
        }
        clipStorage.trans('maintainers', maintainers => {
            maintainers[data.userID].added = (maintainers[data.userID].added || 0) + results.filter(result => !result.failed).length;
            maintainers[data.userID].lastAddDate = Date.now();
        });
        let message = results.map(result => {
            return `\`${result.filename}\` ${result.failed ? '❌ failed to download' : '✅ downloaded successfully'}`;
        }).join('\n');
        data.reply(message);
    }
};

const downloadClip = async (url, library, filename) => {
    let clipCount = getSoundClips(library).length;
    return download(url, soundClipsPath + library, {
        filename: (clipCount + 1) + ' ' + filename
    })
        .then(() => console.log('downloaded', filename));
};

const getSoundClipLibraries = () => {
    let libraryList = fs.readdirSync(soundClipsPath);
    return libraryList.map(name => ({ name, clips: getSoundClips(name)}));
};
const getSoundClips = library => {
    try {
        return fs.readdirSync(soundClipsPath + library);
    } catch(e) {
        return [];
    }
};

module.exports = {
    maintain,
    getSoundClipLibraries,
    getSoundClipPath: (library, clip) => soundClipsPath + library + '/' + clip,
    init: loadTimers
};
