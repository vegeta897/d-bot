// A game using the jService trivia API
switch(command) {
    case 'trivia':
        if(params.length == 0) { discord.sendMessage(channelID,'Start a new match with  _!trivia start_'); break; }
        switch(params[0]) {
            case 'start':
                if(trivia) {
                    trivia.players.push({name:user,score:0});
                    discord.sendMessage(channelID,['**'+user+'** has joined the match!']);
                    break;
                }
                discord.sendMessage(channelID,['**'+user+'** wants to play trivia, type  _!trivia join_  ' +
                'to play!']);
                trivia = { state: 'starting', channel: channelID, players: [{name:user,score:0}],
                    questions: 10 };
                setTimeout(function(){
                    discord.sendMessage(channelID,['The trivia match will begin in 5 seconds!']);
                    var path = '/api/random?count='+trivia.questions;
                    var req = http.request({host: 'jservice.io', path: path}, function (response) {
                        var str = '';
                        response.on('data', function (chunk) { str += chunk; });
                        response.on('end', function () {
                            var data = JSON.parse(str);
                            if (data.length > 0) {
                                trivia.questions = data;
                            } else {
                                discord.sendMessage(channelID, ['_Error retrieving trivia questions, sorry!_']);
                                trivia = false;
                            }
                        });
                    });
                    req.on('error', function (e) {
                        console.log(Date(),e);
                    });
                    req.on('timeout', function () {
                        console.log(Date(),'timeout');
                        req.abort();
                    });
                    req.setTimeout(5000);
                    req.end();
                },25000); // 5 second warning before match begins
                setTimeout(function(){
                    if(!trivia) return;
                    if(trivia.players.length < minPlayers) {
                        discord.sendMessage(channelID,['Not enough players joined the match, you need ' +
                        'at least '+minPlayers]);
                        trivia = false;
                        return;
                    }
                    trivia.curQ = -1;
                    trivia.newQuestion = function() {
                        clearTimeout(trivia.timeout);
                        var preDelay = 0; // Delay before asking next question
                        trivia.state = 'cooldown';
                        if(trivia.curQ < 0) {
                            discord.sendMessage(channelID,['The match has begun!']);
                            preDelay = 2000; // 2 seconds before first question
                        } else if(trivia.correct) {
                            discord.sendMessage(channelID,['**'+trivia.correct+'** is correct! The answer was _' +
                            trivia.questions[trivia.curQ].answer+'_']);
                            for(var p = 0; p < trivia.players.length; p++) {
                                if(trivia.players[p].name == trivia.correct) trivia.players[p].score++;
                            }
                            preDelay = 5000; // 5 seconds before next question
                        } else if(trivia.skip && trivia.curQ < 9) {
                            discord.sendMessage(channelID,['Skipping to the next question.']);
                            preDelay = 2000; // 2 seconds before next question
                        } else {
                            discord.sendMessage(channelID,['Time\'s up! The correct answer was _' +
                            trivia.questions[trivia.curQ].answer+'_']);
                            preDelay = 5000; // 5 seconds before next question
                        }
                        if(trivia.curQ == 9) {
                            var winner = {score: -1};
                            for(var w = 0; w < trivia.players.length; w++) {
                                if(trivia.players[w].score > winner.score) winner = trivia.players[w];
                            }
                            discord.sendMessage(channelID,['The match has ended!',
                                '**'+winner.name+'** is the winner, with '+winner.score+' points!']);
                            trivia = false;
                            return;
                        }
                        trivia.correct = false; trivia.skip = false;
                        setTimeout(function(){
                            trivia.state = 'playing';
                            trivia.curQ++;
                            var answer = trivia.questions[trivia.curQ].answer;
                            answer = answer.split('<i>').join('').split('</i>').join('');
                            trivia.questions[trivia.curQ].answer = answer;
                            var category = util.capitalize(trivia.questions[trivia.curQ].category.title);
                            category = category.split('_').join('\_');
                            trivia.questions[trivia.curQ].category.title = category;
                            discord.sendMessage(channelID,['__                          Question '+
                            (trivia.curQ+1)+'                          __','Category: ' +
                            trivia.questions[trivia.curQ].category.title,
                                trivia.questions[trivia.curQ].question]);
                            trivia.fuzzy = FuzzySet([trivia.questions[trivia.curQ].answer]);
                            trivia.timeout = setTimeout(trivia.newQuestion,45000); // 45 seconds per question
                        },preDelay);
                    };
                    trivia.newQuestion(); // Start first question
                },30000); // Start match 30 seconds after start command
                break;
            case 'join':
                if(!trivia) { discord.sendMessage(channelID,['Start a new match with  _!trivia start_']); break; }
                var alreadyJoined;
                for(var p = 0; p < trivia.players.length; p++) {
                    if(trivia.players[p].name == user) { alreadyJoined = true; break; }
                }
                if(alreadyJoined) { discord.sendMessage(channelID,['**'+user+'**, you have already joined!']); break; }
                trivia.players.push({name:user,score:0});
                discord.sendMessage(channelID,['**'+user+'** has joined the match!']);
                break;
            case 'skip':
                if(!trivia || trivia.state != 'playing') break;
                var skipFail = false;
                for(var s = 0; s < trivia.players.length; s++) {
                    if(trivia.players[s].name = user) { trivia.players[s].skip = true; break; }
                }
                for(var ss = 0; ss < trivia.players.length; ss++) {
                    if(!trivia.players[ss].skip) { skipFail = true; break; }
                }
                if(!skipFail) { trivia.skip = true; trivia.newQuestion(); }
                else {
                    // Show skip status?
                }
                break;
        }
        break;
}