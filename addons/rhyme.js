// Hey it's the rapping man!
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var storage = require(__base+'core/storage.js');
var request = require('request');

var rhymeStorage = storage.json('rhymes', { words: [] }, '\t');
var usedWords = rhymeStorage.data.words;

const EXPIRE_TIME = 10 * 60 * 1000;

var _commands = {};

_commands.rhyme = function(data) {
    var rhymeWord = encodeURIComponent(data.params[data.params.length - 1]);
    if(!rhymeWord) return discord.sendMessage(data.channel, `I can't rhyme that, man!`);
    discord.bot.simulateTyping(data.channel);
    var errorMsg = `Sorry, I can't think about rhymes right now.`;
    var url = `https://api.datamuse.com/words?rel_rhy=${rhymeWord}&qe=rel_rhy&md=s`;
    request(url, function(err, response, results) {
        if(err) {
            console.log(err);
            return discord.sendMessage(data.channel, errorMsg);
        }
        results = JSON.parse(results);
        rhymeWord = results[0].word;
        if(results.length < 2) return discord.sendMessage(data.channel, `I ain't got any rhymes for that.`);
        var targetSyllables = results[0].numSyllables;
        var bestWord = {};
        for(var i = 1; i < results.length; i++) {
            if(inBlacklist(results[i].word)) continue;
            if(!bestWord.numSyllables ||
                Math.abs(results[i].numSyllables - targetSyllables) < Math.abs(bestWord.numSyllables - targetSyllables)) bestWord = results[i];
        }
        if(!bestWord.word) bestWord = results[1];
        updateBlacklist(bestWord.word);
        discord.sendMessage(data.channel, `${util.capitalize(bestWord.word)}!`);
    });
    refreshBlacklist();
};

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