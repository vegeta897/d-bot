'use strict';
var util = require('./../util.js');
var jsonfile = require('jsonfile');
var FuzzySet = require('fuzzyset.js'); // Fuzzy string matching
jsonfile.spaces = 4;

var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'd6F3Efeq';

function encrypt(text){
    var cipher = crypto.createCipher(algorithm,password);
    var crypted = cipher.update(text,'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text){
    var decipher = crypto.createDecipher(algorithm,password);
    var dec = decipher.update(text,'hex','utf8');
    dec += decipher.final('utf8');
    return dec;
}

var sendMsg, bot, messages, getIDFromUsername, members;
var data, statusChannel = '86915384589967360', messageChannel = '104105342614376448';
var scribeTimer, 
    optOut = ['86921983375204352','87403321215705088','103730024510685184','114588180144979972',
        '87684126378844160','157411056346595328','112459599642177536','93514934649901056',
        '91362370168823808','137362316088836096','87317932991844352','137327607464198144',
        '86924106120830976'];

var save = function() {
    if(data.word) data.word = encrypt(data.word);
    jsonfile.writeFile('./secretword/data.json',data,function(err){if(err)console.error(err)});
    if(data.word) data.word = decrypt(data.word);
};

var newScribe = function(userID) {
    data.users[data.scribe].lastScribed = new Date().getTime();
    data.scribe = userID;
    data.users[userID].lastScribed = new Date().getTime();
    scribeTimer = setTimeout(function() {
        if(data.word) return;
        sendMsg(userID,['Okay, either you aren\'t there or you don\'t want to play.']);
        pickNewScribe(userID);
    },20*60*1000); // 20 minutes to decide
    sendMsg(userID,['You are the new secret word scribe!\n' +
    //'Reply to this message to set the secret word. Longer words are worth more points.\n' +
    //'Every time someone in chat says your secret word, you will secretly accumulate points.\n' +
    //'You can covertly influence people into saying it, or use it yourself (for half the value), ' +
    //'but if someone guesses the word, they will steal all its points! So try not to be obvious.\n' +
    //'The round will end in 4 hours, but that time will increase by 1 hour every time the secret word is said.\n' +
    //'Send a message here at any time to find out how much time is left.\n' +
    //'You can cash out at any time by guessing the secret word yourself.\n' +
    //'If you cash out, you will not gain any points from your own usages of the word.\n' +
    //'If you don\'t pick a word in 20 minutes, you will be skipped.\n\n' +
    'Type in a word:']);
    save();
};

var numberArray = function(length) {
    var arr = [];
    for(var i = 0; i < length; i++) {
        arr.push(i);
    }
    return arr;
};

var blankWord = function(length) {
    var blank = [];
    for(var i = 0; i < length; i++) {
        blank.push('_');
    }
    return blank;
};

var getUserData = function(userID) {
    data.users[userID] = data.users[userID] ? 
        data.users[userID] : { occurrences: 0, points: 0, guesses: 0, lastScribed: 0 };
    return data.users[userID];
};

var pickNewScribe = function(exception) {
    if(data.word) return;
    var memberList = Object.keys(members);
    for(var i = 0; i < memberList.length; i++) {
        var member = members[memberList[i]];
        if(optOut.indexOf(member.user.id) >= 0 // Don't include those opting out
        || member.status != 'online' || member.user.id == exception // Must be online and not the exception
        || new Date().getTime() - data.users[member.user.id].lastScribed < 1000*60*60*4) {
            memberList.splice(i,1);
            i--;
        }
    }
    if(memberList.length < 1) { // If there are no valid choices
        setTimeout(function(){pickNewScribe(exception);},15 * 60 * 1000); // Wait 15 minutes
    } else {
        var pickedMember = members[util.pickInArray(memberList)];
        newScribe(pickedMember.user.id);
    }
};

var getElapsed = function() {
    return Math.floor((new Date().getTime() - data.began)/1000/60); // Time elapsed in minutes
};

var updateHintText = function() {
    var blankHint = blankWord(data.word.length);
    for(var c = 0; c < data.word.length; c++) {
        if(data.hints.indexOf(c) >= 0) {
            blankHint[c] = data.word[c];
        }
    }
    data.hintText = blankHint.join(' ').toUpperCase();
};

var getTotalOccurrences = function() {
    var totalOccurrences = 0;
    for(var uKey in data.users) { if(!data.users.hasOwnProperty(uKey)) continue;
        totalOccurrences += data.users[uKey].occurrences;
    }
    return totalOccurrences;
};

var getSneakyScribe = function(num) {
    var sneaky = '';
    for(var i = data.scribeUsage.length-1; i >= 0; i--) {
        if(i < data.scribeUsage.length-1) sneaky += '\n';
        sneaky += '"' + data.scribeUsage[i] + '"';
        if(data.scribeUsage.length - i == num) break;
    }
    return sneaky;
};

var updateStatus = function() {
    var topicText;
    if(!data.word) {
        topicText = 'Waiting for next round to start';
    } else {
        var elapsed = getElapsed(); // Time elapsed in minutes
        var nextHint = parseInt(data.hintInterval - elapsed % data.hintInterval);
        var clueText = data.clue ? '"' + data.clue + '" ' : '';
        topicText = 'Secret hint: ' + data.hintText.split('_').join('‗') + ' ' + clueText + '('
            + data.wordValue + 'pts) Round Time: ' +
            elapsed + 'min • Next Hint: ' + nextHint + 'min • Guess Pool: ' + data.guessPool + 'pts';
    }
    bot.editChannelInfo({ channel: statusChannel, topic: topicText });
    bot.editChannelInfo({ channel: messageChannel, topic: topicText });
};

module.exports = {
    init: function (sm, b, msgs, gid) {
        sendMsg = sm;
        bot = b;
        messages = msgs;
        getIDFromUsername = gid;
        members = bot.users;
        jsonfile.readFile('./secretword/data.json',function(err,obj) {
            if(err) { console.log(err); return; }
            data = obj;
            //var memberList = Object.keys(members);
            //for(var i = 0; i < memberList.length; i++) {
            //    var member = members[memberList[i]];
            //    if(!data.users[member.user.username]) {
            //        data.users[member.user.username] = {
            //            occurrences: 0, points: 0, guesses: 0, lastScribed: 0
            //        }
            //    }
            //}
            //save();
            if(data.word) data.word = decrypt(data.word);
            updateStatus();
            pickNewScribe(data.scribe);
            

// Tick every 30 seconds
setInterval(function() {
    if(!data.word) return;
    var elapsed = getElapsed(); // Time elapsed in minutes
    var totalOccurrences = getTotalOccurrences();
    if(elapsed >= 8*60 || elapsed > data.timeToLive * 60) { // Time's up
        var userData = getUserData(data.scribe);
        var occurPoints = Math.floor((totalOccurrences - userData.occurrences) * data.wordValue +
            userData.occurrences * data.wordValue / 2);
        var sneakyScribe = getSneakyScribe(3);
        var sneakyText = sneakyScribe == '' ? '.\n' :
        ', ' + userData.occurrences + ' of which were by ' + members[data.scribe].user.username + '!\n' +
        'The scribe was so sneaky:\n' + sneakyScribe + '\n';
        userData.points += occurPoints + data.guessPool;
        sendMsg(messageChannel,['It\'s time for a new secret word! ' +
        'For the last ' + elapsed + ' minutes, the secret word was `' + data.word +
        '` and its scribe was ' + members[data.scribe].user.username + '.\n' +
        'It was said **' + totalOccurrences + '** times' + sneakyText +
        'The wrong guess pool was worth ' + data.guessPool + ' points!\n' +
        'The scribe accumulated **' + (occurPoints + data.guessPool) + '** points all together, ' +
        'and they now have a total of ' + userData.points + '\n' +
        'If you think the scribe gave a good clue, type `/tip ' + members[data.scribe].user.username +
        ' 5` to tip them!']);
        if(members[data.scribe].status != 'online') {
            sendMsg(data.scribe,['Hey, time ran out on your secret word.\n' +
            'It was said **' + totalOccurrences + '** times, gaining you **' + occurPoints + '** points, ' +
            'The wrong guess pool was worth ' + data.guessPool + ' points!\n' +
            'Your total is now ' + userData.points])
        }
        delete data.word;
        updateStatus();
        pickNewScribe(data.scribe);
        save();
    } else if(elapsed > (data.hints.length + 1) * data.hintInterval) { // Drop a hint
        var nextHint;
        do { nextHint = util.randomIntRange(0,data.word.length-1);
        } while(data.hints.indexOf(nextHint) >= 0);
        data.hints.push(nextHint);
        updateHintText();
        var remaining = data.timeToLive*60 - elapsed;
        sendMsg(messageChannel,['Secret word hint: `' + data.hintText + '`\n' +
        'Guess counts have been reset, everyone gets a free guess!\n' +
        'So far, the secret word has been used **' + totalOccurrences + '** times.\n' +
        'The next hint will drop in ' + data.hintInterval + ' minutes.\n' +
        'The round will end if nobody says the secret word in the next ' + remaining + ' minutes!']);
        // Reset guess counts
        for(var uKey in data.users) { if(!data.users.hasOwnProperty(uKey)) continue;
            data.users[uKey].guesses = 0;
        }
        updateStatus();
        save();
    }
    if(elapsed % 5 == 0) updateStatus(); // Update status every 5 minutes
    
},30000);
        });
    },
    listen: function(userID,msg) {
        if(!data.word) return; // Word not set
        if(msg[0] == '!' || msg[0] == '/') return; // Ignore commands
        if(msg.toLowerCase().indexOf(data.word) < 0) return; // Word not in message at all
        var splitMsg = msg.split(' ');
        // Strip URLs from message before tallying
        for(var i = 0; i < splitMsg.length; i++) {
            if(util.getDomain(splitMsg[i])) {
                splitMsg.splice(i,1);
                i--;
            }
        }
        msg = splitMsg.join(' ');
        var secretRegexp = util.regExpify(data.word);
        var matches = msg.match(secretRegexp);
        if(!matches || matches.length == 0) return;
        var occurrences = matches.length;
        data.timeToLive++;
        var pointsEarned = data.wordValue * occurrences;
        if(userID == data.scribe) { // If scribe said it
            data.scribeUsage.push(msg);
        }
        var userData = getUserData(userID);
        userData.occurrences += occurrences;
        save();
    },
    parse: function(user,userID,params) {
        var userData = getUserData(userID);
        switch(params[0]) {
            case 'start':
                pickNewScribe();
                break;
            default: // Status message
                var guessCost = userData.guesses * 5;
                sendMsg(messageChannel,[user + ', your next guess will cost ' + guessCost + ' points. ' +
                'You have ' + userData.points]);
                break;
        }
    },
    guess: function(user,userID,params,rawEvent) {
        if(!data.word) return;
        bot.deleteMessage({ channel: rawEvent.d.channel_id, messageID: rawEvent.d.id });
        var guessed = params.join(' ').trim().toLowerCase();
        sendMsg(messageChannel,[user + ' guessed `'+guessed+'`']);
        if(guessed.length != data.word.length) {
            sendMsg(messageChannel,['`'+guessed+'` doesn\'t match the length of the secret word, it\'s ' +
            data.word.length + ' characters long.']);
            return;
        }
        var userData = getUserData(userID);
        var guessCost = userData.guesses * 5;
        if(userData.points < guessCost && guessed != data.word) {
            var short = guessCost - userData.points;
            sendMsg(messageChannel,[user + ', you already used your free guess, and you cannot afford another ' +
            '(' + guessCost + ' points)']);
            return;
        }
        if(data.guesses.indexOf(guessed) >= 0) {
            sendMsg(messageChannel,['`'+guessed+'` has already been guessed!']);
            return;
        }
        data.guesses.push(guessed);
        userData.points -= guessCost;
        data.guessPool += guessCost;
        userData.guesses++;
        if(guessed == data.word) {
            var scribeUserData = getUserData(data.scribe);
            var totalOccurrences = getTotalOccurrences();
            var occurPoints = Math.floor((totalOccurrences - scribeUserData.occurrences) * data.wordValue +
                scribeUserData.occurrences * data.wordValue / 2);
            userData.points += occurPoints + data.guessPool;
            var sneakyScribe = getSneakyScribe(3);
            var sneakyText = sneakyScribe == '' ? '.\n' :
            ', ' + scribeUserData.occurrences + ' of which were by ' + members[data.scribe].user.username + '!\n' +
            'The scribe was so sneaky:\n' + sneakyScribe + '\n';
            if (userID == data.scribe) {
                occurPoints -= Math.floor(scribeUserData.occurrences * data.wordValue / 2);
                sendMsg(messageChannel, [user+' has cashed out! The secret word was `' + data.word + '`\n' +
                'It was said **' + totalOccurrences + '** times' + sneakyText +
                'Since the scribe cashed out, no points are awarded for self-usage.\n' +
                '**' + occurPoints + '** points were accumulated!\n' +
                'The wrong guess pool was worth ' + data.guessPool + ' points!\n' +
                'The scribe accumulated **' + (occurPoints + data.guessPool) + '** points all together, ' +
                'and they now have a total of ' + userData.points + '\n' +
                'If you think the scribe gave a good clue, type `/tip ' + members[data.scribe].user.username + 
                ' 5` to tip them!']);
            } else {
                userData.points += data.wordValue;
                userData.points += guessCost;
                data.guessPool -= guessCost;
                sendMsg(messageChannel, ['Congrats, ' + user + ', you guessed the secret word! ' +
                'It was `'+data.word+'`\n' +
                'It was said **' + totalOccurrences + '** times' + sneakyText +
                'You stole **' + occurPoints + '** points from ' + members[data.scribe].user.username + '!\n' +
                'You gained **' + data.wordValue + '** points for guessing correctly!\n' +
                'You also collected the wrong guesses pool, worth **' + data.guessPool + '** points!\n' +
                'Your total points: ' + userData.points + '\n' +
                'If you think the scribe gave a good clue, type `/tip ' + members[data.scribe].user.username + 
                ' 5` to tip them!']);
                if (members[data.scribe].status != 'online') {
                    sendMsg(data.scribe, ['Hey, ' + user + ' guessed your word! ' +
                    'He stole ' + occurPoints + ' points.']);
                }
            }
            delete data.word;
            updateStatus();
            pickNewScribe(data.scribe);
        } else {
            var fuzzyGuess = FuzzySet([data.word]).get(guessed);
            fuzzyGuess = fuzzyGuess ? fuzzyGuess[0][0] : 0;
            if(fuzzyGuess > 0.3) {
                sendMsg(messageChannel,['`' + guessed + '` is close!']);
            }
            var guessMsg = userData.guesses == 1 ? 'There goes your free guess for this hint interval.\n' 
                : 'That guess cost you ' + guessCost + ' points.\n';
            guessCost = userData.guesses * 5;
            sendMsg(messageChannel,['Sorry '+user+', `'+guessed+'` is wrong! ' + guessMsg +
            'Your next guess will cost ' + guessCost + ' points. ' +
            'You have ' + userData.points + ' points.\n' +
            'The wrong guesses pool is currently worth **' + data.guessPool + '** points.']);
            updateStatus();
        }
        save();
    },
    pm: function(user,userID,channel,msg) {
        if(userID == data.scribe) {
            if(data.word && data.clue) {
                var elapsed = getElapsed(); // Time elapsed in minutes
                var remaining = data.timeToLive*60 - elapsed;
                var totalOccurrences = getTotalOccurrences();
                sendMsg(channel,['The secret word is `' + data.word + '`\n' +
                'It\'s worth **' + data.wordValue + '** points.\n' +
                'It\'s been said **' + totalOccurrences + '** times so far.\n' +
                'The round will end if nobody says it in the next ' + remaining + ' minutes!\n' +
                'You can cash out at any time by typing `/guess ' + data.word + '`\n' +
                'If you cash out, you will not gain any points from your own usages of the word.']);
            } else if(data.word && !data.clue && msg != "") {
                data.clue = msg;
                sendMsg(channel,['Clue has been set!']);
                sendMsg(messageChannel,['The scribe has provided a clue:\n' + data.clue]);
                updateStatus();
                save();
            } else if(!data.word && msg != "") {
                if(msg.split(' ').length > 1) {
                    sendMsg(channel,['Sorry, the secret word can\'t have any spaces.']);
                    return;
                }
                if(msg[0] == '!' || msg[0] == '/') {
                    sendMsg(channel,['Sorry, the secret word can\'t begin with `/` or `!`']);
                    return;
                }
                if(msg.length < 5) {
                    sendMsg(channel,['The secret word must be at least 5 characters long.']);
                    return;
                }
                if(msg.length > 14) {
                    sendMsg(channel,['Don\'t be silly.']);
                    return;
                }
                resetGame();
                data.word = msg;
                var wordValue = 15;
                for(var i = 6; i <= data.word.length; i++) {
                    wordValue += i; // 5 letter word is worth 15 points, 6 letter word is worth 21 points, etc
                }
                data.wordValue = wordValue;
                data.began = new Date().getTime();
                data.hintInterval = Math.floor(1.5 * 8*60 / data.word.length);
                updateHintText();
                sendMsg(channel,['Secret word set to `' + data.word + '`\n' +
                'It\'s worth ' + wordValue + ' points.\n\n' +
                'Now, you can type in a clue to give everyone:']);
                sendMsg(messageChannel,['The secret word has been set! ' +
                'It\'s ' + data.word.length + ' characters long, and worth ' + wordValue + ' points.\n' +
                'If you think you know what it is, type `/guess _____` to steal it!\n' +
                'The first hint will be revealed in ' + data.hintInterval + ' minutes.']);
                updateStatus();
                save();
            }
        }
    },
    tip: function(user,userID,params) {
        if(params.length < 2) return;
        var tipAmount = parseInt(params[1]);
        if(tipAmount < 1) {
            sendMsg(messageChannel,[user+', '+params[1]+' is not a valid tip amount!']);
            return;
        }
        var userData = getUserData(userID);
        if(userData.points < tipAmount) {
            sendMsg(messageChannel,[user+', you can\'t afford to tip that much! You only have '+userData.points]);
            return;
        }
        var targetUserID = getIDFromUsername(params[0]);
        if(!targetUserID) {
            sendMsg(messageChannel,[user+', '+params[0]+' is not a valid username!']);
            return;
        }
        var targetUserData = getUserData(targetUserID);
        targetUserData.points += tipAmount;
        userData.points -= tipAmount;
        sendMsg(messageChannel,[user+' has tipped ' + tipAmount + ' points to ' 
            + members[targetUserID].user.username + '!']);
        save();
    }
};

var resetGame = function() {
    clearTimeout(scribeTimer);
    data.scribeUsage = [];
    data.hints = [];
    data.timeToLive = 4;
    data.clue = false;
    data.guessPool = 0;
    data.guesses = [];
    for(var uKey in data.users) { if(!data.users.hasOwnProperty(uKey)) continue;
        data.users[uKey].occurrences = 0;
        data.users[uKey].guesses = 0;
    }
};