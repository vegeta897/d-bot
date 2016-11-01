// A silly game based on images from WikiHow
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var storage = require(__base+'core/storage.js');
var config = require(__base+'core/config.js');
var FuzzySet = require('fuzzyset.js'); // Fuzzy string matching
var request = require('request');
var download = require('download');

const rounds = 3;
var wwStorage = storage.json('game');
var wwData = wwStorage.data;
var imgData;
var apiRequest = {
    url: 'http://www.wikihow.com/api.php?action=query&format=json',
    headers: { 'User-Agent': 'D-Bot - Private Discord Chat Bot - vegeta897@gmail.com' }
};
var stateDurations = { // Duration of each game state, in seconds
    starting: 10,
    playing: 50,
    postround: 5
};
if(!wwData.state || wwData.state == 'starting') resetData();
var tickInterval = setInterval(tick, 1000);

function resetData() {
    wwStorage.reset();
    wwData.state = 'idle';
    wwStorage.save();
}

function tick() {
    if(!stateDurations[wwData.state]) return;
    if(new Date().getTime() >= wwData.stateBegan + stateDurations[wwData.state]*1000) {
        switch(wwData.state) {
            case 'starting':
                wwData.state = 'playing';
                wwData.stateBegan = new Date().getTime();
                wwData.round = 1;
                wwStorage.save();
                discord.bot.uploadFile({
                    to: wwData.channel,
                    file: imgData, filename: 'wikihow.jpg',
                    message: '**Guess the title of the WikiHow article containing this image**\n'
                        + 'Type `/guess` or `/g` to guess\n'
                        + '*You only get one guess,* but you can change it during the round\n'
                },function(){
                    wwData.stateBegan = new Date().getTime();
                    wwStorage.save();
                });
                break;
            case 'playing':
                if(wwData.round < 3) download(wwData.images[wwData.round]).then(downloaded => {
                    imgData = downloaded;
                    wwData.downloaded = wwData.round;
                    wwStorage.save();
                });
                wwData.state = 'postround';
                wwData.stateBegan = new Date().getTime();
                discord.sendMessage(wwData.channel, `Round ${wwData.round} has ended!`);
                wwStorage.save();
                break;
            case 'postround':
                if(wwData.downloaded == wwData.round || wwData.round == 3) endRound();
                break;
        }
    }
}

function submitGuess(newGuess, user) {
    newGuess = newGuess.substr(0,7).toLowerCase() == 'how to ' ? newGuess.substr(7) : newGuess;
    var guessScore = FuzzySet([wwData.answer.toLowerCase()]).get(newGuess.toLowerCase());
    guessScore = guessScore ? guessScore[0][0] : 0;
    var now = new Date().getTime();
    wwData.players[user] = { guess: newGuess, guessScore: guessScore, guessTime: now };
    var everyoneGuessed = true;
    for(var userID in wwData.players) {
        if(!wwData.players.hasOwnProperty(userID)) continue;
        if(!wwData.players[userID].guess) {
            everyoneGuessed = false;
            break;
        }
    }
    if(everyoneGuessed && wwData.round > 1) { // End the round if everyone has guessed and not 1st round
        wwData.stateBegan = 0;
    }
    wwStorage.save();
}

function endRound() {
    var bestGuess = { score: -1 };
    for(var user in wwData.players) {
        if(!wwData.players.hasOwnProperty(user)) continue;
        var player = wwData.players[user];
        if(!player.guess) continue;
        if(player.guessScore > bestGuess.score
            || (player.guessScore == bestGuess.score && player.guessTime < bestGuess.time)) {
            bestGuess.guess = player.guess;
            bestGuess.user = user;
            bestGuess.score = player.guessScore;
            bestGuess.time = player.guessTime;
        }
        delete player.guess;
        delete player.guessScore;
        delete player.guessTime;
    }
    wwData.bestGuesses.push(bestGuess);
    if(bestGuess.score > 0.7) {
        endGame(bestGuess);
    } else if(wwData.round == rounds) {
        endGame();
    } else {
        wwData.round++;
        wwData.state = 'playing';
        wwData.stateBegan = new Date().getTime();
        wwStorage.save();
        discord.bot.uploadFile({
            to: wwData.channel,
            file: imgData, filename: 'wikihow.jpg',
            message: `**Round ${wwData.round} begins!** Submit your guesses!`
        },function(err,res){
            wwData.stateBegan = new Date().getTime();
            wwStorage.save();
        });
    }
}

