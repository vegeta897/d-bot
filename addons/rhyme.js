// Hey it's the rapping man!
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var messages = require(__base+'core/messages.js');
var requireUncached = require('require-uncached');
var rhyme = requireUncached('./helpers/rhyme.js');

var _commands = {};

_commands.rhyme = function(data) {
    if(data.params.length === 0) {
        messages.wrap(messages.db.find({ channel: data.channel }).sort({time:-1}).limit(1), function(results) {
            data.params = results[0] ? results[0].content.split(' ') : [];
            doRhyme(data);
        });
    } else doRhyme(data);
};

function doRhyme(data) {
    var rhymeWord = data.params[data.params.length - 1];
    var punctuation = rhymeWord.slice(-1) === '?' ? '?' : '!';
    rhymeWord = rhymeWord ? encodeURIComponent(/\w+.?\w+/g.exec(rhymeWord)[0]) : false;
    if(!rhymeWord) return data.reply(`I can't rhyme that, man!`);
    discord.bot.simulateTyping(data.channel);
    rhyme.getRhyme(rhymeWord)
        .then(results => { // Retry once
            if(results.length === 1 && results[0].spellcor[0]) { // If there is a spelling suggestion
                punctuation = '?'; // We're unsure about this rhyme!
                return rhyme.getRhyme(results[0].spellcor[0]); // Try again with corrected word
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
            data.reply(`${util.capitalize(sentence + bestWord.word)}${punctuation}`);
        })
        .catch(err => data.reply(err));
}

module.exports = {
    commands: _commands,
    help: {
        rhyme: ['Win a rap battle','my name is sam']
    }
};