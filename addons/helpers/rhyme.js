// Serving it up fresh
var util = require(__base+'core/util.js');
var storage = require(__base+'core/storage.js');
var rp = require('request-promise');

var rhymeStorage = storage.json('rhymes', { words: [] }, '\t');
var usedWords = rhymeStorage.get('words');

const EXPIRE_TIME = 30 * 60 * 1000;

var Rhyme = {
    getRhyme: async function(word) {
        return rp(`https://api.datamuse.com/words?rel_rhy=${word}&qe=rel_rhy&md=sfp`)
            .then(results => parseTags(JSON.parse(results)));
    },
    chooseBest(words, inSentence, ignoreBlacklist) {
        var bestWord = {};
        var bestMatchesType = false;
        for(let word of words) {
            if(!ignoreBlacklist && inBlacklist(word.word)) continue;
            if(bestWord.numSyllables) {
                if(inSentence && util.commonArrayElement(word.types, words[0].types)) {
                    if(!bestMatchesType) bestWord = word;
                    bestMatchesType = true;
                } else if(bestMatchesType) continue;
                var bestSylDiff = Math.abs(bestWord.numSyllables - words[0].numSyllables);
                var thisSylDiff = Math.abs(word.numSyllables - words[0].numSyllables);
                if(thisSylDiff < bestSylDiff) bestWord = word;
                else if(thisSylDiff === bestSylDiff && word.f > bestWord.f) bestWord = word;
            } else bestWord = word; // Best by default
        }
        if(!bestWord.word) return false;
        return bestWord;
    },
    updateBlacklist(word) {
        var wordUpdated;
        for(let usedWord of usedWords) {
            if(usedWord.word === word) {
                usedWord.lastUsed = new Date().getTime();
                wordUpdated = true;
                break;
            }
        }
        if(!wordUpdated) usedWords.push({ word, lastUsed: new Date().getTime() });
        rhymeStorage.save();
    }
};

function parseTags(words) {
    if(!Array.isArray(words)) return words;
    for(let word of words) {
        word.types = [];
        word.spellcor = [];
        for(let tag of word.tags) {
            if(tag.substr(0, 2) === 'f:') word.f = +tag.substr(2);
            if(['n','v','adj','adv','u','proper'].includes(tag)) word.types.push(tag);
            if(tag.substr(0, 9) === 'spellcor:') word.spellcor.push(tag.substr(9));
        }
    }
    return words;
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

module.exports = Rhyme;