function endGame(winningGuess) {
    if(winningGuess) {
        var winner = discord.getUsernameFromID(winningGuess.user);
        discord.sendMessage(wwData.channel, 'We have a winner!\n'
            + `**${winner}** has correctly guessed the title of the article:\n`
            + `**${wwData.answer}**`);
    } else {
        var roundSummary = '';
        wwData.bestGuesses.forEach(function(elem, index, arr) {
            if(elem.score < 0) return;
            roundSummary += `Round ${index+1}:   **${util.toProperCase(elem.guess)}`
                + `** _by ${discord.getUsernameFromID(elem.user)}_`;
            if(index < arr.length-1) roundSummary += '\n';
        });
        discord.sendMessage(wwData.channel, 'The game is over, nobody guessed the title!\n'
            + `These were the best guesses for each round:\n${roundSummary}\n`
            + `The article was actually called: __${wwData.answer}__\n`
            + `http://www.wikihow.com/${wwData.answer.split(' ').join('-')}`, true);
    }
    resetData();
}

function getArticle(callback) {
    var pages = {};
    apiRequest.qs = { // Get list of images from random pages
        generator: 'random',
        grnnamespace: 0,
        grnlimit: 5,
        prop: 'revisions|images',
        rvprop: 'content',
        imlimit: 150
    };
    request(apiRequest, getImageList);
    
    function getImageList(err, response, body) {
        if(err) return apiError(err);
        body = JSON.parse(body);
        var imageList = [];
        for(var pageID in body.query.pages) {
            if(!body.query.pages.hasOwnProperty(pageID)) continue;
            if(!body.query.pages[pageID].images) continue;
            var page = {
                content: body.query.pages[pageID].revisions[0]['*'],
                title: body.query.pages[pageID].title,
                images: []
            };
            body.query.pages[pageID].images.forEach(function(elem) {
                page.images.push(elem.title);
            });
            pages[pageID] = page;
            imageList = imageList.concat(page.images);
        }
        apiRequest.qs = { titles: imageList.join('|'), prop: 'imageinfo', iiprop: 'url|size' };
        request(apiRequest, getImageData);
    }
    
    function getImageData(err, response, body) {
        if(err) return apiError(err);
        body = JSON.parse(body);
        for(var imageID in body.query.pages) {
            if(!body.query.pages.hasOwnProperty(imageID)) continue;
            var image = body.query.pages[imageID];
            // Remove images less than 300x200
            var validImage = image.imageinfo
                && image.imageinfo[0].url && image.imageinfo[0].url.substr(0,4) == 'http'
                && image.imageinfo[0].width >= 300 && image.imageinfo[0].height >= 200;
            for(var pageID in pages) {
                if(!pages.hasOwnProperty(pageID)) continue;
                var imageIndex = pages[pageID].images.indexOf(image.title);
                if(imageIndex >= 0 ) {
                    if(validImage) {
                        pages[pageID].images[imageIndex] = image.imageinfo[0].url;
                    } else {
                        pages[pageID].images.splice(imageIndex,1);
                        if(pages[pageID].images.length < 3) delete pages[pageID];
                    }
                }
            }
        }
        // Select an article to play
        var playArticle = pages[util.pickInObject(pages)];
        var random = playArticle.images.map(Math.random);
        // Sort images randomly
        playArticle.images.sort(function(a, b) {
            return random[playArticle.images.indexOf(a)] - random[playArticle.images.indexOf(b)];
        });
        callback({ title: playArticle.title, article: playArticle.content, images: playArticle.images });
    }

    function apiError(err) {
        console.log(err);
        discord.sendMessage(wwData.channel, 'Error connecting to API!');
        resetData();
    }
}

var _commands = {};

_commands.wikiwhat = function(data) {
    if(data.params[0] == 'reset' && userID == config.owner) {
        resetData();
    } else if(wwData.state == 'idle') {
        wwData.state = 'starting';
        wwData.stateBegan = new Date().getTime();
        wwData.channel = data.channel;
        wwData.players = {};
        wwData.players[data.userID] = {};
        wwData.bestGuesses = [];
        discord.sendMessage(wwData.channel, `**${discord.getUsernameFromID(data.userID)}**`
            + ' wants to play **WikiWhat**! The game will begin shortly.');
        getArticle(function(article) {
            wwData.answer = article.title;
            wwData.images = article.images;
            wwStorage.save();
            download(wwData.images[0]).then(downloaded => {
                imgData = downloaded;
                wwData.downloaded = wwData.round;
                wwStorage.save();
            });
        });
    }
};

module.exports = {
    commands: _commands,
    listen: function(data) {
        if(data.command != 'g' && data.command != 'guess') return;
        if(!wwData || wwData.state != 'playing' || data.params.length == 0 || data.channel != wwData.channel) return;
        submitGuess(data.paramStr, data.userID);
    },
    unload: function() { clearInterval(tickInterval); },
    help: {
        wikiwhat: ['Start a game of *WikiWhat*, where you guess the title of a WikiHow article based on its images']
    }
};