// Message database
var util = require(__base+'core/util.js');
var discord = require('./discord.js');
var storage = require('./storage.js');
var config = require('./config.js');

let db;
storage.nedb('messages', { fieldName: 'id', unique: true }).then(d => {
    db = d;
    module.exports.db = db;
});

async function cursor(command) {
    try {
        let results = await command(db).exec();
        if(!results || results.length === 0 || !results[results.length - 1].hasOwnProperty('content')) return false;
        return results;
    } catch(e) {
        console.log(e);
        discord.pmOwner(`A message database error occurred while executing a command\n\`${e.message}\``);
    }
}

module.exports = {
    cursor,
    logMessage: async function(data) {
        if(!data.message && !data.attachments) return; // Don't log empty messages
        if(config.noLogServers.includes(data.server)) return; // Don't log this server
        if(config.noLogChannels.includes(data.channel)) return; // Don't log this channel
        if(data.command) return; // Don't log commands
        try {
            db.insert({
                id: data.rawEvent.d.id, user: data.userID, channel: data.channel,
                content: data.message, time: new Date(data.rawEvent.d.timestamp).getTime(),
                attachments: data.attachments || undefined
            });
        } catch(e) {
            console.log('Error logging message:', e);
        }
    },
    getRandomWord: async function() {
        let allMessages = await cursor(db => db.cfind({ content: util.matchWordsRX }));
        if(!allMessages) return '';
        allMessages = allMessages.map(msg => msg.content);
        var attempts = 0;
        do {
            attempts++;
            var randomMessage = util.pickInArray(allMessages);
            var randomWord = util.pickInArray(util.getRegExpMatches(randomMessage, util.matchWordsRX));
        } while(!util.matchWordsRX.test(randomWord) && attempts < 1000);
        return randomWord;
    }
};
