// Discord.io!
var util = require(__base+'core/util.js');
var config = require('./config.js');
var Discord = require('discord.io');

const MSG_LIMIT = 5; // Can send 5 messages
const MSG_PERIOD = 5000; // In 5 seconds
const SAFETY = 15; // Bit of extra ms
const MSG_WAIT = 250; // Minimum wait between messages

const DEBUG = process.argv[2] === 'debug';

let bot;
if(DEBUG) {
    bot = new (require('events').EventEmitter)();
    Object.assign(bot, JSON.parse(require('fs').readFileSync('./debug/bot.json')));
    bot.sendMessage = ({ to, message }, cb) => {
        console.log('D-Bug:', message);
        cb();
    };
    setTimeout(() => bot.emit('ready'), 100);
} else {
    bot = new Discord.Client({
        token: config.token,
        autorun: true
    });
}

bot.on('err', function(error) {
    _sendMessages(config.owner, `An error has occurred: ${error}`);
    console.log(new Date(), error);
});

// TODO: Crawl back through message history, 100 messages every 20 seconds, to the beginning of time

var msgQueue = {}, // Message buffer
    sentMessages = {}; // Recently sent messages
    waitUntil = 0; // Handle rate-limited response

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
        username = username.toLowerCase();
        if(!username || username.trim() === '') return false;
        for(let sKey in bot.servers) { if(!bot.servers.hasOwnProperty(sKey)) continue;
            let members = bot.servers[sKey].members;
            for(let mKey in members) { if(!members.hasOwnProperty(mKey)) continue;
                if((members[mKey].nick || '').toLowerCase() === username) return mKey;
                if(members[mKey].username.toLowerCase() === username) return mKey;
            }
        }
        return false;
    },
    getTimeFromID: _getTimeFromID
};

function _sendMessages(ID, messageArr, polite, callback) {
    messageArr = Array.isArray(messageArr) ? messageArr : [messageArr];
    let server = bot.channels[ID] ? bot.channels[ID].guild_id : 'dm';
    let sent = sentMessages[server] || [];
    sentMessages[server] = sent;
    let queue = msgQueue[server] || [];
    msgQueue[server] = queue;
    let emptyQueue = queue.length === 0;
    for(let i = 0; i < messageArr.length; i++) { // Add messages to buffer
        if(polite) messageArr[i] = suppressMentionsAndLinks(messageArr[i]);
        if(messageArr[i].length === 0) messageArr[i] = '`empty message`';
        if(messageArr[i].length > 2000) {
            // TODO: Auto-split messages over 2000 chars
            console.log('Trimming message over 2000 chars');
            messageArr[i] = messageArr[i].substr(0, 2000);
        }
        queue.push({
            ID: ID, msg: messageArr[i],
            callback: i === messageArr.length - 1 ? callback : false // Only add callback to last message
        })
    }
    function _sendMessage() {
        if(waitUntil) console.log('sending message at', Date.now(),'after waiting', waitUntil);
        waitUntil = 0;
        sent.unshift(Date.now());
        sent = sent.slice(0, MSG_LIMIT);
        let msg = queue.shift(); // Remove message from buffer
        bot.sendMessage({ to: msg.ID, message: msg.msg },
            function(err, res) {
            if(err) {
                console.log(new Date().toLocaleString(), 'Error sending message:', err);
                if(err.statusMessage === 'TOO MANY REQUESTS') {
                    console.log('rate limit received at',Date.now());
                    waitUntil = Date.now() + err.response.retry_after + SAFETY;
                }
            }
            if(msg.callback) msg.callback(err, res); // Activate callback if exists
        });
        if(queue.length) setTimeout(handleQueue, MSG_WAIT);
    }
    function handleQueue() {
        let wait = (sent[MSG_LIMIT - 1] || 0) - (Date.now() - MSG_PERIOD) + SAFETY;
        if(wait < 0 && waitUntil < Date.now()) _sendMessage(); // Can send now
        else setTimeout(_sendMessage, Math.max(wait, waitUntil - Date.now())); // Have to wait
    }
    if(emptyQueue) handleQueue();
}

function _editMessage(channel, id, message, polite, callback) {
    bot.editMessage({
        channelID: channel, messageID: id,
        message: polite ? suppressMentionsAndLinks(message) : message
    }, callback);
}

function _getUsernameFromID(id) {
    return bot.users[id] ? bot.users[id].username : false;
}

function _getTimeFromID(id) { // Converts Discord snowflake ID to timestamp, thanks /u/Natsulus!
    return new Date((id / 4194304) + 1420070400000);
}

function suppressMentionsAndLinks(message) {
    return message.replace(/<@!?[0-9]+>/g,function(match) {
        match = match.replace('!','');
        return "(@)" + _getUsernameFromID(match.substring(2, match.length - 1))
    }).replace(util.urlRX, function(match, a) {
        return (match[0] === ' ' ? ' ' : '') + '<' + a + '>';
    });
}

bot.on('presence', function(user, userID, status, game, rawEvent) {
    /*console.log(user + " is now: " + status);*/
});

bot.on('any', function(rawEvent) {
    //console.log(rawEvent) //Logs every event
});

bot.on('disconnect', function(errMsg, code) {
    console.log('Bot disconnected', errMsg, code);
    setTimeout(function(){
        bot.connect(); //Auto reconnect after 5 seconds
    },5000);
});