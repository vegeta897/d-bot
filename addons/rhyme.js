// Hey it's the rapping man!
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var messages = require(__base+'core/messages.js');
var requireUncached = require('require-uncached');
var rhyme = requireUncached('./helpers/rhyme.js');

var _commands = {};

_commands.rhyme = async function(data) {
    let words = data.params.slice(0);
    if(words.length === 0) {
        let lastMessages = await messages.cursor(
            db => db.cfind({ channel: data.channel }).sort({time:-1}).limit(1)
        );
        words = lastMessages[0].content.split(' ');
    }
    doRhyme(words[words.length - 1], data);
};

async function doRhyme(word, data) {
    word = word ? encodeURIComponent(/\w+.?\w+/g.exec(word)[0]) : false;
    if(!word) return data.reply(`I can't rhyme that, man!`);
    let punctuation = word.slice(-1) === '?' ? '?' : '!';
    data.messageObject.channel.sendTyping();
    try {
        let rhymes = await rhyme.getRhyme(word);
        if(rhymes.length === 1 && rhymes[0].spellcor[0]) { // If there is a spelling suggestion
            punctuation = '?'; // We're unsure about this rhyme!
            rhymes = await rhyme.getRhyme(rhymes[0].spellcor[0]); // Try again with corrected word
        }
        if(rhymes.length < 2) return data.reply(`I ain't got any rhymes for that.`);
        let isSentence = data.params.length > 1;
        let bestWord = rhyme.chooseBest(rhymes, isSentence) || rhyme.chooseBest(rhymes, isSentence, true);
        rhyme.updateBlacklist(bestWord.word);
        let sentence = '';
        if(data.params.length > 1) {
            bestWord.word = util.fixIndefiniteArticle(data.params[data.params.length - 2], bestWord.word);
            if(data.params.length > 2) sentence = data.params.slice(0, data.params.length - 2).join(' ') + ' ';
        }
        data.reply(`${util.capitalize(sentence + bestWord.word)}${punctuation}`);
    } catch(e) {
        data.reply(`Sorry, I can't think about rhymes right now.`);
    }
}

module.exports = {
    commands: _commands,
    help: {
        rhyme: ['Win a rap battle','my name is sam']
    }
};
