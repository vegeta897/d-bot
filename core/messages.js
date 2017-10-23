// Message database
var util = require(__base+'core/util.js');
var discord = require('./discord.js');
var storage = require('./storage.js');
var config = require('./config.js');
var db = storage.nedb('messages');

// db.ensureIndex({ fieldName: 'time', unique: true }, function (err) { console.log(err); });
db.ensureIndex({ fieldName: 'id', unique: true }, function (err) { if(err) console.log(err); });

function wrapFind(command, callback) {
    command.exec(function(err, results) {
        if(err) {
            console.log(err);
            return discord.pmOwner(`A message database error occurred while executing a command\n\`${err.message}\``);
        }
        if(!results || results.length === 0 || !results[results.length - 1].hasOwnProperty('content')) {
            return callback(false);
        }
        callback(results);
    });
}

module.exports = {
    db,
    wrap: wrapFind,
    logMessage: function(data) {
        if(!data.message && !data.attachments) return; // Don't log empty messages
        if(config.noLogServers.includes(data.server)) return; // Don't log this server
        if(config.noLogChannels.includes(data.channel)) return; // Don't log this channel
        if(data.command) return; // Don't log commands
        db.insert({
            id: data.rawEvent.d.id, user: data.userID, channel: data.channel, 
            content: data.message, time: new Date(data.rawEvent.d.timestamp).getTime(),
            attachments: data.attachments || undefined
        }, function(err) { if(err) console.log('Error logging message:', err) })
    },
    getRandomWord: function() {
        wrapFind(db.find({ content: util.matchWordsRX }), function(allMessages) {
            if(!allMessages) return '';
            var attempts = 0;
            do {
                attempts++;
                var randomMessage = util.pickInArray(allMessages);
                var randomWord = util.pickInArray(util.getRegExpMatches(randomMessage, util.matchWordsRX));
            } while(!util.matchWordsRX.test(randomWord) && attempts < 1000);
            return randomWord;
        })
    }
};