// A silly game based on images from WikiHow
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var storage = require(__base+'core/storage.js');
var config = require(__base+'core/config.js');
var FuzzySet = require('fuzzyset.js'); // Fuzzy string matching
var request = require('request');
var download = require('download');

const rounds = 3;
var wwData = storage.json('game', {}, '\t');
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
if(!wwData.get('state') || wwData.get('state') === 'starting') resetData();

function resetData() {
    wwData.reset();
    wwData.set('state', 'idle');
}

function submitGuess(newGuess, user) {
    newGuess = newGuess.substr(0,7).toLowerCase() === 'how to ' ? newGuess.substr(7) : newGuess;
    var guessScore = FuzzySet([wwData.get('answer').toLowerCase()]).get(newGuess.toLowerCase());
    guessScore = guessScore ? guessScore[0][0] : 0;
    var now = new Date().getTime();
    let players = wwData.get('players');
    players[user] = { guess: newGuess, guessScore: guessScore, guessTime: now };
    var everyoneGuessed = true;
    for(var userID in players) {
        if(!players.hasOwnProperty(userID)) continue;
        if(!players[userID].guess) {
            everyoneGuessed = false;
            break;
        }
    }
    if(everyoneGuessed && wwData.get('round') > 1) { // End the round if everyone has guessed and not 1st round
        wwData.set('stateBegan', 0);
    }
    wwData.save();
}

function endRound() {
    var bestGuess = { score: -1 };
    let players = wwData.get('players');
    for(var user in players) {
        if(!players.hasOwnProperty(user)) continue;
        var player = players[user];
        if(!player.guess) continue;
        if(player.guessScore > bestGuess.score
            || (player.guessScore === bestGuess.score && player.guessTime < bestGuess.time)) {
            bestGuess.guess = player.guess;
            bestGuess.user = user;
            bestGuess.score = player.guessScore;
            bestGuess.time = player.guessTime;
        }
        delete player.guess;
        delete player.guessScore;
        delete player.guessTime;
    }
    wwData.save();
    wwData.get('bestGuesses').push(bestGuess);
    if(bestGuess.score > 0.7) {
        endGame(bestGuess);
    } else if(wwData.get('round') === rounds) {
        endGame();
    } else {
        discord.bot.simulateTyping(wwData.get('channel'));
        wwData.set('round', wwData.get('round') + 1);
        wwData.set('state', 'playing');
        wwData.set('stateBegan', new Date().getTime());
        discord.bot.uploadFile({
            to: wwData.get('channel'),
            file: imgData, filename: 'wikihow.jpg',
            message: `**Round ${wwData.get('round')} begins!** Submit your guesses!`
        },function(err, res){
            wwData.set('stateBegan', new Date().getTime());
        });
    }
}

function endGame(winningGuess) {
    if(winningGuess) {
        var winner = discord.getUsernameFromID(winningGuess.user);
        discord.sendMessage(wwData.get('channel'), 'We have a winner!\n'
            + `**${winner}** has correctly guessed the title of the article: \n`
            + `**${wwData.get('answer')}**`);
    } else {
        var roundSummary = '';
        wwData.get('bestGuesses').forEach(function(elem, index, arr) {
            if(elem.score < 0) return;
            roundSummary += `Round ${index+1}: **${util.toProperCase(elem.guess)}`
                + `** _by ${discord.getUsernameFromID(elem.user)}_`;
            if(index < arr.length-1) roundSummary += '\n';
        });
        discord.sendMessage(wwData.get('channel'), 'The game is over, nobody guessed the title!\n'
            + `These were the best guesses for each round:\n${roundSummary}\n`
            + `The article was actually called: __${wwData.get('answer')}__ \n`
            + `http://www.wikihow.com/${wwData.get('answer').split(' ').join('-')}`, true);
    }
    resetData();
}

