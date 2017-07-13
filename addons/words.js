// Top-typed words
var util = require('./../core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');

var _commands = {};

_commands.words = data => getTopWords(data);

_commands.unique = data => getTopWords(data, true);

function getTopWords(data, unique) {
    var maxWords = 10;
    if(data.params.length && data.params[0] > 0) {
        maxWords = util.clamp(Math.round(+data.params.shift()),1,25);
        data.paramStr = data.params.join(' ');
    }
    if(unique && data.params.length === 0) return discord.sendMessage(data.channel, `You must specify a username`);
    var userID = discord.getIDFromUsername(data.paramStr);
    var allUsers = data.params.length === 0;
    if(!allUsers && !userID) return discord.sendMessage(data.channel, `I don't know anyone named "${data.paramStr}"`);
    var query = (unique || allUsers) ? null : { user: userID };
    messages.wrap(messages.db.find(query),function(allMessages) {
        if(!allMessages) return discord.sendMessage(data.channel, 'No messages found for that user!');
        var dictionary = {};
        var exclude = {};
        for(var m = 0; m < allMessages.length; m++) {
            var message = allMessages[m].content.replace(/(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi,'');
            var words = message.match(/([a-z'-]{3,})/gi);
            if(!words || !words.length) continue;
            for(var w = 0; w < words.length; w++) {
                var thisWord = words[w].toLowerCase();
                if(!unique && junkWords.includes(thisWord)) continue;
                var obj = (!unique || allMessages[m].user === userID) ? dictionary : exclude;
                if(obj.hasOwnProperty(thisWord)) obj[thisWord]++;
                else obj[thisWord] = 1;
            }
        }
        for(var key in exclude) delete dictionary[key];
        var topWords = Object.keys(dictionary).sort(function(a, b) { return dictionary[b] - dictionary[a]; });
        topWords.length = Math.min(topWords.length, maxWords);
        for(var t = 0; t < topWords.length; t++) {
            topWords[t] = { w: topWords[t], c: dictionary[topWords[t]] };
        }
        var finalMessage = `__Top ${maxWords}${unique ? ' unique' : ''} words${userID ? ' by ' + data.paramStr : ''}__`;
        for(var tw = 0; tw < topWords.length; tw++) {
            finalMessage += `\n**${topWords[tw].c.toLocaleString()}** - ${topWords[tw].w}`;
        }
        if(unique && topWords.length === 0) finalMessage += '\n*This user hasn\'t used any unique words*';
        discord.sendMessage(data.channel, finalMessage);
    });
}

var junkWords = [
    'the','this','that','are','and','what','he','all','how','one','get',"it's","don't",
    'you','its','they','can','have','was','but','com','about',"i'm",'your','out',
    'now','only','with','for','like','just','not','really','from','when','where',
    'would','why','who','did','there','had','has','than','them','should','then',
    'got','too',"that's",'dont','also','could','much','his','though',"there's",
    'been','some','going','yeah','because','see','even','any','will','gonna',
    'thats','cant','these','want','still','more','pretty','more','well','make',
    'into','way',"didn't","i've",'probably','him','were','kind',"he's",'right',
    "can't","you're",'does','yes','thing','think','good','know','new','need','back',
    'off',"i'll",'here','other','looks','guess','time','said','time','use','mean',
    'say','look'
];

module.exports = {
    commands: _commands,
    help: {
        words: ['Get the most used (excluding common) words, either for everyone or a specific user',
            '15', '10 vegeta897'],
        unique: ['Get the most used words said by a user that nobody else has used',
            '10 vegeta897']
    }
};