// Hey it's the rapping man!
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var storage = require(__base+'core/storage.js');
var rp = require('request-promise');

var rhymeStorage = storage.json('rhymes', { words: [] }, '\t');
var usedWords = rhymeStorage.data.words;

const EXPIRE_TIME = 15 * 60 * 1000;

var _commands = {};

_commands.rhyme = function(data) {
    var rhymeWord = encodeURIComponent(data.params[data.params.length - 1]);
    if(!rhymeWord) return discord.sendMessage(data.channel, `I can't rhyme that, man!`);
    var punctuation = '!';
    discord.bot.simulateTyping(data.channel);
    getRhyme(rhymeWord).then(results => {
            if(results.length < 2) {
                if(results[0].tags[2]) { // If there is a spelling suggestion
                    punctuation = '?'; // We're unsure about this rhyme!
                    return getRhyme(results[0].tags[1].substr(9)); // Try again with corrected word
                } else return Promise.reject(`I ain't got any rhymes for that.`);
            }
            return results;
        })
        .then(results => {
            var bestWord = chooseBest(results) || chooseBest(results, true);
            updateBlacklist(bestWord.word);
            var sentence = '';
            if(data.params.length > 1) {
                bestWord.word = fixPreceding(data.params[data.params.length - 2], bestWord.word);
                sentence = data.params.slice(0, data.params.length - 2).join(' ') + ' ';
            }
            discord.sendMessage(data.channel, `${util.capitalize(sentence + bestWord.word)}${punctuation}`);
        })
        .catch(err => discord.sendMessage(data.channel, err));
};

function getRhyme(word) {
    return rp(`https://api.datamuse.com/words?rel_rhy=${word}&qe=rel_rhy&md=sf`)
        .then(results => JSON.parse(results))
        .catch(err => Promise.reject(`Sorry, I can't think about rhymes right now.`));
}

function chooseBest(words, ignoreBlacklist) {
    var targetSyllables = words[0].numSyllables;
    var bestWord = {};
    for(var i = 1; i < words.length; i++) {
        if(!ignoreBlacklist && inBlacklist(words[i].word)) continue;
        if(bestWord.numSyllables) {
            var bestDiff = Math.abs(bestWord.numSyllables - targetSyllables);
            var thisDiff = Math.abs(words[i].numSyllables - targetSyllables);
            var bestFreq = +bestWord.tags[0].substr(2);
            var thisFreq = +words[i].tags[0].substr(2);
            if(thisDiff < bestDiff) bestWord = words[i];
            else if (thisDiff === bestDiff && thisFreq > bestFreq) bestWord = words[i];
        } else bestWord = words[i];
    }
    if(!bestWord.word) return false;
    return bestWord;
}

function fixPreceding(pre, word) {
    if(pre.toLowerCase() === 'an' && util.consonants.includes(word.substr(0, 1).toLowerCase())) {
        return pre.substr(0, 1) + ' ' + word;
    } else if(pre.toLowerCase() === 'a' && util.vowels.includes(word.substr(0, 1).toLowerCase())) {
        return pre + 'n ' + word;
    }
    return pre + ' ' + word;
}

function updateBlacklist(word) {
    var wordUpdated;
    for(var i = 0; i < usedWords.length; i++) {
        if(usedWords[i].word === word) {
            usedWords[i].lastUsed = new Date().getTime();
            wordUpdated = true;
            break;
        }
    }
    if(!wordUpdated) usedWords.push({ word, lastUsed: new Date().getTime() });
    rhymeStorage.save();
}

function inBlacklist(word) {
    if(!word) return false;
    for(var i = 0; i < usedWords.length; i++) {
        if(usedWords[i].lastUsed < new Date().getTime() - EXPIRE_TIME) {
            usedWords.splice(i, 1);
            i--;
        } else if(usedWords[i].word === word) return true;
    }
}

module.exports = {
    commands: _commands,
    help: {
        rhyme: ['Win a rap battle','my name is sam']
    }
};