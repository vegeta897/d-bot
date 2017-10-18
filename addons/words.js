// Top-typed words
var util = require('./../core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');
var Canvas = require('canvas');
var requireUncached = require('require-uncached');
const { UnitContext } = requireUncached('./helpers/canvas.js');
var DateFormat = require('dateformat');
var NodeEmoji = require('node-emoji');

var _commands = {};

_commands.words = data => getTopWords(data);

_commands.unique = data => getTopWords(data, true);

_commands.graph = function(data) {
    let graphUsers = data.params.length === 0;
    let words = graphUsers ? [] : data.params;
    let rxWords = words.map(w => w.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
    let query = graphUsers ? {} : { content: new RegExp('(?:^|[^a-z])(' + rxWords.join('|') + ')(?:$|[^a-z])', 'gi') };
    messages.wrap(messages.db.find(query).sort({ time: 1 }), function(allMessages) {
        if(!allMessages) return data.reply(`Couldn't find any messages` + (graphUsers ? '' : ` containing _${data.paramStr}_`));
        let dailyUsage = {};
        let firstDate = graphUsers ? new Date(allMessages[0].time) : null, 
            firstDay = graphUsers ? Math.floor(firstDate.getTime() / 8.64e7) : null;
        for(let m = 0; m < allMessages.length; m++) {
            let message = allMessages[m];
            let day = Math.floor(new Date(message.time) / 8.64e7 - firstDay);
            if(graphUsers) {
                let username = discord.getUsernameFromID(message.user);
                if(!username) continue;
                if(!words.includes(username)) words.push(username);
                if(!dailyUsage[username]) dailyUsage[username] = [];
                dailyUsage[username][day] = (dailyUsage[username][day] || 0) + 1;
            } else {
                rxWords.forEach((rxWord, i) => {
                    let rxMatches = util.getRegExpMatches(message.content,
                        new RegExp('(?:^|[^a-z])(' + rxWord + ')(?:$|[^a-z])', 'gi'));
                    if(!rxMatches || rxMatches.length === 0 || !rxMatches[0]) return;
                    if(!firstDay) {
                        firstDate = new Date(message.time);
                        firstDay = Math.floor(firstDate.getTime() / 8.64e7);
                    }
                    day = Math.floor(new Date(message.time) / 8.64e7 - firstDay);
                    if(!dailyUsage[words[i]]) dailyUsage[words[i]] = [];
                    dailyUsage[words[i]][day] = (dailyUsage[words[i]][day] || 0) + rxMatches.length;
                });
            }
        }
        let totalDays = Math.floor(new Date() / 8.64e7) - firstDay;
        if(!firstDay || totalDays < 1) return data.reply(`Not enough usage to graph that`);
        let sumArray = (t, c) => t + c;
        let maxTotal = words.filter(w => dailyUsage[w])
            .map(w => dailyUsage[w].reduce(sumArray, 0)).reduce((t, c) => Math.max(t, c), 0);
        if(graphUsers) words = words.filter(w => dailyUsage[w].reduce(sumArray, 0) > maxTotal / 300);
        words.sort((a, b) => dailyUsage[b].reduce(sumArray, 0) - dailyUsage[a].reduce(sumArray, 0));
        let yInc;
        let yIncs = [1, 5, 10, 15, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
        for(let i = 0; i < yIncs.length; i++) {
            yInc = yIncs[i];
            if(Math.ceil(maxTotal / yInc) < 16) break;
        }
        let yIncCount = Math.ceil(maxTotal / yInc);
        let wordLabelSize = Math.floor(words.length > 8 ? 40 - (words.length - 8) * 10 / 8 : 40);
        let wordsPerLine = Math.floor(160 / wordLabelSize);
        while(Math.ceil(words.length / (wordsPerLine - 1)) === Math.ceil(words.length / wordsPerLine)) wordsPerLine--;
        const IMAGE_W = 800, IMAGE_H = 600;
        const TOP = 20 + Math.ceil(words.length / wordsPerLine) * wordLabelSize, BOTTOM = 58,
            LEFT = 0, RIGHT = 16 + 16 * (Math.ceil(maxTotal / yInc) * yInc).toLocaleString().length;
        const GRAPH_W = IMAGE_W - RIGHT - LEFT, GRAPH_H = IMAGE_H - TOP - BOTTOM;
        let imgCanvas = new Canvas(IMAGE_W, IMAGE_H);
        let imgCtx = imgCanvas.getContext('2d');
        let graphCanvas = new Canvas(GRAPH_W, GRAPH_H);
        let ctx = new UnitContext(graphCanvas.getContext('2d'), GRAPH_W, GRAPH_H);
        ctx.lineWidth(0.004);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.8;
        let colors = words.length === 1 ? COLORS : COLORS.slice(1);
        for(let w = words.length - 1; w >= 0; w--) { // Draw word usage data
            let usage = dailyUsage[words[w]];
            if(!usage) continue;
            let total = 0;
            let prevY = 1;
            let offset = 0.004;
            ctx.strokeStyle = colors[w % colors.length];
            ctx.beginPath();
            ctx.moveTo(offset, 1);
            for(let d = 0; d <= totalDays; d++) {
                total += usage[d] || 0;
                let x = offset + (1 - offset) * d / totalDays;
                let y = offset + (1 - offset) * (1 - total / (yIncCount * yInc));
                ctx.lineTo(x, prevY);
                ctx.lineTo(x, y);
                prevY = y;
            }
            ctx.lineTo(offset + (1 - offset), prevY);
            ctx.stroke();
        }
        imgCtx.fillStyle = '#DDDDDD';
        imgCtx.font = `${Math.floor(wordLabelSize * 9 / 10)}px Roboto`;
        imgCtx.textBaseline = 'top';
        imgCtx.textAlign = 'center';
        for(let i = 0; i < words.length; i++) { // Draw word list
            let line = Math.floor(i / wordsPerLine);
            let wordCount = Math.min(wordsPerLine, words.length - line * wordsPerLine);
            let wordWidth = GRAPH_W / wordCount;
            imgCtx.fillStyle = colors[i % colors.length];
            imgCtx.fillText(
                discord.bot.fixMessage(NodeEmoji.replace(words[i], e => `:${e.key}:`).replace(/<(:\w+:)\d+>/gi,'$1')),
                LEFT + wordWidth * (i % wordCount) + wordWidth / 2, line * wordLabelSize
            );
        }
        imgCtx.textBaseline = 'middle';
        imgCtx.textAlign = 'left';
        imgCtx.font = '28px Roboto';
        for(let n = 0; n <= yIncCount; n++) { // Draw Y axis
            let y = TOP + GRAPH_H - n / yIncCount * GRAPH_H;
            imgCtx.fillStyle = 'rgba(240, 240, 240, 0.1)';
            imgCtx.fillRect(LEFT, y - 1.5, GRAPH_W, 3);
            imgCtx.fillStyle = '#AAAAAA';
            if(n > 0) imgCtx.fillText(Math.round(n * yInc).toLocaleString(), LEFT + GRAPH_W + 16, y);
        }
        imgCtx.textBaseLine = 'top';
        let prevLabelRight = -10;
        let dayLines = totalDays < 20;
        let halfMonthLines = totalDays < 15 * 16;
        let monthLines = totalDays < 30.5 * 16;
        let quarterLines = totalDays < 30.5 * 4 * 16;
        for(let d = 0; d <= totalDays; d++) { // Draw X axis
            let date = firstDate.addDays(d), prevDate = firstDate.addDays(d - 1);
            let month = date.getMonth(), prevMonth = prevDate.getMonth();
            let halfMonth = month + (date.getDate() > 14 ? 0.5 : 0),
                prevHalfMonth = prevMonth + (prevDate.getDate() > 14 ? 0.5 : 0);
            let quarter = Math.floor(month / 3), prevQuarter = Math.floor(prevMonth / 3);
            let year = date.getFullYear(), prevYear = prevDate.getFullYear();
            if(d !== 0 && d !== totalDays && !dayLines
                && (!halfMonthLines || halfMonth === prevHalfMonth)
                && (!monthLines || month === prevMonth)
                && (!quarterLines || quarter === prevQuarter)
                && year === prevYear) continue;
            let x = LEFT + Math.round(d / totalDays * GRAPH_W);
            let alpha = 0.05;
            if(monthLines && month !== prevMonth) alpha *= 2;
            if(quarterLines && quarter !== prevQuarter) alpha *= 2;
            if(year !== prevYear) alpha *= 2;
            imgCtx.fillStyle = `rgba(240, 240, 240, ${alpha})`;
            imgCtx.fillRect(x - 1, TOP, 3, GRAPH_H);
            if(d === totalDays) continue;
            if(prevLabelRight + 10 > x) continue;
            let monthStr = DateFormat(date, totalDays < 50 ? 'mmm d' : 'mmm');
            let labelRight = x + imgCtx.measureText(monthStr).width;
            if(labelRight > IMAGE_W) continue;
            imgCtx.fillStyle = '#AAAAAA';
            prevLabelRight = labelRight;
            imgCtx.fillText(monthStr, x, TOP + GRAPH_H + 16);
            if(d === 0 || year !== prevYear) imgCtx.fillText(year.toString(), x, TOP + GRAPH_H + 16 + 30);
        }
        imgCtx.drawImage(graphCanvas, LEFT, TOP);
        discord.bot.uploadFile({
            to: data.channel, filename: 'word-graph.png', file: imgCanvas.toBuffer()
        });
    });
};

function getTopWords(data, unique) {
    var maxWords = 10;
    if(data.params.length && data.params[0] > 0) {
        maxWords = util.clamp(Math.round(+data.params.shift()), 1, 25);
        data.paramStr = data.params.join(' ');
    }
    if(unique && data.params.length === 0) return data.reply(`You must specify a username`);
    var userID = discord.getIDFromUsername(data.paramStr);
    var allUsers = data.params.length === 0;
    if(!allUsers && !userID) return data.reply(`I don't know anyone named "${data.paramStr}"`);
    var query = (unique || allUsers) ? null : { user: userID };
    messages.wrap(messages.db.find(query), function(allMessages) {
        if(!allMessages) return data.reply('No messages found' + (allUsers ? '' : ' for that user'));
        let dictionary = {};
        let exclude = {};
        for(let m = 0; m < allMessages.length; m++) {
            var text = allMessages[m].content.replace(util.urlRX, '');
            var words = text.match(/([a-z'-]{3,})/gi);
            if(!words || words.length === 0) continue;
            for(var w = 0; w < words.length; w++) {
                var thisWord = words[w].toLowerCase();
                if(!unique && junkWords.includes(thisWord)) continue;
                var obj = (!unique || allMessages[m].user === userID) ? dictionary : exclude;
                obj[thisWord] = (obj[thisWord] || 0) + 1;
            }
        }
        for(var key in exclude) delete dictionary[key];
        var topWords = Object.keys(dictionary).sort(function(a, b) { return dictionary[b] - dictionary[a]; });
        topWords.length = Math.min(topWords.length, maxWords);
        let finalMessage = `__Top ${maxWords}${unique ? ' unique' : ''} ` +
            `words${userID ? ' by ' + data.paramStr : ''}__\n` +
            topWords.map(w => `**${dictionary[w].toLocaleString()}** - ` + w).join('\n');
        if(unique && topWords.length === 0) finalMessage = `*${data.paramStr} hasn't used any unique words*`;
        data.reply(finalMessage);
    });
}

var junkWords = [
    'the','this','that','are','and','what','he','all','how','one','get',"it's","don't",
    'you','its','they','can','have','was','but','com','about',"i'm",'your','out',
    'now','only','with','for','like','just','not','really','from','when','where',
    'would','why','who','did','there','had','has','than','them','should','then',
    'got','too',"that's",'dont','also','could','much','his','though',"there's",
    'been','some','going','yeah','because','see','even','any','will','gonna',
    'thats','cant','these','want','still','more','pretty','more','well','make',
    'into','way',"didn't","i've",'probably','him','were','kind',"he's",'right',
    "can't","you're",'does','yes','thing','think','good','know','new','need','back',
    'off',"i'll",'here','other','looks','guess','time','said','time','use','mean',
    'say','look','http','https','youtu'
];

const COLORS = [
    '#DDDDDD',
    '#F44336',
    '#2196F3',
    '#FFEB3B',
    '#33c136',
    '#eb4af3',
    '#FF9800',
    '#E91E63',
    '#00ae9e',
    '#FFC107',
    '#00BCD4',
    '#a9dc3b',
    '#eaa5f3',
    '#00d5cc',
    '#f4845c',
    '#7bc8f3',
    '#ffc67b',
    '#56af2e',
    '#e9788c',
    '#ba8572',
    '#5bd893',
    '#46a5d4',
    '#8f92dc'
];

module.exports = {
    commands: _commands,
    help: {
        words: ['Get the most used (excluding common) words, either for everyone or a specific user',
            '15', '10 vegeta897'],
        unique: ['Get the most used words said by a user that nobody else has used',
            '10 vegeta897']
    }
};