// Generate pseudo-markov chains from message history
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var config = require(__base+'core/config.js');
var storage = require(__base+'core/storage.js');

var wordMapStorage = storage.json('word-map');
var wordMap = wordMapStorage.data;
if(!wordMap.words) {
    console.log('Markov addon could not find word map data, building now...');
    buildWordMap();
}

var _commands = {};

_commands.markov = function(data) {
    if(!wordMap.words) return discord.sendMessage(data.channel, 'The word map needs to be built with `markovbuild`');
    var inputWords = util.getRegExpMatches(data.paramStr, util.matchWordsRX);
    if(inputWords.length === 0) {
        do {
            var beginWordIndex = util.randomIntRange(1, wordMap.words.length - 1);
            var beginWordLink = wordMap.links[beginWordIndex];
        } while (!beginWordLink[0].includes(0) || beginWordLink[1].includes(0));
        inputWords = [wordMap.words[beginWordIndex]];
    }
    var sequence = inputWords.map(word => wordMap.words.indexOf(word.toLowerCase()));
    sequence.reverse();
    if(sequence[0] < 1) return discord.sendMessage(data.channel, `Couldn't start a chain with that.`);
    var messageLength = 12; // Ideal max message length;
    var safety = 0;
    do {
        safety++;
        var prevWords = wordMap.links[sequence[0]][0];
        var nextWords = wordMap.links[sequence[0]][1];
        var choices = prevWords.map((prevWord, index) => {
            let nextWord = nextWords[index];
            let score = 0;
            if(prevWord === sequence[1]) score += 2;
            if(sequence.length < messageLength) {
                if(nextWord > 0) {
                    score += 1;
                    if(wordMap.links[nextWord][1].some(elem => elem > 0)) score += 1;
                }
            } else if(nextWord === 0) {
                score += 5;
            }
            return { word: nextWord, score };
        });
        choices.sort((a, b) => b.score - a.score);
        sequence.unshift(choices[0].word);
        if(sequence[0] === 0) break;
    } while(safety < 1000);
    
    // Output
    sequence.reverse();
    var output = '';
    var newSentence = true;
    for(var f = 0; f < sequence.length; f++) {
        var word = wordMap.words[sequence[f]];
        if(sequence[f]) {
            output += ' ' + (newSentence || ['i','im','i\'m'].includes(word) ? util.capitalize(word) : word);
            newSentence = false;
        } else if(sequence[f] === 0) {
            output += '.';
            newSentence = true;
        } else {
            word = data.params[f];
            output += ' ' + (newSentence ? util.capitalize(word) : word);
            newSentence = false;
        }
    }
    discord.sendMessage(data.channel, output);
};

function buildWordMap() {
    wordMap.words = [null];
    wordMap.links = [null];
    // Get all messages containing at least 2 consecutive words
    var multiWordRX = /(?: |^)([a-z1-9'-]+) ([a-z1-9'-]+)(?=$|[ ,.!?])/gi;
    messages.wrap(messages.db.find({ content: multiWordRX }).sort({ time: 1 }), function(allMessages) {
        if(!allMessages) return console.log(`Can't create word map, no messages in log!`);
        for(var i = 0; i < allMessages.length; i++) {
            parseMessage(allMessages[i].content);
        }
        wordMapStorage.save();
        console.log('Word map data built!');
    });
}

function parseMessage(msg) {
    var statements = util.getRegExpMatches(msg, /(?: |^)([a-z1-9' -]+)(?=$|[,.!?])/gi); // Capture punctuated statements
    var wordsAdded = false;
    for(var s = 0; s < statements.length; s++) { // Break messages into statements
        var words = util.getRegExpMatches(statements[s], util.matchWordsRX);
        if(words.length > 1) wordsAdded = true;
        addWords(words) ;
    }
    return wordsAdded;
}

function addWords(words) {
    var indices = words.map(word => {
        word = word.toLowerCase();
        var wordIndex = wordMap.words.indexOf(word);
        if(wordIndex < 0) {
            wordIndex = wordMap.words.length;
            wordMap.words[wordIndex] = word;
            wordMap.links[wordIndex] = [[],[]]
        }
        return wordIndex;
    });
    for(var i = 0; i < indices.length; i++) {
        var prev = indices[i-1] || 0;
        var next = indices[i+1] || 0;
        wordMap.links[indices[i]][0].push(prev);
        wordMap.links[indices[i]][1].push(next);
    }
}

module.exports = {
    commands: _commands,
    listen: function(data) {
        if(!data.command && parseMessage(data.message)) wordMapStorage.save();
    },
    help: {
        markov: ['Build markov chain sentences from chat history', 'This is really']
    }
};