function getArticle(callback) {
    var pages = {};
    apiRequest.qs = { // Get list of images from random pages
        generator: 'random',
        grnnamespace: 0,
        grnlimit: 2,
        prop: 'revisions|images',
        rvprop: 'content',
        imlimit: 150
    };
    // https://www.wikihow.com/api.php?action=query&format=json&generator=random&grnnamespace=0&grnlimit=3&prop=revisions|images&rvprop=content&imlimit=150
    request(apiRequest, getImageList);

    // TODO: Change grnlimit to 1, and just retry if not enough valid images are found

    function getImageList(err, response, body) {
        if(err) return apiError(err);
        try {
            body = JSON.parse(body);
        } catch(e) {
            return apiError(e);
        }
        if(!body) return resetData();
        // console.log('response:',response);
        // console.log('body:',body);
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
        try {
            body = JSON.parse(body);
        } catch(e) {
            return apiError(e);
        }
        for(var imageID in body.query.pages) {
            if(!body.query.pages.hasOwnProperty(imageID)) continue;
            var image = body.query.pages[imageID];
            // Remove images less than 300x200
            var validImage = image.imageinfo
                && image.imageinfo[0].url && image.imageinfo[0].url.substr(0,4) === 'http'
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
        discord.sendMessage(wwData.get('channel'), 'Error connecting to API!');
        resetData();
    }
}

var _commands = {};

_commands.wikiwhat = function(data) {
    if(data.params[0] === 'reset' && data.userID === config.owner) {
        resetData();
    } else if(wwData.get('state') === 'idle') {
        wwData.set('state', 'starting');
        wwData.set('stateBegan', new Date().getTime());
        wwData.set('channel', data.channel);
        wwData.set('players', { [data.userID]: {} });
        wwData.set('bestGuesses', []);
        // discord.sendMessage(wwData.channel, `*WikiWhat is currently undergoing maintenance, please try again later.*`);
        discord.sendMessage(wwData.get('channel'), `**${discord.getUsernameFromID(data.userID)}**`
            + ' wants to play **WikiWhat**! The game will begin shortly.');
        getArticle(function(article) {
            wwData.set('answer', article.title);
            wwData.set('images', article.images);
            download(wwData.get('images')[0]).then(downloaded => {
                imgData = downloaded;
                wwData.set('downloaded', wwData.get('round'));
            });
        });
    }
};

module.exports = {
    commands: _commands,
    listen(data) {
        if(data.command !== 'g' && data.command !== 'guess') return;
        if(wwData.get('state') !== 'playing' || data.params.length === 0 || data.channel !== wwData.get('channel')) return;
        submitGuess(data.paramStr, data.userID);
    },
    tick() {
        if(!stateDurations[wwData.get('state')]) return;
        if(new Date().getTime() >= wwData.get('stateBegan') + stateDurations[wwData.get('state')]*1000) {
            switch(wwData.get('state')) {
                case 'starting':
                    discord.bot.simulateTyping(wwData.get('channel'));
                    wwData.set('state', 'playing');
                    wwData.set('stateBegan', new Date().getTime());
                    wwData.set('round', 1);
                    discord.bot.uploadFile({
                        to: wwData.get('channel'),
                        file: imgData, filename: 'wikihow.jpg',
                        message: '**Guess the title of the WikiHow article containing this image**\n'
                        + 'Type `/guess` or `/g` to guess\n'
                        + '*You only get one guess,* but you can change it during the round\n'
                    },function(){
                        wwData.set('stateBegan', new Date().getTime());
                    });
                    break;
                case 'playing':
                    if(wwData.get('round') < 3) download(wwData.get('images')[wwData.get('round')]).then(downloaded => {
                        imgData = downloaded;
                        wwData.set('downloaded', wwData.get('round'));
                    });
                    wwData.set('state', 'postround');
                    wwData.set('stateBegan', new Date().getTime());
                    discord.sendMessage(wwData.get('channel'), `Round ${wwData.get('round')} has ended!`);
                    break;
                case 'postround':
                    if(wwData.get('downloaded') === wwData.get('round') || wwData.get('round') === 3) endRound();
                    break;
            }
        }
    },
    help: {
        wikiwhat: ['Start a game of *WikiWhat*, where you guess the title of a WikiHow article based on its images']
    }
};
