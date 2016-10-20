// Discord.io!
var config = require('./config.js');

var Discord = require("discord.io");
var bot = new Discord.Client({
    token: config.token,
    autorun: true
});

bot.on('err', function(error) {
    _sendMessages(config.owner, 'An error has occurred: ' + error);
    console.log(new Date(),error);
});

// TODO: Crawl back through message history, 100 messages every 20 seconds, to the beginning of time

var msgQueue = [], // Message buffer
    sending; // Busy sending a message

// TODO: Add custom "onMessage" function that wraps event to include things like isPM etc.

module.exports = {
    bot: bot,
    pmOwner: function(message) { _sendMessages(config.owner, message); },
    sendMessage: _sendMessages,
    sendMessages: _sendMessages,
    editMessage: _editMessage,
    getUsernameFromID: _getUsernameFromID,
    getIDFromUsername: function(username) {
        // TODO: Use fuzzy matching to get closest match above 50% similarity
        if(!username || username.trim() == '') return false;
        for(var uKey in bot.users) { if(!bot.users.hasOwnProperty(uKey)) continue;
            if(bot.users[uKey].username.toLowerCase() == username.toLowerCase()) return uKey;
        }
        return false;
    },
    getTimeFromID: _getTimeFromID
};

function _sendMessages(ID, messageArr, polite, callback) {
    messageArr = Array.isArray(messageArr) ? messageArr : [messageArr];

    // TODO: Get rid of this queue thing, implement proper rate limiting

    for(var i = 0; i < messageArr.length; i++) { // Add messages to buffer
        msgQueue.push({
            ID: ID, msg: messageArr[i], polite: polite,
            callback: i == messageArr.length-1 ? callback : false // If callback specified, only add to last message
        })
    }
    function _sendMessage() {
        sending = true; // We're busy
        bot.sendMessage({
            to: msgQueue[0].ID,
            message: msgQueue[0].polite ? suppressMentionsLinks(msgQueue[0].msg) : msgQueue[0].msg
        }, function(err,res) {
            var sent = msgQueue.shift(); // Remove message from buffer
            if(sent.callback) sent.callback(err,res); // Activate callback if exists
            if(msgQueue.length < 1) { // Stop when message buffer is empty
                sending = false; // We're free
            } else {
                _sendMessage();
            }
        })
    }
    if(!sending) _sendMessage(); // If not busy with a message, send now
}

function _editMessage(channel, id, message, polite, callback) {
    bot.editMessage({
        channelID: channel, messageID: id,
        message: polite ? suppressMentionsLinks(message) : message
    }, callback);
}

function _getUsernameFromID(id) {
    return bot.users[id] ? bot.users[id].username : false;
}

function _getTimeFromID(id) { // Converts Discord snowflake ID to timestamp, thanks /u/Natsulus!
    return new Date((id / 4194304) + 1420070400000);
}

function suppressMentionsLinks(message) {
    return message.replace(/<@!?[0-9]+>/g,function(match) {
        match = match.replace('!','');
        return "(@)" + _getUsernameFromID(match.substring(2,match.length-1))
    }).replace(/(?:^| )((https?:\/\/)[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi,function(match,a) {
        return (match[0] == ' ' ? ' ' : '') + '<' + a + '>';
    });
}

bot.on('presence', function(user, userID, status, game, rawEvent) {
    /*console.log(user + " is now: " + status);*/
});

bot.on('any', function(rawEvent) {
    //console.log(rawEvent) //Logs every event
});

bot.on('disconnect', function() {
    console.log("Bot disconnected");
    setTimeout(function(){
        bot.connect(); //Auto reconnect after 5 seconds
    },5000);
});