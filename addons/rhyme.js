// Hey it's the rapping man!
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var requireNew = require('require-new');
var rhyme = requireNew('./helpers/rhyme.js');

var _commands = {};

_commands.rhyme = function(data) {
    var rhymeWord = encodeURIComponent(/\w+.?\w+/g.exec(data.params[data.params.length - 1])[0]);
    if(!rhymeWord) return discord.sendMessage(data.channel, `I can't rhyme that, man!`);
    var punctuation = '!';
    discord.bot.simulateTyping(data.channel);
    rhyme.getRhyme(rhymeWord)
        .then(results => { // Retry once
            if(results.length === 1 && results[0].spellcor[0]) { // If there is a spelling suggestion
                punctuation = '?'; // We're unsure about this rhyme!
                return getRhyme(results[0].spellcor[0]); // Try again with corrected word
            }
            return results;
        })
        .then(results => { // Check for rhymes
            if(results.length < 2) return Promise.reject(`I ain't got any rhymes for that.`);
            else return results;
        })
        .then(results => { // Pick one and send it
            var isSentence = data.params.length > 1;
            var bestWord = rhyme.chooseBest(results, isSentence) || rhyme.chooseBest(results, isSentence, true);
            rhyme.updateBlacklist(bestWord.word);
            var sentence = '';
            if(data.params.length > 1) {
                bestWord.word = util.fixIndefiniteArticle(data.params[data.params.length - 2], bestWord.word);
                if(data.params.length > 2) sentence = data.params.slice(0, data.params.length - 2).join(' ') + ' ';
            }
            discord.sendMessage(data.channel, `${util.capitalize(sentence + bestWord.word)}${punctuation}`);
        })
        .catch(err => discord.sendMessage(data.channel, err));
};

module.exports = {
    commands: _commands,
    help: {
        rhyme: ['Win a rap battle','my name is sam']
    }
};