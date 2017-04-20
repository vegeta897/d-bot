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
    var wordMapStorage = storage.json('word-map');
    var wordMap = wordMapStorage.data;
    if(!wordMap.words) return discord.sendMessage(data.channel, 'The word map needs to be built with `markovbuild`');
    var inputWords = util.getRegExpMatches(data.paramStr, util.matchWordsRX);
    if(inputWords.length === 0) {
        inputWords = [util.pickInArray(wordMap.words)];
    }
    var sequence = [];
    for(var t = inputWords.length - 1; t >= 0; t--) {
        sequence.push(wordMap.wordIndices[inputWords[t].toLowerCase()]);
    }
    if(!sequence[0]) return discord.sendMessage(data.channel, `Couldn't start a chain with that.`);
    var sentenceLength = 12; // Ideal max sentence word length, seek new words until this is reached
    var messageLength = 24; // Ideal max message length;
    var curSentenceLen = sequence.length;
    var safety = 0;
    do {
        safety++;
        if(!sequence[0]) {
            curSentenceLen = 1;
            do var beginWord = util.randomIntRange(1,wordMap.words.length-1);
            while(!wordMap.links[beginWord][0].includes(0));
            sequence.unshift(beginWord);
        }
        var prev = wordMap.links[sequence[0]][0];
        var next = wordMap.links[sequence[0]][1];
        var great = [], good = [], poor = [];
        for(var l = 0; l < prev.length; l++) {
            if(prev[l] !== (sequence[1] || 0)) continue;
            if(((curSentenceLen >= sentenceLength || sequence.length >= messageLength) && next[l] === 0) ||
                (curSentenceLen < sentenceLength && next[l] > 0)) {
                if(wordMap.links[next[l]] && curSentenceLen + 1 < sentenceLength && !wordMap.links[next[l]][1].includes(0)) {
                    great.push(next[l]);
                } else {
                    good.push(next[l]);
                }
            } else {
                poor.push(next[l]);
            }
        }
        if(great.length) { // Try to pick a great word
            sequence.unshift(util.pickInArray(great));
        } else if(good.length) { // Try to pick a good word
            sequence.unshift(util.pickInArray(good));
        } else if(poor.length) { // Try to pick a poor word
            sequence.unshift(util.pickInArray(poor));
        } else { // No words to pick? End this sentence.
            sequence.unshift(0);
            continue;
        }
        curSentenceLen++;
        if(sequence.length >= messageLength && !sequence[0]) break;
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
            output += ' ' + (newSentence ? util.capitalize(word) : word)
            newSentence = false;
        }
    }
    discord.sendMessage(data.channel, output);
};

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
    var indices = [];
    for(var w = 0; w < words.length; w++) {
        var word = words[w].toLowerCase();
        var wordIndex = wordMap.wordIndices[word];
        if(!wordIndex) {
            wordIndex = wordMap.words.length;
            wordMap.words[wordIndex] = word;
            wordMap.wordIndices[word] = wordIndex;
            wordMap.links[wordIndex] = [[],[]]
        }
        indices.push(wordIndex);
    }
    for(var i = 0; i < indices.length; i++) {
        var prev = indices[i-1] || 0;
        var next = indices[i+1] || 0;
        wordMap.links[indices[i]][0].push(prev);
        wordMap.links[indices[i]][1].push(next);
    }
}

function buildWordMap() {
    wordMap.wordIndices = {};
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

module.exports = {
    commands: _commands,
    listen: function(data) {
        if(!data.command && parseMessage(data.message)) wordMapStorage.save();
    },
    help: {
        markov: ['Build markov chain sentences from chat history', 'This is really']
    }
};