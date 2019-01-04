// Message database
var util = require(__base+'core/util.js');
var discord = require('./discord.js');
var storage = require('./storage.js');
var config = require('./config.js');

let db;
storage.nedb('messages', [{ fieldName: 'id', unique: true }, { fieldName: 'time' }]).then(d => {
    db = d;
    module.exports.db = db;
});

async function cursor(command) {
    if(!db) return;
    try {
        let results = await command(db).exec();
        if(!results || results.length === 0) return false;
        return results;
    } catch(err) {
        console.log(err);
        discord.pmOwner(`A message database error occurred while executing a command\n\`${err.message}\``);
    }
}

module.exports = {
    cursor,
    logMessage: async message => {
        if(message.content === '' && message.attachments.length === 0) return; // Don't log empty messages
        if(config.noLogServers.includes(message.channel.guild.id)) return; // Don't log this server
        if(config.noLogChannels.includes(message.channel.id)) return; // Don't log this channel
        try {
            db.insert({
                id: message.id, user: message.author.id, channel: message.channel.id,
                content: message.content, time: message.timestamp,
                attachments: message.attachments.length > 0 ? message.attachments.map(a => ({
                    url: a.url, filename: a.filename
                })) : undefined
            });
        } catch(err) {
            console.log('Error logging message:', err);
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
