// Hey it's the rapping man!
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var storage = require(__base+'core/storage.js');
var request = require('request');

var rhymeStorage = storage.json('rhymes', { words: [] }, '\t');
var usedWords = rhymeStorage.data.words;

const EXPIRE_TIME = 15 * 60 * 1000;

var _commands = {};

_commands.rhyme = function(data) {
    var rhymeWord = encodeURIComponent(data.params[data.params.length - 1]);
    if(!rhymeWord) return discord.sendMessage(data.channel, `I can't rhyme that, man!`);
    discord.bot.simulateTyping(data.channel);
    var url = `https://api.datamuse.com/words?rel_rhy=${rhymeWord}&qe=rel_rhy&md=sf`;
    request(url, function(err, response, results) {
        if(err) {
            console.log(err);
            return discord.sendMessage(data.channel, `Sorry, I can't think about rhymes right now.`);
        }
        results = JSON.parse(results);
        rhymeWord = results[0].word;
        if(results.length < 2) return discord.sendMessage(data.channel, `I ain't got any rhymes for that.`);
        var bestWord = chooseBest(results) || chooseBest(results, true);
        updateBlacklist(bestWord.word);
        var sentence = '';
        if(data.params.length > 1) {
            bestWord.word = fixPreceding(data.params[data.params.length - 2], bestWord.word);
            sentence = data.params.slice(0, data.params.length - 2).join(' ') + ' ';
        }
        discord.sendMessage(data.channel, `${util.capitalize(sentence + bestWord.word)}!`);
    });
    refreshBlacklist();
};

function fixPreceding(pre, word) {
    if(pre.toLowerCase() === 'an' && util.consonants.includes(word.substr(0, 1).toLowerCase())) {
        return pre.substr(0, 1) + ' ' + word;
    } else if(pre.toLowerCase() === 'a' && util.vowels.includes(word.substr(0, 1).toLowerCase())) {
        return pre + 'n ' + word;
    }
    return pre + ' ' + word;
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

function refreshBlacklist() {
    for(var i = 0; i < usedWords.length; i++) {
        if(usedWords[i].lastUsed < new Date().getTime() - EXPIRE_TIME) {
            usedWords.splice(i, 1);
            i--;
        }
    }
    rhymeStorage.save();
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
        if(usedWords[i].word === word) {
            return true;
        }
    }
}

module.exports = {
    commands: _commands,
    help: {
        rhyme: ['Win a rap battle','my name is sam']
    }
};