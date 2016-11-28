// Functions related to finding messages
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');

var DateFormat = require('dateformat');

module.exports = {
    parseParams: function(params) { // Separate skip number from search string
        var paramString = params.join(' ').trim();
        if(!paramString || paramString.length == 0) {
            return false;
        }
        var limit = 1;
        if(params.length > 1 && params[0] == parseInt(params[0]) && params[0] > 0) {
            // If a valid skip number was specified (2 means return the 2nd result, so skip 1 record)
            limit = Math.max(2,+params[0]); // 1 and 2 are equivalent, to avoid confusion with how skipping works
            params.shift();
            paramString = params.join(' ');
        }
        if(paramString[0] == '"' && paramString[params.string.length-1] == '"' && paramString.length > 2) {
            paramString = paramString.substring(1,paramString.length-2); // Trim quotes
        }
        return { string: paramString, limit: limit };
    },
    addChannelQuery: function(query, channel) {
        if(config.privateChannels.includes(channel)) { // If command used in a private channel
            query.channel = channel; // Only search that channel
        } else {
            query['$not'] = { channel: { $in: config.privateChannels } }; // Search all non-private channels
        }
    },
    formatMessage: function(message, result, hideTimestamp) {
        var timestamp = DateFormat(new Date(message.time), 'mmmm dS, yyyy - h:MM:ss TT') + ' EST ';
        if(new Date() - new Date(message.time) < 86400000) {
            var timeSince = util.getTimeUnits(new Date() - new Date(message.time));
            timestamp =  `${timeSince[0]} ${timeSince[1]} ago `;
        }
        if(hideTimestamp) timestamp = '';
        var username = discord.getUsernameFromID(message.user);
        var skipNotice = result ? `\`${result[0].toLocaleString()} of ${result[1].toLocaleString()}\` ` : '';
        return skipNotice + timestamp + '**' + username + ':** ' + message.content;
    }
};