// Generate pseudo-markov chains from message history
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var storage = require(__base+'core/storage.js');
var Canvas = require('canvas');

var wordMap = storage.json('word-map');
if(!wordMap.get('words')) {
    console.log('Markov addon could not find word map data, building now...');
    buildWordMap();
}

var lastMarkov = false;
const LM_CHOICES = 7;

var _commands = {};

_commands.markov = async function(data) {
    if(!wordMap.get('words')) await buildWordMap();
    if(data.paramStr.length > 400) return data.reply('tl;dr');
    lastMarkov = {
        inputString: data.paramStr,
        choices: []
    };
    var inputWords = util.getRegExpMatches(data.paramStr, util.matchWordsRX);
    let inputWordCount = inputWords.length;
    let sequence;
    if(inputWordCount === 0) {
        inputWords = [wordMap.get('words')[pickWord(true)]];
        lastMarkov.inputString = inputWords[0];
        inputWordCount++;
    } else {
    }
    sequence = inputWords.map(word => wordMap.get('words').indexOf(word.toLowerCase()));
    if(sequence[sequence.length - 1] < 1) {
        let addedWord = pickWord();
        sequence.push(addedWord);
        lastMarkov.inputString += ' ' + wordMap.get('words')[addedWord];
        inputWordCount++;
    }
    sequence.reverse();
    var messageLength = Math.max(inputWordCount + 1, 15); // Ideal max message length;
    do {
        var prevWords = wordMap.get('links')[sequence[0]][0];
        var nextWords = wordMap.get('links')[sequence[0]][1];
        if(prevWords.length + nextWords.length === 0) break;
        let maxScore = 0;
        var choiceSet = [];
        var choices = nextWords.map((nextWord, index) => {
            let score = 0;
            if(prevWords[index] === sequence[1]) score += 3;
            if(sequence.length < messageLength) {
                if(nextWord > 0) {
                    if(wordMap.get('links')[nextWord][1].some(elem => elem > 0)) score += 3; // Not an ending word
                } else {
                    score -= 1 + (messageLength - sequence.length); // More penalty for ending farther under max length
                }
            } else if(nextWord === 0) {
                score += 1 + (sequence.length - messageLength); // More points for ending farther above max length
            }
            maxScore = Math.max(maxScore, score);
            return { word: nextWord, score };
        });
        choices.sort((a, b) => b.score - a.score + util.random(Math.floor(-maxScore/2), Math.ceil(maxScore/2)));
        if(choices[0].word) {
            for(let i = 0; i < choices.length; i++) {
                let word = wordMap.get('words')[choices[i].word];
                if(word && !choiceSet.includes(word)) choiceSet.push(word);
                if(choiceSet.length === LM_CHOICES) break;
            }
            lastMarkov.choices.push(choiceSet);
        }
        sequence.unshift(choices[0].word);
    } while(sequence[0] > 0);

    // Output
    sequence.reverse();
    var output = lastMarkov.inputString;
    lastMarkov.finalWords = [];
    for(var f = inputWordCount; f < sequence.length; f++) {
        var word = wordMap.get('words')[sequence[f]];
        if(word) {
            output += ' ' + (['i','im','i\'m'].includes(word) ? util.capitalize(word) : word);
        } else if(sequence[f] === 0) {
            output += '.';
        } else { // Does this ever run?
            word = data.params[f];
            output += ' ' + word;
        }
        if(word) lastMarkov.finalWords.push(word);
    }
    if(!lastMarkov.choices[0] || !lastMarkov.choices[0][0]) lastMarkov = false;
    data.reply(util.capitalize(output));
};

_commands.mapkov = function(data) {
    if(!lastMarkov) return data.reply('You have to generate a `/markov` first');
    const HEADER = 30;
    const LINE_HEIGHT = 24;
    const SPACE = '    ';
    let canvas = new Canvas(400,
        HEADER + lastMarkov.choices.length * LINE_HEIGHT);
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = '#bbbbbb';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '24px Roboto';
    util.resizeFontToFit(ctx, lastMarkov.inputString, 'Roboto', canvas.width - 2, 28);
    ctx.fillText(lastMarkov.inputString, canvas.width / 2, Math.floor(HEADER / 2));
    ctx.textAlign = 'left';
    for(let i = 0; i < lastMarkov.choices.length; i++) {
        let choiceSet = lastMarkov.choices[i];
        choiceSet.sort();
        let metrics = util.resizeFontToFit(ctx, choiceSet.join(SPACE), 'Roboto', canvas.width - 8, 20);
        let blotX = Math.floor((canvas.width - metrics.width) / 2);
        for(let j = 0; j < choiceSet.length; j++) {
            let wordText = choiceSet[j] + (j === choiceSet.length - 1 ? '' : SPACE);
            let blotY = HEADER + i * LINE_HEIGHT;
            if(choiceSet[j] === lastMarkov.finalWords[i]) {
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                let wordMetrics = ctx.measureText(choiceSet[j]);
                ctx.fillRect(blotX - 4, blotY, wordMetrics.width + 8, LINE_HEIGHT);
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.fillStyle = '#999999';
            }
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 2;
            ctx.fillText(wordText, blotX, blotY + 0.5 * LINE_HEIGHT);
            ctx.restore();
            blotX += Math.floor(ctx.measureText(wordText).width);
        }
    }
    lastMarkov = false;
    discord.bot.uploadFile({ to: data.channel, filename: 'mapkov.png', file: canvas.toBuffer() });
};

function pickWord(beginning) {
    do {
        var beginWordIndex = util.randomInt(1, wordMap.get('words').length - 1);
        var beginWordLink = wordMap.get('links')[beginWordIndex];
    } while ((beginning && !beginWordLink[0].includes(0)) || beginWordLink[1].includes(0));
    return beginWordIndex;
}

async function buildWordMap() {
    wordMap.set('words', [null]);
    wordMap.set('links', [null]);
    // Get all messages containing at least 2 consecutive words
    var multiWordRX = /(?: |^)([a-z1-9'-]+) ([a-z1-9'-]+)(?=$|[ ,.!?])/gi;
    let allMessages = await messages.cursor(db => db.cfind({ content: multiWordRX }).sort({ time: 1 }));
    if(!allMessages) return console.log(`Can't create word map, no messages in log!`);
    for(var i = 0; i < allMessages.length; i++) {
        parseMessage(allMessages[i].content);
    }
    wordMap.save();
    console.log('Word map data built!');
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
        var wordIndex = wordMap.get('words').indexOf(word);
        if(wordIndex < 0) {
            wordIndex = wordMap.get('words').length;
            wordMap.get('words')[wordIndex] = word;
            wordMap.get('links')[wordIndex] = [[],[]]
        }
        return wordIndex;
    });
    for(var i = 0; i < indices.length; i++) {
        var prev = indices[i-1] || 0;
        var next = indices[i+1] || 0;
        wordMap.get('links')[indices[i]][0].push(prev);
        wordMap.get('links')[indices[i]][1].push(next);
    }
}

module.exports = {
    commands: _commands,
    listen: function(data) {
        if(!data.command && parseMessage(data.message)) wordMap.save();
    },
    help: {
        markov: ['Build markov chain sentences from chat history', 'This is really'],
        mapkov: ['Generate a word-map from the previous markov']
    }
};
