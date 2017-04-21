'use strict';
var util = require(__base+'core/util.js');
var storage = require(__base+'core/storage.js');
var rp = require('request-promise');

var rhymeStorage = storage.json('rhymes', { words: [] }, '\t');
var usedWords = rhymeStorage.data.words;

const EXPIRE_TIME = 15 * 60 * 1000;

var Rhyme = {
    getRhyme(word) {
        return rp(`https://api.datamuse.com/words?rel_rhy=${word}&qe=rel_rhy&md=sfp`)
            .then(results => parseTags(JSON.parse(results)))
            .catch(err => Promise.reject(`Sorry, I can't think about rhymes right now.`));
    },
    chooseBest(words, inSentence, ignoreBlacklist) {
        var bestWord = {};
        var bestMatchesType = false;
        for(var i = 1; i < words.length; i++) {
            if(!ignoreBlacklist && inBlacklist(words[i].word)) continue;
            if(bestWord.numSyllables) {
                if(inSentence && util.commonArrayElement(words[i].types, words[0].types)) {
                    if(!bestMatchesType) bestWord = words[i];
                    bestMatchesType = true;
                } else if(bestMatchesType) continue;
                var bestSylDiff = Math.abs(bestWord.numSyllables - words[0].numSyllables);
                var thisSylDiff = Math.abs(words[i].numSyllables - words[0].numSyllables);
                if(thisSylDiff < bestSylDiff) bestWord = words[i];
                else if(thisSylDiff === bestSylDiff && words[i].f > bestWord.f) bestWord = words[i];
            } else bestWord = words[i]; // Best by default
        }
        if(!bestWord.word) return false;
        return bestWord;
    },
    updateBlacklist(word) {
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
};

function parseTags(words) {
    if(!Array.isArray(words)) return words;
    for(var i = 0; i < words.length; i++) {
        var word = words[i];
        word.types = [];
        word.spellcor = [];
        for(var t = 0; t < word.tags.length; t++) {
            if(word.tags[t].substr(0, 2) === 'f:') word.f = +word.tags[t].substr(2);
            if(['n','v','adj','adv','u','proper'].includes(word.tags[t])) word.types.push(word.tags[t]);
            if(word.tags[t].substr(0, 9) === 'spellcor:') word.spellcor.push(word.tags[t].substr(9));
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