// Generates a profile about a user based on message history
var util = require(__base+'core/util.js');
var messages = require(__base+'core/messages.js');
var discord = require(__base+'core/discord.js');

var substitutes = {
    'iAm': /i am|im|i'm|iam|i\/m|i;m/,
    'really': /re+a+l+y|erally|fu+ck+ing|fu+ck+in|fre+a+king|fre+a+kin|fuk+in|su+per|definitely|absolutely|positively|def+|ve+r+y much/
};

function substitute(re) {
    var src = re.source;
    for(var sKey in substitutes) { if(!substitutes.hasOwnProperty(sKey)) continue;
        src = src.split('_'+sKey).join(substitutes[sKey].source);
    }
    return new RegExp(src, 'gi');
}

var infoPieces = {
    age: {
        re: substitute(/\b(?:_iAm) (?:turning )?([1-9]0|[1-9]+\b)/),
        getResult: function(values) {
            var best = getBest(values);
            if(best.ties) {
                var bestAvg = Math.round(util.arrayAverage(best.ties));
                if(util.arrayHighest(best.ties) - util.arrayLowest(best.ties) > 3) {
                    return util.pickInArray(['Could be ','May be ','Might be ']) + bestAvg + ` years old, but we don't know`;
                } else {
                    return util.pickInArray(['Could be ','May be ','Might be ']) + bestAvg + ' years old';
                }
            } else if(best.count > 1) {
                return util.pickInArray(['Most likely ','Likely ']) + best.value + ' years old';
            } else {
                return util.pickInArray(['Could be ','May be ','Might be ']) + best.value + ` years old, but we don't know`;
            }
        },
        exclude: []
    },
    is: {
        re: substitute(/\b(?:_iAm) ([\w, '_"*~]+)/),
        getResult: function(values) {
            var message = '';
            var best = getBest(values);
            if(!best.ties) {
                message = util.pickInArray(['Most often ',`More often than not he's `,'Almost always ']) + best.value + '\n• ';
            }
            var random = getWeightedRandom(values);
            if(values[random] > 5) {
                message += util.pickInArray(['Usually ','Typically ','Frequently ']) + random;
            } else if(values[random] > 1) {
                message += util.pickInArray(['Occasionally ','Every now and then ','Once in a while he\'s ']) + random;
            } else {
                message += util.pickInArray([`Once said he's `,'Admitted he was ','At one time, he was ']) + random;
            }
            return message.split(/\bi\b/gi).join('he').split(/\bmy\b/gi).join('his');
        },
        exclude: ['ready','here','there','afk','not','not sure','done','down','back','badhat']
    },
    likes: {
        re: /\b(?:i) (?:(?:_really) )*(?:like|love|adore|cherish|admire) ([\w, '_"*~]+)/gi,
        getResult: function(values) {
            var message = '';
            var best = getBest(values);
            if(!best.ties) {
                message = 'Favorite thing: ' + util.capitalize(best.value) + '\n• ';
            }
            var random = getWeightedRandom(values);
            if(values[random] > 5) {
                message += util.pickInArray(['Really likes ', 'Admires ','Loves ','Absolutely adores ']) + random;
            } else if(values[random] > 1) {
                message += util.pickInArray(['Somewhat likes ', 'Kind of likes ']) + random;
            } else {
                message += util.pickInArray(['Once said he liked ','Admitted to liking ','At one time, said he liked ']) + random;
            }
            return message.split(/\bi\b/gi).join('he').split(/\bmy\b/gi).join('his');
        },
        exclude: ['it','this','you','that','those','these','them','him','her','us']
    }
};

function getBest(results) { // Return highest scoring result(s)
    var best = { count: 0 };
    for(var rKey in results) { if(!results.hasOwnProperty(rKey)) continue;
        var result = { count: results[rKey], value: rKey };
        if(results[rKey] > best.count) {
            best = result;
        } else if(results[rKey] === best.count) {
            if(best.ties) {
                best.ties.push(result.value)
            } else {
                best.ties = [best.value,result.value];
            }
        }
    }
    return best;
}

function getWeightedRandom(results) {
    var exploded = [];
    for(var rKey in results) { if(!results.hasOwnProperty(rKey)) continue;
        for(var i = 0; i < results[rKey]; i++) {
            exploded.push(rKey);
        }
    }
    return util.pickInArray(exploded);
}

function Profile(channel, userID) {
    this.usedMessages = [];
    this.channel = channel;
    this.userID = userID;
    this.gatherInfo();
}

Profile.prototype.gatherInfo = async function() {
    var completedSearches = 0,
        totalSearches = Object.keys(infoPieces).length,
        profileText = '__' + util.capitalize(discord.getUsernameFromID(this.userID)) + '\'s Profile__';
    for(var iKey in infoPieces) { if(!infoPieces.hasOwnProperty(iKey)) continue;
        let searchResult = await this.search(infoPieces[iKey]);
        completedSearches++;
        if(searchResult) profileText += '\n• ' + searchResult;
        if(completedSearches === totalSearches) discord.sendMessage(this.channel, profileText);
    }
};

Profile.prototype.search = async function(info) {
    var used = this.usedMessages;
    let results = await messages.cursor(db => db.cfind({user:this.userID,content:info.re,$not:{id:{$in:used}}}));
    if(!results) return false;
    var values = {};
    for(let result of results) {
        used.push(result.id);
        info.re.lastIndex = 0; // Set search start at beginning
        var matchArray;
        while ((matchArray = info.re.exec(result.content)) !== null) {
            if(info.exclude.indexOf(matchArray[1]) >= 0) continue;
            if(values[matchArray[1]]) {
                values[matchArray[1]]++;
            } else {
                values[matchArray[1]] = 1;
            }
        }
    }
    return info.getResult(values);
};

var _commands = {};
_commands.profile = function(data) {
    var profileUserID = data.params.length > 0 ? discord.getIDFromUsername(data.paramStr) : false;
    discord.bot.simulateTyping(data.channel);
    new Profile(data.channel, profileUserID || data.userID);
};

module.exports = {
    commands: _commands,
    help: {
        profile: ['Generate a basic profile generated from a simple analysis of chat history', '$user']
    }
};
