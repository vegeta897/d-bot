// Copy me to make a new addon
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');
var storage = require(__base+'core/storage.js');

const targetChannel = '447939162885193730';
const ignoreChannels = ['87590930709749760', '162513414420299776', '102240512634798080', '391035069638115328'];
const chunkSize = 1000;
const cutoff = 1 * 24 * 60 * 60 * 1000;
const replayData = storage.json('replay', {
    lastMessageTime: 0,
    offset: null,
    sentIDs: []
}, '\t');

let archiveChunk = {
    data: null
};
let loading = false;
let offset = replayData.get('offset');
let nextMessageIndex = 0;

async function loadChunk() {
    loading = true;
    archiveChunk.data = await messages.cursor(db => db.cfind(
        {
            time: { $gt: replayData.get('lastMessageTime') },
            $not: { channel: { $in: ignoreChannels } }
        })
        .sort({ time: 1 }).limit(chunkSize));
    loading = false;
    if(!offset) { // First run
        replayData.set('offset', Date.now() - archiveChunk.data[0].time);
    }
}

// let beforeID = '448460249914015744';
// function deleteArchive() {
//     discord.bot.getMessages({ before: '448460249914015744', limit: 100, channelID: targetChannel }, (err, res) => {
//         if(err) return console.log('error getting messages', err);
//         console.log('got', res.length, 'messages to delete');
//         res.reverse();
//         discord.bot.deleteMessages({ channelID: targetChannel, messageIDs: res.map(msg => msg.id) }, (err, res) => {
//             if(err) console.log('Error deleting old messages!', res.map(msg => msg.id), err);
//         });
//         beforeID = res[0].id;
//         if(res.length < 100) return console.log('done deleting messages');
//         setTimeout(deleteArchive, 10000); // Wait 10s
//     });
// }

module.exports = {
    tick: async function() {
        if(loading) return;
        if(!archiveChunk.data) {
            if(messages.db) loadChunk().then(() => {});
            // deleteArchive();
            return;
        }
        let nextMessage = archiveChunk.data[nextMessageIndex];
        if(Date.now() > nextMessage.time + offset) {
            let messageText = nextMessage.content;
            if(nextMessage.attachments) messageText += '\n' + nextMessage.attachments.join('\n');
            let username = discord.getUsernameFromID(nextMessage.user) || nextMessage.user;
            if(messageText !== '') discord.sendMessage(targetChannel, `**${username}**: ${messageText}`, { noMentions: true }, message => {
                replayData.trans('sentIDs', s => {
                    s.push(message[0].id);
                    return s;
                });
            });
            let messageDate = new Date(nextMessage.time);
            if(new Date(replayData.get('lastMessageTime')).getDate() !== messageDate.getDate()) {
                let topic = 'Current date: ' + messageDate.toLocaleDateString();
                discord.bot.editChannel(targetChannel, { topic }, `New #replay date`)
                    //.then(() => data.reply('Topic set!'))
                    .catch(err => console.log('Error setting topic!', err));
            }
            replayData.set('lastMessageTime', nextMessage.time);
            nextMessageIndex++;
            if(nextMessageIndex >= archiveChunk.data.length) {
                nextMessageIndex = 0;
                loadChunk().then(() => {});
            }
        }
        let sentIDs = replayData.get('sentIDs');
        if(sentIDs[99] && discord.getTimeFromID(sentIDs[99]).getTime() + cutoff < Date.now()) {
            discord.bot.deleteMessages(targetChannel, sentIDs.slice(0, 100), 'Pruning #replay')
                .catch(err => console.log('Error pruning #replay', sentIDs.slice(0, 100), err));
            replayData.trans('sentIDs', s => {
                s.splice(0, 100);
                return s;
            });
        }
    },
    commands: {}
};
